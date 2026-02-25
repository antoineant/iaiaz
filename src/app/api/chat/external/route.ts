import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { callAI, callAIStream } from "@/lib/ai/providers";
import { type ModelId } from "@/lib/pricing";
import { type ContentPart, type MultimodalMessage } from "@/types";
import {
  calculateCostFromDBAdmin,
  getModelFromDBAdmin,
  getAppSettingsAdmin,
  calculateCO2,
} from "@/lib/pricing-db";
import {
  getUserCredits,
  checkCanSpend,
  deductCredits,
  getEffectiveBalance,
} from "@/lib/credits";

const MAX_MESSAGE_LENGTH = 15_000;

function validateMessageContent(text: string): string | null {
  if (text.length > MAX_MESSAGE_LENGTH) {
    return `Message too long (${text.length} characters, maximum ${MAX_MESSAGE_LENGTH})`;
  }
  if (text.length > 100) {
    const uniqueRatio = new Set(text).size / text.length;
    if (uniqueRatio < 0.01) {
      return "Invalid message (repetitive content detected)";
    }
  }
  return null;
}

// CORS headers for desktop app
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Handle OPTIONS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

interface ExternalAttachment {
  base64: string;
  mimeType: string;
  filename: string;
}

interface ExternalChatRequest {
  message: string;
  model?: ModelId;
  messages?: Array<{ role: "user" | "assistant"; content: string }>;
  attachments?: ExternalAttachment[];
  stream?: boolean;
  enableThinking?: boolean; // Enable Claude Extended Thinking or OpenAI Reasoning
}

/**
 * External Chat API for desktop applications (Ainonymise)
 *
 * Authentication: Bearer token (API key stored in profiles.api_key)
 *
 * This endpoint is designed for external clients that handle their own
 * conversation state and just need to send messages to the AI.
 */
export async function POST(request: NextRequest) {
  const adminClient = createAdminClient();

  try {
    // Authenticate via API key
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "API key required", code: "UNAUTHORIZED" },
        { status: 401, headers: corsHeaders }
      );
    }

    const apiKey = authHeader.slice(7); // Remove "Bearer " prefix

    // Look up user by API key
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, account_type, display_name")
      .eq("api_key", apiKey)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Invalid API key", code: "INVALID_API_KEY" },
        { status: 401, headers: corsHeaders }
      );
    }

    const userId = profile.id;

    // Parse request body
    const body: ExternalChatRequest = await request.json();
    const { message, model = "claude-sonnet-4-20250514" as ModelId, messages = [], attachments = [], stream = false, enableThinking = false } = body;

    if (!message?.trim() && attachments.length === 0) {
      return NextResponse.json(
        { error: "Message or attachments required", code: "MISSING_MESSAGE" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate message content (length + repetition)
    if (message) {
      const msgError = validateMessageContent(message);
      if (msgError) {
        return NextResponse.json(
          { error: msgError, code: "INVALID_MESSAGE" },
          { status: 400, headers: corsHeaders }
        );
      }
    }
    for (const m of messages) {
      const histError = validateMessageContent(m.content);
      if (histError) {
        return NextResponse.json(
          { error: "Invalid message in history: " + histError, code: "INVALID_MESSAGE" },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Validate model
    const modelInfo = await getModelFromDBAdmin(model);
    if (!modelInfo) {
      return NextResponse.json(
        { error: "Invalid model", code: "INVALID_MODEL" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get pricing settings
    const pricingSettings = await getAppSettingsAdmin();

    // Get user credits
    const userCredits = await getUserCredits(userId);
    const effectiveBalance = getEffectiveBalance(userCredits);

    // Estimate cost
    const estimatedInputTokens = Math.ceil(
      (messages.reduce((acc, m) => acc + m.content.length, 0) + message.length) / 4
    );
    const estimatedBaseCost =
      (estimatedInputTokens * modelInfo.input_price + 500 * modelInfo.output_price) / 1_000_000;
    const estimatedCost = estimatedBaseCost * pricingSettings.markupMultiplier;

    // Check if user can spend
    const canSpendCheck = await checkCanSpend(userId, estimatedCost);
    if (!canSpendCheck.allowed) {
      const errorMessage = canSpendCheck.source === "organization"
        ? "Organization credits exhausted"
        : "Insufficient credits";

      return NextResponse.json(
        {
          error: errorMessage,
          code: "INSUFFICIENT_CREDITS",
          credits: {
            balance: effectiveBalance,
            source: userCredits.source,
          },
        },
        { status: 402, headers: corsHeaders }
      );
    }

    // Build message history
    // Convert text-only history messages
    const historyMessages: MultimodalMessage[] = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Build the current user message (potentially multimodal)
    let currentMessageContent: string | ContentPart[];

    if (attachments.length > 0) {
      // Build multimodal content
      const contentParts: ContentPart[] = [];

      // Add text message first if present
      if (message?.trim()) {
        contentParts.push({ type: "text", text: message });
      }

      // Add attachments
      for (const attachment of attachments) {
        if (attachment.mimeType.startsWith("image/")) {
          contentParts.push({
            type: "image",
            mimeType: attachment.mimeType,
            base64: attachment.base64,
          });
        } else if (attachment.mimeType === "application/pdf") {
          contentParts.push({
            type: "document",
            mimeType: attachment.mimeType,
            base64: attachment.base64,
            filename: attachment.filename,
          });
        }
      }

      currentMessageContent = contentParts;
    } else {
      currentMessageContent = message;
    }

    const fullMessages: MultimodalMessage[] = [
      ...historyMessages,
      { role: "user" as const, content: currentMessageContent },
    ];

    // Handle streaming response
    if (stream) {
      const encoder = new TextEncoder();

      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            // Check if model supports thinking
            const supportsThinking = model.includes("claude-3-7") ||
                                     model.includes("claude-sonnet-4") ||
                                     model.includes("claude-opus-4") ||
                                     model.startsWith("o1") ||
                                     model.startsWith("o3");

            const aiResponse = await callAIStream(
              model,
              fullMessages,
              (chunk) => {
                // Send each chunk as SSE data
                const data = JSON.stringify({ type: "chunk", content: chunk });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              },
              // Thinking callback - only if enabled and model supports it
              enableThinking && supportsThinking
                ? (thinkingChunk) => {
                    const data = JSON.stringify({ type: "thinking", content: thinkingChunk });
                    controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                  }
                : undefined
            );

            // Calculate actual cost
            const actualCost = await calculateCostFromDBAdmin(
              model,
              aiResponse.tokensInput,
              aiResponse.tokensOutput
            );

            // Calculate CO2
            const co2Rate = modelInfo.co2_per_1k_tokens ?? 0.15;
            const co2Grams = calculateCO2(
              aiResponse.tokensInput,
              aiResponse.tokensOutput,
              co2Rate
            );

            // Log usage
            await adminClient.from("api_usage").insert({
              user_id: userId,
              provider: modelInfo.provider,
              model,
              tokens_input: aiResponse.tokensInput,
              tokens_output: aiResponse.tokensOutput,
              cost_eur: actualCost,
              co2_grams: co2Grams,
            });

            // Deduct credits
            const deductResult = await deductCredits(
              userId,
              actualCost,
              `External API: ${modelInfo.name}`
            );

            // Send final message with metadata
            const finalData = JSON.stringify({
              type: "done",
              tokensInput: aiResponse.tokensInput,
              tokensOutput: aiResponse.tokensOutput,
              cost: actualCost,
              co2Grams: co2Grams,
              thinking: aiResponse.thinking,
              credits: {
                source: deductResult.source || userCredits.source,
                remaining: deductResult.remaining ?? effectiveBalance - actualCost,
                orgName: userCredits.orgName,
              },
            });
            controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
            controller.close();
          } catch (error) {
            const errorData = JSON.stringify({
              type: "error",
              error: error instanceof Error ? error.message : "Stream error",
            });
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
            controller.close();
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    // Non-streaming response (original behavior)
    const aiResponse = await callAI(model, fullMessages);

    // Calculate actual cost
    const actualCost = await calculateCostFromDBAdmin(
      model,
      aiResponse.tokensInput,
      aiResponse.tokensOutput
    );

    // Calculate CO2
    const co2Rate = modelInfo.co2_per_1k_tokens ?? 0.15;
    const co2Grams = calculateCO2(
      aiResponse.tokensInput,
      aiResponse.tokensOutput,
      co2Rate
    );

    // Log usage (without creating conversation - external clients manage their own)
    await adminClient.from("api_usage").insert({
      user_id: userId,
      provider: modelInfo.provider,
      model,
      tokens_input: aiResponse.tokensInput,
      tokens_output: aiResponse.tokensOutput,
      cost_eur: actualCost,
      co2_grams: co2Grams,
    });

    // Deduct credits
    const deductResult = await deductCredits(
      userId,
      actualCost,
      `External API: ${modelInfo.name}`
    );

    if (!deductResult.success) {
      console.error("Error deducting credits:", deductResult.error);
    }

    return NextResponse.json({
      message: aiResponse.content,
      model,
      tokensInput: aiResponse.tokensInput,
      tokensOutput: aiResponse.tokensOutput,
      cost: actualCost,
      co2Grams: co2Grams,
      credits: {
        source: deductResult.source || userCredits.source,
        remaining: deductResult.remaining ?? effectiveBalance - actualCost,
        orgName: userCredits.orgName,
      },
    }, { headers: corsHeaders });
  } catch (error) {
    console.error("External chat API error:", error);

    let userMessage = "Request processing error";
    let statusCode = 500;

    if (error instanceof Error) {
      const errorMsg = error.message.toLowerCase();

      if (errorMsg.includes("rate_limit") || errorMsg.includes("429")) {
        userMessage = "Service overloaded. Please retry.";
        statusCode = 429;
      } else if (errorMsg.includes("timeout")) {
        userMessage = "Request timed out. Please retry.";
        statusCode = 504;
      } else if (errorMsg.includes("context_length") || errorMsg.includes("too long")) {
        userMessage = "Message too long. Please shorten your conversation.";
        statusCode = 400;
      }
    }

    return NextResponse.json(
      { error: userMessage, code: "AI_ERROR" },
      { status: statusCode, headers: corsHeaders }
    );
  }
}

/**
 * GET endpoint to verify API key and get user info
 */
export async function GET(request: NextRequest) {
  const adminClient = createAdminClient();

  // Authenticate via API key
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "API key required", code: "UNAUTHORIZED" },
      { status: 401, headers: corsHeaders }
    );
  }

  const apiKey = authHeader.slice(7);

  // Look up user by API key
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("id, account_type, display_name, email")
    .eq("api_key", apiKey)
    .single();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: "Invalid API key", code: "INVALID_API_KEY" },
      { status: 401, headers: corsHeaders }
    );
  }

  // Get credits
  const userCredits = await getUserCredits(profile.id);
  const effectiveBalance = getEffectiveBalance(userCredits);

  return NextResponse.json({
    user: {
      displayName: profile.display_name,
      email: profile.email,
      accountType: profile.account_type,
    },
    credits: {
      balance: effectiveBalance,
      source: userCredits.source,
      orgName: userCredits.orgName,
    },
  }, { headers: corsHeaders });
}

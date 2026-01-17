import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { callAI } from "@/lib/ai/providers";
import { type ModelId } from "@/lib/pricing";
import {
  calculateCostFromDBAdmin,
  getModelFromDBAdmin,
  getAppSettingsAdmin,
} from "@/lib/pricing-db";
import {
  checkRateLimit,
  getRateLimitErrorMessage,
  getModelTier,
  getTierLimits,
} from "@/lib/rate-limiter";
import { getFileBase64, isImageMimeType, isPdfMimeType } from "@/lib/files";
import type { ContentPart, FileUploadRecord } from "@/types";

interface ChatRequest {
  message: string;
  model: ModelId;
  conversationId?: string;
  messages?: Array<{ role: "user" | "assistant"; content: string }>;
  attachments?: string[]; // Array of file IDs for current message
}

// Build multimodal content from text and attachments
async function buildMultimodalContent(
  text: string,
  attachments: FileUploadRecord[]
): Promise<ContentPart[]> {
  const parts: ContentPart[] = [];

  // Add file attachments first (images before text is recommended for some models)
  for (const file of attachments) {
    try {
      const base64 = await getFileBase64(file.storage_path);

      if (isImageMimeType(file.mime_type)) {
        parts.push({
          type: "image",
          mimeType: file.mime_type,
          base64,
        });
      } else if (isPdfMimeType(file.mime_type)) {
        parts.push({
          type: "document",
          mimeType: file.mime_type,
          base64,
          filename: file.original_filename,
        });
      }
    } catch (error) {
      console.error(`Failed to load file ${file.id}:`, error);
    }
  }

  // Add text content
  if (text.trim()) {
    parts.push({ type: "text", text });
  }

  return parts;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Get user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Parse request
    const body: ChatRequest = await request.json();
    const { message, model, conversationId, messages = [], attachments = [] } = body;

    // Require either message or attachments
    if (!message?.trim() && attachments.length === 0) {
      return NextResponse.json(
        { error: "Message ou fichier requis" },
        { status: 400 }
      );
    }

    // Validate model from database
    const modelInfo = await getModelFromDBAdmin(model);
    if (!modelInfo) {
      return NextResponse.json(
        { error: "Modèle invalide ou désactivé" },
        { status: 400 }
      );
    }

    // Get pricing settings for cost estimation
    const pricingSettings = await getAppSettingsAdmin();

    // Check rate limit
    const rateLimitResult = await checkRateLimit(adminClient, user.id, model);

    if (!rateLimitResult.allowed) {
      const errorMessage = getRateLimitErrorMessage(model, rateLimitResult.reset_at);
      const tier = getModelTier(model);
      const limits = getTierLimits(tier);

      return NextResponse.json(
        {
          error: errorMessage,
          code: "RATE_LIMITED",
          rateLimit: {
            remaining: 0,
            limit: limits.limit,
            resetAt: rateLimitResult.reset_at,
            tier,
          },
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": limits.limit.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rateLimitResult.reset_at,
            "Retry-After": Math.ceil(
              (new Date(rateLimitResult.reset_at).getTime() - Date.now()) / 1000
            ).toString(),
          },
        }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("credits_balance")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profil non trouvé" },
        { status: 404 }
      );
    }

    // Fetch attachment records if any
    let attachmentRecords: FileUploadRecord[] = [];
    if (attachments.length > 0) {
      const { data: files, error: filesError } = await adminClient
        .from("file_uploads")
        .select("*")
        .in("id", attachments)
        .eq("user_id", user.id);

      if (filesError) {
        console.error("Error fetching attachments:", filesError);
      } else {
        attachmentRecords = files as FileUploadRecord[];
      }
    }

    // Estimate cost (rough check before calling API)
    // Add extra tokens for attachments (images ~1000 tokens, PDFs vary)
    const attachmentTokenEstimate = attachmentRecords.reduce((acc, file) => {
      if (isImageMimeType(file.mime_type)) return acc + 1000;
      if (isPdfMimeType(file.mime_type)) return acc + 2000;
      return acc;
    }, 0);

    const estimatedInputTokens = Math.ceil(
      (messages.reduce((acc, m) => acc + m.content.length, 0) + message.length) / 4
    ) + attachmentTokenEstimate;

    // Calculate estimated cost using database pricing
    const estimatedBaseCost =
      (estimatedInputTokens * modelInfo.input_price + 500 * modelInfo.output_price) / 1_000_000;
    const estimatedCost = estimatedBaseCost * pricingSettings.markupMultiplier;

    if (profile.credits_balance < estimatedCost) {
      return NextResponse.json(
        { error: "Crédits insuffisants. Veuillez recharger votre compte." },
        { status: 402 }
      );
    }

    // Build message history with multimodal support for current message
    let fullMessages;

    if (attachmentRecords.length > 0) {
      // Build multimodal content for the current message
      const multimodalContent = await buildMultimodalContent(
        message,
        attachmentRecords
      );

      fullMessages = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: multimodalContent },
      ];
    } else {
      // Text-only message
      fullMessages = [
        ...messages,
        { role: "user" as const, content: message },
      ];
    }

    // Call AI
    const aiResponse = await callAI(model, fullMessages);

    // Calculate actual cost using database pricing
    const actualCost = await calculateCostFromDBAdmin(
      model,
      aiResponse.tokensInput,
      aiResponse.tokensOutput
    );

    // Create or update conversation
    let finalConversationId = conversationId;

    if (!finalConversationId) {
      // Create new conversation
      const { data: newConv, error: convError } = await adminClient
        .from("conversations")
        .insert({
          user_id: user.id,
          title: message.slice(0, 100) || "Image/Document",
          model,
        })
        .select()
        .single();

      if (convError) {
        console.error("Error creating conversation:", convError);
      } else {
        finalConversationId = newConv.id;
      }
    } else {
      // Update conversation timestamp
      await adminClient
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);
    }

    // Save messages to database
    if (finalConversationId) {
      // User message with file_ids
      const { data: userMsg } = await adminClient
        .from("messages")
        .insert({
          conversation_id: finalConversationId,
          role: "user",
          content: message,
          tokens_input: 0,
          tokens_output: 0,
          cost: 0,
          file_ids: attachments.length > 0 ? attachments : [],
        })
        .select()
        .single();

      // Update file records with message_id
      if (userMsg && attachments.length > 0) {
        await adminClient
          .from("file_uploads")
          .update({ message_id: userMsg.id })
          .in("id", attachments);
      }

      // Assistant message
      const { data: assistantMsg } = await adminClient
        .from("messages")
        .insert({
          conversation_id: finalConversationId,
          role: "assistant",
          content: aiResponse.content,
          tokens_input: aiResponse.tokensInput,
          tokens_output: aiResponse.tokensOutput,
          cost: actualCost,
        })
        .select()
        .single();

      // Log API usage
      if (assistantMsg) {
        await adminClient.from("api_usage").insert({
          user_id: user.id,
          message_id: assistantMsg.id,
          provider: modelInfo.provider,
          model,
          tokens_input: aiResponse.tokensInput,
          tokens_output: aiResponse.tokensOutput,
          cost_eur: actualCost,
        });
      }
    }

    // Deduct credits
    const { error: deductError } = await adminClient.rpc(
      "deduct_credits",
      {
        p_user_id: user.id,
        p_amount: actualCost,
        p_description: `${modelInfo.name}: ${aiResponse.tokensInput} tokens entrée, ${aiResponse.tokensOutput} tokens sortie`,
      }
    );

    if (deductError) {
      console.error("Error deducting credits:", deductError);
    }

    // Get updated rate limit info for response
    const tier = getModelTier(model);
    const limits = getTierLimits(tier);

    return NextResponse.json(
      {
        content: aiResponse.content,
        tokensInput: aiResponse.tokensInput,
        tokensOutput: aiResponse.tokensOutput,
        cost: actualCost,
        conversationId: finalConversationId,
        rateLimit: {
          remaining: rateLimitResult.remaining,
          limit: limits.limit,
          tier,
        },
      },
      {
        headers: {
          "X-RateLimit-Limit": limits.limit.toString(),
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
        },
      }
    );
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors du traitement de la requête",
      },
      { status: 500 }
    );
  }
}

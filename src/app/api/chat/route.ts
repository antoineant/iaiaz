import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { callAI, callAIStream } from "@/lib/ai/providers";
import { type ModelId } from "@/lib/pricing";
import {
  calculateCostFromDBAdmin,
  getModelFromDBAdmin,
  getAppSettingsAdmin,
  calculateCO2,
} from "@/lib/pricing-db";
import {
  checkRateLimit,
  getRateLimitErrorMessage,
  getModelTier,
  getTierLimits,
} from "@/lib/rate-limiter";
import { getFileBase64, isImageMimeType, isPdfMimeType, isWordMimeType, extractWordText } from "@/lib/files";
import type { ContentPart, FileUploadRecord } from "@/types";
import {
  getUserCredits,
  checkCanSpend,
  deductCredits,
  getEffectiveBalance,
  checkCanSpendWithContext,
  deductCreditsWithContext,
  type CreditContext,
} from "@/lib/credits";
import { isModelAllowedForUser } from "@/lib/org";

interface ChatRequest {
  message: string;
  model: ModelId;
  conversationId?: string;
  messages?: Array<{ role: "user" | "assistant"; content: string }>;
  attachments?: string[]; // Array of file IDs for current message
  stream?: boolean;
  enableThinking?: boolean; // Enable Claude Extended Thinking (costs more tokens)
  classId?: string; // Class context for class conversations (uses org credits only)
}

// Build multimodal content from text and attachments
async function buildMultimodalContent(
  text: string,
  attachments: FileUploadRecord[]
): Promise<ContentPart[]> {
  const parts: ContentPart[] = [];
  const wordDocTexts: string[] = [];

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
      } else if (isWordMimeType(file.mime_type)) {
        // Word documents: extract text and include as text content
        const buffer = Buffer.from(base64, "base64");
        const extractedText = await extractWordText(buffer);
        if (extractedText.trim()) {
          wordDocTexts.push(`--- Document: ${file.original_filename} ---\n${extractedText}\n--- Fin du document ---`);
        }
      }
    } catch (error) {
      console.error(`Failed to load file ${file.id}:`, error);
    }
  }

  // Add Word document content as text (before user's message)
  if (wordDocTexts.length > 0) {
    parts.push({ type: "text", text: wordDocTexts.join("\n\n") });
  }

  // Add user's text content
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
    const { message, model, conversationId, messages = [], attachments = [], stream = false, enableThinking = false, classId } = body;

    // If classId provided, validate class membership
    let validatedClassId: string | null = null;
    if (classId) {
      const { data: membership } = await adminClient
        .from("organization_members")
        .select("id, status, class_id")
        .eq("user_id", user.id)
        .eq("class_id", classId)
        .eq("status", "active")
        .single();

      if (!membership) {
        return NextResponse.json(
          { error: "Vous n'êtes pas membre de cette classe", code: "NOT_CLASS_MEMBER" },
          { status: 403 }
        );
      }
      validatedClassId = classId;
    }

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

    // Check if model is allowed for user's class
    const modelAllowed = await isModelAllowedForUser(user.id, model);
    if (!modelAllowed) {
      return NextResponse.json(
        { error: "Ce modèle n'est pas disponible pour votre classe" },
        { status: 403 }
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

    // Get user credits (org first, personal fallback)
    const userCredits = await getUserCredits(user.id);
    const effectiveBalance = getEffectiveBalance(userCredits);

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

    // Determine credit context based on classId
    const creditContext: CreditContext = validatedClassId
      ? { type: "class", classId: validatedClassId }
      : { type: "auto" };

    // Check if user can spend estimated cost (context-aware)
    const canSpendCheck = await checkCanSpendWithContext(user.id, estimatedCost, creditContext);
    if (!canSpendCheck.allowed) {
      const errorMessage = canSpendCheck.reason === "daily_limit_exceeded"
        ? "Limite journalière atteinte. Réessayez demain."
        : canSpendCheck.reason === "weekly_limit_exceeded"
        ? "Limite hebdomadaire atteinte."
        : canSpendCheck.reason === "monthly_limit_exceeded"
        ? "Limite mensuelle atteinte."
        : canSpendCheck.reason === "allocation_exceeded"
        ? "Allocation épuisée. Contactez votre établissement."
        : canSpendCheck.reason === "insufficient_class_credits"
        ? "Crédits de classe insuffisants."
        : canSpendCheck.reason === "not_class_member"
        ? "Vous n'êtes pas membre de cette classe."
        : canSpendCheck.source === "organization"
        ? "Crédits établissement insuffisants."
        : "Crédits insuffisants. Veuillez recharger votre compte.";

      return NextResponse.json(
        {
          error: errorMessage,
          code: canSpendCheck.reason?.toUpperCase() || "INSUFFICIENT_CREDITS",
          resetAt: canSpendCheck.resetAt,
        },
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

    // Handle streaming response
    if (stream) {
      const encoder = new TextEncoder();

      // Create conversation early for streaming
      let streamConversationId = conversationId;
      if (!streamConversationId) {
        const { data: newConv } = await adminClient
          .from("conversations")
          .insert({
            user_id: user.id,
            title: message.slice(0, 100) || "Image/Document",
            model,
            class_id: validatedClassId, // Set class context if provided
          })
          .select()
          .single();
        if (newConv) {
          streamConversationId = newConv.id;
        }
      } else {
        await adminClient
          .from("conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", conversationId);
      }

      // Save user message early
      let userMsgId: string | undefined;
      if (streamConversationId) {
        const { data: userMsg } = await adminClient
          .from("messages")
          .insert({
            conversation_id: streamConversationId,
            role: "user",
            content: message,
            tokens_input: 0,
            tokens_output: 0,
            cost: 0,
            file_ids: attachments.length > 0 ? attachments : [],
          })
          .select()
          .single();

        if (userMsg) {
          userMsgId = userMsg.id;
          if (attachments.length > 0) {
            await adminClient
              .from("file_uploads")
              .update({ message_id: userMsg.id })
              .in("id", attachments);
          }
        }
      }

      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            const aiResponse = await callAIStream(
              model,
              fullMessages,
              (chunk) => {
                const data = JSON.stringify({ type: "chunk", content: chunk });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              },
              enableThinking
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

            // Save assistant message
            if (streamConversationId) {
              const { data: assistantMsg } = await adminClient
                .from("messages")
                .insert({
                  conversation_id: streamConversationId,
                  role: "assistant",
                  content: aiResponse.content,
                  tokens_input: aiResponse.tokensInput,
                  tokens_output: aiResponse.tokensOutput,
                  cost: actualCost,
                  co2_grams: co2Grams,
                })
                .select()
                .single();

              if (assistantMsg) {
                await adminClient.from("api_usage").insert({
                  user_id: user.id,
                  message_id: assistantMsg.id,
                  provider: modelInfo.provider,
                  model,
                  tokens_input: aiResponse.tokensInput,
                  tokens_output: aiResponse.tokensOutput,
                  cost_eur: actualCost,
                  co2_grams: co2Grams,
                });
              }
            }

            // Deduct credits (context-aware)
            const deductResult = await deductCreditsWithContext(
              user.id,
              actualCost,
              `${modelInfo.name}: ${aiResponse.tokensInput} tokens entrée, ${aiResponse.tokensOutput} tokens sortie`,
              creditContext
            );

            // Get rate limit info
            const tier = getModelTier(model);
            const limits = getTierLimits(tier);

            // Send final message with metadata
            const finalData = JSON.stringify({
              type: "done",
              tokensInput: aiResponse.tokensInput,
              tokensOutput: aiResponse.tokensOutput,
              cost: actualCost,
              co2Grams: co2Grams,
              thinking: aiResponse.thinking,
              conversationId: streamConversationId,
              classId: validatedClassId, // Include class context in response
              rateLimit: {
                remaining: rateLimitResult.remaining,
                limit: limits.limit,
                tier,
              },
              credits: {
                source: deductResult.source || (validatedClassId ? "organization" : userCredits.source),
                remaining: deductResult.remaining ?? effectiveBalance - actualCost,
                orgName: userCredits.orgName,
                limits: userCredits.limits,
                isClassContext: !!validatedClassId,
              },
            });
            controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
            controller.close();
          } catch (error) {
            // Parse error for user-friendly message
            let userMessage = error instanceof Error ? error.message : "Stream error";

            if (error instanceof Error) {
              const errorMsg = error.message.toLowerCase();
              if (errorMsg.includes("too long") || errorMsg.includes("maximum") || errorMsg.includes("context_length")) {
                userMessage = "Les documents sont trop volumineux. Essayez d'envoyer un seul document à la fois ou de démarrer une nouvelle conversation.";
              } else if (errorMsg.includes("rate_limit") || errorMsg.includes("429")) {
                userMessage = "Le service est surchargé. Veuillez réessayer dans quelques instants.";
              }
            }

            const errorData = JSON.stringify({
              type: "error",
              error: userMessage,
            });
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
            controller.close();
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Non-streaming response (original behavior)
    const aiResponse = await callAI(model, fullMessages);

    // Calculate actual cost using database pricing
    const actualCost = await calculateCostFromDBAdmin(
      model,
      aiResponse.tokensInput,
      aiResponse.tokensOutput
    );

    // Calculate CO2 emissions using model's CO2 rate
    const co2Rate = modelInfo.co2_per_1k_tokens ?? 0.15;
    const co2Grams = calculateCO2(
      aiResponse.tokensInput,
      aiResponse.tokensOutput,
      co2Rate
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
          class_id: validatedClassId, // Set class context if provided
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
          co2_grams: co2Grams,
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
          co2_grams: co2Grams,
        });
      }
    }

    // Deduct credits from appropriate source (context-aware)
    const deductResult = await deductCreditsWithContext(
      user.id,
      actualCost,
      `${modelInfo.name}: ${aiResponse.tokensInput} tokens entrée, ${aiResponse.tokensOutput} tokens sortie`,
      creditContext
    );

    if (!deductResult.success) {
      console.error("Error deducting credits:", deductResult.error);
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
        co2Grams: co2Grams,
        conversationId: finalConversationId,
        classId: validatedClassId, // Include class context in response
        rateLimit: {
          remaining: rateLimitResult.remaining,
          limit: limits.limit,
          tier,
        },
        credits: {
          source: deductResult.source || (validatedClassId ? "organization" : userCredits.source),
          remaining: deductResult.remaining ?? effectiveBalance - actualCost,
          orgName: userCredits.orgName,
          limits: userCredits.limits,
          isClassContext: !!validatedClassId,
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

    // Parse error for user-friendly messages
    let userMessage = "Erreur lors du traitement de la requête";
    let statusCode = 500;

    if (error instanceof Error) {
      const errorMsg = error.message.toLowerCase();

      // Model not found (404 from provider)
      if (errorMsg.includes("not_found") || errorMsg.includes("model") && errorMsg.includes("404")) {
        userMessage = "Ce modèle est temporairement indisponible. Veuillez en sélectionner un autre.";
        statusCode = 503;
      }
      // Rate limit from provider
      else if (errorMsg.includes("rate_limit") || errorMsg.includes("429") || errorMsg.includes("too many requests")) {
        userMessage = "Le service est surchargé. Veuillez réessayer dans quelques instants.";
        statusCode = 429;
      }
      // Authentication error with provider
      else if (errorMsg.includes("unauthorized") || errorMsg.includes("401") || errorMsg.includes("invalid_api_key")) {
        userMessage = "Erreur de configuration du service. Contactez l'administrateur.";
        statusCode = 503;
      }
      // Content policy / safety
      else if (errorMsg.includes("content_policy") || errorMsg.includes("safety") || errorMsg.includes("blocked")) {
        userMessage = "Votre message n'a pas pu être traité. Veuillez reformuler votre demande.";
        statusCode = 400;
      }
      // Timeout
      else if (errorMsg.includes("timeout") || errorMsg.includes("timed out")) {
        userMessage = "La requête a pris trop de temps. Veuillez réessayer.";
        statusCode = 504;
      }
      // Context length exceeded
      else if (errorMsg.includes("context_length") || errorMsg.includes("too long") || errorMsg.includes("maximum")) {
        userMessage = "Les documents sont trop volumineux. Essayez d'envoyer un seul document à la fois ou de démarrer une nouvelle conversation.";
        statusCode = 400;
      }
    }

    return NextResponse.json(
      {
        error: userMessage,
        code: "AI_ERROR",
      },
      { status: statusCode }
    );
  }
}

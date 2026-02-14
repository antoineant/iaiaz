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
import { checkFamiliaPreConditions, logContentFlag, getFamilyOrgInfo } from "@/lib/familia/content-filter";
import { buildFamiliaSystemPrompt, buildParentSystemPrompt, parseFamiliaMetadata, createFamiliaMetaStripper } from "@/lib/familia/guardian-prompt";
import { calculateAge } from "@/lib/familia/age-verification";

interface ChatRequest {
  message: string;
  model: ModelId;
  conversationId?: string;
  messages?: Array<{ role: "user" | "assistant"; content: string }>;
  attachments?: string[]; // Array of file IDs for current message
  stream?: boolean;
  enableThinking?: boolean; // Enable Claude Extended Thinking (costs more tokens)
  classId?: string; // Class context for class conversations (uses org credits only)
  assistantId?: string; // Familia custom assistant ID
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
    const { message, model, conversationId, messages = [], attachments = [], stream = false, enableThinking = false, classId, assistantId } = body;

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

    // Check Familia parental controls (quiet hours, daily limits)
    const familiaCheck = await checkFamiliaPreConditions(user.id);
    if (!familiaCheck.allowed) {
      return NextResponse.json(
        {
          error: familiaCheck.detail || "Utilisation restreinte par le controle parental",
          code: "PARENTAL_CONTROL",
        },
        { status: 403 }
      );
    }

    // Build Familia system prompt if user is a family member
    let familiaSystemPrompt: string | undefined;
    const familyInfo = await getFamilyOrgInfo(user.id);
    if (familyInfo?.isFamilyMember && familyInfo.orgId) {
      const isParent = familyInfo.role === "owner" || familyInfo.role === "admin";

      if (isParent) {
        // --- Parent branch: build prompt with children context ---
        const [childMembers, orgData] = await Promise.all([
          adminClient
            .from("organization_members")
            .select("user_id, supervision_mode")
            .eq("organization_id", familyInfo.orgId)
            .eq("role", "student")
            .eq("status", "active"),
          adminClient
            .from("organizations")
            .select("name")
            .eq("id", familyInfo.orgId)
            .single(),
        ]);

        const orgName = orgData.data?.name || "Ma famille";
        const childIds = (childMembers.data || []).map((m) => m.user_id);

        if (childIds.length > 0) {
          // Fetch children profiles and recent activity in parallel
          const [childProfiles, activityData] = await Promise.all([
            adminClient
              .from("profiles")
              .select("id, display_name, birthdate, school_year")
              .in("id", childIds),
            adminClient
              .from("conversation_activity")
              .select("subject, struggle, conversations!inner(user_id)")
              .in("conversations.user_id", childIds)
              .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
          ]);

          // Build supervision mode lookup
          const supervisionByChild = new Map(
            (childMembers.data || []).map((m) => [m.user_id, m.supervision_mode || "guided"])
          );

          // Aggregate activity per child
          const activityByChild = new Map<string, Map<string, { count: number; struggleCount: number }>>();
          for (const row of activityData.data || []) {
            const conv = row.conversations as unknown as { user_id: string };
            const childId = conv.user_id;
            const subject = row.subject || "general";
            if (!activityByChild.has(childId)) activityByChild.set(childId, new Map());
            const subjectMap = activityByChild.get(childId)!;
            const existing = subjectMap.get(subject) || { count: 0, struggleCount: 0 };
            existing.count++;
            if (row.struggle) existing.struggleCount++;
            subjectMap.set(subject, existing);
          }

          // Build children context array
          const childrenContext = (childProfiles.data || []).map((p) => ({
            name: p.display_name?.split(" ")[0] || "Enfant",
            age: p.birthdate ? calculateAge(new Date(p.birthdate)) : null,
            schoolYear: p.school_year || null,
            supervisionMode: supervisionByChild.get(p.id) || "guided",
            recentSubjects: activityByChild.has(p.id)
              ? Array.from(activityByChild.get(p.id)!.entries()).map(([subject, stats]) => ({
                  subject,
                  count: stats.count,
                  struggleCount: stats.struggleCount,
                }))
              : [],
          }));

          familiaSystemPrompt = buildParentSystemPrompt(orgName, childrenContext);
        } else {
          familiaSystemPrompt = buildParentSystemPrompt(orgName, []);
        }
      } else {
        // --- Child branch: existing guardian prompt (unchanged) ---
        const { data: memberInfo } = await adminClient
          .from("organization_members")
          .select("supervision_mode, age_bracket")
          .eq("user_id", user.id)
          .eq("status", "active")
          .single();

        const ageBracket = memberInfo?.age_bracket || "12-14";
        const supervisionMode = memberInfo?.supervision_mode || "guided";

        const { data: profile } = await adminClient
          .from("profiles")
          .select("display_name, school_year, birthdate")
          .eq("id", user.id)
          .single();

        const displayName = profile?.display_name || "there";
        const firstName = displayName.split(" ")[0];
        const schoolYear = profile?.school_year || null;
        const exactAge = profile?.birthdate
          ? calculateAge(new Date(profile.birthdate))
          : null;

        let assistant: { name: string; system_prompt: string } | null = null;
        if (assistantId) {
          const { data: assistantData } = await adminClient
            .from("custom_assistants")
            .select("name, system_prompt")
            .eq("id", assistantId)
            .eq("user_id", user.id)
            .single();
          if (assistantData) {
            assistant = assistantData;
          }
        }

        familiaSystemPrompt = buildFamiliaSystemPrompt(ageBracket, supervisionMode, firstName, assistant, schoolYear, exactAge);
      }
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
            class_id: validatedClassId,
            ...(assistantId ? { assistant_id: assistantId } : {}),
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
            // Set up metadata stripper for Familia conversations
            const metaStripper = familiaSystemPrompt ? createFamiliaMetaStripper() : null;

            const aiResponse = await callAIStream(
              model,
              fullMessages,
              (chunk) => {
                let safeChunk = chunk;
                if (metaStripper) {
                  safeChunk = metaStripper.processChunk(chunk);
                  if (!safeChunk) return; // Buffering potential meta tag
                }
                const data = JSON.stringify({ type: "chunk", content: safeChunk });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              },
              enableThinking
                ? (thinkingChunk) => {
                    const data = JSON.stringify({ type: "thinking", content: thinkingChunk });
                    controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                  }
                : undefined,
              familiaSystemPrompt
            );

            // Flush any remaining buffered content from meta stripper
            if (metaStripper) {
              const remaining = metaStripper.flush();
              if (remaining) {
                const data = JSON.stringify({ type: "chunk", content: remaining });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              }
            }

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

            // Parse and strip metadata from stored content for Familia
            const { cleanContent, metadata: familiaMetadata } = familiaSystemPrompt
              ? parseFamiliaMetadata(aiResponse.content)
              : { cleanContent: aiResponse.content, metadata: null };

            // Save assistant message
            if (streamConversationId) {
              const { data: assistantMsg } = await adminClient
                .from("messages")
                .insert({
                  conversation_id: streamConversationId,
                  role: "assistant",
                  content: cleanContent,
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

                // Save activity metadata for parent analytics
                if (familiaMetadata && streamConversationId) {
                  await adminClient.from("conversation_activity").insert({
                    conversation_id: streamConversationId,
                    message_id: assistantMsg.id,
                    subject: familiaMetadata.subject || null,
                    topic: familiaMetadata.topic || null,
                    activity_type: familiaMetadata.type || null,
                    struggle: familiaMetadata.struggle || false,
                  });
                }
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
            let errorCode = "AI_ERROR";

            if (error instanceof Error) {
              const errorMsg = error.message.toLowerCase();
              if (errorMsg.includes("too long") || errorMsg.includes("maximum") || errorMsg.includes("context_length")) {
                userMessage = "La conversation est trop longue pour être traitée. Vous pouvez résumer cette conversation et continuer dans une nouvelle.";
                errorCode = "CONTEXT_LENGTH_EXCEEDED";
              } else if (errorMsg.includes("rate_limit") || errorMsg.includes("429")) {
                userMessage = "Le service est surchargé. Veuillez réessayer dans quelques instants.";
                errorCode = "RATE_LIMITED";
              }
            }

            const errorData = JSON.stringify({
              type: "error",
              error: userMessage,
              code: errorCode,
              conversationId: streamConversationId,
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
    const aiResponse = await callAI(model, fullMessages, familiaSystemPrompt);

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
          class_id: validatedClassId,
          ...(assistantId ? { assistant_id: assistantId } : {}),
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

    // Parse and strip metadata from content for Familia
    const { cleanContent: nonStreamCleanContent, metadata: nonStreamMetadata } = familiaSystemPrompt
      ? parseFamiliaMetadata(aiResponse.content)
      : { cleanContent: aiResponse.content, metadata: null };

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

      // Assistant message (with metadata stripped)
      const { data: assistantMsg } = await adminClient
        .from("messages")
        .insert({
          conversation_id: finalConversationId,
          role: "assistant",
          content: nonStreamCleanContent,
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

        // Save activity metadata for parent analytics
        if (nonStreamMetadata && finalConversationId) {
          await adminClient.from("conversation_activity").insert({
            conversation_id: finalConversationId,
            message_id: assistantMsg.id,
            subject: nonStreamMetadata.subject || null,
            topic: nonStreamMetadata.topic || null,
            activity_type: nonStreamMetadata.type || null,
            struggle: nonStreamMetadata.struggle || false,
          });
        }
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
        content: nonStreamCleanContent,
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
    let errorCode = "AI_ERROR";

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
        errorCode = "RATE_LIMITED";
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

        // Log content flag for familia parental review
        try {
          const supabaseForFlag = await createClient();
          const { data: flagUser } = await supabaseForFlag.auth.getUser();
          if (flagUser?.user) {
            const familyInfo = await getFamilyOrgInfo(flagUser.user.id);
            if (familyInfo?.isFamilyMember && familyInfo.orgId) {
              await logContentFlag(
                null, // conversation_id not available in error handler
                flagUser.user.id,
                familyInfo.orgId,
                "content_policy",
                "Message bloque par le filtre de contenu du fournisseur IA"
              );
            }
          }
        } catch {
          // Non-blocking: don't fail the response if flagging fails
        }
      }
      // Timeout
      else if (errorMsg.includes("timeout") || errorMsg.includes("timed out")) {
        userMessage = "La requête a pris trop de temps. Veuillez réessayer.";
        statusCode = 504;
      }
      // Context length exceeded
      else if (errorMsg.includes("context_length") || errorMsg.includes("too long") || errorMsg.includes("maximum")) {
        userMessage = "La conversation est trop longue pour être traitée. Vous pouvez résumer cette conversation et continuer dans une nouvelle.";
        statusCode = 400;
        errorCode = "CONTEXT_LENGTH_EXCEEDED";
      }
    }

    return NextResponse.json(
      {
        error: userMessage,
        code: errorCode,
      },
      { status: statusCode }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { callAI } from "@/lib/ai/providers";
import { getModelFromDBAdmin, calculateCostFromDBAdmin, getAppSettingsAdmin } from "@/lib/pricing-db";
import { deductCreditsWithContext } from "@/lib/credits";

// Summarize a conversation for carrying over to a new one
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Fetch the conversation
    const { data: conversation, error: convError } = await adminClient
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: "Conversation non trouvée" },
        { status: 404 }
      );
    }

    // Fetch all messages from the conversation
    const { data: messages, error: msgError } = await adminClient
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (msgError) {
      return NextResponse.json(
        { error: "Erreur lors de la récupération des messages" },
        { status: 500 }
      );
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: "Aucun message à résumer" },
        { status: 400 }
      );
    }

    // Use a fast model for summarization (claude-haiku or similar)
    const summaryModel = "claude-3-5-haiku-20241022";
    const modelInfo = await getModelFromDBAdmin(summaryModel);

    if (!modelInfo) {
      return NextResponse.json(
        { error: "Modèle de résumé indisponible" },
        { status: 503 }
      );
    }

    // Build conversation text for summarization
    const conversationText = messages
      .map((m) => `${m.role === "user" ? "Utilisateur" : "Assistant"}: ${m.content}`)
      .join("\n\n");

    // Create summarization prompt
    const summaryPrompt = `Tu es un assistant spécialisé dans le résumé de conversations. Résume la conversation suivante de manière concise mais complète, en conservant:
- Le contexte et le sujet principal
- Les décisions ou conclusions importantes
- Les informations clés mentionnées (noms, dates, chiffres, etc.)
- Le ton et l'intention de l'utilisateur

La conversation sera utilisée pour continuer dans une nouvelle session, donc assure-toi que le résumé permette de reprendre naturellement.

Format de sortie: Un résumé structuré en 2-3 paragraphes maximum.

=== CONVERSATION À RÉSUMER ===
${conversationText}
=== FIN DE LA CONVERSATION ===`;

    // Call AI for summary
    const aiResponse = await callAI(summaryModel, [
      { role: "user", content: summaryPrompt },
    ]);

    // Calculate cost
    const cost = await calculateCostFromDBAdmin(
      summaryModel,
      aiResponse.tokensInput,
      aiResponse.tokensOutput
    );

    // Deduct credits
    await deductCreditsWithContext(
      user.id,
      cost,
      `Résumé de conversation: ${aiResponse.tokensInput} tokens entrée, ${aiResponse.tokensOutput} tokens sortie`,
      { type: "auto" }
    );

    return NextResponse.json({
      summary: aiResponse.content,
      originalTitle: conversation.title,
      messageCount: messages.length,
      cost,
    });
  } catch (error) {
    console.error("Summarize API error:", error);
    return NextResponse.json(
      { error: "Erreur lors du résumé de la conversation" },
      { status: 500 }
    );
  }
}

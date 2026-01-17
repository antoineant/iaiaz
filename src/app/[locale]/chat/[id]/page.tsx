import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ChatClient } from "../chat-client";
import { getPricingData } from "@/lib/pricing-db";
import type { ChatMessage } from "@/types";

interface ChatConversationPageProps {
  params: Promise<{ id: string }>;
}

export default async function ChatConversationPage({
  params,
}: ChatConversationPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Check if user has accepted terms
  const { data: termsCheck } = await supabase
    .from("profiles")
    .select("terms_accepted_at")
    .eq("id", user.id)
    .single();

  if (!termsCheck?.terms_accepted_at) {
    redirect("/auth/accept-terms");
  }

  // Fetch the conversation and verify ownership
  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (convError || !conversation) {
    notFound();
  }

  // Fetch all data in parallel
  const [profileResult, conversationsResult, messagesResult, pricingData] = await Promise.all([
    supabase
      .from("profiles")
      .select("credits_balance")
      .eq("id", user.id)
      .single(),
    supabase
      .from("conversations")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(50),
    supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true }),
    getPricingData(),
  ]);

  // Transform messages to ChatMessage format
  const initialMessages: ChatMessage[] = (messagesResult.data || []).map((msg) => ({
    id: msg.id,
    role: msg.role as "user" | "assistant",
    content: msg.content,
    tokens: msg.tokens_input
      ? {
          input: msg.tokens_input,
          output: msg.tokens_output || 0,
        }
      : undefined,
    cost: msg.cost || undefined,
  }));

  return (
    <ChatClient
      userId={user.id}
      initialBalance={profileResult.data?.credits_balance || 0}
      initialConversations={conversationsResult.data || []}
      conversationId={id}
      initialMessages={initialMessages}
      pricingData={pricingData}
    />
  );
}

import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ChatClient } from "../chat-client";
import { getPricingData } from "@/lib/pricing-db";
import { getUserCredits } from "@/lib/credits";
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

  // Fetch all data in parallel - only personal conversations (class_id IS NULL)
  const [credits, conversationsResult, messagesResult, pricingData, profileResult] = await Promise.all([
    getUserCredits(user.id),
    supabase
      .from("conversations")
      .select("*")
      .eq("user_id", user.id)
      .is("class_id", null) // Only personal conversations
      .order("updated_at", { ascending: false })
      .limit(50),
    supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true }),
    getPricingData(),
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .single(),
  ]);

  // Build org context if user is org member
  const orgContext = credits.source === "organization" ? {
    orgName: credits.orgName!,
    role: credits.role!,
    limits: credits.limits,
  } : undefined;

  // Build user info
  const userInfo = {
    displayName: profileResult.data?.display_name,
    email: user.email || "",
    avatarUrl: profileResult.data?.avatar_url,
  };

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
      initialBalance={credits.balance}
      personalBalance={credits.personalBalance}
      isTrainer={credits.isTrainer}
      initialConversations={conversationsResult.data || []}
      conversationId={id}
      initialMessages={initialMessages}
      pricingData={pricingData}
      orgContext={orgContext}
      userInfo={userInfo}
    />
  );
}

import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ChatClient } from "../chat-client";
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

  // Fetch user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("credits_balance")
    .eq("id", user.id)
    .single();

  // Fetch all conversations for the sidebar
  const { data: conversations } = await supabase
    .from("conversations")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  // Fetch messages for this conversation
  const { data: messagesData } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  // Transform messages to ChatMessage format
  const initialMessages: ChatMessage[] = (messagesData || []).map((msg) => ({
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
      initialBalance={profile?.credits_balance || 0}
      initialConversations={conversations || []}
      conversationId={id}
      initialMessages={initialMessages}
    />
  );
}

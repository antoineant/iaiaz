import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ChatClient } from "./chat-client";
import { getPricingData } from "@/lib/pricing-db";

export default async function ChatPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Fetch user profile and pricing data in parallel
  const [profileResult, conversationsResult, pricingData] = await Promise.all([
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
    getPricingData(),
  ]);

  return (
    <ChatClient
      userId={user.id}
      initialBalance={profileResult.data?.credits_balance || 0}
      initialConversations={conversationsResult.data || []}
      pricingData={pricingData}
    />
  );
}

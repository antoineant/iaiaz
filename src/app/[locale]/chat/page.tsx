import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ChatClient } from "./chat-client";
import { getPricingData } from "@/lib/pricing-db";
import { getUserCredits } from "@/lib/credits";

export default async function ChatPage() {
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
    .select("terms_accepted_at, display_name, avatar_url")
    .eq("id", user.id)
    .single();

  if (!termsCheck?.terms_accepted_at) {
    redirect("/auth/accept-terms");
  }

  // Fetch user credits (org or personal), conversations, and pricing data in parallel
  const [credits, conversationsResult, pricingData] = await Promise.all([
    getUserCredits(user.id),
    supabase
      .from("conversations")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(50),
    getPricingData(),
  ]);

  // Build org context if user is org member
  const orgContext = credits.source === "organization" ? {
    orgName: credits.orgName!,
    role: credits.role!,
    limits: credits.limits,
  } : undefined;

  // Build user info
  const userInfo = {
    displayName: termsCheck?.display_name,
    email: user.email || "",
    avatarUrl: termsCheck?.avatar_url,
  };

  return (
    <ChatClient
      userId={user.id}
      initialBalance={credits.balance}
      personalBalance={credits.personalBalance}
      isTrainer={credits.isTrainer}
      initialConversations={conversationsResult.data || []}
      pricingData={pricingData}
      orgContext={orgContext}
      userInfo={userInfo}
    />
  );
}

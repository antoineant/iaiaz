import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import { ChatClient } from "../chat-client";
import { getPricingData } from "@/lib/pricing-db";
import { getUserCredits } from "@/lib/credits";
import { getFamilyOrgInfo } from "@/lib/mifa/content-filter";
import { getThemeColor } from "@/lib/mifa/theme";
import type { ChatMessage, CustomAssistant } from "@/types";

interface ChatConversationPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function ChatConversationPage({
  params,
}: ChatConversationPageProps) {
  const { locale, id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  // Check if user has accepted terms
  const { data: termsCheck } = await supabase
    .from("profiles")
    .select("terms_accepted_at, display_name, avatar_url, accent_color, credits_allocated")
    .eq("id", user.id)
    .single();

  if (!termsCheck?.terms_accepted_at) {
    redirect(`/${locale}/auth/accept-terms`);
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

  // Check if user is a family child or parent
  const familyInfo = await getFamilyOrgInfo(user.id);
  const isMifaChild = familyInfo?.isFamilyMember && familyInfo.role !== "owner" && familyInfo.role !== "admin";
  const isMifaParent = familyInfo?.isFamilyMember && (familyInfo.role === "owner" || familyInfo.role === "admin");

  // Fetch org name for parent mode
  let mifaParentMode: { orgId: string; orgName: string } | undefined;
  if (isMifaParent && familyInfo?.orgId) {
    const { data: orgData } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", familyInfo.orgId)
      .single();
    mifaParentMode = {
      orgId: familyInfo.orgId,
      orgName: orgData?.name || "Family",
    };
  }

  // Fetch all data in parallel - only personal conversations (class_id IS NULL)
  const adminClient = createAdminClient();
  const [credits, conversationsResult, messagesResult, pricingData, mifaDataResult] = await Promise.all([
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
    // Fetch mifa data only for family children
    isMifaChild
      ? Promise.all([
          adminClient
            .from("custom_assistants")
            .select("*")
            .eq("user_id", user.id)
            .order("sort_order", { ascending: true }),
          adminClient
            .from("organization_members")
            .select("supervision_mode")
            .eq("user_id", user.id)
            .eq("status", "active")
            .single(),
          adminClient
            .from("parental_controls")
            .select("daily_credit_limit, cumulative_credits")
            .eq("child_user_id", user.id)
            .single(),
          // Get today's spending
          adminClient.rpc("get_daily_credits_used", { p_user_id: user.id }),
          // Get this week's spending (for cumulative mode)
          adminClient.rpc("get_weekly_credits_used", { p_user_id: user.id }),
        ])
      : Promise.resolve(null),
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

  // Build assistant info if conversation has an assistant_id
  let assistantInfo: { id: string; name: string; avatar: string; color: string } | undefined;
  if (conversation.assistant_id) {
    const { data: assistant } = await adminClient
      .from("custom_assistants")
      .select("id, name, avatar, color")
      .eq("id", conversation.assistant_id)
      .eq("user_id", user.id)
      .single();
    if (assistant) {
      const aTheme = getThemeColor(assistant.color);
      assistantInfo = {
        id: assistant.id,
        name: assistant.name,
        avatar: assistant.avatar,
        color: aTheme?.hex || "#3B82F6",
      };
    }
  }

  // Build mifaMode for family children
  let mifaMode: {
    assistants: CustomAssistant[];
    accentColor: string | null;
    supervisionMode: string;
    userName: string;
    dailyCreditLimit?: number | null;
    dailyCreditsUsed?: number;
    cumulativeCredits?: boolean;
    weeklyCreditsUsed?: number;
    creditsAllocated?: number;
  } | undefined;

  if (isMifaChild && mifaDataResult) {
    const [assistantsResult, membershipResult, parentalControlsResult, dailyUsedResult, weeklyUsedResult] = mifaDataResult;
    const firstName = termsCheck?.display_name?.split(" ")[0] || user.user_metadata?.full_name?.split(" ")[0] || "";
    const isCumulative = parentalControlsResult.data?.cumulative_credits ?? false;
    mifaMode = {
      assistants: (assistantsResult.data || []) as CustomAssistant[],
      accentColor: termsCheck?.accent_color || null,
      supervisionMode: membershipResult.data?.supervision_mode || "guided",
      userName: firstName,
      dailyCreditLimit: parentalControlsResult.data?.daily_credit_limit ? parseFloat(parentalControlsResult.data.daily_credit_limit) : null,
      dailyCreditsUsed: dailyUsedResult.data || 0,
      cumulativeCredits: isCumulative,
      weeklyCreditsUsed: weeklyUsedResult.data || 0,
      creditsAllocated: termsCheck?.credits_allocated ? parseFloat(termsCheck.credits_allocated) : undefined,
    };
  }

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
      assistantInfo={assistantInfo}
      mifaMode={mifaMode}
      mifaParentMode={mifaParentMode}
    />
  );
}

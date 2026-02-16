import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { ChatClient } from "./chat-client";
import { getPricingData } from "@/lib/pricing-db";
import { getUserCredits } from "@/lib/credits";
import { getThemeColor } from "@/lib/mifa/theme";
import { getFamilyOrgInfo } from "@/lib/mifa/content-filter";
import { getOrSeedAssistants } from "@/lib/mifa/assistants";
import type { CustomAssistant } from "@/types";

interface ChatPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ assistantId?: string }>;
}

export default async function ChatPage({ params, searchParams }: ChatPageProps) {
  const { locale } = await params;
  const { assistantId } = await searchParams;
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

  // Check if user is a family child (no longer redirect — they use /chat directly with mifaMode)
  const familyInfo = await getFamilyOrgInfo(user.id);
  const isMifaChild = familyInfo?.isFamilyMember && familyInfo.role !== "owner" && familyInfo.role !== "admin";

  // Check if user is a family owner/admin (no redirect — parents can use Study mode from /chat)
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

  // Fetch user credits (org or personal), personal conversations (class_id IS NULL), and pricing data in parallel
  const adminClient = createAdminClient();
  const [credits, conversationsResult, pricingData, mifaDataResult] = await Promise.all([
    getUserCredits(user.id),
    supabase
      .from("conversations")
      .select("*")
      .eq("user_id", user.id)
      .is("class_id", null) // Only personal conversations
      .order("updated_at", { ascending: false })
      .limit(50),
    getPricingData(),
    // Fetch mifa data only for family children
    isMifaChild
      ? Promise.all([
          getOrSeedAssistants(user.id),
          adminClient
            .from("organization_members")
            .select("supervision_mode, organization_id")
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

  // Fetch assistant info if assistantId provided
  let assistantInfo: { id: string; name: string; avatar: string; avatar_type?: "emoji" | "asset" | "generated"; color: string } | undefined;
  if (assistantId) {
    const { data: assistant } = await adminClient
      .from("custom_assistants")
      .select("id, name, avatar, avatar_type, color")
      .eq("id", assistantId)
      .eq("user_id", user.id)
      .single();
    if (assistant) {
      const theme = getThemeColor(assistant.color);
      assistantInfo = {
        id: assistant.id,
        name: assistant.name,
        avatar: assistant.avatar,
        avatar_type: assistant.avatar_type,
        color: theme?.hex || "#3B82F6",
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
    const [assistants, membershipResult, parentalControlsResult, dailyUsedResult, weeklyUsedResult] = mifaDataResult;
    const firstName = termsCheck?.display_name?.split(" ")[0] || user.user_metadata?.full_name?.split(" ")[0] || "";
    const isCumulative = parentalControlsResult.data?.cumulative_credits ?? false;
    mifaMode = {
      assistants,
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
      assistantInfo={assistantInfo}
      mifaMode={mifaMode}
      mifaParentMode={mifaParentMode}
    />
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { setRequestLocale } from "next-intl/server";
import { FamiliaDashboard } from "@/components/familia/familia-dashboard";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ welcome?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "fr" ? "Tableau de bord mifa" : "mifa Dashboard",
  };
}

export default async function FamiliaDashboardPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { welcome } = await searchParams;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  // Check if user is a family owner or admin
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id, role, organizations!inner(type)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .eq("organizations.type", "family")
    .limit(1)
    .maybeSingle();

  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    // Not a family owner/admin, redirect to regular dashboard
    redirect(`/${locale}/dashboard`);
  }

  const organizationId = membership.organization_id;

  // Fetch family members (manual join since FK doesn't exist between org_members and profiles)
  const { data: orgMembers } = await supabase
    .from("organization_members")
    .select("user_id, role, supervision_mode")
    .eq("organization_id", organizationId)
    .order("role", { ascending: true });

  // Fetch profiles separately
  const userIds = orgMembers?.map((m) => m.user_id) || [];
  const { data: profilesData } = await supabase
    .from("profiles")
    .select("id, display_name, birthdate, accent_color, credits_balance")
    .in("id", userIds);

  // Join them manually
  const membersRaw = orgMembers?.map((m) => ({
    ...m,
    profiles: profilesData?.find((p) => p.id === m.user_id) || null,
  })) || [];

  const members = membersRaw;

  // Fetch organization credit balance and subscription status
  const { data: org } = await supabase
    .from("organizations")
    .select("credit_balance, name, subscription_status, subscription_trial_end")
    .eq("id", organizationId)
    .single();

  // Use admin client to bypass RLS — parent needs to see children's conversations
  const adminClient = createAdminClient();

  // Fetch conversations from the last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const memberUserIds = members?.map((m) => m.user_id) || [];

  // Fetch conversations (basic info + join to custom_assistants)
  const { data: conversationsRaw } = await adminClient
    .from("conversations")
    .select(`
      id,
      user_id,
      created_at,
      title,
      assistant_id,
      custom_assistants(name, avatar)
    `)
    .in("user_id", memberUserIds)
    .gte("created_at", sevenDaysAgo.toISOString())
    .order("created_at", { ascending: false });

  const conversationIds = conversationsRaw?.map((c) => c.id) || [];

  // Fetch actual costs from api_usage (cost lives here, not on conversations)
  const { data: usageData } = conversationIds.length > 0
    ? await adminClient
        .from("api_usage")
        .select("user_id, cost_eur, message_id")
        .in("user_id", memberUserIds)
        .gte("created_at", sevenDaysAgo.toISOString())
    : { data: [] };

  // Fetch topic/subject metadata from conversation_activity
  const { data: activityData } = conversationIds.length > 0
    ? await adminClient
        .from("conversation_activity")
        .select("conversation_id, subject, topic, struggle")
        .in("conversation_id", conversationIds)
    : { data: [] };

  // Build cost-per-conversation lookup from api_usage
  // api_usage has message_id → messages has conversation_id; but we also have user_id
  // Simplify: aggregate cost per user_id from api_usage
  const costByUser: Record<string, number> = {};
  (usageData || []).forEach((u: any) => {
    costByUser[u.user_id] = (costByUser[u.user_id] || 0) + Number(u.cost_eur || 0);
  });

  // Build topic list per conversation from activity metadata
  const topicsByConversation: Record<string, string[]> = {};
  const struggleByConversation: Record<string, boolean> = {};
  (activityData || []).forEach((a: any) => {
    if (a.subject && a.subject !== "general") {
      if (!topicsByConversation[a.conversation_id]) {
        topicsByConversation[a.conversation_id] = [];
      }
      if (!topicsByConversation[a.conversation_id].includes(a.subject)) {
        topicsByConversation[a.conversation_id].push(a.subject);
      }
    }
    if (a.struggle) {
      struggleByConversation[a.conversation_id] = true;
    }
  });

  // Transform conversations with enriched data
  const conversations = (conversationsRaw || []).map((c: any) => ({
    ...c,
    custom_assistants: Array.isArray(c.custom_assistants) ? c.custom_assistants[0] : c.custom_assistants,
    cost: 0,
    topic_category: topicsByConversation[c.id]?.[0] || null,
    message_count: null,
  }));

  // Fetch conversation flags (difficulty, late usage, content policy)
  const { data: flags } = conversationIds.length > 0
    ? await adminClient
        .from("conversation_flags")
        .select("*")
        .in("conversation_id", conversationIds)
    : { data: [] };

  // Compute weekly stats from api_usage (accurate cost source)
  const weeklySpent = Object.values(costByUser).reduce((sum, c) => sum + c, 0);
  const weeklyConversations = conversations.length;
  const activeAlerts = (flags || []).filter((f: any) => f.flag_type === "difficulty" || f.flag_type === "late_usage").length;

  // Serialize data to plain objects (remove Supabase metadata)
  const serializedMembers = JSON.parse(JSON.stringify(members || []));
  const serializedConversations = JSON.parse(JSON.stringify(conversations || []));
  const serializedFlags = JSON.parse(JSON.stringify(flags || []));

  return (
    <FamiliaDashboard
      locale={locale}
      showWelcome={welcome === "true"}
      organizationId={organizationId}
      organizationName={org?.name || "mifa"}
      subscriptionStatus={org?.subscription_status || "none"}
      subscriptionTrialEnd={org?.subscription_trial_end || null}
      creditBalance={org?.credit_balance || 0}
      weeklySpent={weeklySpent}
      weeklyConversations={weeklyConversations}
      activeAlerts={activeAlerts}
      members={serializedMembers}
      conversations={serializedConversations}
      flags={serializedFlags}
      memberCosts={costByUser}
    />
  );
}

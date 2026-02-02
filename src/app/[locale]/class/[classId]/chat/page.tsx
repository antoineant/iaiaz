import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import { ClassChatClient } from "./class-chat-client";
import { getPricingData } from "@/lib/pricing-db";
import { getUserCredits } from "@/lib/credits";

interface ClassChatPageProps {
  params: Promise<{ locale: string; classId: string }>;
}

export default async function ClassChatPage({ params }: ClassChatPageProps) {
  const { locale, classId } = await params;
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  // Check if user has accepted terms
  const { data: termsCheck } = await supabase
    .from("profiles")
    .select("terms_accepted_at, display_name, avatar_url")
    .eq("id", user.id)
    .single();

  if (!termsCheck?.terms_accepted_at) {
    redirect(`/${locale}/auth/accept-terms`);
  }

  // Verify user is a member of this class and get class info
  const { data: membership } = await adminClient
    .from("organization_members")
    .select(`
      id,
      role,
      class_id,
      organization_id,
      organization_classes!inner (
        id,
        name,
        status,
        is_active,
        starts_at,
        ends_at
      ),
      organizations!inner (
        id,
        name,
        credit_balance
      )
    `)
    .eq("user_id", user.id)
    .eq("class_id", classId)
    .eq("status", "active")
    .single();

  if (!membership) {
    notFound();
  }

  // Type the nested data (Supabase returns these as objects when using .single())
  const classInfo = membership.organization_classes as unknown as {
    id: string;
    name: string;
    status: string;
    is_active: boolean;
    starts_at: string | null;
    ends_at: string | null;
  };

  const orgInfo = membership.organizations as unknown as {
    id: string;
    name: string;
    credit_balance: number;
  };

  // Check if class is accessible
  const now = new Date();
  const isAccessible = classInfo.is_active &&
    (!classInfo.starts_at || new Date(classInfo.starts_at) <= now) &&
    (!classInfo.ends_at || new Date(classInfo.ends_at) >= now);

  if (!isAccessible) {
    // Redirect to class info page if class is not accessible
    redirect(`/${locale}/class/${classId}`);
  }

  // Fetch data in parallel
  const [credits, classConversationsResult, pricingData] = await Promise.all([
    getUserCredits(user.id),
    adminClient
      .from("conversations")
      .select("*")
      .eq("user_id", user.id)
      .eq("class_id", classId)
      .order("updated_at", { ascending: false })
      .limit(50),
    getPricingData(),
  ]);

  // Build class context
  const classContext = {
    classId,
    className: classInfo.name,
    orgId: membership.organization_id,
    orgName: orgInfo.name,
    orgCredits: orgInfo.credit_balance,
  };

  // Build user info
  const userInfo = {
    displayName: termsCheck?.display_name,
    email: user.email || "",
    avatarUrl: termsCheck?.avatar_url,
  };

  return (
    <ClassChatClient
      userId={user.id}
      initialBalance={credits.orgBalance || 0}
      initialConversations={classConversationsResult.data || []}
      pricingData={pricingData}
      classContext={classContext}
      userInfo={userInfo}
      limits={credits.limits}
    />
  );
}

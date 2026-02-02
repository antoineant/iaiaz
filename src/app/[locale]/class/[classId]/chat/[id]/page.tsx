import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import { ClassChatClient } from "../class-chat-client";
import { getPricingData } from "@/lib/pricing-db";
import { getUserCredits } from "@/lib/credits";
import type { ChatMessage } from "@/types";

interface ClassChatConversationPageProps {
  params: Promise<{ locale: string; classId: string; id: string }>;
}

export default async function ClassChatConversationPage({
  params,
}: ClassChatConversationPageProps) {
  const { locale, classId, id: conversationId } = await params;
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  // Check terms acceptance
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

  // Verify the conversation belongs to this user AND this class
  const { data: conversation, error: convError } = await adminClient
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .eq("class_id", classId)
    .single();

  if (convError || !conversation) {
    notFound();
  }

  // Type the nested data (Supabase returns these as objects when using .single())
  const classInfo = membership.organization_classes as unknown as {
    id: string;
    name: string;
    status: string;
    starts_at: string | null;
    ends_at: string | null;
  };

  const orgInfo = membership.organizations as unknown as {
    id: string;
    name: string;
    credit_balance: number;
  };

  // Fetch data in parallel
  const [credits, classConversationsResult, messagesResult, pricingData, studentClassesResult] = await Promise.all([
    getUserCredits(user.id),
    adminClient
      .from("conversations")
      .select("*")
      .eq("user_id", user.id)
      .eq("class_id", classId)
      .order("updated_at", { ascending: false })
      .limit(50),
    adminClient
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true }),
    getPricingData(),
    // Fetch student's other active classes for sidebar navigation
    adminClient
      .from("organization_members")
      .select(`
        class_id,
        credit_allocated,
        credit_used,
        organization_classes!inner (
          id,
          name,
          status,
          starts_at,
          ends_at
        ),
        organizations!inner (
          name
        )
      `)
      .eq("user_id", user.id)
      .eq("status", "active")
      .not("class_id", "is", null),
  ]);

  // Transform student classes for sidebar
  const studentClasses = (studentClassesResult.data || [])
    .map((m) => {
      const cls = m.organization_classes as unknown as {
        id: string;
        name: string;
        status: string;
        starts_at: string | null;
        ends_at: string | null;
      };
      const org = m.organizations as unknown as { name: string };
      const now = new Date();
      const isAccessible = cls.status === 'active' &&
        (!cls.starts_at || new Date(cls.starts_at) <= now) &&
        (!cls.ends_at || new Date(cls.ends_at) >= now);
      return {
        class_id: m.class_id!,
        class_name: cls.name,
        organization_name: org.name,
        is_accessible: isAccessible,
        credits_remaining: (m.credit_allocated || 0) - (m.credit_used || 0),
      };
    })
    .filter((c) => c.class_id !== classId); // Exclude current class

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

  // Transform messages
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
    <ClassChatClient
      userId={user.id}
      initialBalance={credits.orgBalance || 0}
      initialConversations={classConversationsResult.data || []}
      conversationId={conversationId}
      initialMessages={initialMessages}
      pricingData={pricingData}
      classContext={classContext}
      userInfo={userInfo}
      limits={credits.limits}
      studentClasses={studentClasses}
    />
  );
}

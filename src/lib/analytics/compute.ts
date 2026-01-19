import { createAdminClient } from "@/lib/supabase/admin";

export interface ClassMetrics {
  total_messages: number;
  total_conversations: number;
  total_cost: number;
  unique_students: number;
  active_students: number;
  model_usage: Record<string, number>;
  peak_hours: number[];
  daily_usage: Array<{ date: string; messages: number; cost: number }>;
  top_students: Array<{ id: string; name: string; messages: number; cost: number }>;
}

export interface ComputeOptions {
  classId: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Compute analytics metrics for a class
 */
export async function computeClassMetrics(options: ComputeOptions): Promise<ClassMetrics> {
  const { classId, startDate, endDate } = options;
  const adminClient = createAdminClient();

  // Default to last 30 days if no dates specified
  const end = endDate || new Date();
  const start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Get all students in this class (fetch members and profiles separately to avoid join issues)
  const { data: members } = await adminClient
    .from("organization_members")
    .select("user_id, display_name")
    .eq("class_id", classId)
    .eq("status", "active");

  const studentIds = members?.map((m) => m.user_id) || [];

  // Fetch profiles for these students to get display names
  let profileMap = new Map<string, { display_name: string | null; email: string }>();
  if (studentIds.length > 0) {
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("id, display_name, email")
      .in("id", studentIds);

    if (profiles) {
      profileMap = new Map(profiles.map((p) => [p.id, { display_name: p.display_name, email: p.email }]));
    }
  }

  if (studentIds.length === 0) {
    return {
      total_messages: 0,
      total_conversations: 0,
      total_cost: 0,
      unique_students: 0,
      active_students: 0,
      model_usage: {},
      peak_hours: [],
      daily_usage: [],
      top_students: [],
    };
  }

  // First, get all conversations for class students
  const { data: conversations } = await adminClient
    .from("conversations")
    .select("id, user_id, model")
    .in("user_id", studentIds)
    .gte("created_at", start.toISOString())
    .lte("updated_at", end.toISOString());

  if (!conversations || conversations.length === 0) {
    return {
      total_messages: 0,
      total_conversations: 0,
      total_cost: 0,
      unique_students: members?.length || 0,
      active_students: 0,
      model_usage: {},
      peak_hours: [],
      daily_usage: [],
      top_students: [],
    };
  }

  const conversationIds = conversations.map((c) => c.id);
  const conversationMap = new Map(conversations.map((c) => [c.id, c]));

  // Then get all messages from those conversations within the date range
  const { data: messages } = await adminClient
    .from("messages")
    .select("id, role, cost, created_at, conversation_id")
    .in("conversation_id", conversationIds)
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString())
    .order("created_at", { ascending: true });

  if (!messages || messages.length === 0) {
    return {
      total_messages: 0,
      total_conversations: conversations.length,
      total_cost: 0,
      unique_students: members?.length || 0,
      active_students: new Set(conversations.map((c) => c.user_id)).size,
      model_usage: {},
      peak_hours: [],
      daily_usage: [],
      top_students: [],
    };
  }

  // Compute metrics
  const activeConversationIds = new Set<string>();
  const activeStudentIds = new Set<string>();
  const modelUsage: Record<string, number> = {};
  const hourCounts: Record<number, number> = {};
  const dailyUsage: Record<string, { messages: number; cost: number }> = {};
  const studentStats: Record<string, { messages: number; cost: number }> = {};

  let totalMessages = 0;
  let totalCost = 0;

  for (const msg of messages) {
    const conv = conversationMap.get(msg.conversation_id);
    if (!conv) continue;

    // Count user messages only for message count
    if (msg.role === "user") {
      totalMessages++;
    }

    // Track conversations
    activeConversationIds.add(conv.id);

    // Track active students
    activeStudentIds.add(conv.user_id);

    // Track cost (assistant messages have cost)
    if (msg.cost) {
      totalCost += msg.cost;
    }

    // Track model usage
    if (conv.model) {
      modelUsage[conv.model] = (modelUsage[conv.model] || 0) + 1;
    }

    // Track hourly distribution
    const hour = new Date(msg.created_at).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;

    // Track daily usage
    const dateKey = msg.created_at.split("T")[0];
    if (!dailyUsage[dateKey]) {
      dailyUsage[dateKey] = { messages: 0, cost: 0 };
    }
    if (msg.role === "user") {
      dailyUsage[dateKey].messages++;
    }
    if (msg.cost) {
      dailyUsage[dateKey].cost += msg.cost;
    }

    // Track per-student stats
    if (!studentStats[conv.user_id]) {
      studentStats[conv.user_id] = { messages: 0, cost: 0 };
    }
    if (msg.role === "user") {
      studentStats[conv.user_id].messages++;
    }
    if (msg.cost) {
      studentStats[conv.user_id].cost += msg.cost;
    }
  }

  // Find peak hours (top 3 hours with most activity)
  const sortedHours = Object.entries(hourCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([hour]) => parseInt(hour));

  // Format daily usage
  const dailyUsageArray = Object.entries(dailyUsage)
    .map(([date, data]) => ({
      date,
      messages: data.messages,
      cost: Math.round(data.cost * 100) / 100,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Get top students - use profileMap and member display names
  const getStudentName = (userId: string): string => {
    // First try profile
    const profile = profileMap.get(userId);
    if (profile?.display_name) return profile.display_name;
    if (profile?.email) return profile.email.split("@")[0];

    // Fall back to member display_name
    const member = members?.find((m) => m.user_id === userId);
    if (member?.display_name) return member.display_name;

    return "Anonymous";
  };

  const topStudents = Object.entries(studentStats)
    .map(([userId, stats]) => ({
      id: userId,
      name: getStudentName(userId),
      messages: stats.messages,
      cost: Math.round(stats.cost * 100) / 100,
    }))
    .sort((a, b) => b.messages - a.messages)
    .slice(0, 10);

  return {
    total_messages: totalMessages,
    total_conversations: activeConversationIds.size,
    total_cost: Math.round(totalCost * 100) / 100,
    unique_students: members?.length || 0,
    active_students: activeStudentIds.size,
    model_usage: modelUsage,
    peak_hours: sortedHours,
    daily_usage: dailyUsageArray,
    top_students: topStudents,
  };
}

/**
 * Store computed metrics in the analytics table
 */
export async function storeClassAnalytics(
  classId: string,
  periodType: "daily" | "weekly" | "monthly",
  periodStart: Date,
  periodEnd: Date,
  metrics: ClassMetrics
): Promise<void> {
  const adminClient = createAdminClient();

  await adminClient
    .from("class_analytics")
    .upsert({
      class_id: classId,
      period_type: periodType,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      metrics,
    }, {
      onConflict: "class_id,period_type,period_start",
    });
}

/**
 * Get stored analytics for a class
 */
export async function getStoredAnalytics(
  classId: string,
  periodType?: "daily" | "weekly" | "monthly"
): Promise<Array<{
  period_type: string;
  period_start: string;
  period_end: string;
  metrics: ClassMetrics;
  ai_insights: unknown;
}>> {
  const adminClient = createAdminClient();

  let query = adminClient
    .from("class_analytics")
    .select("period_type, period_start, period_end, metrics, ai_insights")
    .eq("class_id", classId)
    .order("period_start", { ascending: false });

  if (periodType) {
    query = query.eq("period_type", periodType);
  }

  const { data } = await query.limit(30);

  return (data || []) as Array<{
    period_type: string;
    period_start: string;
    period_end: string;
    metrics: ClassMetrics;
    ai_insights: unknown;
  }>;
}

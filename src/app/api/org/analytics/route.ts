import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOrgRole } from "@/lib/org";
import { createAdminClient } from "@/lib/supabase/admin";

export interface OrgMetrics {
  total_messages: number;
  total_conversations: number;
  total_cost: number;
  total_employees: number;
  active_employees: number;
  model_usage: Record<string, number>;
  peak_hours: number[];
  daily_usage: Array<{ date: string; messages: number; cost: number }>;
  top_employees: Array<{ id: string; name: string; messages: number; cost: number }>;
}

// GET /api/org/analytics - Get organization-wide analytics
export async function GET(request: NextRequest) {
  try {
    const membership = await requireOrgRole(["owner", "admin"]);

    if (!membership) {
      return NextResponse.json(
        { error: "Unauthorized - must be an admin" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = parseInt(searchParams.get("period") || "30");

    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    // Get all employees in the organization
    const { data: members } = await supabase
      .from("organization_members")
      .select("user_id, display_name")
      .eq("organization_id", membership.organizationId)
      .eq("status", "active")
      .in("role", ["owner", "admin", "teacher", "student"]);

    const employeeIds = members?.map((m) => m.user_id) || [];

    if (employeeIds.length === 0) {
      return NextResponse.json({
        organization_name: membership.organizationName,
        period,
        metrics: {
          total_messages: 0,
          total_conversations: 0,
          total_cost: 0,
          total_employees: 0,
          active_employees: 0,
          model_usage: {},
          peak_hours: [],
          daily_usage: [],
          top_employees: [],
        },
      });
    }

    // Fetch profiles for display names
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("id, display_name, email")
      .in("id", employeeIds);

    const profileMap = new Map(
      profiles?.map((p) => [p.id, { display_name: p.display_name, email: p.email }]) || []
    );

    // Get all conversations for employees
    const { data: conversations } = await adminClient
      .from("conversations")
      .select("id, user_id, model")
      .in("user_id", employeeIds)
      .gte("created_at", startDate.toISOString())
      .lte("updated_at", endDate.toISOString());

    if (!conversations || conversations.length === 0) {
      return NextResponse.json({
        organization_name: membership.organizationName,
        period,
        metrics: {
          total_messages: 0,
          total_conversations: 0,
          total_cost: 0,
          total_employees: members?.length || 0,
          active_employees: 0,
          model_usage: {},
          peak_hours: [],
          daily_usage: [],
          top_employees: [],
        },
      });
    }

    const conversationIds = conversations.map((c) => c.id);
    const conversationMap = new Map(conversations.map((c) => [c.id, c]));

    // Get all messages from those conversations
    const { data: messages } = await adminClient
      .from("messages")
      .select("id, role, cost, created_at, conversation_id")
      .in("conversation_id", conversationIds)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at", { ascending: true });

    if (!messages || messages.length === 0) {
      return NextResponse.json({
        organization_name: membership.organizationName,
        period,
        metrics: {
          total_messages: 0,
          total_conversations: conversations.length,
          total_cost: 0,
          total_employees: members?.length || 0,
          active_employees: new Set(conversations.map((c) => c.user_id)).size,
          model_usage: {},
          peak_hours: [],
          daily_usage: [],
          top_employees: [],
        },
      });
    }

    // Compute metrics
    const activeEmployeeIds = new Set<string>();
    const modelUsage: Record<string, number> = {};
    const hourCounts: Record<number, number> = {};
    const dailyUsage: Record<string, { messages: number; cost: number }> = {};
    const employeeStats: Record<string, { messages: number; cost: number }> = {};

    let totalMessages = 0;
    let totalCost = 0;

    for (const msg of messages) {
      const conv = conversationMap.get(msg.conversation_id);
      if (!conv) continue;

      if (msg.role === "user") {
        totalMessages++;
      }

      activeEmployeeIds.add(conv.user_id);

      if (msg.cost) {
        totalCost += msg.cost;
      }

      if (conv.model) {
        modelUsage[conv.model] = (modelUsage[conv.model] || 0) + 1;
      }

      const hour = new Date(msg.created_at).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;

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

      if (!employeeStats[conv.user_id]) {
        employeeStats[conv.user_id] = { messages: 0, cost: 0 };
      }
      if (msg.role === "user") {
        employeeStats[conv.user_id].messages++;
      }
      if (msg.cost) {
        employeeStats[conv.user_id].cost += msg.cost;
      }
    }

    // Find peak hours
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

    // Get employee name helper
    const getEmployeeName = (userId: string): string => {
      const profile = profileMap.get(userId);
      if (profile?.display_name) return profile.display_name;
      if (profile?.email) return profile.email.split("@")[0];
      const member = members?.find((m) => m.user_id === userId);
      if (member?.display_name) return member.display_name;
      return "Anonymous";
    };

    const topEmployees = Object.entries(employeeStats)
      .map(([userId, stats]) => ({
        id: userId,
        name: getEmployeeName(userId),
        messages: stats.messages,
        cost: Math.round(stats.cost * 100) / 100,
      }))
      .sort((a, b) => b.messages - a.messages)
      .slice(0, 10);

    const metrics: OrgMetrics = {
      total_messages: totalMessages,
      total_conversations: new Set(messages.map((m) => m.conversation_id)).size,
      total_cost: Math.round(totalCost * 100) / 100,
      total_employees: members?.length || 0,
      active_employees: activeEmployeeIds.size,
      model_usage: modelUsage,
      peak_hours: sortedHours,
      daily_usage: dailyUsageArray,
      top_employees: topEmployees,
    };

    return NextResponse.json({
      organization_name: membership.organizationName,
      period,
      metrics,
    });
  } catch (error) {
    console.error("Analytics fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

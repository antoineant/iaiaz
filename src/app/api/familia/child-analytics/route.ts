import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const childId = request.nextUrl.searchParams.get("childId");
    const days = Math.min(parseInt(request.nextUrl.searchParams.get("days") || "7", 10), 90);

    if (!childId) {
      return NextResponse.json({ error: "childId requis" }, { status: 400 });
    }

    // Verify parent is owner/admin in a family org that includes this child
    const { data: parentMembership } = await supabase
      .from("organization_members")
      .select("organization_id, role, organizations(type)")
      .eq("user_id", user.id)
      .in("role", ["owner", "admin"])
      .single();

    if (!parentMembership) {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const org = parentMembership.organizations as unknown as { type: string };
    if (org?.type !== "family") {
      return NextResponse.json({ error: "Pas un plan Familia" }, { status: 400 });
    }

    const orgId = parentMembership.organization_id;

    // Verify the child is in the same org
    const admin = createAdminClient();
    const { data: childMembership } = await admin
      .from("organization_members")
      .select("user_id, role, supervision_mode")
      .eq("organization_id", orgId)
      .eq("user_id", childId)
      .single();

    if (!childMembership) {
      return NextResponse.json({ error: "Enfant non trouve dans cette famille" }, { status: 404 });
    }

    // Date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startISO = startDate.toISOString();

    // Parallel queries
    const [
      profileRes,
      controlsRes,
      conversationsRes,
      apiUsageRes,
      flagsRes,
    ] = await Promise.all([
      admin.from("profiles").select("display_name, birthdate, school_year, accent_color").eq("id", childId).single(),
      admin.from("parental_controls").select("daily_credit_limit, cumulative_credits, quiet_hours_start, quiet_hours_end").eq("child_id", childId).single(),
      admin.from("conversations").select("id, title, model, created_at, user_id").eq("user_id", childId).gte("created_at", startISO).order("created_at", { ascending: false }),
      admin.from("api_usage").select("cost_eur, tokens_input, tokens_output, model, co2_grams, created_at, message_id").eq("user_id", childId).gte("created_at", startISO),
      admin.from("conversation_flags").select("id, flag_type, flag_reason, dismissed, created_at").eq("user_id", childId).order("created_at", { ascending: false }).limit(20),
    ]);

    const profile = profileRes.data;
    const controls = controlsRes.data;
    const conversations = conversationsRes.data || [];
    const apiUsage = apiUsageRes.data || [];
    const flags = flagsRes.data || [];

    const conversationIds = conversations.map((c) => c.id);

    // Fetch messages + conversation_activity for these conversations
    const [messagesRes, activityRes] = await Promise.all([
      conversationIds.length > 0
        ? admin.from("messages").select("id, conversation_id, role, created_at, cost").in("conversation_id", conversationIds)
        : Promise.resolve({ data: [] }),
      conversationIds.length > 0
        ? admin.from("conversation_activity").select("conversation_id, subject, topic, activity_type, struggle, created_at").in("conversation_id", conversationIds)
        : Promise.resolve({ data: [] }),
    ]);

    const messages = messagesRes.data || [];
    const activities = activityRes.data || [];

    // === Compute age bracket ===
    let ageBracket: string | null = null;
    if (profile?.birthdate) {
      const birth = new Date(profile.birthdate);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      if (age >= 12 && age <= 14) ageBracket = "12-14";
      else if (age >= 15 && age <= 17) ageBracket = "15-17";
      else if (age >= 18) ageBracket = "18+";
    }

    // === Totals ===
    const totalCost = apiUsage.reduce((s, u) => s + Number(u.cost_eur || 0), 0);
    const totalCo2 = apiUsage.reduce((s, u) => s + Number(u.co2_grams || 0), 0);
    const userMessages = messages.filter((m) => m.role === "user");

    // === Daily activity ===
    const dailyMap: Record<string, { conversations: Set<string>; cost: number; messages: number }> = {};
    for (let d = 0; d < days; d++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + d);
      const key = date.toISOString().slice(0, 10);
      dailyMap[key] = { conversations: new Set(), cost: 0, messages: 0 };
    }
    // Also add today
    const todayKey = endDate.toISOString().slice(0, 10);
    if (!dailyMap[todayKey]) dailyMap[todayKey] = { conversations: new Set(), cost: 0, messages: 0 };

    for (const msg of userMessages) {
      const day = msg.created_at?.slice(0, 10);
      if (day && dailyMap[day]) {
        dailyMap[day].messages++;
        dailyMap[day].conversations.add(msg.conversation_id);
      }
    }
    for (const u of apiUsage) {
      const day = u.created_at?.slice(0, 10);
      if (day && dailyMap[day]) {
        dailyMap[day].cost += Number(u.cost_eur || 0);
      }
    }

    const dailyActivity = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date,
        conversations: v.conversations.size,
        cost: Math.round(v.cost * 10000) / 10000,
        messages: v.messages,
      }));

    // === Subject breakdown ===
    const subjectMap: Record<string, { count: number; struggleCount: number }> = {};
    for (const a of activities) {
      const subj = a.subject || "general";
      if (!subjectMap[subj]) subjectMap[subj] = { count: 0, struggleCount: 0 };
      subjectMap[subj].count++;
      if (a.struggle) subjectMap[subj].struggleCount++;
    }
    const subjectBreakdown = Object.entries(subjectMap)
      .map(([subject, v]) => ({ subject, count: v.count, struggleCount: v.struggleCount }))
      .sort((a, b) => b.count - a.count);

    // === Activity type breakdown ===
    const typeMap: Record<string, number> = {};
    for (const a of activities) {
      const t = a.activity_type || "general";
      typeMap[t] = (typeMap[t] || 0) + 1;
    }
    const activityTypes = Object.entries(typeMap)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    // === Top topics ===
    const topicMap: Record<string, { subject: string; count: number; struggleCount: number }> = {};
    for (const a of activities) {
      if (!a.topic) continue;
      const key = `${a.topic}::${a.subject || "general"}`;
      if (!topicMap[key]) topicMap[key] = { subject: a.subject || "general", count: 0, struggleCount: 0 };
      topicMap[key].count++;
      if (a.struggle) topicMap[key].struggleCount++;
    }
    const topTopics = Object.entries(topicMap)
      .map(([key, v]) => ({
        topic: key.split("::")[0],
        subject: v.subject,
        count: v.count,
        struggleRatio: v.count > 0 ? v.struggleCount / v.count : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // === Usage heatmap (hour x day-of-week) ===
    const heatmapMap: Record<string, number> = {};
    for (const msg of userMessages) {
      if (!msg.created_at) continue;
      const d = new Date(msg.created_at);
      // JS: 0=Sun, we want 0=Mon
      const dow = (d.getDay() + 6) % 7;
      const hour = d.getHours();
      const key = `${dow}-${hour}`;
      heatmapMap[key] = (heatmapMap[key] || 0) + 1;
    }
    const usageHeatmap = Object.entries(heatmapMap).map(([key, count]) => {
      const [dow, hour] = key.split("-").map(Number);
      return { dayOfWeek: dow, hour, count };
    });

    // === Recent conversations with enrichment ===
    const activityByConv: Record<string, { subjects: Set<string>; hasStruggle: boolean }> = {};
    for (const a of activities) {
      if (!activityByConv[a.conversation_id]) {
        activityByConv[a.conversation_id] = { subjects: new Set(), hasStruggle: false };
      }
      if (a.subject && a.subject !== "general") activityByConv[a.conversation_id].subjects.add(a.subject);
      if (a.struggle) activityByConv[a.conversation_id].hasStruggle = true;
    }

    const msgCountByConv: Record<string, number> = {};
    const costByConv: Record<string, number> = {};
    for (const msg of messages) {
      msgCountByConv[msg.conversation_id] = (msgCountByConv[msg.conversation_id] || 0) + 1;
    }
    for (const u of apiUsage) {
      // api_usage has message_id; map message to conversation
      const msg = messages.find((m) => m.id === u.message_id);
      if (msg) {
        costByConv[msg.conversation_id] = (costByConv[msg.conversation_id] || 0) + Number(u.cost_eur || 0);
      }
    }

    const recentConversations = conversations.slice(0, 20).map((c) => ({
      id: c.id,
      title: c.title || "Sans titre",
      createdAt: c.created_at,
      model: c.model || "unknown",
      cost: Math.round((costByConv[c.id] || 0) * 10000) / 10000,
      messageCount: msgCountByConv[c.id] || 0,
      subjects: Array.from(activityByConv[c.id]?.subjects || []),
      hasStruggle: activityByConv[c.id]?.hasStruggle || false,
    }));

    return NextResponse.json({
      child: {
        displayName: profile?.display_name || "Enfant",
        birthdate: profile?.birthdate || null,
        schoolYear: profile?.school_year || null,
        accentColor: profile?.accent_color || null,
        supervisionMode: childMembership.supervision_mode || null,
        ageBracket,
      },
      controls: {
        dailyCreditLimit: controls?.daily_credit_limit ?? null,
        cumulativeCredits: controls?.cumulative_credits ?? false,
        quietHoursStart: controls?.quiet_hours_start ?? null,
        quietHoursEnd: controls?.quiet_hours_end ?? null,
      },
      period: {
        days,
        startDate: startDate.toISOString().slice(0, 10),
        endDate: endDate.toISOString().slice(0, 10),
      },
      totals: {
        conversations: conversations.length,
        cost: Math.round(totalCost * 10000) / 10000,
        messages: userMessages.length,
        co2Grams: Math.round(totalCo2 * 100) / 100,
      },
      dailyActivity,
      subjectBreakdown,
      activityTypes,
      topTopics,
      usageHeatmap,
      flags: flags.map((f) => ({
        id: f.id,
        flagType: f.flag_type,
        flagReason: f.flag_reason,
        createdAt: f.created_at,
        dismissed: f.dismissed,
      })),
      recentConversations,
    });
  } catch (error) {
    console.error("Child analytics error:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

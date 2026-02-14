import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  computeFingerprint,
  getCachedChildInsights,
  generateChildInsights,
} from "@/lib/familia/insights";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const body = await request.json();
    const { childId, days: rawDays, locale: rawLocale } = body;

    if (!childId) {
      return NextResponse.json({ error: "childId requis" }, { status: 400 });
    }

    const days = Math.min(parseInt(rawDays || "7", 10), 90);
    const locale = rawLocale === "en" ? "en" : "fr";

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
      return NextResponse.json(
        { error: "Pas un plan Familia" },
        { status: 400 }
      );
    }

    const orgId = parentMembership.organization_id;

    // Verify the child is in the same org
    const admin = createAdminClient();
    const { data: childMembership } = await admin
      .from("organization_members")
      .select("user_id, supervision_mode")
      .eq("organization_id", orgId)
      .eq("user_id", childId)
      .single();

    if (!childMembership) {
      return NextResponse.json(
        { error: "Enfant non trouve dans cette famille" },
        { status: 404 }
      );
    }

    // Fetch analytics data (same queries as child-analytics route)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startISO = startDate.toISOString();

    const [profileRes, conversationsRes, apiUsageRes, flagsRes] =
      await Promise.all([
        admin
          .from("profiles")
          .select("display_name, birthdate, school_year")
          .eq("id", childId)
          .single(),
        admin
          .from("conversations")
          .select("id, created_at, user_id")
          .eq("user_id", childId)
          .gte("created_at", startISO),
        admin
          .from("api_usage")
          .select("cost_eur, created_at, message_id")
          .eq("user_id", childId)
          .gte("created_at", startISO),
        admin
          .from("conversation_flags")
          .select("flag_type, flag_reason, created_at")
          .eq("user_id", childId)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

    const profile = profileRes.data;
    const conversations = conversationsRes.data || [];
    const apiUsage = apiUsageRes.data || [];
    const flags = flagsRes.data || [];

    const conversationIds = conversations.map((c) => c.id);

    // Fetch messages + activity
    const [messagesRes, activityRes] = await Promise.all([
      conversationIds.length > 0
        ? admin
            .from("messages")
            .select("id, conversation_id, role, created_at")
            .in("conversation_id", conversationIds)
        : Promise.resolve({ data: [] }),
      conversationIds.length > 0
        ? admin
            .from("conversation_activity")
            .select("conversation_id, subject, topic, struggle, created_at")
            .in("conversation_id", conversationIds)
        : Promise.resolve({ data: [] }),
    ]);

    const messages = messagesRes.data || [];
    const activities = activityRes.data || [];
    const userMessages = messages.filter((m) => m.role === "user");

    // Check minimum data
    if (conversations.length < 2 && userMessages.length < 5) {
      return NextResponse.json({
        suggestions: [],
        noData: true,
        cached: false,
      });
    }

    // Compute fingerprint
    const fingerprint = computeFingerprint(
      conversations.length,
      userMessages.length,
      days
    );

    // Check cache
    const cached = await getCachedChildInsights(
      childId,
      days,
      locale,
      fingerprint
    );
    if (cached) {
      return NextResponse.json(cached);
    }

    // Compute age bracket
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

    // Subject breakdown
    const subjectMap: Record<
      string,
      { count: number; struggleCount: number }
    > = {};
    for (const a of activities) {
      const subj = a.subject || "general";
      if (!subjectMap[subj])
        subjectMap[subj] = { count: 0, struggleCount: 0 };
      subjectMap[subj].count++;
      if (a.struggle) subjectMap[subj].struggleCount++;
    }
    const subjectBreakdown = Object.entries(subjectMap)
      .map(([subject, v]) => ({
        subject,
        count: v.count,
        struggleCount: v.struggleCount,
      }))
      .sort((a, b) => b.count - a.count);

    // Top topics
    const topicMap: Record<
      string,
      { subject: string; count: number; struggleCount: number }
    > = {};
    for (const a of activities) {
      if (!a.topic) continue;
      const key = `${a.topic}::${a.subject || "general"}`;
      if (!topicMap[key])
        topicMap[key] = {
          subject: a.subject || "general",
          count: 0,
          struggleCount: 0,
        };
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

    // Usage heatmap
    const heatmapMap: Record<string, number> = {};
    for (const msg of userMessages) {
      if (!msg.created_at) continue;
      const d = new Date(msg.created_at);
      const dow = (d.getDay() + 6) % 7;
      const hour = d.getHours();
      const key = `${dow}-${hour}`;
      heatmapMap[key] = (heatmapMap[key] || 0) + 1;
    }
    const usageHeatmap = Object.entries(heatmapMap).map(([key, count]) => {
      const [dow, hour] = key.split("-").map(Number);
      return { dayOfWeek: dow, hour, count };
    });

    const totalCost = apiUsage.reduce(
      (s, u) => s + Number(u.cost_eur || 0),
      0
    );

    // Generate suggestions
    const result = await generateChildInsights(
      childId,
      orgId,
      {
        child: {
          displayName: profile?.display_name || "Enfant",
          ageBracket,
          supervisionMode: childMembership.supervision_mode || null,
          schoolYear: profile?.school_year || null,
        },
        totals: {
          conversations: conversations.length,
          messages: userMessages.length,
          cost: totalCost,
        },
        subjectBreakdown,
        topTopics,
        usageHeatmap,
        flags: flags.map((f) => ({
          flagType: f.flag_type,
          flagReason: f.flag_reason,
          createdAt: f.created_at,
        })),
        period: { days },
      },
      locale,
      fingerprint
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Child insights error:", error);
    return NextResponse.json(
      { error: "Erreur interne" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    // Verify the user is a child member in a family org
    const admin = createAdminClient();
    const { data: membership } = await admin
      .from("organization_members")
      .select("organization_id, role, organizations(type)")
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const org = membership.organizations as unknown as { type: string };
    if (org?.type !== "family") {
      return NextResponse.json({ error: "Pas un plan Familia" }, { status: 400 });
    }

    // Date range: last 7 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const startISO = startDate.toISOString();

    // Parallel queries for conversations and api_usage
    const [conversationsRes, apiUsageRes] = await Promise.all([
      admin
        .from("conversations")
        .select("id")
        .eq("user_id", user.id)
        .gte("created_at", startISO),
      admin
        .from("api_usage")
        .select("cost_eur")
        .eq("user_id", user.id)
        .gte("created_at", startISO),
    ]);

    const conversations = conversationsRes.data || [];
    const apiUsage = apiUsageRes.data || [];

    // Credits used
    const creditsUsed = apiUsage.reduce((sum, u) => sum + Number(u.cost_eur || 0), 0);

    // Fetch conversation_activity for these conversations
    const conversationIds = conversations.map((c) => c.id);
    let subjects: { name: string; count: number }[] = [];

    if (conversationIds.length > 0) {
      const { data: activities } = await admin
        .from("conversation_activity")
        .select("subject")
        .in("conversation_id", conversationIds);

      const subjectMap: Record<string, number> = {};
      for (const a of activities || []) {
        const subj = a.subject || "general";
        subjectMap[subj] = (subjectMap[subj] || 0) + 1;
      }
      subjects = Object.entries(subjectMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    }

    return NextResponse.json({
      conversations: conversations.length,
      subjects,
      creditsUsed: Math.round(creditsUsed * 10000) / 10000,
    });
  } catch (error) {
    console.error("My stats error:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

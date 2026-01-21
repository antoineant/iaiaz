import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canManageClass } from "@/lib/org";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/org/classes/[id]/students - List students in a class
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!await canManageClass(id)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data: students, error } = await supabase
      .from("organization_members")
      .select(`
        id,
        user_id,
        display_name,
        credit_allocated,
        credit_used,
        status,
        created_at,
        updated_at,
        profile:profiles (
          email,
          display_name,
          avatar_url
        )
      `)
      .eq("class_id", id)
      .eq("role", "student")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching students:", error);
      return NextResponse.json(
        { error: "Failed to fetch students" },
        { status: 500 }
      );
    }

    // Get recent activity for each student
    const studentIds = students?.map((s) => s.id) || [];
    const userIds = students?.map((s) => s.user_id) || [];
    let lastActivity: Record<string, string> = {};

    if (studentIds.length > 0) {
      const { data: activities } = await supabase
        .from("organization_transactions")
        .select("member_id, created_at")
        .in("member_id", studentIds)
        .eq("type", "usage")
        .order("created_at", { ascending: false });

      if (activities) {
        // Get last activity for each student
        lastActivity = activities.reduce((acc, row) => {
          if (row.member_id && !acc[row.member_id]) {
            acc[row.member_id] = row.created_at;
          }
          return acc;
        }, {} as Record<string, string>);
      }
    }

    // Get analytics data for students (last 30 days)
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    const periodStart = startDate.toISOString().split("T")[0];

    let analyticsMap: Record<string, {
      ai_literacy_score: number;
      domain_engagement_score: number;
      quadrant: string;
      total_messages: number;
    }> = {};

    if (userIds.length > 0) {
      const { data: analytics } = await adminClient
        .from("student_analytics")
        .select("user_id, ai_literacy_score, domain_engagement_score, quadrant, total_messages")
        .eq("class_id", id)
        .eq("period_start", periodStart)
        .in("user_id", userIds);

      if (analytics) {
        analyticsMap = analytics.reduce((acc, row) => {
          acc[row.user_id] = {
            ai_literacy_score: row.ai_literacy_score,
            domain_engagement_score: row.domain_engagement_score,
            quadrant: row.quadrant,
            total_messages: row.total_messages,
          };
          return acc;
        }, {} as Record<string, {
          ai_literacy_score: number;
          domain_engagement_score: number;
          quadrant: string;
          total_messages: number;
        }>);
      }
    }

    // Format response
    const formattedStudents = students?.map((s) => {
      const profile = s.profile as { email?: string; display_name?: string; avatar_url?: string } | null;
      const analytics = analyticsMap[s.user_id];
      return {
        id: s.id,
        user_id: s.user_id,
        display_name: s.display_name || profile?.display_name || null,
        email: profile?.email || null,
        avatar_url: profile?.avatar_url || null,
        credit_allocated: s.credit_allocated,
        credit_used: s.credit_used,
        credit_remaining: Number(s.credit_allocated) - Number(s.credit_used),
        status: s.status,
        joined_at: s.created_at,
        last_activity: lastActivity[s.id] || null,
        // Analytics data
        ai_literacy_score: analytics?.ai_literacy_score ?? null,
        domain_engagement_score: analytics?.domain_engagement_score ?? null,
        quadrant: analytics?.quadrant ?? null,
        total_messages: analytics?.total_messages ?? 0,
      };
    });

    return NextResponse.json(formattedStudents);
  } catch (error) {
    console.error("Students fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canManageClass } from "@/lib/org";
import { computeClassMetrics, getStoredAnalytics } from "@/lib/analytics/compute";
import { getCachedInsights } from "@/lib/analytics/insights";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/org/classes/[id]/analytics - Get class analytics
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30"; // days

    if (!await canManageClass(id)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    // Get class info
    const { data: classData } = await supabase
      .from("organization_classes")
      .select("name")
      .eq("id", id)
      .single();

    // Calculate date range based on period
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Compute real-time metrics
    const metrics = await computeClassMetrics({
      classId: id,
      startDate,
      endDate,
    });

    // Get cached AI insights
    const insights = await getCachedInsights(id);

    // Get stored historical analytics
    const historical = await getStoredAnalytics(id);

    // Get real-time stats from RPC
    const { data: stats } = await supabase.rpc("get_class_stats", {
      p_class_id: id,
    });

    return NextResponse.json({
      class_name: classData?.name || "",
      period: parseInt(period),
      metrics,
      stats: stats || {},
      historical: historical.slice(0, 10),
      insights,
    });
  } catch (error) {
    console.error("Analytics fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

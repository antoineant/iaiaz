import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canManageClass } from "@/lib/org";
import { computeClassMetrics } from "@/lib/analytics/compute";
import { generateClassInsights } from "@/lib/analytics/insights";

type RouteParams = { params: Promise<{ id: string }> };

// POST /api/org/classes/[id]/analytics/insights - Generate AI insights
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

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

    if (!classData) {
      return NextResponse.json(
        { error: "Class not found" },
        { status: 404 }
      );
    }

    // Get locale from request body or default to fr
    const body = await request.json().catch(() => ({}));
    const locale = body.locale || "fr";

    // Compute metrics for last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const metrics = await computeClassMetrics({
      classId: id,
      startDate,
      endDate,
    });

    // Check if we have enough data
    if (metrics.total_messages < 5) {
      return NextResponse.json({
        insights: null,
        error: locale === "fr"
          ? "Pas assez de données pour générer des insights (minimum 5 messages)"
          : "Not enough data to generate insights (minimum 5 messages)",
      });
    }

    // Generate AI insights
    const insights = await generateClassInsights(
      id,
      classData.name,
      metrics,
      locale
    );

    return NextResponse.json({ insights });
  } catch (error) {
    console.error("Insights generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500 }
    );
  }
}

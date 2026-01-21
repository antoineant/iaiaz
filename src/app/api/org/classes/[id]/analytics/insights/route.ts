import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canManageClass } from "@/lib/org";
import { computeClassMetrics } from "@/lib/analytics/compute";
import { generateClassInsights } from "@/lib/analytics/insights";

type RouteParams = { params: Promise<{ id: string }> };

// Cache duration: 1 hour (in milliseconds)
const INSIGHTS_CACHE_DURATION = 60 * 60 * 1000;

interface StoredInsights {
  summary: string;
  engagement_analysis: {
    level: "low" | "medium" | "high";
    description: string;
  };
  usage_patterns: string[];
  model_preferences: string;
  recommendations: string[];
  generated_at: string;
}

// GET /api/org/classes/[id]/analytics/insights - Get cached insights
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const locale = url.searchParams.get("locale") || "fr";
    const period = parseInt(url.searchParams.get("period") || "30");

    if (!await canManageClass(id)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();

    // Check for cached insights
    const { data: cached } = await adminClient
      .from("class_insights")
      .select("*")
      .eq("class_id", id)
      .eq("period_days", period)
      .eq("locale", locale)
      .single();

    if (cached) {
      const insights: StoredInsights = {
        summary: cached.summary,
        engagement_analysis: {
          level: cached.engagement_level as "low" | "medium" | "high",
          description: cached.engagement_description || "",
        },
        usage_patterns: cached.usage_patterns || [],
        model_preferences: cached.model_preferences || "",
        recommendations: cached.recommendations || [],
        generated_at: cached.generated_at,
      };

      return NextResponse.json({
        insights,
        cached: true,
      });
    }

    return NextResponse.json({
      insights: null,
      cached: false,
    });
  } catch (error) {
    console.error("Insights fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch insights" },
      { status: 500 }
    );
  }
}

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
    const adminClient = createAdminClient();

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
    const forceRefresh = body.refresh === true;
    const period = body.period || 30;

    // Check for fresh cached insights (unless force refresh)
    if (!forceRefresh) {
      const { data: cached } = await adminClient
        .from("class_insights")
        .select("*")
        .eq("class_id", id)
        .eq("period_days", period)
        .eq("locale", locale)
        .single();

      if (cached) {
        const cacheAge = Date.now() - new Date(cached.generated_at).getTime();
        if (cacheAge < INSIGHTS_CACHE_DURATION) {
          const insights: StoredInsights = {
            summary: cached.summary,
            engagement_analysis: {
              level: cached.engagement_level as "low" | "medium" | "high",
              description: cached.engagement_description || "",
            },
            usage_patterns: cached.usage_patterns || [],
            model_preferences: cached.model_preferences || "",
            recommendations: cached.recommendations || [],
            generated_at: cached.generated_at,
          };

          return NextResponse.json({
            insights,
            cached: true,
          });
        }
      }
    }

    // Compute metrics
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

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

    // Store insights in database
    await adminClient
      .from("class_insights")
      .upsert({
        class_id: id,
        period_days: period,
        locale,
        summary: insights.summary,
        engagement_level: insights.engagement_analysis.level,
        engagement_description: insights.engagement_analysis.description,
        usage_patterns: insights.usage_patterns,
        model_preferences: insights.model_preferences,
        recommendations: insights.recommendations,
        generated_at: new Date().toISOString(),
      }, {
        onConflict: "class_id,period_days,locale",
      });

    return NextResponse.json({
      insights,
      cached: false,
    });
  } catch (error) {
    console.error("Insights generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500 }
    );
  }
}

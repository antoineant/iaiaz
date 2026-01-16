import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAllRateLimitStatuses, getRateLimitStatus, getModelTier } from "@/lib/rate-limiter";

// GET /api/rate-limit?model=claude-sonnet-4-20250514
// Returns rate limit status for a specific model or all tiers
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const modelId = searchParams.get("model");

    if (modelId) {
      // Get status for specific model
      const status = await getRateLimitStatus(supabase, user.id, modelId);
      const tier = getModelTier(modelId);

      return NextResponse.json({
        model: modelId,
        tier,
        ...status,
      });
    } else {
      // Get status for all tiers
      const statuses = await getAllRateLimitStatuses(supabase, user.id);

      return NextResponse.json({
        tiers: statuses,
      });
    }
  } catch (error) {
    console.error("Rate limit status error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la vérification des limites" },
      { status: 500 }
    );
  }
}

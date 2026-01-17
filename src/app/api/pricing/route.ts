import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export interface PricingModel {
  id: string;
  name: string;
  provider: string;
  input_price: number;
  output_price: number;
  description: string;
  category: string;
  is_recommended: boolean;
  capabilities?: {
    images?: boolean;
    pdf?: boolean;
  };
}

export interface PricingData {
  markup: number; // Percentage (e.g., 50 for 50%)
  markupMultiplier: number; // Multiplier (e.g., 1.5 for 50%)
  models: PricingModel[];
}

export async function GET() {
  try {
    const supabase = createAdminClient();

    // Fetch markup setting
    const { data: markupData } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "markup")
      .single();

    const markupPercentage = markupData?.value?.percentage ?? 50;
    const markupMultiplier = 1 + markupPercentage / 100;

    // Fetch active models
    const { data: models, error: modelsError } = await supabase
      .from("ai_models")
      .select("id, name, provider, input_price, output_price, description, category, is_recommended, capabilities")
      .eq("is_active", true)
      .order("provider", { ascending: true })
      .order("name", { ascending: true });

    if (modelsError) {
      console.error("Error fetching models:", modelsError);
      return NextResponse.json(
        { error: "Failed to fetch pricing data" },
        { status: 500 }
      );
    }

    const response: PricingData = {
      markup: markupPercentage,
      markupMultiplier,
      models: models || [],
    };

    return NextResponse.json(response, {
      headers: {
        // Cache for 5 minutes, but allow revalidation
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("Pricing API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getModelsForDisplay, type ModelConfig } from "@/lib/models";
import { getAppSettingsAdmin } from "@/lib/pricing-db";

// CORS headers for desktop app
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Handle OPTIONS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

interface ExternalModel {
  id: string;
  name: string;
  provider: string;
  description: string | null;
  category: string;
  isRecommended: boolean;
  capabilities: {
    images: boolean;
    pdf: boolean;
  };
  // Pricing (per million tokens, in USD)
  inputPrice: number;
  outputPrice: number;
}

/**
 * External Models API for desktop applications (Ainonymise)
 *
 * Authentication: Bearer token (API key stored in profiles.api_key)
 *
 * Returns available AI models with their capabilities for model selection.
 */
export async function GET(request: NextRequest) {
  const adminClient = createAdminClient();

  // Authenticate via API key
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "API key required", code: "UNAUTHORIZED" },
      { status: 401, headers: corsHeaders }
    );
  }

  const apiKey = authHeader.slice(7); // Remove "Bearer " prefix

  // Look up user by API key
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("id")
    .eq("api_key", apiKey)
    .single();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: "Invalid API key", code: "INVALID_API_KEY" },
      { status: 401, headers: corsHeaders }
    );
  }

  try {
    // Get all active models and pricing settings
    const [models, pricingSettings] = await Promise.all([
      getModelsForDisplay(),
      getAppSettingsAdmin(),
    ]);

    // Transform to external format
    const externalModels: ExternalModel[] = models.map((model: ModelConfig) => ({
      id: model.id,
      name: model.name,
      provider: model.provider,
      description: model.description,
      category: model.category,
      isRecommended: model.is_recommended,
      capabilities: {
        images: model.capabilities?.images ?? false,
        pdf: model.capabilities?.pdf ?? false,
      },
      inputPrice: model.input_price,
      outputPrice: model.output_price,
    }));

    // Group by provider for easier display
    const byProvider: Record<string, ExternalModel[]> = {};
    for (const model of externalModels) {
      if (!byProvider[model.provider]) {
        byProvider[model.provider] = [];
      }
      byProvider[model.provider].push(model);
    }

    return NextResponse.json({
      models: externalModels,
      byProvider,
      defaultModel: models.find((m: ModelConfig) => m.is_recommended)?.id || models[0]?.id,
      markupMultiplier: pricingSettings.markupMultiplier,
    }, { headers: corsHeaders });
  } catch (error) {
    console.error("Models API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch models", code: "INTERNAL_ERROR" },
      { status: 500, headers: corsHeaders }
    );
  }
}

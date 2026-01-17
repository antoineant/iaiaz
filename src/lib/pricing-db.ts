import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface DBModel {
  id: string;
  name: string;
  provider: string;
  input_price: number;
  output_price: number;
  description: string;
  category: string;
  is_recommended: boolean;
  is_active: boolean;
  max_tokens: number;
  capabilities?: {
    images?: boolean;
    pdf?: boolean;
  };
}

export interface AppSettings {
  markup: number;
  markupMultiplier: number;
  freeCredits: number;
  minBalanceWarning: number;
}

export interface PricingData {
  settings: AppSettings;
  models: DBModel[];
}

// Default settings used when database is unavailable
const DEFAULT_SETTINGS: AppSettings = {
  markup: 50,
  markupMultiplier: 1.5,
  freeCredits: 1.0,
  minBalanceWarning: 0.5,
};

// Fetch active models from database
export async function getModelsFromDB(): Promise<DBModel[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ai_models")
    .select("*")
    .eq("is_active", true)
    .order("provider", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching models:", error);
    return [];
  }

  return data || [];
}

// Fetch app settings from database (for server components)
export async function getAppSettings(): Promise<AppSettings> {
  const supabase = await createClient();
  return fetchSettingsWithClient(supabase);
}

// Fetch app settings using admin client (for API routes)
export async function getAppSettingsAdmin(): Promise<AppSettings> {
  const supabase = createAdminClient();
  return fetchSettingsWithClient(supabase);
}

// Internal helper to fetch settings with any client
async function fetchSettingsWithClient(supabase: SupabaseClient): Promise<AppSettings> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("key, value");

  if (error) {
    console.error("Error fetching settings:", error);
    return DEFAULT_SETTINGS;
  }

  const settings: AppSettings = { ...DEFAULT_SETTINGS };

  data?.forEach((setting) => {
    if (setting.key === "markup" && setting.value?.percentage !== undefined) {
      settings.markup = setting.value.percentage;
      settings.markupMultiplier = 1 + setting.value.percentage / 100;
    }
    if (setting.key === "free_credits" && setting.value?.amount !== undefined) {
      settings.freeCredits = setting.value.amount;
    }
    if (setting.key === "min_balance_warning" && setting.value?.amount !== undefined) {
      settings.minBalanceWarning = setting.value.amount;
    }
  });

  return settings;
}

// Get full pricing data for server components (settings + models)
export async function getPricingData(): Promise<PricingData> {
  const [settings, models] = await Promise.all([
    getAppSettings(),
    getModelsFromDB(),
  ]);
  return { settings, models };
}

// Calculate cost using database model and settings (for server components)
export async function calculateCostFromDB(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): Promise<number> {
  const supabase = await createClient();
  return calculateCostWithClient(supabase, modelId, inputTokens, outputTokens);
}

// Calculate cost using admin client (for API routes)
export async function calculateCostFromDBAdmin(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): Promise<number> {
  const supabase = createAdminClient();
  return calculateCostWithClient(supabase, modelId, inputTokens, outputTokens);
}

// Internal helper to calculate cost with any client
async function calculateCostWithClient(
  supabase: SupabaseClient,
  modelId: string,
  inputTokens: number,
  outputTokens: number
): Promise<number> {
  // Fetch model pricing
  const { data: model, error: modelError } = await supabase
    .from("ai_models")
    .select("input_price, output_price")
    .eq("id", modelId)
    .single();

  if (modelError || !model) {
    throw new Error(`Model not found: ${modelId}`);
  }

  // Fetch markup setting
  const { data: settingsData } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "markup")
    .single();

  const markupPercentage = settingsData?.value?.percentage ?? 50;
  const markup = 1 + markupPercentage / 100;

  const baseCost =
    (inputTokens * model.input_price + outputTokens * model.output_price) / 1_000_000;

  return baseCost * markup;
}

// Get model info from database
export async function getModelFromDB(modelId: string): Promise<DBModel | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ai_models")
    .select("*")
    .eq("id", modelId)
    .single();

  if (error) {
    console.error("Error fetching model:", error);
    return null;
  }

  return data;
}

// Get model info using admin client (for API routes)
export async function getModelFromDBAdmin(modelId: string): Promise<DBModel | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("ai_models")
    .select("*")
    .eq("id", modelId)
    .single();

  if (error) {
    console.error("Error fetching model:", error);
    return null;
  }

  return data;
}

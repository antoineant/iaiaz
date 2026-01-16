import { createClient } from "@/lib/supabase/server";

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
}

export interface AppSettings {
  markup: number;
  freeCredits: number;
  minBalanceWarning: number;
}

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

// Fetch app settings from database
export async function getAppSettings(): Promise<AppSettings> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("app_settings")
    .select("key, value");

  if (error) {
    console.error("Error fetching settings:", error);
    // Return defaults
    return {
      markup: 50,
      freeCredits: 1.0,
      minBalanceWarning: 0.5,
    };
  }

  const settings: AppSettings = {
    markup: 50,
    freeCredits: 1.0,
    minBalanceWarning: 0.5,
  };

  data?.forEach((setting) => {
    if (setting.key === "markup" && setting.value.percentage) {
      settings.markup = setting.value.percentage;
    }
    if (setting.key === "free_credits" && setting.value.amount) {
      settings.freeCredits = setting.value.amount;
    }
    if (setting.key === "min_balance_warning" && setting.value.amount) {
      settings.minBalanceWarning = setting.value.amount;
    }
  });

  return settings;
}

// Calculate cost using database model and settings
export async function calculateCostFromDB(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): Promise<number> {
  const supabase = await createClient();

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

  const markupPercentage = settingsData?.value?.percentage || 50;
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

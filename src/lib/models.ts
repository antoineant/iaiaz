/**
 * Centralized Model Configuration
 *
 * All model-related config is fetched from the database and cached.
 * This allows admins to change model IDs, pricing, and settings without code changes.
 */

import { createAdminClient } from "@/lib/supabase/admin";

// ============================================================================
// TYPES
// ============================================================================

export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  input_price: number;  // per 1M tokens in USD
  output_price: number;
  description: string | null;
  category: string;
  is_recommended: boolean;
  is_active: boolean;
  max_tokens: number;
  rate_limit_tier: "economy" | "standard" | "premium";
  capabilities: {
    images: boolean;
    pdf: boolean;
    code?: boolean;
  };
  system_role: string | null;
  display_order: number;
  co2_per_million_tokens: number;
}

export interface ModelSettings {
  default_chat_model: { model_id: string };
  analytics_model: { model_id: string };
  economy_model: { model_id: string };
}

export type ModelId = string;

// ============================================================================
// CACHE
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

let modelsCache: CacheEntry<Record<string, ModelConfig>> | null = null;
let settingsCache: CacheEntry<ModelSettings> | null = null;

function isCacheValid<T>(cache: CacheEntry<T> | null): cache is CacheEntry<T> {
  return cache !== null && Date.now() - cache.timestamp < CACHE_TTL;
}

// ============================================================================
// DATA FETCHING
// ============================================================================

/**
 * Get all active models from database (with caching)
 */
export async function getAllModels(): Promise<Record<string, ModelConfig>> {
  // Store reference before type guard narrows the type
  const existingCache = modelsCache;

  if (isCacheValid(modelsCache)) {
    return modelsCache.data;
  }

  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("ai_models")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Failed to fetch models:", error);
    // Return cached data if available, even if stale
    if (existingCache !== null) return existingCache.data;
    return {};
  }

  const models: Record<string, ModelConfig> = {};
  for (const model of data || []) {
    models[model.id] = {
      id: model.id,
      name: model.name,
      provider: model.provider,
      input_price: parseFloat(model.input_price),
      output_price: parseFloat(model.output_price),
      description: model.description,
      category: model.category || "balanced",
      is_recommended: model.is_recommended || false,
      is_active: model.is_active,
      max_tokens: model.max_tokens || 4096,
      rate_limit_tier: model.rate_limit_tier || "standard",
      capabilities: model.capabilities || { images: false, pdf: false },
      system_role: model.system_role,
      display_order: model.display_order || 100,
      co2_per_million_tokens: parseFloat(model.co2_per_million_tokens || "0.5"),
    };
  }

  modelsCache = { data: models, timestamp: Date.now() };
  return models;
}

/**
 * Get model settings from database (with caching)
 */
export async function getModelSettings(): Promise<ModelSettings> {
  // Store reference before type guard narrows the type
  const existingCache = settingsCache;

  if (isCacheValid(settingsCache)) {
    return settingsCache.data;
  }

  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("app_settings")
    .select("key, value")
    .in("key", ["default_chat_model", "analytics_model", "economy_model"]);

  const defaults: ModelSettings = {
    default_chat_model: { model_id: "claude-sonnet-4-20250514" },
    analytics_model: { model_id: "claude-sonnet-4-20250514" },
    economy_model: { model_id: "gpt-4o-mini" },
  };

  if (error) {
    console.error("Failed to fetch model settings:", error);
    if (existingCache !== null) return existingCache.data;
    return defaults;
  }

  const settings = { ...defaults };
  for (const row of data || []) {
    if (row.key in settings) {
      settings[row.key as keyof ModelSettings] = row.value;
    }
  }

  settingsCache = { data: settings, timestamp: Date.now() };
  return settings;
}

/**
 * Invalidate cache (call after admin updates)
 */
export function invalidateModelCache(): void {
  modelsCache = null;
  settingsCache = null;
}

// ============================================================================
// MODEL HELPERS
// ============================================================================

/**
 * Get a specific model by ID
 */
export async function getModel(modelId: string): Promise<ModelConfig | null> {
  const models = await getAllModels();
  return models[modelId] || null;
}

/**
 * Get the default chat model ID
 */
export async function getDefaultChatModel(): Promise<string> {
  const settings = await getModelSettings();
  return settings.default_chat_model.model_id;
}

/**
 * Get the analytics model ID
 */
export async function getAnalyticsModel(): Promise<string> {
  const settings = await getModelSettings();
  return settings.analytics_model.model_id;
}

/**
 * Get the economy model ID (for cost-sensitive operations)
 */
export async function getEconomyModel(): Promise<string> {
  const settings = await getModelSettings();
  return settings.economy_model.model_id;
}

/**
 * Get model by system role
 */
export async function getModelByRole(role: string): Promise<string | null> {
  const models = await getAllModels();
  const model = Object.values(models).find((m) => m.system_role === role);
  return model?.id || null;
}

/**
 * Get models sorted for display
 */
export async function getModelsForDisplay(): Promise<ModelConfig[]> {
  const models = await getAllModels();
  return Object.values(models).sort((a, b) => a.display_order - b.display_order);
}

/**
 * Get models by category
 */
export async function getModelsByCategory(category: string): Promise<ModelConfig[]> {
  const models = await getAllModels();
  return Object.values(models).filter((m) => m.category === category);
}

/**
 * Get models by provider
 */
export async function getModelsByProvider(provider: string): Promise<ModelConfig[]> {
  const models = await getAllModels();
  return Object.values(models).filter((m) => m.provider === provider);
}

// ============================================================================
// PRICING HELPERS
// ============================================================================

// Markup applied to API costs
const MARKUP = 1.5;

/**
 * Calculate cost for a model usage
 */
export async function calculateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): Promise<number> {
  const model = await getModel(modelId);
  if (!model) {
    console.warn(`Unknown model: ${modelId}, using default pricing`);
    // Fallback pricing
    const baseCost = (inputTokens * 3.0 + outputTokens * 15.0) / 1_000_000;
    return baseCost * MARKUP;
  }

  const baseCost =
    (inputTokens * model.input_price + outputTokens * model.output_price) / 1_000_000;
  return baseCost * MARKUP;
}

/**
 * Estimate cost for text input
 */
export async function estimateCost(
  modelId: string,
  inputText: string,
  estimatedOutputTokens = 500
): Promise<{ inputTokens: number; outputTokens: number; cost: number }> {
  // Rough estimation: ~4 characters per token
  const inputTokens = Math.ceil(inputText.length / 4);
  const cost = await calculateCost(modelId, inputTokens, estimatedOutputTokens);
  return { inputTokens, outputTokens: estimatedOutputTokens, cost };
}

/**
 * Get model pricing info
 */
export async function getModelPricing(modelId: string): Promise<{
  input: number;
  output: number;
  markup: number;
} | null> {
  const model = await getModel(modelId);
  if (!model) return null;

  return {
    input: model.input_price,
    output: model.output_price,
    markup: MARKUP,
  };
}

// ============================================================================
// CAPABILITIES HELPERS
// ============================================================================

/**
 * Get model capabilities
 */
export async function getModelCapabilities(modelId: string): Promise<{
  images: boolean;
  pdf: boolean;
  code?: boolean;
} | null> {
  const model = await getModel(modelId);
  return model?.capabilities || null;
}

/**
 * Check if model supports images
 */
export async function modelSupportsImages(modelId: string): Promise<boolean> {
  const capabilities = await getModelCapabilities(modelId);
  return capabilities?.images || false;
}

/**
 * Check if model supports PDF
 */
export async function modelSupportsPdf(modelId: string): Promise<boolean> {
  const capabilities = await getModelCapabilities(modelId);
  return capabilities?.pdf || false;
}

// ============================================================================
// RATE LIMIT HELPERS
// ============================================================================

/**
 * Get rate limit tier for a model
 */
export async function getModelRateLimitTier(
  modelId: string
): Promise<"economy" | "standard" | "premium"> {
  const model = await getModel(modelId);
  return model?.rate_limit_tier || "standard";
}

// ============================================================================
// CO2 HELPERS
// ============================================================================

/**
 * Calculate CO2 emissions for model usage
 */
export async function calculateCO2(
  modelId: string,
  totalTokens: number
): Promise<number> {
  const model = await getModel(modelId);
  const co2PerMillion = model?.co2_per_million_tokens || 0.5;
  return (totalTokens / 1_000_000) * co2PerMillion;
}

// ============================================================================
// CREDIT PACKS (static for now, could be moved to DB later)
// ============================================================================

export const CREDIT_PACKS = [
  {
    id: "starter",
    name: "Starter",
    credits: 5,
    price: 5,
    description: "Idéal pour découvrir",
    popular: false,
  },
  {
    id: "regular",
    name: "Regular",
    credits: 10,
    price: 10,
    description: "Le plus populaire",
    popular: true,
  },
  {
    id: "power",
    name: "Power",
    credits: 20,
    price: 20,
    description: "Pour les gros utilisateurs",
    popular: false,
  },
] as const;

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

// ============================================================================
// ORGANIZATION CREDIT PACKS (for schools and trainers)
// ============================================================================

export const ORG_CREDIT_PACKS = [
  {
    id: "org-starter",
    name: "Classe",
    credits: 50,
    price: 50,
    description: "Pour une classe (~25 étudiants)",
    popular: false,
    discount: 0,
  },
  {
    id: "org-standard",
    name: "Formation",
    credits: 100,
    price: 95, // 5% discount
    description: "Pour plusieurs classes",
    popular: true,
    discount: 5,
  },
  {
    id: "org-premium",
    name: "Établissement",
    credits: 200,
    price: 180, // 10% discount
    description: "Pour un département",
    popular: false,
    discount: 10,
  },
  {
    id: "org-enterprise",
    name: "Institution",
    credits: 500,
    price: 425, // 15% discount
    description: "Pour tout l'établissement",
    popular: false,
    discount: 15,
  },
] as const;

/**
 * Calculate discounted price for custom org amounts
 * - 100€+: 5% discount
 * - 200€+: 10% discount
 * - 500€+: 15% discount
 */
export function calculateOrgDiscount(amount: number): { price: number; discount: number } {
  if (amount >= 500) {
    return { price: Math.round(amount * 0.85), discount: 15 };
  } else if (amount >= 200) {
    return { price: Math.round(amount * 0.90), discount: 10 };
  } else if (amount >= 100) {
    return { price: Math.round(amount * 0.95), discount: 5 };
  }
  return { price: amount, discount: 0 };
}

// ============================================================================
// SUBSCRIPTION PLANS (for trainers and schools)
// ============================================================================

export interface SubscriptionPlan {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  features: string[];
  featuresEn: string[];
  accountType: "trainer" | "school" | "business";
  // Pricing model
  pricingModel: "flat" | "per_seat";
  monthlyPrice: number; // For flat: total price. For per_seat: price per student
  yearlyPrice: number; // Same logic, yearly (with discount)
  // Limits
  maxClasses: number | null; // null = unlimited
  includedSeats?: number; // For per_seat plans, minimum seats included
  // Features
  analyticsIncluded: boolean;
  multiAdmin: boolean;
  prioritySupport: boolean;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  // Trainer plan - flat €9.90/month
  {
    id: "trainer-pro",
    name: "Formateur Pro",
    nameEn: "Trainer Pro",
    description: "Gérez vos classes avec analytics",
    descriptionEn: "Manage your classes with analytics",
    features: [
      "Jusqu'à 5 classes",
      "Tableau de bord analytics",
      "Gestion des étudiants",
      "Allocation de crédits",
      "Support par email",
    ],
    featuresEn: [
      "Up to 5 classes",
      "Analytics dashboard",
      "Student management",
      "Credit allocation",
      "Email support",
    ],
    accountType: "trainer",
    pricingModel: "flat",
    monthlyPrice: 9.90,
    yearlyPrice: 99, // ~2 months free
    maxClasses: 5,
    analyticsIncluded: true,
    multiAdmin: false,
    prioritySupport: false,
  },
  // School plan - €1/student/month
  {
    id: "school-seat",
    name: "Établissement",
    nameEn: "School",
    description: "1€ par étudiant actif par mois",
    descriptionEn: "€1 per active student per month",
    features: [
      "Classes illimitées",
      "Analytics complets",
      "Multi-administrateurs",
      "Gestion des formateurs",
      "Allocation de crédits",
      "Rapports exportables",
      "Support prioritaire",
    ],
    featuresEn: [
      "Unlimited classes",
      "Full analytics",
      "Multiple administrators",
      "Trainer management",
      "Credit allocation",
      "Exportable reports",
      "Priority support",
    ],
    accountType: "school",
    pricingModel: "per_seat",
    monthlyPrice: 1.00, // €1 per student
    yearlyPrice: 10.00, // €10 per student/year (~2 months free)
    maxClasses: null,
    includedSeats: 10, // Minimum 10 students (€10/month minimum)
    analyticsIncluded: true,
    multiAdmin: true,
    prioritySupport: true,
  },
  // Business plan - €4.90/employee/month (basic)
  {
    id: "business-seat",
    name: "Entreprise",
    nameEn: "Business",
    description: "4,90€ par collaborateur actif par mois",
    descriptionEn: "€4.90 per active employee per month",
    features: [
      "Équipes illimitées",
      "Analytics complets",
      "Multi-administrateurs",
      "Gestion des collaborateurs",
      "Support par email",
    ],
    featuresEn: [
      "Unlimited teams",
      "Full analytics",
      "Multiple administrators",
      "Employee management",
      "Email support",
    ],
    accountType: "business",
    pricingModel: "per_seat",
    monthlyPrice: 4.90, // €4.90 per employee
    yearlyPrice: 49.00, // €49 per employee/year (~2 months free)
    maxClasses: null,
    includedSeats: 5, // Minimum 5 employees (€24.50/month minimum)
    analyticsIncluded: true,
    multiAdmin: true,
    prioritySupport: false,
  },
  // Business Pro plan - €9.90/employee/month (with anonymization)
  {
    id: "business-pro",
    name: "Entreprise Pro",
    nameEn: "Business Pro",
    description: "9,90€ par collaborateur actif par mois",
    descriptionEn: "€9.90 per active employee per month",
    features: [
      "Équipes illimitées",
      "Analytics complets",
      "Multi-administrateurs",
      "Gestion des collaborateurs",
      "Application d'anonymisation",
      "Données traitées localement",
      "Support prioritaire",
    ],
    featuresEn: [
      "Unlimited teams",
      "Full analytics",
      "Multiple administrators",
      "Employee management",
      "Anonymization app",
      "Data processed locally",
      "Priority support",
    ],
    accountType: "business",
    pricingModel: "per_seat",
    monthlyPrice: 9.90, // €9.90 per employee
    yearlyPrice: 99.00, // €99 per employee/year (~2 months free)
    maxClasses: null,
    includedSeats: 5, // Minimum 5 employees (€49.50/month minimum)
    analyticsIncluded: true,
    multiAdmin: true,
    prioritySupport: true,
  },
];

/**
 * Get subscription plan by ID
 */
export function getSubscriptionPlan(planId: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find((p) => p.id === planId);
}

/**
 * Get plans available for an account type
 */
export function getPlansForAccountType(accountType: "trainer" | "school" | "business"): SubscriptionPlan[] {
  return SUBSCRIPTION_PLANS.filter((p) => p.accountType === accountType);
}

/**
 * Calculate subscription price based on plan and seat count
 */
export function calculateSubscriptionPrice(
  plan: SubscriptionPlan,
  seatCount: number,
  billingPeriod: "monthly" | "yearly"
): { price: number; seats: number; pricePerSeat?: number } {
  if (plan.pricingModel === "flat") {
    return {
      price: billingPeriod === "monthly" ? plan.monthlyPrice : plan.yearlyPrice,
      seats: 0,
    };
  }

  // Per-seat pricing
  const effectiveSeats = Math.max(seatCount, plan.includedSeats || 0);
  const pricePerSeat = billingPeriod === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;

  return {
    price: effectiveSeats * pricePerSeat,
    seats: effectiveSeats,
    pricePerSeat,
  };
}

import { SupabaseClient } from "@supabase/supabase-js";
import { getModelRateLimitTier } from "@/lib/models";

export type ModelTier = "economy" | "standard" | "premium";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  reset_at: string;
}

export interface RateLimitStatus {
  remaining: number;
  limit: number;
  used: number;
  reset_at: string;
}

/**
 * Static fallback tiers for sync usage and when DB is unavailable
 * @deprecated The canonical source is now the database ai_models.rate_limit_tier
 */
const FALLBACK_TIERS: Record<string, ModelTier> = {
  // Premium models (3 req/min)
  "claude-opus-4-5-20250514": "premium",
  "gpt-5.2": "premium",
  "gpt-5-pro": "premium",
  "gemini-2.5-pro-preview-06-05": "premium",

  // Economy models (20 req/min)
  "gpt-5-nano": "economy",
  "gemini-2.0-flash": "economy",
  "gemini-1.5-flash": "economy",
  "mistral-small-latest": "economy",

  // Standard models (10 req/min)
  "claude-sonnet-4-20250514": "standard",
  "claude-3-5-haiku-20241022": "standard",
  "gpt-5.1": "standard",
  "gpt-5": "standard",
  "gpt-5-mini": "standard",
  "gemini-1.5-pro": "standard",
  "mistral-large-latest": "standard",
  "mistral-medium-latest": "standard",
  "codestral-latest": "standard",
};

/**
 * Get the tier for a model (async - fetches from DB)
 */
export async function getModelTierAsync(modelId: string): Promise<ModelTier> {
  try {
    return await getModelRateLimitTier(modelId);
  } catch {
    // Fallback to static config
    return FALLBACK_TIERS[modelId] || "standard";
  }
}

/**
 * Get the tier for a model (sync fallback)
 * @deprecated Use getModelTierAsync when possible
 */
export function getModelTier(modelId: string): ModelTier {
  return FALLBACK_TIERS[modelId] || "standard";
}

// Get tier limits
export function getTierLimits(tier: ModelTier): { limit: number; description: string } {
  switch (tier) {
    case "economy":
      return { limit: 20, description: "20 requêtes/minute" };
    case "premium":
      return { limit: 3, description: "3 requêtes/minute" };
    default:
      return { limit: 10, description: "10 requêtes/minute" };
  }
}

// Check rate limit and record request if allowed
export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  modelId: string
): Promise<RateLimitResult> {
  const tier = await getModelTierAsync(modelId);

  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_user_id: userId,
    p_model_tier: tier,
  });

  if (error) {
    console.error("Rate limit check error:", error);
    // On error, allow the request but log it
    return {
      allowed: true,
      remaining: 0,
      limit: getTierLimits(tier).limit,
      reset_at: new Date(Date.now() + 60000).toISOString(),
    };
  }

  return data as RateLimitResult;
}

// Get current rate limit status without recording
export async function getRateLimitStatus(
  supabase: SupabaseClient,
  userId: string,
  modelId: string
): Promise<RateLimitStatus> {
  const tier = await getModelTierAsync(modelId);

  const { data, error } = await supabase.rpc("get_rate_limit_status", {
    p_user_id: userId,
    p_model_tier: tier,
  });

  if (error) {
    console.error("Rate limit status error:", error);
    const limits = getTierLimits(tier);
    return {
      remaining: limits.limit,
      limit: limits.limit,
      used: 0,
      reset_at: new Date(Date.now() + 60000).toISOString(),
    };
  }

  return data as RateLimitStatus;
}

// Format wait time for user-friendly message
export function formatWaitTime(resetAt: string): string {
  const resetTime = new Date(resetAt).getTime();
  const now = Date.now();
  const waitSeconds = Math.max(0, Math.ceil((resetTime - now) / 1000));

  if (waitSeconds <= 0) return "maintenant";
  if (waitSeconds === 1) return "1 seconde";
  if (waitSeconds < 60) return `${waitSeconds} secondes`;
  return "1 minute";
}

// Generate user-friendly rate limit error message
export async function getRateLimitErrorMessage(
  modelId: string,
  resetAt: string
): Promise<string> {
  const tier = await getModelTierAsync(modelId);
  const limits = getTierLimits(tier);
  const waitTime = formatWaitTime(resetAt);

  const tierName =
    tier === "premium"
      ? "premium (Claude Opus, GPT-5)"
      : tier === "economy"
        ? "économiques"
        : "standard";

  return `Vous avez atteint la limite de ${limits.description} pour les modèles ${tierName}. Réessayez dans ${waitTime}.`;
}

/**
 * Sync version for error messages when async not possible
 * @deprecated Use getRateLimitErrorMessage when possible
 */
export function getRateLimitErrorMessageSync(
  modelId: string,
  resetAt: string
): string {
  const tier = getModelTier(modelId);
  const limits = getTierLimits(tier);
  const waitTime = formatWaitTime(resetAt);

  const tierName =
    tier === "premium"
      ? "premium (Claude Opus, GPT-5)"
      : tier === "economy"
        ? "économiques"
        : "standard";

  return `Vous avez atteint la limite de ${limits.description} pour les modèles ${tierName}. Réessayez dans ${waitTime}.`;
}

// Get all rate limit statuses for a user (useful for UI)
export async function getAllRateLimitStatuses(
  supabase: SupabaseClient,
  userId: string
): Promise<Record<ModelTier, RateLimitStatus>> {
  const tiers: ModelTier[] = ["economy", "standard", "premium"];
  const results: Record<string, RateLimitStatus> = {};

  await Promise.all(
    tiers.map(async (tier) => {
      const { data } = await supabase.rpc("get_rate_limit_status", {
        p_user_id: userId,
        p_model_tier: tier,
      });
      if (data) {
        results[tier] = data as RateLimitStatus;
      }
    })
  );

  return results as Record<ModelTier, RateLimitStatus>;
}

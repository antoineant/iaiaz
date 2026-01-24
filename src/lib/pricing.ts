/**
 * Pricing Module (Legacy Compatibility Layer)
 *
 * This module provides backwards compatibility for code that uses static MODEL_PRICING.
 * New code should use the async functions from @/lib/models instead.
 *
 * @deprecated Use @/lib/models for new code
 */

// Re-export everything from models.ts for new code
export {
  calculateCost,
  estimateCost,
  getModelPricing,
  getModelCapabilities,
  getModel as getModelInfo,
  getModelsForDisplay as getAllModels,
  getModelsByCategory,
  getModelsByProvider,
  CREDIT_PACKS,
} from "./models";

// ============================================================================
// STATIC FALLBACK (for sync code that can't use async)
// ============================================================================

/**
 * @deprecated Use async functions from @/lib/models instead
 * This static data is only used as fallback when DB is unavailable
 */
export const MODEL_PRICING = {
  // ===== ANTHROPIC CLAUDE =====
  "claude-opus-4-5-20250514": {
    name: "Claude Opus 4.5",
    provider: "Anthropic",
    input: 5.0,
    output: 25.0,
    description: "Le plus intelligent. Idéal pour les tâches complexes et le code.",
    recommended: false,
    category: "premium",
    capabilities: { images: true, pdf: true },
  },
  "claude-sonnet-4-20250514": {
    name: "Claude Sonnet 4",
    provider: "Anthropic",
    input: 3.0,
    output: 15.0,
    description: "Excellent équilibre qualité/prix. Recommandé pour la plupart des usages.",
    recommended: true,
    category: "balanced",
    capabilities: { images: true, pdf: true },
  },
  "claude-3-5-haiku-20241022": {
    name: "Claude 3.5 Haiku",
    provider: "Anthropic",
    input: 0.8,
    output: 4.0,
    description: "Rapide et économique. Idéal pour les tâches simples.",
    recommended: false,
    category: "fast",
    capabilities: { images: true, pdf: true },
  },

  // ===== OPENAI GPT-5 =====
  "gpt-5.2": {
    name: "GPT-5.2",
    provider: "OpenAI",
    input: 1.75,
    output: 14.0,
    description: "Le dernier et plus puissant modèle d'OpenAI. État de l'art.",
    recommended: false,
    category: "premium",
    capabilities: { images: true, pdf: true },
  },
  "gpt-5.1": {
    name: "GPT-5.1",
    provider: "OpenAI",
    input: 1.25,
    output: 10.0,
    description: "Modèle phare d'OpenAI. Excellent rapport qualité/prix.",
    recommended: false,
    category: "balanced",
    capabilities: { images: true, pdf: true },
  },
  "gpt-5": {
    name: "GPT-5",
    provider: "OpenAI",
    input: 1.25,
    output: 10.0,
    description: "Modèle GPT-5 de base. Très polyvalent et fiable.",
    recommended: false,
    category: "balanced",
    capabilities: { images: true, pdf: true },
  },
  "gpt-5-mini": {
    name: "GPT-5 Mini",
    provider: "OpenAI",
    input: 0.25,
    output: 2.0,
    description: "Version compacte de GPT-5. Bon équilibre performance/coût.",
    recommended: false,
    category: "balanced",
    capabilities: { images: true, pdf: true },
  },
  "gpt-5-nano": {
    name: "GPT-5 Nano",
    provider: "OpenAI",
    input: 0.05,
    output: 0.4,
    description: "Ultra économique. Parfait pour les tâches simples.",
    recommended: false,
    category: "economy",
    capabilities: { images: true, pdf: false },
  },
  "gpt-5-pro": {
    name: "GPT-5 Pro",
    provider: "OpenAI",
    input: 15.0,
    output: 120.0,
    description: "Raisonnement avancé. Pour les problèmes très complexes.",
    recommended: false,
    category: "reasoning",
    capabilities: { images: true, pdf: true },
  },

  // ===== GOOGLE GEMINI =====
  "gemini-2.5-pro": {
    name: "Gemini 2.5 Pro",
    provider: "Google",
    input: 1.25,
    output: 10.0,
    description: "Le plus puissant de Google. Excellent raisonnement et pensée adaptative.",
    recommended: false,
    category: "premium",
    capabilities: { images: true, pdf: true },
  },
  "gemini-2.5-flash": {
    name: "Gemini 2.5 Flash",
    provider: "Google",
    input: 0.15,
    output: 0.6,
    description: "Rapide et performant. Bon équilibre qualité/prix.",
    recommended: false,
    category: "balanced",
    capabilities: { images: true, pdf: true },
  },
  "gemini-2.0-flash": {
    name: "Gemini 2.0 Flash",
    provider: "Google",
    input: 0.1,
    output: 0.4,
    description: "Ultra rapide et économique. Idéal pour les tâches courantes.",
    recommended: false,
    category: "fast",
    capabilities: { images: true, pdf: true },
  },
  "gemini-2.0-flash-lite": {
    name: "Gemini 2.0 Flash Lite",
    provider: "Google",
    input: 0.075,
    output: 0.3,
    description: "Le plus économique. Parfait pour les petites tâches.",
    recommended: false,
    category: "economy",
    capabilities: { images: true, pdf: true },
  },

  // ===== MISTRAL =====
  "mistral-large-latest": {
    name: "Mistral Large",
    provider: "Mistral",
    input: 2.0,
    output: 6.0,
    description: "Modèle français de haute qualité. Excellent en français.",
    recommended: false,
    category: "balanced",
    capabilities: { images: true, pdf: false },
  },
  "mistral-medium-latest": {
    name: "Mistral Medium 3",
    provider: "Mistral",
    input: 0.4,
    output: 2.0,
    description: "Excellent rapport qualité/prix. 8x moins cher que les concurrents.",
    recommended: false,
    category: "balanced",
    capabilities: { images: true, pdf: false },
  },
  "mistral-small-latest": {
    name: "Mistral Small",
    provider: "Mistral",
    input: 0.1,
    output: 0.3,
    description: "Rapide et économique. Bon pour les tâches simples.",
    recommended: false,
    category: "economy",
    capabilities: { images: true, pdf: false },
  },
  "codestral-latest": {
    name: "Codestral",
    provider: "Mistral",
    input: 0.3,
    output: 0.9,
    description: "Spécialisé pour le code. Texte uniquement.",
    recommended: false,
    category: "code",
    capabilities: { images: false, pdf: false },
  },
} as const;

export type ModelId = keyof typeof MODEL_PRICING;

// Markup applied to API costs (50%)
export const MARKUP = 1.5;

/**
 * @deprecated Use calculateCost from @/lib/models instead
 * Synchronous fallback for legacy code
 */
export function calculateCostSync(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[modelId as ModelId];
  if (!pricing) {
    // Fallback for unknown models
    const baseCost = (inputTokens * 3.0 + outputTokens * 15.0) / 1_000_000;
    return baseCost * MARKUP;
  }
  const baseCost =
    (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
  return baseCost * MARKUP;
}

/**
 * @deprecated Use getModelCapabilities from @/lib/models instead
 */
export function getModelCapabilitiesSync(modelId: string) {
  const pricing = MODEL_PRICING[modelId as ModelId];
  return pricing?.capabilities || { images: false, pdf: false };
}

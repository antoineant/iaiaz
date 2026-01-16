// Pricing per 1 million tokens (in USD, converted at ~1:1 for EUR)
// Sources:
// - Anthropic: https://docs.anthropic.com/en/docs/about-claude/models
// - OpenAI: https://platform.openai.com/docs/pricing
// - Google: https://ai.google.dev/gemini-api/docs/pricing
// - Mistral: https://docs.mistral.ai/deployment/ai-studio/pricing

export const MODEL_PRICING = {
  // ===== ANTHROPIC CLAUDE =====
  // All Claude models support vision and PDF natively
  // Source: https://docs.claude.com/en/docs/about-claude/models/overview
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
  "claude-haiku-3-5-20241022": {
    name: "Claude Haiku 3.5",
    provider: "Anthropic",
    input: 0.8,
    output: 4.0,
    description: "Rapide et économique. Idéal pour les tâches simples.",
    recommended: false,
    category: "fast",
    capabilities: { images: true, pdf: true },
  },

  // ===== OPENAI GPT =====
  // GPT models support images but NOT native PDF (must convert to images)
  // Source: https://learn.microsoft.com/en-us/answers/questions/2264533/does-azure-openai-support-pdf-upload-for-gpt-4o
  "gpt-5": {
    name: "GPT-5",
    provider: "OpenAI",
    input: 1.25,
    output: 10.0,
    description: "Le dernier modèle d'OpenAI. Très puissant et polyvalent.",
    recommended: false,
    category: "premium",
    capabilities: { images: true, pdf: false },
  },
  "gpt-4.1": {
    name: "GPT-4.1",
    provider: "OpenAI",
    input: 2.0,
    output: 8.0,
    description: "Modèle phare d'OpenAI. Très polyvalent et fiable.",
    recommended: false,
    category: "balanced",
    capabilities: { images: true, pdf: false },
  },
  "gpt-4o": {
    name: "GPT-4o",
    provider: "OpenAI",
    input: 2.5,
    output: 10.0,
    description: "Modèle multimodal rapide. Bon pour texte et images.",
    recommended: false,
    category: "balanced",
    capabilities: { images: true, pdf: false },
  },
  "gpt-4o-mini": {
    name: "GPT-4o Mini",
    provider: "OpenAI",
    input: 0.15,
    output: 0.6,
    description: "Version légère et très économique de GPT-4o.",
    recommended: false,
    category: "economy",
    capabilities: { images: true, pdf: false },
  },

  // ===== GOOGLE GEMINI =====
  // All Gemini models support images and PDF natively
  // Source: https://ai.google.dev/gemini-api/docs/models
  "gemini-2.5-pro-preview-06-05": {
    name: "Gemini 2.5 Pro",
    provider: "Google",
    input: 4.0,
    output: 20.0,
    description: "Le plus puissant de Google. Excellent raisonnement.",
    recommended: false,
    category: "premium",
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
  "gemini-1.5-pro": {
    name: "Gemini 1.5 Pro",
    provider: "Google",
    input: 1.25,
    output: 5.0,
    description: "Grande fenêtre de contexte (1M tokens). Bon pour longs documents.",
    recommended: false,
    category: "balanced",
    capabilities: { images: true, pdf: true },
  },
  "gemini-1.5-flash": {
    name: "Gemini 1.5 Flash",
    provider: "Google",
    input: 0.075,
    output: 0.3,
    description: "Le plus économique. Parfait pour les petites tâches.",
    recommended: false,
    category: "economy",
    capabilities: { images: true, pdf: true },
  },

  // ===== MISTRAL =====
  // Mistral Large/Medium/Small support images, but PDF requires separate OCR API
  // Source: https://docs.mistral.ai/capabilities/vision
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

export function calculateCost(
  modelId: ModelId,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[modelId];
  const baseCost =
    (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
  return baseCost * MARKUP;
}

export function estimateCost(
  modelId: ModelId,
  inputText: string,
  estimatedOutputTokens = 500
): { inputTokens: number; outputTokens: number; cost: number } {
  // Rough estimation: ~4 characters per token
  const inputTokens = Math.ceil(inputText.length / 4);
  const cost = calculateCost(modelId, inputTokens, estimatedOutputTokens);
  return { inputTokens, outputTokens: estimatedOutputTokens, cost };
}

export function getModelInfo(modelId: ModelId) {
  return MODEL_PRICING[modelId];
}

export function getAllModels() {
  return Object.entries(MODEL_PRICING).map(([id, info]) => ({
    id: id as ModelId,
    ...info,
  }));
}

export function getModelsByCategory(category: string) {
  return getAllModels().filter((m) => m.category === category);
}

export function getModelsByProvider(provider: string) {
  return getAllModels().filter((m) => m.provider === provider);
}

export function getModelCapabilities(modelId: ModelId) {
  return MODEL_PRICING[modelId].capabilities;
}

// Credit packs available for purchase
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

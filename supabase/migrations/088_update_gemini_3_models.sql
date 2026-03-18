-- Update Google models to Gemini 3 lineup
-- Based on Google AI pricing as of March 2026

-- ============================================================================
-- DEACTIVATE OLD GEMINI MODELS
-- ============================================================================

UPDATE public.ai_models SET is_active = false, updated_at = NOW()
WHERE id LIKE 'gemini-2.%' OR id LIKE 'gemini-1.%';

-- ============================================================================
-- INSERT GEMINI 3 MODELS
-- ============================================================================

-- Gemini 3.1 Pro Preview (Flagship)
INSERT INTO public.ai_models (id, name, provider, input_price, output_price, description, category, is_recommended, is_active, max_tokens, rate_limit_tier, capabilities, display_order, co2_per_million_tokens, context_window)
VALUES (
  'gemini-3.1-pro-preview',
  'Gemini 3.1 Pro',
  'Google',
  2.0,
  12.0,
  'Le plus puissant de Google. Excellent raisonnement, contexte 1M tokens.',
  'premium',
  false,
  true,
  64000,
  'premium',
  '{"images": true, "pdf": true}'::jsonb,
  80,
  0.5,
  1000000
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  input_price = EXCLUDED.input_price,
  output_price = EXCLUDED.output_price,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  is_active = EXCLUDED.is_active,
  max_tokens = EXCLUDED.max_tokens,
  rate_limit_tier = EXCLUDED.rate_limit_tier,
  capabilities = EXCLUDED.capabilities,
  display_order = EXCLUDED.display_order,
  co2_per_million_tokens = EXCLUDED.co2_per_million_tokens,
  context_window = EXCLUDED.context_window,
  updated_at = NOW();

-- Gemini 3 Flash Preview (Fast and capable)
INSERT INTO public.ai_models (id, name, provider, input_price, output_price, description, category, is_recommended, is_active, max_tokens, rate_limit_tier, capabilities, display_order, co2_per_million_tokens, context_window)
VALUES (
  'gemini-3-flash-preview',
  'Gemini 3 Flash',
  'Google',
  0.50,
  3.0,
  'Rapide et performant. Bon équilibre qualité/prix.',
  'balanced',
  false,
  true,
  64000,
  'standard',
  '{"images": true, "pdf": true}'::jsonb,
  85,
  0.3,
  1000000
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  input_price = EXCLUDED.input_price,
  output_price = EXCLUDED.output_price,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  is_active = EXCLUDED.is_active,
  max_tokens = EXCLUDED.max_tokens,
  rate_limit_tier = EXCLUDED.rate_limit_tier,
  capabilities = EXCLUDED.capabilities,
  display_order = EXCLUDED.display_order,
  co2_per_million_tokens = EXCLUDED.co2_per_million_tokens,
  context_window = EXCLUDED.context_window,
  updated_at = NOW();

-- Gemini 3.1 Flash Lite Preview (Economy)
INSERT INTO public.ai_models (id, name, provider, input_price, output_price, description, category, is_recommended, is_active, max_tokens, rate_limit_tier, capabilities, display_order, co2_per_million_tokens, context_window)
VALUES (
  'gemini-3.1-flash-lite-preview',
  'Gemini 3.1 Flash Lite',
  'Google',
  0.25,
  1.50,
  'Ultra économique. Parfait pour les tâches simples et rapides.',
  'economy',
  false,
  true,
  64000,
  'economy',
  '{"images": true, "pdf": true}'::jsonb,
  95,
  0.2,
  1000000
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  input_price = EXCLUDED.input_price,
  output_price = EXCLUDED.output_price,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  is_active = EXCLUDED.is_active,
  max_tokens = EXCLUDED.max_tokens,
  rate_limit_tier = EXCLUDED.rate_limit_tier,
  capabilities = EXCLUDED.capabilities,
  display_order = EXCLUDED.display_order,
  co2_per_million_tokens = EXCLUDED.co2_per_million_tokens,
  context_window = EXCLUDED.context_window,
  updated_at = NOW();

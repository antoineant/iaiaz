-- Update OpenAI models to GPT-5.4 lineup
-- Based on OpenAI pricing as of March 2026

-- ============================================================================
-- DEACTIVATE OLD GPT-5.x MODELS
-- ============================================================================

UPDATE public.ai_models SET is_active = false, updated_at = NOW()
WHERE id IN ('gpt-5.2', 'gpt-5.1', 'gpt-5', 'gpt-5-mini', 'gpt-5-nano', 'gpt-5-pro');

-- ============================================================================
-- INSERT GPT-5.4 MODELS
-- ============================================================================

-- GPT-5.4 (Flagship - complex reasoning, coding, agentic workflows)
INSERT INTO public.ai_models (id, name, provider, input_price, output_price, description, category, is_recommended, is_active, max_tokens, rate_limit_tier, capabilities, display_order, co2_per_million_tokens, context_window)
VALUES (
  'gpt-5.4',
  'GPT-5.4',
  'OpenAI',
  2.50,
  15.0,
  'Le plus intelligent d''OpenAI. Idéal pour le raisonnement complexe et le code.',
  'premium',
  false,
  true,
  128000,
  'premium',
  '{"images": true, "pdf": true}'::jsonb,
  35,
  0.9,
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

-- GPT-5.4 Mini (Strong mini model for coding, computer use, subagents)
INSERT INTO public.ai_models (id, name, provider, input_price, output_price, description, category, is_recommended, is_active, max_tokens, rate_limit_tier, capabilities, display_order, co2_per_million_tokens, context_window)
VALUES (
  'gpt-5.4-mini',
  'GPT-5.4 Mini',
  'OpenAI',
  0.75,
  4.50,
  'Mini puissant d''OpenAI. Excellent rapport qualité/prix pour le code.',
  'balanced',
  false,
  true,
  128000,
  'standard',
  '{"images": true, "pdf": true}'::jsonb,
  40,
  0.5,
  400000
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

-- GPT-5.4 Nano (Cheapest GPT-5.4-class for simple high-volume tasks)
INSERT INTO public.ai_models (id, name, provider, input_price, output_price, description, category, is_recommended, is_active, max_tokens, rate_limit_tier, capabilities, display_order, co2_per_million_tokens, context_window)
VALUES (
  'gpt-5.4-nano',
  'GPT-5.4 Nano',
  'OpenAI',
  0.20,
  1.25,
  'Ultra économique. Parfait pour les tâches simples en volume.',
  'economy',
  false,
  true,
  128000,
  'economy',
  '{"images": true, "pdf": false}'::jsonb,
  55,
  0.3,
  400000
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

-- ============================================================================
-- UPDATE ECONOMY MODEL SETTING (gpt-5-nano -> gpt-5.4-nano)
-- ============================================================================

UPDATE public.app_settings
SET value = '{"model_id": "gpt-5.4-nano"}', updated_at = NOW()
WHERE key = 'economy_model';

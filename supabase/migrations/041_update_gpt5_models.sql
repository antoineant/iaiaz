-- Update OpenAI models to GPT-5 lineup
-- Based on OpenAI pricing as of January 2026

-- ============================================================================
-- DEACTIVATE OLD GPT-4 MODELS
-- ============================================================================

UPDATE public.ai_models SET is_active = false WHERE id IN ('gpt-4.1', 'gpt-4o', 'gpt-4o-mini');

-- ============================================================================
-- INSERT/UPDATE GPT-5 MODELS
-- ============================================================================

-- GPT-5.2 (Latest flagship)
INSERT INTO public.ai_models (id, name, provider, input_price, output_price, description, category, is_recommended, is_active, max_tokens, rate_limit_tier, capabilities, display_order, co2_per_million_tokens)
VALUES (
  'gpt-5.2',
  'GPT-5.2',
  'OpenAI',
  1.75,
  14.0,
  'Le dernier et plus puissant modèle d''OpenAI. État de l''art.',
  'premium',
  false,
  true,
  128000,
  'premium',
  '{"images": true, "pdf": true}'::jsonb,
  35,
  0.9
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
  updated_at = NOW();

-- GPT-5.1 (Excellent value)
INSERT INTO public.ai_models (id, name, provider, input_price, output_price, description, category, is_recommended, is_active, max_tokens, rate_limit_tier, capabilities, display_order, co2_per_million_tokens)
VALUES (
  'gpt-5.1',
  'GPT-5.1',
  'OpenAI',
  1.25,
  10.0,
  'Modèle phare d''OpenAI. Excellent rapport qualité/prix.',
  'balanced',
  false,
  true,
  128000,
  'standard',
  '{"images": true, "pdf": true}'::jsonb,
  40,
  0.8
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
  updated_at = NOW();

-- GPT-5 (Base model - update existing)
UPDATE public.ai_models SET
  name = 'GPT-5',
  input_price = 1.25,
  output_price = 10.0,
  description = 'Modèle GPT-5 de base. Très polyvalent et fiable.',
  category = 'balanced',
  is_active = true,
  max_tokens = 128000,
  rate_limit_tier = 'standard',
  capabilities = '{"images": true, "pdf": true}'::jsonb,
  display_order = 45,
  co2_per_million_tokens = 0.8,
  updated_at = NOW()
WHERE id = 'gpt-5';

-- GPT-5 Mini (Compact)
INSERT INTO public.ai_models (id, name, provider, input_price, output_price, description, category, is_recommended, is_active, max_tokens, rate_limit_tier, capabilities, display_order, co2_per_million_tokens)
VALUES (
  'gpt-5-mini',
  'GPT-5 Mini',
  'OpenAI',
  0.25,
  2.0,
  'Version compacte de GPT-5. Bon équilibre performance/coût.',
  'balanced',
  false,
  true,
  128000,
  'standard',
  '{"images": true, "pdf": true}'::jsonb,
  50,
  0.5
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
  updated_at = NOW();

-- GPT-5 Nano (Economy)
INSERT INTO public.ai_models (id, name, provider, input_price, output_price, description, category, is_recommended, is_active, max_tokens, rate_limit_tier, capabilities, display_order, co2_per_million_tokens)
VALUES (
  'gpt-5-nano',
  'GPT-5 Nano',
  'OpenAI',
  0.05,
  0.4,
  'Ultra économique. Parfait pour les tâches simples.',
  'economy',
  false,
  true,
  32000,
  'economy',
  '{"images": true, "pdf": false}'::jsonb,
  55,
  0.3
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
  updated_at = NOW();

-- GPT-5 Pro (Advanced reasoning)
INSERT INTO public.ai_models (id, name, provider, input_price, output_price, description, category, is_recommended, is_active, max_tokens, rate_limit_tier, capabilities, display_order, co2_per_million_tokens)
VALUES (
  'gpt-5-pro',
  'GPT-5 Pro',
  'OpenAI',
  15.0,
  120.0,
  'Raisonnement avancé. Pour les problèmes très complexes.',
  'reasoning',
  false,
  true,
  128000,
  'premium',
  '{"images": true, "pdf": true}'::jsonb,
  32,
  1.2
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
  updated_at = NOW();

-- ============================================================================
-- UPDATE ECONOMY MODEL SETTING (gpt-4o-mini -> gpt-5-nano)
-- ============================================================================

UPDATE public.app_settings
SET value = '{"model_id": "gpt-5-nano"}', updated_at = NOW()
WHERE key = 'economy_model';

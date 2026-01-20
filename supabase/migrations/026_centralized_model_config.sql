-- Centralized Model Configuration
-- Extends ai_models table to store all model-related config in the database
-- Allows admin to change model IDs and settings without code changes

-- ============================================================================
-- EXTEND AI_MODELS TABLE
-- ============================================================================

-- Add rate limit tier
ALTER TABLE public.ai_models
ADD COLUMN IF NOT EXISTS rate_limit_tier VARCHAR(20) DEFAULT 'standard'
CHECK (rate_limit_tier IN ('economy', 'standard', 'premium'));

-- Add capabilities as JSONB (images, pdf, code, etc.)
ALTER TABLE public.ai_models
ADD COLUMN IF NOT EXISTS capabilities JSONB DEFAULT '{"images": false, "pdf": false}'::jsonb;

-- Add special role for system purposes (null = regular model)
-- Roles: 'default_chat', 'analytics', 'economy_fallback', 'premium_default'
ALTER TABLE public.ai_models
ADD COLUMN IF NOT EXISTS system_role VARCHAR(50) DEFAULT NULL;

-- Add display order for UI sorting
ALTER TABLE public.ai_models
ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 100;

-- Add CO2 per 1M tokens (for carbon footprint tracking)
ALTER TABLE public.ai_models
ADD COLUMN IF NOT EXISTS co2_per_million_tokens DECIMAL(10,4) DEFAULT 0.5;

-- ============================================================================
-- UPDATE EXISTING MODELS WITH NEW FIELDS
-- ============================================================================

-- Claude models
UPDATE public.ai_models SET
  rate_limit_tier = 'premium',
  capabilities = '{"images": true, "pdf": true}'::jsonb,
  display_order = 10,
  co2_per_million_tokens = 0.6
WHERE id = 'claude-opus-4-5-20250514';

UPDATE public.ai_models SET
  rate_limit_tier = 'standard',
  capabilities = '{"images": true, "pdf": true}'::jsonb,
  system_role = 'default_chat',
  display_order = 20,
  co2_per_million_tokens = 0.5
WHERE id = 'claude-sonnet-4-20250514';

UPDATE public.ai_models SET
  rate_limit_tier = 'standard',
  capabilities = '{"images": true, "pdf": true}'::jsonb,
  display_order = 30,
  co2_per_million_tokens = 0.3
WHERE id IN ('claude-haiku-3-5-20241022', 'claude-3-5-haiku-20241022');

-- OpenAI models
UPDATE public.ai_models SET
  rate_limit_tier = 'premium',
  capabilities = '{"images": true, "pdf": true}'::jsonb,
  display_order = 40,
  co2_per_million_tokens = 0.8
WHERE id = 'gpt-5';

UPDATE public.ai_models SET
  rate_limit_tier = 'standard',
  capabilities = '{"images": true, "pdf": false}'::jsonb,
  display_order = 50,
  co2_per_million_tokens = 0.7
WHERE id = 'gpt-4.1';

UPDATE public.ai_models SET
  rate_limit_tier = 'standard',
  capabilities = '{"images": true, "pdf": false}'::jsonb,
  display_order = 60,
  co2_per_million_tokens = 0.7
WHERE id = 'gpt-4o';

UPDATE public.ai_models SET
  rate_limit_tier = 'economy',
  capabilities = '{"images": true, "pdf": false}'::jsonb,
  system_role = 'economy_fallback',
  display_order = 70,
  co2_per_million_tokens = 0.4
WHERE id = 'gpt-4o-mini';

-- Google models
UPDATE public.ai_models SET
  rate_limit_tier = 'premium',
  capabilities = '{"images": true, "pdf": true}'::jsonb,
  display_order = 80,
  co2_per_million_tokens = 0.5
WHERE id LIKE 'gemini-2.5-pro%';

UPDATE public.ai_models SET
  rate_limit_tier = 'standard',
  capabilities = '{"images": true, "pdf": true}'::jsonb,
  display_order = 90,
  co2_per_million_tokens = 0.3
WHERE id LIKE 'gemini-2.5-flash%' OR id LIKE 'gemini-2.0-flash%';

UPDATE public.ai_models SET
  rate_limit_tier = 'economy',
  capabilities = '{"images": true, "pdf": true}'::jsonb,
  display_order = 100,
  co2_per_million_tokens = 0.2
WHERE id LIKE 'gemini-2.0-flash-lite%' OR id LIKE 'gemini-1.5-flash%';

UPDATE public.ai_models SET
  rate_limit_tier = 'standard',
  capabilities = '{"images": true, "pdf": true}'::jsonb,
  display_order = 85,
  co2_per_million_tokens = 0.4
WHERE id LIKE 'gemini-1.5-pro%';

-- Mistral models
UPDATE public.ai_models SET
  rate_limit_tier = 'standard',
  capabilities = '{"images": true, "pdf": false}'::jsonb,
  display_order = 110,
  co2_per_million_tokens = 0.4
WHERE id = 'mistral-large-latest';

UPDATE public.ai_models SET
  rate_limit_tier = 'standard',
  capabilities = '{"images": true, "pdf": false}'::jsonb,
  display_order = 120,
  co2_per_million_tokens = 0.3
WHERE id = 'mistral-medium-latest';

UPDATE public.ai_models SET
  rate_limit_tier = 'economy',
  capabilities = '{"images": true, "pdf": false}'::jsonb,
  display_order = 130,
  co2_per_million_tokens = 0.2
WHERE id = 'mistral-small-latest';

UPDATE public.ai_models SET
  rate_limit_tier = 'standard',
  capabilities = '{"images": false, "pdf": false, "code": true}'::jsonb,
  display_order = 140,
  co2_per_million_tokens = 0.3
WHERE id = 'codestral-latest';

-- ============================================================================
-- ADD APP SETTINGS FOR SPECIAL MODEL ROLES
-- ============================================================================

INSERT INTO public.app_settings (key, value, description) VALUES
  ('default_chat_model', '{"model_id": "claude-sonnet-4-20250514"}', 'Default model for new chat conversations'),
  ('analytics_model', '{"model_id": "claude-sonnet-4-20250514"}', 'Model used for generating analytics insights'),
  ('economy_model', '{"model_id": "gpt-4o-mini"}', 'Cost-effective model for background tasks')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get model by system role
CREATE OR REPLACE FUNCTION get_model_by_role(p_role VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
  v_model_id VARCHAR;
BEGIN
  -- First try to get from ai_models by system_role
  SELECT id INTO v_model_id
  FROM public.ai_models
  WHERE system_role = p_role AND is_active = true
  LIMIT 1;

  -- If not found, try app_settings
  IF v_model_id IS NULL THEN
    SELECT value->>'model_id' INTO v_model_id
    FROM public.app_settings
    WHERE key = p_role || '_model';
  END IF;

  -- Final fallback
  IF v_model_id IS NULL THEN
    SELECT id INTO v_model_id
    FROM public.ai_models
    WHERE is_recommended = true AND is_active = true
    LIMIT 1;
  END IF;

  RETURN v_model_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all model config (for caching)
CREATE OR REPLACE FUNCTION get_all_model_config()
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_object_agg(
    id,
    jsonb_build_object(
      'id', id,
      'name', name,
      'provider', provider,
      'input_price', input_price,
      'output_price', output_price,
      'description', description,
      'category', category,
      'is_recommended', is_recommended,
      'is_active', is_active,
      'max_tokens', max_tokens,
      'rate_limit_tier', rate_limit_tier,
      'capabilities', capabilities,
      'system_role', system_role,
      'display_order', display_order,
      'co2_per_million_tokens', co2_per_million_tokens
    )
  ) INTO v_result
  FROM public.ai_models
  WHERE is_active = true;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get special model settings
CREATE OR REPLACE FUNCTION get_model_settings()
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_object_agg(
    key,
    value
  ) INTO v_result
  FROM public.app_settings
  WHERE key LIKE '%_model';

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- INDEX FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_ai_models_system_role ON public.ai_models(system_role) WHERE system_role IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_models_active_order ON public.ai_models(is_active, display_order);

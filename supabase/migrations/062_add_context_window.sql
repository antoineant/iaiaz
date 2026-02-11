-- Add context_window column to ai_models for model-specific context limits
-- This allows the UI to show accurate memory usage for each model

ALTER TABLE public.ai_models
ADD COLUMN IF NOT EXISTS context_window INT DEFAULT 128000;

-- Update context windows for each model based on provider documentation

-- Claude models: 200K tokens
UPDATE public.ai_models SET context_window = 200000
WHERE id LIKE 'claude-%';

-- GPT-5: 128K (standard)
UPDATE public.ai_models SET context_window = 128000
WHERE id = 'gpt-5';

-- GPT-5-nano: 128K
UPDATE public.ai_models SET context_window = 128000
WHERE id = 'gpt-5-nano';

-- GPT-4o and variants: 128K
UPDATE public.ai_models SET context_window = 128000
WHERE id LIKE 'gpt-4o%' OR id LIKE 'gpt-4.1%';

-- Gemini 2.5 Pro: 1M tokens
UPDATE public.ai_models SET context_window = 1000000
WHERE id LIKE 'gemini-2.5-pro%';

-- Gemini 2.5/2.0 Flash: 1M tokens
UPDATE public.ai_models SET context_window = 1000000
WHERE id LIKE 'gemini-2.5-flash%' OR id LIKE 'gemini-2.0-flash%';

-- Gemini 1.5 Pro: 2M tokens
UPDATE public.ai_models SET context_window = 2000000
WHERE id LIKE 'gemini-1.5-pro%';

-- Gemini 1.5 Flash: 1M tokens
UPDATE public.ai_models SET context_window = 1000000
WHERE id LIKE 'gemini-1.5-flash%';

-- Mistral Large: 128K tokens
UPDATE public.ai_models SET context_window = 128000
WHERE id = 'mistral-large-latest';

-- Mistral Medium/Small: 32K tokens
UPDATE public.ai_models SET context_window = 32000
WHERE id IN ('mistral-medium-latest', 'mistral-small-latest');

-- Codestral: 32K tokens
UPDATE public.ai_models SET context_window = 32000
WHERE id = 'codestral-latest';

-- o1/o3 reasoning models: 200K tokens
UPDATE public.ai_models SET context_window = 200000
WHERE id LIKE 'o1%' OR id LIKE 'o3%';

-- Update the get_all_model_config function to include context_window
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
      'context_window', context_window,
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

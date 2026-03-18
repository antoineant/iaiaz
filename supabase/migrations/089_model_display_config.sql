-- Add display_config JSONB column to ai_models for UI display metadata
ALTER TABLE public.ai_models
ADD COLUMN IF NOT EXISTS display_config JSONB DEFAULT '{}'::jsonb;

-- Populate hero card config for featured models
-- Claude Sonnet 4 - recommended hero card
UPDATE public.ai_models
SET display_config = jsonb_build_object(
  'hero_card', jsonb_build_object(
    'order', 1,
    'badge_key', 'recommended',
    'color_theme', 'primary',
    'description_key', 'claudeDesc'
  ),
  'recommended_for', jsonb_build_array('smart', 'code', 'creative'),
  'provider_tagline_fr', 'Claude (Anthropic) - Excellent pour la rédaction et l''analyse',
  'provider_tagline_en', 'Claude (Anthropic) - Excellent for writing and analysis'
)
WHERE id = 'claude-sonnet-4-20250514';

-- GPT-5.4 - new hero card
UPDATE public.ai_models
SET display_config = jsonb_build_object(
  'hero_card', jsonb_build_object(
    'order', 2,
    'badge_key', 'new',
    'color_theme', 'emerald',
    'description_key', 'gptDesc'
  ),
  'recommended_for', jsonb_build_array('code'),
  'provider_tagline_fr', 'GPT-5.4 (OpenAI) - Le modèle polyvalent par excellence',
  'provider_tagline_en', 'GPT-5.4 (OpenAI) - The ultimate versatile model'
)
WHERE id = 'gpt-5.4';

-- Gemini 3 Flash - economy hero card
UPDATE public.ai_models
SET display_config = jsonb_build_object(
  'hero_card', jsonb_build_object(
    'order', 3,
    'badge_key', 'ultraEconomic',
    'color_theme', 'blue',
    'description_key', 'geminiDesc'
  ),
  'recommended_for', jsonb_build_array('quick'),
  'provider_tagline_fr', 'Gemini (Google) - Puissant pour le raisonnement',
  'provider_tagline_en', 'Gemini (Google) - Powerful for reasoning'
)
WHERE id = 'gemini-3-flash-preview';

-- Model picker recommendations (non-hero models)
UPDATE public.ai_models
SET display_config = jsonb_build_object(
  'recommended_for', jsonb_build_array('quick'),
  'provider_tagline_fr', 'Mistral - Le champion français, rapide et efficace',
  'provider_tagline_en', 'Mistral - The French champion, fast and efficient'
)
WHERE id = 'mistral-small-latest';

UPDATE public.ai_models
SET display_config = jsonb_build_object(
  'recommended_for', jsonb_build_array('quick')
)
WHERE id = 'gpt-5.4-nano';

UPDATE public.ai_models
SET display_config = jsonb_build_object(
  'recommended_for', jsonb_build_array('quick')
)
WHERE id = 'gemini-3.1-flash-lite-preview';

UPDATE public.ai_models
SET display_config = jsonb_build_object(
  'recommended_for', jsonb_build_array('smart', 'creative')
)
WHERE id = 'gpt-5.4-mini';

UPDATE public.ai_models
SET display_config = jsonb_build_object(
  'recommended_for', jsonb_build_array('code')
)
WHERE id = 'codestral-latest';

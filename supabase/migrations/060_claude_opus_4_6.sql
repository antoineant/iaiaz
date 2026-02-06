-- Migration: Add Claude Opus 4.6 and deprecate Opus 4.5
-- This replaces claude-opus-4-5-20250514 with claude-opus-4-6

-- Insert the new Claude Opus 4.6 model
INSERT INTO ai_models (
  id, name, provider, input_price, output_price, description, category,
  is_recommended, is_active, capabilities, rate_limit_tier, display_order, co2_per_1k_tokens
)
VALUES (
  'claude-opus-4-6',
  'Claude Opus 4.6',
  'Anthropic',
  5.0,
  25.0,
  'Le plus intelligent. Idéal pour les tâches complexes et le code.',
  'premium',
  false,
  true,
  '{"images": true, "pdf": true}'::jsonb,
  'premium',
  10,
  0.50  -- Premium tier CO2 rate
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  input_price = EXCLUDED.input_price,
  output_price = EXCLUDED.output_price,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;

-- Deactivate the old Opus 4.5 model (keep for historical data)
UPDATE ai_models
SET is_active = false
WHERE id = 'claude-opus-4-5-20250514';

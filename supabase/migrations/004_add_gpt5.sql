-- Add GPT-5 model
INSERT INTO public.ai_models (id, name, provider, input_price, output_price, description, category, is_recommended, is_active)
VALUES (
  'gpt-5',
  'GPT-5',
  'OpenAI',
  1.25,
  10.0,
  'Le dernier modèle d''OpenAI. Très puissant et polyvalent.',
  'premium',
  false,
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  input_price = EXCLUDED.input_price,
  output_price = EXCLUDED.output_price,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  updated_at = NOW();

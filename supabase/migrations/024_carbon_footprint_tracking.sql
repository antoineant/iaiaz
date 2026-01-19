-- Carbon footprint tracking for environmental impact awareness
-- CO2 estimates are based on published research and industry data

-- Add CO2 per 1k tokens to ai_models table
ALTER TABLE public.ai_models
ADD COLUMN IF NOT EXISTS co2_per_1k_tokens DECIMAL(10,6) DEFAULT 0.15;

-- Add CO2 tracking to messages table
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS co2_grams DECIMAL(10,6);

-- Add CO2 tracking to api_usage table for detailed analytics
ALTER TABLE public.api_usage
ADD COLUMN IF NOT EXISTS co2_grams DECIMAL(10,6);

-- Set CO2 rates based on model tier and provider efficiency
-- Economy models: ~0.03g/1k tokens (small, efficient)
-- Standard models: ~0.15g/1k tokens (medium compute)
-- Premium models: ~0.50g/1k tokens (large, intensive)

-- Economy tier models (small/fast)
UPDATE public.ai_models SET co2_per_1k_tokens = 0.03 WHERE id IN (
  'gpt-4o-mini',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'mistral-small-latest',
  'claude-3-5-haiku-20241022'
);

-- Standard tier models (balanced)
UPDATE public.ai_models SET co2_per_1k_tokens = 0.15 WHERE id IN (
  'claude-sonnet-4-20250514',
  'gpt-4.1',
  'gpt-4o',
  'gemini-1.5-pro',
  'gemini-2.5-pro',
  'mistral-large-latest',
  'mistral-medium-latest',
  'codestral-latest'
);

-- Premium tier models (large/powerful)
UPDATE public.ai_models SET co2_per_1k_tokens = 0.50 WHERE id IN (
  'claude-opus-4-5-20250514',
  'gpt-5',
  'gemini-2.5-pro-preview-06-05'
);

-- Create index for analytics queries on CO2
CREATE INDEX IF NOT EXISTS idx_messages_co2 ON public.messages(co2_grams) WHERE co2_grams IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_api_usage_co2 ON public.api_usage(co2_grams) WHERE co2_grams IS NOT NULL;

-- Add comment explaining CO2 calculation methodology
COMMENT ON COLUMN public.ai_models.co2_per_1k_tokens IS 'Estimated CO2 emissions in grams per 1,000 tokens. Based on model size: Economy (~0.03g), Standard (~0.15g), Premium (~0.50g). Sources: IEA data center estimates, Strubell et al. (2019), Patterson et al. (2021)';

-- Function to calculate CO2 for a message
CREATE OR REPLACE FUNCTION calculate_message_co2(
  p_model_id TEXT,
  p_tokens_input INT,
  p_tokens_output INT
) RETURNS DECIMAL(10,6) AS $$
DECLARE
  v_co2_rate DECIMAL(10,6);
  v_total_tokens INT;
BEGIN
  -- Get CO2 rate for the model
  SELECT COALESCE(co2_per_1k_tokens, 0.15) INTO v_co2_rate
  FROM public.ai_models
  WHERE id = p_model_id;

  -- If model not found, use standard rate
  IF v_co2_rate IS NULL THEN
    v_co2_rate := 0.15;
  END IF;

  -- Calculate total tokens and CO2
  v_total_tokens := COALESCE(p_tokens_input, 0) + COALESCE(p_tokens_output, 0);

  RETURN (v_total_tokens::DECIMAL / 1000.0) * v_co2_rate;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION calculate_message_co2 TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_message_co2 TO service_role;

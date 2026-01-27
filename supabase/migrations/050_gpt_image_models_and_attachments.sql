-- Add new GPT image models and support for reference images (attachments)

-- ============================================================================
-- ADD REFERENCE IMAGE SUPPORT
-- ============================================================================

-- Add column for reference image support in models
ALTER TABLE image_models ADD COLUMN IF NOT EXISTS supports_reference_image boolean DEFAULT false;

-- Add column for reference image URL in generations
ALTER TABLE image_generations ADD COLUMN IF NOT EXISTS reference_image_url text;

-- ============================================================================
-- DEACTIVATE OLD DALL-E MODELS, ADD NEW GPT IMAGE MODELS
-- ============================================================================

-- Deactivate old models
UPDATE image_models SET is_active = false, is_recommended = false WHERE id IN ('dall-e-3', 'dall-e-2');

-- Insert new GPT image models
INSERT INTO image_models (id, name, provider, description, price_standard, price_hd, sizes, styles, supports_hd, supports_reference_image, is_active, is_recommended) VALUES
  (
    'gpt-image-1',
    'GPT Image 1',
    'openai',
    'OpenAI''s flagship image model. Excellent quality, supports reference images for style inspiration.',
    0.04,
    0.08,
    ARRAY['1024x1024', '1024x1536', '1536x1024', 'auto'],
    ARRAY['natural', 'vivid'],
    true,
    true,
    true,
    true
  ),
  (
    'gpt-image-1-mini',
    'GPT Image 1 Mini',
    'openai',
    'Faster and more affordable. Great for quick iterations.',
    0.02,
    NULL,
    ARRAY['1024x1024', '512x512'],
    ARRAY['natural'],
    false,
    true,
    true,
    false
  ),
  (
    'gpt-image-1.5',
    'GPT Image 1.5',
    'openai',
    'Latest version with improved quality and creativity. Best for professional use.',
    0.05,
    0.10,
    ARRAY['1024x1024', '1024x1536', '1536x1024', '1536x1536', 'auto'],
    ARRAY['natural', 'vivid', 'artistic'],
    true,
    true,
    true,
    false
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_standard = EXCLUDED.price_standard,
  price_hd = EXCLUDED.price_hd,
  sizes = EXCLUDED.sizes,
  styles = EXCLUDED.styles,
  supports_hd = EXCLUDED.supports_hd,
  supports_reference_image = EXCLUDED.supports_reference_image,
  is_active = EXCLUDED.is_active,
  is_recommended = EXCLUDED.is_recommended,
  updated_at = now();

-- ============================================================================
-- UPDATE RECORD FUNCTION TO SUPPORT REFERENCE IMAGE
-- ============================================================================
CREATE OR REPLACE FUNCTION record_image_generation(
  p_user_id uuid,
  p_model_id text,
  p_prompt text,
  p_size text DEFAULT '1024x1024',
  p_style text DEFAULT 'natural',
  p_quality text DEFAULT 'standard',
  p_reference_image_url text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_model image_models%ROWTYPE;
  v_cost numeric;
  v_balance numeric;
  v_generation_id uuid;
  v_markup numeric;
BEGIN
  -- Get model info
  SELECT * INTO v_model
  FROM image_models
  WHERE id = p_model_id AND is_active = true;

  IF v_model IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'model_not_found');
  END IF;

  -- Calculate cost based on quality
  IF p_quality = 'hd' AND v_model.supports_hd THEN
    v_cost := v_model.price_hd;
  ELSE
    v_cost := v_model.price_standard;
  END IF;

  -- Apply markup from settings
  SELECT COALESCE((value->>'percentage')::numeric, 50) INTO v_markup
  FROM app_settings
  WHERE key = 'markup';

  v_cost := v_cost * (1 + COALESCE(v_markup, 50) / 100);

  -- Check user balance
  SELECT credits_balance INTO v_balance
  FROM profiles
  WHERE id = p_user_id;

  IF v_balance IS NULL OR v_balance < v_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_credits',
      'required', v_cost,
      'available', COALESCE(v_balance, 0)
    );
  END IF;

  -- Deduct credits
  UPDATE profiles
  SET credits_balance = credits_balance - v_cost,
      updated_at = now()
  WHERE id = p_user_id;

  -- Create generation record with reference image
  INSERT INTO image_generations (
    user_id, model_id, prompt, size, style, quality, reference_image_url, cost, status
  ) VALUES (
    p_user_id, p_model_id, p_prompt, p_size, p_style, p_quality, p_reference_image_url, v_cost, 'generating'
  )
  RETURNING id INTO v_generation_id;

  -- Log transaction
  INSERT INTO credit_transactions (user_id, amount, type, description, metadata)
  VALUES (
    p_user_id,
    -v_cost,
    'usage',
    'Image generation: ' || v_model.name,
    jsonb_build_object('generation_id', v_generation_id, 'model', p_model_id)
  );

  RETURN jsonb_build_object(
    'success', true,
    'generation_id', v_generation_id,
    'cost', v_cost,
    'remaining_balance', v_balance - v_cost
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

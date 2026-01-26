-- Image Studio: Image generation models and history
-- Supports DALL-E 3, Stable Diffusion, Flux, etc.

-- ============================================================================
-- IMAGE MODELS TABLE
-- ============================================================================
CREATE TABLE image_models (
  id text PRIMARY KEY,
  name text NOT NULL,
  provider text NOT NULL,
  description text,

  -- Pricing (per image, in dollars)
  price_standard numeric NOT NULL DEFAULT 0.04,
  price_hd numeric,

  -- Capabilities
  sizes text[] DEFAULT ARRAY['1024x1024'],
  styles text[] DEFAULT ARRAY['natural'],
  supports_hd boolean DEFAULT false,
  max_prompt_length int DEFAULT 4000,

  -- Status
  is_active boolean DEFAULT true,
  is_recommended boolean DEFAULT false,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- IMAGE GENERATIONS TABLE
-- ============================================================================
CREATE TABLE image_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Model info
  model_id text NOT NULL REFERENCES image_models(id),

  -- Request
  prompt text NOT NULL,
  negative_prompt text,
  size text NOT NULL DEFAULT '1024x1024',
  style text DEFAULT 'natural',
  quality text DEFAULT 'standard', -- standard or hd

  -- Result
  image_url text,
  revised_prompt text, -- DALL-E sometimes revises the prompt

  -- Cost tracking
  cost numeric NOT NULL DEFAULT 0,

  -- Status
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  error_message text,

  -- Metadata
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Indexes
CREATE INDEX idx_image_generations_user ON image_generations(user_id);
CREATE INDEX idx_image_generations_user_created ON image_generations(user_id, created_at DESC);
CREATE INDEX idx_image_generations_status ON image_generations(status);

-- ============================================================================
-- INSERT DEFAULT IMAGE MODELS
-- ============================================================================
INSERT INTO image_models (id, name, provider, description, price_standard, price_hd, sizes, styles, supports_hd, is_active, is_recommended) VALUES
  (
    'dall-e-3',
    'DALL-E 3',
    'openai',
    'OpenAI''s latest image model. Excellent prompt understanding and photorealistic results.',
    0.04,
    0.08,
    ARRAY['1024x1024', '1024x1792', '1792x1024'],
    ARRAY['natural', 'vivid'],
    true,
    true,
    true
  ),
  (
    'dall-e-2',
    'DALL-E 2',
    'openai',
    'Previous generation. Faster and cheaper, good for simple images.',
    0.02,
    NULL,
    ARRAY['256x256', '512x512', '1024x1024'],
    ARRAY['natural'],
    false,
    true,
    false
  );

-- Future models (inactive for now):
-- INSERT INTO image_models (id, name, provider, description, price_standard, sizes, is_active) VALUES
--   ('stable-diffusion-xl', 'Stable Diffusion XL', 'stability', 'Open source, great for artistic styles', 0.02, ARRAY['1024x1024'], false),
--   ('flux-pro', 'Flux Pro', 'replicate', 'High quality, fast generation', 0.03, ARRAY['1024x1024'], false);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE image_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_generations ENABLE ROW LEVEL SECURITY;

-- Anyone can view active image models
CREATE POLICY "Anyone can view active image models"
  ON image_models FOR SELECT
  USING (is_active = true);

-- Users can view their own generations
CREATE POLICY "Users can view own generations"
  ON image_generations FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own generations
CREATE POLICY "Users can create generations"
  ON image_generations FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own generations (for status updates)
CREATE POLICY "Users can update own generations"
  ON image_generations FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================================================
-- FUNCTION: Record image generation and deduct credits
-- ============================================================================
CREATE OR REPLACE FUNCTION record_image_generation(
  p_user_id uuid,
  p_model_id text,
  p_prompt text,
  p_size text DEFAULT '1024x1024',
  p_style text DEFAULT 'natural',
  p_quality text DEFAULT 'standard'
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

  v_cost := v_cost * (1 + v_markup / 100);

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

  -- Create generation record
  INSERT INTO image_generations (
    user_id, model_id, prompt, size, style, quality, cost, status
  ) VALUES (
    p_user_id, p_model_id, p_prompt, p_size, p_style, p_quality, v_cost, 'generating'
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

-- ============================================================================
-- FUNCTION: Complete image generation
-- ============================================================================
CREATE OR REPLACE FUNCTION complete_image_generation(
  p_generation_id uuid,
  p_image_url text,
  p_revised_prompt text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE image_generations
  SET status = 'completed',
      image_url = p_image_url,
      revised_prompt = p_revised_prompt,
      completed_at = now()
  WHERE id = p_generation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Fail image generation and refund
-- ============================================================================
CREATE OR REPLACE FUNCTION fail_image_generation(
  p_generation_id uuid,
  p_error_message text
)
RETURNS void AS $$
DECLARE
  v_generation image_generations%ROWTYPE;
BEGIN
  -- Get generation
  SELECT * INTO v_generation
  FROM image_generations
  WHERE id = p_generation_id;

  IF v_generation IS NULL THEN
    RETURN;
  END IF;

  -- Update status
  UPDATE image_generations
  SET status = 'failed',
      error_message = p_error_message,
      completed_at = now()
  WHERE id = p_generation_id;

  -- Refund credits
  UPDATE profiles
  SET credits_balance = credits_balance + v_generation.cost,
      updated_at = now()
  WHERE id = v_generation.user_id;

  -- Log refund transaction
  INSERT INTO credit_transactions (user_id, amount, type, description, metadata)
  VALUES (
    v_generation.user_id,
    v_generation.cost,
    'refund',
    'Image generation failed - refund',
    jsonb_build_object('generation_id', p_generation_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Video Studio: Tables for video generation models and user generations

-- Video models table (similar to image_models)
CREATE TABLE IF NOT EXISTS video_models (
  id text PRIMARY KEY,
  name text NOT NULL,
  provider text NOT NULL, -- 'openai' or 'google'
  description text,
  price_per_second numeric(10, 4) NOT NULL, -- Base price per second in dollars
  price_per_second_premium numeric(10, 4), -- Premium/Pro pricing per second
  resolutions text[] DEFAULT ARRAY['720p'], -- Available resolutions
  max_duration_seconds integer DEFAULT 10, -- Maximum video duration
  default_duration_seconds integer DEFAULT 5, -- Default video duration
  supports_audio boolean DEFAULT false, -- Whether model generates audio
  supports_reference_video boolean DEFAULT false, -- Style reference support
  supports_reference_image boolean DEFAULT true, -- Image to video support
  max_prompt_length integer DEFAULT 1000,
  is_active boolean DEFAULT true,
  is_recommended boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Video generations table
CREATE TABLE IF NOT EXISTS video_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_id text NOT NULL REFERENCES video_models(id),
  prompt text NOT NULL,
  negative_prompt text,
  duration_seconds integer NOT NULL DEFAULT 5,
  resolution text DEFAULT '720p',
  quality text DEFAULT 'standard', -- 'standard' or 'premium'
  video_url text, -- Generated video URL
  thumbnail_url text, -- Video thumbnail
  reference_image_url text, -- Image to video reference
  reference_video_url text, -- Style reference video
  revised_prompt text, -- AI-revised prompt
  cost numeric(10, 6) NOT NULL, -- Cost including markup
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  error_message text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_video_generations_user ON video_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_video_generations_user_created ON video_generations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_generations_status ON video_generations(status);
CREATE INDEX IF NOT EXISTS idx_video_models_active ON video_models(is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE video_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_generations ENABLE ROW LEVEL SECURITY;

-- Video models: everyone can read active models
CREATE POLICY "Anyone can view active video models"
  ON video_models FOR SELECT
  USING (is_active = true);

-- Video models: only admins can modify
CREATE POLICY "Admins can manage video models"
  ON video_models FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Video generations: users can view their own
CREATE POLICY "Users can view own video generations"
  ON video_generations FOR SELECT
  USING (user_id = auth.uid());

-- Video generations: users can insert their own
CREATE POLICY "Users can create video generations"
  ON video_generations FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Video generations: users can update their own (for status updates)
CREATE POLICY "Users can update own video generations"
  ON video_generations FOR UPDATE
  USING (user_id = auth.uid());

-- Video generations: users can delete their own
CREATE POLICY "Users can delete own video generations"
  ON video_generations FOR DELETE
  USING (user_id = auth.uid());

-- Insert initial video models
-- OpenAI Sora models
INSERT INTO video_models (id, name, provider, description, price_per_second, price_per_second_premium, resolutions, max_duration_seconds, default_duration_seconds, supports_audio, is_active, is_recommended, display_order)
VALUES
  ('sora-2', 'Sora 2', 'openai', 'Fast and affordable video generation from OpenAI', 0.10, NULL, ARRAY['720p', '1280p'], 10, 5, true, true, true, 1),
  ('sora-2-pro', 'Sora 2 Pro', 'openai', 'High quality video generation with enhanced detail', 0.30, 0.50, ARRAY['720p', '1280p', '1792p'], 10, 5, true, true, false, 2)
ON CONFLICT (id) DO NOTHING;

-- Google Veo models
INSERT INTO video_models (id, name, provider, description, price_per_second, price_per_second_premium, resolutions, max_duration_seconds, default_duration_seconds, supports_audio, is_active, is_recommended, display_order)
VALUES
  ('veo-3.1-fast', 'Veo 3.1 Fast', 'google', 'Fast video generation from Google with good quality', 0.15, 0.35, ARRAY['720p', '1080p', '4k'], 10, 5, true, true, false, 3),
  ('veo-3.1-standard', 'Veo 3.1', 'google', 'High quality video generation from Google', 0.40, 0.60, ARRAY['720p', '1080p', '4k'], 10, 5, true, true, false, 4)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for video references (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('video-references', 'video-references', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy for video references
CREATE POLICY "Users can upload video references"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'video-references'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Anyone can view video references"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'video-references');

CREATE POLICY "Users can delete own video references"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'video-references'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_video_models_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER video_models_updated_at
  BEFORE UPDATE ON video_models
  FOR EACH ROW
  EXECUTE FUNCTION update_video_models_updated_at();

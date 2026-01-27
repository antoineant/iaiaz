-- Add Google Imagen models to image_models table

-- Create storage bucket for generated images (needed for Imagen which returns base64)
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-images', 'generated-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for generated-images bucket
CREATE POLICY "Anyone can view generated images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'generated-images');

CREATE POLICY "Service role can upload generated images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'generated-images');

INSERT INTO image_models (
  id,
  name,
  provider,
  description,
  price_standard,
  price_hd,
  sizes,
  styles,
  supports_hd,
  supports_reference_image,
  max_prompt_length,
  is_active,
  is_recommended
) VALUES
  (
    'imagen-3',
    'Imagen 3',
    'google',
    'Google''s most advanced image model. Photorealistic quality with excellent prompt understanding.',
    0.04,
    0.08,
    ARRAY['1024x1024', '1536x1024', '1024x1536'],
    ARRAY['natural'],
    true,
    false,
    1000,
    true,
    true
  ),
  (
    'imagen-3-fast',
    'Imagen 3 Fast',
    'google',
    'Faster variant of Imagen 3. Great balance of speed and quality.',
    0.02,
    NULL,
    ARRAY['1024x1024', '1536x1024', '1024x1536'],
    ARRAY['natural'],
    false,
    false,
    1000,
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
  max_prompt_length = EXCLUDED.max_prompt_length,
  is_active = EXCLUDED.is_active,
  is_recommended = EXCLUDED.is_recommended;

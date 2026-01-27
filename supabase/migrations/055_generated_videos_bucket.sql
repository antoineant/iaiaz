-- Create storage bucket for generated videos (from Veo/Sora)

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('generated-videos', 'generated-videos', true, 104857600) -- 100MB limit
ON CONFLICT (id) DO NOTHING;

-- Storage policies for generated-videos bucket
CREATE POLICY "Anyone can view generated videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'generated-videos');

CREATE POLICY "Service role can upload generated videos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'generated-videos');

CREATE POLICY "Service role can delete generated videos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'generated-videos');

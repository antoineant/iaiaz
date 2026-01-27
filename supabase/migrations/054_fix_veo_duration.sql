-- Fix Veo model duration limits (Veo only supports 4-8 seconds)

UPDATE video_models
SET
  max_duration_seconds = 8,
  default_duration_seconds = 5
WHERE provider = 'google';

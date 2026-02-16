-- Add gauges (personality sliders), sharing, and avatar_type to custom_assistants
ALTER TABLE custom_assistants
  ADD COLUMN IF NOT EXISTS gauges JSONB DEFAULT '{"creativity":3,"patience":3,"humor":1,"rigor":3,"curiosity":3}',
  ADD COLUMN IF NOT EXISTS share_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS avatar_type TEXT DEFAULT 'emoji';

-- Index for share code lookups
CREATE INDEX IF NOT EXISTS idx_custom_assistants_share_code
  ON custom_assistants(share_code) WHERE share_code IS NOT NULL;

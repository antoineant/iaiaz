-- Ensure columns exist (in case 074 wasn't applied)
ALTER TABLE custom_assistants
  ADD COLUMN IF NOT EXISTS gauges JSONB DEFAULT '{"creativity":3,"patience":3,"humor":1,"rigor":3,"curiosity":3}',
  ADD COLUMN IF NOT EXISTS share_code TEXT,
  ADD COLUMN IF NOT EXISTS avatar_type TEXT DEFAULT 'emoji';

CREATE INDEX IF NOT EXISTS idx_custom_assistants_share_code
  ON custom_assistants(share_code) WHERE share_code IS NOT NULL;

-- Update existing preset assistants to use new mifa avatar assets
UPDATE custom_assistants
SET avatar = 'mifa-studi', avatar_type = 'asset', name = 'Studi'
WHERE is_preset = true AND sort_order = 0;

UPDATE custom_assistants
SET avatar = 'mifa-inki', avatar_type = 'asset', name = 'Inki'
WHERE is_preset = true AND sort_order = 1;

UPDATE custom_assistants
SET avatar = 'mifa-sigma', avatar_type = 'asset', name = 'Sigma'
WHERE is_preset = true AND sort_order = 2;

UPDATE custom_assistants
SET avatar = 'mifa-arty', avatar_type = 'asset', name = 'Arty'
WHERE is_preset = true AND sort_order = 3;

UPDATE custom_assistants
SET avatar = 'mifa-atlas', avatar_type = 'asset', name = 'Atlas'
WHERE is_preset = true AND sort_order = 4;

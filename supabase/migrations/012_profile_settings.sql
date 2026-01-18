-- Profile settings migration
-- Adds display_name, avatar_url, and credit_preference to profiles

-- Add new columns to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS credit_preference TEXT DEFAULT 'auto';

-- Add check constraint for credit_preference
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_credit_preference_check'
  ) THEN
    ALTER TABLE profiles
    ADD CONSTRAINT profiles_credit_preference_check
    CHECK (credit_preference IN ('auto', 'org_first', 'personal_first', 'org_only', 'personal_only'));
  END IF;
END $$;

-- Note: Create 'avatars' storage bucket manually in Supabase Dashboard
-- Settings: Public bucket = true, File size limit = 5MB
-- Allowed MIME types: image/png, image/jpeg, image/gif, image/webp

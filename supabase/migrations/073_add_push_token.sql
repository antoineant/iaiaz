-- Add push_token column to profiles for mobile push notifications
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Index for querying by push token (e.g., to send notifications to family members)
CREATE INDEX IF NOT EXISTS idx_profiles_push_token ON profiles (push_token) WHERE push_token IS NOT NULL;

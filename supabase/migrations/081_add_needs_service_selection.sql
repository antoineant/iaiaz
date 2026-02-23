-- Add needs_service_selection flag to profiles
-- New users default to true; existing users already chose their service via the old flow
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS needs_service_selection boolean DEFAULT true;

-- Mark all existing users as already having selected their service
UPDATE profiles SET needs_service_selection = false;

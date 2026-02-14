-- Add field to track total credits allocated to familia children
-- This is used to show ring depletion (current balance vs total allocated)

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS credits_allocated NUMERIC(12,6) DEFAULT 0;

COMMENT ON COLUMN profiles.credits_allocated IS 'Total credits allocated to this user (for familia children, tracks their full allocation to show ring depletion)';

-- Update existing familia children to set their allocated amount equal to current balance
-- (This is a one-time migration to initialize the field)
UPDATE profiles
SET credits_allocated = credits_balance
WHERE id IN (
  SELECT user_id
  FROM organization_members om
  JOIN organizations o ON o.id = om.organization_id
  WHERE o.type = 'family'
    AND om.role NOT IN ('owner', 'admin')
);

-- Fix RLS policies for organization members
-- Add policy that allows users to view their OWN membership row directly

-- Drop existing policy that might cause issues
DROP POLICY IF EXISTS "Members can view org members" ON organization_members;

-- Policy 1: Users can always view their OWN membership row
CREATE POLICY "Users can view own membership"
  ON organization_members FOR SELECT
  USING (user_id = auth.uid());

-- Policy 2: Members can view OTHER members of their organization
CREATE POLICY "Members can view org members"
  ON organization_members FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Also ensure organizations policy works correctly
DROP POLICY IF EXISTS "Members can view their organization" ON organizations;

-- Allow viewing organizations where user is a member (with direct join check)
CREATE POLICY "Members can view their organization"
  ON organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
        AND organization_members.user_id = auth.uid()
        AND organization_members.status = 'active'
    )
  );

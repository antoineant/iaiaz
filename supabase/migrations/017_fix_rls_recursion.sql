-- Fix infinite recursion in organization_members RLS
-- The issue: multiple SELECT policies that query the same table cause recursion

-- Drop ALL existing SELECT policies on organization_members
DROP POLICY IF EXISTS "Users can view own membership" ON organization_members;
DROP POLICY IF EXISTS "Members can view org members" ON organization_members;
DROP POLICY IF EXISTS "Users can view memberships" ON organization_members;

-- Create a security definer function to get user's org IDs (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_org_ids(p_user_id uuid)
RETURNS SETOF uuid AS $$
  SELECT organization_id
  FROM organization_members
  WHERE user_id = p_user_id AND status = 'active';
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Create a SINGLE policy using the security definer function
-- This avoids recursion because the function bypasses RLS
CREATE POLICY "Users can view memberships"
  ON organization_members FOR SELECT
  USING (
    -- User can see their own row
    user_id = auth.uid()
    OR
    -- User can see other members of their organizations
    organization_id IN (SELECT get_user_org_ids(auth.uid()))
  );

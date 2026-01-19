-- Fix ALL RLS recursion issues on organization_members
-- The "Admins can manage members" FOR ALL policy also causes recursion

-- First, drop ALL policies on organization_members
DROP POLICY IF EXISTS "Users can view own membership" ON organization_members;
DROP POLICY IF EXISTS "Members can view org members" ON organization_members;
DROP POLICY IF EXISTS "Users can view memberships" ON organization_members;
DROP POLICY IF EXISTS "Admins can manage members" ON organization_members;

-- Create security definer functions (bypass RLS)
CREATE OR REPLACE FUNCTION get_user_org_ids(p_user_id uuid)
RETURNS SETOF uuid AS $$
  SELECT organization_id
  FROM organization_members
  WHERE user_id = p_user_id AND status = 'active';
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_admin_org_ids(p_user_id uuid)
RETURNS SETOF uuid AS $$
  SELECT organization_id
  FROM organization_members
  WHERE user_id = p_user_id
    AND role IN ('owner', 'admin', 'teacher')
    AND status = 'active';
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- SELECT policy: users can see their own membership and members of their orgs
CREATE POLICY "Users can view memberships"
  ON organization_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    organization_id IN (SELECT get_user_org_ids(auth.uid()))
  );

-- INSERT policy: admins/teachers can add members to their orgs
CREATE POLICY "Admins can insert members"
  ON organization_members FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT get_user_admin_org_ids(auth.uid()))
  );

-- UPDATE policy: admins/teachers can update members in their orgs
CREATE POLICY "Admins can update members"
  ON organization_members FOR UPDATE
  USING (
    organization_id IN (SELECT get_user_admin_org_ids(auth.uid()))
  );

-- DELETE policy: admins/teachers can delete members from their orgs
CREATE POLICY "Admins can delete members"
  ON organization_members FOR DELETE
  USING (
    organization_id IN (SELECT get_user_admin_org_ids(auth.uid()))
  );

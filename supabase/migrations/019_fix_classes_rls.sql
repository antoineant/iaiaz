-- Fix RLS recursion on organization_classes table
-- Uses the same SECURITY DEFINER function approach

-- Drop existing policies
DROP POLICY IF EXISTS "Members can view org classes" ON organization_classes;
DROP POLICY IF EXISTS "Teachers and admins can manage classes" ON organization_classes;

-- Use the existing security definer functions from migration 018
-- get_user_org_ids(uuid) - returns all org IDs user belongs to
-- get_user_admin_org_ids(uuid) - returns org IDs where user is admin/teacher

-- SELECT policy: members can view their org's classes
CREATE POLICY "Members can view org classes"
  ON organization_classes FOR SELECT
  USING (
    organization_id IN (SELECT get_user_org_ids(auth.uid()))
  );

-- INSERT policy: teachers/admins can create classes
CREATE POLICY "Teachers can create classes"
  ON organization_classes FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT get_user_admin_org_ids(auth.uid()))
  );

-- UPDATE policy: teachers/admins can update classes
CREATE POLICY "Teachers can update classes"
  ON organization_classes FOR UPDATE
  USING (
    organization_id IN (SELECT get_user_admin_org_ids(auth.uid()))
  );

-- DELETE policy: teachers/admins can delete classes
CREATE POLICY "Teachers can delete classes"
  ON organization_classes FOR DELETE
  USING (
    organization_id IN (SELECT get_user_admin_org_ids(auth.uid()))
  );

-- Also fix class_analytics RLS
DROP POLICY IF EXISTS "Teachers can view class analytics" ON class_analytics;
DROP POLICY IF EXISTS "Teachers can manage class analytics" ON class_analytics;

-- Create a function to get class IDs user can manage
CREATE OR REPLACE FUNCTION get_user_manageable_class_ids(p_user_id uuid)
RETURNS SETOF uuid AS $$
  SELECT oc.id
  FROM organization_classes oc
  WHERE oc.organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = p_user_id
      AND role IN ('owner', 'admin', 'teacher')
      AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Class analytics policies
CREATE POLICY "Teachers can view class analytics"
  ON class_analytics FOR SELECT
  USING (
    class_id IN (SELECT get_user_manageable_class_ids(auth.uid()))
  );

CREATE POLICY "Teachers can manage class analytics"
  ON class_analytics FOR ALL
  USING (
    class_id IN (SELECT get_user_manageable_class_ids(auth.uid()))
  );

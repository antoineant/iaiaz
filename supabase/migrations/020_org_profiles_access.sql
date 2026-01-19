-- Allow organization teachers/admins to view profiles of their org members
-- This is needed for the students list in the trainer dashboard

-- Create a function to check if user can view another user's profile via org membership
CREATE OR REPLACE FUNCTION can_view_profile_via_org(viewer_id uuid, target_id uuid)
RETURNS boolean AS $$
DECLARE
  v_viewer_orgs uuid[];
  v_target_orgs uuid[];
BEGIN
  -- Get organizations where viewer is a teacher/admin/owner
  SELECT ARRAY_AGG(organization_id) INTO v_viewer_orgs
  FROM organization_members
  WHERE user_id = viewer_id
    AND role IN ('owner', 'admin', 'teacher')
    AND status = 'active';

  IF v_viewer_orgs IS NULL OR array_length(v_viewer_orgs, 1) = 0 THEN
    RETURN false;
  END IF;

  -- Get organizations where target is a member
  SELECT ARRAY_AGG(organization_id) INTO v_target_orgs
  FROM organization_members
  WHERE user_id = target_id
    AND status = 'active';

  IF v_target_orgs IS NULL OR array_length(v_target_orgs, 1) = 0 THEN
    RETURN false;
  END IF;

  -- Check if there's any overlap
  RETURN v_viewer_orgs && v_target_orgs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Drop and recreate the profiles SELECT policy to include org access
DROP POLICY IF EXISTS "Users and admins can view profiles" ON public.profiles;

CREATE POLICY "Users and admins can view profiles"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR public.is_admin(auth.uid())
    OR can_view_profile_via_org(auth.uid(), id)
  );

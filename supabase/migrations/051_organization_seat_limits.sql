-- Add seat_count column to organizations for soft limit enforcement
-- Schools and businesses declare seat count when subscribing

-- ============================================================================
-- ADD SEAT_COUNT COLUMN
-- ============================================================================

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS seat_count integer DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN organizations.seat_count IS 'Declared seat count from subscription. NULL = no limit (free/trial). Used for soft limit warnings.';

-- ============================================================================
-- FUNCTION TO GET ORGANIZATION MEMBER STATS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_organization_member_stats(p_org_id uuid)
RETURNS TABLE (
  total_members integer,
  active_members integer,
  student_count integer,
  trainer_count integer,
  seat_count integer,
  is_over_limit boolean
) AS $$
DECLARE
  v_seat_count integer;
  v_active_members integer;
BEGIN
  -- Get seat count from organization
  SELECT o.seat_count INTO v_seat_count
  FROM organizations o
  WHERE o.id = p_org_id;

  -- Count active members by role
  SELECT
    COUNT(*) FILTER (WHERE status = 'active'),
    COUNT(*) FILTER (WHERE status = 'active' AND role = 'student')
  INTO v_active_members, student_count
  FROM organization_members
  WHERE organization_id = p_org_id;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::integer FROM organization_members WHERE organization_id = p_org_id) as total_members,
    v_active_members as active_members,
    (SELECT COUNT(*)::integer FROM organization_members WHERE organization_id = p_org_id AND status = 'active' AND role = 'student') as student_count,
    (SELECT COUNT(*)::integer FROM organization_members WHERE organization_id = p_org_id AND status = 'active' AND role IN ('owner', 'admin', 'teacher')) as trainer_count,
    v_seat_count as seat_count,
    CASE
      WHEN v_seat_count IS NULL THEN false
      WHEN v_active_members > v_seat_count THEN true
      ELSE false
    END as is_over_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UPDATE get_user_organization TO INCLUDE SEAT INFO
-- ============================================================================

-- Drop and recreate to add seat columns
DROP FUNCTION IF EXISTS get_user_organization(uuid);

CREATE OR REPLACE FUNCTION get_user_organization(p_user_id uuid)
RETURNS TABLE (
  organization_id uuid,
  organization_name text,
  organization_type text,
  role text,
  credit_allocated numeric,
  credit_used numeric,
  credit_remaining numeric,
  is_trainer boolean,
  id uuid,
  seat_count integer,
  member_count integer,
  is_over_seat_limit boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id as organization_id,
    o.name as organization_name,
    o.type as organization_type,
    om.role,
    om.credit_allocated,
    om.credit_used,
    CASE
      WHEN om.role IN ('owner', 'admin', 'teacher') THEN
        o.credit_balance - o.credit_allocated
      ELSE
        om.credit_allocated - om.credit_used
    END as credit_remaining,
    om.role IN ('owner', 'admin', 'teacher') as is_trainer,
    om.id,
    o.seat_count,
    (SELECT COUNT(*)::integer FROM organization_members om2 WHERE om2.organization_id = o.id AND om2.status = 'active') as member_count,
    CASE
      WHEN o.seat_count IS NULL THEN false
      WHEN (SELECT COUNT(*) FROM organization_members om3 WHERE om3.organization_id = o.id AND om3.status = 'active') > o.seat_count THEN true
      ELSE false
    END as is_over_seat_limit
  FROM organization_members om
  JOIN organizations o ON o.id = om.organization_id
  WHERE om.user_id = p_user_id
    AND om.status = 'active'
    AND o.status = 'active'
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UPDATE join_class TO RETURN SEAT LIMIT WARNING
-- ============================================================================

CREATE OR REPLACE FUNCTION join_class(
  p_token text,
  p_user_id uuid,
  p_display_name text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_class organization_classes%ROWTYPE;
  v_org organizations%ROWTYPE;
  v_existing_member organization_members%ROWTYPE;
  v_member_id uuid;
  v_current_members integer;
  v_is_over_limit boolean := false;
BEGIN
  -- Find and validate class
  SELECT * INTO v_class
  FROM organization_classes
  WHERE join_token = p_token
    AND status = 'active'
    AND closed_at IS NULL
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at > now())
  FOR UPDATE;

  IF v_class IS NULL THEN
    -- Check why it failed
    SELECT * INTO v_class FROM organization_classes WHERE join_token = p_token;
    IF v_class IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'class_not_found');
    ELSIF v_class.status != 'active' THEN
      RETURN jsonb_build_object('success', false, 'error', 'class_not_active');
    ELSIF v_class.closed_at IS NOT NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'session_closed');
    ELSIF v_class.starts_at IS NOT NULL AND v_class.starts_at > now() THEN
      RETURN jsonb_build_object('success', false, 'error', 'session_not_started', 'starts_at', v_class.starts_at);
    ELSIF v_class.ends_at IS NOT NULL AND v_class.ends_at <= now() THEN
      RETURN jsonb_build_object('success', false, 'error', 'session_expired', 'ended_at', v_class.ends_at);
    END IF;
  END IF;

  -- Get organization
  SELECT * INTO v_org
  FROM organizations
  WHERE id = v_class.organization_id AND status = 'active';

  IF v_org IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'organization_not_active');
  END IF;

  -- Check current member count for seat limit warning
  SELECT COUNT(*) INTO v_current_members
  FROM organization_members
  WHERE organization_id = v_class.organization_id AND status = 'active';

  -- Determine if over limit (soft limit - still allow join)
  IF v_org.seat_count IS NOT NULL AND v_current_members >= v_org.seat_count THEN
    v_is_over_limit := true;
  END IF;

  -- Check if user is already a member of this class
  SELECT * INTO v_existing_member
  FROM organization_members
  WHERE organization_id = v_class.organization_id
    AND user_id = p_user_id
    AND class_id = v_class.id;

  IF v_existing_member IS NOT NULL THEN
    IF v_existing_member.status != 'active' THEN
      UPDATE organization_members
      SET status = 'active', updated_at = now()
      WHERE id = v_existing_member.id;
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'member_id', v_existing_member.id,
      'already_member', true,
      'class_id', v_class.id,
      'organization_id', v_class.organization_id,
      'seat_limit_warning', v_is_over_limit,
      'current_members', v_current_members,
      'seat_count', v_org.seat_count
    );
  END IF;

  -- Check if user is already in the org (maybe different class)
  SELECT * INTO v_existing_member
  FROM organization_members
  WHERE organization_id = v_class.organization_id
    AND user_id = p_user_id;

  IF v_existing_member IS NOT NULL THEN
    -- Update to new class
    UPDATE organization_members
    SET class_id = v_class.id,
        status = 'active',
        updated_at = now()
    WHERE id = v_existing_member.id
    RETURNING id INTO v_member_id;

    RETURN jsonb_build_object(
      'success', true,
      'member_id', v_member_id,
      'already_member', false,
      'class_id', v_class.id,
      'organization_id', v_class.organization_id,
      'seat_limit_warning', v_is_over_limit,
      'current_members', v_current_members,
      'seat_count', v_org.seat_count
    );
  END IF;

  -- Create membership (no allocation - they draw from org pool)
  INSERT INTO organization_members (
    organization_id,
    user_id,
    class_id,
    role,
    display_name,
    credit_allocated
  ) VALUES (
    v_class.organization_id,
    p_user_id,
    v_class.id,
    'student',
    p_display_name,
    0
  )
  RETURNING id INTO v_member_id;

  RETURN jsonb_build_object(
    'success', true,
    'member_id', v_member_id,
    'already_member', false,
    'class_id', v_class.id,
    'organization_id', v_class.organization_id,
    'seat_limit_warning', v_is_over_limit,
    'current_members', v_current_members + 1,
    'seat_count', v_org.seat_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UPDATE get_organization_stats TO INCLUDE SEAT INFO
-- ============================================================================

CREATE OR REPLACE FUNCTION get_organization_stats(p_organization_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
  v_seat_count integer;
  v_active_members integer;
BEGIN
  -- Get seat count
  SELECT seat_count INTO v_seat_count
  FROM organizations WHERE id = p_organization_id;

  -- Get active member count
  SELECT count(*) INTO v_active_members
  FROM organization_members
  WHERE organization_id = p_organization_id AND status = 'active';

  SELECT jsonb_build_object(
    'total_members', v_active_members,
    'students', (SELECT count(*) FROM organization_members WHERE organization_id = p_organization_id AND status = 'active' AND role = 'student'),
    'teachers', (SELECT count(*) FROM organization_members WHERE organization_id = p_organization_id AND status = 'active' AND role = 'teacher'),
    'admins', (SELECT count(*) FROM organization_members WHERE organization_id = p_organization_id AND status = 'active' AND role IN ('admin', 'owner')),
    'credit_balance', (SELECT credit_balance FROM organizations WHERE id = p_organization_id),
    'total_used', (SELECT COALESCE(sum(credit_used), 0) FROM organization_members WHERE organization_id = p_organization_id),
    'pending_invites', (SELECT count(*) FROM organization_invites WHERE organization_id = p_organization_id AND status = 'pending' AND expires_at > now()),
    'classes', (SELECT jsonb_agg(DISTINCT oc.name) FROM organization_classes oc WHERE oc.organization_id = p_organization_id AND oc.status = 'active'),
    'seat_count', v_seat_count,
    'is_over_seat_limit', CASE WHEN v_seat_count IS NULL THEN false WHEN v_active_members > v_seat_count THEN true ELSE false END,
    'seats_remaining', CASE WHEN v_seat_count IS NULL THEN NULL ELSE v_seat_count - v_active_members END
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

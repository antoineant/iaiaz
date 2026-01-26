-- Remove credit allocation concept
-- Everyone draws directly from org pool with limits
--
-- New model:
--   - organizations.credit_balance = total pool (unchanged)
--   - organizations.credit_allocated = DEPRECATED (set to 0)
--   - organization_members.credit_allocated = DEPRECATED (set to 0)
--   - organization_members.credit_used = KEEP for analytics
--   - organization_classes.settings.credit_limit = total limit per student in class
--   - Rate limits (daily/weekly/monthly) = KEEP for spending caps

-- ============================================================================
-- 1. RESET ALLOCATION FIELDS (data migration)
-- ============================================================================

-- Zero out org credit_allocated (no longer used)
UPDATE organizations
SET credit_allocated = 0,
    updated_at = now()
WHERE credit_allocated > 0;

-- Zero out member credit_allocated (no longer used)
-- Keep credit_used for analytics
UPDATE organization_members
SET credit_allocated = 0,
    updated_at = now()
WHERE credit_allocated > 0;

-- ============================================================================
-- 2. UPDATE get_user_organization FUNCTION
-- ============================================================================

DROP FUNCTION IF EXISTS get_user_organization(uuid);

CREATE OR REPLACE FUNCTION get_user_organization(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  organization_id uuid,
  organization_name text,
  role text,
  credit_allocated numeric,
  credit_used numeric,
  credit_remaining numeric,
  is_trainer boolean,
  class_id uuid,
  class_name text,
  credit_limit numeric,
  subscription_plan_id text,
  subscription_status text,
  subscription_period_end timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    om.id,
    o.id as organization_id,
    o.name as organization_name,
    om.role,
    om.credit_allocated,  -- Always 0 now, kept for backwards compat
    om.credit_used,
    -- Everyone sees org pool balance as their available credits
    o.credit_balance as credit_remaining,
    om.role IN ('owner', 'admin', 'teacher') as is_trainer,
    om.class_id,
    oc.name as class_name,
    -- Get class credit limit if student in a class
    CASE
      WHEN om.role = 'student' AND om.class_id IS NOT NULL THEN
        (oc.settings->>'credit_limit')::numeric
      ELSE
        NULL
    END as credit_limit,
    o.subscription_plan_id,
    o.subscription_status,
    o.subscription_current_period_end as subscription_period_end
  FROM organization_members om
  JOIN organizations o ON o.id = om.organization_id
  LEFT JOIN organization_classes oc ON oc.id = om.class_id
  WHERE om.user_id = p_user_id
    AND om.status = 'active'
    AND o.status = 'active'
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. UPDATE check_org_member_limits FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION check_org_member_limits(
  p_user_id uuid,
  p_amount numeric
)
RETURNS jsonb AS $$
DECLARE
  v_member_id uuid;
  v_org_id uuid;
  v_role text;
  v_class_id uuid;
  v_org_balance numeric;
  v_credit_used numeric;
  v_credit_limit numeric;
  v_settings jsonb;
  v_class_settings jsonb;
  v_daily_used numeric;
  v_weekly_used numeric;
  v_monthly_used numeric;
  v_daily_limit numeric;
  v_weekly_limit numeric;
  v_monthly_limit numeric;
  v_is_trainer boolean;
BEGIN
  -- Find member and org
  SELECT om.id, om.organization_id, om.role, om.class_id, om.credit_used,
         o.credit_balance, o.settings
  INTO v_member_id, v_org_id, v_role, v_class_id, v_credit_used, v_org_balance, v_settings
  FROM organization_members om
  JOIN organizations o ON o.id = om.organization_id
  WHERE om.user_id = p_user_id
    AND om.status = 'active'
    AND o.status = 'active';

  IF v_member_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'not_member');
  END IF;

  v_is_trainer := v_role IN ('owner', 'admin', 'teacher');

  -- Check org pool has enough credits
  IF v_org_balance < p_amount THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'org_pool_exceeded',
      'remaining', v_org_balance,
      'is_trainer', v_is_trainer
    );
  END IF;

  -- For students in a class, check class credit limit
  IF NOT v_is_trainer AND v_class_id IS NOT NULL THEN
    SELECT settings INTO v_class_settings
    FROM organization_classes
    WHERE id = v_class_id;

    v_credit_limit := (v_class_settings->>'credit_limit')::numeric;

    IF v_credit_limit IS NOT NULL AND v_credit_used + p_amount > v_credit_limit THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'class_limit_exceeded',
        'used', v_credit_used,
        'limit', v_credit_limit,
        'remaining', GREATEST(0, v_credit_limit - v_credit_used),
        'is_trainer', v_is_trainer
      );
    END IF;
  END IF;

  -- Get rate limits from org settings (apply to students only)
  IF NOT v_is_trainer THEN
    v_daily_limit := (v_settings->>'daily_limit_per_student')::numeric;
    v_weekly_limit := (v_settings->>'weekly_limit_per_student')::numeric;
    v_monthly_limit := (v_settings->>'monthly_limit_per_student')::numeric;

    -- Also check class-level rate limits (override org)
    IF v_class_id IS NOT NULL AND v_class_settings IS NOT NULL THEN
      IF (v_class_settings->>'daily_limit_per_student') IS NOT NULL THEN
        v_daily_limit := (v_class_settings->>'daily_limit_per_student')::numeric;
      END IF;
    END IF;

    -- Check daily limit
    IF v_daily_limit IS NOT NULL THEN
      SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_daily_used
      FROM organization_transactions
      WHERE member_id = v_member_id
        AND type = 'usage'
        AND created_at >= CURRENT_DATE;

      IF v_daily_used + p_amount > v_daily_limit THEN
        RETURN jsonb_build_object(
          'allowed', false,
          'reason', 'daily_limit_exceeded',
          'used', v_daily_used,
          'limit', v_daily_limit,
          'resets_at', (CURRENT_DATE + interval '1 day')::text,
          'is_trainer', v_is_trainer
        );
      END IF;
    END IF;

    -- Check weekly limit
    IF v_weekly_limit IS NOT NULL THEN
      SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_weekly_used
      FROM organization_transactions
      WHERE member_id = v_member_id
        AND type = 'usage'
        AND created_at >= date_trunc('week', CURRENT_DATE);

      IF v_weekly_used + p_amount > v_weekly_limit THEN
        RETURN jsonb_build_object(
          'allowed', false,
          'reason', 'weekly_limit_exceeded',
          'used', v_weekly_used,
          'limit', v_weekly_limit,
          'resets_at', (date_trunc('week', CURRENT_DATE) + interval '1 week')::text,
          'is_trainer', v_is_trainer
        );
      END IF;
    END IF;

    -- Check monthly limit
    IF v_monthly_limit IS NOT NULL THEN
      SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_monthly_used
      FROM organization_transactions
      WHERE member_id = v_member_id
        AND type = 'usage'
        AND created_at >= date_trunc('month', CURRENT_DATE);

      IF v_monthly_used + p_amount > v_monthly_limit THEN
        RETURN jsonb_build_object(
          'allowed', false,
          'reason', 'monthly_limit_exceeded',
          'used', v_monthly_used,
          'limit', v_monthly_limit,
          'resets_at', (date_trunc('month', CURRENT_DATE) + interval '1 month')::text,
          'is_trainer', v_is_trainer
        );
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', v_org_balance,
    'org_id', v_org_id,
    'member_id', v_member_id,
    'is_trainer', v_is_trainer
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. UPDATE record_org_member_usage FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION record_org_member_usage(
  p_user_id uuid,
  p_amount numeric
)
RETURNS jsonb AS $$
DECLARE
  v_check jsonb;
  v_member_id uuid;
  v_org_id uuid;
BEGIN
  -- First check all limits
  v_check := check_org_member_limits(p_user_id, p_amount);

  IF NOT (v_check->>'allowed')::boolean THEN
    RETURN v_check;
  END IF;

  v_member_id := (v_check->>'member_id')::uuid;
  v_org_id := (v_check->>'org_id')::uuid;

  -- Deduct from organization pool
  UPDATE organizations
  SET credit_balance = credit_balance - p_amount,
      updated_at = now()
  WHERE id = v_org_id;

  -- Update member usage tracking (for analytics)
  UPDATE organization_members
  SET credit_used = credit_used + p_amount,
      updated_at = now()
  WHERE id = v_member_id;

  -- Log transaction
  INSERT INTO organization_transactions (
    organization_id, type, amount, member_id, user_id, description
  ) VALUES (
    v_org_id,
    'usage',
    -p_amount,
    v_member_id,
    p_user_id,
    'Credit usage'
  );

  RETURN jsonb_build_object(
    'success', true,
    'remaining', (v_check->>'remaining')::numeric - p_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. UPDATE join_class FUNCTION (no more allocation on join)
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
      'organization_id', v_class.organization_id
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
      'organization_id', v_class.organization_id
    );
  END IF;

  -- Create membership (no allocation - they draw from org pool)
  INSERT INTO organization_members (
    organization_id,
    user_id,
    class_id,
    role,
    display_name,
    credit_allocated  -- Always 0 now
  ) VALUES (
    v_class.organization_id,
    p_user_id,
    v_class.id,
    'student',
    p_display_name,
    0  -- No upfront allocation
  )
  RETURNING id INTO v_member_id;

  RETURN jsonb_build_object(
    'success', true,
    'member_id', v_member_id,
    'already_member', false,
    'class_id', v_class.id,
    'organization_id', v_class.organization_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. UPDATE get_organization_stats FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION get_organization_stats(p_organization_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_members', (SELECT count(*) FROM organization_members WHERE organization_id = p_organization_id AND status = 'active'),
    'students', (SELECT count(*) FROM organization_members WHERE organization_id = p_organization_id AND status = 'active' AND role = 'student'),
    'teachers', (SELECT count(*) FROM organization_members WHERE organization_id = p_organization_id AND status = 'active' AND role = 'teacher'),
    'admins', (SELECT count(*) FROM organization_members WHERE organization_id = p_organization_id AND status = 'active' AND role IN ('admin', 'owner')),
    'credit_balance', (SELECT credit_balance FROM organizations WHERE id = p_organization_id),
    'total_used', (SELECT COALESCE(sum(credit_used), 0) FROM organization_members WHERE organization_id = p_organization_id),
    'pending_invites', (SELECT count(*) FROM organization_invites WHERE organization_id = p_organization_id AND status = 'pending' AND expires_at > now()),
    'classes', (SELECT jsonb_agg(DISTINCT oc.name) FROM organization_classes oc WHERE oc.organization_id = p_organization_id AND oc.status = 'active')
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. UPDATE get_class_stats FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION get_class_stats(p_class_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_students', (
      SELECT count(*)
      FROM organization_members
      WHERE class_id = p_class_id AND status = 'active' AND role = 'student'
    ),
    'active_today', (
      SELECT count(DISTINCT user_id)
      FROM organization_transactions ot
      JOIN organization_members om ON om.id = ot.member_id
      WHERE om.class_id = p_class_id
        AND ot.type = 'usage'
        AND ot.created_at >= CURRENT_DATE
    ),
    'total_credit_used', (
      SELECT COALESCE(sum(credit_used), 0)
      FROM organization_members
      WHERE class_id = p_class_id AND status = 'active'
    ),
    'usage_today', (
      SELECT COALESCE(sum(ABS(ot.amount)), 0)
      FROM organization_transactions ot
      JOIN organization_members om ON om.id = ot.member_id
      WHERE om.class_id = p_class_id
        AND ot.type = 'usage'
        AND ot.created_at >= CURRENT_DATE
    ),
    'usage_this_week', (
      SELECT COALESCE(sum(ABS(ot.amount)), 0)
      FROM organization_transactions ot
      JOIN organization_members om ON om.id = ot.member_id
      WHERE om.class_id = p_class_id
        AND ot.type = 'usage'
        AND ot.created_at >= date_trunc('week', CURRENT_DATE)
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. DEPRECATE allocate_member_credits FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION allocate_member_credits(
  p_organization_id uuid,
  p_member_id uuid,
  p_amount numeric,
  p_allocated_by uuid
)
RETURNS boolean AS $$
BEGIN
  -- Function deprecated - no longer needed
  -- Credits are now drawn directly from org pool
  RAISE NOTICE 'allocate_member_credits is deprecated. Credits draw directly from org pool.';
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

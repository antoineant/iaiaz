-- Family credit sync: unify parent personal credits with family org pool
-- For family orgs, parent personal balance and org credit_balance are kept in sync.

-- ============================================================================
-- 1. Update get_user_organization to include family orgs (lower priority)
--    Business orgs are preferred over family orgs when user is in both.
-- ============================================================================

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
    (SELECT COUNT(*)::integer FROM organization_members om2
     WHERE om2.organization_id = o.id AND om2.status = 'active') as member_count,
    CASE
      WHEN o.seat_count IS NULL THEN false
      WHEN (SELECT COUNT(*) FROM organization_members om3
            WHERE om3.organization_id = o.id AND om3.status = 'active') > o.seat_count THEN true
      ELSE false
    END as is_over_seat_limit
  FROM organization_members om
  JOIN organizations o ON o.id = om.organization_id
  WHERE om.user_id = p_user_id
    AND om.status = 'active'
    AND o.status = 'active'
  ORDER BY
    CASE WHEN o.type = 'family' THEN 1 ELSE 0 END,
    om.created_at ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. Update check_org_member_limits: add LIMIT 1 with ORDER BY
--    Prefers business orgs over family orgs for users in multiple orgs.
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
  v_org_type text;
BEGIN
  -- Find member and org (prefer business orgs over family)
  SELECT om.id, om.organization_id, om.role, om.class_id, om.credit_used,
         o.credit_balance, o.settings, o.type
  INTO v_member_id, v_org_id, v_role, v_class_id, v_credit_used, v_org_balance, v_settings, v_org_type
  FROM organization_members om
  JOIN organizations o ON o.id = om.organization_id
  WHERE om.user_id = p_user_id
    AND om.status = 'active'
    AND o.status = 'active'
  ORDER BY
    CASE WHEN o.type = 'family' THEN 1 ELSE 0 END,
    om.created_at ASC
  LIMIT 1;

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
-- 3. Update record_org_member_usage: sync family org owner's personal balance
--    When credits are deducted from a family org, also update the owner's
--    profiles.credits_balance to keep them in sync.
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
  v_new_balance numeric;
  v_org_type text;
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
  WHERE id = v_org_id
  RETURNING credit_balance INTO v_new_balance;

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

  -- Sync family org owner's personal balance
  SELECT type INTO v_org_type FROM organizations WHERE id = v_org_id;
  IF v_org_type = 'family' THEN
    UPDATE profiles p
    SET credits_balance = v_new_balance,
        updated_at = now()
    FROM organization_members om
    WHERE om.organization_id = v_org_id
      AND om.role = 'owner'
      AND om.status = 'active'
      AND p.id = om.user_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'remaining', v_new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. One-time data migration: sync parent personal credits with family org pool
--    Use the GREATER of personal vs org balance (they may already be mirrored
--    from trial allocation). This avoids double-counting.
-- ============================================================================

-- Set org credit_balance to the max of (org balance, parent personal balance)
-- This handles both cases: credits only in personal, or already synced
UPDATE organizations o
SET credit_balance = GREATEST(o.credit_balance, p.credits_balance),
    updated_at = now()
FROM organization_members om
JOIN profiles p ON p.id = om.user_id
WHERE om.organization_id = o.id
  AND om.role = 'owner'
  AND om.status = 'active'
  AND o.type = 'family'
  AND o.status = 'active';

-- Sync parent personal balance to match org balance
UPDATE profiles p
SET credits_balance = (
  SELECT o.credit_balance
  FROM organization_members om
  JOIN organizations o ON o.id = om.organization_id
  WHERE om.user_id = p.id
    AND om.role = 'owner'
    AND om.status = 'active'
    AND o.type = 'family'
    AND o.status = 'active'
  LIMIT 1
),
updated_at = now()
WHERE EXISTS (
  SELECT 1
  FROM organization_members om
  JOIN organizations o ON o.id = om.organization_id
  WHERE om.user_id = p.id
    AND om.role = 'owner'
    AND om.status = 'active'
    AND o.type = 'family'
    AND o.status = 'active'
);

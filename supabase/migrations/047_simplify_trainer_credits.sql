-- Simplify credit system for trainers
-- Trainers (owner, admin, teacher) draw directly from org pool
-- Students keep allocation-based system

-- ============================================================================
-- UPDATE get_user_organization TO RETURN is_trainer FLAG
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
    om.credit_allocated,
    om.credit_used,
    -- For trainers: credit_remaining = org available pool (balance - allocated to students)
    -- For students: credit_remaining = their allocation - used
    CASE
      WHEN om.role IN ('owner', 'admin', 'teacher') THEN
        o.credit_balance - o.credit_allocated
      ELSE
        om.credit_allocated - om.credit_used
    END as credit_remaining,
    om.role IN ('owner', 'admin', 'teacher') as is_trainer,
    o.subscription_plan_id,
    o.subscription_status,
    o.subscription_current_period_end as subscription_period_end
  FROM organization_members om
  JOIN organizations o ON o.id = om.organization_id
  WHERE om.user_id = p_user_id
    AND om.status = 'active'
    AND o.status = 'active'
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UPDATE check_org_member_limits FOR TRAINERS
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
  v_remaining numeric;
  v_org_available numeric;
  v_settings jsonb;
  v_daily_used numeric;
  v_weekly_used numeric;
  v_monthly_used numeric;
  v_daily_limit numeric;
  v_weekly_limit numeric;
  v_monthly_limit numeric;
  v_is_trainer boolean;
BEGIN
  -- Find member and org settings
  SELECT om.id, om.organization_id, om.role, om.credit_allocated - om.credit_used,
         o.settings, o.credit_balance - o.credit_allocated
  INTO v_member_id, v_org_id, v_role, v_remaining, v_settings, v_org_available
  FROM organization_members om
  JOIN organizations o ON o.id = om.organization_id
  WHERE om.user_id = p_user_id
    AND om.status = 'active'
    AND o.status = 'active';

  IF v_member_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'not_member');
  END IF;

  -- Check if trainer (owner, admin, teacher)
  v_is_trainer := v_role IN ('owner', 'admin', 'teacher');

  -- For trainers: check org available pool
  -- For students: check individual allocation
  IF v_is_trainer THEN
    IF v_org_available < p_amount THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'org_pool_exceeded', 'remaining', v_org_available);
    END IF;
    v_remaining := v_org_available;
  ELSE
    IF v_remaining < p_amount THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'allocation_exceeded', 'remaining', v_remaining);
    END IF;
  END IF;

  -- Get rate limits from settings (apply to both trainers and students)
  v_daily_limit := (v_settings->>'daily_limit_per_student')::numeric;
  v_weekly_limit := (v_settings->>'weekly_limit_per_student')::numeric;
  v_monthly_limit := (v_settings->>'monthly_limit_per_student')::numeric;

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
        'resets_at', (CURRENT_DATE + interval '1 day')::text
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
        'resets_at', (date_trunc('week', CURRENT_DATE) + interval '1 week')::text
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
        'resets_at', (date_trunc('month', CURRENT_DATE) + interval '1 month')::text
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', v_remaining,
    'org_id', v_org_id,
    'member_id', v_member_id,
    'is_trainer', v_is_trainer
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UPDATE record_org_member_usage FOR TRAINERS
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
  v_is_trainer boolean;
BEGIN
  -- First check all limits
  v_check := check_org_member_limits(p_user_id, p_amount);

  IF NOT (v_check->>'allowed')::boolean THEN
    -- Include is_trainer in the failure response
    RETURN v_check || jsonb_build_object('is_trainer', COALESCE((v_check->>'is_trainer')::boolean, false));
  END IF;

  v_member_id := (v_check->>'member_id')::uuid;
  v_org_id := (v_check->>'org_id')::uuid;
  v_is_trainer := COALESCE((v_check->>'is_trainer')::boolean, false);

  -- For trainers: deduct directly from org.credit_balance
  -- For students: deduct from allocation (existing behavior)
  IF v_is_trainer THEN
    -- Deduct from organization balance directly
    UPDATE organizations
    SET credit_balance = credit_balance - p_amount,
        updated_at = now()
    WHERE id = v_org_id;
  END IF;

  -- Update member usage tracking (for both trainers and students - analytics)
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
    CASE WHEN v_is_trainer THEN 'Trainer credit usage' ELSE 'Credit usage' END
  );

  RETURN jsonb_build_object('success', true, 'remaining', (v_check->>'remaining')::numeric - p_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ADD transfer_in AND transfer_out TO organization_transactions TYPE
-- ============================================================================

-- First check if constraint exists and drop it
DO $$
BEGIN
  ALTER TABLE organization_transactions DROP CONSTRAINT IF EXISTS organization_transactions_type_check;

  -- Re-add with expanded types
  ALTER TABLE organization_transactions ADD CONSTRAINT organization_transactions_type_check
    CHECK (type IN ('purchase', 'allocation', 'usage', 'refund', 'adjustment', 'transfer_in', 'transfer_out'));
EXCEPTION
  WHEN others THEN
    -- Constraint might not exist or be named differently, ignore
    NULL;
END $$;

-- Fix: daily_credit_limit = 0 should mean "no limit" (same as NULL),
-- not "block all usage". Previously 0 >= 0 always evaluated true, blocking the child.

CREATE OR REPLACE FUNCTION check_familia_preconditions(
  p_user_id UUID
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_controls parental_controls%ROWTYPE;
  v_org_type TEXT;
  v_current_time TIME;
  v_used NUMERIC;
  v_limit NUMERIC;
  v_member_id UUID;
  v_sub_status TEXT;
  v_trial_end TIMESTAMPTZ;
  v_role TEXT;
BEGIN
  -- Check if user is in a family org (explicitly filter by type)
  SELECT o.type, om.id, o.subscription_status, o.subscription_trial_end, om.role
  INTO v_org_type, v_member_id, v_sub_status, v_trial_end, v_role
  FROM organization_members om
  JOIN organizations o ON o.id = om.organization_id
  WHERE om.user_id = p_user_id AND om.status = 'active' AND o.status = 'active'
    AND o.type = 'family'
  LIMIT 1;

  -- Not in a family org, no restrictions
  IF v_org_type IS NULL THEN
    RETURN jsonb_build_object('allowed', true);
  END IF;

  -- Block children if trial expired (parents can still access dashboard)
  IF v_sub_status = 'trialing' AND v_trial_end < NOW() AND v_role = 'student' THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'trial_expired');
  END IF;

  -- Get parental controls for this child
  SELECT * INTO v_controls
  FROM parental_controls
  WHERE child_user_id = p_user_id
  LIMIT 1;

  -- No controls set (parent or no controls configured)
  IF v_controls IS NULL THEN
    RETURN jsonb_build_object('allowed', true);
  END IF;

  -- Check quiet hours
  v_current_time := LOCALTIME;
  IF v_controls.quiet_hours_start IS NOT NULL AND v_controls.quiet_hours_end IS NOT NULL THEN
    -- Handle overnight ranges (e.g., 22:00 to 07:00)
    IF v_controls.quiet_hours_start > v_controls.quiet_hours_end THEN
      IF v_current_time >= v_controls.quiet_hours_start OR v_current_time < v_controls.quiet_hours_end THEN
        RETURN jsonb_build_object(
          'allowed', false,
          'reason', 'quiet_hours',
          'quiet_hours_end', v_controls.quiet_hours_end::TEXT
        );
      END IF;
    ELSE
      IF v_current_time >= v_controls.quiet_hours_start AND v_current_time < v_controls.quiet_hours_end THEN
        RETURN jsonb_build_object(
          'allowed', false,
          'reason', 'quiet_hours',
          'quiet_hours_end', v_controls.quiet_hours_end::TEXT
        );
      END IF;
    END IF;
  END IF;

  -- Check credit limit (NULL or 0 = unlimited)
  IF v_controls.daily_credit_limit IS NOT NULL AND v_controls.daily_credit_limit > 0 THEN
    IF v_controls.cumulative_credits = true THEN
      -- Cumulative mode: 7-day rolling window
      v_limit := v_controls.daily_credit_limit * 7;
      SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_used
      FROM organization_transactions
      WHERE member_id = v_member_id AND type = 'usage'
      AND created_at >= (CURRENT_DATE - INTERVAL '6 days');
    ELSE
      -- Standard mode: daily limit
      v_limit := v_controls.daily_credit_limit;
      SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_used
      FROM organization_transactions
      WHERE member_id = v_member_id AND type = 'usage'
      AND created_at >= CURRENT_DATE;
    END IF;

    IF v_used >= v_limit THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'daily_limit_reached',
        'used', v_used,
        'limit', v_limit
      );
    END IF;
  END IF;

  RETURN jsonb_build_object('allowed', true);
END;
$$;

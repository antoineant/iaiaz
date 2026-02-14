-- Add cumulative credits option to parental controls
ALTER TABLE parental_controls ADD COLUMN IF NOT EXISTS cumulative_credits BOOLEAN DEFAULT false;
COMMENT ON COLUMN parental_controls.cumulative_credits IS 'When true, unused daily credits roll over within a 7-day window';

-- Function to get weekly credits used by a user (for cumulative mode display)
CREATE OR REPLACE FUNCTION get_weekly_credits_used(p_user_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_weekly_used NUMERIC;
BEGIN
  SELECT COALESCE(SUM(m.cost), 0)
  INTO v_weekly_used
  FROM messages m
  JOIN conversations c ON c.id = m.conversation_id
  WHERE c.user_id = p_user_id
    AND m.role = 'assistant'
    AND m.created_at >= (CURRENT_DATE - INTERVAL '6 days');

  RETURN v_weekly_used;
END;
$$;

-- Update check_familia_preconditions to handle cumulative mode
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
BEGIN
  -- Check if user is in a family org
  SELECT o.type, om.id INTO v_org_type, v_member_id
  FROM organization_members om
  JOIN organizations o ON o.id = om.organization_id
  WHERE om.user_id = p_user_id AND om.status = 'active' AND o.status = 'active'
  LIMIT 1;

  -- Not in a family org, no restrictions
  IF v_org_type IS NULL OR v_org_type != 'family' THEN
    RETURN jsonb_build_object('allowed', true);
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

  -- Check credit limit
  IF v_controls.daily_credit_limit IS NOT NULL THEN
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

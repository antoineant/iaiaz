-- ============================================================================
-- FAMILIA BY IAIAZ - Family Plans
-- Extends the organizations system to support family subscriptions
-- with parental controls, age-based supervision, and content flagging.
-- ============================================================================

-- 1. Add 'family' to organization type constraint
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_type_check;
ALTER TABLE organizations ADD CONSTRAINT organizations_type_check
  CHECK (type IN ('school', 'university', 'business_school', 'training_center', 'business', 'family', 'other'));

-- Max family members column (defaults to 4 for basic plan)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS max_family_members INTEGER DEFAULT 4;

-- 2. Add birthdate to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birthdate DATE;

-- 3. Add supervision metadata to organization_members
ALTER TABLE organization_members
  ADD COLUMN IF NOT EXISTS supervision_mode TEXT CHECK (supervision_mode IN ('guided', 'trusted', 'adult')),
  ADD COLUMN IF NOT EXISTS age_bracket TEXT CHECK (age_bracket IN ('12-14', '15-17', '18+'));

-- 4. Parental controls table (per-child settings)
CREATE TABLE IF NOT EXISTS parental_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  child_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supervision_mode TEXT NOT NULL DEFAULT 'guided' CHECK (supervision_mode IN ('guided', 'trusted', 'adult')),
  content_filter_enabled BOOLEAN DEFAULT true,
  daily_time_limit_minutes INTEGER,        -- NULL = unlimited
  daily_credit_limit NUMERIC(12,6),        -- EUR limit per day (NULL = unlimited)
  quiet_hours_start TIME,                  -- e.g. 22:00
  quiet_hours_end TIME,                    -- e.g. 07:00
  notification_on_flagged_content BOOLEAN DEFAULT true,
  parent_can_view_history BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(organization_id, child_user_id)
);

CREATE INDEX IF NOT EXISTS idx_parental_controls_org ON parental_controls(organization_id);
CREATE INDEX IF NOT EXISTS idx_parental_controls_child ON parental_controls(child_user_id);

ALTER TABLE parental_controls ENABLE ROW LEVEL SECURITY;

-- Parents (owner/admin) manage controls
CREATE POLICY "parents_manage_controls" ON parental_controls FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active'
  )
);

-- Children view (read-only) their own controls
CREATE POLICY "children_view_own_controls" ON parental_controls FOR SELECT USING (
  child_user_id = auth.uid()
);

-- 5. Conversation flags table (content flagging for parental review)
CREATE TABLE IF NOT EXISTS conversation_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  flag_type TEXT NOT NULL CHECK (flag_type IN ('content_policy', 'parent_review', 'excessive_usage')),
  flag_reason TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversation_flags_org ON conversation_flags(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversation_flags_user ON conversation_flags(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_flags_conv ON conversation_flags(conversation_id);

ALTER TABLE conversation_flags ENABLE ROW LEVEL SECURITY;

-- Parents can view and manage flags for their family org
CREATE POLICY "parents_manage_flags" ON conversation_flags FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active'
  )
);

-- Children can view their own flags (read-only)
CREATE POLICY "children_view_own_flags" ON conversation_flags FOR SELECT USING (
  user_id = auth.uid()
);

-- 6. Function: get_family_usage_summary
CREATE OR REPLACE FUNCTION get_family_usage_summary(
  p_org_id UUID,
  p_days INTEGER DEFAULT 7
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Verify caller is a member of this org
  IF NOT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_org_id AND user_id = auth.uid() AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('error', 'not_member');
  END IF;

  SELECT jsonb_build_object(
    'total_members', (
      SELECT count(*) FROM organization_members
      WHERE organization_id = p_org_id AND status = 'active'
    ),
    'parents', (
      SELECT count(*) FROM organization_members
      WHERE organization_id = p_org_id AND status = 'active' AND role IN ('owner', 'admin')
    ),
    'children', (
      SELECT count(*) FROM organization_members
      WHERE organization_id = p_org_id AND status = 'active' AND role = 'student'
    ),
    'credit_balance', (
      SELECT credit_balance FROM organizations WHERE id = p_org_id
    ),
    'usage_period', (
      SELECT COALESCE(SUM(ABS(amount)), 0) FROM organization_transactions
      WHERE organization_id = p_org_id AND type = 'usage'
      AND created_at >= CURRENT_DATE - (p_days || ' days')::INTERVAL
    ),
    'member_usage', (
      SELECT COALESCE(jsonb_agg(mu), '[]'::jsonb) FROM (
        SELECT
          om.user_id,
          om.display_name,
          om.role,
          om.supervision_mode,
          om.age_bracket,
          COALESCE(SUM(ABS(ot.amount)), 0) AS usage_amount,
          COUNT(DISTINCT ot.id) AS transaction_count
        FROM organization_members om
        LEFT JOIN organization_transactions ot
          ON ot.member_id = om.id AND ot.type = 'usage'
          AND ot.created_at >= CURRENT_DATE - (p_days || ' days')::INTERVAL
        WHERE om.organization_id = p_org_id AND om.status = 'active'
        GROUP BY om.user_id, om.display_name, om.role, om.supervision_mode, om.age_bracket
      ) mu
    ),
    'flagged_count', (
      SELECT count(*) FROM conversation_flags
      WHERE organization_id = p_org_id AND dismissed = false
      AND created_at >= CURRENT_DATE - (p_days || ' days')::INTERVAL
    ),
    'pending_invites', (
      SELECT count(*) FROM organization_invites
      WHERE organization_id = p_org_id AND status = 'pending' AND expires_at > NOW()
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- 7. Function: check_familia_preconditions (quiet hours + daily credit limit)
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
  v_daily_used NUMERIC;
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

  -- Check daily credit limit
  IF v_controls.daily_credit_limit IS NOT NULL THEN
    SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_daily_used
    FROM organization_transactions
    WHERE member_id = v_member_id AND type = 'usage'
    AND created_at >= CURRENT_DATE;

    IF v_daily_used >= v_controls.daily_credit_limit THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'daily_limit_reached',
        'used', v_daily_used,
        'limit', v_controls.daily_credit_limit
      );
    END IF;
  END IF;

  RETURN jsonb_build_object('allowed', true);
END;
$$;

-- Fix get_family_usage_summary to include profile display_name and email fallback
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
          COALESCE(om.display_name, p.display_name, p.email) AS display_name,
          p.email,
          om.role,
          om.supervision_mode,
          om.age_bracket,
          COALESCE(SUM(ABS(ot.amount)), 0) AS usage_amount,
          COUNT(DISTINCT ot.id) AS transaction_count
        FROM organization_members om
        LEFT JOIN profiles p ON p.id = om.user_id
        LEFT JOIN organization_transactions ot
          ON ot.member_id = om.id AND ot.type = 'usage'
          AND ot.created_at >= CURRENT_DATE - (p_days || ' days')::INTERVAL
        WHERE om.organization_id = p_org_id AND om.status = 'active'
        GROUP BY om.user_id, om.display_name, p.display_name, p.email, om.role, om.supervision_mode, om.age_bracket
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

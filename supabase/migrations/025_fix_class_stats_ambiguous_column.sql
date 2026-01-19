-- Fix ambiguous column reference in get_class_stats function
-- The user_id column exists in both organization_transactions and organization_members
-- causing an ambiguous reference error

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
      SELECT count(DISTINCT om.user_id)
      FROM organization_transactions ot
      JOIN organization_members om ON om.id = ot.member_id
      WHERE om.class_id = p_class_id
        AND ot.type = 'usage'
        AND ot.created_at >= CURRENT_DATE
    ),
    'total_credit_allocated', (
      SELECT COALESCE(sum(credit_allocated), 0)
      FROM organization_members
      WHERE class_id = p_class_id AND status = 'active'
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

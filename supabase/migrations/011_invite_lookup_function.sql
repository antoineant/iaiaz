-- Function to get invite details by token (for join page)
-- Uses SECURITY DEFINER to bypass RLS since the user isn't a member yet

CREATE OR REPLACE FUNCTION get_invite_by_token(p_token text)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', i.id,
    'organization_id', i.organization_id,
    'organization_name', o.name,
    'role', i.role,
    'class_name', i.class_name,
    'credit_amount', i.credit_amount,
    'expires_at', i.expires_at,
    'status', i.status
  ) INTO v_result
  FROM organization_invites i
  JOIN organizations o ON o.id = i.organization_id
  WHERE i.token = p_token;

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

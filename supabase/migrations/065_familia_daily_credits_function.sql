-- Function to get daily credits used by a user
CREATE OR REPLACE FUNCTION get_daily_credits_used(p_user_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_daily_used NUMERIC;
BEGIN
  -- Sum credits used today from messages (more accurate than conversations)
  SELECT COALESCE(SUM(m.cost), 0)
  INTO v_daily_used
  FROM messages m
  JOIN conversations c ON c.id = m.conversation_id
  WHERE c.user_id = p_user_id
    AND m.role = 'assistant'
    AND DATE(m.created_at) = CURRENT_DATE;

  RETURN v_daily_used;
END;
$$;

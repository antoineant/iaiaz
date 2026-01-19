-- Increase signup rate limit for classroom scenarios
-- Previous limit: 3 per IP per 24 hours (too restrictive for schools)
-- New limit: 50 per IP per 24 hours

CREATE OR REPLACE FUNCTION public.check_signup_rate_limit(
  p_ip_address INET
)
RETURNS JSON AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_attempt_count INT;
  v_limit INT := 50;  -- Increased from 3 to 50 for classroom scenarios
  v_allowed BOOLEAN;
BEGIN
  -- Calculate window start (24 hours ago)
  v_window_start := NOW() - INTERVAL '24 hours';

  -- Count attempts in current window
  SELECT COUNT(*) INTO v_attempt_count
  FROM public.signup_rate_limits
  WHERE ip_address = p_ip_address
    AND attempt_timestamp > v_window_start;

  -- Check if allowed
  v_allowed := v_attempt_count < v_limit;

  -- If allowed, record this attempt
  IF v_allowed THEN
    INSERT INTO public.signup_rate_limits (ip_address, attempt_timestamp)
    VALUES (p_ip_address, NOW());
  END IF;

  RETURN json_build_object(
    'allowed', v_allowed,
    'attempts', v_attempt_count,
    'limit', v_limit,
    'reset_at', v_window_start + INTERVAL '24 hours'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also clean up old rate limit entries to reset current blocks
DELETE FROM public.signup_rate_limits
WHERE attempt_timestamp < NOW() - INTERVAL '1 hour';

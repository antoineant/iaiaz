-- Rate Limiting Migration
-- Track user requests for rate limiting

-- Table to store rate limit entries
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  model_tier VARCHAR(20) NOT NULL DEFAULT 'standard', -- 'economy', 'standard', 'premium'
  request_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by user and time
CREATE INDEX idx_rate_limits_user_time
ON public.rate_limits(user_id, request_timestamp DESC);

-- Index for cleanup of old entries
CREATE INDEX idx_rate_limits_timestamp
ON public.rate_limits(request_timestamp);

-- RLS - users can only see their own rate limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rate limits"
  ON public.rate_limits FOR SELECT
  USING (auth.uid() = user_id);

-- Function to check and record rate limit
-- Returns: { allowed: boolean, remaining: int, reset_at: timestamp }
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id UUID,
  p_model_tier VARCHAR DEFAULT 'standard'
)
RETURNS JSON AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_request_count INT;
  v_limit INT;
  v_remaining INT;
  v_allowed BOOLEAN;
BEGIN
  -- Set limits based on tier
  CASE p_model_tier
    WHEN 'economy' THEN v_limit := 20;   -- Gemini Flash, etc.
    WHEN 'premium' THEN v_limit := 3;     -- Claude Opus, GPT-5
    ELSE v_limit := 10;                   -- Standard models
  END CASE;

  -- Calculate window start (1 minute ago)
  v_window_start := NOW() - INTERVAL '1 minute';

  -- Count requests in current window
  SELECT COUNT(*) INTO v_request_count
  FROM public.rate_limits
  WHERE user_id = p_user_id
    AND model_tier = p_model_tier
    AND request_timestamp > v_window_start;

  -- Check if allowed
  v_allowed := v_request_count < v_limit;
  v_remaining := GREATEST(0, v_limit - v_request_count - 1);

  -- If allowed, record this request
  IF v_allowed THEN
    INSERT INTO public.rate_limits (user_id, model_tier, request_timestamp)
    VALUES (p_user_id, p_model_tier, NOW());

    v_remaining := GREATEST(0, v_limit - v_request_count - 1);
  ELSE
    v_remaining := 0;
  END IF;

  RETURN json_build_object(
    'allowed', v_allowed,
    'remaining', v_remaining,
    'limit', v_limit,
    'reset_at', v_window_start + INTERVAL '1 minute'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current rate limit status (without recording)
CREATE OR REPLACE FUNCTION public.get_rate_limit_status(
  p_user_id UUID,
  p_model_tier VARCHAR DEFAULT 'standard'
)
RETURNS JSON AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_request_count INT;
  v_limit INT;
  v_remaining INT;
BEGIN
  -- Set limits based on tier
  CASE p_model_tier
    WHEN 'economy' THEN v_limit := 20;
    WHEN 'premium' THEN v_limit := 3;
    ELSE v_limit := 10;
  END CASE;

  v_window_start := NOW() - INTERVAL '1 minute';

  SELECT COUNT(*) INTO v_request_count
  FROM public.rate_limits
  WHERE user_id = p_user_id
    AND model_tier = p_model_tier
    AND request_timestamp > v_window_start;

  v_remaining := GREATEST(0, v_limit - v_request_count);

  RETURN json_build_object(
    'remaining', v_remaining,
    'limit', v_limit,
    'used', v_request_count,
    'reset_at', v_window_start + INTERVAL '1 minute'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup function to remove old rate limit entries (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS INT AS $$
DECLARE
  v_deleted INT;
BEGIN
  DELETE FROM public.rate_limits
  WHERE request_timestamp < NOW() - INTERVAL '5 minutes';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: Create a cron job to cleanup old entries (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-rate-limits', '*/5 * * * *', 'SELECT public.cleanup_rate_limits()');

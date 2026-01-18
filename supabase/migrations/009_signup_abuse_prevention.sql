-- Signup Abuse Prevention Migration
-- Multi-layer defense against signup abuse: disposable email blocking + IP rate limiting

-- 1. Disposable Email Domains Blocklist
CREATE TABLE IF NOT EXISTS public.blocked_email_domains (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  domain VARCHAR(255) NOT NULL UNIQUE,
  reason VARCHAR(100) DEFAULT 'disposable',  -- 'disposable', 'spam', 'manual_block'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Index for fast domain lookups
CREATE INDEX idx_blocked_email_domains_domain ON public.blocked_email_domains(domain);

-- Insert common disposable email domains
INSERT INTO public.blocked_email_domains (domain, reason) VALUES
  ('tempmail.com', 'disposable'),
  ('temp-mail.org', 'disposable'),
  ('temp-mail.io', 'disposable'),
  ('tempail.com', 'disposable'),
  ('guerrillamail.com', 'disposable'),
  ('guerrillamail.org', 'disposable'),
  ('guerrillamail.net', 'disposable'),
  ('guerrillamail.biz', 'disposable'),
  ('guerrillamail.de', 'disposable'),
  ('mailinator.com', 'disposable'),
  ('mailinator.net', 'disposable'),
  ('10minutemail.com', 'disposable'),
  ('10minutemail.net', 'disposable'),
  ('10minmail.com', 'disposable'),
  ('throwaway.email', 'disposable'),
  ('throwawaymail.com', 'disposable'),
  ('fakeinbox.com', 'disposable'),
  ('trashmail.com', 'disposable'),
  ('trashmail.net', 'disposable'),
  ('mailnesia.com', 'disposable'),
  ('maildrop.cc', 'disposable'),
  ('dispostable.com', 'disposable'),
  ('yopmail.com', 'disposable'),
  ('yopmail.fr', 'disposable'),
  ('yopmail.net', 'disposable'),
  ('mailcatch.com', 'disposable'),
  ('getairmail.com', 'disposable'),
  ('mohmal.com', 'disposable'),
  ('sharklasers.com', 'disposable'),
  ('spam4.me', 'disposable'),
  ('grr.la', 'disposable'),
  ('burnermail.io', 'disposable'),
  ('getnada.com', 'disposable'),
  ('tempinbox.com', 'disposable'),
  ('fakemailgenerator.com', 'disposable'),
  ('emailondeck.com', 'disposable'),
  ('mintemail.com', 'disposable'),
  ('spamgourmet.com', 'disposable'),
  ('mailexpire.com', 'disposable'),
  ('incognitomail.com', 'disposable')
ON CONFLICT (domain) DO NOTHING;

-- 2. Signup Audit Log (tracks ALL signup attempts)
CREATE TABLE IF NOT EXISTS public.signup_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL,
  email_domain VARCHAR(255) NOT NULL,
  ip_address INET NOT NULL,
  user_agent TEXT,
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'blocked_email', 'blocked_ip', 'error')),
  block_reason TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- NULL if blocked
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for queries
CREATE INDEX idx_signup_audit_ip ON public.signup_audit_log(ip_address, created_at DESC);
CREATE INDEX idx_signup_audit_email_domain ON public.signup_audit_log(email_domain);
CREATE INDEX idx_signup_audit_created_at ON public.signup_audit_log(created_at);
CREATE INDEX idx_signup_audit_status ON public.signup_audit_log(status);

-- 3. IP-based Signup Rate Limiting
CREATE TABLE IF NOT EXISTS public.signup_rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ip_address INET NOT NULL,
  attempt_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast IP lookups within time window
CREATE INDEX idx_signup_rate_limits_ip_time
ON public.signup_rate_limits(ip_address, attempt_timestamp DESC);

-- Cleanup index
CREATE INDEX idx_signup_rate_limits_timestamp
ON public.signup_rate_limits(attempt_timestamp);

-- 4. RLS Policies

-- blocked_email_domains: public read, admin write
ALTER TABLE public.blocked_email_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view blocked domains"
  ON public.blocked_email_domains FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert blocked domains"
  ON public.blocked_email_domains FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can update blocked domains"
  ON public.blocked_email_domains FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can delete blocked domains"
  ON public.blocked_email_domains FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- signup_audit_log: admin only
ALTER TABLE public.signup_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view signup audit"
  ON public.signup_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- signup_rate_limits: no public access (API uses service role)
ALTER TABLE public.signup_rate_limits ENABLE ROW LEVEL SECURITY;

-- 5. Functions

-- Check if email domain is blocked
CREATE OR REPLACE FUNCTION public.is_email_domain_blocked(p_email VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  v_domain VARCHAR;
BEGIN
  -- Extract domain from email
  v_domain := LOWER(SPLIT_PART(p_email, '@', 2));

  -- Check if domain is in blocklist
  RETURN EXISTS (
    SELECT 1 FROM public.blocked_email_domains
    WHERE domain = v_domain
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check signup rate limit for IP (max 3 per 24 hours)
-- Returns: { allowed: boolean, attempts: int, limit: int, reset_at: timestamp }
CREATE OR REPLACE FUNCTION public.check_signup_rate_limit(
  p_ip_address INET
)
RETURNS JSON AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_attempt_count INT;
  v_limit INT := 3;  -- Max 3 signups per IP per 24 hours
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

-- Log signup attempt
CREATE OR REPLACE FUNCTION public.log_signup_attempt(
  p_email VARCHAR,
  p_ip_address INET,
  p_user_agent TEXT,
  p_status VARCHAR,
  p_block_reason TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_domain VARCHAR;
BEGIN
  v_domain := LOWER(SPLIT_PART(p_email, '@', 2));

  INSERT INTO public.signup_audit_log (
    email, email_domain, ip_address, user_agent, status, block_reason, user_id
  )
  VALUES (
    LOWER(p_email), v_domain, p_ip_address, p_user_agent, p_status, p_block_reason, p_user_id
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup old rate limit entries (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_signup_rate_limits()
RETURNS INT AS $$
DECLARE
  v_deleted INT;
BEGIN
  DELETE FROM public.signup_rate_limits
  WHERE attempt_timestamp < NOW() - INTERVAL '48 hours';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get signup stats for admin dashboard
CREATE OR REPLACE FUNCTION public.get_signup_stats()
RETURNS JSON AS $$
BEGIN
  RETURN json_build_object(
    'total_signups', (SELECT COUNT(*) FROM public.signup_audit_log WHERE status = 'success'),
    'blocked_emails', (SELECT COUNT(*) FROM public.signup_audit_log WHERE status = 'blocked_email'),
    'blocked_ips', (SELECT COUNT(*) FROM public.signup_audit_log WHERE status = 'blocked_ip'),
    'signups_today', (SELECT COUNT(*) FROM public.signup_audit_log WHERE status = 'success' AND created_at >= CURRENT_DATE),
    'blocked_today', (SELECT COUNT(*) FROM public.signup_audit_log WHERE status != 'success' AND created_at >= CURRENT_DATE),
    'top_blocked_domains', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT email_domain, COUNT(*) as count
        FROM public.signup_audit_log
        WHERE status = 'blocked_email'
        GROUP BY email_domain
        ORDER BY count DESC
        LIMIT 10
      ) t
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

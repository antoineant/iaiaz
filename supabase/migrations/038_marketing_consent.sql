-- Migration: Marketing Consent
-- Adds GDPR-compliant marketing consent tracking to profiles

-- ============================================
-- 1. Add marketing consent fields to profiles
-- ============================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS marketing_consent_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN profiles.marketing_consent IS
  'Whether user has opted in to receive marketing emails. Default false per GDPR.';

COMMENT ON COLUMN profiles.marketing_consent_at IS
  'Timestamp when user gave or withdrew marketing consent. NULL if never set.';

-- ============================================
-- 2. Add index for marketing queries
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_marketing_consent
ON profiles(marketing_consent) WHERE marketing_consent = TRUE;

-- ============================================
-- 3. Function to update consent with timestamp
-- ============================================

CREATE OR REPLACE FUNCTION update_marketing_consent()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update timestamp if consent value actually changed
  IF OLD.marketing_consent IS DISTINCT FROM NEW.marketing_consent THEN
    NEW.marketing_consent_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_marketing_consent ON profiles;
CREATE TRIGGER trigger_update_marketing_consent
  BEFORE UPDATE OF marketing_consent ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_marketing_consent();

-- ============================================
-- 4. Update handle_new_user to support marketing_consent
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_account_type text;
  v_display_name text;
  v_free_credits numeric;
  v_marketing_consent boolean;
BEGIN
  -- Get account type from user metadata (set during signup)
  v_account_type := COALESCE(
    NEW.raw_user_meta_data->>'account_type',
    'student'
  );

  -- Validate account type (includes 'school')
  IF v_account_type NOT IN ('student', 'trainer', 'school', 'admin') THEN
    v_account_type := 'student';
  END IF;

  -- Don't allow self-signup as admin
  IF v_account_type = 'admin' THEN
    v_account_type := 'student';
  END IF;

  -- Get display name from metadata
  v_display_name := NEW.raw_user_meta_data->>'display_name';

  -- Get marketing consent from metadata (default false per GDPR)
  v_marketing_consent := COALESCE(
    (NEW.raw_user_meta_data->>'marketing_consent')::boolean,
    FALSE
  );

  -- Get free credits from app_settings (default 1.00)
  SELECT COALESCE((value->>'amount')::numeric, 1.00) INTO v_free_credits
  FROM public.app_settings WHERE key = 'free_credits';

  IF v_free_credits IS NULL THEN
    v_free_credits := 1.00;
  END IF;

  INSERT INTO public.profiles (
    id,
    email,
    credits_balance,
    terms_accepted_at,
    account_type,
    display_name,
    marketing_consent,
    marketing_consent_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_free_credits,
    NULL,
    v_account_type,
    v_display_name,
    v_marketing_consent,
    CASE WHEN v_marketing_consent THEN NOW() ELSE NULL END
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delay free credits until email is confirmed
-- This prevents abuse where attackers create fake accounts to farm free credits

-- ============================================================================
-- 1. UPDATE handle_new_user TO SET credits_balance = 0
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_account_type text;
  v_display_name text;
BEGIN
  -- Get account type from user metadata (set during signup)
  v_account_type := COALESCE(
    NEW.raw_user_meta_data->>'account_type',
    'student'
  );

  -- Validate account type
  IF v_account_type NOT IN ('student', 'trainer', 'school', 'business', 'admin') THEN
    v_account_type := 'student';
  END IF;

  -- Don't allow self-signup as admin
  IF v_account_type = 'admin' THEN
    v_account_type := 'student';
  END IF;

  -- Get display name from metadata
  v_display_name := NEW.raw_user_meta_data->>'display_name';

  -- Create profile with 0 credits - credits granted after email confirmation
  INSERT INTO public.profiles (
    id,
    email,
    credits_balance,
    terms_accepted_at,
    account_type,
    display_name
  )
  VALUES (
    NEW.id,
    NEW.email,
    0,  -- No credits until email confirmed
    NULL,
    v_account_type,
    v_display_name
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ============================================================================
-- 2. CREATE FUNCTION TO GRANT CREDITS ON EMAIL CONFIRMATION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.grant_credits_on_email_confirm()
RETURNS TRIGGER AS $$
DECLARE
  v_free_credits numeric;
  v_profile_exists boolean;
BEGIN
  -- Only trigger when email_confirmed_at changes from NULL to a value
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN

    -- Check if profile exists
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) INTO v_profile_exists;

    IF v_profile_exists THEN
      -- Get free credits from app_settings (default 1.00)
      SELECT COALESCE((value->>'amount')::numeric, 1.00) INTO v_free_credits
      FROM public.app_settings WHERE key = 'free_credits';

      IF v_free_credits IS NULL THEN
        v_free_credits := 1.00;
      END IF;

      -- Grant free credits to the user
      UPDATE public.profiles
      SET credits_balance = credits_balance + v_free_credits
      WHERE id = NEW.id
        AND credits_balance = 0;  -- Only grant if they haven't received credits yet

      -- Log the credit grant
      IF FOUND THEN
        INSERT INTO public.credit_transactions (
          user_id,
          amount,
          type,
          description
        ) VALUES (
          NEW.id,
          v_free_credits,
          'bonus',
          'Free credits - email confirmed'
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ============================================================================
-- 3. CREATE TRIGGER ON auth.users FOR EMAIL CONFIRMATION
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_grant_credits_on_email_confirm ON auth.users;

CREATE TRIGGER trigger_grant_credits_on_email_confirm
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_credits_on_email_confirm();

-- ============================================================================
-- 4. CLEAN UP: Remove credits from unconfirmed accounts
-- ============================================================================

-- Set credits to 0 for all users who never confirmed their email
UPDATE public.profiles p
SET credits_balance = 0
FROM auth.users u
WHERE p.id = u.id
  AND u.email_confirmed_at IS NULL
  AND p.credits_balance > 0;

-- ============================================================================
-- 5. OPTIONAL: Delete suspicious unconfirmed accounts older than 7 days
-- ============================================================================

-- This is commented out for safety - uncomment to run manually if desired
/*
DELETE FROM auth.users
WHERE email_confirmed_at IS NULL
  AND created_at < NOW() - INTERVAL '7 days';
*/

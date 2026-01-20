-- Fix app_settings reference in handle_new_user function
-- The table needs to be referenced with the public schema prefix

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_account_type text;
  v_display_name text;
  v_free_credits numeric;
BEGIN
  -- Get account type from user metadata (set during signup)
  v_account_type := COALESCE(
    NEW.raw_user_meta_data->>'account_type',
    'student'
  );

  -- Validate account type (now includes 'school')
  IF v_account_type NOT IN ('student', 'trainer', 'school', 'admin') THEN
    v_account_type := 'student';
  END IF;

  -- Don't allow self-signup as admin
  IF v_account_type = 'admin' THEN
    v_account_type := 'student';
  END IF;

  -- Get display name from metadata
  v_display_name := NEW.raw_user_meta_data->>'display_name';

  -- Get free credits from app_settings (default 1.00)
  -- Use public schema explicitly
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
    display_name
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_free_credits,
    NULL,
    v_account_type,
    v_display_name
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

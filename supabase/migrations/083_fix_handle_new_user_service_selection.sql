-- Update handle_new_user to explicitly set needs_service_selection = true
-- Without this, the column relies on DEFAULT which may produce NULL in some contexts

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
    display_name,
    needs_service_selection
  )
  VALUES (
    NEW.id,
    NEW.email,
    0,  -- No credits until email confirmed
    NULL,
    v_account_type,
    v_display_name,
    true  -- New users must choose their service
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Also fix any existing profiles that have NULL instead of a proper value
UPDATE profiles SET needs_service_selection = true
WHERE needs_service_selection IS NULL;

-- Simplify Account Types
-- Changes 'personal' to 'student' for clearer naming
-- Permissions are now based solely on account_type

-- ============================================================================
-- RENAME 'personal' TO 'student'
-- ============================================================================

-- Update existing profiles
UPDATE profiles SET account_type = 'student' WHERE account_type = 'personal';

-- Update the constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_account_type_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_account_type_check
  CHECK (account_type IN ('student', 'trainer', 'admin'));

-- ============================================================================
-- UPDATE HANDLE_NEW_USER FUNCTION
-- ============================================================================

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
    'student'  -- Default is now 'student'
  );

  -- Validate account type
  IF v_account_type NOT IN ('student', 'trainer', 'admin') THEN
    v_account_type := 'student';
  END IF;

  -- Don't allow self-signup as admin
  IF v_account_type = 'admin' THEN
    v_account_type := 'student';
  END IF;

  -- Get display name from metadata
  v_display_name := NEW.raw_user_meta_data->>'display_name';

  -- Get free credits from app_settings (default 1.00)
  SELECT COALESCE((value->>'amount')::numeric, 1.00) INTO v_free_credits
  FROM app_settings WHERE key = 'free_credits';

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

-- ============================================================================
-- UPDATE AUTO-CREATE TRAINER ORG FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_create_trainer_organization()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id uuid;
  v_org_name text;
  v_slug text;
BEGIN
  -- Only create org for trainers who don't already have one
  IF NEW.account_type = 'trainer' THEN
    IF NOT EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = NEW.id AND status = 'active'
    ) THEN
      v_org_name := COALESCE(
        NEW.display_name || '''s Classes',
        split_part(NEW.email, '@', 1) || '''s Classes'
      );

      v_slug := 'trainer-' || substring(NEW.id::text, 1, 8) || '-' || floor(random() * 1000)::text;

      INSERT INTO organizations (name, slug, contact_email, type, status, credit_balance)
      VALUES (v_org_name, v_slug, NEW.email, 'training_center', 'active', 5.00)
      RETURNING id INTO v_org_id;

      -- Trainer is always 'owner' of their auto-created org
      INSERT INTO organization_members (organization_id, user_id, role, status, credit_allocated)
      VALUES (v_org_id, NEW.id, 'owner', 'active', 5.00);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SIMPLIFIED PERMISSION FUNCTIONS
-- ============================================================================

-- Check if user is a trainer or admin (can create/manage classes)
CREATE OR REPLACE FUNCTION is_trainer_or_admin(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user_id
    AND account_type IN ('trainer', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is a platform admin
CREATE OR REPLACE FUNCTION is_platform_admin(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user_id
    AND account_type = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the existing functions
CREATE OR REPLACE FUNCTION can_create_organization(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user_id
    AND account_type IN ('trainer', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_access_trainer_features(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user_id
    AND account_type IN ('trainer', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

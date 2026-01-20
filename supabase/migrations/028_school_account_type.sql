-- Add School Account Type
-- Schools are institutional organizations that can invite trainers (teachers)
-- This creates the hierarchy: School -> Trainer -> Student

-- ============================================================================
-- ADD 'school' TO ACCOUNT_TYPE CONSTRAINT
-- ============================================================================

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_account_type_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_account_type_check
  CHECK (account_type IN ('student', 'trainer', 'school', 'admin'));

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
-- AUTO-CREATE SCHOOL ORGANIZATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_create_school_organization()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id uuid;
  v_org_name text;
  v_slug text;
  v_initial_credits numeric := 50.00; -- Schools get more initial credits
BEGIN
  -- Only create org for schools who don't already have one
  IF NEW.account_type = 'school' THEN
    IF NOT EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = NEW.id AND status = 'active'
    ) THEN
      -- Use display_name or generate from email
      v_org_name := COALESCE(
        NEW.display_name,
        'Organisation de ' || split_part(NEW.email, '@', 1)
      );

      -- Generate unique slug
      v_slug := 'school-' || substring(NEW.id::text, 1, 8) || '-' || floor(random() * 1000)::text;

      -- Create organization with type 'school'
      INSERT INTO organizations (
        name,
        slug,
        contact_email,
        type,
        status,
        credit_balance,
        settings
      )
      VALUES (
        v_org_name,
        v_slug,
        NEW.email,
        'school',
        'active',
        v_initial_credits,
        jsonb_build_object(
          'default_credit_per_student', 5.00,
          'conversation_visibility', 'stats_only'
        )
      )
      RETURNING id INTO v_org_id;

      -- School admin is 'owner' of their organization
      INSERT INTO organization_members (organization_id, user_id, role, status, credit_allocated)
      VALUES (v_org_id, NEW.id, 'owner', 'active', v_initial_credits);

      -- Log the initial credit allocation
      INSERT INTO organization_transactions (
        organization_id,
        user_id,
        type,
        amount,
        description
      ) VALUES (
        v_org_id,
        NEW.id,
        'credit_added',
        v_initial_credits,
        'Initial school organization credits'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CREATE TRIGGER FOR SCHOOL ORG CREATION
-- ============================================================================

-- Drop if exists (to allow re-running migration)
DROP TRIGGER IF EXISTS trigger_auto_create_school_org ON profiles;

CREATE TRIGGER trigger_auto_create_school_org
  AFTER INSERT OR UPDATE OF account_type ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_school_organization();

-- ============================================================================
-- UPDATE PERMISSION FUNCTIONS TO INCLUDE 'school'
-- ============================================================================

-- Schools can create organizations (they already have one auto-created, but keep consistent)
CREATE OR REPLACE FUNCTION can_create_organization(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user_id
    AND account_type IN ('trainer', 'school', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schools can access trainer features (class management, etc.)
CREATE OR REPLACE FUNCTION can_access_trainer_features(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user_id
    AND account_type IN ('trainer', 'school', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update is_trainer_or_admin to include school
CREATE OR REPLACE FUNCTION is_trainer_or_admin(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user_id
    AND account_type IN ('trainer', 'school', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ADD needs_setup COLUMN TO ORGANIZATIONS
-- ============================================================================

-- Schools need to complete setup after signup
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS needs_setup boolean DEFAULT false;

-- Mark auto-created school orgs as needing setup
CREATE OR REPLACE FUNCTION mark_school_needs_setup()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is a school-type org being created, mark it as needing setup
  IF NEW.type = 'school' THEN
    NEW.needs_setup := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_mark_school_needs_setup ON organizations;

CREATE TRIGGER trigger_mark_school_needs_setup
  BEFORE INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION mark_school_needs_setup();

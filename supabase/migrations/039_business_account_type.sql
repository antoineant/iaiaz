-- Add Business Account Type
-- Businesses are companies that want to provide AI access to their employees
-- Similar to schools but with different defaults and terminology

-- ============================================================================
-- ADD 'business' TO ORGANIZATION TYPE CONSTRAINT
-- ============================================================================

ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_type_check;
ALTER TABLE organizations ADD CONSTRAINT organizations_type_check
  CHECK (type IN ('school', 'university', 'business_school', 'training_center', 'business', 'other'));

-- ============================================================================
-- ADD 'business' TO ACCOUNT_TYPE CONSTRAINT
-- ============================================================================

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_account_type_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_account_type_check
  CHECK (account_type IN ('student', 'trainer', 'school', 'business', 'admin'));

-- ============================================================================
-- ADD BUSINESS-SPECIFIC FIELDS TO ORGANIZATIONS (optional fields)
-- ============================================================================

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS company_size text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS industry text;

-- ============================================================================
-- UPDATE HANDLE_NEW_USER FUNCTION TO INCLUDE 'business'
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

  -- Validate account type (now includes 'business')
  IF v_account_type NOT IN ('student', 'trainer', 'school', 'business', 'admin') THEN
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

-- ============================================================================
-- AUTO-CREATE BUSINESS ORGANIZATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_create_business_organization()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id uuid;
  v_org_name text;
  v_slug text;
  v_initial_credits numeric := 10.00; -- Businesses get trial credits
BEGIN
  -- Only create org for business accounts who don't already have one
  IF NEW.account_type = 'business' THEN
    IF NOT EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = NEW.id AND status = 'active'
    ) THEN
      -- Use display_name or generate from email
      v_org_name := COALESCE(
        NEW.display_name,
        'Entreprise ' || split_part(NEW.email, '@', 2)
      );

      -- Generate unique slug
      v_slug := 'biz-' || substring(NEW.id::text, 1, 8) || '-' || floor(random() * 1000)::text;

      -- Create organization with type 'business'
      INSERT INTO organizations (
        name,
        slug,
        contact_email,
        type,
        status,
        credit_balance,
        needs_setup,
        settings
      )
      VALUES (
        v_org_name,
        v_slug,
        NEW.email,
        'business',
        'active',
        v_initial_credits,
        true,
        jsonb_build_object(
          'default_credit_per_student', 2.00,
          'max_credit_per_student', 50.00,
          'conversation_visibility', 'stats_only',
          'alert_threshold_percent', 80
        )
      )
      RETURNING id INTO v_org_id;

      -- Business admin is 'owner' of their organization
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
        'purchase',
        v_initial_credits,
        'Initial business trial credits'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CREATE TRIGGER FOR BUSINESS ORG CREATION
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_auto_create_business_org ON profiles;

CREATE TRIGGER trigger_auto_create_business_org
  AFTER INSERT OR UPDATE OF account_type ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_business_organization();

-- ============================================================================
-- UPDATE PERMISSION FUNCTIONS TO INCLUDE 'business'
-- ============================================================================

-- Businesses can create organizations
CREATE OR REPLACE FUNCTION can_create_organization(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user_id
    AND account_type IN ('trainer', 'school', 'business', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Businesses can access trainer features (member management, analytics, etc.)
CREATE OR REPLACE FUNCTION can_access_trainer_features(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user_id
    AND account_type IN ('trainer', 'school', 'business', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update is_trainer_or_admin to include business
CREATE OR REPLACE FUNCTION is_trainer_or_admin(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user_id
    AND account_type IN ('trainer', 'school', 'business', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UPDATE mark_school_needs_setup TO ALSO HANDLE BUSINESS
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_school_needs_setup()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is a school or business type org being created, mark it as needing setup
  IF NEW.type IN ('school', 'business') THEN
    NEW.needs_setup := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

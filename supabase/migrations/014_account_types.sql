-- Account Types Migration
-- Adds account_type to profiles to distinguish between user types globally
--
-- Account types:
-- - personal: Regular user with personal credits (default)
-- - trainer: Can create organizations and classes
-- - admin: Platform admin with full access

-- ============================================================================
-- ADD ACCOUNT TYPE TO PROFILES
-- ============================================================================

ALTER TABLE profiles
ADD COLUMN account_type text NOT NULL DEFAULT 'personal'
CHECK (account_type IN ('personal', 'trainer', 'admin'));

-- Add display_name and avatar_url if not exists (for better profile management)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS display_name text;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Index for account type queries
CREATE INDEX idx_profiles_account_type ON profiles(account_type);

-- ============================================================================
-- UPDATE HANDLE_NEW_USER FUNCTION
-- ============================================================================

-- Update the trigger function to accept account_type from metadata
-- IMPORTANT: This preserves existing functionality (terms_accepted_at, free_credits)
-- and adds new fields (account_type, display_name)
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
    'personal'
  );

  -- Validate account type
  IF v_account_type NOT IN ('personal', 'trainer', 'admin') THEN
    v_account_type := 'personal';
  END IF;

  -- Don't allow self-signup as admin
  IF v_account_type = 'admin' THEN
    v_account_type := 'personal';
  END IF;

  -- Get display name from metadata
  v_display_name := NEW.raw_user_meta_data->>'display_name';

  -- Get free credits from app_settings (default 1.00)
  SELECT COALESCE((value->>'amount')::numeric, 1.00) INTO v_free_credits
  FROM app_settings WHERE key = 'free_credits';

  IF v_free_credits IS NULL THEN
    v_free_credits := 1.00;
  END IF;

  -- Insert profile with all fields including terms_accepted_at (NULL until accepted)
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
    NULL,  -- terms_accepted_at: NULL until they explicitly accept
    v_account_type,
    v_display_name
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ADMIN FUNCTIONS
-- ============================================================================

-- Function for admins to update user account type
CREATE OR REPLACE FUNCTION admin_update_account_type(
  p_user_id uuid,
  p_account_type text
)
RETURNS jsonb AS $$
DECLARE
  v_caller_type text;
BEGIN
  -- Check if caller is admin
  SELECT account_type INTO v_caller_type
  FROM profiles
  WHERE id = auth.uid();

  IF v_caller_type != 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  -- Validate account type
  IF p_account_type NOT IN ('personal', 'trainer', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_account_type');
  END IF;

  -- Update user
  UPDATE profiles
  SET account_type = p_account_type,
      updated_at = now()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'user_not_found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can create organizations
CREATE OR REPLACE FUNCTION can_create_organization(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_account_type text;
BEGIN
  SELECT account_type INTO v_account_type
  FROM profiles
  WHERE id = p_user_id;

  -- Only trainers and admins can create organizations
  RETURN v_account_type IN ('trainer', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user profile with account type (for API routes)
CREATE OR REPLACE FUNCTION get_user_profile(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_profile profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_profile
  FROM profiles
  WHERE id = p_user_id;

  IF v_profile IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id', v_profile.id,
    'email', v_profile.email,
    'display_name', v_profile.display_name,
    'avatar_url', v_profile.avatar_url,
    'account_type', v_profile.account_type,
    'credits_balance', v_profile.credits_balance,
    'created_at', v_profile.created_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER VIEW FOR ADMIN
-- ============================================================================

CREATE OR REPLACE VIEW admin_users_view AS
SELECT
  p.id,
  p.email,
  p.display_name,
  p.account_type,
  p.credits_balance,
  p.created_at,
  p.updated_at,
  (
    SELECT jsonb_agg(jsonb_build_object(
      'organization_id', om.organization_id,
      'organization_name', o.name,
      'role', om.role,
      'class_id', om.class_id
    ))
    FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = p.id AND om.status = 'active'
  ) as organizations
FROM profiles p;

-- Grant access to admin view (RLS will still apply via function)
-- Admins check handled in API layer

-- ============================================================================
-- AUTO-CREATE ORGANIZATION FOR TRAINERS
-- ============================================================================

-- Function to auto-create a personal organization for trainers
CREATE OR REPLACE FUNCTION auto_create_trainer_organization()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id uuid;
  v_org_name text;
  v_slug text;
BEGIN
  -- Only create org for trainers who don't already have one
  IF NEW.account_type = 'trainer' THEN
    -- Check if user already has an organization
    IF NOT EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = NEW.id AND status = 'active'
    ) THEN
      -- Create organization name from display_name or email
      v_org_name := COALESCE(
        NEW.display_name || '''s Classes',
        split_part(NEW.email, '@', 1) || '''s Classes'
      );

      -- Generate unique slug from user id
      v_slug := 'trainer-' || substring(NEW.id::text, 1, 8) || '-' || floor(random() * 1000)::text;

      -- Create the organization with default credits
      INSERT INTO organizations (name, slug, contact_email, type, status, credit_balance)
      VALUES (v_org_name, v_slug, NEW.email, 'training_center', 'active', 5.00)
      RETURNING id INTO v_org_id;

      -- Add the trainer as owner of the organization
      INSERT INTO organization_members (
        organization_id,
        user_id,
        role,
        status,
        credit_allocated
      )
      VALUES (v_org_id, NEW.id, 'owner', 'active', 5.00);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create organization when a trainer profile is created/updated
DROP TRIGGER IF EXISTS trigger_auto_create_trainer_org ON profiles;
CREATE TRIGGER trigger_auto_create_trainer_org
  AFTER INSERT OR UPDATE OF account_type ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_trainer_organization();

-- ============================================================================
-- HELPER FUNCTION TO CHECK IF USER CAN ACCESS TRAINER FEATURES
-- ============================================================================

CREATE OR REPLACE FUNCTION can_access_trainer_features(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_account_type text;
BEGIN
  SELECT account_type INTO v_account_type
  FROM profiles
  WHERE id = p_user_id;

  -- Trainers and admins can access trainer features
  RETURN v_account_type IN ('trainer', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

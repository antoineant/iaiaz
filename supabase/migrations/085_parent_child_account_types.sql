-- Add 'parent' and 'child' account types with direct parent-child linking
-- Children are created by parents (no signup flow needed)

-- ============================================================================
-- 1. ADD parent_user_id COLUMN TO PROFILES
-- ============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS parent_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_parent_user_id ON profiles(parent_user_id);

-- ============================================================================
-- 2. UPDATE account_type CONSTRAINT
-- ============================================================================

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_account_type_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_account_type_check
  CHECK (account_type IN ('student', 'trainer', 'school', 'business', 'parent', 'child', 'admin'));

-- ============================================================================
-- 3. UPDATE handle_new_user TO ACCEPT NEW TYPES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_account_type text;
  v_display_name text;
  v_parent_user_id uuid;
BEGIN
  v_account_type := COALESCE(
    NEW.raw_user_meta_data->>'account_type',
    'student'
  );

  IF v_account_type NOT IN ('student', 'trainer', 'school', 'business', 'parent', 'child', 'admin') THEN
    v_account_type := 'student';
  END IF;

  -- Don't allow self-signup as admin
  IF v_account_type = 'admin' THEN
    v_account_type := 'student';
  END IF;

  v_display_name := NEW.raw_user_meta_data->>'display_name';
  v_parent_user_id := (NEW.raw_user_meta_data->>'parent_user_id')::uuid;

  INSERT INTO public.profiles (
    id,
    email,
    credits_balance,
    terms_accepted_at,
    account_type,
    display_name,
    needs_service_selection,
    parent_user_id
  )
  VALUES (
    NEW.id,
    NEW.email,
    0,  -- No credits until email confirmed (children get credits from family pool)
    CASE WHEN v_account_type = 'child' THEN NOW() ELSE NULL END,  -- Children inherit parent's terms acceptance
    v_account_type,
    v_display_name,
    CASE WHEN v_account_type = 'child' THEN false ELSE true END,  -- Children skip service selection
    v_parent_user_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ============================================================================
-- 4. SKIP EMAIL CREDIT GRANT FOR CHILD ACCOUNTS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.grant_credits_on_email_confirm()
RETURNS TRIGGER AS $$
DECLARE
  v_free_credits numeric;
  v_profile_exists boolean;
  v_account_type text;
BEGIN
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN

    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) INTO v_profile_exists;

    IF v_profile_exists THEN
      -- Check account type - children don't get individual free credits
      SELECT p.account_type INTO v_account_type FROM public.profiles p WHERE p.id = NEW.id;

      IF v_account_type = 'child' THEN
        RETURN NEW;  -- Skip credit grant for children
      END IF;

      SELECT COALESCE((value->>'amount')::numeric, 1.00) INTO v_free_credits
      FROM public.app_settings WHERE key = 'free_credits';

      IF v_free_credits IS NULL THEN
        v_free_credits := 1.00;
      END IF;

      UPDATE public.profiles
      SET credits_balance = credits_balance + v_free_credits
      WHERE id = NEW.id
        AND credits_balance = 0;

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
-- 5. BACKFILL: Set existing family org owners to account_type = 'parent'
-- ============================================================================

UPDATE profiles p
SET account_type = 'parent'
FROM organization_members om
JOIN organizations o ON o.id = om.organization_id
WHERE p.id = om.user_id
  AND o.type = 'family'
  AND om.role = 'owner'
  AND om.status = 'active'
  AND p.account_type = 'student';

-- ============================================================================
-- 6. HELPER: Check if user is a child account
-- ============================================================================

CREATE OR REPLACE FUNCTION is_child_account(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user_id
    AND account_type = 'child'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ============================================================================
-- 7. RLS: Allow parents to read their children's profiles
-- ============================================================================

DROP POLICY IF EXISTS "Parents can view children profiles" ON profiles;
CREATE POLICY "Parents can view children profiles" ON profiles
  FOR SELECT
  USING (parent_user_id = auth.uid());

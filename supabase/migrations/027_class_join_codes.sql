-- Add short join codes for classes (alternative to QR code)
-- Students can enter 6-8 character codes instead of scanning QR

-- ============================================================================
-- ADD JOIN_CODE COLUMN
-- ============================================================================

ALTER TABLE organization_classes
ADD COLUMN join_code text UNIQUE;

-- Index for quick lookups
CREATE INDEX idx_org_classes_join_code ON organization_classes(join_code);

-- ============================================================================
-- HELPER FUNCTION: Generate unique short code
-- ============================================================================

-- Character set excludes confusing characters: 0/O, 1/I/L
-- Uses: ABCDEFGHJKMNPQRSTUVWXYZ23456789 (24 letters + 8 digits = 32 chars)
CREATE OR REPLACE FUNCTION generate_join_code(p_length int DEFAULT 6)
RETURNS text AS $$
DECLARE
  v_chars text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_code text := '';
  v_i int;
  v_attempts int := 0;
  v_max_attempts int := 10;
BEGIN
  LOOP
    -- Generate random code
    v_code := '';
    FOR v_i IN 1..p_length LOOP
      v_code := v_code || substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1);
    END LOOP;

    -- Check if unique
    IF NOT EXISTS (SELECT 1 FROM organization_classes WHERE join_code = v_code) THEN
      RETURN v_code;
    END IF;

    v_attempts := v_attempts + 1;
    IF v_attempts >= v_max_attempts THEN
      -- Try longer code if collisions persist
      p_length := p_length + 1;
      v_attempts := 0;
    END IF;

    -- Safety limit
    IF p_length > 12 THEN
      RAISE EXCEPTION 'Unable to generate unique join code';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Auto-generate join_code on class creation
-- ============================================================================

CREATE OR REPLACE FUNCTION set_class_join_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.join_code IS NULL THEN
    NEW.join_code := generate_join_code(6);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_class_join_code
  BEFORE INSERT ON organization_classes
  FOR EACH ROW
  EXECUTE FUNCTION set_class_join_code();

-- ============================================================================
-- BACKFILL: Generate codes for existing classes
-- ============================================================================

DO $$
DECLARE
  v_class RECORD;
BEGIN
  FOR v_class IN SELECT id FROM organization_classes WHERE join_code IS NULL LOOP
    UPDATE organization_classes
    SET join_code = generate_join_code(6)
    WHERE id = v_class.id;
  END LOOP;
END $$;

-- Make join_code NOT NULL after backfill
ALTER TABLE organization_classes
ALTER COLUMN join_code SET NOT NULL;

-- ============================================================================
-- UPDATE FUNCTION: get_class_by_token (accept token OR code)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_class_by_token(p_token text)
RETURNS jsonb AS $$
DECLARE
  v_class organization_classes%ROWTYPE;
  v_org organizations%ROWTYPE;
  v_is_accessible boolean;
  v_is_short_code boolean;
BEGIN
  -- Detect if this is a short code (<=8 chars) or full token (32 chars)
  v_is_short_code := length(p_token) <= 8;

  -- Find class by token or code
  IF v_is_short_code THEN
    SELECT * INTO v_class
    FROM organization_classes
    WHERE join_code = upper(p_token);
  ELSE
    SELECT * INTO v_class
    FROM organization_classes
    WHERE join_token = p_token;
  END IF;

  IF v_class IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'class_not_found');
  END IF;

  -- Get organization info
  SELECT * INTO v_org
  FROM organizations
  WHERE id = v_class.organization_id;

  -- Check if class is accessible
  v_is_accessible := (
    v_class.status = 'active'
    AND v_class.closed_at IS NULL
    AND (v_class.starts_at IS NULL OR v_class.starts_at <= now())
    AND (v_class.ends_at IS NULL OR v_class.ends_at > now())
    AND v_org.status = 'active'
  );

  RETURN jsonb_build_object(
    'success', true,
    'class', jsonb_build_object(
      'id', v_class.id,
      'name', v_class.name,
      'description', v_class.description,
      'status', v_class.status,
      'starts_at', v_class.starts_at,
      'ends_at', v_class.ends_at,
      'closed_at', v_class.closed_at,
      'join_code', v_class.join_code
    ),
    'organization', jsonb_build_object(
      'id', v_org.id,
      'name', v_org.name
    ),
    'is_accessible', v_is_accessible,
    'access_message', CASE
      WHEN v_class.status != 'active' THEN 'class_not_active'
      WHEN v_class.closed_at IS NOT NULL THEN 'session_closed'
      WHEN v_class.starts_at IS NOT NULL AND v_class.starts_at > now() THEN 'session_not_started'
      WHEN v_class.ends_at IS NOT NULL AND v_class.ends_at <= now() THEN 'session_expired'
      WHEN v_org.status != 'active' THEN 'organization_not_active'
      ELSE NULL
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UPDATE FUNCTION: join_class (accept token OR code)
-- ============================================================================

CREATE OR REPLACE FUNCTION join_class(
  p_token text,
  p_user_id uuid,
  p_display_name text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_class organization_classes%ROWTYPE;
  v_org organizations%ROWTYPE;
  v_existing_member organization_members%ROWTYPE;
  v_member_id uuid;
  v_credit_amount numeric;
  v_is_short_code boolean;
BEGIN
  -- Detect if this is a short code (<=8 chars) or full token (32 chars)
  v_is_short_code := length(p_token) <= 8;

  -- Find and validate class
  IF v_is_short_code THEN
    SELECT * INTO v_class
    FROM organization_classes
    WHERE join_code = upper(p_token)
      AND status = 'active'
      AND closed_at IS NULL
      AND (starts_at IS NULL OR starts_at <= now())
      AND (ends_at IS NULL OR ends_at > now())
    FOR UPDATE;
  ELSE
    SELECT * INTO v_class
    FROM organization_classes
    WHERE join_token = p_token
      AND status = 'active'
      AND closed_at IS NULL
      AND (starts_at IS NULL OR starts_at <= now())
      AND (ends_at IS NULL OR ends_at > now())
    FOR UPDATE;
  END IF;

  IF v_class IS NULL THEN
    -- Check why it failed - find class first
    IF v_is_short_code THEN
      SELECT * INTO v_class FROM organization_classes WHERE join_code = upper(p_token);
    ELSE
      SELECT * INTO v_class FROM organization_classes WHERE join_token = p_token;
    END IF;

    IF v_class IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'class_not_found');
    ELSIF v_class.status != 'active' THEN
      RETURN jsonb_build_object('success', false, 'error', 'class_not_active');
    ELSIF v_class.closed_at IS NOT NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'session_closed');
    ELSIF v_class.starts_at IS NOT NULL AND v_class.starts_at > now() THEN
      RETURN jsonb_build_object('success', false, 'error', 'session_not_started', 'starts_at', v_class.starts_at);
    ELSIF v_class.ends_at IS NOT NULL AND v_class.ends_at <= now() THEN
      RETURN jsonb_build_object('success', false, 'error', 'session_expired', 'ended_at', v_class.ends_at);
    END IF;
  END IF;

  -- Get organization
  SELECT * INTO v_org
  FROM organizations
  WHERE id = v_class.organization_id AND status = 'active';

  IF v_org IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'organization_not_active');
  END IF;

  -- Check if user is already a member of this class
  SELECT * INTO v_existing_member
  FROM organization_members
  WHERE organization_id = v_class.organization_id
    AND user_id = p_user_id
    AND class_id = v_class.id;

  IF v_existing_member IS NOT NULL THEN
    -- User already in this class, update status if needed
    IF v_existing_member.status != 'active' THEN
      UPDATE organization_members
      SET status = 'active', updated_at = now()
      WHERE id = v_existing_member.id;
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'member_id', v_existing_member.id,
      'already_member', true,
      'class_id', v_class.id,
      'organization_id', v_class.organization_id
    );
  END IF;

  -- Check if user is already in the org (maybe different class)
  SELECT * INTO v_existing_member
  FROM organization_members
  WHERE organization_id = v_class.organization_id
    AND user_id = p_user_id;

  IF v_existing_member IS NOT NULL THEN
    -- User in org but not this class - update their class
    UPDATE organization_members
    SET class_id = v_class.id,
        status = 'active',
        updated_at = now()
    WHERE id = v_existing_member.id
    RETURNING id INTO v_member_id;

    RETURN jsonb_build_object(
      'success', true,
      'member_id', v_member_id,
      'already_member', false,
      'class_id', v_class.id,
      'organization_id', v_class.organization_id
    );
  END IF;

  -- Determine credit amount to allocate
  v_credit_amount := COALESCE(
    (v_class.settings->>'default_credit_per_student')::numeric,
    (v_org.settings->>'default_credit_per_student')::numeric,
    5.00  -- Fallback default
  );

  -- Check if org has enough credits
  IF v_org.credit_balance - v_org.credit_allocated < v_credit_amount THEN
    -- Not enough org credits - still allow join but with 0 credits
    v_credit_amount := 0;
  END IF;

  -- Create membership
  INSERT INTO organization_members (
    organization_id,
    user_id,
    class_id,
    role,
    display_name,
    credit_allocated
  ) VALUES (
    v_class.organization_id,
    p_user_id,
    v_class.id,
    'student',
    p_display_name,
    v_credit_amount
  )
  RETURNING id INTO v_member_id;

  -- Update org allocated credits
  IF v_credit_amount > 0 THEN
    UPDATE organizations
    SET credit_allocated = credit_allocated + v_credit_amount,
        updated_at = now()
    WHERE id = v_class.organization_id;

    -- Log allocation transaction
    INSERT INTO organization_transactions (
      organization_id, type, amount, member_id, user_id, description
    ) VALUES (
      v_class.organization_id,
      'allocation',
      v_credit_amount,
      v_member_id,
      p_user_id,
      'Initial credit allocation from class join'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'member_id', v_member_id,
    'already_member', false,
    'credit_allocated', v_credit_amount,
    'class_id', v_class.id,
    'organization_id', v_class.organization_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- NEW FUNCTION: Get student's class history
-- ============================================================================

CREATE OR REPLACE FUNCTION get_student_classes(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_classes jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'membership_id', om.id,
      'class_id', oc.id,
      'class_name', oc.name,
      'class_description', oc.description,
      'organization_id', org.id,
      'organization_name', org.name,
      'status', oc.status,
      'is_accessible', (
        oc.status = 'active'
        AND oc.closed_at IS NULL
        AND (oc.starts_at IS NULL OR oc.starts_at <= now())
        AND (oc.ends_at IS NULL OR oc.ends_at > now())
        AND org.status = 'active'
      ),
      'credits_allocated', om.credit_allocated,
      'credits_used', om.credit_used,
      'credits_remaining', om.credit_allocated - om.credit_used,
      'joined_at', om.created_at,
      'class_starts_at', oc.starts_at,
      'class_ends_at', oc.ends_at,
      'class_closed_at', oc.closed_at,
      'member_status', om.status
    ) ORDER BY om.created_at DESC
  )
  INTO v_classes
  FROM organization_members om
  JOIN organization_classes oc ON oc.id = om.class_id
  JOIN organizations org ON org.id = om.organization_id
  WHERE om.user_id = p_user_id
    AND om.role = 'student'
    AND om.class_id IS NOT NULL;

  RETURN COALESCE(v_classes, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

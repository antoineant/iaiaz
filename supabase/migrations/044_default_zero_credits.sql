-- Change default credit allocation to 0
-- Students now join with 0 credits, trainers must explicitly allocate

-- Update the join_class function to default to 0 credits instead of 5
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
BEGIN
  -- Find and validate class
  SELECT * INTO v_class
  FROM organization_classes
  WHERE join_token = p_token
    AND status = 'active'
    AND closed_at IS NULL
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at > now())
  FOR UPDATE;

  IF v_class IS NULL THEN
    -- Check why it failed
    SELECT * INTO v_class FROM organization_classes WHERE join_token = p_token;
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
  -- Default is now 0 - trainers must explicitly allocate credits
  v_credit_amount := COALESCE(
    (v_class.settings->>'default_credit_per_student')::numeric,
    (v_org.settings->>'default_credit_per_student')::numeric,
    0  -- Changed from 5.00 to 0 - two-phase enrollment
  );

  -- Check if org has enough credits (only if allocating > 0)
  IF v_credit_amount > 0 AND v_org.credit_balance - v_org.credit_allocated < v_credit_amount THEN
    -- Not enough org credits - set to 0
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

  -- Update org allocated credits (only if allocating > 0)
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

-- Also update the default in organization settings schema comment for clarity
COMMENT ON COLUMN organizations.settings IS 'Organization settings including default_credit_per_student (default: 0 - trainers allocate manually)';

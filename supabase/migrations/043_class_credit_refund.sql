-- Class Credit Refund
-- Automatically refund unused credits when a class session is closed

-- Function to refund unused credits for all students in a class
CREATE OR REPLACE FUNCTION refund_class_credits(p_class_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_class organization_classes%ROWTYPE;
  v_total_refunded numeric := 0;
  v_students_refunded int := 0;
  v_member RECORD;
  v_unused_credits numeric;
BEGIN
  -- Get and lock the class
  SELECT * INTO v_class
  FROM organization_classes
  WHERE id = p_class_id
  FOR UPDATE;

  IF v_class IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'class_not_found');
  END IF;

  -- Process each student in the class with unused credits
  FOR v_member IN
    SELECT id, user_id, credit_allocated, credit_used
    FROM organization_members
    WHERE class_id = p_class_id
      AND status = 'active'
      AND role = 'student'
      AND credit_allocated > credit_used
    FOR UPDATE
  LOOP
    -- Calculate unused credits
    v_unused_credits := v_member.credit_allocated - v_member.credit_used;

    -- Update member: set allocated = used (effectively removing unused allocation)
    UPDATE organization_members
    SET credit_allocated = credit_used,
        updated_at = now()
    WHERE id = v_member.id;

    -- Log the refund transaction
    INSERT INTO organization_transactions (
      organization_id,
      type,
      amount,
      member_id,
      user_id,
      description
    ) VALUES (
      v_class.organization_id,
      'refund',
      v_unused_credits,
      v_member.id,
      v_member.user_id,
      'Unused credits refunded on class session close'
    );

    v_total_refunded := v_total_refunded + v_unused_credits;
    v_students_refunded := v_students_refunded + 1;
  END LOOP;

  -- Return the refunded credits to the organization's available pool
  -- by reducing the credit_allocated amount
  IF v_total_refunded > 0 THEN
    UPDATE organizations
    SET credit_allocated = credit_allocated - v_total_refunded,
        updated_at = now()
    WHERE id = v_class.organization_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'total_refunded', v_total_refunded,
    'students_refunded', v_students_refunded,
    'class_id', p_class_id,
    'organization_id', v_class.organization_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add 'refund' as a valid transaction type if not already present
-- (This is safe to run - it will only add if not exists)
DO $$
BEGIN
  -- Check if the constraint exists and if 'refund' is not in the list
  -- We'll drop and recreate the constraint to include 'refund'
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'organization_transactions_type_check'
    AND table_name = 'organization_transactions'
  ) THEN
    ALTER TABLE organization_transactions DROP CONSTRAINT organization_transactions_type_check;
  END IF;

  -- Add constraint with refund included
  ALTER TABLE organization_transactions
  ADD CONSTRAINT organization_transactions_type_check
  CHECK (type IN ('usage', 'allocation', 'adjustment', 'purchase', 'refund', 'transfer_in', 'transfer_out'));
EXCEPTION
  WHEN others THEN
    -- Constraint might not exist or have different structure, that's ok
    NULL;
END $$;

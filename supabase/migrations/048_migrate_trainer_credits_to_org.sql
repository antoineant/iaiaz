-- One-time migration: Transfer trainer personal credits to organization pool
-- This handles trainers who have personal credits that should now be part of the org pool

-- 1. Add trainer personal credits to org credit_balance
-- For each trainer (owner/admin/teacher) with personal credits > 0,
-- add their personal balance to the org and zero out their personal balance

DO $$
DECLARE
  v_trainer RECORD;
  v_total_migrated numeric;
BEGIN
  v_total_migrated := 0;

  FOR v_trainer IN
    SELECT
      p.id as user_id,
      p.credits_balance as personal_credits,
      p.email,
      om.organization_id,
      om.role,
      o.name as org_name
    FROM profiles p
    JOIN organization_members om ON om.user_id = p.id
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.role IN ('owner', 'admin', 'teacher')
      AND om.status = 'active'
      AND o.status = 'active'
      AND p.credits_balance > 0
  LOOP
    -- Add personal credits to organization pool
    UPDATE organizations
    SET credit_balance = credit_balance + v_trainer.personal_credits,
        updated_at = now()
    WHERE id = v_trainer.organization_id;

    -- Zero out personal balance
    UPDATE profiles
    SET credits_balance = 0,
        updated_at = now()
    WHERE id = v_trainer.user_id;

    -- Log the transfer as organization transaction
    INSERT INTO organization_transactions (
      organization_id,
      user_id,
      type,
      amount,
      description,
      metadata
    ) VALUES (
      v_trainer.organization_id,
      v_trainer.user_id,
      'adjustment',
      v_trainer.personal_credits,
      'Migration: trainer personal credits to org pool',
      jsonb_build_object(
        'migration', '048_migrate_trainer_credits_to_org',
        'trainer_email', v_trainer.email,
        'trainer_role', v_trainer.role
      )
    );

    v_total_migrated := v_total_migrated + v_trainer.personal_credits;

    RAISE NOTICE 'Migrated %.2f credits from % (%) to org %',
      v_trainer.personal_credits,
      v_trainer.email,
      v_trainer.role,
      v_trainer.org_name;
  END LOOP;

  RAISE NOTICE 'Total credits migrated: %.2f', v_total_migrated;
END $$;

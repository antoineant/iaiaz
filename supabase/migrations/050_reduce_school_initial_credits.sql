-- Reduce school initial credits from 50€ to 10€ (align with businesses)
-- Trainers remain at 5€

-- ============================================================================
-- UPDATE AUTO-CREATE SCHOOL ORGANIZATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_create_school_organization()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id uuid;
  v_org_name text;
  v_slug text;
  v_initial_credits numeric := 10.00; -- Reduced from 50€ to align with businesses
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

-- Fix auto_create_business_organization to handle missing organization_members table
-- Uses explicit schema qualification to avoid issues with search_path

CREATE OR REPLACE FUNCTION public.auto_create_business_organization()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id uuid;
  v_org_name text;
  v_slug text;
  v_initial_credits numeric := 10.00;
  v_has_org boolean;
BEGIN
  -- Only process business accounts
  IF NEW.account_type != 'business' THEN
    RETURN NEW;
  END IF;

  -- Check if user already has an active organization membership
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = NEW.id AND status = 'active'
  ) INTO v_has_org;

  -- Skip if already has org
  IF v_has_org THEN
    RETURN NEW;
  END IF;

  -- Use display_name or generate from email
  v_org_name := COALESCE(
    NEW.display_name,
    'Entreprise ' || split_part(NEW.email, '@', 2)
  );

  -- Generate unique slug
  v_slug := 'biz-' || substring(NEW.id::text, 1, 8) || '-' || floor(random() * 1000)::text;

  -- Create organization with type 'business'
  INSERT INTO public.organizations (
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
  INSERT INTO public.organization_members (organization_id, user_id, role, status, credit_allocated)
  VALUES (v_org_id, NEW.id, 'owner', 'active', v_initial_credits);

  -- Log the initial credit allocation
  INSERT INTO public.organization_transactions (
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

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'auto_create_business_organization failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

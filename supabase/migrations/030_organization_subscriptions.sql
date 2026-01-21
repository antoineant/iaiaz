-- Add subscription fields to organizations
-- Supports account management subscriptions separate from credit purchases

-- ============================================================================
-- ADD SUBSCRIPTION FIELDS TO ORGANIZATIONS
-- ============================================================================

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_plan_id text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'none'
  CHECK (subscription_status IN ('none', 'trialing', 'active', 'past_due', 'canceled', 'unpaid'));
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_stripe_id text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_stripe_customer_id text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_current_period_start timestamptz;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_current_period_end timestamptz;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end boolean DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_canceled_at timestamptz;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_trial_end timestamptz;

-- Index for subscription lookups
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_status ON organizations(subscription_status);
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_stripe_id ON organizations(subscription_stripe_id);

-- ============================================================================
-- ORGANIZATION SUBSCRIPTION HISTORY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS organization_subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Event details
  event_type text NOT NULL CHECK (event_type IN (
    'subscription_created',
    'subscription_updated',
    'subscription_canceled',
    'subscription_reactivated',
    'payment_succeeded',
    'payment_failed',
    'trial_started',
    'trial_ended'
  )),

  -- Stripe event data
  stripe_event_id text,
  stripe_subscription_id text,

  -- Plan changes
  previous_plan_id text,
  new_plan_id text,

  -- Amount for payments
  amount numeric(12,2),
  currency text DEFAULT 'eur',

  -- Additional metadata
  metadata jsonb DEFAULT '{}'::jsonb,

  -- Timestamp
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_sub_events_org ON organization_subscription_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_sub_events_type ON organization_subscription_events(organization_id, event_type);
CREATE INDEX IF NOT EXISTS idx_org_sub_events_date ON organization_subscription_events(organization_id, created_at DESC);

-- RLS for subscription events
ALTER TABLE organization_subscription_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view subscription events"
  ON organization_subscription_events FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active'
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if organization has active subscription
CREATE OR REPLACE FUNCTION org_has_active_subscription(p_organization_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organizations
    WHERE id = p_organization_id
      AND subscription_status IN ('active', 'trialing')
      AND (subscription_current_period_end IS NULL OR subscription_current_period_end > now())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get subscription info for organization
CREATE OR REPLACE FUNCTION get_organization_subscription(p_organization_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_org organizations%ROWTYPE;
BEGIN
  SELECT * INTO v_org
  FROM organizations
  WHERE id = p_organization_id;

  IF v_org IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'plan_id', v_org.subscription_plan_id,
    'status', v_org.subscription_status,
    'current_period_start', v_org.subscription_current_period_start,
    'current_period_end', v_org.subscription_current_period_end,
    'cancel_at_period_end', v_org.subscription_cancel_at_period_end,
    'trial_end', v_org.subscription_trial_end,
    'is_active', v_org.subscription_status IN ('active', 'trialing')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update subscription from Stripe webhook
CREATE OR REPLACE FUNCTION update_organization_subscription(
  p_organization_id uuid,
  p_plan_id text,
  p_status text,
  p_stripe_subscription_id text,
  p_stripe_customer_id text,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_cancel_at_period_end boolean DEFAULT false,
  p_trial_end timestamptz DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_old_plan_id text;
  v_old_status text;
BEGIN
  -- Get old values for event logging
  SELECT subscription_plan_id, subscription_status
  INTO v_old_plan_id, v_old_status
  FROM organizations
  WHERE id = p_organization_id;

  -- Update organization
  UPDATE organizations SET
    subscription_plan_id = p_plan_id,
    subscription_status = p_status,
    subscription_stripe_id = p_stripe_subscription_id,
    subscription_stripe_customer_id = p_stripe_customer_id,
    subscription_current_period_start = p_period_start,
    subscription_current_period_end = p_period_end,
    subscription_cancel_at_period_end = p_cancel_at_period_end,
    subscription_trial_end = p_trial_end,
    updated_at = now()
  WHERE id = p_organization_id;

  -- Log event
  INSERT INTO organization_subscription_events (
    organization_id,
    event_type,
    stripe_subscription_id,
    previous_plan_id,
    new_plan_id,
    metadata
  ) VALUES (
    p_organization_id,
    CASE
      WHEN v_old_status = 'none' OR v_old_status IS NULL THEN 'subscription_created'
      WHEN p_status = 'canceled' THEN 'subscription_canceled'
      ELSE 'subscription_updated'
    END,
    p_stripe_subscription_id,
    v_old_plan_id,
    p_plan_id,
    jsonb_build_object(
      'old_status', v_old_status,
      'new_status', p_status,
      'cancel_at_period_end', p_cancel_at_period_end
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UPDATE get_user_organization TO INCLUDE SUBSCRIPTION INFO
-- ============================================================================

-- Drop existing function first (return type is changing)
DROP FUNCTION IF EXISTS get_user_organization(uuid);

CREATE OR REPLACE FUNCTION get_user_organization(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  organization_id uuid,
  organization_name text,
  role text,
  credit_allocated numeric,
  credit_used numeric,
  credit_remaining numeric,
  subscription_plan_id text,
  subscription_status text,
  subscription_period_end timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    om.id,
    o.id as organization_id,
    o.name as organization_name,
    om.role,
    om.credit_allocated,
    om.credit_used,
    om.credit_allocated - om.credit_used as credit_remaining,
    o.subscription_plan_id,
    o.subscription_status,
    o.subscription_current_period_end as subscription_period_end
  FROM organization_members om
  JOIN organizations o ON o.id = om.organization_id
  WHERE om.user_id = p_user_id
    AND om.status = 'active'
    AND o.status = 'active'
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

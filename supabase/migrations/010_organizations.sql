-- Organizations / Schools schema
-- Allows institutions to manage credit pools for their students

-- ============================================================================
-- HELPER FUNCTION (create if not exists)
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ORGANIZATIONS TABLE
-- ============================================================================
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  type text NOT NULL DEFAULT 'school' CHECK (type IN ('school', 'university', 'business_school', 'training_center', 'other')),

  -- Contact info
  contact_email text NOT NULL,
  contact_name text,
  contact_phone text,

  -- Address
  address_line1 text,
  address_line2 text,
  city text,
  postal_code text,
  country text DEFAULT 'FR',

  -- Billing
  billing_email text,
  tax_id text, -- SIRET / VAT number

  -- Credit pool
  credit_balance numeric(12,6) NOT NULL DEFAULT 0,
  credit_allocated numeric(12,6) NOT NULL DEFAULT 0, -- Total allocated to members

  -- Settings
  settings jsonb DEFAULT '{
    "default_credit_per_student": 5.00,
    "max_credit_per_student": 20.00,
    "daily_limit_per_student": null,
    "weekly_limit_per_student": null,
    "monthly_limit_per_student": null,
    "allowed_models": null,
    "require_email_domain": null,
    "conversation_visibility": "stats_only",
    "alert_threshold_percent": 80
  }'::jsonb,
  -- settings options:
  -- - default_credit_per_student: auto-allocate on join
  -- - max_credit_per_student: hard cap per student
  -- - daily/weekly/monthly_limit_per_student: rate limits (null = no limit)
  -- - allowed_models: ["claude-sonnet", "gpt-5"] or null for all
  -- - require_email_domain: "@univ-xxx.fr" or null
  -- - conversation_visibility: "stats_only" | "full_access"
  -- - alert_threshold_percent: notify admin when student exceeds this %

  -- Status
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'archived')),

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  activated_at timestamptz
);

-- Index for slug lookups
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_status ON organizations(status);

-- ============================================================================
-- ORGANIZATION MEMBERS TABLE
-- ============================================================================
CREATE TABLE organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Role within organization
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('owner', 'admin', 'teacher', 'student')),

  -- Individual credit allocation from org pool
  credit_allocated numeric(12,6) NOT NULL DEFAULT 0,
  credit_used numeric(12,6) NOT NULL DEFAULT 0,

  -- Metadata
  display_name text,
  class_name text, -- For grouping students
  student_id text, -- Institution's student ID

  -- Status
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'removed')),

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Ensure unique membership
  UNIQUE(organization_id, user_id)
);

-- Indexes
CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_org_members_role ON organization_members(organization_id, role);
CREATE INDEX idx_org_members_class ON organization_members(organization_id, class_name);

-- ============================================================================
-- ORGANIZATION INVITES TABLE
-- ============================================================================
CREATE TABLE organization_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Invite details
  email text NOT NULL,
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('admin', 'teacher', 'student')),
  class_name text,

  -- Credit to allocate on join
  credit_amount numeric(12,6) DEFAULT 0,

  -- Invite token (for direct link invites)
  token text UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),

  -- Status
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),

  -- Who created the invite
  invited_by uuid REFERENCES auth.users(id),

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT now() + interval '30 days',
  accepted_at timestamptz
);

-- Indexes
CREATE INDEX idx_org_invites_org ON organization_invites(organization_id);
CREATE INDEX idx_org_invites_email ON organization_invites(email);
CREATE INDEX idx_org_invites_token ON organization_invites(token);

-- ============================================================================
-- ORGANIZATION TRANSACTIONS TABLE
-- ============================================================================
CREATE TABLE organization_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Transaction type
  type text NOT NULL CHECK (type IN ('purchase', 'allocation', 'usage', 'refund', 'adjustment')),

  -- Amount (positive for credits in, negative for credits out)
  amount numeric(12,6) NOT NULL,

  -- Related entities
  member_id uuid REFERENCES organization_members(id),
  user_id uuid REFERENCES auth.users(id),

  -- For purchases
  stripe_payment_id text,
  invoice_number text,

  -- Description
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,

  -- Timestamp
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_org_transactions_org ON organization_transactions(organization_id);
CREATE INDEX idx_org_transactions_member ON organization_transactions(member_id);
CREATE INDEX idx_org_transactions_type ON organization_transactions(organization_id, type);
CREATE INDEX idx_org_transactions_date ON organization_transactions(organization_id, created_at DESC);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to get organization for a user
CREATE OR REPLACE FUNCTION get_user_organization(p_user_id uuid)
RETURNS TABLE (
  organization_id uuid,
  organization_name text,
  role text,
  credit_allocated numeric,
  credit_used numeric,
  credit_remaining numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id as organization_id,
    o.name as organization_name,
    om.role,
    om.credit_allocated,
    om.credit_used,
    om.credit_allocated - om.credit_used as credit_remaining
  FROM organization_members om
  JOIN organizations o ON o.id = om.organization_id
  WHERE om.user_id = p_user_id
    AND om.status = 'active'
    AND o.status = 'active'
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to allocate credits to a member
CREATE OR REPLACE FUNCTION allocate_member_credits(
  p_organization_id uuid,
  p_member_id uuid,
  p_amount numeric,
  p_allocated_by uuid
)
RETURNS boolean AS $$
DECLARE
  v_org_balance numeric;
  v_current_allocation numeric;
BEGIN
  -- Get organization balance
  SELECT credit_balance - credit_allocated INTO v_org_balance
  FROM organizations
  WHERE id = p_organization_id
  FOR UPDATE;

  -- Check if enough credits available
  IF v_org_balance < p_amount THEN
    RETURN false;
  END IF;

  -- Get current member allocation
  SELECT credit_allocated INTO v_current_allocation
  FROM organization_members
  WHERE id = p_member_id AND organization_id = p_organization_id;

  -- Update member allocation
  UPDATE organization_members
  SET credit_allocated = credit_allocated + p_amount,
      updated_at = now()
  WHERE id = p_member_id AND organization_id = p_organization_id;

  -- Update organization allocated total
  UPDATE organizations
  SET credit_allocated = credit_allocated + p_amount,
      updated_at = now()
  WHERE id = p_organization_id;

  -- Log transaction
  INSERT INTO organization_transactions (
    organization_id, type, amount, member_id, description, metadata
  ) VALUES (
    p_organization_id,
    'allocation',
    p_amount,
    p_member_id,
    'Credit allocation to member',
    jsonb_build_object('allocated_by', p_allocated_by)
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check member usage limits
CREATE OR REPLACE FUNCTION check_org_member_limits(
  p_user_id uuid,
  p_amount numeric
)
RETURNS jsonb AS $$
DECLARE
  v_member_id uuid;
  v_org_id uuid;
  v_remaining numeric;
  v_settings jsonb;
  v_daily_used numeric;
  v_weekly_used numeric;
  v_monthly_used numeric;
  v_daily_limit numeric;
  v_weekly_limit numeric;
  v_monthly_limit numeric;
BEGIN
  -- Find member and org settings
  SELECT om.id, om.organization_id, om.credit_allocated - om.credit_used, o.settings
  INTO v_member_id, v_org_id, v_remaining, v_settings
  FROM organization_members om
  JOIN organizations o ON o.id = om.organization_id
  WHERE om.user_id = p_user_id
    AND om.status = 'active'
    AND o.status = 'active';

  IF v_member_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'not_member');
  END IF;

  -- Check allocation limit
  IF v_remaining < p_amount THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'allocation_exceeded', 'remaining', v_remaining);
  END IF;

  -- Get rate limits from settings
  v_daily_limit := (v_settings->>'daily_limit_per_student')::numeric;
  v_weekly_limit := (v_settings->>'weekly_limit_per_student')::numeric;
  v_monthly_limit := (v_settings->>'monthly_limit_per_student')::numeric;

  -- Check daily limit
  IF v_daily_limit IS NOT NULL THEN
    SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_daily_used
    FROM organization_transactions
    WHERE member_id = v_member_id
      AND type = 'usage'
      AND created_at >= CURRENT_DATE;

    IF v_daily_used + p_amount > v_daily_limit THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'daily_limit_exceeded',
        'used', v_daily_used,
        'limit', v_daily_limit,
        'resets_at', (CURRENT_DATE + interval '1 day')::text
      );
    END IF;
  END IF;

  -- Check weekly limit
  IF v_weekly_limit IS NOT NULL THEN
    SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_weekly_used
    FROM organization_transactions
    WHERE member_id = v_member_id
      AND type = 'usage'
      AND created_at >= date_trunc('week', CURRENT_DATE);

    IF v_weekly_used + p_amount > v_weekly_limit THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'weekly_limit_exceeded',
        'used', v_weekly_used,
        'limit', v_weekly_limit,
        'resets_at', (date_trunc('week', CURRENT_DATE) + interval '1 week')::text
      );
    END IF;
  END IF;

  -- Check monthly limit
  IF v_monthly_limit IS NOT NULL THEN
    SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_monthly_used
    FROM organization_transactions
    WHERE member_id = v_member_id
      AND type = 'usage'
      AND created_at >= date_trunc('month', CURRENT_DATE);

    IF v_monthly_used + p_amount > v_monthly_limit THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'monthly_limit_exceeded',
        'used', v_monthly_used,
        'limit', v_monthly_limit,
        'resets_at', (date_trunc('month', CURRENT_DATE) + interval '1 month')::text
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', v_remaining,
    'org_id', v_org_id,
    'member_id', v_member_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record member usage (called when user spends credits)
CREATE OR REPLACE FUNCTION record_org_member_usage(
  p_user_id uuid,
  p_amount numeric
)
RETURNS jsonb AS $$
DECLARE
  v_check jsonb;
  v_member_id uuid;
  v_org_id uuid;
BEGIN
  -- First check all limits
  v_check := check_org_member_limits(p_user_id, p_amount);

  IF NOT (v_check->>'allowed')::boolean THEN
    RETURN v_check;
  END IF;

  v_member_id := (v_check->>'member_id')::uuid;
  v_org_id := (v_check->>'org_id')::uuid;

  -- Update member usage
  UPDATE organization_members
  SET credit_used = credit_used + p_amount,
      updated_at = now()
  WHERE id = v_member_id;

  -- Log transaction
  INSERT INTO organization_transactions (
    organization_id, type, amount, member_id, user_id, description
  ) VALUES (
    v_org_id,
    'usage',
    -p_amount,
    v_member_id,
    p_user_id,
    'Credit usage'
  );

  RETURN jsonb_build_object('success', true, 'remaining', (v_check->>'remaining')::numeric - p_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept an invite
CREATE OR REPLACE FUNCTION accept_organization_invite(
  p_token text,
  p_user_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_invite organization_invites%ROWTYPE;
  v_member_id uuid;
BEGIN
  -- Find and validate invite
  SELECT * INTO v_invite
  FROM organization_invites
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > now()
  FOR UPDATE;

  IF v_invite IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invite');
  END IF;

  -- Check if user email matches invite (optional strict check)
  -- Could be relaxed depending on requirements

  -- Create membership
  INSERT INTO organization_members (
    organization_id,
    user_id,
    role,
    class_name,
    credit_allocated
  ) VALUES (
    v_invite.organization_id,
    p_user_id,
    v_invite.role,
    v_invite.class_name,
    v_invite.credit_amount
  )
  ON CONFLICT (organization_id, user_id) DO UPDATE
  SET role = v_invite.role,
      class_name = COALESCE(v_invite.class_name, organization_members.class_name),
      status = 'active',
      updated_at = now()
  RETURNING id INTO v_member_id;

  -- Update invite status
  UPDATE organization_invites
  SET status = 'accepted',
      accepted_at = now()
  WHERE id = v_invite.id;

  -- Update org allocated credits if credit_amount > 0
  IF v_invite.credit_amount > 0 THEN
    UPDATE organizations
    SET credit_allocated = credit_allocated + v_invite.credit_amount,
        updated_at = now()
    WHERE id = v_invite.organization_id;

    -- Log allocation transaction
    INSERT INTO organization_transactions (
      organization_id, type, amount, member_id, user_id, description
    ) VALUES (
      v_invite.organization_id,
      'allocation',
      v_invite.credit_amount,
      v_member_id,
      p_user_id,
      'Initial credit allocation from invite'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', v_invite.organization_id,
    'role', v_invite.role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get organization stats (for admin dashboard)
CREATE OR REPLACE FUNCTION get_organization_stats(p_organization_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_members', (SELECT count(*) FROM organization_members WHERE organization_id = p_organization_id AND status = 'active'),
    'students', (SELECT count(*) FROM organization_members WHERE organization_id = p_organization_id AND status = 'active' AND role = 'student'),
    'teachers', (SELECT count(*) FROM organization_members WHERE organization_id = p_organization_id AND status = 'active' AND role = 'teacher'),
    'admins', (SELECT count(*) FROM organization_members WHERE organization_id = p_organization_id AND status = 'active' AND role IN ('admin', 'owner')),
    'credit_balance', (SELECT credit_balance FROM organizations WHERE id = p_organization_id),
    'credit_allocated', (SELECT credit_allocated FROM organizations WHERE id = p_organization_id),
    'credit_available', (SELECT credit_balance - credit_allocated FROM organizations WHERE id = p_organization_id),
    'total_used', (SELECT COALESCE(sum(credit_used), 0) FROM organization_members WHERE organization_id = p_organization_id),
    'pending_invites', (SELECT count(*) FROM organization_invites WHERE organization_id = p_organization_id AND status = 'pending' AND expires_at > now()),
    'classes', (SELECT jsonb_agg(DISTINCT class_name) FROM organization_members WHERE organization_id = p_organization_id AND class_name IS NOT NULL)
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_transactions ENABLE ROW LEVEL SECURITY;

-- Organizations: members can view their org, admins can update
CREATE POLICY "Members can view their organization"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Admins can update their organization"
  ON organizations FOR UPDATE
  USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active'
    )
  );

-- Organization members: members can view their org's members
CREATE POLICY "Members can view org members"
  ON organization_members FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Admins/teachers can manage members
CREATE POLICY "Admins can manage members"
  ON organization_members FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'teacher') AND status = 'active'
    )
  );

-- Invites: admins/teachers can manage
CREATE POLICY "Admins can manage invites"
  ON organization_invites FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'teacher') AND status = 'active'
    )
  );

-- Anyone can view invite by token (for accepting)
CREATE POLICY "Anyone can view invite by token"
  ON organization_invites FOR SELECT
  USING (true);

-- Transactions: members can view their org's transactions
CREATE POLICY "Members can view org transactions"
  ON organization_transactions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at on organizations
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at on organization_members
CREATE TRIGGER update_organization_members_updated_at
  BEFORE UPDATE ON organization_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

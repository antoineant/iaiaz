-- Organization Classes schema
-- Allows trainers to create classes with QR codes for student enrollment
-- and manage per-class AI model restrictions with session time controls

-- ============================================================================
-- ORGANIZATION CLASSES TABLE
-- ============================================================================
CREATE TABLE organization_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Class info
  name text NOT NULL,
  description text,

  -- Join token for QR code
  join_token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),

  -- Class-level settings (override org settings if set)
  settings jsonb DEFAULT '{
    "allowed_models": null,
    "default_credit_per_student": null,
    "daily_limit_per_student": null,
    "allow_personal_fallback": true
  }'::jsonb,
  -- settings options:
  -- - allowed_models: ["claude-sonnet-4", "gpt-5"] or null (inherit from org)
  -- - default_credit_per_student: credit allocated on join (null = use org default)
  -- - daily_limit_per_student: rate limit (null = no limit)
  -- - allow_personal_fallback: if true, use personal credits when class credits exhausted

  -- Status
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'closed')),

  -- Session time management
  starts_at timestamptz,              -- When students can start joining/using (null = immediately)
  ends_at timestamptz,                -- When access expires (null = no expiration)
  closed_at timestamptz,              -- When trainer manually closed the session

  -- Metadata
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Ensure unique class name per organization
  UNIQUE(organization_id, name)
);

-- Indexes
CREATE INDEX idx_org_classes_org ON organization_classes(organization_id);
CREATE INDEX idx_org_classes_token ON organization_classes(join_token);
CREATE INDEX idx_org_classes_status ON organization_classes(organization_id, status);
CREATE INDEX idx_org_classes_created_by ON organization_classes(created_by);

-- ============================================================================
-- CLASS ANALYTICS TABLE
-- ============================================================================
CREATE TABLE class_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES organization_classes(id) ON DELETE CASCADE,

  -- Period
  period_type text NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,

  -- Computed metrics
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- metrics structure:
  -- {
  --   "total_messages": 150,
  --   "total_conversations": 45,
  --   "total_cost": 12.50,
  --   "unique_students": 28,
  --   "active_students": 25,
  --   "model_usage": { "claude-sonnet-4": 80, "gpt-5": 70 },
  --   "peak_hours": [10, 14, 15],
  --   "avg_messages_per_student": 5.4
  -- }

  -- AI-generated insights (on-demand)
  ai_insights jsonb,
  -- ai_insights structure:
  -- {
  --   "summary": "Students primarily focused on...",
  --   "topics_analysis": [...],
  --   "prompt_quality": { "average_score": 7.2, "common_issues": [...] },
  --   "recommendations": [...]
  -- }

  created_at timestamptz DEFAULT now(),

  -- Ensure unique period per class
  UNIQUE(class_id, period_type, period_start)
);

-- Indexes
CREATE INDEX idx_class_analytics_class ON class_analytics(class_id);
CREATE INDEX idx_class_analytics_period ON class_analytics(class_id, period_type, period_start DESC);

-- ============================================================================
-- MODIFY ORGANIZATION MEMBERS TABLE
-- ============================================================================
ALTER TABLE organization_members
ADD COLUMN class_id uuid REFERENCES organization_classes(id) ON DELETE SET NULL;

-- Index for class lookups
CREATE INDEX idx_org_members_class_id ON organization_members(class_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to get class by join token (for QR code scanning)
CREATE OR REPLACE FUNCTION get_class_by_token(p_token text)
RETURNS jsonb AS $$
DECLARE
  v_class organization_classes%ROWTYPE;
  v_org organizations%ROWTYPE;
  v_is_accessible boolean;
BEGIN
  -- Find class by token
  SELECT * INTO v_class
  FROM organization_classes
  WHERE join_token = p_token;

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
      'closed_at', v_class.closed_at
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

-- Function to join a class
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

-- Function to get class stats (for trainer dashboard)
CREATE OR REPLACE FUNCTION get_class_stats(p_class_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_students', (
      SELECT count(*)
      FROM organization_members
      WHERE class_id = p_class_id AND status = 'active' AND role = 'student'
    ),
    'active_today', (
      SELECT count(DISTINCT user_id)
      FROM organization_transactions ot
      JOIN organization_members om ON om.id = ot.member_id
      WHERE om.class_id = p_class_id
        AND ot.type = 'usage'
        AND ot.created_at >= CURRENT_DATE
    ),
    'total_credit_allocated', (
      SELECT COALESCE(sum(credit_allocated), 0)
      FROM organization_members
      WHERE class_id = p_class_id AND status = 'active'
    ),
    'total_credit_used', (
      SELECT COALESCE(sum(credit_used), 0)
      FROM organization_members
      WHERE class_id = p_class_id AND status = 'active'
    ),
    'usage_today', (
      SELECT COALESCE(sum(ABS(ot.amount)), 0)
      FROM organization_transactions ot
      JOIN organization_members om ON om.id = ot.member_id
      WHERE om.class_id = p_class_id
        AND ot.type = 'usage'
        AND ot.created_at >= CURRENT_DATE
    ),
    'usage_this_week', (
      SELECT COALESCE(sum(ABS(ot.amount)), 0)
      FROM organization_transactions ot
      JOIN organization_members om ON om.id = ot.member_id
      WHERE om.class_id = p_class_id
        AND ot.type = 'usage'
        AND ot.created_at >= date_trunc('week', CURRENT_DATE)
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a class is accessible (for chat route)
CREATE OR REPLACE FUNCTION is_class_accessible(p_class_id uuid)
RETURNS boolean AS $$
DECLARE
  v_class organization_classes%ROWTYPE;
BEGIN
  SELECT * INTO v_class
  FROM organization_classes
  WHERE id = p_class_id;

  IF v_class IS NULL THEN
    RETURN false;
  END IF;

  RETURN (
    v_class.status = 'active'
    AND v_class.closed_at IS NULL
    AND (v_class.starts_at IS NULL OR v_class.starts_at <= now())
    AND (v_class.ends_at IS NULL OR v_class.ends_at > now())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get allowed models for a class (considering hierarchy)
CREATE OR REPLACE FUNCTION get_class_allowed_models(p_class_id uuid)
RETURNS text[] AS $$
DECLARE
  v_class organization_classes%ROWTYPE;
  v_org organizations%ROWTYPE;
  v_class_models text[];
  v_org_models text[];
BEGIN
  -- Get class
  SELECT * INTO v_class
  FROM organization_classes
  WHERE id = p_class_id;

  IF v_class IS NULL THEN
    RETURN NULL;
  END IF;

  -- Get organization
  SELECT * INTO v_org
  FROM organizations
  WHERE id = v_class.organization_id;

  -- Get model restrictions
  v_class_models := ARRAY(
    SELECT jsonb_array_elements_text(v_class.settings->'allowed_models')
  );
  v_org_models := ARRAY(
    SELECT jsonb_array_elements_text(v_org.settings->'allowed_models')
  );

  -- If class has restrictions, use those (most restrictive)
  IF array_length(v_class_models, 1) > 0 THEN
    RETURN v_class_models;
  END IF;

  -- Otherwise use org restrictions
  IF array_length(v_org_models, 1) > 0 THEN
    RETURN v_org_models;
  END IF;

  -- No restrictions
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE organization_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_analytics ENABLE ROW LEVEL SECURITY;

-- Classes: organization members can view, teachers/admins can manage
CREATE POLICY "Members can view org classes"
  ON organization_classes FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Teachers and admins can manage classes"
  ON organization_classes FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'teacher')
        AND status = 'active'
    )
  );

-- Class analytics: teachers/admins can view
CREATE POLICY "Teachers can view class analytics"
  ON class_analytics FOR SELECT
  USING (
    class_id IN (
      SELECT oc.id FROM organization_classes oc
      JOIN organization_members om ON om.organization_id = oc.organization_id
      WHERE om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'teacher')
        AND om.status = 'active'
    )
  );

CREATE POLICY "Teachers can manage class analytics"
  ON class_analytics FOR ALL
  USING (
    class_id IN (
      SELECT oc.id FROM organization_classes oc
      JOIN organization_members om ON om.organization_id = oc.organization_id
      WHERE om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'teacher')
        AND om.status = 'active'
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at on organization_classes
CREATE TRIGGER update_organization_classes_updated_at
  BEFORE UPDATE ON organization_classes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

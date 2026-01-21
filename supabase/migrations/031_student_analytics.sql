-- Student Analytics Table for AI Literacy vs Domain Knowledge Matrix
-- Phase 1: Foundation metrics for student classification

-- ============================================================================
-- STUDENT ANALYTICS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES organization_classes(id) ON DELETE CASCADE,

  -- Period
  period_start date NOT NULL,
  period_end date NOT NULL,

  -- Activity metrics (from existing data)
  total_messages integer DEFAULT 0,
  total_conversations integer DEFAULT 0,
  total_cost numeric(10,4) DEFAULT 0,
  active_days integer DEFAULT 0,

  -- AI Literacy proxy metrics
  avg_prompt_length integer DEFAULT 0,           -- Average user message length
  follow_up_rate numeric(5,2) DEFAULT 0,         -- % of convos with >2 user messages
  model_diversity integer DEFAULT 0,             -- Number of different models used
  ai_literacy_score numeric(5,2) DEFAULT 50,     -- 0-100, computed score

  -- Domain engagement proxy metrics
  session_count integer DEFAULT 0,
  avg_messages_per_session numeric(5,2) DEFAULT 0,
  consistency_score numeric(5,2) DEFAULT 50,     -- Based on usage regularity
  domain_engagement_score numeric(5,2) DEFAULT 50, -- 0-100, computed score

  -- Quadrant assignment
  quadrant text CHECK (quadrant IN ('ideal', 'train_ai', 'at_risk', 'superficial')),

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Ensure one record per student per class per period
  UNIQUE(user_id, class_id, period_start)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_student_analytics_class ON student_analytics(class_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_student_analytics_quadrant ON student_analytics(class_id, quadrant);
CREATE INDEX IF NOT EXISTS idx_student_analytics_user ON student_analytics(user_id, class_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE student_analytics ENABLE ROW LEVEL SECURITY;

-- Trainers can view analytics for their classes
CREATE POLICY "Trainers can view class student analytics"
  ON student_analytics FOR SELECT
  USING (
    class_id IN (
      SELECT oc.id FROM organization_classes oc
      JOIN organization_members om ON om.organization_id = oc.organization_id
      WHERE om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'teacher')
        AND om.status = 'active'
    )
  );

-- Students can view their own analytics
CREATE POLICY "Students can view own analytics"
  ON student_analytics FOR SELECT
  USING (user_id = auth.uid());

-- System can insert/update (via service role)
CREATE POLICY "Service role can manage analytics"
  ON student_analytics FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- HELPER FUNCTION: Get class student analytics summary
-- ============================================================================

CREATE OR REPLACE FUNCTION get_class_student_matrix(
  p_class_id uuid,
  p_period_days integer DEFAULT 30
)
RETURNS TABLE (
  quadrant text,
  student_count bigint,
  students jsonb
) AS $$
DECLARE
  v_period_start date;
BEGIN
  v_period_start := CURRENT_DATE - p_period_days;

  RETURN QUERY
  SELECT
    sa.quadrant,
    COUNT(*)::bigint as student_count,
    jsonb_agg(
      jsonb_build_object(
        'user_id', sa.user_id,
        'name', COALESCE(p.display_name, split_part(p.email, '@', 1)),
        'ai_literacy_score', sa.ai_literacy_score,
        'domain_engagement_score', sa.domain_engagement_score,
        'total_messages', sa.total_messages
      )
      ORDER BY sa.ai_literacy_score + sa.domain_engagement_score DESC
    ) as students
  FROM student_analytics sa
  JOIN profiles p ON p.id = sa.user_id
  WHERE sa.class_id = p_class_id
    AND sa.period_start >= v_period_start
  GROUP BY sa.quadrant;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION: Compute raw metrics for a student in a class
-- ============================================================================

CREATE OR REPLACE FUNCTION compute_student_raw_metrics(
  p_user_id uuid,
  p_class_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
  v_total_messages integer;
  v_total_conversations integer;
  v_total_cost numeric;
  v_active_days integer;
  v_avg_prompt_length integer;
  v_conversations_with_followup integer;
  v_model_diversity integer;
  v_daily_usage jsonb;
BEGIN
  -- Get all conversations for this user in the date range
  WITH user_conversations AS (
    SELECT
      c.id,
      c.model,
      c.created_at::date as conv_date
    FROM conversations c
    WHERE c.user_id = p_user_id
      AND c.created_at >= p_start_date
      AND c.created_at < p_end_date + interval '1 day'
  ),
  user_messages AS (
    SELECT
      m.conversation_id,
      m.role,
      m.content,
      m.cost,
      m.created_at::date as msg_date,
      LENGTH(m.content) as content_length
    FROM messages m
    JOIN user_conversations uc ON uc.id = m.conversation_id
    WHERE m.created_at >= p_start_date
      AND m.created_at < p_end_date + interval '1 day'
  ),
  conversation_stats AS (
    SELECT
      conversation_id,
      COUNT(*) FILTER (WHERE role = 'user') as user_message_count,
      AVG(content_length) FILTER (WHERE role = 'user') as avg_length
    FROM user_messages
    GROUP BY conversation_id
  )
  SELECT INTO v_result jsonb_build_object(
    'total_messages', COALESCE((SELECT COUNT(*) FROM user_messages WHERE role = 'user'), 0),
    'total_conversations', COALESCE((SELECT COUNT(*) FROM user_conversations), 0),
    'total_cost', COALESCE((SELECT SUM(cost) FROM user_messages), 0),
    'active_days', COALESCE((SELECT COUNT(DISTINCT msg_date) FROM user_messages), 0),
    'avg_prompt_length', COALESCE((SELECT AVG(avg_length)::integer FROM conversation_stats), 0),
    'conversations_with_followup', COALESCE((SELECT COUNT(*) FROM conversation_stats WHERE user_message_count > 2), 0),
    'model_diversity', COALESCE((SELECT COUNT(DISTINCT model) FROM user_conversations), 0)
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

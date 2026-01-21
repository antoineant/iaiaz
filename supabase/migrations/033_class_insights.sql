-- Migration: Class Insights Persistence
-- Store AI-generated insights for classes so they don't need to be regenerated each visit

CREATE TABLE IF NOT EXISTS class_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES organization_classes(id) ON DELETE CASCADE,

  -- The insights data (stored as JSON)
  summary text NOT NULL,
  engagement_level varchar(20) NOT NULL CHECK (engagement_level IN ('low', 'medium', 'high')),
  engagement_description text,
  usage_patterns text[] DEFAULT '{}',
  model_preferences text,
  recommendations text[] DEFAULT '{}',

  -- Period the insights cover
  period_days integer NOT NULL DEFAULT 30,

  -- Metadata
  locale varchar(5) NOT NULL DEFAULT 'fr',
  model_used varchar(100),
  generated_at timestamptz DEFAULT now(),

  -- Only one insight per class per period per locale
  UNIQUE(class_id, period_days, locale)
);

-- Index for fast lookups
CREATE INDEX idx_class_insights_class ON class_insights(class_id);
CREATE INDEX idx_class_insights_generated ON class_insights(generated_at);

-- RLS Policies
ALTER TABLE class_insights ENABLE ROW LEVEL SECURITY;

-- Trainers can view insights for their classes
CREATE POLICY "Trainers can view class insights"
  ON class_insights FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_classes oc
      JOIN organizations o ON o.id = oc.organization_id
      JOIN organization_members om ON om.organization_id = o.id
      WHERE oc.id = class_insights.class_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin', 'teacher')
    )
  );

-- Service role can insert/update
CREATE POLICY "Service role can manage class insights"
  ON class_insights FOR ALL
  USING (true)
  WITH CHECK (true);

-- Comment on table
COMMENT ON TABLE class_insights IS 'Stores AI-generated insights for classes to avoid regenerating on each page visit';

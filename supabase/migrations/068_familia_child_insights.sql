-- Family child AI insights (parent suggestions)
CREATE TABLE IF NOT EXISTS familia_child_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period_days integer NOT NULL DEFAULT 7,
  locale varchar(5) NOT NULL DEFAULT 'fr',

  -- AI output: array of { emoji, title, body, category }
  suggestions jsonb NOT NULL DEFAULT '[]',

  -- Cache fingerprint: invalidate when data changes
  data_fingerprint varchar(100) NOT NULL,

  model_used varchar(100),
  generated_at timestamptz DEFAULT now(),

  UNIQUE(child_id, period_days, locale)
);

-- RLS: parents (owner/admin) of the family org can read/write
ALTER TABLE familia_child_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view child insights"
  ON familia_child_insights FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN organizations o ON o.id = om.organization_id
      WHERE om.organization_id = familia_child_insights.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND o.type = 'family'
    )
  );

CREATE POLICY "Parents can insert child insights"
  ON familia_child_insights FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN organizations o ON o.id = om.organization_id
      WHERE om.organization_id = familia_child_insights.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND o.type = 'family'
    )
  );

CREATE POLICY "Parents can update child insights"
  ON familia_child_insights FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN organizations o ON o.id = om.organization_id
      WHERE om.organization_id = familia_child_insights.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND o.type = 'family'
    )
  );

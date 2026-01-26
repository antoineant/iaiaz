-- Migration: Course Structure & Learning Analytics
-- Enables trainers to define learning objectives and topic taxonomy for classes
-- Allows LLM to classify prompts by topic and Bloom's cognitive level

-- ============================================================================
-- Table: class_learning_objectives
-- ============================================================================
CREATE TABLE IF NOT EXISTS class_learning_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES organization_classes(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for fast lookup by class
CREATE INDEX idx_class_objectives_class ON class_learning_objectives(class_id);

-- ============================================================================
-- Table: class_topics
-- ============================================================================
CREATE TABLE IF NOT EXISTS class_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES organization_classes(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES class_topics(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  keywords text[],  -- helps LLM classification
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for class_topics
CREATE INDEX idx_class_topics_class ON class_topics(class_id);
CREATE INDEX idx_class_topics_parent ON class_topics(parent_id);

-- ============================================================================
-- Extend prompt_analysis table with learning analytics columns
-- ============================================================================
ALTER TABLE prompt_analysis
  ADD COLUMN IF NOT EXISTS matched_topic_id uuid REFERENCES class_topics(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS bloom_level text CHECK (bloom_level IS NULL OR bloom_level IN ('remember', 'understand', 'apply', 'analyze', 'evaluate', 'create')),
  ADD COLUMN IF NOT EXISTS topic_confidence numeric(3,2) CHECK (topic_confidence IS NULL OR (topic_confidence >= 0 AND topic_confidence <= 1));

-- Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_prompt_analysis_topic ON prompt_analysis(matched_topic_id);
CREATE INDEX IF NOT EXISTS idx_prompt_analysis_bloom ON prompt_analysis(bloom_level);

-- ============================================================================
-- RLS Policies for class_learning_objectives
-- ============================================================================
ALTER TABLE class_learning_objectives ENABLE ROW LEVEL SECURITY;

-- Trainers/admins can view objectives for classes they manage
CREATE POLICY "Trainers can view class objectives"
  ON class_learning_objectives FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_classes c
      JOIN organization_members om ON om.organization_id = c.organization_id
      WHERE c.id = class_learning_objectives.class_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin', 'trainer')
      AND om.status = 'active'
    )
  );

-- Trainers/admins can insert objectives
CREATE POLICY "Trainers can insert class objectives"
  ON class_learning_objectives FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_classes c
      JOIN organization_members om ON om.organization_id = c.organization_id
      WHERE c.id = class_learning_objectives.class_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin', 'trainer')
      AND om.status = 'active'
    )
  );

-- Trainers/admins can update objectives
CREATE POLICY "Trainers can update class objectives"
  ON class_learning_objectives FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_classes c
      JOIN organization_members om ON om.organization_id = c.organization_id
      WHERE c.id = class_learning_objectives.class_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin', 'trainer')
      AND om.status = 'active'
    )
  );

-- Trainers/admins can delete objectives
CREATE POLICY "Trainers can delete class objectives"
  ON class_learning_objectives FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM organization_classes c
      JOIN organization_members om ON om.organization_id = c.organization_id
      WHERE c.id = class_learning_objectives.class_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin', 'trainer')
      AND om.status = 'active'
    )
  );

-- ============================================================================
-- RLS Policies for class_topics
-- ============================================================================
ALTER TABLE class_topics ENABLE ROW LEVEL SECURITY;

-- Trainers/admins can view topics for classes they manage
CREATE POLICY "Trainers can view class topics"
  ON class_topics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_classes c
      JOIN organization_members om ON om.organization_id = c.organization_id
      WHERE c.id = class_topics.class_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin', 'trainer')
      AND om.status = 'active'
    )
  );

-- Trainers/admins can insert topics
CREATE POLICY "Trainers can insert class topics"
  ON class_topics FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_classes c
      JOIN organization_members om ON om.organization_id = c.organization_id
      WHERE c.id = class_topics.class_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin', 'trainer')
      AND om.status = 'active'
    )
  );

-- Trainers/admins can update topics
CREATE POLICY "Trainers can update class topics"
  ON class_topics FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_classes c
      JOIN organization_members om ON om.organization_id = c.organization_id
      WHERE c.id = class_topics.class_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin', 'trainer')
      AND om.status = 'active'
    )
  );

-- Trainers/admins can delete topics
CREATE POLICY "Trainers can delete class topics"
  ON class_topics FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM organization_classes c
      JOIN organization_members om ON om.organization_id = c.organization_id
      WHERE c.id = class_topics.class_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin', 'trainer')
      AND om.status = 'active'
    )
  );

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE class_learning_objectives IS 'Learning objectives defined by trainers for their classes';
COMMENT ON TABLE class_topics IS 'Topic taxonomy for course content, supports hierarchical structure with parent_id';
COMMENT ON COLUMN class_topics.keywords IS 'Keywords to help LLM classify prompts to this topic';
COMMENT ON COLUMN prompt_analysis.matched_topic_id IS 'Topic from class_topics that best matches this prompt';
COMMENT ON COLUMN prompt_analysis.bloom_level IS 'Bloom''s cognitive level: remember, understand, apply, analyze, evaluate, create';
COMMENT ON COLUMN prompt_analysis.topic_confidence IS 'Confidence score for topic match (0.00 to 1.00)';

-- Migration: Prompt Analysis for NLP-based AI Literacy scoring
-- Stores LLM analysis of student prompts for quality assessment

-- Create prompt_analysis table
CREATE TABLE IF NOT EXISTS prompt_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,

  -- Scores (0-100)
  clarity_score integer NOT NULL CHECK (clarity_score >= 0 AND clarity_score <= 100),
  context_score integer NOT NULL CHECK (context_score >= 0 AND context_score <= 100),
  sophistication_score integer NOT NULL CHECK (sophistication_score >= 0 AND sophistication_score <= 100),
  actionability_score integer NOT NULL CHECK (actionability_score >= 0 AND actionability_score <= 100),
  overall_score integer NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),

  -- Optional: detected topic
  topic varchar(100),

  -- Metadata
  model_used varchar(100) NOT NULL,
  tokens_used integer NOT NULL DEFAULT 0,
  analyzed_at timestamptz DEFAULT now(),

  UNIQUE(message_id)
);

-- Index for fast lookups
CREATE INDEX idx_prompt_analysis_message ON prompt_analysis(message_id);

-- Index for analytics queries (find analyzed messages)
CREATE INDEX idx_prompt_analysis_analyzed_at ON prompt_analysis(analyzed_at);

-- RLS Policies
ALTER TABLE prompt_analysis ENABLE ROW LEVEL SECURITY;

-- Users can view analysis of their own messages
CREATE POLICY "Users can view own prompt analysis"
  ON prompt_analysis FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE m.id = prompt_analysis.message_id
      AND c.user_id = auth.uid()
    )
  );

-- Trainers can view analysis for students in their classes
CREATE POLICY "Trainers can view class student prompt analysis"
  ON prompt_analysis FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      JOIN organization_members student_mem ON student_mem.user_id = c.user_id
      JOIN organization_members trainer_mem ON trainer_mem.organization_id = student_mem.organization_id
      WHERE m.id = prompt_analysis.message_id
      AND trainer_mem.user_id = auth.uid()
      AND trainer_mem.role IN ('owner', 'admin', 'trainer')
      AND student_mem.role = 'student'
      AND student_mem.class_id IS NOT NULL
    )
  );

-- Service role can insert (for batch analysis)
CREATE POLICY "Service role can insert prompt analysis"
  ON prompt_analysis FOR INSERT
  WITH CHECK (true);

-- Service role can update
CREATE POLICY "Service role can update prompt analysis"
  ON prompt_analysis FOR UPDATE
  USING (true);

-- Note: Prompt analysis uses the existing "economy_model" setting from app_settings
-- This is configured in the centralized model configuration (src/lib/models.ts)
-- Default is gpt-4o-mini, can be changed in admin settings

-- Comment on table
COMMENT ON TABLE prompt_analysis IS 'Stores LLM-based analysis of student prompts for AI literacy scoring';
COMMENT ON COLUMN prompt_analysis.clarity_score IS 'How clear and specific the question is (0-100)';
COMMENT ON COLUMN prompt_analysis.context_score IS 'How much relevant background is provided (0-100)';
COMMENT ON COLUMN prompt_analysis.sophistication_score IS 'Analytical depth of the question (0-100)';
COMMENT ON COLUMN prompt_analysis.actionability_score IS 'How actionable the prompt is for the AI (0-100)';
COMMENT ON COLUMN prompt_analysis.overall_score IS 'Average of all dimension scores (0-100)';
COMMENT ON COLUMN prompt_analysis.topic IS 'Detected topic/subject of the prompt';

-- Add class context to conversations
-- This allows separating class chat from personal chat

-- Add class_id to conversations (nullable for personal conversations)
ALTER TABLE conversations
ADD COLUMN class_id uuid REFERENCES organization_classes(id) ON DELETE SET NULL;

-- Add organization_id for direct org context (trainers without class)
ALTER TABLE conversations
ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL;

-- Indexes for efficient queries
CREATE INDEX idx_conversations_class_id ON conversations(class_id) WHERE class_id IS NOT NULL;
CREATE INDEX idx_conversations_organization_id ON conversations(organization_id) WHERE organization_id IS NOT NULL;

-- Composite index for user+class queries
CREATE INDEX idx_conversations_user_class ON conversations(user_id, class_id);

-- Update RLS policies to allow trainers to view class conversations for analytics
-- First, create a helper function to check if user is a trainer for a class
CREATE OR REPLACE FUNCTION is_trainer_for_class(p_user_id uuid, p_class_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members om
    JOIN organization_classes oc ON oc.organization_id = om.organization_id
    WHERE om.user_id = p_user_id
    AND om.status = 'active'
    AND oc.id = p_class_id
    AND om.role IN ('owner', 'admin', 'teacher')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Drop existing select policy and create new one that includes trainer access
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;

CREATE POLICY "Users can view own or class conversations"
  ON public.conversations FOR SELECT
  USING (
    auth.uid() = user_id
    OR (
      class_id IS NOT NULL
      AND is_trainer_for_class(auth.uid(), class_id)
    )
  );

-- Trainers can also view messages in class conversations they manage
DROP POLICY IF EXISTS "Users can view messages in own conversations" ON public.messages;

CREATE POLICY "Users can view messages in own or class conversations"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
      AND (
        c.user_id = auth.uid()
        OR (
          c.class_id IS NOT NULL
          AND is_trainer_for_class(auth.uid(), c.class_id)
        )
      )
    )
  );

-- Comment on columns
COMMENT ON COLUMN conversations.class_id IS 'If set, this is a class conversation using org credits only';
COMMENT ON COLUMN conversations.organization_id IS 'If set, this is an org conversation (trainer) using org credits';

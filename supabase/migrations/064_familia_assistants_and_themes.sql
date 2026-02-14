-- Migration: Familia assistants and themes
-- Adds custom assistants, conversation activity tracking, and accent color

-- 1. Color theme on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT NULL;

-- 2. Custom assistants table
CREATE TABLE IF NOT EXISTS custom_assistants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '🤖',
  system_prompt TEXT NOT NULL,
  purpose TEXT,
  color TEXT DEFAULT 'blue',
  is_preset BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_custom_assistants_user ON custom_assistants(user_id);
ALTER TABLE custom_assistants ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'custom_assistants' AND policyname = 'users_manage_own_assistants'
  ) THEN
    CREATE POLICY "users_manage_own_assistants" ON custom_assistants
      FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- 3. Link conversations to assistants
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS assistant_id UUID
  REFERENCES custom_assistants(id) ON DELETE SET NULL;

-- 4. Conversation activity metadata (from streaming <familia_meta> tags)
CREATE TABLE IF NOT EXISTS conversation_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message_id UUID,
  subject TEXT,
  topic TEXT,
  activity_type TEXT,
  struggle BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_conv_activity_conv ON conversation_activity(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_activity_subject ON conversation_activity(subject);
ALTER TABLE conversation_activity ENABLE ROW LEVEL SECURITY;

-- Users can view their own activity
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'conversation_activity' AND policyname = 'users_view_own_activity'
  ) THEN
    CREATE POLICY "users_view_own_activity" ON conversation_activity FOR SELECT USING (
      conversation_id IN (
        SELECT id FROM conversations WHERE user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Parents can view activity for their family org's conversations
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'conversation_activity' AND policyname = 'parents_view_activity'
  ) THEN
    CREATE POLICY "parents_view_activity" ON conversation_activity FOR SELECT USING (
      conversation_id IN (
        SELECT c.id FROM conversations c
        JOIN organization_members om ON om.user_id = c.user_id AND om.status = 'active'
        WHERE om.organization_id IN (
          SELECT organization_id FROM organization_members
          WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active'
        )
      )
    );
  END IF;
END $$;

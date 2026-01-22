-- Migration: Conversation Privacy & Data Controls
-- Adds retention settings for conversations and audit logging for admin access

-- ============================================
-- 1. Add conversation retention setting to profiles
-- ============================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS conversation_retention_days INT DEFAULT NULL;

COMMENT ON COLUMN profiles.conversation_retention_days IS
  'Number of days to keep conversations. NULL = keep forever. Values: 7, 30, 90, 365';

-- ============================================
-- 2. Add index for cleanup job performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_conversations_created_at
ON conversations(created_at);

CREATE INDEX IF NOT EXISTS idx_conversations_user_created
ON conversations(user_id, created_at);

-- ============================================
-- 3. Create admin audit log table
-- ============================================

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_table TEXT NOT NULL,
  target_id UUID,
  target_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_admin ON admin_audit_log(admin_user_id);
CREATE INDEX idx_audit_log_created ON admin_audit_log(created_at DESC);
CREATE INDEX idx_audit_log_target_user ON admin_audit_log(target_user_id);
CREATE INDEX idx_audit_log_action ON admin_audit_log(action);

COMMENT ON TABLE admin_audit_log IS
  'Tracks admin actions on sensitive data for compliance and security';

-- ============================================
-- 4. Function to cleanup old conversations
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_old_conversations()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  WITH deleted AS (
    DELETE FROM conversations c
    WHERE EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = c.user_id
      AND p.conversation_retention_days IS NOT NULL
      AND c.created_at < NOW() - (p.conversation_retention_days || ' days')::INTERVAL
    )
    RETURNING 1
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  -- Log the cleanup
  IF deleted_count > 0 THEN
    INSERT INTO admin_audit_log (
      admin_user_id,
      action,
      target_table,
      details
    )
    SELECT
      id,
      'auto_cleanup_conversations',
      'conversations',
      jsonb_build_object('deleted_count', deleted_count)
    FROM profiles
    WHERE email = 'system@iaiaz.com'
    LIMIT 1;
  END IF;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_old_conversations IS
  'Deletes conversations older than user-specified retention period. Call via cron job.';

-- ============================================
-- 5. RLS Policies for audit log
-- ============================================

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON admin_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- System can insert audit logs (via admin client)
-- No direct user insert allowed

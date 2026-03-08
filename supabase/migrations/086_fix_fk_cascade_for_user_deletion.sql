-- Fix FK constraints that block user deletion
-- These columns reference profiles(id) or auth.users(id) without ON DELETE SET NULL/CASCADE

-- 1. blocked_email_domains.created_by -> profiles(id)
ALTER TABLE public.blocked_email_domains DROP CONSTRAINT IF EXISTS blocked_email_domains_created_by_fkey;
ALTER TABLE public.blocked_email_domains
  ADD CONSTRAINT blocked_email_domains_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. app_settings.updated_by -> profiles(id)
ALTER TABLE public.app_settings DROP CONSTRAINT IF EXISTS app_settings_updated_by_fkey;
ALTER TABLE public.app_settings
  ADD CONSTRAINT app_settings_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 3. organization_classes.created_by -> auth.users(id)
ALTER TABLE public.organization_classes DROP CONSTRAINT IF EXISTS organization_classes_created_by_fkey;
ALTER TABLE public.organization_classes
  ADD CONSTRAINT organization_classes_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. provider_budget_alerts.acknowledged_by -> auth.users(id)
ALTER TABLE public.provider_budget_alerts DROP CONSTRAINT IF EXISTS provider_budget_alerts_acknowledged_by_fkey;
ALTER TABLE public.provider_budget_alerts
  ADD CONSTRAINT provider_budget_alerts_acknowledged_by_fkey
  FOREIGN KEY (acknowledged_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 5. parental_controls.updated_by -> auth.users(id)
ALTER TABLE public.parental_controls DROP CONSTRAINT IF EXISTS parental_controls_updated_by_fkey;
ALTER TABLE public.parental_controls
  ADD CONSTRAINT parental_controls_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 6. conversation_flags.user_id -> auth.users(id)
ALTER TABLE public.conversation_flags DROP CONSTRAINT IF EXISTS conversation_flags_user_id_fkey;
ALTER TABLE public.conversation_flags
  ADD CONSTRAINT conversation_flags_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 7. conversation_flags.reviewed_by -> auth.users(id)
ALTER TABLE public.conversation_flags DROP CONSTRAINT IF EXISTS conversation_flags_reviewed_by_fkey;
ALTER TABLE public.conversation_flags
  ADD CONSTRAINT conversation_flags_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 8. organization_invites.invited_by -> auth.users(id)
ALTER TABLE public.organization_invites DROP CONSTRAINT IF EXISTS organization_invites_invited_by_fkey;
ALTER TABLE public.organization_invites
  ADD CONSTRAINT organization_invites_invited_by_fkey
  FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 9. organization_transactions.user_id -> auth.users(id)
ALTER TABLE public.organization_transactions DROP CONSTRAINT IF EXISTS organization_transactions_user_id_fkey;
ALTER TABLE public.organization_transactions
  ADD CONSTRAINT organization_transactions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Admin Features Migration
-- Run this in your Supabase SQL editor after 001_initial_schema.sql

-- Add is_admin column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create app settings table
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id)
);

-- Create models table (dynamic model configuration)
CREATE TABLE IF NOT EXISTS public.ai_models (
  id VARCHAR(100) PRIMARY KEY, -- e.g., "claude-sonnet-4-20250514"
  name VARCHAR(100) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  input_price DECIMAL(10,6) NOT NULL, -- per 1M tokens in USD
  output_price DECIMAL(10,6) NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'balanced',
  is_recommended BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  max_tokens INT DEFAULT 4096,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO public.app_settings (key, value, description) VALUES
  ('markup', '{"percentage": 50}', 'Markup percentage applied to API costs'),
  ('free_credits', '{"amount": 1.0}', 'Free credits given to new users'),
  ('min_balance_warning', '{"amount": 0.5}', 'Balance threshold for low balance warning')
ON CONFLICT (key) DO NOTHING;

-- Insert current models (from pricing.ts)
INSERT INTO public.ai_models (id, name, provider, input_price, output_price, description, category, is_recommended) VALUES
  ('claude-opus-4-5-20250514', 'Claude Opus 4.5', 'Anthropic', 5.0, 25.0, 'Le plus intelligent. Idéal pour les tâches complexes et le code.', 'premium', false),
  ('claude-sonnet-4-20250514', 'Claude Sonnet 4', 'Anthropic', 3.0, 15.0, 'Excellent équilibre qualité/prix. Recommandé pour la plupart des usages.', 'balanced', true),
  ('claude-haiku-3-5-20241022', 'Claude Haiku 3.5', 'Anthropic', 0.8, 4.0, 'Rapide et économique. Idéal pour les tâches simples.', 'fast', false),
  ('gpt-4.1', 'GPT-4.1', 'OpenAI', 2.0, 8.0, 'Modèle phare d''OpenAI. Très polyvalent et fiable.', 'balanced', false),
  ('gpt-4o', 'GPT-4o', 'OpenAI', 2.5, 10.0, 'Modèle multimodal rapide. Bon pour texte et images.', 'balanced', false),
  ('gpt-4o-mini', 'GPT-4o Mini', 'OpenAI', 0.15, 0.6, 'Version légère et très économique de GPT-4o.', 'economy', false),
  ('gemini-2.5-pro-preview-06-05', 'Gemini 2.5 Pro', 'Google', 4.0, 20.0, 'Le plus puissant de Google. Excellent raisonnement.', 'premium', false),
  ('gemini-2.0-flash', 'Gemini 2.0 Flash', 'Google', 0.1, 0.4, 'Ultra rapide et économique. Idéal pour les tâches courantes.', 'fast', false),
  ('gemini-1.5-pro', 'Gemini 1.5 Pro', 'Google', 1.25, 5.0, 'Grande fenêtre de contexte (1M tokens). Bon pour longs documents.', 'balanced', false),
  ('gemini-1.5-flash', 'Gemini 1.5 Flash', 'Google', 0.075, 0.3, 'Le plus économique. Parfait pour les petites tâches.', 'economy', false),
  ('mistral-large-latest', 'Mistral Large', 'Mistral', 2.0, 6.0, 'Modèle français de haute qualité. Excellent en français.', 'balanced', false),
  ('mistral-medium-latest', 'Mistral Medium 3', 'Mistral', 0.4, 2.0, 'Excellent rapport qualité/prix. 8x moins cher que les concurrents.', 'balanced', false),
  ('mistral-small-latest', 'Mistral Small', 'Mistral', 0.1, 0.3, 'Rapide et économique. Bon pour les tâches simples.', 'economy', false),
  ('codestral-latest', 'Codestral', 'Mistral', 0.3, 0.9, 'Spécialisé pour le code. Excellent pour la programmation.', 'code', false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  provider = EXCLUDED.provider,
  input_price = EXCLUDED.input_price,
  output_price = EXCLUDED.output_price,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  is_recommended = EXCLUDED.is_recommended,
  updated_at = NOW();

-- RLS for app_settings (only admins can modify)
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view settings"
  ON public.app_settings FOR SELECT
  USING (true);

CREATE POLICY "Only admins can modify settings"
  ON public.app_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- RLS for ai_models (anyone can view, only admins modify)
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active models"
  ON public.ai_models FOR SELECT
  USING (true);

CREATE POLICY "Only admins can modify models"
  ON public.ai_models FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Admin policy for profiles (admins can view all profiles)
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

-- Admins can update any profile
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

-- Function to get admin stats
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM public.profiles),
    'total_credits_balance', (SELECT COALESCE(SUM(credits_balance), 0) FROM public.profiles),
    'total_conversations', (SELECT COUNT(*) FROM public.conversations),
    'total_messages', (SELECT COUNT(*) FROM public.messages),
    'total_revenue', (SELECT COALESCE(SUM(amount), 0) FROM public.credit_transactions WHERE type = 'purchase'),
    'total_usage', (SELECT COALESCE(SUM(ABS(amount)), 0) FROM public.credit_transactions WHERE type = 'usage'),
    'users_today', (SELECT COUNT(*) FROM public.profiles WHERE created_at >= CURRENT_DATE),
    'revenue_today', (SELECT COALESCE(SUM(amount), 0) FROM public.credit_transactions WHERE type = 'purchase' AND created_at >= CURRENT_DATE),
    'active_models', (SELECT COUNT(*) FROM public.ai_models WHERE is_active = true)
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Make yourself an admin (replace with your email after running)
-- UPDATE public.profiles SET is_admin = true WHERE email = 'your-email@example.com';

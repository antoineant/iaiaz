-- Add familia-specific markup setting (separate from global markup)
-- Default 0% means Familia users get credits at API cost
INSERT INTO public.app_settings (key, value, description)
VALUES ('familia_markup', '{"percentage": 0}', 'Markup for Familia users (separate from global)')
ON CONFLICT (key) DO NOTHING;

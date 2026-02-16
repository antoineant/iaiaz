-- Add mifa-specific markup setting (separate from global markup)
-- Default 0% means mifa users get credits at API cost
INSERT INTO public.app_settings (key, value, description)
VALUES ('mifa_markup', '{"percentage": 0}', 'Markup for mifa users (separate from global)')
ON CONFLICT (key) DO NOTHING;

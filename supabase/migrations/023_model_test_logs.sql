-- Model test logs table for admin testing feature
CREATE TABLE IF NOT EXISTS public.model_test_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  response_time_ms INTEGER NOT NULL,
  tokens_input INTEGER,
  tokens_output INTEGER,
  prompt TEXT,
  response TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying by model
CREATE INDEX idx_model_test_logs_model ON public.model_test_logs(model_id, created_at DESC);

-- RLS - admin only
ALTER TABLE public.model_test_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view test logs"
  ON public.model_test_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can insert test logs"
  ON public.model_test_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Grant access to service role for API usage
GRANT ALL ON public.model_test_logs TO service_role;

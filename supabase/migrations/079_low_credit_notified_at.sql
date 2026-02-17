-- Track when low-credit email was last sent to avoid spamming
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS low_credit_notified_at TIMESTAMPTZ;

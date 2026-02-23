-- Track incomplete post-signup setup (e.g. user chose mifa but didn't finish family creation)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pending_setup text;

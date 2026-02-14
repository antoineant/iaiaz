ALTER TABLE profiles ADD COLUMN IF NOT EXISTS school_year TEXT;
COMMENT ON COLUMN profiles.school_year IS 'School year level (6eme, 5eme, ..., terminale, superieur)';

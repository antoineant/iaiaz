-- Add API keys for external desktop app authentication
-- ============================================================================

-- Add api_key column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS api_key text UNIQUE;

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_profiles_api_key ON profiles(api_key) WHERE api_key IS NOT NULL;

-- Function to generate a secure API key
CREATE OR REPLACE FUNCTION generate_api_key()
RETURNS text AS $$
DECLARE
  key text;
  key_exists boolean;
BEGIN
  LOOP
    -- Generate a random key with prefix for easy identification
    key := 'iaiaz_' || encode(gen_random_bytes(24), 'base64');
    -- Replace URL-unsafe characters
    key := replace(replace(replace(key, '+', 'x'), '/', 'y'), '=', '');

    -- Check if key already exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE api_key = key) INTO key_exists;

    -- Exit loop if unique key found
    EXIT WHEN NOT key_exists;
  END LOOP;

  RETURN key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to regenerate API key for a user
CREATE OR REPLACE FUNCTION regenerate_api_key(user_id uuid)
RETURNS text AS $$
DECLARE
  new_key text;
BEGIN
  -- Verify user is requesting their own key
  IF auth.uid() != user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  new_key := generate_api_key();

  UPDATE profiles
  SET api_key = new_key, updated_at = now()
  WHERE id = user_id;

  RETURN new_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC to get or create API key for current user
CREATE OR REPLACE FUNCTION get_or_create_api_key()
RETURNS text AS $$
DECLARE
  current_key text;
  new_key text;
BEGIN
  -- Get existing key
  SELECT api_key INTO current_key
  FROM profiles
  WHERE id = auth.uid();

  -- If no key exists, create one
  IF current_key IS NULL THEN
    new_key := generate_api_key();

    UPDATE profiles
    SET api_key = new_key, updated_at = now()
    WHERE id = auth.uid();

    RETURN new_key;
  END IF;

  RETURN current_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_api_key() TO authenticated;
GRANT EXECUTE ON FUNCTION regenerate_api_key(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_api_key() TO authenticated;

-- Comment
COMMENT ON COLUMN profiles.api_key IS 'API key for external desktop app (Ainonymise) authentication';

-- Rename familia DB objects to mifa (rebrand)

-- 1. Rename table
ALTER TABLE IF EXISTS familia_child_insights RENAME TO mifa_child_insights;

-- 2. Rename RLS policies (they reference the old table name internally)
-- Policies are automatically updated when the table is renamed, no action needed.

-- 3. Recreate function with new name, keeping the old one as an alias
-- First, create the new function by wrapping the old logic
CREATE OR REPLACE FUNCTION check_mifa_preconditions(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Delegate to the existing function logic
  SELECT check_familia_preconditions(p_user_id) INTO result;
  RETURN result;
END;
$$;

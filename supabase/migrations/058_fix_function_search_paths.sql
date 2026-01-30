-- Fix function search_path security warnings
-- Setting search_path = public prevents search_path manipulation attacks
-- where an attacker could create malicious tables in another schema

-- This DO block dynamically finds all functions in the public schema
-- that don't have a fixed search_path and sets it to 'public'

DO $$
DECLARE
  func_record RECORD;
  alter_sql TEXT;
BEGIN
  -- Find all functions in public schema without a fixed search_path
  FOR func_record IN
    SELECT
      p.oid,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'  -- regular functions only
      AND p.proname NOT LIKE 'pg_%'  -- exclude postgres internal
      AND p.proname NOT LIKE '_pg_%'
      AND (p.proconfig IS NULL OR NOT 'search_path=public' = ANY(p.proconfig))
  LOOP
    -- Build and execute ALTER FUNCTION statement
    alter_sql := format(
      'ALTER FUNCTION public.%I(%s) SET search_path = public',
      func_record.function_name,
      func_record.args
    );

    BEGIN
      EXECUTE alter_sql;
      RAISE NOTICE 'Fixed search_path for: %', func_record.function_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not fix %: %', func_record.function_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- Also fix trigger functions (prokind = 'f' might miss some)
DO $$
DECLARE
  func_record RECORD;
  alter_sql TEXT;
BEGIN
  FOR func_record IN
    SELECT
      p.oid,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prorettype = 'trigger'::regtype
      AND (p.proconfig IS NULL OR NOT 'search_path=public' = ANY(p.proconfig))
  LOOP
    alter_sql := format(
      'ALTER FUNCTION public.%I(%s) SET search_path = public',
      func_record.function_name,
      func_record.args
    );

    BEGIN
      EXECUTE alter_sql;
      RAISE NOTICE 'Fixed search_path for trigger function: %', func_record.function_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not fix trigger function %: %', func_record.function_name, SQLERRM;
    END;
  END LOOP;
END $$;

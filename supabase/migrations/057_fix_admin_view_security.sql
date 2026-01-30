-- Fix SECURITY DEFINER warning on admin_users_view
-- Restrict access to service_role only (used by API routes with admin client)
-- This prevents direct database access from exposing all user data

-- Revoke access from public and authenticated roles
REVOKE ALL ON admin_users_view FROM public;
REVOKE ALL ON admin_users_view FROM authenticated;
REVOKE ALL ON admin_users_view FROM anon;

-- Only allow service_role (admin client in API routes) to query this view
GRANT SELECT ON admin_users_view TO service_role;

-- Fix Admin Policies Migration
-- This fixes the recursive RLS policy issue from 002_admin_features.sql

-- First, drop the problematic policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create a security definer function to check admin status
-- This bypasses RLS and prevents recursion
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  admin_status BOOLEAN;
BEGIN
  SELECT is_admin INTO admin_status
  FROM public.profiles
  WHERE id = user_id;

  RETURN COALESCE(admin_status, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Now create the fixed policies for profiles

-- SELECT: Users can view their own profile, admins can view all
CREATE POLICY "Users and admins can view profiles"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR public.is_admin(auth.uid())
  );

-- UPDATE: Users can update their own profile, admins can update all
CREATE POLICY "Users and admins can update profiles"
  ON public.profiles FOR UPDATE
  USING (
    auth.uid() = id
    OR public.is_admin(auth.uid())
  );

-- Also fix credit_transactions so admins can view all
DROP POLICY IF EXISTS "Users can view own transactions" ON public.credit_transactions;

CREATE POLICY "Users and admins can view transactions"
  ON public.credit_transactions FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.is_admin(auth.uid())
  );

-- Allow admins to insert credit transactions (for manual credit adjustments)
CREATE POLICY "Admins can insert transactions"
  ON public.credit_transactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR public.is_admin(auth.uid())
  );

-- Restore credits if they were lost (set to 1€ if currently 0)
-- Uncomment and modify as needed:
-- UPDATE public.profiles SET credits_balance = 1.00 WHERE credits_balance = 0;

-- Make sure you're admin (replace with your email):
-- UPDATE public.profiles SET is_admin = true WHERE email = 'your-email@example.com';

-- Add terms acceptance tracking to profiles
-- Users must accept terms to use the service

-- Add terms_accepted_at column (NULL means not accepted)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ DEFAULT NULL;

-- Update the handle_new_user function to NOT set terms_accepted_at
-- (they must explicitly accept on signup)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, credits_balance, terms_accepted_at)
  VALUES (NEW.id, NEW.email, 1.00, NULL); -- terms_accepted_at is NULL until they accept
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept terms (called from API/client)
CREATE OR REPLACE FUNCTION public.accept_terms(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET terms_accepted_at = NOW(),
      updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policy for users to update their own terms acceptance
-- (This is covered by existing "Users can update own profile" policy)

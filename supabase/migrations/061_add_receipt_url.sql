-- Add receipt_url column to credit_transactions for Stripe receipts (personal purchases)
ALTER TABLE public.credit_transactions
ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Add receipt_url column to organization_transactions (organization purchases)
ALTER TABLE public.organization_transactions
ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Update the add_credits function to accept receipt_url
CREATE OR REPLACE FUNCTION public.add_credits(
  p_user_id UUID,
  p_amount DECIMAL,
  p_description TEXT,
  p_stripe_payment_id VARCHAR DEFAULT NULL,
  p_receipt_url TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Add credits
  UPDATE public.profiles
  SET credits_balance = credits_balance + p_amount,
      updated_at = NOW()
  WHERE id = p_user_id;

  -- Record transaction with receipt URL
  INSERT INTO public.credit_transactions (user_id, amount, type, description, stripe_payment_id, receipt_url)
  VALUES (p_user_id, p_amount, 'purchase', p_description, p_stripe_payment_id, p_receipt_url);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

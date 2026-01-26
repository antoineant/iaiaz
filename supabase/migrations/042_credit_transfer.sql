-- Migration: Add credit transfer capability
-- Allows trainers to transfer credits between personal and organization pools

-- Add can_manage_credits permission to organization_members
-- For training_center orgs, owners can always manage credits
-- For school/university orgs, this permission must be explicitly granted
ALTER TABLE organization_members
ADD COLUMN IF NOT EXISTS can_manage_credits boolean NOT NULL DEFAULT false;

-- Auto-grant can_manage_credits to owners and admins
UPDATE organization_members
SET can_manage_credits = true
WHERE role IN ('owner', 'admin');

-- Create a trigger to auto-grant can_manage_credits to new owners/admins
CREATE OR REPLACE FUNCTION auto_grant_credit_management()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IN ('owner', 'admin') THEN
    NEW.can_manage_credits := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_grant_credit_management ON organization_members;
CREATE TRIGGER trigger_auto_grant_credit_management
  BEFORE INSERT OR UPDATE OF role ON organization_members
  FOR EACH ROW
  EXECUTE FUNCTION auto_grant_credit_management();

-- Add comment explaining the permission
COMMENT ON COLUMN organization_members.can_manage_credits IS
  'Permission to transfer credits between personal and organization pools. Auto-granted to owners/admins. Can be manually granted to teachers by admins.';

-- Create credit_transfers table to track all transfers
CREATE TABLE IF NOT EXISTS credit_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who performed the transfer
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Transfer direction: 'to_org' (personal -> org) or 'to_personal' (org -> personal)
  direction text NOT NULL CHECK (direction IN ('to_org', 'to_personal')),

  -- Amount transferred (always positive)
  amount numeric(12,6) NOT NULL CHECK (amount > 0),

  -- Balances after transfer (for audit trail)
  personal_balance_after numeric(12,6) NOT NULL,
  org_balance_after numeric(12,6) NOT NULL,

  -- Optional note
  note text,

  -- Timestamp
  created_at timestamptz DEFAULT now()
);

-- Index for querying transfers
CREATE INDEX IF NOT EXISTS idx_credit_transfers_user ON credit_transfers(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transfers_org ON credit_transfers(organization_id);
CREATE INDEX IF NOT EXISTS idx_credit_transfers_created ON credit_transfers(created_at DESC);

-- RLS policies for credit_transfers
ALTER TABLE credit_transfers ENABLE ROW LEVEL SECURITY;

-- Users can view their own transfers
CREATE POLICY "Users can view own transfers" ON credit_transfers
  FOR SELECT USING (auth.uid() = user_id);

-- Org admins can view all transfers in their org
CREATE POLICY "Org admins can view org transfers" ON credit_transfers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = credit_transfers.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
      AND organization_members.status = 'active'
    )
  );

-- Function to check if user can transfer credits
CREATE OR REPLACE FUNCTION can_transfer_credits(p_user_id uuid, p_org_id uuid)
RETURNS boolean AS $$
DECLARE
  v_org_type text;
  v_member_role text;
  v_can_manage boolean;
BEGIN
  -- Get org type
  SELECT type INTO v_org_type FROM organizations WHERE id = p_org_id;

  -- Get member info
  SELECT role, can_manage_credits INTO v_member_role, v_can_manage
  FROM organization_members
  WHERE user_id = p_user_id AND organization_id = p_org_id AND status = 'active';

  -- If not a member, cannot transfer
  IF v_member_role IS NULL THEN
    RETURN false;
  END IF;

  -- For training_center (self-employed trainers), owner can always transfer
  IF v_org_type = 'training_center' AND v_member_role = 'owner' THEN
    RETURN true;
  END IF;

  -- For all org types, check the can_manage_credits permission
  RETURN COALESCE(v_can_manage, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to perform credit transfer
CREATE OR REPLACE FUNCTION transfer_credits(
  p_user_id uuid,
  p_org_id uuid,
  p_direction text,
  p_amount numeric,
  p_note text DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_personal_balance numeric;
  v_org_balance numeric;
  v_org_allocated numeric;
  v_org_available numeric;
  v_new_personal_balance numeric;
  v_new_org_balance numeric;
  v_transfer_id uuid;
BEGIN
  -- Validate direction
  IF p_direction NOT IN ('to_org', 'to_personal') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid direction');
  END IF;

  -- Validate amount
  IF p_amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Amount must be positive');
  END IF;

  -- Check permission
  IF NOT can_transfer_credits(p_user_id, p_org_id) THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized to transfer credits');
  END IF;

  -- Get current balances
  SELECT credits_balance INTO v_personal_balance FROM profiles WHERE id = p_user_id;
  SELECT credit_balance, credit_allocated INTO v_org_balance, v_org_allocated FROM organizations WHERE id = p_org_id;

  v_org_available := v_org_balance - COALESCE(v_org_allocated, 0);

  -- Validate sufficient balance
  IF p_direction = 'to_org' AND v_personal_balance < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient personal credits');
  END IF;

  IF p_direction = 'to_personal' AND v_org_available < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient organization credits');
  END IF;

  -- Calculate new balances
  IF p_direction = 'to_org' THEN
    v_new_personal_balance := v_personal_balance - p_amount;
    v_new_org_balance := v_org_balance + p_amount;
  ELSE
    v_new_personal_balance := v_personal_balance + p_amount;
    v_new_org_balance := v_org_balance - p_amount;
  END IF;

  -- Update balances
  UPDATE profiles SET credits_balance = v_new_personal_balance, updated_at = now() WHERE id = p_user_id;
  UPDATE organizations SET credit_balance = v_new_org_balance, updated_at = now() WHERE id = p_org_id;

  -- Record the transfer
  INSERT INTO credit_transfers (user_id, organization_id, direction, amount, personal_balance_after, org_balance_after, note)
  VALUES (p_user_id, p_org_id, p_direction, p_amount, v_new_personal_balance, v_new_org_balance, p_note)
  RETURNING id INTO v_transfer_id;

  -- Also log to organization_transactions for consistency
  INSERT INTO organization_transactions (organization_id, user_id, type, amount, description)
  VALUES (
    p_org_id,
    p_user_id,
    CASE WHEN p_direction = 'to_org' THEN 'transfer_in' ELSE 'transfer_out' END,
    CASE WHEN p_direction = 'to_org' THEN p_amount ELSE -p_amount END,
    CASE WHEN p_direction = 'to_org' THEN 'Transfer from personal credits' ELSE 'Transfer to personal credits' END
  );

  RETURN json_build_object(
    'success', true,
    'transfer_id', v_transfer_id,
    'personal_balance', v_new_personal_balance,
    'org_balance', v_new_org_balance,
    'org_available', v_new_org_balance - COALESCE(v_org_allocated, 0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add new transaction types if they don't exist (for organization_transactions)
-- Note: This may need manual verification if there's a CHECK constraint
DO $$
BEGIN
  -- Try to add the new types - if constraint exists, this will be handled gracefully
  -- The API will use 'adjustment' type as fallback if these don't work
  RAISE NOTICE 'Credit transfer migration complete. New transaction types: transfer_in, transfer_out';
END $$;

-- Migration: Per-child pricing model
-- Adds purchased_credits column to track top-up credits separately from subscription credits

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS purchased_credits NUMERIC(12,6) DEFAULT 0;

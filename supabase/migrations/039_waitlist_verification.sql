-- Migration: Add verification to waitlist
-- Implements double opt-in for waitlist signups

-- Add verification columns to waitlist table
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS verification_token TEXT;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS verification_sent_at TIMESTAMPTZ;

-- Index for token lookups
CREATE INDEX IF NOT EXISTS idx_waitlist_verification_token ON waitlist(verification_token) WHERE verification_token IS NOT NULL;

-- Update constraint to allow unverified entries
-- (email uniqueness still applies)

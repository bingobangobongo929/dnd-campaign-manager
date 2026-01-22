-- Migration: Add GDPR consent tracking to waitlist
-- Tracks when users explicitly consent to receiving emails

-- Add consent column
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS consent_given_at TIMESTAMPTZ;

-- Add source column to track where signup came from (hero vs footer)
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS signup_source TEXT DEFAULT 'landing';

-- Comment
COMMENT ON COLUMN waitlist.consent_given_at IS 'Timestamp when user explicitly consented to receive emails (GDPR compliance)';
COMMENT ON COLUMN waitlist.signup_source IS 'Where the signup originated from (hero, footer, etc.)';

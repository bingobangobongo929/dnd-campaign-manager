-- Migration: Add pending status support for intelligence suggestions
-- Allows suggestions to be stored and reviewed later

-- ============================================================================
-- 1. MAKE SESSION_ID OPTIONAL (for campaign-wide analysis)
-- ============================================================================

ALTER TABLE intelligence_suggestions
  ALTER COLUMN session_id DROP NOT NULL;

-- ============================================================================
-- 2. UPDATE STATUS CHECK CONSTRAINT TO INCLUDE 'pending'
-- ============================================================================

-- Drop the existing check constraint
ALTER TABLE intelligence_suggestions
  DROP CONSTRAINT IF EXISTS intelligence_suggestions_status_check;

-- Add new constraint that includes 'pending'
ALTER TABLE intelligence_suggestions
  ADD CONSTRAINT intelligence_suggestions_status_check
  CHECK (status IN ('pending', 'applied', 'rejected'));

-- Change default to 'pending' for new suggestions
ALTER TABLE intelligence_suggestions
  ALTER COLUMN status SET DEFAULT 'pending';

-- ============================================================================
-- 3. ADD CHARACTER_NAME COLUMN (for new character suggestions)
-- ============================================================================

ALTER TABLE intelligence_suggestions
  ADD COLUMN IF NOT EXISTS character_name TEXT;

-- ============================================================================
-- 4. ADD INDEX FOR PENDING SUGGESTIONS QUERY
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_intelligence_suggestions_pending
  ON intelligence_suggestions(campaign_id, status)
  WHERE status = 'pending';

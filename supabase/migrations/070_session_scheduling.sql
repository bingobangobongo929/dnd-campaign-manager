-- =====================================================
-- SESSION SCHEDULING SYSTEM
-- Add session scheduling and player availability tracking
-- =====================================================

-- =====================================================
-- 1. UPDATE CAMPAIGNS TABLE
-- =====================================================

-- Add next session scheduling fields
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS next_session_date TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS next_session_location TEXT DEFAULT NULL;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS next_session_notes TEXT DEFAULT NULL;

-- Comments for clarity
COMMENT ON COLUMN campaigns.next_session_date IS 'Scheduled date/time for the next session';
COMMENT ON COLUMN campaigns.next_session_location IS 'Location or platform for next session (e.g., "Roll20 + Discord")';
COMMENT ON COLUMN campaigns.next_session_notes IS 'Notes for players about the upcoming session';

-- =====================================================
-- 2. UPDATE CAMPAIGN_MEMBERS TABLE
-- =====================================================

-- Add next session status for player availability tracking
ALTER TABLE campaign_members ADD COLUMN IF NOT EXISTS next_session_status TEXT DEFAULT 'no_response';

-- Add CHECK constraint for status values
ALTER TABLE campaign_members DROP CONSTRAINT IF EXISTS campaign_members_next_session_status_check;
ALTER TABLE campaign_members ADD CONSTRAINT campaign_members_next_session_status_check
  CHECK (next_session_status IN ('confirmed', 'unavailable', 'maybe', 'no_response'));

-- Comments for clarity
COMMENT ON COLUMN campaign_members.next_session_status IS 'Player availability for next session: confirmed, unavailable, maybe, no_response';

-- =====================================================
-- 3. UPDATE SESSIONS TABLE (for scheduled_date)
-- =====================================================

-- Add scheduled_date for pre-scheduling sessions
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMPTZ DEFAULT NULL;

-- Add duration tracking
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT NULL;

-- Comments for clarity
COMMENT ON COLUMN sessions.scheduled_date IS 'Pre-scheduled date for future sessions';
COMMENT ON COLUMN sessions.duration_minutes IS 'Session duration in minutes';

-- =====================================================
-- 4. CREATE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_campaigns_next_session_date ON campaigns(next_session_date)
  WHERE next_session_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_campaign_members_session_status ON campaign_members(campaign_id, next_session_status);

-- =====================================================
-- 5. RESET PLAYER STATUS WHEN SESSION DATE CHANGES
-- =====================================================

-- Create a function to reset player status when session is scheduled/updated
CREATE OR REPLACE FUNCTION reset_session_status_on_date_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If next_session_date changed (and is not being cleared)
  IF NEW.next_session_date IS DISTINCT FROM OLD.next_session_date AND NEW.next_session_date IS NOT NULL THEN
    -- Reset all member statuses to no_response
    UPDATE campaign_members
    SET next_session_status = 'no_response'
    WHERE campaign_id = NEW.id
      AND role IN ('player', 'contributor', 'co_dm')
      AND status = 'active';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_reset_session_status ON campaigns;
CREATE TRIGGER trigger_reset_session_status
  AFTER UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION reset_session_status_on_date_change();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

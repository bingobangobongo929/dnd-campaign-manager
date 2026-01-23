-- Add dm_notes column to sessions table for DM-only notes
-- This was missing and causing auto-save errors

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS dm_notes TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN sessions.dm_notes IS 'Private DM notes about this session - never visible to players';

-- =====================================================
-- EXPAND PLAYER SESSION NOTES SOURCE TYPES
-- Add support for additional import sources
-- =====================================================

-- Drop the existing constraint and add a new one with more source types
ALTER TABLE player_session_notes
DROP CONSTRAINT IF EXISTS player_session_notes_source_check;

ALTER TABLE player_session_notes
ADD CONSTRAINT player_session_notes_source_check
CHECK (source IN ('manual', 'discord_import', 'player_submitted', 'whatsapp_import', 'email_import', 'other_import', 'dm_added'));

-- Activity Log and Conflict Detection
-- Creates activity_log table for tracking user actions
-- Adds version field support for optimistic locking

-- =====================================================
-- ACTIVITY LOG TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Action details
  action TEXT NOT NULL,                    -- 'character.create', 'character.edit', 'session.create', etc.
  entity_type TEXT NOT NULL,               -- 'character', 'campaign', 'session', 'oneshot', 'share'
  entity_id UUID,                          -- ID of the affected entity
  entity_name TEXT,                        -- Display name for quick reference

  -- Change tracking
  changes JSONB,                           -- { field: { old: x, new: y } } for edits
  metadata JSONB,                          -- Extra context (IP, browser, etc.)

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action);
CREATE INDEX IF NOT EXISTS idx_activity_log_time ON activity_log(created_at DESC);

-- RLS policies
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Users can only see their own activity
CREATE POLICY "Users can view their own activity"
ON activity_log FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can insert their own activity
CREATE POLICY "Users can insert their own activity"
ON activity_log FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Comments
COMMENT ON TABLE activity_log IS 'Tracks user actions for audit trail and debugging';
COMMENT ON COLUMN activity_log.action IS 'Action type like character.create, session.edit, share.create';
COMMENT ON COLUMN activity_log.entity_type IS 'Type of entity: character, campaign, session, oneshot, share';
COMMENT ON COLUMN activity_log.changes IS 'JSON object tracking field changes: { field: { old, new } }';
COMMENT ON COLUMN activity_log.metadata IS 'Additional context like user agent, IP (hashed), etc.';

-- =====================================================
-- ADD VERSION FIELD TO KEY TABLES (for optimistic locking)
-- =====================================================

-- Add version to vault_characters if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vault_characters' AND column_name = 'version') THEN
    ALTER TABLE vault_characters ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
  END IF;
END $$;

-- Add version to campaigns if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'version') THEN
    ALTER TABLE campaigns ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
  END IF;
END $$;

-- Add version to sessions if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'version') THEN
    ALTER TABLE sessions ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
  END IF;
END $$;

-- Add version to oneshots if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'oneshots' AND column_name = 'version') THEN
    ALTER TABLE oneshots ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
  END IF;
END $$;

-- Add version to play_journal if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'play_journal' AND column_name = 'version') THEN
    ALTER TABLE play_journal ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
  END IF;
END $$;

-- Add version to characters (campaign characters) if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'characters' AND column_name = 'version') THEN
    ALTER TABLE characters ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
  END IF;
END $$;

-- Add version to canvas_groups if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'canvas_groups' AND column_name = 'version') THEN
    ALTER TABLE canvas_groups ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
  END IF;
END $$;

COMMENT ON COLUMN vault_characters.version IS 'Version number for optimistic locking - increments on each update';
COMMENT ON COLUMN campaigns.version IS 'Version number for optimistic locking - increments on each update';
COMMENT ON COLUMN sessions.version IS 'Version number for optimistic locking - increments on each update';
COMMENT ON COLUMN oneshots.version IS 'Version number for optimistic locking - increments on each update';
COMMENT ON COLUMN play_journal.version IS 'Version number for optimistic locking - increments on each update';
COMMENT ON COLUMN characters.version IS 'Version number for optimistic locking - increments on each update';
COMMENT ON COLUMN canvas_groups.version IS 'Version number for optimistic locking - increments on each update';

-- =====================================================
-- FUNCTION TO INCREMENT VERSION AND CHECK FOR CONFLICTS
-- =====================================================

-- Function to check if update is valid (no conflict)
CREATE OR REPLACE FUNCTION check_version_conflict(
  p_table TEXT,
  p_id UUID,
  p_expected_version INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  current_version INTEGER;
BEGIN
  EXECUTE format('SELECT version FROM %I WHERE id = $1', p_table)
  INTO current_version
  USING p_id;

  RETURN current_version IS NULL OR current_version = p_expected_version;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_version_conflict IS 'Returns true if the record version matches expected version (no conflict)';

-- Migration: Session-Quest Links
-- Tracks which quests were progressed/affected in each session
-- Links can be created manually, by Intelligence, or automatically on status change

-- Create session_quests join table
CREATE TABLE IF NOT EXISTS session_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  progress_type TEXT NOT NULL DEFAULT 'mentioned',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure unique session-quest pairs
  UNIQUE(session_id, quest_id),

  -- Validate progress type
  CONSTRAINT session_quests_progress_type_check
    CHECK (progress_type IN ('mentioned', 'started', 'progressed', 'completed', 'failed'))
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_session_quests_session_id ON session_quests(session_id);
CREATE INDEX IF NOT EXISTS idx_session_quests_quest_id ON session_quests(quest_id);

-- Enable RLS
ALTER TABLE session_quests ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Same access as sessions (campaign members can view, DM/owner can modify)

-- Select: Anyone who can view the session can view session_quests
CREATE POLICY "session_quests_select" ON session_quests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions s
      JOIN campaigns c ON s.campaign_id = c.id
      LEFT JOIN campaign_members cm ON c.id = cm.campaign_id
      WHERE s.id = session_quests.session_id
        AND (c.user_id = auth.uid() OR cm.user_id = auth.uid())
    )
  );

-- Insert: DM or owner can insert
CREATE POLICY "session_quests_insert" ON session_quests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions s
      JOIN campaigns c ON s.campaign_id = c.id
      LEFT JOIN campaign_members cm ON c.id = cm.campaign_id AND cm.user_id = auth.uid()
      WHERE s.id = session_quests.session_id
        AND (c.user_id = auth.uid() OR cm.role IN ('dm', 'co_dm'))
    )
  );

-- Update: DM or owner can update
CREATE POLICY "session_quests_update" ON session_quests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM sessions s
      JOIN campaigns c ON s.campaign_id = c.id
      LEFT JOIN campaign_members cm ON c.id = cm.campaign_id AND cm.user_id = auth.uid()
      WHERE s.id = session_quests.session_id
        AND (c.user_id = auth.uid() OR cm.role IN ('dm', 'co_dm'))
    )
  );

-- Delete: DM or owner can delete
CREATE POLICY "session_quests_delete" ON session_quests
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM sessions s
      JOIN campaigns c ON s.campaign_id = c.id
      LEFT JOIN campaign_members cm ON c.id = cm.campaign_id AND cm.user_id = auth.uid()
      WHERE s.id = session_quests.session_id
        AND (c.user_id = auth.uid() OR cm.role IN ('dm', 'co_dm'))
    )
  );

-- Add quest_session_link to suggestion types for Campaign Intelligence
-- Include ALL existing types to avoid constraint violations
ALTER TABLE intelligence_suggestions
  DROP CONSTRAINT IF EXISTS intelligence_suggestions_suggestion_type_check;

ALTER TABLE intelligence_suggestions
  ADD CONSTRAINT intelligence_suggestions_suggestion_type_check
  CHECK (suggestion_type IN (
    -- Campaign Intelligence types
    'status_change', 'secret_revealed', 'story_hook', 'quote', 'important_person',
    'relationship', 'timeline_event', 'completeness', 'consistency',
    'npc_detected', 'location_detected', 'quest_detected', 'encounter_detected',
    'quest_session_link', 'plot_hook', 'enrichment', 'timeline_issue', 'summary',
    'connection',
    -- Character Intelligence types
    'grammar', 'formatting', 'lore_conflict', 'redundancy',
    'voice_inconsistency', 'relationship_gap', 'secret_opportunity', 'cross_reference'
  ));

COMMENT ON TABLE session_quests IS 'Tracks which quests were progressed in each session. Links can be manual, from Intelligence, or auto-created on status change.';
COMMENT ON COLUMN session_quests.progress_type IS 'How the quest was affected: mentioned (referenced), started (status→active), progressed (worked on), completed (status→completed), failed (status→failed)';

-- ============================================
-- SESSION-ENCOUNTER LINKS (same pattern)
-- ============================================

CREATE TABLE IF NOT EXISTS session_encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  status_in_session TEXT NOT NULL DEFAULT 'used',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure unique session-encounter pairs
  UNIQUE(session_id, encounter_id),

  -- Validate status
  CONSTRAINT session_encounters_status_check
    CHECK (status_in_session IN ('planned', 'used', 'skipped'))
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_session_encounters_session_id ON session_encounters(session_id);
CREATE INDEX IF NOT EXISTS idx_session_encounters_encounter_id ON session_encounters(encounter_id);

-- Enable RLS
ALTER TABLE session_encounters ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Same access as sessions
CREATE POLICY "session_encounters_select" ON session_encounters
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions s
      JOIN campaigns c ON s.campaign_id = c.id
      LEFT JOIN campaign_members cm ON c.id = cm.campaign_id
      WHERE s.id = session_encounters.session_id
        AND (c.user_id = auth.uid() OR cm.user_id = auth.uid())
    )
  );

CREATE POLICY "session_encounters_insert" ON session_encounters
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions s
      JOIN campaigns c ON s.campaign_id = c.id
      LEFT JOIN campaign_members cm ON c.id = cm.campaign_id AND cm.user_id = auth.uid()
      WHERE s.id = session_encounters.session_id
        AND (c.user_id = auth.uid() OR cm.role IN ('dm', 'co_dm'))
    )
  );

CREATE POLICY "session_encounters_update" ON session_encounters
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM sessions s
      JOIN campaigns c ON s.campaign_id = c.id
      LEFT JOIN campaign_members cm ON c.id = cm.campaign_id AND cm.user_id = auth.uid()
      WHERE s.id = session_encounters.session_id
        AND (c.user_id = auth.uid() OR cm.role IN ('dm', 'co_dm'))
    )
  );

CREATE POLICY "session_encounters_delete" ON session_encounters
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM sessions s
      JOIN campaigns c ON s.campaign_id = c.id
      LEFT JOIN campaign_members cm ON c.id = cm.campaign_id AND cm.user_id = auth.uid()
      WHERE s.id = session_encounters.session_id
        AND (c.user_id = auth.uid() OR cm.role IN ('dm', 'co_dm'))
    )
  );

COMMENT ON TABLE session_encounters IS 'Tracks which encounters were used in each session.';
COMMENT ON COLUMN session_encounters.status_in_session IS 'How the encounter was used: planned (prepped for this session), used (actually ran), skipped (prepared but not used)';

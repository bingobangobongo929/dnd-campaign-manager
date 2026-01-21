-- Template System Migration
-- Introduces content modes (active/inactive/template) for all content types
-- Creates template_snapshots table for immutable published versions
-- Creates content_saves table for users to save templates to their collection

-- ============================================
-- PART 1: Add template fields to existing tables
-- ============================================

-- THREE content modes:
-- 'active' = currently being played (DEFAULT for existing content)
-- 'inactive' = completed/retired/paused (can be reactivated)
-- 'template' = Session 0 ready, shareable

-- =====================================================
-- CAMPAIGNS
-- =====================================================

-- Add content_mode column
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS content_mode TEXT NOT NULL DEFAULT 'active';

-- Add check constraint separately (can't use IF NOT EXISTS with constraints easily)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'campaigns_content_mode_check'
  ) THEN
    ALTER TABLE campaigns ADD CONSTRAINT campaigns_content_mode_check
      CHECK (content_mode IN ('template', 'active', 'inactive'));
  END IF;
END $$;

-- Template tracking fields
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS template_version INTEGER DEFAULT 1;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS saved_template_version INTEGER;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS is_session0_ready BOOLEAN DEFAULT FALSE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS template_description TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS template_tags TEXT[];
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS template_save_count INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS allow_save BOOLEAN DEFAULT FALSE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS attribution_name TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS inactive_reason TEXT;

-- Add comments for documentation
COMMENT ON COLUMN campaigns.content_mode IS 'Content state: active (playing), inactive (completed/retired), template (session 0 ready)';
COMMENT ON COLUMN campaigns.template_id IS 'If this was created from a template, references the original';
COMMENT ON COLUMN campaigns.template_version IS 'Current published version number (for templates)';
COMMENT ON COLUMN campaigns.saved_template_version IS 'Version number this was created from (if from template)';
COMMENT ON COLUMN campaigns.published_at IS 'When this was first published as a template';
COMMENT ON COLUMN campaigns.is_session0_ready IS 'Whether content is marked as ready for Session 0';
COMMENT ON COLUMN campaigns.template_description IS 'Description shown when sharing as template';
COMMENT ON COLUMN campaigns.template_tags IS 'Tags for template discovery (future marketplace)';
COMMENT ON COLUMN campaigns.template_save_count IS 'How many times this template has been saved';
COMMENT ON COLUMN campaigns.allow_save IS 'Whether viewers can save this template to their collection';
COMMENT ON COLUMN campaigns.attribution_name IS 'Creator name to show on derived content';
COMMENT ON COLUMN campaigns.inactive_reason IS 'Reason for inactive status: completed, on_hiatus, retired';

-- Index for filtering by content mode
CREATE INDEX IF NOT EXISTS idx_campaigns_content_mode ON campaigns(content_mode);
CREATE INDEX IF NOT EXISTS idx_campaigns_template_id ON campaigns(template_id);

-- =====================================================
-- VAULT CHARACTERS
-- =====================================================

-- Add content_mode column
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS content_mode TEXT NOT NULL DEFAULT 'active';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vault_characters_content_mode_check'
  ) THEN
    ALTER TABLE vault_characters ADD CONSTRAINT vault_characters_content_mode_check
      CHECK (content_mode IN ('template', 'active', 'inactive'));
  END IF;
END $$;

-- Template tracking fields
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES vault_characters(id) ON DELETE SET NULL;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS template_version INTEGER DEFAULT 1;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS saved_template_version INTEGER;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS is_session0_ready BOOLEAN DEFAULT FALSE;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS template_description TEXT;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS template_tags TEXT[];
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS template_save_count INTEGER DEFAULT 0;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS allow_save BOOLEAN DEFAULT FALSE;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS attribution_name TEXT;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS inactive_reason TEXT;

-- Comments
COMMENT ON COLUMN vault_characters.content_mode IS 'Content state: active (playing), inactive (retired/deceased), template (session 0 ready)';
COMMENT ON COLUMN vault_characters.inactive_reason IS 'Reason for inactive status: retired, deceased, on_hiatus';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vault_characters_content_mode ON vault_characters(content_mode);
CREATE INDEX IF NOT EXISTS idx_vault_characters_template_id ON vault_characters(template_id);

-- =====================================================
-- ONESHOTS
-- =====================================================

-- Add content_mode column
ALTER TABLE oneshots ADD COLUMN IF NOT EXISTS content_mode TEXT NOT NULL DEFAULT 'active';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'oneshots_content_mode_check'
  ) THEN
    ALTER TABLE oneshots ADD CONSTRAINT oneshots_content_mode_check
      CHECK (content_mode IN ('template', 'active', 'inactive'));
  END IF;
END $$;

-- Template tracking fields
ALTER TABLE oneshots ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES oneshots(id) ON DELETE SET NULL;
ALTER TABLE oneshots ADD COLUMN IF NOT EXISTS template_version INTEGER DEFAULT 1;
ALTER TABLE oneshots ADD COLUMN IF NOT EXISTS saved_template_version INTEGER;
ALTER TABLE oneshots ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE oneshots ADD COLUMN IF NOT EXISTS is_session0_ready BOOLEAN DEFAULT FALSE;
ALTER TABLE oneshots ADD COLUMN IF NOT EXISTS template_description TEXT;
ALTER TABLE oneshots ADD COLUMN IF NOT EXISTS template_tags TEXT[];
ALTER TABLE oneshots ADD COLUMN IF NOT EXISTS template_save_count INTEGER DEFAULT 0;
ALTER TABLE oneshots ADD COLUMN IF NOT EXISTS allow_save BOOLEAN DEFAULT FALSE;
ALTER TABLE oneshots ADD COLUMN IF NOT EXISTS attribution_name TEXT;
ALTER TABLE oneshots ADD COLUMN IF NOT EXISTS inactive_reason TEXT;

-- Comments
COMMENT ON COLUMN oneshots.content_mode IS 'Content state: active (planned/ready), inactive (completed/archived), template (session 0 ready)';
COMMENT ON COLUMN oneshots.inactive_reason IS 'Reason for inactive status: completed, archived';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_oneshots_content_mode ON oneshots(content_mode);
CREATE INDEX IF NOT EXISTS idx_oneshots_template_id ON oneshots(template_id);

-- ============================================
-- PART 2: Template snapshots (immutable published versions)
-- ============================================

-- When creator "publishes" a template, we snapshot the current state
-- This snapshot is immutable - creator can keep editing live template
-- Share links and saves reference specific snapshots

CREATE TABLE IF NOT EXISTS template_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- What content this is a snapshot of
  content_type TEXT NOT NULL CHECK (content_type IN ('campaign', 'character', 'oneshot')),
  content_id UUID NOT NULL,

  -- Version info
  version INTEGER NOT NULL DEFAULT 1,
  version_name TEXT,
  version_notes TEXT,

  -- The frozen content (complete serialized state)
  snapshot_data JSONB NOT NULL,
  related_data JSONB,

  -- Sharing settings (copied from content at publish time)
  allow_save BOOLEAN DEFAULT FALSE,
  attribution_name TEXT,
  template_description TEXT,
  template_tags TEXT[],

  -- Metrics
  save_count INTEGER DEFAULT 0,

  -- Timestamps
  published_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique version per content
  UNIQUE(content_type, content_id, version)
);

-- Comments
COMMENT ON TABLE template_snapshots IS 'Immutable snapshots of published template versions';
COMMENT ON COLUMN template_snapshots.version_name IS 'Optional friendly name like "v1.0" or "Holiday Update"';
COMMENT ON COLUMN template_snapshots.version_notes IS 'What changed in this version';
COMMENT ON COLUMN template_snapshots.snapshot_data IS 'Complete serialized content state (all fields)';
COMMENT ON COLUMN template_snapshots.related_data IS 'Related data: characters, relationships, images, etc.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_template_snapshots_content ON template_snapshots(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_template_snapshots_user ON template_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_template_snapshots_published ON template_snapshots(published_at DESC);

-- RLS for template_snapshots
ALTER TABLE template_snapshots ENABLE ROW LEVEL SECURITY;

-- Users can manage their own snapshots
DROP POLICY IF EXISTS "Users can manage own snapshots" ON template_snapshots;
CREATE POLICY "Users can manage own snapshots" ON template_snapshots
  FOR ALL USING (auth.uid() = user_id);

-- Anyone can view published snapshots (for share links)
DROP POLICY IF EXISTS "Anyone can view published snapshots" ON template_snapshots;
CREATE POLICY "Anyone can view published snapshots" ON template_snapshots
  FOR SELECT USING (true);

-- ============================================
-- PART 3: Content saves / attribution tracking
-- ============================================

-- Saves are REFERENCES to snapshots - no data copying until "Start Playing"
-- This is storage-efficient: saving = 1 row, playing = full copy

CREATE TABLE IF NOT EXISTS content_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Reference to the snapshot (NOT the live content)
  snapshot_id UUID NOT NULL REFERENCES template_snapshots(id) ON DELETE CASCADE,

  -- Denormalized for quick display (copied from snapshot at save time)
  source_type TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_image_url TEXT,
  source_owner_id UUID NOT NULL,
  saved_version INTEGER NOT NULL,

  -- Track if newer version exists
  latest_available_version INTEGER,
  update_available BOOLEAN DEFAULT FALSE,

  -- Created instance (when user "Start Playing" - this is when copying happens)
  instance_id UUID,
  started_playing_at TIMESTAMPTZ,

  -- Timestamps
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- User can only save each snapshot once
  UNIQUE(user_id, snapshot_id)
);

-- Comments
COMMENT ON TABLE content_saves IS 'User saves of template snapshots - references only, no content copying until Start Playing';
COMMENT ON COLUMN content_saves.snapshot_id IS 'Reference to the immutable template snapshot';
COMMENT ON COLUMN content_saves.source_type IS 'campaign, character, or oneshot';
COMMENT ON COLUMN content_saves.source_name IS 'Denormalized name for display';
COMMENT ON COLUMN content_saves.source_image_url IS 'Denormalized image URL for display';
COMMENT ON COLUMN content_saves.source_owner_id IS 'Creator user ID for attribution';
COMMENT ON COLUMN content_saves.saved_version IS 'Version number that was saved';
COMMENT ON COLUMN content_saves.latest_available_version IS 'Latest version available (for update detection)';
COMMENT ON COLUMN content_saves.update_available IS 'Flag for UI to show update notification';
COMMENT ON COLUMN content_saves.instance_id IS 'ID of created content when user clicks Start Playing';
COMMENT ON COLUMN content_saves.started_playing_at IS 'When user created their copy';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_content_saves_user ON content_saves(user_id);
CREATE INDEX IF NOT EXISTS idx_content_saves_snapshot ON content_saves(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_content_saves_owner ON content_saves(source_owner_id);
CREATE INDEX IF NOT EXISTS idx_content_saves_type ON content_saves(source_type);
CREATE INDEX IF NOT EXISTS idx_content_saves_update ON content_saves(user_id) WHERE update_available = true;

-- RLS for content_saves
ALTER TABLE content_saves ENABLE ROW LEVEL SECURITY;

-- Users can view their own saves
DROP POLICY IF EXISTS "Users can view own saves" ON content_saves;
CREATE POLICY "Users can view own saves" ON content_saves
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own saves
DROP POLICY IF EXISTS "Users can save content" ON content_saves;
CREATE POLICY "Users can save content" ON content_saves
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own saves (e.g., mark as started, update version)
DROP POLICY IF EXISTS "Users can update own saves" ON content_saves;
CREATE POLICY "Users can update own saves" ON content_saves
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own saves
DROP POLICY IF EXISTS "Users can remove own saves" ON content_saves;
CREATE POLICY "Users can remove own saves" ON content_saves
  FOR DELETE USING (auth.uid() = user_id);

-- Creators can view who saved their content (for stats)
DROP POLICY IF EXISTS "Creators can view saves of their content" ON content_saves;
CREATE POLICY "Creators can view saves of their content" ON content_saves
  FOR SELECT USING (auth.uid() = source_owner_id);

-- ============================================
-- PART 4: Add allow_save to share tables
-- ============================================

-- Campaign shares
ALTER TABLE campaign_shares ADD COLUMN IF NOT EXISTS allow_save BOOLEAN DEFAULT FALSE;
ALTER TABLE campaign_shares ADD COLUMN IF NOT EXISTS snapshot_version INTEGER;
COMMENT ON COLUMN campaign_shares.allow_save IS 'Whether viewers can save this share to their collection';
COMMENT ON COLUMN campaign_shares.snapshot_version IS 'Specific snapshot version to show (null = latest)';

-- Character shares
ALTER TABLE character_shares ADD COLUMN IF NOT EXISTS allow_save BOOLEAN DEFAULT FALSE;
ALTER TABLE character_shares ADD COLUMN IF NOT EXISTS snapshot_version INTEGER;
COMMENT ON COLUMN character_shares.allow_save IS 'Whether viewers can save this share to their collection';
COMMENT ON COLUMN character_shares.snapshot_version IS 'Specific snapshot version to show (null = latest)';

-- Oneshot shares
ALTER TABLE oneshot_shares ADD COLUMN IF NOT EXISTS allow_save BOOLEAN DEFAULT FALSE;
ALTER TABLE oneshot_shares ADD COLUMN IF NOT EXISTS snapshot_version INTEGER;
COMMENT ON COLUMN oneshot_shares.allow_save IS 'Whether viewers can save this share to their collection';
COMMENT ON COLUMN oneshot_shares.snapshot_version IS 'Specific snapshot version to show (null = latest)';

-- ============================================
-- PART 5: Helper functions
-- ============================================

-- Function to get the latest snapshot version for a piece of content
CREATE OR REPLACE FUNCTION get_latest_snapshot_version(
  p_content_type TEXT,
  p_content_id UUID
) RETURNS INTEGER AS $$
  SELECT COALESCE(MAX(version), 0)
  FROM template_snapshots
  WHERE content_type = p_content_type AND content_id = p_content_id;
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION get_latest_snapshot_version IS 'Returns the latest published snapshot version for a piece of content';

-- Function to check if a content item is a template
CREATE OR REPLACE FUNCTION is_template(
  p_content_type TEXT,
  p_content_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  IF p_content_type = 'campaign' THEN
    RETURN EXISTS (SELECT 1 FROM campaigns WHERE id = p_content_id AND content_mode = 'template');
  ELSIF p_content_type = 'character' THEN
    RETURN EXISTS (SELECT 1 FROM vault_characters WHERE id = p_content_id AND content_mode = 'template');
  ELSIF p_content_type = 'oneshot' THEN
    RETURN EXISTS (SELECT 1 FROM oneshots WHERE id = p_content_id AND content_mode = 'template');
  END IF;
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION is_template IS 'Checks if a content item is in template mode';

-- Function to increment save count when someone saves a template
CREATE OR REPLACE FUNCTION increment_template_save_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment the save_count on the snapshot
  UPDATE template_snapshots
  SET save_count = save_count + 1
  WHERE id = NEW.snapshot_id;

  -- Also increment on the source content
  IF NEW.source_type = 'campaign' THEN
    UPDATE campaigns
    SET template_save_count = template_save_count + 1
    WHERE id = (SELECT content_id FROM template_snapshots WHERE id = NEW.snapshot_id);
  ELSIF NEW.source_type = 'character' THEN
    UPDATE vault_characters
    SET template_save_count = template_save_count + 1
    WHERE id = (SELECT content_id FROM template_snapshots WHERE id = NEW.snapshot_id);
  ELSIF NEW.source_type = 'oneshot' THEN
    UPDATE oneshots
    SET template_save_count = template_save_count + 1
    WHERE id = (SELECT content_id FROM template_snapshots WHERE id = NEW.snapshot_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for incrementing save count
DROP TRIGGER IF EXISTS trigger_increment_save_count ON content_saves;
CREATE TRIGGER trigger_increment_save_count
  AFTER INSERT ON content_saves
  FOR EACH ROW
  EXECUTE FUNCTION increment_template_save_count();

-- Function to decrement save count when someone removes a save
CREATE OR REPLACE FUNCTION decrement_template_save_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Decrement the save_count on the snapshot
  UPDATE template_snapshots
  SET save_count = GREATEST(0, save_count - 1)
  WHERE id = OLD.snapshot_id;

  -- Also decrement on the source content
  IF OLD.source_type = 'campaign' THEN
    UPDATE campaigns
    SET template_save_count = GREATEST(0, template_save_count - 1)
    WHERE id = (SELECT content_id FROM template_snapshots WHERE id = OLD.snapshot_id);
  ELSIF OLD.source_type = 'character' THEN
    UPDATE vault_characters
    SET template_save_count = GREATEST(0, template_save_count - 1)
    WHERE id = (SELECT content_id FROM template_snapshots WHERE id = OLD.snapshot_id);
  ELSIF OLD.source_type = 'oneshot' THEN
    UPDATE oneshots
    SET template_save_count = GREATEST(0, template_save_count - 1)
    WHERE id = (SELECT content_id FROM template_snapshots WHERE id = OLD.snapshot_id);
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger for decrementing save count
DROP TRIGGER IF EXISTS trigger_decrement_save_count ON content_saves;
CREATE TRIGGER trigger_decrement_save_count
  AFTER DELETE ON content_saves
  FOR EACH ROW
  EXECUTE FUNCTION decrement_template_save_count();

-- Function to mark users' saves as having updates available
CREATE OR REPLACE FUNCTION notify_saves_of_new_version()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new snapshot is published, update all saves of previous versions
  UPDATE content_saves
  SET
    latest_available_version = NEW.version,
    update_available = true
  WHERE snapshot_id IN (
    SELECT id FROM template_snapshots
    WHERE content_type = NEW.content_type
    AND content_id = NEW.content_id
    AND version < NEW.version
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for notifying saves of new versions
DROP TRIGGER IF EXISTS trigger_notify_new_version ON template_snapshots;
CREATE TRIGGER trigger_notify_new_version
  AFTER INSERT ON template_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION notify_saves_of_new_version();

-- ============================================
-- PART 6: Version cleanup function
-- ============================================

-- Function to clean up unused old snapshots when a new version is published
-- Called manually or via scheduled job - not automatic to avoid data loss
CREATE OR REPLACE FUNCTION cleanup_unused_snapshots(
  p_content_type TEXT,
  p_content_id UUID,
  p_keep_latest_n INTEGER DEFAULT 1
) RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
  snapshot_record RECORD;
BEGIN
  -- Find snapshots that:
  -- 1. Belong to this content
  -- 2. Are not in the top N versions
  -- 3. Have zero saves
  FOR snapshot_record IN
    SELECT ts.id, ts.version
    FROM template_snapshots ts
    WHERE ts.content_type = p_content_type
    AND ts.content_id = p_content_id
    AND ts.version NOT IN (
      SELECT version FROM template_snapshots
      WHERE content_type = p_content_type
      AND content_id = p_content_id
      ORDER BY version DESC
      LIMIT p_keep_latest_n
    )
    AND ts.save_count = 0
  LOOP
    DELETE FROM template_snapshots WHERE id = snapshot_record.id;
    deleted_count := deleted_count + 1;
  END LOOP;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_unused_snapshots IS 'Removes old snapshots with zero saves, keeping the latest N versions';

-- ============================================
-- COMPLETE
-- ============================================

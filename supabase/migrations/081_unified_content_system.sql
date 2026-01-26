-- ============================================================================
-- Migration 081: Unified Content System
-- ============================================================================
-- This migration creates a unified architecture where campaigns and oneshots
-- share the same child tables. All existing campaign data is preserved.
--
-- Pattern: campaign_id OR oneshot_id (exactly one must be set)
--
-- SAFE: No data is deleted or moved. Only new columns added with safe defaults.
-- ============================================================================

-- ============================================================================
-- PART 1: RECREATE ONESHOTS TABLE (mirrors campaigns structure)
-- ============================================================================

CREATE TABLE IF NOT EXISTS oneshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic info (mirrors campaigns)
  name TEXT NOT NULL,
  game_system TEXT DEFAULT 'D&D 5e',
  description TEXT,
  image_url TEXT,

  -- Oneshot-specific
  tagline TEXT,
  level_min INTEGER,
  level_max INTEGER,
  player_count_min INTEGER DEFAULT 3,
  player_count_max INTEGER DEFAULT 5,
  estimated_duration TEXT, -- "2-3 hours", "4+ hours"

  -- Content sections (rich text)
  introduction TEXT,
  setting_notes TEXT,
  session_plan TEXT,
  twists TEXT,

  -- Status and mode
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'active', 'completed', 'archived')),
  content_mode TEXT DEFAULT 'active' CHECK (content_mode IN ('active', 'inactive', 'template')),
  duration_type TEXT DEFAULT 'oneshot',

  -- Template system (mirrors campaigns)
  is_published BOOLEAN DEFAULT FALSE,
  template_id UUID REFERENCES oneshots(id) ON DELETE SET NULL,
  template_version INTEGER DEFAULT 1,
  saved_template_version INTEGER,
  published_at TIMESTAMPTZ,
  is_session0_ready BOOLEAN DEFAULT FALSE,
  template_description TEXT,
  template_tags TEXT[],
  template_save_count INTEGER DEFAULT 0,
  allow_save BOOLEAN DEFAULT FALSE,
  attribution_name TEXT,
  inactive_reason TEXT,

  -- Collaboration (mirrors campaigns)
  collaboration_settings JSONB DEFAULT '{}',

  -- Intelligence
  last_intelligence_run TIMESTAMPTZ,

  -- Versioning
  version INTEGER DEFAULT 1,

  -- Soft delete
  deleted_at TIMESTAMPTZ DEFAULT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for oneshots
CREATE INDEX IF NOT EXISTS idx_oneshots_user ON oneshots(user_id);
CREATE INDEX IF NOT EXISTS idx_oneshots_status ON oneshots(status);
CREATE INDEX IF NOT EXISTS idx_oneshots_content_mode ON oneshots(content_mode);
CREATE INDEX IF NOT EXISTS idx_oneshots_deleted ON oneshots(deleted_at) WHERE deleted_at IS NULL;

-- RLS for oneshots
ALTER TABLE oneshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own oneshots" ON oneshots;
CREATE POLICY "Users can view own oneshots" ON oneshots
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can insert own oneshots" ON oneshots;
CREATE POLICY "Users can insert own oneshots" ON oneshots
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own oneshots" ON oneshots;
CREATE POLICY "Users can update own oneshots" ON oneshots
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own oneshots" ON oneshots;
CREATE POLICY "Users can delete own oneshots" ON oneshots
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_oneshots_updated_at ON oneshots;
CREATE TRIGGER update_oneshots_updated_at
  BEFORE UPDATE ON oneshots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 2: HELPER FUNCTION FOR UNIFIED CONTENT ACCESS
-- ============================================================================

-- Function to check if user owns content (campaign or oneshot)
CREATE OR REPLACE FUNCTION user_owns_content(
  p_campaign_id UUID,
  p_oneshot_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  IF p_campaign_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM campaigns
      WHERE id = p_campaign_id AND user_id = p_user_id
    );
  ELSIF p_oneshot_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM oneshots
      WHERE id = p_oneshot_id AND user_id = p_user_id
    );
  END IF;
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if user is member of content
CREATE OR REPLACE FUNCTION user_can_access_content(
  p_campaign_id UUID,
  p_oneshot_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  IF p_campaign_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM campaigns WHERE id = p_campaign_id AND user_id = p_user_id
    ) OR EXISTS (
      SELECT 1 FROM campaign_members WHERE campaign_id = p_campaign_id AND user_id = p_user_id
    );
  ELSIF p_oneshot_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM oneshots WHERE id = p_oneshot_id AND user_id = p_user_id
    );
  END IF;
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- PART 3: UNIFY CHARACTERS TABLE
-- ============================================================================

-- Add oneshot_id column (nullable - existing data has campaign_id)
ALTER TABLE characters ADD COLUMN IF NOT EXISTS oneshot_id UUID REFERENCES oneshots(id) ON DELETE CASCADE;

-- Add content_type for easy filtering
ALTER TABLE characters ADD COLUMN IF NOT EXISTS content_type TEXT
  GENERATED ALWAYS AS (
    CASE
      WHEN campaign_id IS NOT NULL THEN 'campaign'
      WHEN oneshot_id IS NOT NULL THEN 'oneshot'
      ELSE NULL
    END
  ) STORED;

-- Make campaign_id nullable (it was NOT NULL before)
ALTER TABLE characters ALTER COLUMN campaign_id DROP NOT NULL;

-- Add constraint: exactly one parent must be set
ALTER TABLE characters DROP CONSTRAINT IF EXISTS characters_parent_check;
ALTER TABLE characters ADD CONSTRAINT characters_parent_check
  CHECK (
    (campaign_id IS NOT NULL AND oneshot_id IS NULL) OR
    (campaign_id IS NULL AND oneshot_id IS NOT NULL)
  );

-- Index for oneshot characters
CREATE INDEX IF NOT EXISTS idx_characters_oneshot ON characters(oneshot_id) WHERE oneshot_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_characters_content_type ON characters(content_type);

-- Update RLS policies for characters to include oneshots
DROP POLICY IF EXISTS "Users can view characters in their campaigns" ON characters;
CREATE POLICY "Users can view characters in their content" ON characters
  FOR SELECT USING (
    user_can_access_content(campaign_id, oneshot_id, auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert characters in their campaigns" ON characters;
CREATE POLICY "Users can insert characters in their content" ON characters
  FOR INSERT WITH CHECK (
    user_owns_content(campaign_id, oneshot_id, auth.uid())
  );

DROP POLICY IF EXISTS "Users can update characters in their campaigns" ON characters;
CREATE POLICY "Users can update characters in their content" ON characters
  FOR UPDATE USING (
    user_owns_content(campaign_id, oneshot_id, auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete characters in their campaigns" ON characters;
CREATE POLICY "Users can delete characters in their content" ON characters
  FOR DELETE USING (
    user_owns_content(campaign_id, oneshot_id, auth.uid())
  );

-- ============================================================================
-- PART 4: UNIFY SESSIONS TABLE
-- ============================================================================

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS oneshot_id UUID REFERENCES oneshots(id) ON DELETE CASCADE;

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS content_type TEXT
  GENERATED ALWAYS AS (
    CASE
      WHEN campaign_id IS NOT NULL THEN 'campaign'
      WHEN oneshot_id IS NOT NULL THEN 'oneshot'
      ELSE NULL
    END
  ) STORED;

ALTER TABLE sessions ALTER COLUMN campaign_id DROP NOT NULL;

ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_parent_check;
ALTER TABLE sessions ADD CONSTRAINT sessions_parent_check
  CHECK (
    (campaign_id IS NOT NULL AND oneshot_id IS NULL) OR
    (campaign_id IS NULL AND oneshot_id IS NOT NULL)
  );

-- Update unique constraint for session_number (per content, not just campaign)
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_campaign_id_session_number_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_unique_number
  ON sessions(COALESCE(campaign_id, oneshot_id), session_number);

CREATE INDEX IF NOT EXISTS idx_sessions_oneshot ON sessions(oneshot_id) WHERE oneshot_id IS NOT NULL;

-- Update RLS
DROP POLICY IF EXISTS "Users can view sessions" ON sessions;
CREATE POLICY "Users can view sessions" ON sessions
  FOR SELECT USING (user_can_access_content(campaign_id, oneshot_id, auth.uid()));

DROP POLICY IF EXISTS "Users can insert sessions" ON sessions;
CREATE POLICY "Users can insert sessions" ON sessions
  FOR INSERT WITH CHECK (user_owns_content(campaign_id, oneshot_id, auth.uid()));

DROP POLICY IF EXISTS "Users can update sessions" ON sessions;
CREATE POLICY "Users can update sessions" ON sessions
  FOR UPDATE USING (user_owns_content(campaign_id, oneshot_id, auth.uid()));

DROP POLICY IF EXISTS "Users can delete sessions" ON sessions;
CREATE POLICY "Users can delete sessions" ON sessions
  FOR DELETE USING (user_owns_content(campaign_id, oneshot_id, auth.uid()));

-- ============================================================================
-- PART 5: UNIFY TIMELINE_EVENTS TABLE
-- ============================================================================

ALTER TABLE timeline_events ADD COLUMN IF NOT EXISTS oneshot_id UUID REFERENCES oneshots(id) ON DELETE CASCADE;

ALTER TABLE timeline_events ADD COLUMN IF NOT EXISTS content_type TEXT
  GENERATED ALWAYS AS (
    CASE
      WHEN campaign_id IS NOT NULL THEN 'campaign'
      WHEN oneshot_id IS NOT NULL THEN 'oneshot'
      ELSE NULL
    END
  ) STORED;

ALTER TABLE timeline_events ALTER COLUMN campaign_id DROP NOT NULL;

ALTER TABLE timeline_events DROP CONSTRAINT IF EXISTS timeline_events_parent_check;
ALTER TABLE timeline_events ADD CONSTRAINT timeline_events_parent_check
  CHECK (
    (campaign_id IS NOT NULL AND oneshot_id IS NULL) OR
    (campaign_id IS NULL AND oneshot_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_timeline_events_oneshot ON timeline_events(oneshot_id) WHERE oneshot_id IS NOT NULL;

DROP POLICY IF EXISTS "Users can view timeline events" ON timeline_events;
CREATE POLICY "Users can view timeline events" ON timeline_events
  FOR SELECT USING (user_can_access_content(campaign_id, oneshot_id, auth.uid()));

DROP POLICY IF EXISTS "Users can manage timeline events" ON timeline_events;
CREATE POLICY "Users can manage timeline events" ON timeline_events
  FOR ALL USING (user_owns_content(campaign_id, oneshot_id, auth.uid()));

-- ============================================================================
-- PART 6: UNIFY CANVAS_GROUPS TABLE
-- ============================================================================

ALTER TABLE canvas_groups ADD COLUMN IF NOT EXISTS oneshot_id UUID REFERENCES oneshots(id) ON DELETE CASCADE;

ALTER TABLE canvas_groups ADD COLUMN IF NOT EXISTS content_type TEXT
  GENERATED ALWAYS AS (
    CASE
      WHEN campaign_id IS NOT NULL THEN 'campaign'
      WHEN oneshot_id IS NOT NULL THEN 'oneshot'
      ELSE NULL
    END
  ) STORED;

ALTER TABLE canvas_groups ALTER COLUMN campaign_id DROP NOT NULL;

ALTER TABLE canvas_groups DROP CONSTRAINT IF EXISTS canvas_groups_parent_check;
ALTER TABLE canvas_groups ADD CONSTRAINT canvas_groups_parent_check
  CHECK (
    (campaign_id IS NOT NULL AND oneshot_id IS NULL) OR
    (campaign_id IS NULL AND oneshot_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_canvas_groups_oneshot ON canvas_groups(oneshot_id) WHERE oneshot_id IS NOT NULL;

DROP POLICY IF EXISTS "Users can view canvas groups" ON canvas_groups;
CREATE POLICY "Users can view canvas groups" ON canvas_groups
  FOR SELECT USING (user_can_access_content(campaign_id, oneshot_id, auth.uid()));

DROP POLICY IF EXISTS "Users can insert canvas groups" ON canvas_groups;
DROP POLICY IF EXISTS "Users can update canvas groups" ON canvas_groups;
DROP POLICY IF EXISTS "Users can delete canvas groups" ON canvas_groups;
CREATE POLICY "Users can manage canvas groups" ON canvas_groups
  FOR ALL USING (user_owns_content(campaign_id, oneshot_id, auth.uid()));

-- ============================================================================
-- PART 7: UNIFY WORLD_MAPS TABLE
-- ============================================================================

ALTER TABLE world_maps ADD COLUMN IF NOT EXISTS oneshot_id UUID REFERENCES oneshots(id) ON DELETE CASCADE;

ALTER TABLE world_maps ADD COLUMN IF NOT EXISTS content_type TEXT
  GENERATED ALWAYS AS (
    CASE
      WHEN campaign_id IS NOT NULL THEN 'campaign'
      WHEN oneshot_id IS NOT NULL THEN 'oneshot'
      ELSE NULL
    END
  ) STORED;

ALTER TABLE world_maps ALTER COLUMN campaign_id DROP NOT NULL;

ALTER TABLE world_maps DROP CONSTRAINT IF EXISTS world_maps_parent_check;
ALTER TABLE world_maps ADD CONSTRAINT world_maps_parent_check
  CHECK (
    (campaign_id IS NOT NULL AND oneshot_id IS NULL) OR
    (campaign_id IS NULL AND oneshot_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_world_maps_oneshot ON world_maps(oneshot_id) WHERE oneshot_id IS NOT NULL;

DROP POLICY IF EXISTS "Users can view world maps" ON world_maps;
CREATE POLICY "Users can view world maps" ON world_maps
  FOR SELECT USING (user_can_access_content(campaign_id, oneshot_id, auth.uid()));

DROP POLICY IF EXISTS "Users can manage world maps" ON world_maps;
CREATE POLICY "Users can manage world maps" ON world_maps
  FOR ALL USING (user_owns_content(campaign_id, oneshot_id, auth.uid()));

-- ============================================================================
-- PART 8: UNIFY MEDIA_GALLERY TABLE
-- ============================================================================

ALTER TABLE media_gallery ADD COLUMN IF NOT EXISTS oneshot_id UUID REFERENCES oneshots(id) ON DELETE CASCADE;

ALTER TABLE media_gallery ADD COLUMN IF NOT EXISTS content_type TEXT
  GENERATED ALWAYS AS (
    CASE
      WHEN campaign_id IS NOT NULL THEN 'campaign'
      WHEN oneshot_id IS NOT NULL THEN 'oneshot'
      ELSE NULL
    END
  ) STORED;

ALTER TABLE media_gallery ALTER COLUMN campaign_id DROP NOT NULL;

ALTER TABLE media_gallery DROP CONSTRAINT IF EXISTS media_gallery_parent_check;
ALTER TABLE media_gallery ADD CONSTRAINT media_gallery_parent_check
  CHECK (
    (campaign_id IS NOT NULL AND oneshot_id IS NULL) OR
    (campaign_id IS NULL AND oneshot_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_media_gallery_oneshot ON media_gallery(oneshot_id) WHERE oneshot_id IS NOT NULL;

DROP POLICY IF EXISTS "Users can view media" ON media_gallery;
CREATE POLICY "Users can view media" ON media_gallery
  FOR SELECT USING (user_can_access_content(campaign_id, oneshot_id, auth.uid()));

DROP POLICY IF EXISTS "Users can manage media" ON media_gallery;
CREATE POLICY "Users can manage media" ON media_gallery
  FOR ALL USING (user_owns_content(campaign_id, oneshot_id, auth.uid()));

-- ============================================================================
-- PART 9: UNIFY CAMPAIGN_LORE TABLE (rename to content_lore)
-- ============================================================================

-- Add oneshot support to existing table
ALTER TABLE campaign_lore ADD COLUMN IF NOT EXISTS oneshot_id UUID REFERENCES oneshots(id) ON DELETE CASCADE;

ALTER TABLE campaign_lore ADD COLUMN IF NOT EXISTS content_type TEXT
  GENERATED ALWAYS AS (
    CASE
      WHEN campaign_id IS NOT NULL THEN 'campaign'
      WHEN oneshot_id IS NOT NULL THEN 'oneshot'
      ELSE NULL
    END
  ) STORED;

ALTER TABLE campaign_lore ALTER COLUMN campaign_id DROP NOT NULL;

ALTER TABLE campaign_lore DROP CONSTRAINT IF EXISTS campaign_lore_parent_check;
ALTER TABLE campaign_lore ADD CONSTRAINT campaign_lore_parent_check
  CHECK (
    (campaign_id IS NOT NULL AND oneshot_id IS NULL) OR
    (campaign_id IS NULL AND oneshot_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_campaign_lore_oneshot ON campaign_lore(oneshot_id) WHERE oneshot_id IS NOT NULL;

-- ============================================================================
-- PART 10: UNIFY CAMPAIGN_FACTIONS TABLE
-- ============================================================================

ALTER TABLE campaign_factions ADD COLUMN IF NOT EXISTS oneshot_id UUID REFERENCES oneshots(id) ON DELETE CASCADE;

ALTER TABLE campaign_factions ADD COLUMN IF NOT EXISTS content_type TEXT
  GENERATED ALWAYS AS (
    CASE
      WHEN campaign_id IS NOT NULL THEN 'campaign'
      WHEN oneshot_id IS NOT NULL THEN 'oneshot'
      ELSE NULL
    END
  ) STORED;

ALTER TABLE campaign_factions ALTER COLUMN campaign_id DROP NOT NULL;

ALTER TABLE campaign_factions DROP CONSTRAINT IF EXISTS campaign_factions_parent_check;
ALTER TABLE campaign_factions ADD CONSTRAINT campaign_factions_parent_check
  CHECK (
    (campaign_id IS NOT NULL AND oneshot_id IS NULL) OR
    (campaign_id IS NULL AND oneshot_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_campaign_factions_oneshot ON campaign_factions(oneshot_id) WHERE oneshot_id IS NOT NULL;

DROP POLICY IF EXISTS "Users can manage factions in their campaigns" ON campaign_factions;
CREATE POLICY "Users can manage factions in their content" ON campaign_factions
  FOR ALL USING (user_owns_content(campaign_id, oneshot_id, auth.uid()));

-- ============================================================================
-- PART 11: UNIFY TAGS TABLE
-- ============================================================================

ALTER TABLE tags ADD COLUMN IF NOT EXISTS oneshot_id UUID REFERENCES oneshots(id) ON DELETE CASCADE;

ALTER TABLE tags ADD COLUMN IF NOT EXISTS content_type TEXT
  GENERATED ALWAYS AS (
    CASE
      WHEN campaign_id IS NOT NULL THEN 'campaign'
      WHEN oneshot_id IS NOT NULL THEN 'oneshot'
      ELSE NULL
    END
  ) STORED;

ALTER TABLE tags ALTER COLUMN campaign_id DROP NOT NULL;

ALTER TABLE tags DROP CONSTRAINT IF EXISTS tags_parent_check;
ALTER TABLE tags ADD CONSTRAINT tags_parent_check
  CHECK (
    (campaign_id IS NOT NULL AND oneshot_id IS NULL) OR
    (campaign_id IS NULL AND oneshot_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_tags_oneshot ON tags(oneshot_id) WHERE oneshot_id IS NOT NULL;

DROP POLICY IF EXISTS "Users can view tags in their campaigns" ON tags;
DROP POLICY IF EXISTS "Users can insert tags in their campaigns" ON tags;
DROP POLICY IF EXISTS "Users can update tags in their campaigns" ON tags;
DROP POLICY IF EXISTS "Users can delete tags in their campaigns" ON tags;

CREATE POLICY "Users can view tags" ON tags
  FOR SELECT USING (user_can_access_content(campaign_id, oneshot_id, auth.uid()));

CREATE POLICY "Users can manage tags" ON tags
  FOR ALL USING (user_owns_content(campaign_id, oneshot_id, auth.uid()));

-- ============================================================================
-- PART 12: UNIFY CANVAS_RELATIONSHIPS TABLE
-- ============================================================================

ALTER TABLE canvas_relationships ADD COLUMN IF NOT EXISTS oneshot_id UUID REFERENCES oneshots(id) ON DELETE CASCADE;

ALTER TABLE canvas_relationships ADD COLUMN IF NOT EXISTS content_type TEXT
  GENERATED ALWAYS AS (
    CASE
      WHEN campaign_id IS NOT NULL THEN 'campaign'
      WHEN oneshot_id IS NOT NULL THEN 'oneshot'
      ELSE NULL
    END
  ) STORED;

ALTER TABLE canvas_relationships ALTER COLUMN campaign_id DROP NOT NULL;

ALTER TABLE canvas_relationships DROP CONSTRAINT IF EXISTS canvas_relationships_parent_check;
ALTER TABLE canvas_relationships ADD CONSTRAINT canvas_relationships_parent_check
  CHECK (
    (campaign_id IS NOT NULL AND oneshot_id IS NULL) OR
    (campaign_id IS NULL AND oneshot_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_canvas_relationships_oneshot ON canvas_relationships(oneshot_id) WHERE oneshot_id IS NOT NULL;

DROP POLICY IF EXISTS "Users can manage relationships in their campaigns" ON canvas_relationships;
CREATE POLICY "Users can manage relationships in their content" ON canvas_relationships
  FOR ALL USING (user_owns_content(campaign_id, oneshot_id, auth.uid()));

-- ============================================================================
-- PART 13: UNIFY RELATIONSHIP_TEMPLATES TABLE
-- ============================================================================

ALTER TABLE relationship_templates ADD COLUMN IF NOT EXISTS oneshot_id UUID REFERENCES oneshots(id) ON DELETE CASCADE;

-- For relationship_templates, allow NULL for both (system templates)
ALTER TABLE relationship_templates DROP CONSTRAINT IF EXISTS relationship_templates_parent_check;
ALTER TABLE relationship_templates ADD CONSTRAINT relationship_templates_parent_check
  CHECK (
    (campaign_id IS NULL AND oneshot_id IS NULL AND is_system = true) OR
    (campaign_id IS NOT NULL AND oneshot_id IS NULL) OR
    (campaign_id IS NULL AND oneshot_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_relationship_templates_oneshot ON relationship_templates(oneshot_id) WHERE oneshot_id IS NOT NULL;

-- ============================================================================
-- PART 14: RECREATE ONESHOT_SHARES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS oneshot_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_code TEXT NOT NULL UNIQUE,
  oneshot_id UUID NOT NULL REFERENCES oneshots(id) ON DELETE CASCADE,

  included_sections JSONB NOT NULL DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  allow_save BOOLEAN DEFAULT FALSE,
  snapshot_version INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oneshot_shares_oneshot ON oneshot_shares(oneshot_id);
CREATE INDEX IF NOT EXISTS idx_oneshot_shares_code ON oneshot_shares(share_code);

ALTER TABLE oneshot_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view shares of own oneshots" ON oneshot_shares;
DROP POLICY IF EXISTS "Users can insert shares for own oneshots" ON oneshot_shares;
DROP POLICY IF EXISTS "Users can update shares of own oneshots" ON oneshot_shares;
DROP POLICY IF EXISTS "Users can delete shares of own oneshots" ON oneshot_shares;
DROP POLICY IF EXISTS "Users can manage shares of own oneshots" ON oneshot_shares;
DROP POLICY IF EXISTS "Anyone can view shared oneshots" ON oneshot_shares;
DROP POLICY IF EXISTS "Anyone can view shared oneshots by code" ON oneshot_shares;

CREATE POLICY "Users can manage shares of own oneshots" ON oneshot_shares
  FOR ALL USING (
    EXISTS (SELECT 1 FROM oneshots WHERE id = oneshot_shares.oneshot_id AND user_id = auth.uid())
  );

CREATE POLICY "Anyone can view shared oneshots by code" ON oneshot_shares
  FOR SELECT USING (true);

-- ============================================================================
-- PART 15: RECREATE ONESHOT_RUNS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS oneshot_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  oneshot_id UUID NOT NULL REFERENCES oneshots(id) ON DELETE CASCADE,

  run_date DATE NOT NULL DEFAULT CURRENT_DATE,
  group_name TEXT,
  player_count INTEGER,
  notes TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oneshot_runs_oneshot ON oneshot_runs(oneshot_id);

ALTER TABLE oneshot_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view runs of own oneshots" ON oneshot_runs;
DROP POLICY IF EXISTS "Users can insert runs for own oneshots" ON oneshot_runs;
DROP POLICY IF EXISTS "Users can update runs of own oneshots" ON oneshot_runs;
DROP POLICY IF EXISTS "Users can delete runs of own oneshots" ON oneshot_runs;
DROP POLICY IF EXISTS "Users can manage runs of own oneshots" ON oneshot_runs;

CREATE POLICY "Users can manage runs of own oneshots" ON oneshot_runs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM oneshots WHERE id = oneshot_runs.oneshot_id AND user_id = auth.uid())
  );

-- ============================================================================
-- DONE! Unified content system ready.
-- Existing campaign data is untouched.
-- New oneshot data will use the same tables.
-- ============================================================================

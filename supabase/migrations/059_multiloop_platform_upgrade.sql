-- =====================================================
-- MULTILOOP PLATFORM UPGRADE
-- Comprehensive migration for player collaboration,
-- AI admin panel, visual tools, and more
-- =====================================================

-- =====================================================
-- 1. CAMPAIGN MEMBERS (Player Collaboration)
-- =====================================================

CREATE TABLE IF NOT EXISTS campaign_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  discord_id TEXT,
  role TEXT NOT NULL CHECK (role IN ('owner', 'co_dm', 'player', 'contributor', 'guest')),
  permissions JSONB DEFAULT '{}',
  character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
  vault_character_id UUID REFERENCES vault_characters(id) ON DELETE SET NULL,
  invite_token TEXT UNIQUE,
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'removed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, user_id),
  UNIQUE(campaign_id, email)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_campaign_members_campaign ON campaign_members(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_members_user ON campaign_members(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_members_invite_token ON campaign_members(invite_token);
CREATE INDEX IF NOT EXISTS idx_campaign_members_email ON campaign_members(email);

-- =====================================================
-- 2. PLAYER SESSION NOTES
-- =====================================================

CREATE TABLE IF NOT EXISTS player_session_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
  added_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attributed_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'discord_import', 'player_submitted')),
  is_shared_with_party BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_session_notes_session ON player_session_notes(session_id);
CREATE INDEX IF NOT EXISTS idx_player_session_notes_character ON player_session_notes(character_id);

-- =====================================================
-- 3. ENTITY SECRETS (DM Notes & Visibility)
-- =====================================================

CREATE TABLE IF NOT EXISTS entity_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('character', 'session', 'timeline_event', 'lore', 'faction', 'location', 'artifact')),
  entity_id UUID NOT NULL,
  field_name TEXT,
  content TEXT,
  visibility TEXT DEFAULT 'dm_only' CHECK (visibility IN ('dm_only', 'party', 'public')),
  revealed_at TIMESTAMPTZ,
  revealed_in_session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entity_secrets_entity ON entity_secrets(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_secrets_visibility ON entity_secrets(visibility);

-- =====================================================
-- 4. MAP PINS (Interactive Maps)
-- =====================================================

CREATE TABLE IF NOT EXISTS map_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID NOT NULL,
  map_type TEXT NOT NULL CHECK (map_type IN ('campaign', 'oneshot')),
  x FLOAT NOT NULL,
  y FLOAT NOT NULL,
  label TEXT,
  description TEXT,
  icon TEXT DEFAULT 'marker',
  color TEXT DEFAULT '#8B5CF6',
  linked_entity_type TEXT,
  linked_entity_id UUID,
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('dm_only', 'party', 'public')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_map_pins_map ON map_pins(map_id, map_type);
CREATE INDEX IF NOT EXISTS idx_map_pins_linked ON map_pins(linked_entity_type, linked_entity_id);

-- =====================================================
-- 5. DASHBOARD LAYOUTS
-- =====================================================

CREATE TABLE IF NOT EXISTS dashboard_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  layout JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, campaign_id)
);

CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_user_campaign ON dashboard_layouts(user_id, campaign_id);

-- =====================================================
-- 6. ONESHOT STRUCTURED NPCS
-- =====================================================

CREATE TABLE IF NOT EXISTS oneshot_npcs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  oneshot_id UUID NOT NULL REFERENCES oneshots(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  appearance TEXT,
  personality TEXT,
  motivation TEXT,
  stat_block TEXT,
  external_link TEXT,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oneshot_npcs_oneshot ON oneshot_npcs(oneshot_id);

-- =====================================================
-- 7. ONESHOT STRUCTURED ENCOUNTERS
-- =====================================================

CREATE TABLE IF NOT EXISTS oneshot_encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  oneshot_id UUID NOT NULL REFERENCES oneshots(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  difficulty TEXT CHECK (difficulty IN ('trivial', 'easy', 'medium', 'hard', 'deadly')),
  enemies JSONB DEFAULT '[]',
  tactics TEXT,
  terrain TEXT,
  rewards TEXT,
  map_id UUID,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oneshot_encounters_oneshot ON oneshot_encounters(oneshot_id);

-- =====================================================
-- 8. ONESHOT STRUCTURED LOCATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS oneshot_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  oneshot_id UUID NOT NULL REFERENCES oneshots(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  features TEXT,
  connected_locations UUID[],
  map_id UUID,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oneshot_locations_oneshot ON oneshot_locations(oneshot_id);

-- =====================================================
-- 9. CHARACTER SNAPSHOTS (Session 0)
-- =====================================================

CREATE TABLE IF NOT EXISTS character_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_character_id UUID REFERENCES vault_characters(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  campaign_character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
  snapshot_data JSONB NOT NULL,
  snapshot_type TEXT DEFAULT 'session_0' CHECK (snapshot_type IN ('session_0', 'milestone', 'manual')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_character_snapshots_vault ON character_snapshots(vault_character_id);
CREATE INDEX IF NOT EXISTS idx_character_snapshots_campaign ON character_snapshots(campaign_id);

-- =====================================================
-- 10. AI USAGE LOGS
-- =====================================================

CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL,
  model_used TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_usd DECIMAL(10,6),
  duration_ms INTEGER,
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'error', 'cancelled')),
  error_message TEXT,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  character_id UUID,
  oneshot_id UUID REFERENCES oneshots(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user ON ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_operation ON ai_usage_logs(operation_type);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created ON ai_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_status ON ai_usage_logs(status);

-- =====================================================
-- 11. AI COOLDOWNS
-- =====================================================

CREATE TABLE IF NOT EXISTS ai_cooldowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cooldown_type TEXT NOT NULL,
  entity_id UUID,
  last_run_at TIMESTAMPTZ NOT NULL,
  next_available_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, cooldown_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_cooldowns_user ON ai_cooldowns(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_cooldowns_lookup ON ai_cooldowns(user_id, cooldown_type, entity_id);

-- =====================================================
-- 12. AI SUGGESTION FEEDBACK
-- =====================================================

CREATE TABLE IF NOT EXISTS ai_suggestion_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_log_id UUID REFERENCES ai_usage_logs(id) ON DELETE SET NULL,
  suggestion_type TEXT NOT NULL,
  suggestion_content TEXT,
  action_taken TEXT NOT NULL CHECK (action_taken IN ('accepted', 'edited', 'dismissed')),
  feedback TEXT CHECK (feedback IN ('positive', 'negative')),
  edit_details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_suggestion_feedback_user ON ai_suggestion_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestion_feedback_type ON ai_suggestion_feedback(suggestion_type);
CREATE INDEX IF NOT EXISTS idx_ai_suggestion_feedback_action ON ai_suggestion_feedback(action_taken);

-- =====================================================
-- 13. IMPORT SESSIONS (Funnel Tracking)
-- =====================================================

CREATE TABLE IF NOT EXISTS import_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  import_type TEXT NOT NULL CHECK (import_type IN ('pdf', 'image', 'text', 'structured')),
  target_type TEXT NOT NULL,
  status TEXT DEFAULT 'started' CHECK (status IN ('started', 'parsed', 'reviewed', 'saved', 'cancelled', 'error')),
  usage_log_id UUID REFERENCES ai_usage_logs(id) ON DELETE SET NULL,
  file_size_bytes INTEGER,
  file_name TEXT,
  parse_duration_ms INTEGER,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  parsed_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_sessions_user ON import_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_import_sessions_status ON import_sessions(status);
CREATE INDEX IF NOT EXISTS idx_import_sessions_created ON import_sessions(created_at);

-- =====================================================
-- 14. AI TIER SETTINGS (Admin Configurable)
-- =====================================================

CREATE TABLE IF NOT EXISTS ai_tier_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier TEXT NOT NULL UNIQUE,
  campaign_intelligence_cooldown_hours INTEGER DEFAULT 12,
  character_intelligence_cooldown_hours INTEGER DEFAULT 12,
  import_limit_per_day INTEGER,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Insert default tier settings
INSERT INTO ai_tier_settings (tier, campaign_intelligence_cooldown_hours, character_intelligence_cooldown_hours, import_limit_per_day, description)
VALUES
  ('free', 48, 48, NULL, 'Free tier users'),
  ('founder', 12, 12, NULL, 'Founder tier users (early adopters)'),
  ('pro', 6, 6, NULL, 'Pro tier users')
ON CONFLICT (tier) DO UPDATE SET
  campaign_intelligence_cooldown_hours = EXCLUDED.campaign_intelligence_cooldown_hours,
  character_intelligence_cooldown_hours = EXCLUDED.character_intelligence_cooldown_hours;

-- =====================================================
-- 15. USER GUIDANCE TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS user_guidance_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dismissed_tips JSONB DEFAULT '[]',
  seen_tooltips JSONB DEFAULT '[]',
  completed_onboarding JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_guidance_state_user ON user_guidance_state(user_id);

-- =====================================================
-- 16. EXISTING TABLE MODIFICATIONS
-- =====================================================

-- Campaigns: Add collaboration settings
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS collaboration_settings JSONB DEFAULT '{}';

-- Characters: Add visibility, ownership, and vault linking
ALTER TABLE characters ADD COLUMN IF NOT EXISTS dm_notes TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public';
ALTER TABLE characters ADD COLUMN IF NOT EXISTS vault_character_id UUID REFERENCES vault_characters(id) ON DELETE SET NULL;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS controlled_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS controlled_by_email TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS controlled_by_discord TEXT;

-- Vault Characters: Add campaign tracking
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS campaign_links JSONB DEFAULT '[]';

-- Sessions: Add workflow fields
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS phase TEXT DEFAULT 'planned';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS prep_checklist JSONB DEFAULT '[]';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS thoughts_for_next TEXT;

-- Timeline Events: Add DM notes and visibility
ALTER TABLE timeline_events ADD COLUMN IF NOT EXISTS dm_notes TEXT;
ALTER TABLE timeline_events ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public';

-- Oneshots: Add structured content flags and present mode fields
ALTER TABLE oneshots ADD COLUMN IF NOT EXISTS has_structured_npcs BOOLEAN DEFAULT false;
ALTER TABLE oneshots ADD COLUMN IF NOT EXISTS has_structured_encounters BOOLEAN DEFAULT false;
ALTER TABLE oneshots ADD COLUMN IF NOT EXISTS has_structured_locations BOOLEAN DEFAULT false;
ALTER TABLE oneshots ADD COLUMN IF NOT EXISTS scene_checklist JSONB DEFAULT '[]';

-- World Maps: Add fog of war and layer support
ALTER TABLE world_maps ADD COLUMN IF NOT EXISTS fog_of_war JSONB DEFAULT '{}';
ALTER TABLE world_maps ADD COLUMN IF NOT EXISTS layers JSONB DEFAULT '[]';

-- =====================================================
-- 17. LORE TABLES: Add DM notes and visibility
-- =====================================================

-- campaign_factions: Add DM notes and visibility
ALTER TABLE campaign_factions ADD COLUMN IF NOT EXISTS dm_notes TEXT;
ALTER TABLE campaign_factions ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public';

-- campaign_lore: Add DM notes and visibility (covers locations, artifacts, etc.)
ALTER TABLE campaign_lore ADD COLUMN IF NOT EXISTS dm_notes TEXT;
ALTER TABLE campaign_lore ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public';

-- =====================================================
-- 18. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Campaign Members RLS
ALTER TABLE campaign_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view campaign members for campaigns they belong to"
ON campaign_members FOR SELECT
USING (
  user_id = auth.uid()
  OR campaign_id IN (
    SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid()
  )
  OR campaign_id IN (
    SELECT id FROM campaigns WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Campaign owners can manage members"
ON campaign_members FOR ALL
USING (
  campaign_id IN (
    SELECT id FROM campaigns WHERE user_id = auth.uid()
  )
  OR campaign_id IN (
    SELECT campaign_id FROM campaign_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'co_dm')
  )
);

-- Player Session Notes RLS
ALTER TABLE player_session_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view session notes for campaigns they belong to"
ON player_session_notes FOR SELECT
USING (
  added_by_user_id = auth.uid()
  OR session_id IN (
    SELECT s.id FROM sessions s
    JOIN campaigns c ON s.campaign_id = c.id
    WHERE c.user_id = auth.uid()
  )
  OR session_id IN (
    SELECT s.id FROM sessions s
    JOIN campaign_members cm ON s.campaign_id = cm.campaign_id
    WHERE cm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can add their own session notes"
ON player_session_notes FOR INSERT
WITH CHECK (added_by_user_id = auth.uid());

CREATE POLICY "Users can update their own session notes"
ON player_session_notes FOR UPDATE
USING (added_by_user_id = auth.uid());

CREATE POLICY "DMs can manage all session notes in their campaigns"
ON player_session_notes FOR ALL
USING (
  session_id IN (
    SELECT s.id FROM sessions s
    JOIN campaigns c ON s.campaign_id = c.id
    WHERE c.user_id = auth.uid()
  )
);

-- Entity Secrets RLS
ALTER TABLE entity_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only campaign owners can manage secrets"
ON entity_secrets FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM campaigns c
    WHERE c.user_id = auth.uid()
    AND (
      entity_type = 'character' AND entity_id IN (SELECT id FROM characters WHERE campaign_id = c.id)
      OR entity_type = 'session' AND entity_id IN (SELECT id FROM sessions WHERE campaign_id = c.id)
      OR entity_type = 'timeline_event' AND entity_id IN (SELECT id FROM timeline_events WHERE campaign_id = c.id)
    )
  )
);

-- Dashboard Layouts RLS
ALTER TABLE dashboard_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own dashboard layouts"
ON dashboard_layouts FOR ALL
USING (user_id = auth.uid());

-- Map Pins RLS
ALTER TABLE map_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pins for campaigns they have access to"
ON map_pins FOR SELECT
USING (
  map_type = 'campaign' AND map_id IN (
    SELECT wm.id FROM world_maps wm
    JOIN campaigns c ON wm.campaign_id = c.id
    WHERE c.user_id = auth.uid()
    OR c.id IN (SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid())
  )
  OR map_type = 'oneshot' AND map_id IN (
    SELECT id FROM oneshots WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Campaign owners can manage pins"
ON map_pins FOR ALL
USING (
  map_type = 'campaign' AND map_id IN (
    SELECT wm.id FROM world_maps wm
    JOIN campaigns c ON wm.campaign_id = c.id
    WHERE c.user_id = auth.uid()
  )
  OR map_type = 'oneshot' AND map_id IN (
    SELECT id FROM oneshots WHERE user_id = auth.uid()
  )
);

-- Oneshot NPCs RLS
ALTER TABLE oneshot_npcs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own oneshot NPCs"
ON oneshot_npcs FOR ALL
USING (oneshot_id IN (SELECT id FROM oneshots WHERE user_id = auth.uid()));

CREATE POLICY "Users can view published oneshot NPCs"
ON oneshot_npcs FOR SELECT
USING (oneshot_id IN (SELECT id FROM oneshots WHERE is_published = true));

-- Oneshot Encounters RLS
ALTER TABLE oneshot_encounters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own oneshot encounters"
ON oneshot_encounters FOR ALL
USING (oneshot_id IN (SELECT id FROM oneshots WHERE user_id = auth.uid()));

CREATE POLICY "Users can view published oneshot encounters"
ON oneshot_encounters FOR SELECT
USING (oneshot_id IN (SELECT id FROM oneshots WHERE is_published = true));

-- Oneshot Locations RLS
ALTER TABLE oneshot_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own oneshot locations"
ON oneshot_locations FOR ALL
USING (oneshot_id IN (SELECT id FROM oneshots WHERE user_id = auth.uid()));

CREATE POLICY "Users can view published oneshot locations"
ON oneshot_locations FOR SELECT
USING (oneshot_id IN (SELECT id FROM oneshots WHERE is_published = true));

-- Character Snapshots RLS
ALTER TABLE character_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own character snapshots"
ON character_snapshots FOR SELECT
USING (
  vault_character_id IN (SELECT id FROM vault_characters WHERE user_id = auth.uid())
  OR campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid())
);

CREATE POLICY "Users can create snapshots for their characters"
ON character_snapshots FOR INSERT
WITH CHECK (
  vault_character_id IN (SELECT id FROM vault_characters WHERE user_id = auth.uid())
  OR campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid())
);

-- AI Usage Logs RLS
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI usage"
ON ai_usage_logs FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all AI usage"
ON ai_usage_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_settings
    WHERE user_id = auth.uid()
    AND role IN ('moderator', 'super_admin')
  )
);

CREATE POLICY "System can insert AI usage logs"
ON ai_usage_logs FOR INSERT
WITH CHECK (true);

-- AI Cooldowns RLS
ALTER TABLE ai_cooldowns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cooldowns"
ON ai_cooldowns FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "System can manage cooldowns"
ON ai_cooldowns FOR ALL
USING (true);

-- AI Suggestion Feedback RLS
ALTER TABLE ai_suggestion_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own feedback"
ON ai_suggestion_feedback FOR ALL
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all feedback"
ON ai_suggestion_feedback FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_settings
    WHERE user_id = auth.uid()
    AND role IN ('moderator', 'super_admin')
  )
);

-- Import Sessions RLS
ALTER TABLE import_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own import sessions"
ON import_sessions FOR ALL
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all import sessions"
ON import_sessions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_settings
    WHERE user_id = auth.uid()
    AND role IN ('moderator', 'super_admin')
  )
);

-- AI Tier Settings RLS
ALTER TABLE ai_tier_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tier settings"
ON ai_tier_settings FOR SELECT
USING (true);

CREATE POLICY "Only admins can modify tier settings"
ON ai_tier_settings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_settings
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  )
);

-- User Guidance State RLS
ALTER TABLE user_guidance_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own guidance state"
ON user_guidance_state FOR ALL
USING (user_id = auth.uid());

-- =====================================================
-- 19. HELPER FUNCTIONS
-- =====================================================

-- Function to check if user is campaign member
CREATE OR REPLACE FUNCTION is_campaign_member(p_campaign_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM campaign_members
    WHERE campaign_id = p_campaign_id
    AND user_id = p_user_id
    AND status = 'active'
  ) OR EXISTS (
    SELECT 1 FROM campaigns
    WHERE id = p_campaign_id
    AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is campaign owner or co-DM
CREATE OR REPLACE FUNCTION is_campaign_dm(p_campaign_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM campaigns
    WHERE id = p_campaign_id
    AND user_id = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM campaign_members
    WHERE campaign_id = p_campaign_id
    AND user_id = p_user_id
    AND role IN ('owner', 'co_dm')
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's AI cooldown status
CREATE OR REPLACE FUNCTION get_ai_cooldown_status(
  p_user_id UUID,
  p_cooldown_type TEXT,
  p_entity_id UUID DEFAULT NULL
)
RETURNS TABLE (
  is_on_cooldown BOOLEAN,
  next_available_at TIMESTAMPTZ,
  seconds_remaining INTEGER
) AS $$
DECLARE
  v_cooldown RECORD;
  v_tier TEXT;
  v_cooldown_hours INTEGER;
BEGIN
  -- Get user's tier
  SELECT tier INTO v_tier FROM user_settings WHERE user_id = p_user_id;
  v_tier := COALESCE(v_tier, 'free');

  -- Get cooldown hours for this tier
  SELECT
    CASE
      WHEN p_cooldown_type = 'campaign_intelligence' THEN campaign_intelligence_cooldown_hours
      WHEN p_cooldown_type = 'character_intelligence' THEN character_intelligence_cooldown_hours
      ELSE 12
    END INTO v_cooldown_hours
  FROM ai_tier_settings
  WHERE tier = v_tier;

  v_cooldown_hours := COALESCE(v_cooldown_hours, 12);

  -- Check existing cooldown
  SELECT * INTO v_cooldown
  FROM ai_cooldowns
  WHERE ai_cooldowns.user_id = p_user_id
  AND ai_cooldowns.cooldown_type = p_cooldown_type
  AND (p_entity_id IS NULL OR ai_cooldowns.entity_id = p_entity_id);

  IF v_cooldown IS NULL OR v_cooldown.next_available_at <= NOW() THEN
    RETURN QUERY SELECT false, NULL::TIMESTAMPTZ, 0;
  ELSE
    RETURN QUERY SELECT
      true,
      v_cooldown.next_available_at,
      EXTRACT(EPOCH FROM (v_cooldown.next_available_at - NOW()))::INTEGER;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set AI cooldown
CREATE OR REPLACE FUNCTION set_ai_cooldown(
  p_user_id UUID,
  p_cooldown_type TEXT,
  p_entity_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_tier TEXT;
  v_cooldown_hours INTEGER;
BEGIN
  -- Get user's tier
  SELECT tier INTO v_tier FROM user_settings WHERE user_id = p_user_id;
  v_tier := COALESCE(v_tier, 'free');

  -- Get cooldown hours for this tier
  SELECT
    CASE
      WHEN p_cooldown_type = 'campaign_intelligence' THEN campaign_intelligence_cooldown_hours
      WHEN p_cooldown_type = 'character_intelligence' THEN character_intelligence_cooldown_hours
      ELSE 12
    END INTO v_cooldown_hours
  FROM ai_tier_settings
  WHERE tier = v_tier;

  v_cooldown_hours := COALESCE(v_cooldown_hours, 12);

  -- Upsert cooldown
  INSERT INTO ai_cooldowns (user_id, cooldown_type, entity_id, last_run_at, next_available_at)
  VALUES (p_user_id, p_cooldown_type, p_entity_id, NOW(), NOW() + (v_cooldown_hours || ' hours')::INTERVAL)
  ON CONFLICT (user_id, cooldown_type, entity_id)
  DO UPDATE SET
    last_run_at = NOW(),
    next_available_at = NOW() + (v_cooldown_hours || ' hours')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 20. TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Generic updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to new tables
DROP TRIGGER IF EXISTS update_campaign_members_updated_at ON campaign_members;
CREATE TRIGGER update_campaign_members_updated_at
  BEFORE UPDATE ON campaign_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_player_session_notes_updated_at ON player_session_notes;
CREATE TRIGGER update_player_session_notes_updated_at
  BEFORE UPDATE ON player_session_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_entity_secrets_updated_at ON entity_secrets;
CREATE TRIGGER update_entity_secrets_updated_at
  BEFORE UPDATE ON entity_secrets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_map_pins_updated_at ON map_pins;
CREATE TRIGGER update_map_pins_updated_at
  BEFORE UPDATE ON map_pins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_dashboard_layouts_updated_at ON dashboard_layouts;
CREATE TRIGGER update_dashboard_layouts_updated_at
  BEFORE UPDATE ON dashboard_layouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_oneshot_npcs_updated_at ON oneshot_npcs;
CREATE TRIGGER update_oneshot_npcs_updated_at
  BEFORE UPDATE ON oneshot_npcs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_oneshot_encounters_updated_at ON oneshot_encounters;
CREATE TRIGGER update_oneshot_encounters_updated_at
  BEFORE UPDATE ON oneshot_encounters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_oneshot_locations_updated_at ON oneshot_locations;
CREATE TRIGGER update_oneshot_locations_updated_at
  BEFORE UPDATE ON oneshot_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_guidance_state_updated_at ON user_guidance_state;
CREATE TRIGGER update_user_guidance_state_updated_at
  BEFORE UPDATE ON user_guidance_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 21. AUTO-CREATE OWNER AS CAMPAIGN MEMBER
-- =====================================================

-- When a campaign is created, automatically add owner as member
CREATE OR REPLACE FUNCTION auto_add_campaign_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO campaign_members (campaign_id, user_id, role, status, joined_at)
  VALUES (NEW.id, NEW.user_id, 'owner', 'active', NOW())
  ON CONFLICT (campaign_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_add_campaign_owner_trigger ON campaigns;
CREATE TRIGGER auto_add_campaign_owner_trigger
  AFTER INSERT ON campaigns
  FOR EACH ROW EXECUTE FUNCTION auto_add_campaign_owner();

-- Add existing campaign owners to campaign_members
INSERT INTO campaign_members (campaign_id, user_id, role, status, joined_at)
SELECT id, user_id, 'owner', 'active', created_at
FROM campaigns
WHERE user_id IS NOT NULL
ON CONFLICT (campaign_id, user_id) DO NOTHING;

-- =====================================================
-- 22. COMMENTS
-- =====================================================

COMMENT ON TABLE campaign_members IS 'Tracks campaign membership and player access';
COMMENT ON TABLE player_session_notes IS 'Player perspective notes for sessions';
COMMENT ON TABLE entity_secrets IS 'DM-only notes and visibility controls for entities';
COMMENT ON TABLE map_pins IS 'Interactive map pins with entity linking';
COMMENT ON TABLE dashboard_layouts IS 'User-customized campaign dashboard layouts';
COMMENT ON TABLE oneshot_npcs IS 'Structured NPC data for oneshots';
COMMENT ON TABLE oneshot_encounters IS 'Structured encounter data for oneshots';
COMMENT ON TABLE oneshot_locations IS 'Structured location data for oneshots';
COMMENT ON TABLE character_snapshots IS 'Session 0 and milestone snapshots of characters';
COMMENT ON TABLE ai_usage_logs IS 'Tracks all AI API usage for cost and analytics';
COMMENT ON TABLE ai_cooldowns IS 'Tracks AI feature cooldowns per user';
COMMENT ON TABLE ai_suggestion_feedback IS 'Tracks user feedback on AI suggestions';
COMMENT ON TABLE import_sessions IS 'Tracks import funnel for analytics';
COMMENT ON TABLE ai_tier_settings IS 'Admin-configurable AI limits per tier';
COMMENT ON TABLE user_guidance_state IS 'Tracks tutorial/guidance progress per user';

COMMENT ON FUNCTION is_campaign_member IS 'Checks if user is a member of a campaign';
COMMENT ON FUNCTION is_campaign_dm IS 'Checks if user is owner or co-DM of a campaign';
COMMENT ON FUNCTION get_ai_cooldown_status IS 'Gets current AI cooldown status for a user';
COMMENT ON FUNCTION set_ai_cooldown IS 'Sets AI cooldown after running intelligence';

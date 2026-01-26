-- ============================================================================
-- Migration 082: Unified Locations, Quests, and Encounters
-- ============================================================================
-- Creates new unified tables that work for campaigns AND oneshots from day 1.
-- Uses the same pattern: campaign_id OR oneshot_id (exactly one set)
-- ============================================================================

-- ============================================================================
-- PART 1: LOCATIONS TABLE (Hierarchical)
-- ============================================================================

CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Parent reference (unified pattern)
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  oneshot_id UUID REFERENCES oneshots(id) ON DELETE CASCADE,
  content_type TEXT GENERATED ALWAYS AS (
    CASE
      WHEN campaign_id IS NOT NULL THEN 'campaign'
      WHEN oneshot_id IS NOT NULL THEN 'oneshot'
      ELSE NULL
    END
  ) STORED,

  -- Core fields
  name TEXT NOT NULL,
  type TEXT DEFAULT 'Location', -- City, Tavern, Dungeon, etc.
  description TEXT,
  summary TEXT, -- One-line for lists
  image_url TEXT,

  -- Hierarchy
  parent_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  display_order INTEGER DEFAULT 0,

  -- Map integration
  map_id UUID REFERENCES world_maps(id) ON DELETE SET NULL,
  map_pin_x FLOAT,
  map_pin_y FLOAT,
  has_own_map BOOLEAN DEFAULT FALSE,

  -- Settlement fields (nullable)
  population INTEGER,
  government TEXT,
  economy TEXT,
  defenses TEXT,

  -- Geography fields (nullable)
  climate TEXT,
  terrain TEXT,
  resources TEXT,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'destroyed', 'abandoned', 'hidden', 'unknown')),
  discovered_session INTEGER,
  visibility TEXT DEFAULT 'dm_only' CHECK (visibility IN ('dm_only', 'party', 'public')),

  -- Notes
  dm_notes TEXT,
  secrets TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: exactly one parent type
  CONSTRAINT locations_parent_check CHECK (
    (campaign_id IS NOT NULL AND oneshot_id IS NULL) OR
    (campaign_id IS NULL AND oneshot_id IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_locations_campaign ON locations(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_locations_oneshot ON locations(oneshot_id) WHERE oneshot_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_locations_parent ON locations(parent_location_id);
CREATE INDEX IF NOT EXISTS idx_locations_map ON locations(map_id) WHERE map_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_locations_type ON locations(type);

-- RLS
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view locations" ON locations
  FOR SELECT USING (user_can_access_content(campaign_id, oneshot_id, auth.uid()));

CREATE POLICY "Users can manage locations" ON locations
  FOR ALL USING (user_owns_content(campaign_id, oneshot_id, auth.uid()));

-- Trigger
DROP TRIGGER IF EXISTS update_locations_updated_at ON locations;
CREATE TRIGGER update_locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 2: CHARACTER-LOCATION ASSOCIATIONS
-- ============================================================================

-- Add location fields to characters table
ALTER TABLE characters ADD COLUMN IF NOT EXISTS current_location_id UUID REFERENCES locations(id) ON DELETE SET NULL;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS home_location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_characters_current_location ON characters(current_location_id) WHERE current_location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_characters_home_location ON characters(home_location_id) WHERE home_location_id IS NOT NULL;

-- More complex associations (lives_at, works_at, owns, etc.)
CREATE TABLE IF NOT EXISTS character_location_associations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,

  relationship_type TEXT NOT NULL CHECK (relationship_type IN (
    'lives_at', 'works_at', 'owns', 'guards', 'rules',
    'born_at', 'died_at', 'imprisoned_at', 'frequent_visitor', 'other'
  )),

  notes TEXT,
  is_current BOOLEAN DEFAULT TRUE,
  start_session INTEGER,
  end_session INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(character_id, location_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_char_loc_assoc_character ON character_location_associations(character_id);
CREATE INDEX IF NOT EXISTS idx_char_loc_assoc_location ON character_location_associations(location_id);

ALTER TABLE character_location_associations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage character location associations" ON character_location_associations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM characters c
      WHERE c.id = character_location_associations.character_id
      AND user_owns_content(c.campaign_id, c.oneshot_id, auth.uid())
    )
  );

-- ============================================================================
-- PART 3: QUESTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Parent reference (unified pattern)
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  oneshot_id UUID REFERENCES oneshots(id) ON DELETE CASCADE,
  content_type TEXT GENERATED ALWAYS AS (
    CASE
      WHEN campaign_id IS NOT NULL THEN 'campaign'
      WHEN oneshot_id IS NOT NULL THEN 'oneshot'
      ELSE NULL
    END
  ) STORED,

  -- Core fields
  name TEXT NOT NULL,
  type TEXT DEFAULT 'side_quest' CHECK (type IN (
    'main_quest', 'side_quest', 'personal', 'faction', 'plot_thread', 'rumor'
  )),
  description TEXT,
  summary TEXT,

  -- Status
  status TEXT DEFAULT 'available' CHECK (status IN (
    'available', 'active', 'completed', 'failed', 'abandoned'
  )),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

  -- Organization
  parent_quest_id UUID REFERENCES quests(id) ON DELETE SET NULL,
  display_order INTEGER DEFAULT 0,

  -- Quest giver
  quest_giver_id UUID REFERENCES characters(id) ON DELETE SET NULL,
  quest_giver_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,

  -- Objective location
  objective_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,

  -- Rewards
  rewards_description TEXT,
  rewards_xp INTEGER,
  rewards_gold INTEGER,

  -- Consequences
  success_outcome TEXT,
  failure_outcome TEXT,
  time_limit TEXT,

  -- Session tracking
  discovered_session INTEGER,
  started_session INTEGER,
  completed_session INTEGER,

  -- Visibility
  visibility TEXT DEFAULT 'party' CHECK (visibility IN ('dm_only', 'party', 'public')),

  -- Notes
  dm_notes TEXT,
  secrets TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint
  CONSTRAINT quests_parent_check CHECK (
    (campaign_id IS NOT NULL AND oneshot_id IS NULL) OR
    (campaign_id IS NULL AND oneshot_id IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quests_campaign ON quests(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quests_oneshot ON quests(oneshot_id) WHERE oneshot_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quests_status ON quests(status);
CREATE INDEX IF NOT EXISTS idx_quests_type ON quests(type);
CREATE INDEX IF NOT EXISTS idx_quests_quest_giver ON quests(quest_giver_id) WHERE quest_giver_id IS NOT NULL;

-- RLS
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view quests" ON quests
  FOR SELECT USING (user_can_access_content(campaign_id, oneshot_id, auth.uid()));

CREATE POLICY "Users can manage quests" ON quests
  FOR ALL USING (user_owns_content(campaign_id, oneshot_id, auth.uid()));

-- Trigger
DROP TRIGGER IF EXISTS update_quests_updated_at ON quests;
CREATE TRIGGER update_quests_updated_at
  BEFORE UPDATE ON quests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 4: QUEST OBJECTIVES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS quest_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,

  description TEXT NOT NULL,
  is_optional BOOLEAN DEFAULT FALSE,
  is_completed BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,

  -- Links
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  target_character_id UUID REFERENCES characters(id) ON DELETE SET NULL,

  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quest_objectives_quest ON quest_objectives(quest_id);

ALTER TABLE quest_objectives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage quest objectives" ON quest_objectives
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM quests q
      WHERE q.id = quest_objectives.quest_id
      AND user_owns_content(q.campaign_id, q.oneshot_id, auth.uid())
    )
  );

-- ============================================================================
-- PART 5: QUEST-CHARACTER ASSOCIATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS quest_characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,

  role TEXT CHECK (role IN ('target', 'helper', 'obstacle', 'informant', 'other')),
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(quest_id, character_id)
);

CREATE INDEX IF NOT EXISTS idx_quest_characters_quest ON quest_characters(quest_id);
CREATE INDEX IF NOT EXISTS idx_quest_characters_character ON quest_characters(character_id);

ALTER TABLE quest_characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage quest characters" ON quest_characters
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM quests q
      WHERE q.id = quest_characters.quest_id
      AND user_owns_content(q.campaign_id, q.oneshot_id, auth.uid())
    )
  );

-- ============================================================================
-- PART 6: ENCOUNTERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Parent reference (unified pattern)
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  oneshot_id UUID REFERENCES oneshots(id) ON DELETE CASCADE,
  content_type TEXT GENERATED ALWAYS AS (
    CASE
      WHEN campaign_id IS NOT NULL THEN 'campaign'
      WHEN oneshot_id IS NOT NULL THEN 'oneshot'
      ELSE NULL
    END
  ) STORED,

  -- Core fields
  name TEXT NOT NULL,
  type TEXT DEFAULT 'combat' CHECK (type IN (
    'combat', 'social', 'exploration', 'trap', 'skill_challenge', 'puzzle', 'mixed'
  )),
  description TEXT,
  summary TEXT,

  -- Difficulty (for combat)
  difficulty TEXT CHECK (difficulty IN ('trivial', 'easy', 'medium', 'hard', 'deadly')),
  party_level INTEGER,

  -- Combat specifics
  enemies JSONB DEFAULT '[]', -- [{name, count, hp, ac, notes}]
  tactics TEXT,
  terrain TEXT,

  -- Social specifics
  stakes TEXT,
  npc_goals TEXT,

  -- Rewards
  rewards TEXT,
  xp_reward INTEGER,

  -- Location/Map
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  map_id UUID REFERENCES world_maps(id) ON DELETE SET NULL,

  -- Organization
  quest_id UUID REFERENCES quests(id) ON DELETE SET NULL,
  display_order INTEGER DEFAULT 0,

  -- Session tracking
  planned_session INTEGER,
  played_session INTEGER,
  status TEXT DEFAULT 'prepared' CHECK (status IN ('prepared', 'used', 'skipped', 'modified')),

  -- Post-encounter
  outcome TEXT,
  player_notes TEXT,
  lessons_learned TEXT,

  -- Read-aloud
  boxed_text TEXT,

  -- Visibility
  visibility TEXT DEFAULT 'dm_only' CHECK (visibility IN ('dm_only', 'party', 'public')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint
  CONSTRAINT encounters_parent_check CHECK (
    (campaign_id IS NOT NULL AND oneshot_id IS NULL) OR
    (campaign_id IS NULL AND oneshot_id IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_encounters_campaign ON encounters(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_encounters_oneshot ON encounters(oneshot_id) WHERE oneshot_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_encounters_status ON encounters(status);
CREATE INDEX IF NOT EXISTS idx_encounters_type ON encounters(type);
CREATE INDEX IF NOT EXISTS idx_encounters_location ON encounters(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_encounters_quest ON encounters(quest_id) WHERE quest_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_encounters_planned_session ON encounters(planned_session) WHERE planned_session IS NOT NULL;

-- RLS
ALTER TABLE encounters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view encounters" ON encounters
  FOR SELECT USING (user_can_access_content(campaign_id, oneshot_id, auth.uid()));

CREATE POLICY "Users can manage encounters" ON encounters
  FOR ALL USING (user_owns_content(campaign_id, oneshot_id, auth.uid()));

-- Trigger
DROP TRIGGER IF EXISTS update_encounters_updated_at ON encounters;
CREATE TRIGGER update_encounters_updated_at
  BEFORE UPDATE ON encounters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 7: ENCOUNTER CREATURES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS encounter_creatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,

  -- Option A: Link to character
  character_id UUID REFERENCES characters(id) ON DELETE SET NULL,

  -- Option B: Simple creature entry
  name TEXT,
  count INTEGER DEFAULT 1,
  hit_points INTEGER,
  armor_class INTEGER,
  notes TEXT,

  -- Role
  role TEXT DEFAULT 'enemy' CHECK (role IN ('enemy', 'ally', 'neutral', 'hazard')),

  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_encounter_creatures_encounter ON encounter_creatures(encounter_id);
CREATE INDEX IF NOT EXISTS idx_encounter_creatures_character ON encounter_creatures(character_id) WHERE character_id IS NOT NULL;

ALTER TABLE encounter_creatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage encounter creatures" ON encounter_creatures
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM encounters e
      WHERE e.id = encounter_creatures.encounter_id
      AND user_owns_content(e.campaign_id, e.oneshot_id, auth.uid())
    )
  );

-- ============================================================================
-- PART 8: ADD LOCATION FIELD TO SESSIONS
-- ============================================================================

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_location ON sessions(location_id) WHERE location_id IS NOT NULL;

-- ============================================================================
-- PART 9: LINK MAP PINS TO LOCATIONS
-- ============================================================================

ALTER TABLE map_pins ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_map_pins_location ON map_pins(location_id) WHERE location_id IS NOT NULL;

-- ============================================================================
-- DONE! Unified locations, quests, and encounters ready.
-- ============================================================================

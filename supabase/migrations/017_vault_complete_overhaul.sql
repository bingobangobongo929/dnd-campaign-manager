-- =====================================================
-- VAULT CHARACTER SYSTEM COMPLETE OVERHAUL
-- Migration 017 - Comprehensive Schema Enhancement
-- =====================================================
-- This migration transforms the vault into a complete
-- character management system with:
-- - Full physical appearance tracking
-- - Multi-image support per character
-- - First-class NPC profiles
-- - Relational character links
-- - Location tracking
-- - Character snapshots/versioning
-- - Spell tracking
-- - Character Intelligence support
-- =====================================================

-- =====================================================
-- PART 1: ENHANCE vault_characters TABLE
-- =====================================================

-- Rename 'description' to 'backstory' for clarity
-- (Keep description as alias for backwards compatibility)
ALTER TABLE vault_characters
  ADD COLUMN IF NOT EXISTS backstory TEXT;

-- Copy existing description to backstory if backstory is null
UPDATE vault_characters SET backstory = description WHERE backstory IS NULL AND description IS NOT NULL;

-- ----- PHYSICAL APPEARANCE -----
ALTER TABLE vault_characters
  ADD COLUMN IF NOT EXISTS height TEXT,
  ADD COLUMN IF NOT EXISTS weight TEXT,
  ADD COLUMN IF NOT EXISTS hair TEXT,
  ADD COLUMN IF NOT EXISTS eyes TEXT,
  ADD COLUMN IF NOT EXISTS skin TEXT,
  ADD COLUMN IF NOT EXISTS voice TEXT,
  ADD COLUMN IF NOT EXISTS distinguishing_marks TEXT,
  ADD COLUMN IF NOT EXISTS typical_attire TEXT;

-- ----- IDENTITY & CLASS -----
ALTER TABLE vault_characters
  ADD COLUMN IF NOT EXISTS subclass TEXT,
  ADD COLUMN IF NOT EXISTS level INTEGER,
  ADD COLUMN IF NOT EXISTS alignment TEXT,
  ADD COLUMN IF NOT EXISTS deity TEXT,
  ADD COLUMN IF NOT EXISTS faceclaim TEXT,
  ADD COLUMN IF NOT EXISTS voice_claim TEXT;

-- Change age from INTEGER to TEXT (allows "appears 25, actually 300")
ALTER TABLE vault_characters
  ALTER COLUMN age TYPE TEXT USING age::TEXT;

-- ----- PERSONALITY EXPANSION -----
ALTER TABLE vault_characters
  ADD COLUMN IF NOT EXISTS ideals TEXT,
  ADD COLUMN IF NOT EXISTS bonds TEXT,
  ADD COLUMN IF NOT EXISTS flaws TEXT,
  ADD COLUMN IF NOT EXISTS mannerisms TEXT,
  ADD COLUMN IF NOT EXISTS speech_patterns TEXT,
  ADD COLUMN IF NOT EXISTS motivations TEXT;

-- ----- CAMPAIGN & PARTY CONTEXT -----
ALTER TABLE vault_characters
  ADD COLUMN IF NOT EXISTS linked_campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS party_name TEXT,
  ADD COLUMN IF NOT EXISTS party_role TEXT,
  ADD COLUMN IF NOT EXISTS player_name TEXT,
  ADD COLUMN IF NOT EXISTS joined_session INTEGER,
  ADD COLUMN IF NOT EXISTS retired_session INTEGER;

-- ----- ORGANIZATION -----
ALTER TABLE vault_characters
  ADD COLUMN IF NOT EXISTS folder TEXT,
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- ----- PRIVACY & SHARING -----
ALTER TABLE vault_characters
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private', -- private, party, public
  ADD COLUMN IF NOT EXISTS dm_notes TEXT,
  ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_comments BOOLEAN DEFAULT false;

-- ----- GAME MECHANICS (Optional) -----
ALTER TABLE vault_characters
  ADD COLUMN IF NOT EXISTS ability_scores JSONB, -- {str: 10, dex: 14, con: 12, int: 8, wis: 15, cha: 13}
  ADD COLUMN IF NOT EXISTS hit_points JSONB,     -- {current: 45, max: 52, temp: 0}
  ADD COLUMN IF NOT EXISTS armor_class INTEGER,
  ADD COLUMN IF NOT EXISTS speed TEXT,           -- "30 ft, fly 60 ft"
  ADD COLUMN IF NOT EXISTS proficiencies JSONB,  -- {skills: [], tools: [], weapons: [], armor: [], saving_throws: []}
  ADD COLUMN IF NOT EXISTS languages TEXT[],
  ADD COLUMN IF NOT EXISTS saving_throws TEXT[],
  ADD COLUMN IF NOT EXISTS resistances TEXT[],
  ADD COLUMN IF NOT EXISTS immunities TEXT[],
  ADD COLUMN IF NOT EXISTS vulnerabilities TEXT[];

-- ----- CREATIVE & AESTHETIC -----
ALTER TABLE vault_characters
  ADD COLUMN IF NOT EXISTS aesthetic_tags TEXT[],
  ADD COLUMN IF NOT EXISTS color_palette TEXT[], -- Hex codes
  ADD COLUMN IF NOT EXISTS spotify_playlist TEXT,
  ADD COLUMN IF NOT EXISTS pinterest_board TEXT,
  ADD COLUMN IF NOT EXISTS art_references JSONB; -- [{url, description, artist}]

-- ----- BACKSTORY STRUCTURE -----
ALTER TABLE vault_characters
  ADD COLUMN IF NOT EXISTS backstory_phases JSONB, -- [{title: "Early Life", content: "..."}]
  ADD COLUMN IF NOT EXISTS origin_location TEXT;

-- ----- STORY & ARCS -----
ALTER TABLE vault_characters
  ADD COLUMN IF NOT EXISTS story_arcs JSONB,  -- [{title, status: ongoing/completed/abandoned, description}]
  ADD COLUMN IF NOT EXISTS factions JSONB;    -- [{name, rank, status: active/former/enemy}]

-- ----- COMPANIONS (separate from relationships) -----
ALTER TABLE vault_characters
  ADD COLUMN IF NOT EXISTS companions JSONB;  -- [{name, type, description, abilities, image_url}]

-- ----- POSSESSIONS (enhanced items) -----
ALTER TABLE vault_characters
  ADD COLUMN IF NOT EXISTS possessions JSONB; -- [{name, type, description, significance, acquired, image_url}]

-- ----- CHARACTER INTELLIGENCE -----
ALTER TABLE vault_characters
  ADD COLUMN IF NOT EXISTS last_intelligence_run TIMESTAMPTZ;

-- ----- NPC-SPECIFIC FIELDS -----
ALTER TABLE vault_characters
  ADD COLUMN IF NOT EXISTS npc_role TEXT,           -- Antagonist, ally, shopkeeper, quest-giver
  ADD COLUMN IF NOT EXISTS first_appearance TEXT,   -- When/where they first appeared
  ADD COLUMN IF NOT EXISTS location TEXT,           -- Where they can usually be found
  ADD COLUMN IF NOT EXISTS disposition TEXT,        -- Friendly, hostile, neutral, unknown
  ADD COLUMN IF NOT EXISTS occupation TEXT;

-- Create indexes for new searchable fields
CREATE INDEX IF NOT EXISTS idx_vault_characters_folder ON vault_characters(folder);
CREATE INDEX IF NOT EXISTS idx_vault_characters_visibility ON vault_characters(visibility);
CREATE INDEX IF NOT EXISTS idx_vault_characters_is_archived ON vault_characters(is_archived);
CREATE INDEX IF NOT EXISTS idx_vault_characters_is_favorite ON vault_characters(is_favorite);
CREATE INDEX IF NOT EXISTS idx_vault_characters_share_token ON vault_characters(share_token);
CREATE INDEX IF NOT EXISTS idx_vault_characters_linked_campaign ON vault_characters(linked_campaign_id);
CREATE INDEX IF NOT EXISTS idx_vault_characters_party_name ON vault_characters(party_name);

-- =====================================================
-- PART 2: CREATE vault_character_images TABLE
-- =====================================================
-- Multiple images per character with types and metadata

CREATE TABLE IF NOT EXISTS vault_character_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES vault_characters(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_type TEXT DEFAULT 'portrait', -- portrait, full_body, bust, scene, token, art, reference
  caption TEXT,
  artist_credit TEXT,
  artist_url TEXT,
  is_primary BOOLEAN DEFAULT false,
  is_ai_generated BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure only one primary image per character
CREATE UNIQUE INDEX IF NOT EXISTS idx_vault_character_images_primary
  ON vault_character_images(character_id)
  WHERE is_primary = true;

CREATE INDEX IF NOT EXISTS idx_vault_character_images_character ON vault_character_images(character_id);
CREATE INDEX IF NOT EXISTS idx_vault_character_images_user ON vault_character_images(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_character_images_type ON vault_character_images(image_type);

-- RLS for vault_character_images
ALTER TABLE vault_character_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own character images"
  ON vault_character_images FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own character images"
  ON vault_character_images FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own character images"
  ON vault_character_images FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own character images"
  ON vault_character_images FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE vault_character_images IS 'Multiple images per vault character with types, captions, and artist credits';

-- =====================================================
-- PART 3: CREATE vault_character_relationships TABLE
-- =====================================================
-- Links between vault characters (PC to NPC, family, etc.)

CREATE TABLE IF NOT EXISTS vault_character_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES vault_characters(id) ON DELETE CASCADE,
  related_character_id UUID REFERENCES vault_characters(id) ON DELETE CASCADE,
  -- For NPCs without full profiles, store inline
  related_name TEXT,
  related_image_url TEXT,
  relationship_type TEXT NOT NULL, -- family, mentor, friend, enemy, romantic, patron, rival, ally, employer, servant, other
  relationship_label TEXT,         -- "Father", "Mysterious Patron", custom label
  description TEXT,                -- How they know each other, history
  from_perspective TEXT,           -- How character_id views them
  to_perspective TEXT,             -- How related views character (optional)
  relationship_status TEXT DEFAULT 'active', -- active, estranged, deceased, complicated, unknown
  is_known BOOLEAN DEFAULT true,   -- Does the PC know this connection? (for DM secrets)
  is_mutual BOOLEAN DEFAULT true,  -- Auto-create reverse relationship?
  first_met TEXT,                  -- When/where they first met
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prevent duplicate relationships
CREATE UNIQUE INDEX IF NOT EXISTS idx_vault_relationships_unique
  ON vault_character_relationships(character_id, related_character_id)
  WHERE related_character_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vault_relationships_character ON vault_character_relationships(character_id);
CREATE INDEX IF NOT EXISTS idx_vault_relationships_related ON vault_character_relationships(related_character_id);
CREATE INDEX IF NOT EXISTS idx_vault_relationships_type ON vault_character_relationships(relationship_type);
CREATE INDEX IF NOT EXISTS idx_vault_relationships_user ON vault_character_relationships(user_id);

-- RLS for vault_character_relationships
ALTER TABLE vault_character_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own character relationships"
  ON vault_character_relationships FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own character relationships"
  ON vault_character_relationships FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own character relationships"
  ON vault_character_relationships FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own character relationships"
  ON vault_character_relationships FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE vault_character_relationships IS 'Relationships between vault characters - supports both linked characters and inline NPCs';

-- =====================================================
-- PART 4: CREATE vault_locations TABLE
-- =====================================================
-- Important places in character stories

CREATE TABLE IF NOT EXISTS vault_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location_type TEXT DEFAULT 'other', -- city, town, village, tavern, dungeon, temple, home, wilderness, plane, ship, other
  description TEXT,
  image_url TEXT,
  campaign_name TEXT,                  -- Which campaign/world this belongs to
  game_system TEXT,
  parent_location_id UUID REFERENCES vault_locations(id) ON DELETE SET NULL,
  notable_features TEXT,
  dangers TEXT,
  inhabitants TEXT,
  notes TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vault_locations_user ON vault_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_locations_type ON vault_locations(location_type);
CREATE INDEX IF NOT EXISTS idx_vault_locations_parent ON vault_locations(parent_location_id);
CREATE INDEX IF NOT EXISTS idx_vault_locations_campaign ON vault_locations(campaign_name);

-- RLS for vault_locations
ALTER TABLE vault_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own locations"
  ON vault_locations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own locations"
  ON vault_locations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own locations"
  ON vault_locations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own locations"
  ON vault_locations FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE vault_locations IS 'Important places in character stories with hierarchy support';

-- =====================================================
-- PART 5: CREATE vault_character_locations TABLE
-- =====================================================
-- Junction table linking characters to locations

CREATE TABLE IF NOT EXISTS vault_character_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES vault_characters(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES vault_locations(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL, -- birthplace, home, workplace, hangout, imprisoned, died, visited, owns
  significance TEXT,          -- Why this place matters to the character
  notes TEXT,
  time_period TEXT,           -- "Childhood", "Currently", "Sessions 1-5"
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vault_character_locations_unique
  ON vault_character_locations(character_id, location_id, relationship);

CREATE INDEX IF NOT EXISTS idx_vault_character_locations_character ON vault_character_locations(character_id);
CREATE INDEX IF NOT EXISTS idx_vault_character_locations_location ON vault_character_locations(location_id);

-- RLS through character ownership
ALTER TABLE vault_character_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their character locations"
  ON vault_character_locations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM vault_characters
      WHERE vault_characters.id = vault_character_locations.character_id
      AND vault_characters.user_id = auth.uid()
    )
  );

COMMENT ON TABLE vault_character_locations IS 'Links characters to important locations with relationship context';

-- =====================================================
-- PART 6: CREATE vault_character_snapshots TABLE
-- =====================================================
-- Point-in-time saves of character state

CREATE TABLE IF NOT EXISTS vault_character_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES vault_characters(id) ON DELETE CASCADE,
  snapshot_name TEXT NOT NULL, -- "Session 1", "Level 5", "Post-Curse", "Before Death"
  snapshot_type TEXT DEFAULT 'manual', -- manual, auto, milestone, session
  level_at_snapshot INTEGER,
  snapshot_data JSONB NOT NULL, -- Full character state
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vault_snapshots_character ON vault_character_snapshots(character_id);
CREATE INDEX IF NOT EXISTS idx_vault_snapshots_user ON vault_character_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_snapshots_type ON vault_character_snapshots(snapshot_type);

-- RLS for snapshots
ALTER TABLE vault_character_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own snapshots"
  ON vault_character_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own snapshots"
  ON vault_character_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own snapshots"
  ON vault_character_snapshots FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own snapshots"
  ON vault_character_snapshots FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE vault_character_snapshots IS 'Point-in-time saves of character state for tracking evolution';

-- =====================================================
-- PART 7: CREATE vault_character_spells TABLE
-- =====================================================
-- Spell tracking for casters

CREATE TABLE IF NOT EXISTS vault_character_spells (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES vault_characters(id) ON DELETE CASCADE,
  spell_name TEXT NOT NULL,
  spell_level INTEGER NOT NULL DEFAULT 0, -- 0 for cantrips
  spell_school TEXT, -- Evocation, Necromancy, etc.
  source TEXT, -- "Class", "Racial", "Item", "Feat"
  source_detail TEXT, -- "Wizard", "Tiefling", "Staff of Fire"
  is_prepared BOOLEAN DEFAULT false,
  is_ritual BOOLEAN DEFAULT false,
  is_concentration BOOLEAN DEFAULT false,
  casting_time TEXT,
  range TEXT,
  components TEXT, -- "V, S, M (a pinch of dust)"
  duration TEXT,
  description TEXT,
  notes TEXT, -- Player notes on usage
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vault_spells_character ON vault_character_spells(character_id);
CREATE INDEX IF NOT EXISTS idx_vault_spells_level ON vault_character_spells(spell_level);
CREATE INDEX IF NOT EXISTS idx_vault_spells_prepared ON vault_character_spells(is_prepared);

-- RLS through character ownership
ALTER TABLE vault_character_spells ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their character spells"
  ON vault_character_spells FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM vault_characters
      WHERE vault_characters.id = vault_character_spells.character_id
      AND vault_characters.user_id = auth.uid()
    )
  );

COMMENT ON TABLE vault_character_spells IS 'Spell lists for caster characters with preparation tracking';

-- =====================================================
-- PART 8: ENHANCE intelligence_suggestions FOR CHARACTERS
-- =====================================================
-- Allow suggestions without campaign_id (for vault character intelligence)

ALTER TABLE intelligence_suggestions
  ALTER COLUMN campaign_id DROP NOT NULL;

-- Add vault_character_id for character-specific intelligence
ALTER TABLE intelligence_suggestions
  ADD COLUMN IF NOT EXISTS vault_character_id UUID REFERENCES vault_characters(id) ON DELETE CASCADE;

-- Add new suggestion types for character intelligence
-- (The column is TEXT so we can just use new values)
COMMENT ON COLUMN intelligence_suggestions.suggestion_type IS
  'Types: status_change, secret_revealed, story_hook, quote, important_person, relationship, timeline_event, '
  'completeness, consistency, npc_detected, location_detected, plot_hook, enrichment, timeline_issue';

CREATE INDEX IF NOT EXISTS idx_intelligence_vault_character ON intelligence_suggestions(vault_character_id);

-- =====================================================
-- PART 9: ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON COLUMN vault_characters.backstory IS 'Full backstory prose (renamed from description)';
COMMENT ON COLUMN vault_characters.backstory_phases IS 'Structured backstory: [{title: "Early Life", content: "..."}]';
COMMENT ON COLUMN vault_characters.height IS 'Character height, e.g., "5''8" or "175cm"';
COMMENT ON COLUMN vault_characters.weight IS 'Character weight, e.g., "140 lbs" or "65kg"';
COMMENT ON COLUMN vault_characters.hair IS 'Hair color, style, length';
COMMENT ON COLUMN vault_characters.eyes IS 'Eye color and notable features';
COMMENT ON COLUMN vault_characters.skin IS 'Skin tone, complexion';
COMMENT ON COLUMN vault_characters.voice IS 'Voice description, e.g., "Soft, melodic"';
COMMENT ON COLUMN vault_characters.distinguishing_marks IS 'Scars, tattoos, birthmarks';
COMMENT ON COLUMN vault_characters.typical_attire IS 'What they usually wear';
COMMENT ON COLUMN vault_characters.subclass IS 'Class specialization, e.g., "College of Swords"';
COMMENT ON COLUMN vault_characters.level IS 'Character level';
COMMENT ON COLUMN vault_characters.alignment IS 'Classic alignment or custom';
COMMENT ON COLUMN vault_characters.deity IS 'Deity they worship';
COMMENT ON COLUMN vault_characters.faceclaim IS 'Actor/character they look like';
COMMENT ON COLUMN vault_characters.voice_claim IS 'Who they sound like';
COMMENT ON COLUMN vault_characters.ideals IS 'What principles guide them';
COMMENT ON COLUMN vault_characters.bonds IS 'What they''re connected to';
COMMENT ON COLUMN vault_characters.flaws IS 'Character flaws';
COMMENT ON COLUMN vault_characters.mannerisms IS 'Habits, quirks, tics';
COMMENT ON COLUMN vault_characters.speech_patterns IS 'How they talk, catchphrases';
COMMENT ON COLUMN vault_characters.motivations IS 'What drives them';
COMMENT ON COLUMN vault_characters.linked_campaign_id IS 'Link to campaign if part of one';
COMMENT ON COLUMN vault_characters.party_name IS 'Name of their adventuring party';
COMMENT ON COLUMN vault_characters.party_role IS 'Role in party: tank, healer, face, etc.';
COMMENT ON COLUMN vault_characters.player_name IS 'Who plays this character';
COMMENT ON COLUMN vault_characters.visibility IS 'Privacy: private, party, public';
COMMENT ON COLUMN vault_characters.dm_notes IS 'Notes only DM should see';
COMMENT ON COLUMN vault_characters.share_token IS 'Unique token for public sharing';
COMMENT ON COLUMN vault_characters.ability_scores IS 'D&D stats: {str, dex, con, int, wis, cha}';
COMMENT ON COLUMN vault_characters.hit_points IS 'HP tracking: {current, max, temp}';
COMMENT ON COLUMN vault_characters.proficiencies IS 'All proficiencies: {skills, tools, weapons, armor, saving_throws}';
COMMENT ON COLUMN vault_characters.aesthetic_tags IS 'Vibe tags: cottagecore, dark academia, etc.';
COMMENT ON COLUMN vault_characters.color_palette IS 'Character colors as hex codes';
COMMENT ON COLUMN vault_characters.story_arcs IS 'Character arcs: [{title, status, description}]';
COMMENT ON COLUMN vault_characters.factions IS 'Faction memberships: [{name, rank, status}]';
COMMENT ON COLUMN vault_characters.companions IS 'Pets, familiars, mounts: [{name, type, description, abilities, image_url}]';
COMMENT ON COLUMN vault_characters.possessions IS 'Important items: [{name, type, description, significance, acquired, image_url}]';
COMMENT ON COLUMN vault_characters.npc_role IS 'NPC role: antagonist, ally, shopkeeper, quest-giver';
COMMENT ON COLUMN vault_characters.disposition IS 'NPC attitude: friendly, hostile, neutral';

-- =====================================================
-- PART 10: CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to get full character with all relationships
CREATE OR REPLACE FUNCTION get_vault_character_full(p_character_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'character', row_to_json(vc),
    'images', (
      SELECT COALESCE(json_agg(row_to_json(vci) ORDER BY vci.display_order), '[]'::json)
      FROM vault_character_images vci
      WHERE vci.character_id = p_character_id
    ),
    'relationships', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'relationship', row_to_json(vcr),
          'related_character', row_to_json(rc)
        )
        ORDER BY vcr.display_order
      ), '[]'::json)
      FROM vault_character_relationships vcr
      LEFT JOIN vault_characters rc ON vcr.related_character_id = rc.id
      WHERE vcr.character_id = p_character_id
    ),
    'locations', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'link', row_to_json(vcl),
          'location', row_to_json(vl)
        )
      ), '[]'::json)
      FROM vault_character_locations vcl
      JOIN vault_locations vl ON vcl.location_id = vl.id
      WHERE vcl.character_id = p_character_id
    ),
    'spells', (
      SELECT COALESCE(json_agg(row_to_json(vcs) ORDER BY vcs.spell_level, vcs.spell_name), '[]'::json)
      FROM vault_character_spells vcs
      WHERE vcs.character_id = p_character_id
    ),
    'snapshots', (
      SELECT COALESCE(json_agg(row_to_json(vcss) ORDER BY vcss.created_at DESC), '[]'::json)
      FROM vault_character_snapshots vcss
      WHERE vcss.character_id = p_character_id
    )
  ) INTO result
  FROM vault_characters vc
  WHERE vc.id = p_character_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create mutual relationship
CREATE OR REPLACE FUNCTION create_mutual_relationship(
  p_user_id UUID,
  p_character_id UUID,
  p_related_character_id UUID,
  p_relationship_type TEXT,
  p_label TEXT,
  p_reverse_label TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Create primary relationship
  INSERT INTO vault_character_relationships (
    user_id, character_id, related_character_id,
    relationship_type, relationship_label, is_mutual
  ) VALUES (
    p_user_id, p_character_id, p_related_character_id,
    p_relationship_type, p_label, true
  );

  -- Create reverse relationship if related_character exists
  IF p_related_character_id IS NOT NULL THEN
    INSERT INTO vault_character_relationships (
      user_id, character_id, related_character_id,
      relationship_type, relationship_label, is_mutual
    ) VALUES (
      p_user_id, p_related_character_id, p_character_id,
      p_relationship_type, COALESCE(p_reverse_label, p_label), true
    )
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Character Vault Enhancements
-- Run this in your Supabase SQL editor

-- =====================================================
-- VAULT CHARACTERS TABLE UPDATES
-- =====================================================

-- Add new columns to vault_characters table
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'concept';
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS status_color TEXT DEFAULT '#8B5CF6';
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS race TEXT;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS class TEXT;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS background TEXT;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS appearance TEXT;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS personality TEXT;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS goals TEXT;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS secrets TEXT;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS quotes TEXT[];
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS common_phrases TEXT[];
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS weaknesses TEXT[];
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS plot_hooks TEXT[];
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS tldr TEXT[];
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS theme_music_url TEXT;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS theme_music_title TEXT;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS character_sheet_url TEXT;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS game_system TEXT;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS external_campaign TEXT;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS dm_name TEXT;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS campaign_started TEXT;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS detail_image_url TEXT;

-- Quick stats (JSON for flexibility)
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS quick_stats JSONB;

-- Inventory (JSON array)
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS inventory JSONB;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS gold INTEGER DEFAULT 0;

-- Metadata
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS source_file TEXT;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ;

-- =====================================================
-- CHARACTER LINKS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS character_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID NOT NULL REFERENCES vault_characters(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL CHECK (link_type IN ('theme_music', 'character_sheet', 'art_reference', 'inspiration', 'other')),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_character_links_character ON character_links(character_id);

-- =====================================================
-- STORY CHARACTERS TABLE (Nested NPCs)
-- =====================================================

CREATE TABLE IF NOT EXISTS story_characters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID NOT NULL REFERENCES vault_characters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT NOT NULL CHECK (relationship IN ('mentor', 'father', 'mother', 'sibling', 'rival', 'familiar', 'love_interest', 'criminal_contact', 'friend', 'enemy', 'employer', 'family', 'other')),
  tagline TEXT,
  notes TEXT,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_story_characters_character ON story_characters(character_id);

-- =====================================================
-- PLAY JOURNAL TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS play_journal (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID NOT NULL REFERENCES vault_characters(id) ON DELETE CASCADE,
  session_number INTEGER,
  session_date DATE,
  title TEXT,
  notes TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_play_journal_character ON play_journal(character_id);
CREATE INDEX IF NOT EXISTS idx_play_journal_date ON play_journal(session_date DESC);

-- =====================================================
-- LEARNED FACTS TABLE (What I've Learned about others)
-- =====================================================

CREATE TABLE IF NOT EXISTS character_learned_facts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID NOT NULL REFERENCES vault_characters(id) ON DELETE CASCADE,
  about_name TEXT NOT NULL,
  facts TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learned_facts_character ON character_learned_facts(character_id);

-- =====================================================
-- CHARACTER CONNECTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS character_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID NOT NULL REFERENCES vault_characters(id) ON DELETE CASCADE,
  connected_character_id UUID NOT NULL REFERENCES vault_characters(id) ON DELETE CASCADE,
  connection_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_character_connections ON character_connections(character_id);

-- =====================================================
-- MOOD BOARD TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS character_mood_board (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID NOT NULL REFERENCES vault_characters(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mood_board_character ON character_mood_board(character_id);

-- =====================================================
-- CUSTOM STATUSES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS character_statuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_character_statuses_user ON character_statuses(user_id);

-- =====================================================
-- CHARACTER SHARES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS character_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  share_code TEXT UNIQUE NOT NULL,
  character_id UUID NOT NULL REFERENCES vault_characters(id) ON DELETE CASCADE,
  included_sections JSONB NOT NULL,
  expires_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_character_shares_code ON character_shares(share_code);
CREATE INDEX IF NOT EXISTS idx_character_shares_character ON character_shares(character_id);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Character Links
ALTER TABLE character_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their character links"
  ON character_links FOR ALL
  USING (
    character_id IN (
      SELECT id FROM vault_characters WHERE user_id = auth.uid()
    )
  );

-- Story Characters
ALTER TABLE story_characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their story characters"
  ON story_characters FOR ALL
  USING (
    character_id IN (
      SELECT id FROM vault_characters WHERE user_id = auth.uid()
    )
  );

-- Play Journal
ALTER TABLE play_journal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their play journal"
  ON play_journal FOR ALL
  USING (
    character_id IN (
      SELECT id FROM vault_characters WHERE user_id = auth.uid()
    )
  );

-- Learned Facts
ALTER TABLE character_learned_facts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their learned facts"
  ON character_learned_facts FOR ALL
  USING (
    character_id IN (
      SELECT id FROM vault_characters WHERE user_id = auth.uid()
    )
  );

-- Character Connections
ALTER TABLE character_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their character connections"
  ON character_connections FOR ALL
  USING (
    character_id IN (
      SELECT id FROM vault_characters WHERE user_id = auth.uid()
    )
  );

-- Mood Board
ALTER TABLE character_mood_board ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their mood board"
  ON character_mood_board FOR ALL
  USING (
    character_id IN (
      SELECT id FROM vault_characters WHERE user_id = auth.uid()
    )
  );

-- Custom Statuses
ALTER TABLE character_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their statuses"
  ON character_statuses FOR ALL
  USING (user_id = auth.uid());

-- Character Shares
ALTER TABLE character_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their character shares"
  ON character_shares FOR ALL
  USING (
    character_id IN (
      SELECT id FROM vault_characters WHERE user_id = auth.uid()
    )
  );

-- Public read access for shared characters (by share code)
CREATE POLICY "Anyone can view shared characters by code"
  ON character_shares FOR SELECT
  USING (
    (expires_at IS NULL OR expires_at > NOW())
  );

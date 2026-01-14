-- Migration: Character Enhancements
-- Adds PC-specific fields, status tracking, faction tag category, and lore tables

-- ============================================================================
-- 1. ADD PC-SPECIFIC FIELDS TO CHARACTERS TABLE
-- ============================================================================

-- Status fields for all characters
ALTER TABLE characters ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'alive';
ALTER TABLE characters ADD COLUMN IF NOT EXISTS status_color TEXT DEFAULT '#10B981';

-- PC-specific fields
ALTER TABLE characters ADD COLUMN IF NOT EXISTS race TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS class TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS background TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS appearance TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS personality TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS goals TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS secrets TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS role TEXT; -- For NPCs: Teacher, Merchant, etc.

-- List fields stored as JSONB
ALTER TABLE characters ADD COLUMN IF NOT EXISTS important_people JSONB DEFAULT '[]'::jsonb;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS story_hooks JSONB DEFAULT '[]'::jsonb;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS quotes JSONB DEFAULT '[]'::jsonb;

-- Document import tracking
ALTER TABLE characters ADD COLUMN IF NOT EXISTS source_document TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ;

-- ============================================================================
-- 2. ADD FACTION CATEGORY TO TAGS
-- ============================================================================

-- Add category field to tags (faction, relationship, general)
ALTER TABLE tags ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';

-- ============================================================================
-- 3. CREATE CHARACTER RELATIONSHIPS TABLE (for family trees/lore)
-- ============================================================================

CREATE TABLE IF NOT EXISTS character_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  related_character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL, -- 'parent', 'child', 'sibling', 'spouse', 'mentor', 'enemy', 'ally', 'employer', 'other'
  relationship_label TEXT, -- Custom label like "raised by", "killed by", etc.
  is_known_to_party BOOLEAN DEFAULT false, -- Whether players know this connection
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, related_character_id, relationship_type)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_character_relationships_campaign ON character_relationships(campaign_id);
CREATE INDEX IF NOT EXISTS idx_character_relationships_character ON character_relationships(character_id);
CREATE INDEX IF NOT EXISTS idx_character_relationships_related ON character_relationships(related_character_id);

-- RLS policies for character_relationships
ALTER TABLE character_relationships ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view relationships in their campaigns"
    ON character_relationships FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM campaigns WHERE campaigns.id = character_relationships.campaign_id AND campaigns.user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert relationships in their campaigns"
    ON character_relationships FOR INSERT
    WITH CHECK (EXISTS (
      SELECT 1 FROM campaigns WHERE campaigns.id = character_relationships.campaign_id AND campaigns.user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update relationships in their campaigns"
    ON character_relationships FOR UPDATE
    USING (EXISTS (
      SELECT 1 FROM campaigns WHERE campaigns.id = character_relationships.campaign_id AND campaigns.user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete relationships in their campaigns"
    ON character_relationships FOR DELETE
    USING (EXISTS (
      SELECT 1 FROM campaigns WHERE campaigns.id = character_relationships.campaign_id AND campaigns.user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 4. CREATE LORE ENTRIES TABLE (for AI-generated insights)
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaign_lore (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  lore_type TEXT NOT NULL, -- 'family_tree', 'faction', 'timeline', 'location', 'artifact', 'prophecy', 'analysis'
  title TEXT NOT NULL,
  content JSONB NOT NULL, -- Structured data depending on lore_type
  ai_generated BOOLEAN DEFAULT false,
  last_analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_lore_campaign ON campaign_lore(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_lore_type ON campaign_lore(lore_type);

-- RLS policies for campaign_lore
ALTER TABLE campaign_lore ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view lore in their campaigns"
    ON campaign_lore FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM campaigns WHERE campaigns.id = campaign_lore.campaign_id AND campaigns.user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert lore in their campaigns"
    ON campaign_lore FOR INSERT
    WITH CHECK (EXISTS (
      SELECT 1 FROM campaigns WHERE campaigns.id = campaign_lore.campaign_id AND campaigns.user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update lore in their campaigns"
    ON campaign_lore FOR UPDATE
    USING (EXISTS (
      SELECT 1 FROM campaigns WHERE campaigns.id = campaign_lore.campaign_id AND campaigns.user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete lore in their campaigns"
    ON campaign_lore FOR DELETE
    USING (EXISTS (
      SELECT 1 FROM campaigns WHERE campaigns.id = campaign_lore.campaign_id AND campaigns.user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 5. CREATE CAMPAIGN SHARES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaign_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_code TEXT UNIQUE NOT NULL,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  share_type TEXT DEFAULT 'lore', -- 'lore', 'characters', 'timeline'
  included_sections JSONB DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_shares_code ON campaign_shares(share_code);
CREATE INDEX IF NOT EXISTS idx_campaign_shares_campaign ON campaign_shares(campaign_id);

-- RLS for campaign_shares
ALTER TABLE campaign_shares ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can view campaign shares by code"
    ON campaign_shares FOR SELECT
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create shares for their campaigns"
    ON campaign_shares FOR INSERT
    WITH CHECK (EXISTS (
      SELECT 1 FROM campaigns WHERE campaigns.id = campaign_shares.campaign_id AND campaigns.user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update shares for their campaigns"
    ON campaign_shares FOR UPDATE
    USING (EXISTS (
      SELECT 1 FROM campaigns WHERE campaigns.id = campaign_shares.campaign_id AND campaigns.user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete shares for their campaigns"
    ON campaign_shares FOR DELETE
    USING (EXISTS (
      SELECT 1 FROM campaigns WHERE campaigns.id = campaign_shares.campaign_id AND campaigns.user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 6. UPDATE TIMESTAMP TRIGGERS
-- ============================================================================

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to character_relationships
DROP TRIGGER IF EXISTS update_character_relationships_updated_at ON character_relationships;
CREATE TRIGGER update_character_relationships_updated_at
  BEFORE UPDATE ON character_relationships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply to campaign_lore
DROP TRIGGER IF EXISTS update_campaign_lore_updated_at ON campaign_lore;
CREATE TRIGGER update_campaign_lore_updated_at
  BEFORE UPDATE ON campaign_lore
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. CONDITIONALLY UPDATE EXISTING SHARE TABLES (if they exist)
-- ============================================================================

-- Only run these if the tables exist (vault/oneshot features)
DO $$
BEGIN
  -- Add last_viewed_at to character_shares if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'character_shares') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'character_shares' AND column_name = 'last_viewed_at') THEN
      ALTER TABLE character_shares ADD COLUMN last_viewed_at TIMESTAMPTZ;
    END IF;
  END IF;
END $$;

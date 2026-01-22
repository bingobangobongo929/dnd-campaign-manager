-- ============================================================================
-- Tags & Relationships System Overhaul
-- ============================================================================
-- This migration creates:
-- 1. relationship_templates - Smart relationship definitions with semantics
-- 2. campaign_factions - Proper faction entities with hierarchy
-- 3. faction_memberships - Character membership in factions
-- 4. faction_relations - Inter-faction relationships
-- 5. canvas_relationships - Improved character relationships for canvas mode
-- 6. Improvements to existing tags table
-- ============================================================================

-- ============================================================================
-- 1. RELATIONSHIP TEMPLATES (Smart Relationship Definitions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS relationship_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,  -- NULL = system template

  -- Core
  name TEXT NOT NULL,              -- "Father", "Enemy", "Admires"
  inverse_name TEXT,               -- "Child" (NULL for symmetric/one-way)

  -- Behavior
  relationship_mode TEXT NOT NULL DEFAULT 'symmetric'
    CHECK (relationship_mode IN ('symmetric', 'asymmetric', 'one_way')),

  -- Display
  color TEXT DEFAULT '#8B5CF6',
  icon TEXT,                       -- Lucide icon name
  inverse_icon TEXT,               -- Icon for inverse direction
  description TEXT,

  -- Categorization
  category TEXT DEFAULT 'social'
    CHECK (category IN ('family', 'professional', 'romantic', 'conflict', 'social', 'other')),

  -- Meta
  is_system BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_relationship_templates_campaign ON relationship_templates(campaign_id);
CREATE INDEX IF NOT EXISTS idx_relationship_templates_system ON relationship_templates(is_system) WHERE is_system = true;

-- ============================================================================
-- 2. CAMPAIGN FACTIONS (Proper Faction Entities)
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaign_factions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,

  -- Core
  name TEXT NOT NULL,
  description TEXT,

  -- Display
  color TEXT DEFAULT '#8B5CF6',
  icon TEXT DEFAULT 'shield',
  image_url TEXT,

  -- Hierarchy
  parent_faction_id UUID REFERENCES campaign_factions(id) ON DELETE SET NULL,

  -- Lore
  faction_type TEXT DEFAULT 'organization'
    CHECK (faction_type IN ('guild', 'kingdom', 'cult', 'family', 'military', 'criminal', 'religious', 'merchant', 'academic', 'other')),
  alignment TEXT,
  status TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'disbanded', 'secret', 'destroyed')),
  headquarters TEXT,

  -- Visibility
  is_known_to_party BOOLEAN DEFAULT true,

  -- Meta
  notes TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_factions_campaign ON campaign_factions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_factions_parent ON campaign_factions(parent_faction_id);

-- ============================================================================
-- 3. FACTION MEMBERSHIPS
-- ============================================================================

CREATE TABLE IF NOT EXISTS faction_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faction_id UUID NOT NULL REFERENCES campaign_factions(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,

  -- Role
  role TEXT,                       -- "Leader", "Member", "Spy"
  title TEXT,                      -- "Guildmaster", "Initiate"
  rank INTEGER DEFAULT 0,

  -- Timeline
  joined_date TEXT,                -- In-world date
  left_date TEXT,

  -- Status
  is_public BOOLEAN DEFAULT true,  -- Known to party?
  is_active BOOLEAN DEFAULT true,

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(faction_id, character_id)
);

CREATE INDEX IF NOT EXISTS idx_faction_memberships_faction ON faction_memberships(faction_id);
CREATE INDEX IF NOT EXISTS idx_faction_memberships_character ON faction_memberships(character_id);

-- ============================================================================
-- 4. FACTION RELATIONS (Inter-faction relationships)
-- ============================================================================

CREATE TABLE IF NOT EXISTS faction_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faction_id UUID NOT NULL REFERENCES campaign_factions(id) ON DELETE CASCADE,
  related_faction_id UUID NOT NULL REFERENCES campaign_factions(id) ON DELETE CASCADE,

  relation_type TEXT NOT NULL DEFAULT 'neutral'
    CHECK (relation_type IN ('allied', 'friendly', 'neutral', 'rival', 'hostile', 'war', 'subsidiary', 'parent')),

  description TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(faction_id, related_faction_id),
  CHECK (faction_id != related_faction_id)
);

CREATE INDEX IF NOT EXISTS idx_faction_relations_faction ON faction_relations(faction_id);
CREATE INDEX IF NOT EXISTS idx_faction_relations_related ON faction_relations(related_faction_id);

-- ============================================================================
-- 5. IMPROVED CHARACTER RELATIONSHIPS (Canvas Mode)
-- ============================================================================

CREATE TABLE IF NOT EXISTS canvas_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,

  -- The link
  from_character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  to_character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,

  -- Type
  template_id UUID REFERENCES relationship_templates(id) ON DELETE SET NULL,
  custom_label TEXT,               -- Override template name or custom relationship

  -- Pairing (for bidirectional relationships)
  pair_id UUID,                    -- Same ID for both A→B and B→A
  is_primary BOOLEAN DEFAULT true, -- Which side created the relationship

  -- Metadata
  description TEXT,
  started_date TEXT,               -- In-world date
  ended_date TEXT,
  status TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'ended', 'complicated', 'secret')),

  -- Visibility
  is_known_to_party BOOLEAN DEFAULT true,

  -- Display
  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK (from_character_id != to_character_id)
);

CREATE INDEX IF NOT EXISTS idx_canvas_relationships_campaign ON canvas_relationships(campaign_id);
CREATE INDEX IF NOT EXISTS idx_canvas_relationships_from ON canvas_relationships(from_character_id);
CREATE INDEX IF NOT EXISTS idx_canvas_relationships_to ON canvas_relationships(to_character_id);
CREATE INDEX IF NOT EXISTS idx_canvas_relationships_pair ON canvas_relationships(pair_id);

-- Unique index to prevent duplicate relationships (handles NULL template_id and custom_label)
CREATE UNIQUE INDEX IF NOT EXISTS idx_canvas_relationships_unique
  ON canvas_relationships(from_character_id, to_character_id, COALESCE(template_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(custom_label, ''));

-- ============================================================================
-- 6. IMPROVE EXISTING TAGS TABLE
-- ============================================================================

ALTER TABLE tags ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE tags ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE tags ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
ALTER TABLE tags ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_tags_archived ON tags(is_archived) WHERE is_archived = false;

-- ============================================================================
-- 7. SEED SYSTEM RELATIONSHIP TEMPLATES
-- ============================================================================

INSERT INTO relationship_templates (name, inverse_name, relationship_mode, category, icon, inverse_icon, color, is_system, display_order) VALUES
-- Family (asymmetric)
('Father', 'Child', 'asymmetric', 'family', 'user', 'baby', '#3B82F6', true, 1),
('Mother', 'Child', 'asymmetric', 'family', 'user', 'baby', '#3B82F6', true, 2),
('Sibling', NULL, 'symmetric', 'family', 'users', NULL, '#3B82F6', true, 3),
('Spouse', NULL, 'symmetric', 'family', 'heart', NULL, '#EC4899', true, 4),
('Ancestor', 'Descendant', 'asymmetric', 'family', 'crown', 'user', '#3B82F6', true, 5),

-- Professional (asymmetric)
('Mentor', 'Student', 'asymmetric', 'professional', 'graduation-cap', 'book-open', '#10B981', true, 10),
('Employer', 'Employee', 'asymmetric', 'professional', 'briefcase', 'user', '#10B981', true, 11),
('Master', 'Apprentice', 'asymmetric', 'professional', 'wand', 'sparkles', '#10B981', true, 12),
('Creator', 'Creation', 'asymmetric', 'professional', 'hammer', 'box', '#10B981', true, 13),
('Commander', 'Soldier', 'asymmetric', 'professional', 'shield', 'sword', '#10B981', true, 14),
('Patron', 'Client', 'asymmetric', 'professional', 'gem', 'user', '#10B981', true, 15),

-- Conflict (symmetric)
('Enemy', NULL, 'symmetric', 'conflict', 'swords', NULL, '#EF4444', true, 20),
('Rival', NULL, 'symmetric', 'conflict', 'trophy', NULL, '#EF4444', true, 21),
('Nemesis', NULL, 'symmetric', 'conflict', 'skull', NULL, '#EF4444', true, 22),

-- Conflict (asymmetric)
('Killer', 'Victim', 'asymmetric', 'conflict', 'skull', 'cross', '#EF4444', true, 23),
('Betrayer', 'Betrayed', 'asymmetric', 'conflict', 'knife', 'heart-crack', '#EF4444', true, 24),

-- Social (symmetric)
('Friend', NULL, 'symmetric', 'social', 'smile', NULL, '#8B5CF6', true, 30),
('Ally', NULL, 'symmetric', 'social', 'handshake', NULL, '#8B5CF6', true, 31),
('Partner', NULL, 'symmetric', 'social', 'users', NULL, '#8B5CF6', true, 32),
('Acquaintance', NULL, 'symmetric', 'social', 'user', NULL, '#6B7280', true, 33),

-- Social (asymmetric)
('Savior', 'Saved by', 'asymmetric', 'social', 'shield-check', 'heart', '#8B5CF6', true, 34),

-- Romantic (symmetric)
('Lover', NULL, 'symmetric', 'romantic', 'heart', NULL, '#EC4899', true, 40),
('Ex-lover', NULL, 'symmetric', 'romantic', 'heart-crack', NULL, '#EC4899', true, 41),
('Betrothed', NULL, 'symmetric', 'romantic', 'ring', NULL, '#EC4899', true, 42),

-- One-way
('Admires', NULL, 'one_way', 'social', 'star', NULL, '#F59E0B', true, 50),
('Fears', NULL, 'one_way', 'conflict', 'ghost', NULL, '#EF4444', true, 51),
('Owes debt to', NULL, 'one_way', 'professional', 'coins', NULL, '#F59E0B', true, 52),
('Suspects', NULL, 'one_way', 'conflict', 'eye', NULL, '#F59E0B', true, 53),
('Secretly loves', NULL, 'one_way', 'romantic', 'heart', NULL, '#EC4899', true, 54),
('Serves', NULL, 'one_way', 'professional', 'crown', NULL, '#10B981', true, 55)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 8. RLS POLICIES
-- ============================================================================

-- Relationship Templates
ALTER TABLE relationship_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view system templates" ON relationship_templates;
CREATE POLICY "Anyone can view system templates" ON relationship_templates
  FOR SELECT USING (is_system = true);

DROP POLICY IF EXISTS "Users can view campaign templates" ON relationship_templates;
CREATE POLICY "Users can view campaign templates" ON relationship_templates
  FOR SELECT USING (
    campaign_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM campaigns WHERE id = relationship_templates.campaign_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage campaign templates" ON relationship_templates;
CREATE POLICY "Users can manage campaign templates" ON relationship_templates
  FOR ALL USING (
    campaign_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM campaigns WHERE id = relationship_templates.campaign_id AND user_id = auth.uid()
    )
  );

-- Campaign Factions
ALTER TABLE campaign_factions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage factions in their campaigns" ON campaign_factions;
CREATE POLICY "Users can manage factions in their campaigns" ON campaign_factions
  FOR ALL USING (EXISTS (
    SELECT 1 FROM campaigns WHERE id = campaign_factions.campaign_id AND user_id = auth.uid()
  ));

-- Faction Memberships
ALTER TABLE faction_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage memberships in their campaigns" ON faction_memberships;
CREATE POLICY "Users can manage memberships in their campaigns" ON faction_memberships
  FOR ALL USING (EXISTS (
    SELECT 1 FROM campaign_factions cf
    JOIN campaigns c ON c.id = cf.campaign_id
    WHERE cf.id = faction_memberships.faction_id AND c.user_id = auth.uid()
  ));

-- Faction Relations
ALTER TABLE faction_relations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage faction relations in their campaigns" ON faction_relations;
CREATE POLICY "Users can manage faction relations in their campaigns" ON faction_relations
  FOR ALL USING (EXISTS (
    SELECT 1 FROM campaign_factions cf
    JOIN campaigns c ON c.id = cf.campaign_id
    WHERE cf.id = faction_relations.faction_id AND c.user_id = auth.uid()
  ));

-- Canvas Relationships
ALTER TABLE canvas_relationships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage relationships in their campaigns" ON canvas_relationships;
CREATE POLICY "Users can manage relationships in their campaigns" ON canvas_relationships
  FOR ALL USING (EXISTS (
    SELECT 1 FROM campaigns WHERE id = canvas_relationships.campaign_id AND user_id = auth.uid()
  ));

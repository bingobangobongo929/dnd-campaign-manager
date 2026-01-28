-- =====================================================
-- RANDOM TABLES SYSTEM
-- Campaign-level random tables for prep and gameplay
-- =====================================================

-- =====================================================
-- 1. RANDOM TABLES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS random_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic info
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',

  -- Table configuration
  entries JSONB NOT NULL DEFAULT '[]',
  -- Format: [{ id: string, text: string, weight: number (optional) }]

  -- Roll settings
  roll_type TEXT NOT NULL DEFAULT 'd20' CHECK (roll_type IN ('d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100', 'custom')),
  custom_die_size INTEGER, -- Only used when roll_type = 'custom'

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  is_archived BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 2. RANDOM TABLE CATEGORIES (PRESET)
-- =====================================================

-- Categories are text values, but here are the common ones for UI:
-- 'general', 'npc', 'encounter', 'loot', 'location', 'weather',
-- 'rumor', 'complication', 'name', 'custom'

COMMENT ON COLUMN random_tables.category IS 'Table category: general, npc, encounter, loot, location, weather, rumor, complication, name, custom';

-- =====================================================
-- 3. RANDOM TABLE ROLL HISTORY
-- =====================================================

CREATE TABLE IF NOT EXISTS random_table_rolls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES random_tables(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Roll result
  roll_value INTEGER NOT NULL,
  entry_id TEXT NOT NULL, -- ID of the entry that was rolled
  entry_text TEXT NOT NULL, -- Snapshot of the entry text at roll time

  -- Context
  note TEXT, -- Optional note about the roll

  -- Timestamp
  rolled_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 4. INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_random_tables_campaign ON random_tables(campaign_id);
CREATE INDEX IF NOT EXISTS idx_random_tables_category ON random_tables(campaign_id, category);
CREATE INDEX IF NOT EXISTS idx_random_tables_archived ON random_tables(campaign_id, is_archived);

CREATE INDEX IF NOT EXISTS idx_random_table_rolls_table ON random_table_rolls(table_id);
CREATE INDEX IF NOT EXISTS idx_random_table_rolls_session ON random_table_rolls(session_id);

-- =====================================================
-- 5. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE random_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE random_table_rolls ENABLE ROW LEVEL SECURITY;

-- Random tables policy - same as campaign access
CREATE POLICY "Users can view tables in their campaigns"
  ON random_tables FOR SELECT
  USING (
    user_id = auth.uid()
    OR campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
    OR campaign_id IN (
      SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Campaign owners and DMs can insert tables"
  ON random_tables FOR INSERT
  WITH CHECK (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
    OR campaign_id IN (
      SELECT campaign_id FROM campaign_members
      WHERE user_id = auth.uid()
      AND role IN ('co_dm', 'owner')
    )
  );

CREATE POLICY "Table creators and campaign owners can update tables"
  ON random_tables FOR UPDATE
  USING (
    user_id = auth.uid()
    OR campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Table creators and campaign owners can delete tables"
  ON random_tables FOR DELETE
  USING (
    user_id = auth.uid()
    OR campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );

-- Roll history policies
CREATE POLICY "Users can view rolls in their campaigns"
  ON random_table_rolls FOR SELECT
  USING (
    user_id = auth.uid()
    OR table_id IN (
      SELECT id FROM random_tables WHERE campaign_id IN (
        SELECT id FROM campaigns WHERE user_id = auth.uid()
      )
    )
    OR table_id IN (
      SELECT id FROM random_tables WHERE campaign_id IN (
        SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert rolls for accessible tables"
  ON random_table_rolls FOR INSERT
  WITH CHECK (
    table_id IN (
      SELECT id FROM random_tables WHERE campaign_id IN (
        SELECT id FROM campaigns WHERE user_id = auth.uid()
      )
    )
    OR table_id IN (
      SELECT id FROM random_tables WHERE campaign_id IN (
        SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid()
      )
    )
  );

-- =====================================================
-- 6. TRIGGERS
-- =====================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_random_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER random_tables_updated_at
  BEFORE UPDATE ON random_tables
  FOR EACH ROW
  EXECUTE FUNCTION update_random_tables_updated_at();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

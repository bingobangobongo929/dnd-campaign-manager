-- =====================================================
-- USER CAMPAIGN PREFERENCES
-- Per-user-per-campaign preferences for UI customization
-- =====================================================

-- =====================================================
-- 1. USER CAMPAIGN PREFERENCES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS user_campaign_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,

  -- Session section order preferences
  -- Format: ['attendance', 'notes', 'thoughts', 'dm_notes', 'content', 'player_notes']
  completed_section_order TEXT[] DEFAULT NULL,
  prep_module_order TEXT[] DEFAULT NULL,

  -- Section visibility preferences (collapsed by default)
  collapsed_sections JSONB DEFAULT '{}',
  -- Format: { "dm_notes": true, "content": false }

  -- Other preferences can be added here
  preferences JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Unique constraint: one preference record per user per campaign
  UNIQUE (user_id, campaign_id)
);

-- =====================================================
-- 2. INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_campaign_preferences_user ON user_campaign_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_campaign_preferences_campaign ON user_campaign_preferences(campaign_id);

-- =====================================================
-- 3. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE user_campaign_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only see/modify their own preferences
CREATE POLICY "Users can view their own preferences"
  ON user_campaign_preferences FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own preferences"
  ON user_campaign_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own preferences"
  ON user_campaign_preferences FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own preferences"
  ON user_campaign_preferences FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- 4. TRIGGERS
-- =====================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_user_campaign_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_campaign_preferences_updated_at
  BEFORE UPDATE ON user_campaign_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_campaign_preferences_updated_at();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

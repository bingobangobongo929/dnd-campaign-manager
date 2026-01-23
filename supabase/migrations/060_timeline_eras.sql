-- =====================================================
-- TIMELINE ERAS / CHAPTERS
-- Allow DMs to organize timeline events into story chapters
-- =====================================================

-- Create campaign_eras table for story chapters
CREATE TABLE IF NOT EXISTS campaign_eras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#8B5CF6',
  icon TEXT DEFAULT 'book',
  start_date TEXT, -- In-game or real-world date marker
  end_date TEXT,
  sort_order INTEGER DEFAULT 0,
  is_collapsed BOOLEAN DEFAULT false, -- For UI state
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_campaign_eras_campaign ON campaign_eras(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_eras_sort ON campaign_eras(campaign_id, sort_order);

-- Add era_id to timeline_events
ALTER TABLE timeline_events ADD COLUMN IF NOT EXISTS era_id UUID REFERENCES campaign_eras(id) ON DELETE SET NULL;

-- Index for era lookups
CREATE INDEX IF NOT EXISTS idx_timeline_events_era ON timeline_events(era_id);

-- Enable RLS
ALTER TABLE campaign_eras ENABLE ROW LEVEL SECURITY;

-- Campaign owners can manage eras
CREATE POLICY "Users can manage their own campaign eras"
ON campaign_eras FOR ALL
USING (campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid()));

-- Campaign members can view eras
CREATE POLICY "Campaign members can view eras"
ON campaign_eras FOR SELECT
USING (
  campaign_id IN (
    SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid()
  )
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_campaign_eras_updated_at ON campaign_eras;
CREATE TRIGGER update_campaign_eras_updated_at
  BEFORE UPDATE ON campaign_eras
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comment
COMMENT ON TABLE campaign_eras IS 'Story chapters/eras for organizing timeline events';

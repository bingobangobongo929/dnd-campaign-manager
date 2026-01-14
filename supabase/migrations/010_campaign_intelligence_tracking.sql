-- Add intelligence tracking to campaigns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS last_intelligence_run TIMESTAMPTZ;

-- Create an index for efficient querying
CREATE INDEX IF NOT EXISTS idx_campaigns_last_intelligence_run ON campaigns(last_intelligence_run);

-- Add comment for documentation
COMMENT ON COLUMN campaigns.last_intelligence_run IS 'Timestamp of the last AI intelligence analysis run for this campaign';

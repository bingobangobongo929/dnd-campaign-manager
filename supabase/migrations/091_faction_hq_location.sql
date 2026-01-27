-- ============================================================================
-- Migration 091: Add HQ Location Reference to Factions
-- ============================================================================
-- Adds a foreign key reference from campaign_factions to locations table
-- so factions can have a linked headquarters location instead of just text

-- Add hq_location_id column to campaign_factions
ALTER TABLE campaign_factions
ADD COLUMN IF NOT EXISTS hq_location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_campaign_factions_hq_location
ON campaign_factions(hq_location_id)
WHERE hq_location_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN campaign_factions.hq_location_id IS 'Reference to the faction headquarters location. The existing headquarters TEXT field can still be used for display name or when no location record exists.';

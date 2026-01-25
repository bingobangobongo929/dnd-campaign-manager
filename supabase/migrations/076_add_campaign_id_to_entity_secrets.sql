-- Add campaign_id column to entity_secrets table
-- This column was missing but is needed by the secrets API

-- Add the column
ALTER TABLE entity_secrets
ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_entity_secrets_campaign ON entity_secrets(campaign_id);

-- Update the RLS policy to use the new column for simpler checks
DROP POLICY IF EXISTS "Only campaign owners can manage secrets" ON entity_secrets;

CREATE POLICY "Campaign owners and co_dms can manage secrets"
ON entity_secrets FOR ALL
USING (
  campaign_id IN (
    SELECT c.id FROM campaigns c
    WHERE c.user_id = auth.uid()
  )
  OR campaign_id IN (
    SELECT cm.campaign_id FROM campaign_members cm
    WHERE cm.user_id = auth.uid()
    AND cm.role = 'co_dm'
  )
);

-- Add comment for documentation
COMMENT ON COLUMN entity_secrets.campaign_id IS 'Campaign this secret belongs to, used for direct querying and authorization';

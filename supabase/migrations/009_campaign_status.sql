-- Add status field to campaigns table
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Add check constraint for valid statuses
ALTER TABLE campaigns ADD CONSTRAINT campaigns_status_check
  CHECK (status IN ('active', 'completed', 'hiatus', 'archived'));

-- Create index for filtering by status
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

-- Comment for documentation
COMMENT ON COLUMN campaigns.status IS 'Campaign status: active (ongoing), completed (finished), hiatus (paused), archived (hidden)';

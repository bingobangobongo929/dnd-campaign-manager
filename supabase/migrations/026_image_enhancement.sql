-- Image Enhancement Tracking
-- Track which character images have been enhanced and store original URLs

-- Add columns to vault_characters for enhancement tracking
ALTER TABLE vault_characters
ADD COLUMN IF NOT EXISTS detail_image_original_url TEXT,
ADD COLUMN IF NOT EXISTS detail_image_enhanced_at TIMESTAMPTZ;

-- Add comment explaining the columns
COMMENT ON COLUMN vault_characters.detail_image_original_url IS 'Original image URL before enhancement, preserved for reference';
COMMENT ON COLUMN vault_characters.detail_image_enhanced_at IS 'Timestamp when the detail image was last enhanced';

-- Index for querying unenhanced characters
CREATE INDEX IF NOT EXISTS idx_vault_characters_enhancement
ON vault_characters(user_id, detail_image_enhanced_at)
WHERE detail_image_url IS NOT NULL;

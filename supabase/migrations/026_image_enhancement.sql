-- Image Enhancement Tracking
-- Track which character 16:9 card images have been enhanced and store original URLs

-- Add columns to vault_characters for enhancement tracking
ALTER TABLE vault_characters
ADD COLUMN IF NOT EXISTS image_original_url TEXT,
ADD COLUMN IF NOT EXISTS image_enhanced_at TIMESTAMPTZ;

-- Add comment explaining the columns
COMMENT ON COLUMN vault_characters.image_original_url IS 'Original 16:9 card image URL before enhancement, preserved for reference';
COMMENT ON COLUMN vault_characters.image_enhanced_at IS 'Timestamp when the card image was last enhanced';

-- Index for querying unenhanced characters
CREATE INDEX IF NOT EXISTS idx_vault_characters_enhancement
ON vault_characters(user_id, image_enhanced_at)
WHERE image_url IS NOT NULL;

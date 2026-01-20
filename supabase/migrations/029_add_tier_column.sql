-- Add tier column to user_settings for feature gating
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'free';

-- Add constraint for valid tier values
ALTER TABLE user_settings
ADD CONSTRAINT user_settings_tier_check
CHECK (tier IN ('free', 'standard', 'premium'));

-- Create index for tier queries
CREATE INDEX IF NOT EXISTS idx_user_settings_tier ON user_settings(tier);

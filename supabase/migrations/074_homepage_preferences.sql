-- Add homepage preferences to user_settings
-- Allows users to customize section visibility and ordering on their homepage

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS homepage_preferences JSONB DEFAULT '{
  "auto_order": true,
  "section_order": [],
  "hidden_sections": [],
  "dismissed_temporarily": []
}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN user_settings.homepage_preferences IS
'User preferences for homepage layout: auto_order (bool), section_order (string[]), hidden_sections (string[]), dismissed_temporarily (string[])';

-- Structure:
-- {
--   "auto_order": true,           -- true = automatic by content count, false = manual ordering
--   "section_order": [],          -- manual section order when auto_order is false
--   "hidden_sections": [],        -- permanently hidden sections ("Don't show again")
--   "dismissed_temporarily": []   -- sections hidden for this session ("Hide for now")
-- }

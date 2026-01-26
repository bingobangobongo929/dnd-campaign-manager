-- Add page-specific preferences to user_settings
-- These allow users to customize tab order and visibility on each list page

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS campaigns_page_preferences JSONB DEFAULT '{
  "auto_order": true,
  "tab_order": ["all", "playing", "running", "my-work", "collection", "discover"],
  "hidden_tabs": [],
  "default_tab": "all"
}'::jsonb;

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS adventures_page_preferences JSONB DEFAULT '{
  "auto_order": true,
  "tab_order": ["all", "playing", "running", "my-work", "collection", "discover"],
  "hidden_tabs": [],
  "default_tab": "all"
}'::jsonb;

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS oneshots_page_preferences JSONB DEFAULT '{
  "auto_order": true,
  "tab_order": ["all", "participating", "running", "my-work", "collection", "discover"],
  "hidden_tabs": [],
  "default_tab": "all"
}'::jsonb;

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS vault_page_preferences JSONB DEFAULT '{
  "auto_order": true,
  "tab_order": ["all", "my-characters", "in-play", "collection", "discover"],
  "hidden_tabs": [],
  "default_tab": "all",
  "view_mode": "cards"
}'::jsonb;

-- Add comments
COMMENT ON COLUMN user_settings.campaigns_page_preferences IS 'User preferences for campaigns list page (tab order, visibility, default tab)';
COMMENT ON COLUMN user_settings.adventures_page_preferences IS 'User preferences for adventures list page (tab order, visibility, default tab)';
COMMENT ON COLUMN user_settings.oneshots_page_preferences IS 'User preferences for oneshots list page (tab order, visibility, default tab)';
COMMENT ON COLUMN user_settings.vault_page_preferences IS 'User preferences for vault/characters list page (tab order, visibility, view mode)';

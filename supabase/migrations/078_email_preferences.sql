-- Add email preferences column to user_settings
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS email_prefs JSONB DEFAULT '{"campaign_invites": true, "session_reminders": true, "character_claims": true, "community_updates": false}'::jsonb;

COMMENT ON COLUMN user_settings.email_prefs IS 'User email notification preferences';

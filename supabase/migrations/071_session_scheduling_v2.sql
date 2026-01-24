-- Session Scheduling V2: Full scheduling system with timezone support
-- Modes: off, simple, full

-- Add timezone to user_settings
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';

-- Add scheduling fields to campaigns
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS schedule_pattern JSONB DEFAULT NULL;
-- Pattern structure:
-- {
--   type: 'weekly' | 'biweekly' | 'monthly' | 'adhoc' | 'hiatus',
--   day_of_week: 0-6 (Sunday = 0),
--   week_of_month: 1-4 (for monthly),
--   time: '19:00',
--   duration_minutes: 240,
--   timezone: 'America/New_York',
--   location: 'Discord + Roll20'
-- }

ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS schedule_settings JSONB DEFAULT '{"mode": "simple"}';
-- Settings structure:
-- {
--   mode: 'off' | 'simple' | 'full',
--   attendance_mode: 'assumed' | 'confirmed',
--   minimum_players: 3,
--   auto_skip_below_minimum: false
-- }

ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS schedule_exceptions JSONB DEFAULT '[]';
-- Exceptions structure:
-- [
--   { date: '2025-02-04', type: 'skip', reason: 'Super Bowl' },
--   { date: '2025-02-11', type: 'reschedule', new_date: '2025-02-12', new_time: '20:00' },
--   { date: '2025-02-18', type: 'confirmed' }
-- ]

-- Discord integration fields (backend ready, UI "coming soon")
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS discord_webhook_url TEXT;

ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS discord_settings JSONB DEFAULT '{}';
-- Discord settings structure:
-- {
--   enabled: false,
--   reminder_hours: [24, 1],
--   post_confirmations: true,
--   post_cancellations: true,
--   post_recaps: false
-- }

-- Add note field to campaign_members for session response
ALTER TABLE campaign_members
ADD COLUMN IF NOT EXISTS next_session_note TEXT;

-- Update next_session_status default to 'attending' (assumed model)
-- Note: Existing values remain, new records get 'attending'
ALTER TABLE campaign_members
ALTER COLUMN next_session_status SET DEFAULT 'attending';

-- Add index for efficient timezone lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_timezone ON user_settings(timezone);

-- Comment for documentation
COMMENT ON COLUMN campaigns.schedule_pattern IS 'Recurring session schedule pattern (weekly, biweekly, monthly, adhoc, hiatus)';
COMMENT ON COLUMN campaigns.schedule_settings IS 'Scheduling mode and settings (off, simple, full)';
COMMENT ON COLUMN campaigns.schedule_exceptions IS 'Array of schedule exceptions (skip, reschedule, confirmed)';
COMMENT ON COLUMN user_settings.timezone IS 'User timezone for displaying session times';

-- Migration: Add account deletion grace period support
-- This implements a 14-day grace period before permanent account deletion

-- Add deletion scheduling columns to user_settings
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deletion_scheduled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deletion_cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deletion_cancellation_token TEXT;

-- Add index for efficient cron job queries (find accounts ready for deletion)
CREATE INDEX IF NOT EXISTS idx_user_settings_deletion_scheduled
ON user_settings (deletion_scheduled_at)
WHERE deletion_scheduled_at IS NOT NULL;

-- Add index for cancellation token lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_deletion_token
ON user_settings (deletion_cancellation_token)
WHERE deletion_cancellation_token IS NOT NULL;

-- Add comment explaining the columns
COMMENT ON COLUMN user_settings.deletion_requested_at IS 'When the user first requested account deletion';
COMMENT ON COLUMN user_settings.deletion_scheduled_at IS 'When the account will be permanently deleted (14 days after request)';
COMMENT ON COLUMN user_settings.deletion_cancelled_at IS 'When the user cancelled a pending deletion (for audit trail)';
COMMENT ON COLUMN user_settings.deletion_cancellation_token IS 'Secure token for cancelling deletion via email link';

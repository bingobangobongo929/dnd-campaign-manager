-- Trusted devices for 2FA "Remember this device" functionality
-- Allows users to skip 2FA for trusted devices for a period of time

CREATE TABLE IF NOT EXISTS trusted_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_token TEXT NOT NULL UNIQUE,
  device_name TEXT, -- e.g., "Chrome on Windows"
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days')
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id ON trusted_devices(user_id);

-- Index for token lookups
CREATE INDEX IF NOT EXISTS idx_trusted_devices_token ON trusted_devices(device_token);

-- RLS policies
ALTER TABLE trusted_devices ENABLE ROW LEVEL SECURITY;

-- Users can only see their own trusted devices
CREATE POLICY "Users can view own trusted devices"
  ON trusted_devices FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own trusted devices
CREATE POLICY "Users can create own trusted devices"
  ON trusted_devices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own trusted devices
CREATE POLICY "Users can delete own trusted devices"
  ON trusted_devices FOR DELETE
  USING (auth.uid() = user_id);

-- Users can update their own trusted devices (for last_used_at)
CREATE POLICY "Users can update own trusted devices"
  ON trusted_devices FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to clean up expired devices (can be called by cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_trusted_devices()
RETURNS void AS $$
BEGIN
  DELETE FROM trusted_devices WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

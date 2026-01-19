-- Fix: The CHECK constraint in migration 027 may not have been applied correctly
-- PostgreSQL doesn't support inline CHECK constraints with ALTER TABLE ADD COLUMN
-- This migration ensures the constraint is properly added

-- First, drop any existing constraint (if it somehow got created)
ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_role_check;

-- Add the constraint properly
ALTER TABLE user_settings
ADD CONSTRAINT user_settings_role_check
CHECK (role IN ('user', 'moderator', 'super_admin'));

-- Also update the create_default_user_settings function to include new columns
CREATE OR REPLACE FUNCTION create_default_user_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_settings (user_id, role, tier, ai_provider, theme)
  VALUES (NEW.id, 'user', 'free', 'anthropic', 'dark');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

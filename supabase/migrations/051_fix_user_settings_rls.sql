-- Fix user_settings RLS policies
-- The original policy "Users can view their settings" was never dropped
-- because the DROP statement used a different name

-- Drop ALL possible variations of the SELECT policy
DROP POLICY IF EXISTS "Users can view their settings" ON user_settings;
DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can view their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can view own settings or admins can view all" ON user_settings;

-- Create the correct policy: users see their own, admins see all
CREATE POLICY "Users can view own settings or admins can view all" ON user_settings
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM user_settings us
      WHERE us.user_id = auth.uid()
      AND us.role IN ('super_admin', 'moderator')
    )
  );

-- Also fix UPDATE policy to allow admins to update any user
DROP POLICY IF EXISTS "Users can update their settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update own settings or super_admin can update all" ON user_settings;

CREATE POLICY "Users can update own settings or super_admin can update all" ON user_settings
  FOR UPDATE USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM user_settings us
      WHERE us.user_id = auth.uid()
      AND us.role = 'super_admin'
    )
  )
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM user_settings us
      WHERE us.user_id = auth.uid()
      AND us.role = 'super_admin'
    )
  );

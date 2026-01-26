-- ============================================
-- Migration 085: Fix app_settings RLS policies
--
-- Bug fix: The original policies check for role 'admin' which doesn't exist.
-- Valid roles are: 'user', 'moderator', 'super_admin'
-- ============================================

-- Fix the UPDATE policy
DROP POLICY IF EXISTS "Only admins can update app settings" ON app_settings;
CREATE POLICY "Only admins can update app settings" ON app_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_settings
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Fix the INSERT policy
DROP POLICY IF EXISTS "Only admins can insert app settings" ON app_settings;
CREATE POLICY "Only admins can insert app settings" ON app_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_settings
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Add DELETE policy for admins on waitlist table
-- This allows admins/moderators to delete waitlist entries

CREATE POLICY "Admins can delete waitlist entries"
  ON waitlist
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_settings
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'moderator')
    )
  );

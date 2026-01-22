-- Fix changelog RLS to allow super_admins to manage entries
-- The existing policy only allows public SELECT

-- Drop the restrictive SELECT policy and create proper ones
DROP POLICY IF EXISTS "Changelog is publicly readable" ON changelog;

-- Anyone can read published entries (for public /changelog page)
CREATE POLICY "Public can read published changelog"
  ON changelog FOR SELECT
  USING (published_at <= now());

-- Super admins can do everything via their role in user_settings
CREATE POLICY "Super admins can insert changelog"
  ON changelog FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_settings
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can update changelog"
  ON changelog FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_settings
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_settings
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can delete changelog"
  ON changelog FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_settings
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Also allow super_admins to read all entries (including unpublished/scheduled)
CREATE POLICY "Super admins can read all changelog"
  ON changelog FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_settings
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- ============================================
-- Migration 045: Fix RLS policies to filter deleted content
--
-- The "Anyone can view demo X" policies were missing
-- deleted_at filters, causing deleted demo content to show.
-- ============================================

-- Fix demo oneshots policy (may already be fixed manually)
DROP POLICY IF EXISTS "Anyone can view demo oneshots" ON oneshots;
CREATE POLICY "Anyone can view demo oneshots" ON oneshots
  FOR SELECT USING (is_demo = true AND deleted_at IS NULL);

-- Fix demo campaigns policy if it exists
DROP POLICY IF EXISTS "Anyone can view demo campaigns" ON campaigns;
CREATE POLICY "Anyone can view demo campaigns" ON campaigns
  FOR SELECT USING (is_demo = true AND deleted_at IS NULL);

-- Fix demo vault_characters policy if it exists
DROP POLICY IF EXISTS "Anyone can view demo characters" ON vault_characters;
CREATE POLICY "Anyone can view demo characters" ON vault_characters
  FOR SELECT USING (is_demo = true AND deleted_at IS NULL);

-- Also fix "Public can view demo X" policies
DROP POLICY IF EXISTS "Public can view demo oneshots" ON oneshots;
CREATE POLICY "Public can view demo oneshots" ON oneshots
  FOR SELECT USING (is_demo = true AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Public can view demo campaigns" ON campaigns;
CREATE POLICY "Public can view demo campaigns" ON campaigns
  FOR SELECT USING (is_demo = true AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Public can view demo characters" ON vault_characters;
CREATE POLICY "Public can view demo characters" ON vault_characters
  FOR SELECT USING (is_demo = true AND deleted_at IS NULL);

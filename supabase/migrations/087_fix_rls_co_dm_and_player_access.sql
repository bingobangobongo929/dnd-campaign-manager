-- ============================================
-- Migration 087: Fix RLS for co-DM and player-controlled characters
--
-- Issues fixed:
-- 1. player_session_notes: co_dm role couldn't manage other users' notes
-- 2. characters: co_dm couldn't update/delete characters
-- 3. characters: players couldn't update their controlled_by_user_id characters
-- ============================================

-- ============================================
-- PART 1: Create helper function for DM role check
-- ============================================

-- Function to check if user is DM (owner OR co_dm) of a campaign
CREATE OR REPLACE FUNCTION user_is_dm_of_campaign(
  p_campaign_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  -- Check if owner
  IF EXISTS (
    SELECT 1 FROM campaigns
    WHERE id = p_campaign_id AND user_id = p_user_id
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check if co_dm
  RETURN EXISTS (
    SELECT 1 FROM campaign_members
    WHERE campaign_id = p_campaign_id
      AND user_id = p_user_id
      AND role = 'co_dm'
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if user can modify content (owner OR co_dm)
CREATE OR REPLACE FUNCTION user_can_modify_content(
  p_campaign_id UUID,
  p_oneshot_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  IF p_campaign_id IS NOT NULL THEN
    RETURN user_is_dm_of_campaign(p_campaign_id, p_user_id);
  ELSIF p_oneshot_id IS NOT NULL THEN
    -- Oneshots only have owner, no co-dm concept
    RETURN EXISTS (
      SELECT 1 FROM oneshots
      WHERE id = p_oneshot_id AND user_id = p_user_id
    );
  END IF;
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- PART 2: Fix player_session_notes RLS to include co_dm
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view session notes" ON player_session_notes;
DROP POLICY IF EXISTS "Users can add session notes" ON player_session_notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON player_session_notes;
DROP POLICY IF EXISTS "Users can delete their own notes" ON player_session_notes;

-- SELECT policy - users can view notes they added OR notes for campaigns they are DM of
CREATE POLICY "Users can view session notes"
ON player_session_notes FOR SELECT
USING (
  -- User added the note
  added_by_user_id = auth.uid()
  -- OR user is DM of the campaign the session belongs to
  OR session_id IN (
    SELECT s.id FROM sessions s
    WHERE user_is_dm_of_campaign(s.campaign_id, auth.uid())
  )
  -- OR user is a campaign member and note is shared with party
  OR (
    is_shared_with_party = true
    AND session_id IN (
      SELECT s.id FROM sessions s
      JOIN campaign_members cm ON cm.campaign_id = s.campaign_id
      WHERE cm.user_id = auth.uid() AND cm.status = 'active'
    )
  )
);

-- INSERT policy - same as before, user must be adding their own note
CREATE POLICY "Users can add session notes"
ON player_session_notes FOR INSERT
WITH CHECK (
  added_by_user_id = auth.uid()
);

-- UPDATE policy - author can update own, DMs can update any in their campaigns
CREATE POLICY "Users can update session notes"
ON player_session_notes FOR UPDATE
USING (
  added_by_user_id = auth.uid()
  OR session_id IN (
    SELECT s.id FROM sessions s
    WHERE user_is_dm_of_campaign(s.campaign_id, auth.uid())
  )
);

-- DELETE policy - author can delete own, DMs can delete any in their campaigns
CREATE POLICY "Users can delete session notes"
ON player_session_notes FOR DELETE
USING (
  added_by_user_id = auth.uid()
  OR session_id IN (
    SELECT s.id FROM sessions s
    WHERE user_is_dm_of_campaign(s.campaign_id, auth.uid())
  )
);

-- ============================================
-- PART 3: Fix characters RLS for co_dm and player-controlled characters
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view characters in their content" ON characters;
DROP POLICY IF EXISTS "Users can insert characters in their content" ON characters;
DROP POLICY IF EXISTS "Users can update characters in their content" ON characters;
DROP POLICY IF EXISTS "Users can delete characters in their content" ON characters;
DROP POLICY IF EXISTS "Public can view demo campaign characters" ON characters;

-- SELECT policy - members can view characters in campaigns they belong to
CREATE POLICY "Users can view characters in their content"
ON characters FOR SELECT
USING (
  user_can_access_content(campaign_id, oneshot_id, auth.uid())
  -- Also allow viewing demo content
  OR campaign_id IN (SELECT id FROM campaigns WHERE is_demo = true)
);

-- INSERT policy - DMs (owner or co_dm) can insert characters
CREATE POLICY "Users can insert characters in their content"
ON characters FOR INSERT
WITH CHECK (
  user_can_modify_content(campaign_id, oneshot_id, auth.uid())
);

-- UPDATE policy - DMs can update any, players can update their controlled characters
CREATE POLICY "Users can update characters in their content"
ON characters FOR UPDATE
USING (
  -- DMs (owner or co_dm) can update any character
  user_can_modify_content(campaign_id, oneshot_id, auth.uid())
  -- OR player controls this character
  OR (
    controlled_by_user_id = auth.uid()
    AND campaign_id IS NOT NULL
  )
);

-- DELETE policy - only DMs can delete characters
CREATE POLICY "Users can delete characters in their content"
ON characters FOR DELETE
USING (
  user_can_modify_content(campaign_id, oneshot_id, auth.uid())
);

-- ============================================
-- PART 4: Update user_owns_content to be clearer about its purpose
-- (Keep for backwards compatibility but document it's ownership only)
-- ============================================

-- Add comment to clarify function purpose
COMMENT ON FUNCTION user_owns_content(UUID, UUID, UUID) IS
  'Checks if user OWNS the content (campaign.user_id or oneshot.user_id). '
  'Does NOT include co_dm. Use user_can_modify_content for modify operations.';

COMMENT ON FUNCTION user_can_modify_content(UUID, UUID, UUID) IS
  'Checks if user can modify content (owner OR co_dm for campaigns, owner for oneshots).';

COMMENT ON FUNCTION user_is_dm_of_campaign(UUID, UUID) IS
  'Checks if user is DM of campaign (owner OR co_dm with active status).';

-- ============================================
-- PART 5: Fix entity_secrets RLS for co_dm access
-- ============================================

DROP POLICY IF EXISTS "Campaign owners can manage secrets" ON entity_secrets;
DROP POLICY IF EXISTS "Users can view revealed secrets" ON entity_secrets;

-- DMs can manage all secrets for their campaigns
-- Note: Table names are campaign_lore, campaign_factions, locations
CREATE POLICY "DMs can manage secrets"
ON entity_secrets FOR ALL
USING (
  -- Get campaign_id based on entity type and check DM status
  CASE entity_type
    WHEN 'character' THEN
      EXISTS (
        SELECT 1 FROM characters c
        WHERE c.id = entity_id
        AND user_is_dm_of_campaign(c.campaign_id, auth.uid())
      )
    WHEN 'session' THEN
      EXISTS (
        SELECT 1 FROM sessions s
        WHERE s.id = entity_id
        AND user_is_dm_of_campaign(s.campaign_id, auth.uid())
      )
    WHEN 'timeline_event' THEN
      EXISTS (
        SELECT 1 FROM timeline_events te
        WHERE te.id = entity_id
        AND user_is_dm_of_campaign(te.campaign_id, auth.uid())
      )
    WHEN 'lore' THEN
      EXISTS (
        SELECT 1 FROM campaign_lore cl
        WHERE cl.id = entity_id
        AND user_is_dm_of_campaign(cl.campaign_id, auth.uid())
      )
    WHEN 'faction' THEN
      EXISTS (
        SELECT 1 FROM campaign_factions cf
        WHERE cf.id = entity_id
        AND user_is_dm_of_campaign(cf.campaign_id, auth.uid())
      )
    WHEN 'location' THEN
      EXISTS (
        SELECT 1 FROM locations l
        WHERE l.id = entity_id
        AND user_is_dm_of_campaign(l.campaign_id, auth.uid())
      )
    WHEN 'artifact' THEN
      EXISTS (
        SELECT 1 FROM campaign_lore cl
        WHERE cl.id = entity_id
        AND cl.lore_type = 'artifact'
        AND user_is_dm_of_campaign(cl.campaign_id, auth.uid())
      )
    ELSE FALSE
  END
);

-- Members can view revealed (non-dm_only) secrets
CREATE POLICY "Members can view revealed secrets"
ON entity_secrets FOR SELECT
USING (
  visibility IN ('party', 'public')
  AND (
    CASE entity_type
      WHEN 'character' THEN
        EXISTS (
          SELECT 1 FROM characters c
          JOIN campaign_members cm ON cm.campaign_id = c.campaign_id
          WHERE c.id = entity_id
          AND cm.user_id = auth.uid()
          AND cm.status = 'active'
        )
      WHEN 'session' THEN
        EXISTS (
          SELECT 1 FROM sessions s
          JOIN campaign_members cm ON cm.campaign_id = s.campaign_id
          WHERE s.id = entity_id
          AND cm.user_id = auth.uid()
          AND cm.status = 'active'
        )
      WHEN 'timeline_event' THEN
        EXISTS (
          SELECT 1 FROM timeline_events te
          JOIN campaign_members cm ON cm.campaign_id = te.campaign_id
          WHERE te.id = entity_id
          AND cm.user_id = auth.uid()
          AND cm.status = 'active'
        )
      WHEN 'lore' THEN
        EXISTS (
          SELECT 1 FROM campaign_lore cl
          JOIN campaign_members cm ON cm.campaign_id = cl.campaign_id
          WHERE cl.id = entity_id
          AND cm.user_id = auth.uid()
          AND cm.status = 'active'
        )
      WHEN 'faction' THEN
        EXISTS (
          SELECT 1 FROM campaign_factions cf
          JOIN campaign_members cm ON cm.campaign_id = cf.campaign_id
          WHERE cf.id = entity_id
          AND cm.user_id = auth.uid()
          AND cm.status = 'active'
        )
      WHEN 'location' THEN
        EXISTS (
          SELECT 1 FROM locations l
          JOIN campaign_members cm ON cm.campaign_id = l.campaign_id
          WHERE l.id = entity_id
          AND cm.user_id = auth.uid()
          AND cm.status = 'active'
        )
      WHEN 'artifact' THEN
        EXISTS (
          SELECT 1 FROM campaign_lore cl
          JOIN campaign_members cm ON cm.campaign_id = cl.campaign_id
          WHERE cl.id = entity_id
          AND cl.lore_type = 'artifact'
          AND cm.user_id = auth.uid()
          AND cm.status = 'active'
        )
      ELSE FALSE
    END
  )
);

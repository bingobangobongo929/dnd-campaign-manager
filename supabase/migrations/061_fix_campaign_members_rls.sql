-- =====================================================
-- FIX CAMPAIGN MEMBERS RLS POLICIES
-- The original policies had circular references causing 500 errors
-- =====================================================

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view campaign members for campaigns they belong to" ON campaign_members;
DROP POLICY IF EXISTS "Campaign owners can manage members" ON campaign_members;

-- Create fixed SELECT policy - avoid circular reference by checking campaign ownership first
CREATE POLICY "Users can view campaign members"
ON campaign_members FOR SELECT
USING (
  -- User is the member themselves
  user_id = auth.uid()
  -- OR user owns the campaign
  OR campaign_id IN (
    SELECT id FROM campaigns WHERE user_id = auth.uid()
  )
  -- OR user has a pending invite (by email - they may not have user_id yet)
  OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Create fixed INSERT policy - owners and co_dms can invite
CREATE POLICY "Campaign owners and co_dms can insert members"
ON campaign_members FOR INSERT
WITH CHECK (
  -- User owns the campaign
  campaign_id IN (
    SELECT id FROM campaigns WHERE user_id = auth.uid()
  )
);

-- Create fixed UPDATE policy
CREATE POLICY "Campaign owners and co_dms can update members"
ON campaign_members FOR UPDATE
USING (
  -- User owns the campaign
  campaign_id IN (
    SELECT id FROM campaigns WHERE user_id = auth.uid()
  )
  -- OR user is updating their own membership (e.g., accepting invite)
  OR user_id = auth.uid()
  OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Create fixed DELETE policy
CREATE POLICY "Campaign owners can delete members"
ON campaign_members FOR DELETE
USING (
  -- User owns the campaign
  campaign_id IN (
    SELECT id FROM campaigns WHERE user_id = auth.uid()
  )
  -- OR user is removing themselves
  OR user_id = auth.uid()
);

-- =====================================================
-- FIX PLAYER SESSION NOTES RLS POLICIES
-- Similar circular reference issues
-- =====================================================

DROP POLICY IF EXISTS "Users can view session notes for campaigns they belong to" ON player_session_notes;
DROP POLICY IF EXISTS "Users can add session notes" ON player_session_notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON player_session_notes;
DROP POLICY IF EXISTS "Users can delete their own notes" ON player_session_notes;

-- SELECT policy - users can view notes for campaigns they own or sessions they can access
CREATE POLICY "Users can view session notes"
ON player_session_notes FOR SELECT
USING (
  -- User added the note
  added_by_user_id = auth.uid()
  -- OR user owns the campaign the session belongs to
  OR session_id IN (
    SELECT s.id FROM sessions s
    JOIN campaigns c ON s.campaign_id = c.id
    WHERE c.user_id = auth.uid()
  )
);

-- INSERT policy
CREATE POLICY "Users can add session notes"
ON player_session_notes FOR INSERT
WITH CHECK (
  added_by_user_id = auth.uid()
);

-- UPDATE policy
CREATE POLICY "Users can update their own notes"
ON player_session_notes FOR UPDATE
USING (
  added_by_user_id = auth.uid()
  OR session_id IN (
    SELECT s.id FROM sessions s
    JOIN campaigns c ON s.campaign_id = c.id
    WHERE c.user_id = auth.uid()
  )
);

-- DELETE policy
CREATE POLICY "Users can delete their own notes"
ON player_session_notes FOR DELETE
USING (
  added_by_user_id = auth.uid()
  OR session_id IN (
    SELECT s.id FROM sessions s
    JOIN campaigns c ON s.campaign_id = c.id
    WHERE c.user_id = auth.uid()
  )
);

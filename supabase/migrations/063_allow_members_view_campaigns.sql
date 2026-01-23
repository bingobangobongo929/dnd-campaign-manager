-- =====================================================
-- ALLOW CAMPAIGN MEMBERS TO VIEW CAMPAIGNS
-- Players who have joined a campaign should be able to view it
-- =====================================================

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can view their own campaigns" ON campaigns;

-- Create new policy that allows:
-- 1. Campaign owners (user_id = auth.uid())
-- 2. Campaign members (exists in campaign_members with user_id = auth.uid())
CREATE POLICY "Users can view campaigns they own or belong to"
ON campaigns FOR SELECT
USING (
  -- User owns the campaign
  user_id = auth.uid()
  -- OR user is a member of the campaign
  OR id IN (
    SELECT campaign_id FROM campaign_members
    WHERE user_id = auth.uid()
    AND status = 'active'
  )
);

-- Also update related tables that campaign members should be able to view

-- Characters: members should see characters in campaigns they belong to
DROP POLICY IF EXISTS "Users can view characters in their campaigns" ON characters;

CREATE POLICY "Users can view characters in accessible campaigns"
ON characters FOR SELECT
USING (
  -- User owns the campaign
  campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid())
  -- OR user is a member of the campaign
  OR campaign_id IN (
    SELECT campaign_id FROM campaign_members
    WHERE user_id = auth.uid()
    AND status = 'active'
  )
);

-- Sessions: members should see sessions in campaigns they belong to
DROP POLICY IF EXISTS "Users can view sessions in their campaigns" ON sessions;

CREATE POLICY "Users can view sessions in accessible campaigns"
ON sessions FOR SELECT
USING (
  -- User owns the campaign
  campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid())
  -- OR user is a member of the campaign
  OR campaign_id IN (
    SELECT campaign_id FROM campaign_members
    WHERE user_id = auth.uid()
    AND status = 'active'
  )
);

-- Timeline events: members should see timeline in campaigns they belong to
DROP POLICY IF EXISTS "Users can view timeline events in their campaigns" ON timeline_events;

CREATE POLICY "Users can view timeline events in accessible campaigns"
ON timeline_events FOR SELECT
USING (
  -- User owns the campaign
  campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid())
  -- OR user is a member of the campaign
  OR campaign_id IN (
    SELECT campaign_id FROM campaign_members
    WHERE user_id = auth.uid()
    AND status = 'active'
  )
);

-- =====================================================
-- FIX CAMPAIGN MEMBERS INSERT POLICY
-- The previous policy only allowed owners, but co_dms should also be able to invite
-- =====================================================

-- Drop and recreate the INSERT policy to allow both owners AND co_dms
DROP POLICY IF EXISTS "Campaign owners and co_dms can insert members" ON campaign_members;

CREATE POLICY "Campaign owners and co_dms can insert members"
ON campaign_members FOR INSERT
WITH CHECK (
  -- User owns the campaign
  campaign_id IN (
    SELECT id FROM campaigns WHERE user_id = auth.uid()
  )
  -- OR user is a co_dm of the campaign
  OR campaign_id IN (
    SELECT campaign_id FROM campaign_members
    WHERE user_id = auth.uid() AND role = 'co_dm'
  )
);

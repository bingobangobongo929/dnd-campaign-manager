-- =====================================================
-- FIX MEMBER SELF-ACCESS RLS
-- Ensure members can query their own membership records
-- =====================================================

-- First, drop any conflicting policies on campaign_members
DROP POLICY IF EXISTS "Users can view campaign members" ON campaign_members;
DROP POLICY IF EXISTS "Users can view campaign members for campaigns they belong to" ON campaign_members;
DROP POLICY IF EXISTS "Members can view campaign members" ON campaign_members;

-- Create helper functions with SECURITY DEFINER to bypass RLS during checks

-- Check if user owns a campaign
CREATE OR REPLACE FUNCTION is_campaign_owner(p_campaign_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM campaigns
    WHERE id = p_campaign_id
    AND user_id = p_user_id
  );
$$;

-- Check if user is an active member of a campaign
CREATE OR REPLACE FUNCTION is_active_campaign_member(p_campaign_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM campaign_members
    WHERE campaign_id = p_campaign_id
    AND user_id = p_user_id
    AND status = 'active'
  );
$$;

-- Get user's email from auth.users
CREATE OR REPLACE FUNCTION get_user_email(p_user_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT email FROM auth.users WHERE id = p_user_id;
$$;

-- Create a simple, permissive SELECT policy for campaign_members
-- This allows:
-- 1. Users to see their own membership records (user_id = auth.uid())
-- 2. Campaign owners to see all members in their campaigns
-- 3. Users with pending invites by email
-- 4. All active members of a campaign to see other members in that same campaign
CREATE POLICY "Users can view campaign members"
ON campaign_members FOR SELECT
USING (
  -- User is the member themselves (can always see own records)
  user_id = auth.uid()
  -- OR user owns the campaign (using function to bypass RLS)
  OR is_campaign_owner(campaign_id, auth.uid())
  -- OR user has a pending invite by email
  OR email = get_user_email(auth.uid())
  -- OR user is an active member of the same campaign (can see fellow members)
  OR is_active_campaign_member(campaign_id, auth.uid())
);

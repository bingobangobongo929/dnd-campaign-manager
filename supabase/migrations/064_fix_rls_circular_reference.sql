-- =====================================================
-- FIX RLS CIRCULAR REFERENCE
-- The campaigns policy references campaign_members and vice versa
-- causing infinite recursion and 500 errors
-- Solution: Use SECURITY DEFINER functions to bypass RLS for membership checks
-- =====================================================

-- Create a function to check if user is a campaign member (bypasses RLS)
CREATE OR REPLACE FUNCTION is_campaign_member(p_campaign_id UUID, p_user_id UUID)
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

-- Create a function to check if user owns a campaign (bypasses RLS)
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

-- Create a function to get campaign IDs user owns (bypasses RLS)
CREATE OR REPLACE FUNCTION get_owned_campaign_ids(p_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM campaigns WHERE user_id = p_user_id;
$$;

-- Create a function to get campaign IDs user is a member of (bypasses RLS)
CREATE OR REPLACE FUNCTION get_member_campaign_ids(p_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT campaign_id FROM campaign_members
  WHERE user_id = p_user_id
  AND status = 'active';
$$;

-- =====================================================
-- FIX CAMPAIGNS POLICY
-- =====================================================

DROP POLICY IF EXISTS "Users can view campaigns they own or belong to" ON campaigns;

CREATE POLICY "Users can view campaigns they own or belong to"
ON campaigns FOR SELECT
USING (
  -- User owns the campaign
  user_id = auth.uid()
  -- OR user is an active member (using function to avoid circular reference)
  OR is_campaign_member(id, auth.uid())
);

-- =====================================================
-- FIX CAMPAIGN_MEMBERS POLICY
-- =====================================================

DROP POLICY IF EXISTS "Users can view campaign members" ON campaign_members;

CREATE POLICY "Users can view campaign members"
ON campaign_members FOR SELECT
USING (
  -- User is the member themselves
  user_id = auth.uid()
  -- OR user owns the campaign (using function to avoid circular reference)
  OR is_campaign_owner(campaign_id, auth.uid())
  -- OR user has a pending invite by email
  OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- =====================================================
-- FIX CHARACTERS POLICY
-- =====================================================

DROP POLICY IF EXISTS "Users can view characters in accessible campaigns" ON characters;

CREATE POLICY "Users can view characters in accessible campaigns"
ON characters FOR SELECT
USING (
  -- User owns the campaign (using function)
  campaign_id IN (SELECT get_owned_campaign_ids(auth.uid()))
  -- OR user is a member of the campaign (using function)
  OR campaign_id IN (SELECT get_member_campaign_ids(auth.uid()))
);

-- =====================================================
-- FIX SESSIONS POLICY
-- =====================================================

DROP POLICY IF EXISTS "Users can view sessions in accessible campaigns" ON sessions;

CREATE POLICY "Users can view sessions in accessible campaigns"
ON sessions FOR SELECT
USING (
  -- User owns the campaign (using function)
  campaign_id IN (SELECT get_owned_campaign_ids(auth.uid()))
  -- OR user is a member of the campaign (using function)
  OR campaign_id IN (SELECT get_member_campaign_ids(auth.uid()))
);

-- =====================================================
-- FIX TIMELINE_EVENTS POLICY
-- =====================================================

DROP POLICY IF EXISTS "Users can view timeline events in accessible campaigns" ON timeline_events;

CREATE POLICY "Users can view timeline events in accessible campaigns"
ON timeline_events FOR SELECT
USING (
  -- User owns the campaign (using function)
  campaign_id IN (SELECT get_owned_campaign_ids(auth.uid()))
  -- OR user is a member of the campaign (using function)
  OR campaign_id IN (SELECT get_member_campaign_ids(auth.uid()))
);

-- =====================================================
-- FIX CAMPAIGN_LORE POLICY (if it exists)
-- =====================================================

DROP POLICY IF EXISTS "Users can view campaign lore" ON campaign_lore;
DROP POLICY IF EXISTS "Users can view their campaign lore" ON campaign_lore;

CREATE POLICY "Users can view campaign lore"
ON campaign_lore FOR SELECT
USING (
  -- User owns the campaign (using function)
  campaign_id IN (SELECT get_owned_campaign_ids(auth.uid()))
  -- OR user is a member of the campaign (using function)
  OR campaign_id IN (SELECT get_member_campaign_ids(auth.uid()))
);

-- =====================================================
-- FIX CANVAS_GROUPS POLICY (if it exists)
-- =====================================================

DROP POLICY IF EXISTS "Users can view canvas groups" ON canvas_groups;
DROP POLICY IF EXISTS "Users can view their canvas groups" ON canvas_groups;

CREATE POLICY "Users can view canvas groups"
ON canvas_groups FOR SELECT
USING (
  -- User owns the campaign (using function)
  campaign_id IN (SELECT get_owned_campaign_ids(auth.uid()))
  -- OR user is a member of the campaign (using function)
  OR campaign_id IN (SELECT get_member_campaign_ids(auth.uid()))
);

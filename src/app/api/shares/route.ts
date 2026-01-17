/**
 * Shares API - Fetch all user shares with analytics
 *
 * GET: Retrieve all shares for the current user with view counts and analytics
 * DELETE: Revoke a specific share
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

interface ShareWithDetails {
  id: string
  share_code: string
  type: 'character' | 'oneshot' | 'campaign'
  item_id: string
  item_name: string
  item_image?: string | null
  included_sections: Record<string, boolean>
  expires_at: string | null
  view_count: number
  last_viewed_at: string | null
  note: string | null
  created_at: string
  is_expired: boolean
  // Analytics
  unique_viewers?: number
  views_last_7_days?: number
  views_last_30_days?: number
}

// GET - Retrieve all shares
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // First, get the user's owned item IDs to filter shares properly
    const [userCharacters, userOneshots, userCampaigns] = await Promise.all([
      supabase.from('vault_characters').select('id').eq('user_id', user.id),
      supabase.from('oneshots').select('id').eq('user_id', user.id),
      supabase.from('campaigns').select('id').eq('user_id', user.id),
    ])

    const characterIds = (userCharacters.data || []).map(c => c.id)
    const oneshotIds = (userOneshots.data || []).map(o => o.id)
    const campaignIds = (userCampaigns.data || []).map(c => c.id)

    // Fetch character shares with character info
    let characterShares: any[] = []
    if (characterIds.length > 0) {
      const { data } = await supabase
        .from('character_shares')
        .select(`
          *,
          vault_characters (
            id,
            name,
            portrait_url
          )
        `)
        .in('character_id', characterIds)
      characterShares = data || []
    }

    // Fetch oneshot shares with oneshot info
    let oneshotShares: any[] = []
    if (oneshotIds.length > 0) {
      const { data } = await supabase
        .from('oneshot_shares')
        .select(`
          *,
          oneshots (
            id,
            title,
            cover_image_url
          )
        `)
        .in('oneshot_id', oneshotIds)
      oneshotShares = data || []
    }

    // Fetch campaign shares with campaign info
    let campaignShares: any[] = []
    if (campaignIds.length > 0) {
      const { data } = await supabase
        .from('campaign_shares')
        .select(`
          *,
          campaigns (
            id,
            name,
            cover_image_url
          )
        `)
        .in('campaign_id', campaignIds)
      campaignShares = data || []
    }

    // Collect all share IDs for analytics queries
    const characterShareIds = (characterShares || []).map(s => s.id)
    const oneshotShareIds = (oneshotShares || []).map(s => s.id)
    const campaignShareIds = (campaignShares || []).map(s => s.id)
    const allShareIds = [...characterShareIds, ...oneshotShareIds, ...campaignShareIds]

    // Fetch view events for analytics
    let viewEvents: any[] = []
    if (allShareIds.length > 0) {
      const { data } = await supabase
        .from('share_view_events')
        .select('share_id, share_type, viewer_hash, viewed_at')
        .in('share_id', allShareIds)

      viewEvents = data || []
    }

    // Build analytics map
    const analyticsMap = new Map<string, {
      unique_viewers: number
      views_last_7_days: number
      views_last_30_days: number
    }>()

    for (const shareId of allShareIds) {
      const events = viewEvents.filter(e => e.share_id === shareId)
      const uniqueViewers = new Set(events.map(e => e.viewer_hash)).size
      const views7Days = events.filter(e => new Date(e.viewed_at) >= sevenDaysAgo).length
      const views30Days = events.filter(e => new Date(e.viewed_at) >= thirtyDaysAgo).length

      analyticsMap.set(shareId, {
        unique_viewers: uniqueViewers,
        views_last_7_days: views7Days,
        views_last_30_days: views30Days,
      })
    }

    // Transform character shares
    const transformedCharacterShares: ShareWithDetails[] = (characterShares || []).map((share: any) => ({
      id: share.id,
      share_code: share.share_code,
      type: 'character' as const,
      item_id: share.character_id,
      item_name: share.vault_characters.name,
      item_image: share.vault_characters.portrait_url,
      included_sections: share.included_sections || {},
      expires_at: share.expires_at,
      view_count: share.view_count || 0,
      last_viewed_at: share.last_viewed_at,
      note: share.note,
      created_at: share.created_at,
      is_expired: share.expires_at ? new Date(share.expires_at) < now : false,
      ...analyticsMap.get(share.id),
    }))

    // Transform oneshot shares
    const transformedOneshotShares: ShareWithDetails[] = (oneshotShares || []).map((share: any) => ({
      id: share.id,
      share_code: share.share_code,
      type: 'oneshot' as const,
      item_id: share.oneshot_id,
      item_name: share.oneshots.title,
      item_image: share.oneshots.cover_image_url,
      included_sections: share.included_sections || {},
      expires_at: share.expires_at,
      view_count: share.view_count || 0,
      last_viewed_at: share.last_viewed_at,
      note: share.note,
      created_at: share.created_at,
      is_expired: share.expires_at ? new Date(share.expires_at) < now : false,
      ...analyticsMap.get(share.id),
    }))

    // Transform campaign shares
    const transformedCampaignShares: ShareWithDetails[] = (campaignShares || []).map((share: any) => ({
      id: share.id,
      share_code: share.share_code,
      type: 'campaign' as const,
      item_id: share.campaign_id,
      item_name: share.campaigns.name,
      item_image: share.campaigns.cover_image_url,
      included_sections: share.included_sections || {},
      expires_at: share.expires_at,
      view_count: share.view_count || 0,
      last_viewed_at: share.last_viewed_at,
      note: share.note,
      created_at: share.created_at,
      is_expired: share.expires_at ? new Date(share.expires_at) < now : false,
      ...analyticsMap.get(share.id),
    }))

    // Combine and sort by created_at desc
    const allShares = [
      ...transformedCharacterShares,
      ...transformedOneshotShares,
      ...transformedCampaignShares,
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // Calculate summary stats
    const activeShares = allShares.filter(s => !s.is_expired)
    const totalViews = allShares.reduce((sum, s) => sum + s.view_count, 0)
    const totalUniqueViewers = allShares.reduce((sum, s) => sum + (s.unique_viewers || 0), 0)
    const viewsLast7Days = allShares.reduce((sum, s) => sum + (s.views_last_7_days || 0), 0)
    const viewsLast30Days = allShares.reduce((sum, s) => sum + (s.views_last_30_days || 0), 0)

    return NextResponse.json({
      shares: allShares,
      summary: {
        total_shares: allShares.length,
        active_shares: activeShares.length,
        expired_shares: allShares.length - activeShares.length,
        total_views: totalViews,
        total_unique_viewers: totalUniqueViewers,
        views_last_7_days: viewsLast7Days,
        views_last_30_days: viewsLast30Days,
        by_type: {
          character: transformedCharacterShares.length,
          oneshot: transformedOneshotShares.length,
          campaign: transformedCampaignShares.length,
        },
      },
    })
  } catch (error) {
    console.error('Shares API error:', error)
    return NextResponse.json({ error: 'Failed to fetch shares' }, { status: 500 })
  }
}

// DELETE - Revoke a share
export async function DELETE(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const shareId = searchParams.get('id')
    const shareType = searchParams.get('type') as 'character' | 'oneshot' | 'campaign'

    if (!shareId || !shareType) {
      return NextResponse.json({ error: 'Missing id or type parameter' }, { status: 400 })
    }

    // Determine table based on type
    const tableMap = {
      character: 'character_shares',
      oneshot: 'oneshot_shares',
      campaign: 'campaign_shares',
    }

    const table = tableMap[shareType]
    if (!table) {
      return NextResponse.json({ error: 'Invalid share type' }, { status: 400 })
    }

    // Delete the share (RLS will ensure ownership)
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', shareId)

    if (error) {
      console.error('Delete share error:', error)
      return NextResponse.json({ error: 'Failed to delete share' }, { status: 500 })
    }

    // Also delete associated view events
    await supabase
      .from('share_view_events')
      .delete()
      .eq('share_id', shareId)
      .eq('share_type', shareType)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete share error:', error)
    return NextResponse.json({ error: 'Failed to delete share' }, { status: 500 })
  }
}

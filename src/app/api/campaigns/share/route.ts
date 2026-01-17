/**
 * Campaign Share API
 *
 * POST: Create a new share link for a campaign
 * DELETE: Revoke an existing share link
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { nanoid } from 'nanoid'

export const runtime = 'nodejs'

interface CreateShareRequest {
  campaignId: string
  includedSections: Record<string, any>
  expiresInDays: number | null
  note: string | null
}

// POST - Create a new share link
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: CreateShareRequest = await req.json()
    const { campaignId, includedSections, expiresInDays, note } = body

    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID is required' }, { status: 400 })
    }

    // Verify user owns the campaign
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id, user_id')
      .eq('id', campaignId)
      .single()

    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Campaign not found or not authorized' }, { status: 404 })
    }

    // Generate a unique share code
    const shareCode = nanoid(10)

    // Calculate expiration date if specified
    let expiresAt: string | null = null
    if (expiresInDays) {
      const date = new Date()
      date.setDate(date.getDate() + expiresInDays)
      expiresAt = date.toISOString()
    }

    // Create the share
    const { data: share, error } = await supabase
      .from('campaign_shares')
      .insert({
        campaign_id: campaignId,
        share_code: shareCode,
        share_type: 'full', // Can be 'full', 'players_only', 'dm_only' in the future
        included_sections: includedSections,
        expires_at: expiresAt,
        note,
      })
      .select()
      .single()

    if (error) {
      console.error('Create share error:', error)
      return NextResponse.json({ error: 'Failed to create share' }, { status: 500 })
    }

    return NextResponse.json({
      shareCode,
      shareUrl: `/share/campaign/${shareCode}`,
      shareId: share.id,
    })
  } catch (error) {
    console.error('Share creation error:', error)
    return NextResponse.json({ error: 'Failed to create share' }, { status: 500 })
  }
}

// DELETE - Revoke a share link
export async function DELETE(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const shareCode = searchParams.get('code')

    if (!shareCode) {
      return NextResponse.json({ error: 'Share code is required' }, { status: 400 })
    }

    // Get the share to verify ownership
    const { data: share } = await supabase
      .from('campaign_shares')
      .select('id, campaign_id')
      .eq('share_code', shareCode)
      .single()

    if (!share) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 })
    }

    // Verify user owns the campaign
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('user_id')
      .eq('id', share.campaign_id)
      .single()

    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Delete the share
    const { error } = await supabase
      .from('campaign_shares')
      .delete()
      .eq('share_code', shareCode)

    if (error) {
      console.error('Delete share error:', error)
      return NextResponse.json({ error: 'Failed to delete share' }, { status: 500 })
    }

    // Also delete associated view events
    await supabase
      .from('share_view_events')
      .delete()
      .eq('share_id', share.id)
      .eq('share_type', 'campaign')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete share error:', error)
    return NextResponse.json({ error: 'Failed to delete share' }, { status: 500 })
  }
}

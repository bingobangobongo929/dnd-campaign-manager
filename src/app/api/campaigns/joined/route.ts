import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// GET - Get all campaigns the user has joined (but doesn't own)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use admin client to bypass RLS - we've verified the user above
    const adminClient = createAdminClient()

    // Get campaign memberships for this user
    const { data: memberships, error: membershipError } = await adminClient
      .from('campaign_members')
      .select(`
        id,
        role,
        status,
        joined_at,
        invited_at,
        character_id,
        permissions,
        campaign:campaigns(
          id,
          name,
          description,
          image_url,
          game_system,
          user_id,
          updated_at,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('joined_at', { ascending: false, nullsFirst: false })

    if (membershipError) {
      console.error('Failed to fetch memberships:', membershipError)
      return NextResponse.json({ error: 'Failed to fetch memberships' }, { status: 500 })
    }

    // Filter out campaigns the user owns and format the response
    const joinedCampaigns = memberships
      ?.filter(m => {
        const campaign = m.campaign as any
        return campaign && campaign.user_id !== user.id
      })
      .map(m => ({
        membership: {
          id: m.id,
          role: m.role,
          status: m.status,
          joined_at: m.joined_at,
          invited_at: m.invited_at,
          character_id: m.character_id,
          permissions: m.permissions,
        },
        campaign: m.campaign,
      })) || []

    return NextResponse.json({ joinedCampaigns })
  } catch (error) {
    console.error('Get joined campaigns error:', error)
    return NextResponse.json({ error: 'Failed to get joined campaigns' }, { status: 500 })
  }
}

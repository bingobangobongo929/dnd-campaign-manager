import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// GET - Get invite details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Use admin client to bypass RLS - pending invites have user_id=null
    const adminClient = createAdminClient()

    // Find the invite
    const { data: invite, error } = await adminClient
      .from('campaign_members')
      .select(`
        *,
        campaign:campaigns(id, name, image_url, description)
      `)
      .eq('invite_token', token)
      .eq('status', 'pending')
      .single()

    if (error || !invite) {
      return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 404 })
    }

    return NextResponse.json({
      invite: {
        id: invite.id,
        role: invite.role,
        email: invite.email,
        discordId: invite.discord_id,
        campaign: invite.campaign,
      },
    })
  } catch (error) {
    console.error('Get invite error:', error)
    return NextResponse.json({ error: 'Failed to get invite' }, { status: 500 })
  }
}

// POST - Accept the invite
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = await createClient()
    const adminClient = createAdminClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Please sign in to accept this invite' }, { status: 401 })
    }

    // Find the invite using admin client (pending invites have user_id=null)
    const { data: invite, error: findError } = await adminClient
      .from('campaign_members')
      .select('*, campaign:campaigns(id, name)')
      .eq('invite_token', token)
      .eq('status', 'pending')
      .single()

    if (findError || !invite) {
      return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 404 })
    }

    // Verify the invite matches the user (if email was specified)
    if (invite.email && user.email?.toLowerCase() !== invite.email.toLowerCase()) {
      return NextResponse.json({
        error: 'This invite was sent to a different email address'
      }, { status: 403 })
    }

    // TODO: Verify Discord ID if that was used for invite

    // Check if user is already a member
    const { data: existingMember } = await adminClient
      .from('campaign_members')
      .select('id')
      .eq('campaign_id', invite.campaign_id)
      .eq('user_id', user.id)
      .single()

    if (existingMember) {
      // Delete the pending invite and return
      await adminClient
        .from('campaign_members')
        .delete()
        .eq('id', invite.id)

      return NextResponse.json({
        message: 'You are already a member of this campaign',
        campaignId: invite.campaign_id,
      })
    }

    // Accept the invite
    const { data: updatedMember, error: updateError } = await adminClient
      .from('campaign_members')
      .update({
        user_id: user.id,
        status: 'active',
        joined_at: new Date().toISOString(),
        invite_token: null, // Clear the token
      })
      .eq('id', invite.id)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to accept invite:', updateError)
      return NextResponse.json({ error: 'Failed to accept invite' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Successfully joined the campaign!',
      campaignId: invite.campaign_id,
      campaignName: invite.campaign?.name,
      role: updatedMember.role,
    })
  } catch (error) {
    console.error('Accept invite error:', error)
    return NextResponse.json({ error: 'Failed to accept invite' }, { status: 500 })
  }
}

// DELETE - Decline the invite
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const adminClient = createAdminClient()

    // Find the invite using admin client (pending invites have user_id=null)
    const { data: invite, error: findError } = await adminClient
      .from('campaign_members')
      .select('id')
      .eq('invite_token', token)
      .eq('status', 'pending')
      .single()

    if (findError || !invite) {
      return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 404 })
    }

    // Mark as declined
    const { error } = await adminClient
      .from('campaign_members')
      .update({
        status: 'declined',
        invite_token: null,
      })
      .eq('id', invite.id)

    if (error) {
      console.error('Failed to decline invite:', error)
      return NextResponse.json({ error: 'Failed to decline invite' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Invite declined' })
  } catch (error) {
    console.error('Decline invite error:', error)
    return NextResponse.json({ error: 'Failed to decline invite' }, { status: 500 })
  }
}

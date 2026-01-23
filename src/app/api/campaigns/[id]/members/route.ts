import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import type { CampaignMemberInsert, CampaignMemberRole } from '@/types/database'

// GET - Get all members of a campaign
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has access to this campaign
    const { data: membership } = await supabase
      .from('campaign_members')
      .select('role')
      .eq('campaign_id', campaignId)
      .eq('user_id', user.id)
      .single()

    // Also check if user is the campaign owner
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('user_id')
      .eq('id', campaignId)
      .single()

    const isOwner = campaign?.user_id === user.id
    const isMember = !!membership

    if (!isOwner && !isMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get all members with user settings
    const { data: members, error } = await supabase
      .from('campaign_members')
      .select(`
        *,
        user_settings:user_settings!campaign_members_user_id_fkey(username, avatar_url),
        character:characters(id, name, image_url, type),
        vault_character:vault_characters(id, name, image_url)
      `)
      .eq('campaign_id', campaignId)
      .order('role', { ascending: true })
      .order('joined_at', { ascending: true })

    if (error) {
      console.error('Failed to fetch members:', error)
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
    }

    return NextResponse.json({ members, isOwner })
  } catch (error) {
    console.error('Get members error:', error)
    return NextResponse.json({ error: 'Failed to get members' }, { status: 500 })
  }
}

// POST - Invite a new member
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is owner or co_dm
    const { data: membership } = await supabase
      .from('campaign_members')
      .select('role')
      .eq('campaign_id', campaignId)
      .eq('user_id', user.id)
      .single()

    const { data: campaign } = await supabase
      .from('campaigns')
      .select('user_id')
      .eq('id', campaignId)
      .single()

    const isOwner = campaign?.user_id === user.id
    const isCoGm = membership?.role === 'co_dm'

    if (!isOwner && !isCoGm) {
      return NextResponse.json({ error: 'Only owners and co-DMs can invite members' }, { status: 403 })
    }

    const body = await request.json()
    const { email, discordId, role, characterId } = body as {
      email?: string
      discordId?: string
      role: CampaignMemberRole
      characterId?: string
    }

    // Validate role
    if (!['player', 'contributor', 'guest', 'co_dm'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Only owners can add co_dms
    if (role === 'co_dm' && !isOwner) {
      return NextResponse.json({ error: 'Only owners can add co-DMs' }, { status: 403 })
    }

    // Must have email or discordId
    if (!email && !discordId) {
      return NextResponse.json({ error: 'Email or Discord ID required' }, { status: 400 })
    }

    // Check if already a member
    let existingQuery = supabase
      .from('campaign_members')
      .select('id')
      .eq('campaign_id', campaignId)

    if (email) {
      existingQuery = existingQuery.eq('email', email.toLowerCase())
    } else if (discordId) {
      existingQuery = existingQuery.eq('discord_id', discordId)
    }

    const { data: existing } = await existingQuery.single()

    if (existing) {
      return NextResponse.json({ error: 'This person is already invited or a member' }, { status: 400 })
    }

    // Generate invite token
    const inviteToken = nanoid(32)

    // Create the member record
    const memberData: CampaignMemberInsert = {
      campaign_id: campaignId,
      email: email?.toLowerCase() || null,
      discord_id: discordId || null,
      role,
      character_id: characterId || null,
      invite_token: inviteToken,
      invited_at: new Date().toISOString(),
      status: 'pending',
      permissions: {},
    }

    const { data: member, error } = await supabase
      .from('campaign_members')
      .insert(memberData)
      .select()
      .single()

    if (error) {
      console.error('Failed to create invite:', error)
      return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
    }

    // TODO: Send email invite if email provided
    // For now, just return the invite link
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${inviteToken}`

    return NextResponse.json({
      message: 'Invite created',
      member,
      inviteUrl,
    })
  } catch (error) {
    console.error('Create invite error:', error)
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
  }
}

// PATCH - Update a member's role or permissions
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { memberId, role, permissions, status } = body as {
      memberId: string
      role?: CampaignMemberRole
      permissions?: Record<string, boolean>
      status?: 'active' | 'removed'
    }

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID required' }, { status: 400 })
    }

    // Check if user is owner
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('user_id')
      .eq('id', campaignId)
      .single()

    const isOwner = campaign?.user_id === user.id

    // Check user's role
    const { data: userMembership } = await supabase
      .from('campaign_members')
      .select('role')
      .eq('campaign_id', campaignId)
      .eq('user_id', user.id)
      .single()

    const isCoGm = userMembership?.role === 'co_dm'

    if (!isOwner && !isCoGm) {
      return NextResponse.json({ error: 'Only owners and co-DMs can update members' }, { status: 403 })
    }

    // Get target member
    const { data: targetMember } = await supabase
      .from('campaign_members')
      .select('role, user_id')
      .eq('id', memberId)
      .eq('campaign_id', campaignId)
      .single()

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Prevent owner from being demoted
    if (targetMember.role === 'owner') {
      return NextResponse.json({ error: 'Cannot modify owner' }, { status: 403 })
    }

    // Only owner can promote to co_dm or modify co_dms
    if ((role === 'co_dm' || targetMember.role === 'co_dm') && !isOwner) {
      return NextResponse.json({ error: 'Only owner can manage co-DMs' }, { status: 403 })
    }

    // Build update object
    const updateData: Record<string, unknown> = {}
    if (role) updateData.role = role
    if (permissions) updateData.permissions = permissions
    if (status) updateData.status = status

    const { data: updated, error } = await supabase
      .from('campaign_members')
      .update(updateData)
      .eq('id', memberId)
      .select()
      .single()

    if (error) {
      console.error('Failed to update member:', error)
      return NextResponse.json({ error: 'Failed to update member' }, { status: 500 })
    }

    return NextResponse.json({ member: updated })
  } catch (error) {
    console.error('Update member error:', error)
    return NextResponse.json({ error: 'Failed to update member' }, { status: 500 })
  }
}

// DELETE - Remove a member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('memberId')

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID required' }, { status: 400 })
    }

    // Check if user is owner or co_dm
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('user_id')
      .eq('id', campaignId)
      .single()

    const isOwner = campaign?.user_id === user.id

    const { data: userMembership } = await supabase
      .from('campaign_members')
      .select('role')
      .eq('campaign_id', campaignId)
      .eq('user_id', user.id)
      .single()

    const isCoGm = userMembership?.role === 'co_dm'

    // Get target member
    const { data: targetMember } = await supabase
      .from('campaign_members')
      .select('role, user_id')
      .eq('id', memberId)
      .eq('campaign_id', campaignId)
      .single()

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Users can remove themselves
    const isSelf = targetMember.user_id === user.id

    // Prevent owner from being removed
    if (targetMember.role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove owner' }, { status: 403 })
    }

    // Only owner can remove co_dms (unless self)
    if (targetMember.role === 'co_dm' && !isOwner && !isSelf) {
      return NextResponse.json({ error: 'Only owner can remove co-DMs' }, { status: 403 })
    }

    // Must be owner, co_dm, or self to remove
    if (!isOwner && !isCoGm && !isSelf) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const { error } = await supabase
      .from('campaign_members')
      .delete()
      .eq('id', memberId)

    if (error) {
      console.error('Failed to remove member:', error)
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Member removed' })
  } catch (error) {
    console.error('Remove member error:', error)
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
  }
}

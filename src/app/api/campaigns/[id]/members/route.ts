import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import type { CampaignMemberInsert, CampaignMemberRole, MemberPermissions } from '@/types/database'
import { DEFAULT_PERMISSIONS } from '@/types/database'
import { sendEmail, campaignInviteEmail } from '@/lib/email'

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

    // Get all members with related data
    // Use admin client to bypass RLS (we've already verified authorization above)
    const adminClient = createAdminClient()

    // First, get all campaign members
    const { data: members, error } = await adminClient
      .from('campaign_members')
      .select(`
        *,
        character:characters(id, name, image_url, type),
        vault_character:vault_characters(id, name, image_url)
      `)
      .eq('campaign_id', campaignId)
      .order('invited_at', { ascending: false, nullsFirst: false })

    if (error) {
      console.error('Failed to fetch members:', error)
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
    }

    // Enrich members with user_settings for those who have user_id
    const userIds = members
      ?.filter(m => m.user_id)
      .map(m => m.user_id) || []

    let userSettingsMap: Record<string, { username: string | null; avatar_url: string | null }> = {}

    if (userIds.length > 0) {
      const { data: settings } = await adminClient
        .from('user_settings')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds)

      if (settings) {
        userSettingsMap = settings.reduce((acc, s) => {
          acc[s.user_id] = { username: s.username, avatar_url: s.avatar_url }
          return acc
        }, {} as Record<string, { username: string | null; avatar_url: string | null }>)
      }
    }

    // Build app URL for invite links
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ||
      request.headers.get('origin') ||
      `https://${request.headers.get('host')}` ||
      'https://multiloop.app'

    // Merge user_settings and invite URLs into members
    const enrichedMembers = members?.map(m => ({
      ...m,
      user_settings: m.user_id ? userSettingsMap[m.user_id] || null : null,
      // Include invite URL for pending members (only visible to owner/co-dm who can access this endpoint)
      invite_url: m.status === 'pending' && m.invite_token
        ? `${appUrl}/invite/${m.invite_token}`
        : null
    })) || []

    return NextResponse.json({ members: enrichedMembers, isOwner })
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
      .select('user_id, name')
      .eq('id', campaignId)
      .single()

    const isOwner = campaign?.user_id === user.id
    const isCoGm = membership?.role === 'co_dm'

    if (!isOwner && !isCoGm) {
      return NextResponse.json({ error: 'Only owners and co-DMs can invite members' }, { status: 403 })
    }

    // Get inviter's name
    const { data: inviterSettings } = await supabase
      .from('user_settings')
      .select('username')
      .eq('user_id', user.id)
      .single()

    const inviterName = inviterSettings?.username || 'A DM'
    const campaignName = campaign?.name || 'a campaign'

    const body = await request.json()
    const { email, discordUsername, role, characterId, permissions } = body as {
      email?: string
      discordUsername?: string
      role: CampaignMemberRole
      characterId?: string
      permissions?: MemberPermissions
    }

    // Validate role
    if (!['player', 'contributor', 'guest', 'co_dm'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Only owners can add co_dms
    if (role === 'co_dm' && !isOwner) {
      return NextResponse.json({ error: 'Only owners can add co-DMs' }, { status: 403 })
    }

    // Must have email or discordUsername
    if (!email && !discordUsername) {
      return NextResponse.json({ error: 'Email or Discord username required' }, { status: 400 })
    }

    // Check if already a member
    let existingQuery = supabase
      .from('campaign_members')
      .select('id')
      .eq('campaign_id', campaignId)

    if (email) {
      existingQuery = existingQuery.eq('email', email.toLowerCase())
    } else if (discordUsername) {
      existingQuery = existingQuery.ilike('discord_username', discordUsername)
    }

    const { data: existing } = await existingQuery.single()

    if (existing) {
      return NextResponse.json({ error: 'This person is already invited or a member' }, { status: 400 })
    }

    // Generate invite token
    const inviteToken = nanoid(32)

    // Use provided permissions or default for role
    const memberPermissions = permissions || DEFAULT_PERMISSIONS[role]

    // Create the member record
    // Note: user_id will be set when the invited user accepts the invite
    const memberData: CampaignMemberInsert = {
      campaign_id: campaignId,
      email: email?.toLowerCase() || null,
      discord_username: discordUsername || null,
      role,
      character_id: characterId || null,
      invite_token: inviteToken,
      invited_at: new Date().toISOString(),
      status: 'pending',
      permissions: JSON.parse(JSON.stringify(memberPermissions)),
    }

    // Use admin client to bypass RLS (we've already verified authorization above)
    const adminClient = createAdminClient()
    const { data: member, error } = await adminClient
      .from('campaign_members')
      .insert(memberData)
      .select()
      .single()

    if (error) {
      console.error('Failed to create invite:', error)
      return NextResponse.json({
        error: 'Failed to create invite',
        details: error.message,
        code: error.code
      }, { status: 500 })
    }

    // If a character was assigned, update the character to designate it for this email or Discord
    // This enables the character claiming flow when the invited user joins
    if (characterId) {
      const charUpdateData: Record<string, unknown> = {}
      if (email) {
        charUpdateData.controlled_by_email = email.toLowerCase()
      }
      if (discordUsername) {
        charUpdateData.controlled_by_discord = discordUsername
      }

      if (Object.keys(charUpdateData).length > 0) {
        const { error: charUpdateError } = await adminClient
          .from('characters')
          .update(charUpdateData)
          .eq('id', characterId)
          .eq('campaign_id', campaignId)

        if (charUpdateError) {
          console.error('Failed to designate character for invite:', charUpdateError)
          // Don't fail the invite - this is not critical
        }
      }
    }

    // Build invite URL - prefer env var, fallback to request origin
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ||
      request.headers.get('origin') ||
      `https://${request.headers.get('host')}` ||
      'https://multiloop.app'
    const inviteUrl = `${appUrl}/invite/${inviteToken}`

    // Send email invite if email provided
    if (email) {
      // Get character name if assigned
      let characterName: string | undefined
      if (characterId) {
        const { data: character } = await supabase
          .from('characters')
          .select('name')
          .eq('id', characterId)
          .single()
        characterName = character?.name
      }

      const emailContent = campaignInviteEmail({
        campaignName,
        inviterName,
        role,
        inviteUrl,
        characterName,
      })

      const emailResult = await sendEmail({
        to: email.toLowerCase(),
        subject: emailContent.subject,
        html: emailContent.html,
      })

      if (!emailResult.success) {
        console.error('Failed to send invite email:', emailResult.error)
        // Don't fail the request - invite was created, email just didn't send
      }
    }

    return NextResponse.json({
      message: email ? 'Invite sent' : 'Invite created',
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
    const { memberId, role, permissions, status, characterId } = body as {
      memberId: string
      role?: CampaignMemberRole
      permissions?: MemberPermissions
      status?: 'active' | 'removed'
      characterId?: string | null
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
    if (characterId !== undefined) updateData.character_id = characterId

    // Debug logging for character assignment
    console.log('[Members PATCH Debug] memberId:', memberId)
    console.log('[Members PATCH Debug] characterId from body:', characterId)
    console.log('[Members PATCH Debug] updateData:', updateData)

    // Use admin client to bypass RLS - we've already verified permission above
    const adminClient = createAdminClient()
    const { data: updated, error } = await adminClient
      .from('campaign_members')
      .update(updateData)
      .eq('id', memberId)
      .select('*')
      .single()

    console.log('[Members PATCH Debug] updated result:', updated)
    console.log('[Members PATCH Debug] error:', error)

    if (error) {
      console.error('Failed to update member:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      return NextResponse.json({ error: `Failed to update member: ${error.message}` }, { status: 500 })
    }

    // If a character was assigned, update the character to designate it for this member
    // Use the member's email or user_id to enable the claiming flow
    if (characterId && updated) {
      const memberEmail = updated.email
      const memberUserId = updated.user_id

      const charUpdateData: Record<string, unknown> = {}
      if (memberEmail) {
        charUpdateData.controlled_by_email = memberEmail.toLowerCase()
      }
      if (memberUserId) {
        charUpdateData.controlled_by_user_id = memberUserId
      }

      if (Object.keys(charUpdateData).length > 0) {
        const { error: charUpdateError } = await adminClient
          .from('characters')
          .update(charUpdateData)
          .eq('id', characterId)
          .eq('campaign_id', campaignId)

        if (charUpdateError) {
          console.error('Failed to designate character for member:', charUpdateError)
          // Don't fail the update - this is not critical
        }
      }
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

    // Use admin client to bypass RLS - we've already verified permission above
    const adminClient = createAdminClient()
    const { error } = await adminClient
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

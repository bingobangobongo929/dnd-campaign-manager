import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST - Claim a campaign character to user's vault
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; characterId: string }> }
) {
  try {
    const { id: campaignId, characterId } = await params
    const supabase = await createClient()

    // Parse request body for options
    const body = await request.json().catch(() => ({}))
    const { addInPlay = true, addSession0Copy = false } = body as {
      addInPlay?: boolean
      addSession0Copy?: boolean
    }

    // At least one option must be selected
    if (!addInPlay && !addSession0Copy) {
      return NextResponse.json({ error: 'Must select at least one option (In-Play or Session 0 Copy)' }, { status: 400 })
    }

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the campaign character
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('*')
      .eq('id', characterId)
      .eq('campaign_id', campaignId)
      .single()

    if (charError || !character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 })
    }

    // Verify user can claim this character
    // 1. Check if user is a campaign member
    const { data: membership } = await supabase
      .from('campaign_members')
      .select('id, role, character_id, discord_id')
      .eq('campaign_id', campaignId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'You are not a member of this campaign' }, { status: 403 })
    }

    // 2. Check if the character is designated for this user
    // Check email match
    const emailMatch = character.controlled_by_email &&
      character.controlled_by_email.toLowerCase() === user.email?.toLowerCase()

    // Check Discord match (user's membership has discord_id from Discord invite)
    const discordMatch = character.controlled_by_discord &&
      membership.discord_id &&
      character.controlled_by_discord.toLowerCase() === membership.discord_id.toLowerCase()

    const isDesignatedForUser =
      character.controlled_by_user_id === user.id ||
      emailMatch ||
      discordMatch

    // 3. Check if character is already claimed
    if (character.vault_character_id) {
      return NextResponse.json({ error: 'This character has already been claimed' }, { status: 400 })
    }

    // 4. User must be designated for the character OR be the campaign owner/co_dm assigning their own character
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('user_id')
      .eq('id', campaignId)
      .single()

    const isOwner = campaign?.user_id === user.id
    const isCoGm = membership.role === 'co_dm'
    const isDm = isOwner || isCoGm

    if (!isDesignatedForUser && !isDm && !character.controlled_by_user_id && !character.controlled_by_email) {
      // Character has no designation - allow claiming if it's a PC and not already taken
      if (character.type !== 'pc') {
        return NextResponse.json({ error: 'Only player characters can be claimed' }, { status: 400 })
      }
    } else if (!isDesignatedForUser && !isDm) {
      return NextResponse.json({ error: 'This character is designated for someone else' }, { status: 403 })
    }

    // Base vault character data (shared between both options)
    // Map campaign character fields to vault character fields
    const baseVaultData = {
      user_id: user.id,
      name: character.name,
      type: character.type,
      // Core text fields
      description: character.description || null,
      summary: character.summary || null,
      notes: character.notes || null,
      backstory: character.backstory || null,
      // Images
      image_url: character.image_url || null,
      detail_image_url: character.detail_image_url || null,
      // Status
      status: character.status || 'alive',
      status_color: character.status_color || null,
      // Basic identity (D&D fields)
      race: character.race || null,
      class: character.class || null,
      subclass: character.subclass || null,
      level: character.level || null,
      background: character.background || null,
      alignment: character.alignment || null,
      // Demographics - note: campaign has age as number, vault has it as string
      age: character.age ? String(character.age) : null,
      pronouns: character.pronouns || null,
      // Appearance & Personality
      appearance: character.appearance || null,
      personality: character.personality || null,
      // D&D 5e personality system
      ideals: character.ideals || null,
      bonds: character.bonds || null,
      flaws: character.flaws || null,
      // Goals and secrets
      goals: character.goals || null,
      secrets: character.secrets || null,
      motivations: character.motivations || null,
      // External links
      character_sheet_url: character.character_sheet_url || null,
      // Template/publishing
      is_published: false,
    }

    let inPlayVaultId: string | null = null
    let session0VaultId: string | null = null

    // Create In-Play version (linked to campaign)
    if (addInPlay) {
      const inPlayData = {
        ...baseVaultData,
        campaign_links: [{
          campaign_id: campaignId,
          character_id: characterId,
          joined_at: new Date().toISOString(),
        }],
      }

      const { data: inPlayChar, error: inPlayError } = await supabase
        .from('vault_characters')
        .insert(inPlayData)
        .select()
        .single()

      if (inPlayError) {
        console.error('Failed to create in-play vault character:', inPlayError)
        return NextResponse.json({ error: 'Failed to create vault character' }, { status: 500 })
      }

      inPlayVaultId = inPlayChar.id

      // Link campaign character to vault
      const { error: linkError } = await supabase
        .from('characters')
        .update({
          vault_character_id: inPlayChar.id,
          controlled_by_user_id: user.id,
        })
        .eq('id', characterId)

      if (linkError) {
        console.error('Failed to link characters:', linkError)
      }

      // Update campaign member
      const { error: memberError } = await supabase
        .from('campaign_members')
        .update({ character_id: characterId, vault_character_id: inPlayChar.id })
        .eq('id', membership.id)

      if (memberError) {
        console.error('Failed to update membership:', memberError)
      }
    }

    // Create Session 0 copy (standalone, not linked to campaign)
    if (addSession0Copy) {
      const session0Data = {
        ...baseVaultData,
        name: `${character.name} (Session 0)`,
        campaign_links: [], // Not linked to any campaign
      }

      const { data: session0Char, error: session0Error } = await supabase
        .from('vault_characters')
        .insert(session0Data)
        .select()
        .single()

      if (session0Error) {
        console.error('Failed to create session 0 vault character:', session0Error)
        // Don't fail if in-play was already created successfully
        if (!inPlayVaultId) {
          return NextResponse.json({ error: 'Failed to create Session 0 copy' }, { status: 500 })
        }
      } else {
        session0VaultId = session0Char.id
      }
    }

    // Create snapshot record for history (linked to in-play character if exists)
    if (inPlayVaultId) {
      const snapshotData = {
        vault_character_id: inPlayVaultId,
        campaign_id: campaignId,
        campaign_character_id: characterId,
        snapshot_data: character,
        snapshot_type: 'session_0',
        snapshot_name: 'Session 0 - Character Joined',
        created_by: user.id,
      }

      const { error: snapshotError } = await supabase
        .from('character_snapshots')
        .insert(snapshotData)

      if (snapshotError) {
        console.error('Failed to create snapshot:', snapshotError)
      }
    }

    // Determine primary vault character ID to return
    const primaryVaultId = inPlayVaultId || session0VaultId

    return NextResponse.json({
      message: 'Character claimed successfully!',
      vaultCharacterId: primaryVaultId,
      inPlayVaultId,
      session0VaultId,
      characterId,
    })
  } catch (error) {
    console.error('Claim character error:', error)
    return NextResponse.json({ error: 'Failed to claim character' }, { status: 500 })
  }
}

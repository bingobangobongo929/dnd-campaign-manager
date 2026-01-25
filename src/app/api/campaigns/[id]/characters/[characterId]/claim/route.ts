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
      .select('id, role, character_id')
      .eq('campaign_id', campaignId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'You are not a member of this campaign' }, { status: 403 })
    }

    // 2. Check if the character is designated for this user
    const isDesignatedForUser =
      character.controlled_by_user_id === user.id ||
      (character.controlled_by_email && character.controlled_by_email.toLowerCase() === user.email?.toLowerCase())

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

    // Create the vault character
    const vaultCharacterData = {
      user_id: user.id,
      name: character.name,
      pronouns: character.pronouns,
      age: character.age,
      occupation: character.occupation,
      species: character.species,
      short_description: character.short_description,
      description: character.description,
      image_url: character.image_url,
      thumbnail_url: character.thumbnail_url,
      status: character.status || 'alive',
      personality_traits: character.personality_traits || [],
      ideals: character.ideals || [],
      bonds: character.bonds || [],
      flaws: character.flaws || [],
      mannerisms: character.mannerisms || [],
      fears: character.fears || [],
      secrets: character.secrets || [],
      goals_motivations: character.goals_motivations || [],
      backstory_summary: character.backstory,
      campaign_links: [{
        campaign_id: campaignId,
        character_id: characterId,
        joined_at: new Date().toISOString(),
      }],
      is_published: false,
    }

    const { data: vaultCharacter, error: vaultError } = await supabase
      .from('vault_characters')
      .insert(vaultCharacterData)
      .select()
      .single()

    if (vaultError) {
      console.error('Failed to create vault character:', vaultError)
      return NextResponse.json({ error: 'Failed to create vault character' }, { status: 500 })
    }

    // Create Session 0 snapshot
    const snapshotData = {
      vault_character_id: vaultCharacter.id,
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
      // Don't fail the whole operation, just log
    }

    // Update the campaign character to link to vault
    const { error: linkError } = await supabase
      .from('characters')
      .update({
        vault_character_id: vaultCharacter.id,
        controlled_by_user_id: user.id,
      })
      .eq('id', characterId)

    if (linkError) {
      console.error('Failed to link characters:', linkError)
      // Don't fail, the vault character is created
    }

    // Update campaign member to link to character
    const { error: memberError } = await supabase
      .from('campaign_members')
      .update({ character_id: characterId, vault_character_id: vaultCharacter.id })
      .eq('id', membership.id)

    if (memberError) {
      console.error('Failed to update membership:', memberError)
    }

    return NextResponse.json({
      message: 'Character claimed successfully!',
      vaultCharacterId: vaultCharacter.id,
      characterId,
    })
  } catch (error) {
    console.error('Claim character error:', error)
    return NextResponse.json({ error: 'Failed to claim character' }, { status: 500 })
  }
}

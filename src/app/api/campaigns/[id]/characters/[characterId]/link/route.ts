import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { CharacterSnapshotInsert } from '@/types/database'

// POST - Link an existing vault character to a campaign character
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

    const body = await request.json()
    const { vaultCharacterId } = body as { vaultCharacterId: string }

    if (!vaultCharacterId) {
      return NextResponse.json({ error: 'vaultCharacterId is required' }, { status: 400 })
    }

    // Verify user owns the vault character
    const { data: vaultCharacter, error: vaultError } = await supabase
      .from('vault_characters')
      .select('*')
      .eq('id', vaultCharacterId)
      .eq('user_id', user.id)
      .single()

    if (vaultError || !vaultCharacter) {
      return NextResponse.json({ error: 'Vault character not found or access denied' }, { status: 404 })
    }

    // Get the campaign character
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('*')
      .eq('id', characterId)
      .eq('campaign_id', campaignId)
      .single()

    if (charError || !character) {
      return NextResponse.json({ error: 'Campaign character not found' }, { status: 404 })
    }

    // Check if campaign character is already linked
    if (character.vault_character_id) {
      return NextResponse.json({ error: 'This campaign character is already linked' }, { status: 400 })
    }

    // Check if user is a member of the campaign
    const { data: membership } = await supabase
      .from('campaign_members')
      .select('id, role')
      .eq('campaign_id', campaignId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'You are not a member of this campaign' }, { status: 403 })
    }

    // Check designation
    const isDesignatedForUser =
      character.controlled_by_user_id === user.id ||
      (character.controlled_by_email && character.controlled_by_email.toLowerCase() === user.email?.toLowerCase())

    const { data: campaign } = await supabase
      .from('campaigns')
      .select('user_id')
      .eq('id', campaignId)
      .single()

    const isOwner = campaign?.user_id === user.id
    const isCoGm = membership.role === 'co_dm'
    const isDm = isOwner || isCoGm

    // Must be designated or DM or character has no designation
    if (!isDesignatedForUser && !isDm && (character.controlled_by_user_id || character.controlled_by_email)) {
      return NextResponse.json({ error: 'This character is designated for someone else' }, { status: 403 })
    }

    // Create Session 0 snapshot from vault character
    const snapshotData: CharacterSnapshotInsert = {
      vault_character_id: vaultCharacterId,
      campaign_id: campaignId,
      campaign_character_id: characterId,
      snapshot_data: vaultCharacter,
      snapshot_type: 'session_0',
      snapshot_name: 'Session 0 - Character Linked',
      created_by: user.id,
    }

    const { error: snapshotError } = await supabase
      .from('character_snapshots')
      .insert(snapshotData)

    if (snapshotError) {
      console.error('Failed to create snapshot:', snapshotError)
    }

    // Update campaign character to link to vault
    const { error: updateCharError } = await supabase
      .from('characters')
      .update({
        vault_character_id: vaultCharacterId,
        controlled_by_user_id: user.id,
        // Sync basic fields from vault
        name: vaultCharacter.name,
        pronouns: vaultCharacter.pronouns,
        age: vaultCharacter.age,
        short_description: vaultCharacter.short_description,
        description: vaultCharacter.description,
        image_url: vaultCharacter.image_url,
        thumbnail_url: vaultCharacter.thumbnail_url,
      })
      .eq('id', characterId)

    if (updateCharError) {
      console.error('Failed to update campaign character:', updateCharError)
      return NextResponse.json({ error: 'Failed to link characters' }, { status: 500 })
    }

    // Update vault character's campaign_links
    const existingLinks = (vaultCharacter.campaign_links as Array<{
      campaign_id: string
      character_id: string
      joined_at: string
    }>) || []

    const newLink = {
      campaign_id: campaignId,
      character_id: characterId,
      joined_at: new Date().toISOString(),
    }

    // Check if already linked
    const alreadyLinked = existingLinks.some(link => link.campaign_id === campaignId)
    if (!alreadyLinked) {
      const { error: updateVaultError } = await supabase
        .from('vault_characters')
        .update({
          campaign_links: [...existingLinks, newLink]
        })
        .eq('id', vaultCharacterId)

      if (updateVaultError) {
        console.error('Failed to update vault character links:', updateVaultError)
      }
    }

    // Update campaign member to link to character
    const { error: memberError } = await supabase
      .from('campaign_members')
      .update({ character_id: characterId, vault_character_id: vaultCharacterId })
      .eq('id', membership.id)

    if (memberError) {
      console.error('Failed to update membership:', memberError)
    }

    return NextResponse.json({
      message: 'Characters linked successfully!',
      vaultCharacterId,
      characterId,
    })
  } catch (error) {
    console.error('Link character error:', error)
    return NextResponse.json({ error: 'Failed to link characters' }, { status: 500 })
  }
}

// DELETE - Unlink a vault character from a campaign character
export async function DELETE(
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
      .select('vault_character_id, controlled_by_user_id')
      .eq('id', characterId)
      .eq('campaign_id', campaignId)
      .single()

    if (charError || !character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 })
    }

    if (!character.vault_character_id) {
      return NextResponse.json({ error: 'Character is not linked to a vault character' }, { status: 400 })
    }

    // Check permissions - must be the owner of the vault character or campaign owner/co_dm
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('user_id')
      .eq('id', campaignId)
      .single()

    const isOwner = campaign?.user_id === user.id

    const { data: membership } = await supabase
      .from('campaign_members')
      .select('role')
      .eq('campaign_id', campaignId)
      .eq('user_id', user.id)
      .single()

    const isCoGm = membership?.role === 'co_dm'
    const isCharacterOwner = character.controlled_by_user_id === user.id

    if (!isOwner && !isCoGm && !isCharacterOwner) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // Remove link from campaign character
    const { error: updateError } = await supabase
      .from('characters')
      .update({ vault_character_id: null })
      .eq('id', characterId)

    if (updateError) {
      console.error('Failed to unlink character:', updateError)
      return NextResponse.json({ error: 'Failed to unlink character' }, { status: 500 })
    }

    // Remove link from vault character
    const { data: vaultCharacter } = await supabase
      .from('vault_characters')
      .select('campaign_links')
      .eq('id', character.vault_character_id)
      .single()

    if (vaultCharacter) {
      const existingLinks = (vaultCharacter.campaign_links as Array<{
        campaign_id: string
        character_id: string
      }>) || []

      const newLinks = existingLinks.filter(link => link.campaign_id !== campaignId)

      await supabase
        .from('vault_characters')
        .update({ campaign_links: newLinks })
        .eq('id', character.vault_character_id)
    }

    // Update campaign member
    const { data: memberToUpdate } = await supabase
      .from('campaign_members')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('vault_character_id', character.vault_character_id)
      .single()

    if (memberToUpdate) {
      await supabase
        .from('campaign_members')
        .update({ vault_character_id: null })
        .eq('id', memberToUpdate.id)
    }

    return NextResponse.json({ message: 'Character unlinked successfully' })
  } catch (error) {
    console.error('Unlink character error:', error)
    return NextResponse.json({ error: 'Failed to unlink character' }, { status: 500 })
  }
}

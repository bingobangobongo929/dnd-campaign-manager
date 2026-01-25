import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST - Link a vault character to user's campaign membership
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

    const body = await request.json()
    const { vaultCharacterId } = body as { vaultCharacterId: string }

    if (!vaultCharacterId) {
      return NextResponse.json({ error: 'vaultCharacterId is required' }, { status: 400 })
    }

    // Verify user is a member of the campaign
    const { data: membership, error: memberError } = await supabase
      .from('campaign_members')
      .select('id, character_id, vault_character_id')
      .eq('campaign_id', campaignId)
      .eq('user_id', user.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json({ error: 'You are not a member of this campaign' }, { status: 403 })
    }

    // Check if already linked to a character
    if (membership.vault_character_id) {
      return NextResponse.json({ error: 'You already have a character in this campaign' }, { status: 400 })
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

    // Create a campaign character from the vault character
    const campaignCharacterData = {
      campaign_id: campaignId,
      vault_character_id: vaultCharacterId,
      controlled_by_user_id: user.id,
      name: vaultCharacter.name,
      type: 'pc' as const,
      pronouns: vaultCharacter.pronouns,
      age: vaultCharacter.age,
      occupation: vaultCharacter.occupation,
      species: vaultCharacter.species,
      short_description: vaultCharacter.short_description,
      summary: vaultCharacter.short_description,
      description: vaultCharacter.description,
      image_url: vaultCharacter.image_url,
      thumbnail_url: vaultCharacter.thumbnail_url,
      status: vaultCharacter.status || 'alive',
      personality_traits: vaultCharacter.personality_traits || [],
      ideals: vaultCharacter.ideals || [],
      bonds: vaultCharacter.bonds || [],
      flaws: vaultCharacter.flaws || [],
      mannerisms: vaultCharacter.mannerisms || [],
      fears: vaultCharacter.fears || [],
      secrets: vaultCharacter.secrets || [],
      goals_motivations: vaultCharacter.goals_motivations || [],
      backstory: vaultCharacter.backstory_summary,
    }

    const { data: campaignCharacter, error: createError } = await supabase
      .from('characters')
      .insert(campaignCharacterData)
      .select()
      .single()

    if (createError) {
      console.error('Failed to create campaign character:', createError)
      return NextResponse.json({ error: 'Failed to create campaign character' }, { status: 500 })
    }

    // Create Session 0 snapshot
    const snapshotData = {
      vault_character_id: vaultCharacterId,
      campaign_id: campaignId,
      campaign_character_id: campaignCharacter.id,
      snapshot_data: vaultCharacter,
      snapshot_type: 'session_0',
      snapshot_name: 'Session 0 - Character Joined',
      created_by: user.id,
    }

    const { error: snapshotError } = await supabase
      .from('character_snapshots')
      .insert(snapshotData)

    if (snapshotError) {
      console.error('Failed to create snapshot:', snapshotError)
      // Don't fail the operation
    }

    // Update vault character's campaign_links
    const existingLinks = (vaultCharacter.campaign_links as Array<{
      campaign_id: string
      character_id: string
      joined_at: string
    }>) || []

    const newLink = {
      campaign_id: campaignId,
      character_id: campaignCharacter.id,
      joined_at: new Date().toISOString(),
    }

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
    const { error: updateMemberError } = await supabase
      .from('campaign_members')
      .update({
        character_id: campaignCharacter.id,
        vault_character_id: vaultCharacterId,
      })
      .eq('id', membership.id)

    if (updateMemberError) {
      console.error('Failed to update membership:', updateMemberError)
    }

    return NextResponse.json({
      message: 'Character linked successfully!',
      characterId: campaignCharacter.id,
      vaultCharacterId,
    })
  } catch (error) {
    console.error('Link character error:', error)
    return NextResponse.json({ error: 'Failed to link character' }, { status: 500 })
  }
}

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import type { Character, VaultCharacter } from '@/types/database'

// Fields that sync between vault and campaign characters
const SYNC_FIELDS = [
  'name',
  'pronouns',
  'age',
  'occupation',
  'species',
  'short_description',
  'description',
  'image_url',
  'thumbnail_url',
  'personality_traits',
  'ideals',
  'bonds',
  'flaws',
  'mannerisms',
  'fears',
  'goals_motivations',
] as const

// POST - Sync character data between vault and campaign
// Direction: 'vault_to_campaign' | 'campaign_to_vault'
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; characterId: string }> }
) {
  try {
    const { id: campaignId, characterId } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { direction = 'vault_to_campaign' } = body as { direction?: 'vault_to_campaign' | 'campaign_to_vault' }

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

    if (!character.vault_character_id) {
      return NextResponse.json({ error: 'Character is not linked to a vault character' }, { status: 400 })
    }

    // Get the vault character
    const { data: vaultCharacter, error: vaultError } = await supabase
      .from('vault_characters')
      .select('*')
      .eq('id', character.vault_character_id)
      .single()

    if (vaultError || !vaultCharacter) {
      return NextResponse.json({ error: 'Vault character not found' }, { status: 404 })
    }

    // Check permissions
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('user_id')
      .eq('id', campaignId)
      .single()

    const { data: membership } = await supabase
      .from('campaign_members')
      .select('role')
      .eq('campaign_id', campaignId)
      .eq('user_id', user.id)
      .single()

    const isOwner = campaign?.user_id === user.id
    const isCoGm = membership?.role === 'co_dm'
    const isDm = isOwner || isCoGm
    const isVaultOwner = vaultCharacter.user_id === user.id
    const isCharacterController = character.controlled_by_user_id === user.id

    // Permission rules:
    // - vault_to_campaign: vault owner can sync (or DM)
    // - campaign_to_vault: vault owner only (not DM, since vault is player's)
    if (direction === 'vault_to_campaign') {
      if (!isVaultOwner && !isDm) {
        return NextResponse.json({ error: 'Only the vault owner or DM can sync vault to campaign' }, { status: 403 })
      }
    } else {
      // campaign_to_vault - only vault owner
      if (!isVaultOwner) {
        return NextResponse.json({ error: 'Only the vault owner can sync campaign to vault' }, { status: 403 })
      }
    }

    // Build the update data for syncable fields
    const updateData: Record<string, unknown> = {}
    const source = direction === 'vault_to_campaign' ? vaultCharacter : character

    for (const field of SYNC_FIELDS) {
      const value = source[field as keyof typeof source]
      if (value !== undefined) {
        // Map vault field names to campaign field names if they differ
        if (field === 'goals_motivations' && direction === 'campaign_to_vault') {
          updateData['goals_motivations'] = value
        } else {
          updateData[field] = value
        }
      }
    }

    // Special handling for backstory - vault uses backstory_summary, campaign uses backstory
    if (direction === 'vault_to_campaign') {
      if (vaultCharacter.backstory_summary) {
        updateData['backstory'] = vaultCharacter.backstory_summary
      }
    } else {
      if (character.backstory) {
        updateData['backstory_summary'] = character.backstory
      }
    }

    // Perform the update
    if (direction === 'vault_to_campaign') {
      // Use admin client to bypass RLS - we've already verified permissions above
      const adminClient = createAdminClient()
      const { error: updateError } = await adminClient
        .from('characters')
        .update(updateData)
        .eq('id', characterId)

      if (updateError) {
        console.error('Failed to sync vault to campaign:', updateError)
        return NextResponse.json({ error: 'Failed to sync' }, { status: 500 })
      }
    } else {
      const { error: updateError } = await supabase
        .from('vault_characters')
        .update(updateData)
        .eq('id', character.vault_character_id)

      if (updateError) {
        console.error('Failed to sync campaign to vault:', updateError)
        return NextResponse.json({ error: 'Failed to sync' }, { status: 500 })
      }
    }

    return NextResponse.json({
      message: `Character synced successfully (${direction})`,
      direction,
      fieldsUpdated: Object.keys(updateData),
    })
  } catch (error) {
    console.error('Sync character error:', error)
    return NextResponse.json({ error: 'Failed to sync character' }, { status: 500 })
  }
}

// GET - Get sync status (show which fields differ between vault and campaign)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; characterId: string }> }
) {
  try {
    const { id: campaignId, characterId } = await params
    const supabase = await createClient()

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
      return NextResponse.json({ error: 'Campaign character not found' }, { status: 404 })
    }

    if (!character.vault_character_id) {
      return NextResponse.json({
        isLinked: false,
        message: 'Character is not linked to a vault character',
      })
    }

    // Get the vault character
    const { data: vaultCharacter, error: vaultError } = await supabase
      .from('vault_characters')
      .select('*')
      .eq('id', character.vault_character_id)
      .single()

    if (vaultError || !vaultCharacter) {
      return NextResponse.json({ error: 'Vault character not found' }, { status: 404 })
    }

    // Check which fields differ
    const differences: Array<{
      field: string
      vaultValue: unknown
      campaignValue: unknown
    }> = []

    for (const field of SYNC_FIELDS) {
      const vaultValue = vaultCharacter[field as keyof VaultCharacter]
      const campaignValue = character[field as keyof Character]

      // Compare values (handle arrays with JSON stringify)
      const vaultStr = JSON.stringify(vaultValue ?? null)
      const campaignStr = JSON.stringify(campaignValue ?? null)

      if (vaultStr !== campaignStr) {
        differences.push({
          field,
          vaultValue: vaultValue ?? null,
          campaignValue: campaignValue ?? null,
        })
      }
    }

    // Check backstory specifically
    const vaultBackstory = vaultCharacter.backstory_summary
    const campaignBackstory = character.backstory
    if (vaultBackstory !== campaignBackstory) {
      differences.push({
        field: 'backstory',
        vaultValue: vaultBackstory ?? null,
        campaignValue: campaignBackstory ?? null,
      })
    }

    return NextResponse.json({
      isLinked: true,
      vaultCharacterId: character.vault_character_id,
      inSync: differences.length === 0,
      differences,
      syncableFields: SYNC_FIELDS,
    })
  } catch (error) {
    console.error('Get sync status error:', error)
    return NextResponse.json({ error: 'Failed to get sync status' }, { status: 500 })
  }
}

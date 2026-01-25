import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import {
  campaignToVaultCharacter,
  checkSession0Availability,
  getCurrentSessionNumber,
  getExistingExports,
  getLinkedVaultCharacter,
  type CharacterSourceType,
} from '@/lib/character-sync'

interface ExportRequest {
  exportType: 'session_0' | 'current' | 'linked'
  overwriteVaultCharacterId?: string
}

// GET - Get export status for a character
export async function GET(
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

    // Verify user has access to this campaign
    const { data: membership } = await supabase
      .from('campaign_members')
      .select('id, role, character_id')
      .eq('campaign_id', campaignId)
      .eq('user_id', user.id)
      .single()

    // Also check if user is campaign owner
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('user_id, name')
      .eq('id', campaignId)
      .single()

    const isOwner = campaign?.user_id === user.id

    if (!membership && !isOwner) {
      return NextResponse.json({ error: 'Not a member of this campaign' }, { status: 403 })
    }

    // Get the character
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('*')
      .eq('id', characterId)
      .eq('campaign_id', campaignId)
      .single()

    if (charError || !character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 })
    }

    // Check if user can export this character
    const isDesignatedForUser =
      character.controlled_by_user_id === user.id ||
      (character.controlled_by_email && character.controlled_by_email.toLowerCase() === user.email?.toLowerCase())

    const isCoGm = membership?.role === 'co_dm'
    const isDm = isOwner || isCoGm

    if (!isDesignatedForUser && !isDm && character.type !== 'pc') {
      return NextResponse.json({ error: 'You cannot export this character' }, { status: 403 })
    }

    // Check Session 0 availability
    const session0Check = await checkSession0Availability(supabase, campaignId, characterId)

    // Get current session number
    const currentSessionNumber = await getCurrentSessionNumber(supabase, campaignId)

    // Get existing exports
    const existingExports = await getExistingExports(
      supabase,
      user.id,
      campaignId,
      characterId
    )

    // Check for linked character
    const linkedVaultChar = await getLinkedVaultCharacter(
      supabase,
      user.id,
      campaignId,
      characterId
    )

    return NextResponse.json({
      session0Available: session0Check.available,
      session0Reason: session0Check.reason,
      session0FromSnapshot: !!session0Check.existingSnapshotId,
      currentSessionNumber,
      existingExports,
      hasLinkedCharacter: !!linkedVaultChar,
      linkedVaultCharacterId: linkedVaultChar?.id || null,
      campaignName: campaign?.name,
    })
  } catch (error) {
    console.error('Export status error:', error)
    return NextResponse.json({ error: 'Failed to get export status' }, { status: 500 })
  }
}

// POST - Export character to vault
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; characterId: string }> }
) {
  try {
    const { id: campaignId, characterId } = await params
    const supabase = await createClient()

    // Parse request body
    const body = await request.json() as ExportRequest
    const { exportType, overwriteVaultCharacterId } = body

    if (!exportType || !['session_0', 'current', 'linked'].includes(exportType)) {
      return NextResponse.json({ error: 'Invalid export type' }, { status: 400 })
    }

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has access to this campaign
    const { data: membership } = await supabase
      .from('campaign_members')
      .select('id, role, character_id')
      .eq('campaign_id', campaignId)
      .eq('user_id', user.id)
      .single()

    // Also check if user is campaign owner
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('user_id, name')
      .eq('id', campaignId)
      .single()

    const isOwner = campaign?.user_id === user.id
    const campaignName = campaign?.name || 'Unknown Campaign'

    if (!membership && !isOwner) {
      return NextResponse.json({ error: 'Not a member of this campaign' }, { status: 403 })
    }

    // Get the character
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('*')
      .eq('id', characterId)
      .eq('campaign_id', campaignId)
      .single()

    if (charError || !character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 })
    }

    // Check if user can export this character
    const isDesignatedForUser =
      character.controlled_by_user_id === user.id ||
      (character.controlled_by_email && character.controlled_by_email.toLowerCase() === user.email?.toLowerCase())

    const isCoGm = membership?.role === 'co_dm'
    const isDm = isOwner || isCoGm

    if (!isDesignatedForUser && !isDm) {
      return NextResponse.json({ error: 'You cannot export this character' }, { status: 403 })
    }

    // For session_0, verify it's still available and get snapshot data if exists
    let session0SnapshotData: typeof character | null = null
    if (exportType === 'session_0') {
      const session0Check = await checkSession0Availability(supabase, campaignId, characterId)
      if (!session0Check.available) {
        return NextResponse.json({
          error: 'Session 0 snapshot is no longer available',
          reason: session0Check.reason,
        }, { status: 400 })
      }

      // If there's an existing snapshot, use its data instead of current character state
      if (session0Check.existingSnapshotId) {
        const { data: snapshot } = await supabase
          .from('character_snapshots')
          .select('snapshot_data')
          .eq('id', session0Check.existingSnapshotId)
          .single()

        if (snapshot?.snapshot_data) {
          session0SnapshotData = snapshot.snapshot_data as typeof character
        }
      }
    }

    // Get current session number for labeling
    const currentSessionNumber = await getCurrentSessionNumber(supabase, campaignId)

    // Check for existing linked character to get lineage ID
    const existingLinked = await getLinkedVaultCharacter(
      supabase,
      user.id,
      campaignId,
      characterId
    )

    // Map source type
    const sourceType: CharacterSourceType =
      exportType === 'session_0' ? 'session_0' :
      exportType === 'linked' ? 'linked' : 'export'

    // If overwriting an existing export, update it instead of creating new
    if (overwriteVaultCharacterId && exportType === 'current') {
      // Verify user owns this vault character
      const { data: existingExport, error: existingError } = await supabase
        .from('vault_characters')
        .select('id, user_id, character_lineage_id')
        .eq('id', overwriteVaultCharacterId)
        .single()

      if (existingError || !existingExport) {
        return NextResponse.json({ error: 'Export to overwrite not found' }, { status: 404 })
      }

      if (existingExport.user_id !== user.id) {
        return NextResponse.json({ error: 'You cannot overwrite this character' }, { status: 403 })
      }

      // Create updated data
      const vaultData = campaignToVaultCharacter(character, {
        userId: user.id,
        sourceType: 'export',
        campaignId,
        campaignName,
        sessionNumber: currentSessionNumber,
        lineageId: existingExport.character_lineage_id || existingLinked?.character_lineage_id,
      })

      // Update the existing vault character
      const { error: updateError } = await supabase
        .from('vault_characters')
        .update({
          ...vaultData,
          id: undefined, // Don't update ID
          user_id: undefined, // Don't update user_id
          created_at: undefined, // Don't update created_at
        })
        .eq('id', overwriteVaultCharacterId)

      if (updateError) {
        console.error('Failed to update vault character:', updateError)
        return NextResponse.json({ error: 'Failed to update export' }, { status: 500 })
      }

      return NextResponse.json({
        vaultCharacterId: overwriteVaultCharacterId,
        exportType: sourceType,
        snapshotDate: new Date().toISOString(),
        sessionNumber: currentSessionNumber,
        overwritten: true,
      })
    }

    // Create new vault character
    // Determine lineage ID:
    // - If there's an existing linked character, use its lineage ID
    // - Otherwise, we'll set lineage to the new character's own ID after creation
    const lineageId = existingLinked?.character_lineage_id || null

    // Use Session 0 snapshot data if available, otherwise current character
    const characterDataToExport = (exportType === 'session_0' && session0SnapshotData)
      ? session0SnapshotData
      : character

    const vaultData = campaignToVaultCharacter(characterDataToExport, {
      userId: user.id,
      sourceType,
      campaignId,
      campaignName,
      sessionNumber: exportType === 'session_0' ? 0 : currentSessionNumber,
      lineageId: lineageId ?? undefined,
    })

    const { data: newVaultChar, error: insertError } = await supabase
      .from('vault_characters')
      .insert(vaultData)
      .select()
      .single()

    if (insertError || !newVaultChar) {
      console.error('Failed to create vault character:', insertError)
      return NextResponse.json({ error: 'Failed to export character' }, { status: 500 })
    }

    // If no lineage ID was set, set it to the new character's own ID
    if (!lineageId) {
      const { error: lineageError } = await supabase
        .from('vault_characters')
        .update({ character_lineage_id: newVaultChar.id })
        .eq('id', newVaultChar.id)

      if (lineageError) {
        console.error('Failed to set lineage ID:', lineageError)
      }
    }

    // For linked exports, also update the campaign character to link back
    if (exportType === 'linked') {
      const { error: linkError } = await supabase
        .from('characters')
        .update({
          vault_character_id: newVaultChar.id,
          controlled_by_user_id: user.id,
        })
        .eq('id', characterId)

      if (linkError) {
        console.error('Failed to link characters:', linkError)
      }

      // Update campaign member record
      if (membership) {
        const { error: memberError } = await supabase
          .from('campaign_members')
          .update({
            character_id: characterId,
            vault_character_id: newVaultChar.id,
          })
          .eq('id', membership.id)

        if (memberError) {
          console.error('Failed to update membership:', memberError)
        }
      }
    }

    // Create snapshot record for history
    const snapshotData = {
      vault_character_id: newVaultChar.id,
      campaign_id: campaignId,
      campaign_character_id: characterId,
      snapshot_data: characterDataToExport,
      snapshot_type: exportType === 'session_0' ? 'session_0' :
                     exportType === 'linked' ? 'join' : 'current_state',
      snapshot_name: exportType === 'session_0' ? 'Session 0 - Character State Before Campaign' :
                     exportType === 'linked' ? 'Character Joined Campaign' :
                     `Session ${currentSessionNumber} Export`,
      created_by: user.id,
    }

    const { error: snapshotError } = await supabase
      .from('character_snapshots')
      .insert(snapshotData)

    if (snapshotError) {
      console.error('Failed to create snapshot:', snapshotError)
    }

    return NextResponse.json({
      vaultCharacterId: newVaultChar.id,
      exportType: sourceType,
      snapshotDate: new Date().toISOString(),
      sessionNumber: exportType === 'session_0' ? 0 : currentSessionNumber,
      overwritten: false,
    })
  } catch (error) {
    console.error('Export character error:', error)
    return NextResponse.json({ error: 'Failed to export character' }, { status: 500 })
  }
}

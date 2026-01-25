/**
 * Character Sync Utilities
 *
 * Handles mapping between campaign characters and vault characters
 * for the vault ↔ campaign sync system.
 */

import type { Database } from '@/types/database'

type CampaignCharacter = Database['public']['Tables']['characters']['Row']
type VaultCharacter = Database['public']['Tables']['vault_characters']['Row']
type VaultCharacterInsert = Database['public']['Tables']['vault_characters']['Insert']

/**
 * Source types for vault characters
 */
export type CharacterSourceType = 'original' | 'linked' | 'session_0' | 'export'

/**
 * Fields that sync bidirectionally between campaign and vault
 */
export const SYNCED_FIELDS = [
  'name',
  'type',
  'description',
  'summary',
  'notes',
  'image_url',
  'detail_image_url',
  'status',
  'status_color',
  'race',
  'class',
  'background',
  'appearance',
  'personality',
  'goals',
  'secrets',
  'backstory',
  'motivations',
] as const

/**
 * Fields that only exist in campaign (not copied to vault on export)
 */
export const CAMPAIGN_ONLY_FIELDS = [
  'campaign_id',
  'position_x',
  'position_y',
  'canvas_width',
  'canvas_height',
  'image_generated_with_ai',
  'story_hooks',
  'dm_notes',
  'visibility',
  'vault_character_id',
  'controlled_by_user_id',
  'controlled_by_email',
  'controlled_by_discord',
  'play_status',
  'is_party_member',
] as const

/**
 * Maps a campaign character to vault character data for export.
 * Preserves full data fidelity for all shared fields.
 */
export function campaignToVaultCharacter(
  campaignChar: CampaignCharacter,
  options: {
    userId: string
    sourceType: CharacterSourceType
    campaignId: string
    campaignName: string
    sessionNumber?: number
    lineageId?: string
  }
): VaultCharacterInsert {
  const now = new Date().toISOString()

  return {
    // Required fields
    user_id: options.userId,
    name: campaignChar.name,
    type: campaignChar.type,

    // Synced text fields
    description: campaignChar.description,
    summary: campaignChar.summary,
    notes: campaignChar.notes,
    backstory: campaignChar.backstory,
    motivations: campaignChar.motivations,

    // Images
    image_url: campaignChar.image_url,
    detail_image_url: campaignChar.detail_image_url,

    // Status
    status: campaignChar.status,
    status_color: campaignChar.status_color,

    // Character attributes
    race: campaignChar.race,
    class: campaignChar.class,
    background: campaignChar.background,
    appearance: campaignChar.appearance,
    personality: campaignChar.personality,
    goals: campaignChar.goals,
    secrets: campaignChar.secrets,

    // Age conversion (campaign stores as number, vault as string)
    age: campaignChar.age != null ? String(campaignChar.age) : null,

    // NPC role mapping
    npc_role: campaignChar.role,

    // JSONB fields
    important_people: campaignChar.important_people,
    // Convert quotes from JSONB to string array if needed
    quotes: Array.isArray(campaignChar.quotes)
      ? campaignChar.quotes as string[]
      : campaignChar.quotes
        ? [String(campaignChar.quotes)]
        : null,

    // Source tracking
    source_type: options.sourceType,
    source_campaign_id: options.campaignId,
    source_campaign_name: options.campaignName,
    source_campaign_character_id: campaignChar.id,
    source_snapshot_date: now,
    source_session_number: options.sessionNumber ?? null,
    character_lineage_id: options.lineageId ?? null,

    // Import tracking
    source_file: campaignChar.source_document,
    imported_at: campaignChar.imported_at,

    // Defaults for new vault character
    is_archived: false,
    is_favorite: false,
    is_public: false,
    allow_comments: false,
    content_mode: 'active',
    is_published: false,
    template_version: 1,
    template_save_count: 0,
    allow_save: true,
    is_session0_ready: false,
    display_order: 0,
    campaign_links: [],
    private_campaign_notes: {},
  }
}

/**
 * Maps vault character data to campaign character for import.
 * Only includes fields that campaign characters support.
 */
export function vaultToCampaignCharacter(
  vaultChar: VaultCharacter,
  options: {
    campaignId: string
    positionX?: number
    positionY?: number
  }
): Partial<CampaignCharacter> {
  return {
    campaign_id: options.campaignId,
    name: vaultChar.name,
    type: vaultChar.type,

    // Synced text fields
    description: vaultChar.description,
    summary: vaultChar.summary,
    notes: vaultChar.notes,
    backstory: vaultChar.backstory,
    motivations: vaultChar.motivations,

    // Images
    image_url: vaultChar.image_url,
    detail_image_url: vaultChar.detail_image_url,

    // Status
    status: vaultChar.status,
    status_color: vaultChar.status_color,

    // Character attributes
    race: vaultChar.race,
    class: vaultChar.class,
    background: vaultChar.background,
    appearance: vaultChar.appearance,
    personality: vaultChar.personality,
    goals: vaultChar.goals,
    secrets: vaultChar.secrets,

    // Age conversion (vault stores as string, campaign as number)
    age: vaultChar.age != null ? parseInt(vaultChar.age, 10) || null : null,

    // NPC role mapping
    role: vaultChar.npc_role,

    // JSONB fields
    important_people: vaultChar.important_people,
    quotes: vaultChar.quotes,

    // Canvas position
    position_x: options.positionX ?? 0,
    position_y: options.positionY ?? 0,

    // Link back to vault character
    vault_character_id: vaultChar.id,

    // Defaults
    visibility: 'public',
    play_status: 'active',
    is_party_member: vaultChar.type === 'pc',
    image_generated_with_ai: false,
  }
}

/**
 * Updates a vault character's synced fields from campaign character.
 * Used when syncing a linked character.
 */
export function getSyncedFieldsFromCampaign(
  campaignChar: CampaignCharacter
): Partial<VaultCharacter> {
  return {
    name: campaignChar.name,
    description: campaignChar.description,
    summary: campaignChar.summary,
    notes: campaignChar.notes,
    backstory: campaignChar.backstory,
    motivations: campaignChar.motivations,
    image_url: campaignChar.image_url,
    detail_image_url: campaignChar.detail_image_url,
    status: campaignChar.status,
    status_color: campaignChar.status_color,
    race: campaignChar.race,
    class: campaignChar.class,
    background: campaignChar.background,
    appearance: campaignChar.appearance,
    personality: campaignChar.personality,
    goals: campaignChar.goals,
    secrets: campaignChar.secrets,
    age: campaignChar.age != null ? String(campaignChar.age) : null,
    npc_role: campaignChar.role,
    important_people: campaignChar.important_people,
    quotes: Array.isArray(campaignChar.quotes)
      ? campaignChar.quotes as string[]
      : campaignChar.quotes
        ? [String(campaignChar.quotes)]
        : null,
  }
}

/**
 * Checks Session 0 availability for a character.
 *
 * Session 0 is available if:
 * 1. A Session 0 snapshot already exists (can always retrieve it), OR
 * 2. No session notes exist yet (can still capture current state as Session 0)
 *
 * Session 0 is NOT available if:
 * - No snapshot was ever taken AND the campaign already has session history
 *   (the window to capture the pre-campaign state has passed)
 */
export async function checkSession0Availability(
  supabase: ReturnType<typeof import('@supabase/supabase-js').createClient<Database>>,
  campaignId: string,
  characterId?: string
): Promise<{ available: boolean; reason?: string; existingSnapshotId?: string }> {
  // First, check if a Session 0 snapshot already exists for this character
  if (characterId) {
    const { data: existingSnapshot } = await supabase
      .from('character_snapshots')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('campaign_character_id', characterId)
      .eq('snapshot_type', 'session_0')
      .limit(1)
      .single()

    if (existingSnapshot) {
      // Session 0 snapshot exists - always available to retrieve
      return {
        available: true,
        existingSnapshotId: (existingSnapshot as { id: string }).id,
        reason: 'Session 0 snapshot is saved and available.'
      }
    }
  }

  // No existing snapshot - check if we can still create one
  // (only possible if no session notes exist yet)

  // Check if any sessions have notes
  const { data: sessions, error } = await supabase
    .from('sessions')
    .select('id, notes')
    .eq('campaign_id', campaignId)
    .not('notes', 'is', null)
    .limit(1)

  if (error) {
    console.error('Error checking session notes:', error)
    return { available: false, reason: 'Error checking session history' }
  }

  if (sessions && sessions.length > 0) {
    return {
      available: false,
      reason: 'No Session 0 snapshot was captured before the campaign began. The window to save the pre-campaign character state has passed.'
    }
  }

  // Also check player_session_notes table
  const { data: playerNotes, error: playerNotesError } = await supabase
    .from('player_session_notes')
    .select('id')
    .eq('campaign_id', campaignId)
    .limit(1)

  if (playerNotesError) {
    // Table might not have campaign_id, try through sessions
    const { data: allSessions } = await supabase
      .from('sessions')
      .select('id')
      .eq('campaign_id', campaignId)

    if (allSessions && allSessions.length > 0) {
      const sessionIds = (allSessions as Array<{ id: string }>).map(s => s.id)
      const { data: notes } = await supabase
        .from('player_session_notes')
        .select('id')
        .in('session_id', sessionIds)
        .limit(1)

      if (notes && notes.length > 0) {
        return {
          available: false,
          reason: 'No Session 0 snapshot was captured before the campaign began. The window to save the pre-campaign character state has passed.'
        }
      }
    }
  } else if (playerNotes && playerNotes.length > 0) {
    return {
      available: false,
      reason: 'No Session 0 snapshot was captured before the campaign began. The window to save the pre-campaign character state has passed.'
    }
  }

  // No session history - can still capture Session 0
  return { available: true }
}

/**
 * Gets the current session number for a campaign (for export labeling).
 */
export async function getCurrentSessionNumber(
  supabase: ReturnType<typeof import('@supabase/supabase-js').createClient<Database>>,
  campaignId: string
): Promise<number> {
  const { data, error } = await supabase
    .from('sessions')
    .select('session_number')
    .eq('campaign_id', campaignId)
    .order('session_number', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    return 0
  }

  return (data as { session_number?: number }).session_number ?? 0
}

/**
 * Gets existing exports for a character from a specific campaign.
 * Used to show "overwrite existing export" options.
 */
export async function getExistingExports(
  supabase: ReturnType<typeof import('@supabase/supabase-js').createClient<Database>>,
  userId: string,
  campaignId: string,
  campaignCharacterId: string
): Promise<Array<{
  id: string
  name: string
  source_snapshot_date: string
  source_session_number: number | null
  source_type: CharacterSourceType
}>> {
  const { data, error } = await supabase
    .from('vault_characters')
    .select('id, name, source_snapshot_date, source_session_number, source_type')
    .eq('user_id', userId)
    .eq('source_campaign_id', campaignId)
    .eq('source_campaign_character_id', campaignCharacterId)
    .in('source_type', ['session_0', 'export'])
    .order('source_snapshot_date', { ascending: false })

  if (error || !data) {
    return []
  }

  return (data as Array<{
    id: string
    name: string
    source_snapshot_date: string | null
    source_session_number: number | null
    source_type: string | null
  }>).map(d => ({
    id: d.id,
    name: d.name,
    source_snapshot_date: d.source_snapshot_date ?? '',
    source_session_number: d.source_session_number,
    source_type: (d.source_type ?? 'original') as CharacterSourceType,
  }))
}

/**
 * Gets the linked vault character for a campaign character.
 */
export async function getLinkedVaultCharacter(
  supabase: ReturnType<typeof import('@supabase/supabase-js').createClient<Database>>,
  userId: string,
  campaignId: string,
  campaignCharacterId: string
): Promise<VaultCharacter | null> {
  const { data, error } = await supabase
    .from('vault_characters')
    .select('*')
    .eq('user_id', userId)
    .eq('source_campaign_id', campaignId)
    .eq('source_campaign_character_id', campaignCharacterId)
    .eq('source_type', 'linked')
    .single()

  if (error || !data) {
    return null
  }

  return data
}

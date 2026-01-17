/**
 * Activity Logging Utility
 *
 * Provides functions to log user activity for audit trail.
 * Also includes optimistic locking helpers for conflict detection.
 */

import { SupabaseClient } from '@supabase/supabase-js'

// Action types for different operations
export type ActivityAction =
  // Characters
  | 'character.create'
  | 'character.edit'
  | 'character.delete'
  | 'character.image_change'
  // Campaigns
  | 'campaign.create'
  | 'campaign.edit'
  | 'campaign.delete'
  // Sessions
  | 'session.create'
  | 'session.edit'
  | 'session.delete'
  // Oneshots
  | 'oneshot.create'
  | 'oneshot.edit'
  | 'oneshot.delete'
  // Canvas
  | 'canvas.character_move'
  | 'canvas.character_resize'
  | 'canvas.group_create'
  | 'canvas.group_edit'
  | 'canvas.group_delete'
  // Sharing
  | 'share.create'
  | 'share.revoke'
  // Data
  | 'data.export'
  | 'data.import'
  // AI
  | 'ai.generate_image'
  | 'ai.analyze'

export type EntityType = 'character' | 'campaign' | 'session' | 'oneshot' | 'share' | 'canvas_group'

export interface ActivityLogEntry {
  action: ActivityAction
  entity_type: EntityType
  entity_id?: string
  entity_name?: string
  changes?: Record<string, { old?: unknown; new?: unknown }>
  metadata?: Record<string, unknown>
}

/**
 * Log an activity to the database
 */
export async function logActivity(
  supabase: SupabaseClient,
  userId: string,
  entry: ActivityLogEntry
): Promise<void> {
  try {
    await supabase.from('activity_log').insert({
      user_id: userId,
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      entity_name: entry.entity_name,
      changes: entry.changes,
      metadata: entry.metadata,
    })
  } catch (error) {
    // Don't throw - logging failures shouldn't break the app
    console.error('Failed to log activity:', error)
  }
}

/**
 * Create a changes object by comparing old and new data
 */
export function diffChanges<T extends Record<string, unknown>>(
  oldData: T | null,
  newData: T,
  fieldsToTrack?: (keyof T)[]
): Record<string, { old?: unknown; new?: unknown }> | undefined {
  if (!oldData) return undefined

  const changes: Record<string, { old?: unknown; new?: unknown }> = {}
  const fields = fieldsToTrack || (Object.keys(newData) as (keyof T)[])

  for (const field of fields) {
    const oldVal = oldData[field]
    const newVal = newData[field]

    // Skip if both undefined/null
    if (oldVal == null && newVal == null) continue

    // Compare as JSON for objects/arrays
    const oldStr = JSON.stringify(oldVal)
    const newStr = JSON.stringify(newVal)

    if (oldStr !== newStr) {
      changes[field as string] = { old: oldVal, new: newVal }
    }
  }

  return Object.keys(changes).length > 0 ? changes : undefined
}

// =====================================================
// CONFLICT DETECTION / OPTIMISTIC LOCKING
// =====================================================

export interface ConflictCheckResult {
  hasConflict: boolean
  currentVersion?: number
  currentUpdatedAt?: string
}

/**
 * Check if there's a version conflict before saving
 * Returns true if the record has been modified since we loaded it
 */
export async function checkForConflict(
  supabase: SupabaseClient,
  table: string,
  id: string,
  expectedVersion: number
): Promise<ConflictCheckResult> {
  const { data, error } = await supabase
    .from(table)
    .select('version, updated_at')
    .eq('id', id)
    .single()

  if (error || !data) {
    return { hasConflict: false } // Record not found, no conflict
  }

  return {
    hasConflict: data.version !== expectedVersion,
    currentVersion: data.version,
    currentUpdatedAt: data.updated_at,
  }
}

/**
 * Save with optimistic locking - increments version and checks for conflicts
 * Returns { success, conflict, newVersion }
 */
export async function saveWithVersionCheck<T extends Record<string, unknown>>(
  supabase: SupabaseClient,
  table: string,
  id: string,
  expectedVersion: number,
  updates: T
): Promise<{ success: boolean; conflict: boolean; newVersion?: number; error?: string }> {
  // First check if version matches
  const conflictCheck = await checkForConflict(supabase, table, id, expectedVersion)

  if (conflictCheck.hasConflict) {
    return {
      success: false,
      conflict: true,
      newVersion: conflictCheck.currentVersion,
      error: `This record was modified by another user or tab. Your version: ${expectedVersion}, Current version: ${conflictCheck.currentVersion}`,
    }
  }

  // Update with incremented version
  const newVersion = expectedVersion + 1
  const { error } = await supabase
    .from(table)
    .update({
      ...updates,
      version: newVersion,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('version', expectedVersion) // Double-check version in WHERE clause

  if (error) {
    // If update failed due to version mismatch, it's a race condition
    if (error.message?.includes('0 rows')) {
      return {
        success: false,
        conflict: true,
        error: 'Concurrent modification detected. Please refresh and try again.',
      }
    }
    return { success: false, conflict: false, error: error.message }
  }

  return { success: true, conflict: false, newVersion }
}

/**
 * Format activity for display
 */
export function formatActivityAction(action: ActivityAction): string {
  const labels: Record<ActivityAction, string> = {
    'character.create': 'Created character',
    'character.edit': 'Edited character',
    'character.delete': 'Deleted character',
    'character.image_change': 'Changed character image',
    'campaign.create': 'Created campaign',
    'campaign.edit': 'Edited campaign',
    'campaign.delete': 'Deleted campaign',
    'session.create': 'Created session',
    'session.edit': 'Edited session notes',
    'session.delete': 'Deleted session',
    'oneshot.create': 'Created one-shot',
    'oneshot.edit': 'Edited one-shot',
    'oneshot.delete': 'Deleted one-shot',
    'canvas.character_move': 'Moved character on canvas',
    'canvas.character_resize': 'Resized character on canvas',
    'canvas.group_create': 'Created canvas group',
    'canvas.group_edit': 'Edited canvas group',
    'canvas.group_delete': 'Deleted canvas group',
    'share.create': 'Created share link',
    'share.revoke': 'Revoked share link',
    'data.export': 'Exported data',
    'data.import': 'Imported data',
    'ai.generate_image': 'Generated AI image',
    'ai.analyze': 'Ran AI analysis',
  }
  return labels[action] || action
}

export function getActivityIcon(action: ActivityAction): string {
  if (action.startsWith('character.')) return '👤'
  if (action.startsWith('campaign.')) return '🗺️'
  if (action.startsWith('session.')) return '📖'
  if (action.startsWith('oneshot.')) return '📜'
  if (action.startsWith('canvas.')) return '🎨'
  if (action.startsWith('share.')) return '🔗'
  if (action.startsWith('data.')) return '💾'
  if (action.startsWith('ai.')) return '🤖'
  return '📝'
}

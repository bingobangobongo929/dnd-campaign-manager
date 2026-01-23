import type { MemberPermissions, CampaignMemberRole } from '@/types/database'
import { DEFAULT_PERMISSIONS } from '@/types/database'

/**
 * Server-side permission checking helper
 * Checks if a user has a specific permission
 */
export function checkPermission(
  permissions: MemberPermissions | null | undefined,
  isOwner: boolean,
  category: keyof MemberPermissions,
  action: string
): boolean {
  // Owners have all permissions
  if (isOwner) return true

  // No permissions object means no access
  if (!permissions) return false

  // Get the category permissions
  const categoryPermissions = permissions[category]
  if (!categoryPermissions) return false

  // Check the specific action
  return (categoryPermissions as Record<string, boolean>)[action] ?? false
}

/**
 * Get permissions for a role, with optional overrides
 */
export function getPermissionsForRole(
  role: CampaignMemberRole,
  overrides?: Partial<MemberPermissions>
): MemberPermissions {
  const defaults = DEFAULT_PERMISSIONS[role]

  if (!overrides) return defaults

  // Deep merge overrides with defaults
  return {
    sessionNotes: { ...defaults.sessionNotes, ...overrides.sessionNotes },
    characters: { ...defaults.characters, ...overrides.characters },
    npcs: { ...defaults.npcs, ...overrides.npcs },
    timeline: { ...defaults.timeline, ...overrides.timeline },
    factions: { ...defaults.factions, ...overrides.factions },
    locations: { ...defaults.locations, ...overrides.locations },
    lore: { ...defaults.lore, ...overrides.lore },
    maps: { ...defaults.maps, ...overrides.maps },
    mapPins: { ...defaults.mapPins, ...overrides.mapPins },
    gallery: { ...defaults.gallery, ...overrides.gallery },
    canvas: { ...defaults.canvas, ...overrides.canvas },
    sessions: { ...defaults.sessions, ...overrides.sessions },
    secrets: { ...defaults.secrets, ...overrides.secrets },
  }
}

/**
 * Filter items by visibility level
 * DMs see everything, others only see public and party items
 */
export function filterByVisibility<T extends { visibility?: string | null }>(
  items: T[],
  isDm: boolean
): T[] {
  if (isDm) return items

  return items.filter(item =>
    !item.visibility ||
    item.visibility === 'public' ||
    item.visibility === 'party'
  )
}

/**
 * Check if user can perform action on an item they own
 * Used for "edit own" type permissions
 */
export function canEditOwn(
  permissions: MemberPermissions | null | undefined,
  isOwner: boolean,
  userId: string | null,
  itemOwnerId: string | null | undefined
): boolean {
  if (isOwner) return true
  if (!permissions) return false
  if (!userId || !itemOwnerId) return false

  // Check if user owns the item and has editOwn permission
  return userId === itemOwnerId && (permissions.characters?.editOwn ?? false)
}

/**
 * Permission check result with detailed info for API responses
 */
export interface PermissionCheckResult {
  allowed: boolean
  reason?: string
}

/**
 * Comprehensive permission check for API routes
 */
export function checkRoutePermission(
  options: {
    permissions: MemberPermissions | null | undefined
    isOwner: boolean
    isDm: boolean // owner or co_dm
    category: keyof MemberPermissions
    action: string
    itemOwnerId?: string | null
    userId?: string | null
  }
): PermissionCheckResult {
  const { permissions, isOwner, isDm, category, action, itemOwnerId, userId } = options

  // Owners always have access
  if (isOwner) {
    return { allowed: true }
  }

  // DMs (co_dm) have full access to most things
  if (isDm) {
    return { allowed: true }
  }

  // No membership means no access
  if (!permissions) {
    return { allowed: false, reason: 'Not a member of this campaign' }
  }

  // Special case: check if user owns the item for "editOwn" type permissions
  if (action === 'editOwn' && userId && itemOwnerId) {
    if (userId === itemOwnerId && permissions[category]) {
      const categoryPerms = permissions[category] as Record<string, boolean>
      if (categoryPerms.editOwn) {
        return { allowed: true }
      }
    }
    return { allowed: false, reason: 'You can only edit items you own' }
  }

  // Standard permission check
  const hasPermission = checkPermission(permissions, false, category, action)

  if (!hasPermission) {
    return {
      allowed: false,
      reason: `Missing permission: ${category}.${action}`
    }
  }

  return { allowed: true }
}

/**
 * Helper to determine if user is DM (owner or co_dm)
 */
export function isDmRole(isOwner: boolean, role: CampaignMemberRole | null): boolean {
  return isOwner || role === 'co_dm'
}

/**
 * Create a permission context object for passing to components/APIs
 */
export interface PermissionContext {
  isOwner: boolean
  isDm: boolean
  role: CampaignMemberRole | null
  permissions: MemberPermissions | null
  userId: string | null
}

export function createPermissionContext(
  isOwner: boolean,
  role: CampaignMemberRole | null,
  permissions: MemberPermissions | null,
  userId: string | null
): PermissionContext {
  return {
    isOwner,
    isDm: isDmRole(isOwner, role),
    role,
    permissions,
    userId,
  }
}

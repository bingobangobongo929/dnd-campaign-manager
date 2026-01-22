import type { UserRole, Permission, ROLE_PERMISSIONS } from '@/types/database'

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions: readonly Permission[] = {
    user: [] as const,
    moderator: ['view_users', 'suspend_users', 'view_analytics'] as const,
    super_admin: ['view_users', 'suspend_users', 'disable_users', 'change_tiers', 'change_roles', 'view_analytics', 'manage_changelog'] as const,
  }[role]

  return permissions.includes(permission)
}

/**
 * Check if user is an admin (moderator or super_admin)
 */
export function isAdmin(role: UserRole): boolean {
  return role === 'moderator' || role === 'super_admin'
}

/**
 * Check if user is a super admin
 */
export function isSuperAdmin(role: UserRole): boolean {
  return role === 'super_admin'
}

/**
 * Get all permissions for a role
 */
export function getPermissions(role: UserRole): readonly Permission[] {
  const permissions = {
    user: [] as const,
    moderator: ['view_users', 'suspend_users', 'view_analytics'] as const,
    super_admin: ['view_users', 'suspend_users', 'disable_users', 'change_tiers', 'change_roles', 'view_analytics', 'manage_changelog'] as const,
  }
  return permissions[role]
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    user: 'User',
    moderator: 'Moderator',
    super_admin: 'Super Admin',
  }
  return names[role]
}

/**
 * Get role badge color
 */
export function getRoleBadgeColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    user: 'bg-gray-500/20 text-gray-400',
    moderator: 'bg-blue-500/20 text-blue-400',
    super_admin: 'bg-purple-500/20 text-purple-400',
  }
  return colors[role]
}

/**
 * Get tier display name
 */
export function getTierDisplayName(tier: string): string {
  const names: Record<string, string> = {
    // New tier names
    adventurer: 'Adventurer',
    hero: 'Hero',
    legend: 'Legend',
    // Legacy tier names (for backwards compatibility)
    free: 'Free',
    standard: 'Standard',
    premium: 'Premium',
  }
  return names[tier] || tier
}

/**
 * Get tier badge color
 */
export function getTierBadgeColor(tier: string): string {
  const colors: Record<string, string> = {
    // New tier names
    adventurer: 'bg-emerald-500/20 text-emerald-400',
    hero: 'bg-blue-500/20 text-blue-400',
    legend: 'bg-amber-500/20 text-amber-400',
    // Legacy tier names (for backwards compatibility)
    free: 'bg-gray-500/20 text-gray-400',
    standard: 'bg-green-500/20 text-green-400',
    premium: 'bg-amber-500/20 text-amber-400',
  }
  return colors[tier] || 'bg-gray-500/20 text-gray-400'
}

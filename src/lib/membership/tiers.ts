// Membership tier configuration
// Note: -1 means unlimited

export type Tier = 'adventurer' | 'hero' | 'legend'

export interface TierLimits {
  campaigns: number
  oneshots: number
  vaultCharacters: number
  storageMB: number
  shareLinks: number
  publicTemplates: number
  pdfExport: boolean
  customThemes: boolean
}

export const TIER_LIMITS: Record<Tier, TierLimits> = {
  adventurer: {
    campaigns: 3,
    oneshots: 3,
    vaultCharacters: 10,
    storageMB: 100,
    shareLinks: 3,
    publicTemplates: 1,
    pdfExport: false,
    customThemes: false,
  },
  hero: {
    campaigns: 10,
    oneshots: 10,
    vaultCharacters: 50,
    storageMB: 500,
    shareLinks: 10,
    publicTemplates: 5,
    pdfExport: true,
    customThemes: false,
  },
  legend: {
    campaigns: -1, // Unlimited
    oneshots: -1,
    vaultCharacters: -1,
    storageMB: 2048,
    shareLinks: -1,
    publicTemplates: -1,
    pdfExport: true,
    customThemes: true,
  },
}

// Founders on Adventurer tier get Hero limits
export const FOUNDER_LIMITS = TIER_LIMITS.hero

export interface TierInfo {
  name: string
  displayName: string
  description: string
  monthlyPrice: number | null
  yearlyPrice: number | null
}

export const TIER_INFO: Record<Tier, TierInfo> = {
  adventurer: {
    name: 'adventurer',
    displayName: 'Adventurer',
    description: 'Perfect for getting started',
    monthlyPrice: null, // Free
    yearlyPrice: null,
  },
  hero: {
    name: 'hero',
    displayName: 'Hero',
    description: 'For dedicated dungeon masters',
    monthlyPrice: 5,
    yearlyPrice: 40, // Save ~33%
  },
  legend: {
    name: 'legend',
    displayName: 'Legend',
    description: 'Unlimited power for serious campaigns',
    monthlyPrice: 10,
    yearlyPrice: 80, // Save ~33%
  },
}

/**
 * Get effective limits for a user based on tier and founder status
 */
export function getEffectiveLimits(tier: Tier, isFounder: boolean): TierLimits {
  // Founders on adventurer get hero limits
  if (isFounder && tier === 'adventurer') {
    return FOUNDER_LIMITS
  }
  return TIER_LIMITS[tier]
}

/**
 * Check if a limit value means unlimited
 */
export function isUnlimited(limit: number): boolean {
  return limit === -1
}

/**
 * Format a limit for display
 */
export function formatLimit(limit: number): string {
  return isUnlimited(limit) ? 'Unlimited' : limit.toString()
}

/**
 * Calculate usage percentage (capped at 100)
 */
export function getUsagePercent(used: number, limit: number): number {
  if (isUnlimited(limit)) return 0
  return Math.min(100, Math.round((used / limit) * 100))
}

/**
 * Check if user can create more of a resource
 */
export function canCreate(used: number, limit: number): boolean {
  if (isUnlimited(limit)) return true
  return used < limit
}

/**
 * Check if user can upload a file of given size
 */
export function canUpload(usedMB: number, limitMB: number, fileSizeMB: number): boolean {
  if (isUnlimited(limitMB)) return true
  return (usedMB + fileSizeMB) <= limitMB
}

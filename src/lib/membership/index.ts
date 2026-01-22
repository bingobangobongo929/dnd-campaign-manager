export * from './tiers'

export interface UserMembership {
  tier: 'adventurer' | 'hero' | 'legend'
  isFounder: boolean
  founderGrantedAt: string | null
  aiAccess: boolean
  stripeCustomerId: string | null
  subscriptionStatus: 'none' | 'active' | 'cancelled' | 'past_due'
  subscriptionTier: string | null
  subscriptionEndsAt: string | null
}

export interface UserUsage {
  campaigns: number
  oneshots: number
  vaultCharacters: number
  shareLinks: number
  publicTemplates: number
  storageMB: number
}

export interface AppSettings {
  billingEnabled: boolean
  founderSignupsEnabled: boolean
  founderSignupsClosedAt: string | null
  maintenanceMode: boolean
}

export type LimitType =
  | 'campaigns'
  | 'oneshots'
  | 'vaultCharacters'
  | 'shareLinks'
  | 'publicTemplates'
  | 'storage'

export interface LimitCheckResult {
  allowed: boolean
  current: number
  limit: number
  limitType: LimitType
  isUnlimited: boolean
}

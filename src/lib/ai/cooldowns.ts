import { createClient } from '@/lib/supabase/server'
import type { CooldownType, UserTier } from '@/types/database'

// =====================================================
// COOLDOWN SYSTEM
// =====================================================

// Default cooldown hours per tier (can be overridden in ai_tier_settings table)
const DEFAULT_COOLDOWN_HOURS: Record<UserTier, Record<CooldownType, number>> = {
  adventurer: {
    campaign_intelligence: 24,
    character_intelligence: 24,
  },
  hero: {
    campaign_intelligence: 12,
    character_intelligence: 12,
  },
  legend: {
    campaign_intelligence: 12,
    character_intelligence: 12,
  },
}

export interface CooldownStatus {
  isOnCooldown: boolean
  availableAt: Date | null
  remainingMs: number
  remainingFormatted: string
}

/**
 * Format remaining time in a human-readable format
 */
function formatRemainingTime(ms: number): string {
  if (ms <= 0) return 'Available now'

  const hours = Math.floor(ms / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

/**
 * Get the cooldown hours for a specific tier and type
 * First checks ai_tier_settings table, falls back to defaults
 */
async function getCooldownHours(
  tier: UserTier,
  cooldownType: CooldownType
): Promise<number> {
  try {
    const supabase = await createClient()

    const { data: tierSettings } = await supabase
      .from('ai_tier_settings')
      .select('campaign_intelligence_cooldown_hours, character_intelligence_cooldown_hours')
      .eq('tier', tier)
      .single()

    if (tierSettings) {
      return cooldownType === 'campaign_intelligence'
        ? tierSettings.campaign_intelligence_cooldown_hours
        : tierSettings.character_intelligence_cooldown_hours
    }
  } catch {
    // Fall back to defaults
  }

  return DEFAULT_COOLDOWN_HOURS[tier][cooldownType]
}

/**
 * Check if a user is on cooldown for a specific Intelligence type
 * entityId is optional - if provided, checks cooldown for that specific entity (campaign/character)
 */
export async function checkCooldown(
  userId: string,
  cooldownType: CooldownType,
  entityId?: string
): Promise<CooldownStatus> {
  try {
    const supabase = await createClient()

    // Build query for existing cooldown
    let query = supabase
      .from('ai_cooldowns')
      .select('next_available_at')
      .eq('user_id', userId)
      .eq('cooldown_type', cooldownType)

    if (entityId) {
      query = query.eq('entity_id', entityId)
    } else {
      query = query.is('entity_id', null)
    }

    const { data: cooldown } = await query.single()

    if (!cooldown) {
      return {
        isOnCooldown: false,
        availableAt: null,
        remainingMs: 0,
        remainingFormatted: 'Available now',
      }
    }

    const now = new Date()
    const availableAt = new Date(cooldown.next_available_at)
    const remainingMs = Math.max(0, availableAt.getTime() - now.getTime())

    return {
      isOnCooldown: remainingMs > 0,
      availableAt,
      remainingMs,
      remainingFormatted: formatRemainingTime(remainingMs),
    }
  } catch (error) {
    console.error('Error checking cooldown:', error)
    return {
      isOnCooldown: false,
      availableAt: null,
      remainingMs: 0,
      remainingFormatted: 'Available now',
    }
  }
}

/**
 * Set a cooldown after an Intelligence run
 * Uses the tier-specific cooldown hours from settings or defaults
 */
export async function setCooldown(
  userId: string,
  cooldownType: CooldownType,
  userTier: UserTier,
  entityId?: string
): Promise<boolean> {
  try {
    const supabase = await createClient()

    const cooldownHours = await getCooldownHours(userTier, cooldownType)
    const now = new Date()
    const nextAvailable = new Date(now.getTime() + cooldownHours * 60 * 60 * 1000)

    // Upsert the cooldown record
    const { error } = await supabase
      .from('ai_cooldowns')
      .upsert(
        {
          user_id: userId,
          cooldown_type: cooldownType,
          entity_id: entityId || null,
          last_run_at: now.toISOString(),
          next_available_at: nextAvailable.toISOString(),
        },
        {
          onConflict: 'user_id,cooldown_type,entity_id',
        }
      )

    if (error) {
      console.error('Failed to set cooldown:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error setting cooldown:', error)
    return false
  }
}

/**
 * Clear a cooldown (for admin use or special cases)
 */
export async function clearCooldown(
  userId: string,
  cooldownType: CooldownType,
  entityId?: string
): Promise<boolean> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('ai_cooldowns')
      .delete()
      .eq('user_id', userId)
      .eq('cooldown_type', cooldownType)

    if (entityId) {
      query = query.eq('entity_id', entityId)
    } else {
      query = query.is('entity_id', null)
    }

    const { error } = await query

    if (error) {
      console.error('Failed to clear cooldown:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error clearing cooldown:', error)
    return false
  }
}

/**
 * Get all cooldowns for a user (for dashboard display)
 */
export async function getUserCooldowns(userId: string): Promise<{
  campaignIntelligence: CooldownStatus[]
  characterIntelligence: CooldownStatus[]
}> {
  try {
    const supabase = await createClient()

    const { data: cooldowns } = await supabase
      .from('ai_cooldowns')
      .select('*')
      .eq('user_id', userId)

    const now = new Date()
    const campaignIntelligence: CooldownStatus[] = []
    const characterIntelligence: CooldownStatus[] = []

    for (const cooldown of cooldowns || []) {
      const availableAt = new Date(cooldown.next_available_at)
      const remainingMs = Math.max(0, availableAt.getTime() - now.getTime())
      const status: CooldownStatus = {
        isOnCooldown: remainingMs > 0,
        availableAt,
        remainingMs,
        remainingFormatted: formatRemainingTime(remainingMs),
      }

      if (cooldown.cooldown_type === 'campaign_intelligence') {
        campaignIntelligence.push(status)
      } else {
        characterIntelligence.push(status)
      }
    }

    return { campaignIntelligence, characterIntelligence }
  } catch (error) {
    console.error('Error getting user cooldowns:', error)
    return { campaignIntelligence: [], characterIntelligence: [] }
  }
}

/**
 * Middleware helper that checks cooldown and returns an error response if on cooldown
 */
export async function requireNoCooldown(
  userId: string,
  cooldownType: CooldownType,
  entityId?: string
): Promise<{ allowed: true } | { allowed: false; error: string; status: CooldownStatus }> {
  const cooldownStatus = await checkCooldown(userId, cooldownType, entityId)

  if (cooldownStatus.isOnCooldown) {
    return {
      allowed: false,
      error: `Intelligence is on cooldown. Available again in ${cooldownStatus.remainingFormatted}.`,
      status: cooldownStatus,
    }
  }

  return { allowed: true }
}

// =====================================================
// ADMIN FUNCTIONS
// =====================================================

/**
 * Get tier settings for admin panel
 */
export async function getTierSettings(): Promise<{
  adventurer: { campaign: number; character: number }
  hero: { campaign: number; character: number }
  legend: { campaign: number; character: number }
}> {
  try {
    const supabase = await createClient()

    const { data: settings } = await supabase
      .from('ai_tier_settings')
      .select('*')

    const result = {
      adventurer: { campaign: 24, character: 24 },
      hero: { campaign: 12, character: 12 },
      legend: { campaign: 12, character: 12 },
    }

    if (settings) {
      for (const setting of settings) {
        const tier = setting.tier as UserTier
        if (result[tier]) {
          result[tier] = {
            campaign: setting.campaign_intelligence_cooldown_hours,
            character: setting.character_intelligence_cooldown_hours,
          }
        }
      }
    }

    return result
  } catch (error) {
    console.error('Error getting tier settings:', error)
    return {
      adventurer: { campaign: 24, character: 24 },
      hero: { campaign: 12, character: 12 },
      legend: { campaign: 12, character: 12 },
    }
  }
}

/**
 * Update tier settings (admin only)
 */
export async function updateTierSettings(
  tier: UserTier,
  campaignCooldownHours: number,
  characterCooldownHours: number,
  updatedBy: string
): Promise<boolean> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('ai_tier_settings')
      .upsert(
        {
          tier,
          campaign_intelligence_cooldown_hours: campaignCooldownHours,
          character_intelligence_cooldown_hours: characterCooldownHours,
          updated_at: new Date().toISOString(),
          updated_by: updatedBy,
        },
        {
          onConflict: 'tier',
        }
      )

    if (error) {
      console.error('Failed to update tier settings:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error updating tier settings:', error)
    return false
  }
}

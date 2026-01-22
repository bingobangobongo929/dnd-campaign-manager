'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSupabase, useUser } from '@/hooks'
import {
  type Tier,
  type TierLimits,
  type UserUsage,
  type AppSettings,
  type LimitType,
  type LimitCheckResult,
  getEffectiveLimits,
  isUnlimited,
  canCreate,
  canUpload,
} from '@/lib/membership'

interface MembershipState {
  tier: Tier
  isFounder: boolean
  founderGrantedAt: string | null
  aiAccess: boolean
  limits: TierLimits
  usage: UserUsage
  appSettings: AppSettings
  loading: boolean
  error: string | null
}

const defaultUsage: UserUsage = {
  campaigns: 0,
  oneshots: 0,
  vaultCharacters: 0,
  shareLinks: 0,
  publicTemplates: 0,
  storageMB: 0,
}

const defaultAppSettings: AppSettings = {
  billingEnabled: false,
  founderSignupsEnabled: true,
  founderSignupsClosedAt: null,
  maintenanceMode: false,
}

const defaultLimits: TierLimits = {
  campaigns: 3,
  oneshots: 3,
  vaultCharacters: 10,
  storageMB: 100,
  shareLinks: 3,
  publicTemplates: 1,
  pdfExport: false,
  customThemes: false,
}

export function useMembership() {
  const supabase = useSupabase()
  const { user } = useUser()

  const [state, setState] = useState<MembershipState>({
    tier: 'adventurer',
    isFounder: false,
    founderGrantedAt: null,
    aiAccess: false,
    limits: defaultLimits,
    usage: defaultUsage,
    appSettings: defaultAppSettings,
    loading: true,
    error: null,
  })

  // Load membership data
  const loadMembership = useCallback(async () => {
    if (!user) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }

    try {
      // Fetch user settings
      const { data: settings, error: settingsError } = await supabase
        .from('user_settings')
        .select('tier, is_founder, founder_granted_at, ai_access')
        .eq('user_id', user.id)
        .single()

      if (settingsError && settingsError.code !== 'PGRST116') {
        throw settingsError
      }

      const tier = (settings?.tier as Tier) || 'adventurer'
      const isFounder = settings?.is_founder || false
      const limits = getEffectiveLimits(tier, isFounder)

      // Fetch app settings
      const { data: appSettingsData } = await supabase
        .from('app_settings')
        .select('*')
        .eq('id', 'global')
        .single()

      const appSettings: AppSettings = appSettingsData ? {
        billingEnabled: appSettingsData.billing_enabled || false,
        founderSignupsEnabled: appSettingsData.founder_signups_enabled ?? true,
        founderSignupsClosedAt: appSettingsData.founder_signups_closed_at,
        maintenanceMode: appSettingsData.maintenance_mode || false,
      } : defaultAppSettings

      // Fetch usage stats
      const usage = await fetchUsage(user.id)

      setState({
        tier,
        isFounder,
        founderGrantedAt: settings?.founder_granted_at || null,
        aiAccess: settings?.ai_access || false,
        limits,
        usage,
        appSettings,
        loading: false,
        error: null,
      })
    } catch (error) {
      console.error('Failed to load membership:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load membership data',
      }))
    }
  }, [user, supabase])

  // Fetch usage stats
  const fetchUsage = async (userId: string): Promise<UserUsage> => {
    try {
      // Count campaigns
      const { count: campaignCount } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      // Count oneshots
      const { count: oneshotCount } = await supabase
        .from('oneshots')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      // Count vault characters
      const { count: characterCount } = await supabase
        .from('vault_characters')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      // Count active share links
      const [campaignShares, characterShares, oneshotShares] = await Promise.all([
        supabase
          .from('campaign_shares')
          .select('id, campaigns!inner(user_id)', { count: 'exact', head: true })
          .eq('campaigns.user_id', userId)
          .eq('is_active', true),
        supabase
          .from('character_shares')
          .select('id, vault_characters!inner(user_id)', { count: 'exact', head: true })
          .eq('vault_characters.user_id', userId)
          .eq('is_active', true),
        supabase
          .from('oneshot_shares')
          .select('id, oneshots!inner(user_id)', { count: 'exact', head: true })
          .eq('oneshots.user_id', userId)
          .eq('is_active', true),
      ])

      const shareLinksCount =
        (campaignShares.count || 0) +
        (characterShares.count || 0) +
        (oneshotShares.count || 0)

      // Count public templates
      const { count: templateCount } = await supabase
        .from('template_snapshots')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_public', true)

      // Calculate storage - this would need to sum up file sizes from storage
      // For now, we'll use a separate API call or estimate
      const storageMB = await calculateStorageUsage(userId)

      return {
        campaigns: campaignCount || 0,
        oneshots: oneshotCount || 0,
        vaultCharacters: characterCount || 0,
        shareLinks: shareLinksCount,
        publicTemplates: templateCount || 0,
        storageMB,
      }
    } catch (error) {
      console.error('Failed to fetch usage:', error)
      return defaultUsage
    }
  }

  // Calculate storage usage from all buckets
  const calculateStorageUsage = async (userId: string): Promise<number> => {
    try {
      // This is a simplified calculation - in production you might want
      // to track this in the database or use a more efficient method
      let totalBytes = 0

      // List files in user's storage paths
      const buckets = ['campaign-images', 'character-images', 'oneshot-images', 'avatars']

      for (const bucket of buckets) {
        try {
          const { data: files } = await supabase.storage
            .from(bucket)
            .list(userId, { limit: 1000 })

          if (files) {
            for (const file of files) {
              if (file.metadata?.size) {
                totalBytes += file.metadata.size
              }
            }
          }
        } catch {
          // Bucket might not exist or user has no files in it
        }
      }

      // Convert to MB
      return Math.round(totalBytes / (1024 * 1024))
    } catch (error) {
      console.error('Failed to calculate storage:', error)
      return 0
    }
  }

  // Load on mount and when user changes
  useEffect(() => {
    loadMembership()
  }, [loadMembership])

  // Check if user can create a specific resource type
  const checkLimit = useCallback(
    (type: LimitType, additionalAmount: number = 1): LimitCheckResult => {
      const { limits, usage } = state

      let current: number
      let limit: number

      switch (type) {
        case 'campaigns':
          current = usage.campaigns
          limit = limits.campaigns
          break
        case 'oneshots':
          current = usage.oneshots
          limit = limits.oneshots
          break
        case 'vaultCharacters':
          current = usage.vaultCharacters
          limit = limits.vaultCharacters
          break
        case 'shareLinks':
          current = usage.shareLinks
          limit = limits.shareLinks
          break
        case 'publicTemplates':
          current = usage.publicTemplates
          limit = limits.publicTemplates
          break
        case 'storage':
          current = usage.storageMB
          limit = limits.storageMB
          break
        default:
          return { allowed: false, current: 0, limit: 0, limitType: type, isUnlimited: false }
      }

      const unlimited = isUnlimited(limit)
      const allowed = unlimited || current + additionalAmount <= limit

      return {
        allowed,
        current,
        limit,
        limitType: type,
        isUnlimited: unlimited,
      }
    },
    [state]
  )

  // Check if user can create a campaign
  const canCreateCampaign = useCallback((): LimitCheckResult => {
    return checkLimit('campaigns')
  }, [checkLimit])

  // Check if user can create a oneshot
  const canCreateOneshot = useCallback((): LimitCheckResult => {
    return checkLimit('oneshots')
  }, [checkLimit])

  // Check if user can create a vault character
  const canCreateCharacter = useCallback((): LimitCheckResult => {
    return checkLimit('vaultCharacters')
  }, [checkLimit])

  // Check if user can create a share link
  const canCreateShareLink = useCallback((): LimitCheckResult => {
    return checkLimit('shareLinks')
  }, [checkLimit])

  // Check if user can publish a template
  const canPublishTemplate = useCallback((): LimitCheckResult => {
    return checkLimit('publicTemplates')
  }, [checkLimit])

  // Check if user can upload a file of given size (in MB)
  const canUploadFile = useCallback(
    (fileSizeMB: number): LimitCheckResult => {
      const { limits, usage } = state
      const allowed = canUpload(usage.storageMB, limits.storageMB, fileSizeMB)

      return {
        allowed,
        current: usage.storageMB,
        limit: limits.storageMB,
        limitType: 'storage',
        isUnlimited: isUnlimited(limits.storageMB),
      }
    },
    [state]
  )

  // Check if user has access to a feature
  const hasFeature = useCallback(
    (feature: 'pdfExport' | 'customThemes' | 'aiAccess'): boolean => {
      if (feature === 'aiAccess') {
        return state.aiAccess
      }
      return state.limits[feature] || false
    },
    [state]
  )

  // Refresh usage data
  const refreshUsage = useCallback(async () => {
    if (!user) return
    const usage = await fetchUsage(user.id)
    setState(prev => ({ ...prev, usage }))
  }, [user])

  return {
    // State
    tier: state.tier,
    isFounder: state.isFounder,
    founderGrantedAt: state.founderGrantedAt,
    aiAccess: state.aiAccess,
    limits: state.limits,
    usage: state.usage,
    appSettings: state.appSettings,
    loading: state.loading,
    error: state.error,

    // Limit checks
    checkLimit,
    canCreateCampaign,
    canCreateOneshot,
    canCreateCharacter,
    canCreateShareLink,
    canPublishTemplate,
    canUploadFile,

    // Feature checks
    hasFeature,

    // Actions
    refreshUsage,
    reload: loadMembership,
  }
}

// Export a simpler hook just for checking if billing is enabled
export function useBillingEnabled() {
  const supabase = useSupabase()
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function check() {
      const { data } = await supabase
        .from('app_settings')
        .select('billing_enabled')
        .eq('id', 'global')
        .single()

      setEnabled(data?.billing_enabled || false)
      setLoading(false)
    }
    check()
  }, [supabase])

  return { billingEnabled: enabled, loading }
}

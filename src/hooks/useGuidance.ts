'use client'

import { useState, useEffect, useCallback } from 'react'

// Local storage key for tracking seen guidance
const GUIDANCE_STORAGE_KEY = 'multiloop_guidance_seen'

// All possible guidance tips in the system
export type GuidanceTipId =
  // Campaign
  | 'campaign_dashboard_intro'
  | 'campaign_intelligence_intro'
  | 'campaign_timeline_intro'
  | 'campaign_members_intro'
  | 'campaign_canvas_intro'
  | 'campaign_sessions_intro'
  // Vault
  | 'vault_intro'
  | 'vault_character_intelligence'
  | 'vault_play_journal'
  | 'vault_import_intro'
  // Oneshot
  | 'oneshot_intro'
  | 'oneshot_present_mode'
  | 'oneshot_npcs'
  | 'oneshot_encounters'
  // Templates
  | 'templates_intro'
  | 'template_publishing'
  // Sharing
  | 'sharing_intro'
  | 'share_link_options'
  // Sessions
  | 'session_workflow'
  | 'session_notes_intro'
  | 'player_notes_intro'
  // Maps
  | 'interactive_maps'
  | 'map_pins'
  // Secrets
  | 'secrets_visibility'
  | 'dm_notes_intro'
  // General
  | 'first_campaign'
  | 'first_character'
  | 'first_oneshot'
  // Navigation Tabs - Campaigns
  | 'campaigns_all_tab'
  | 'campaigns_active_tab'
  | 'campaigns_my_work_tab'
  | 'campaigns_collection_tab'
  | 'campaigns_discover_tab'
  // Navigation Tabs - Adventures
  | 'adventures_intro'
  | 'adventures_all_tab'
  | 'adventures_active_tab'
  | 'adventures_my_work_tab'
  | 'adventures_collection_tab'
  | 'adventures_discover_tab'
  // Navigation Tabs - One-Shots
  | 'oneshots_all_tab'
  | 'oneshots_active_tab'
  | 'oneshots_my_work_tab'
  | 'oneshots_collection_tab'
  | 'oneshots_discover_tab'
  // Navigation Tabs - Vault
  | 'vault_all_tab'
  | 'vault_my_characters_tab'
  | 'vault_in_play_tab'
  | 'vault_collection_tab'
  | 'vault_discover_tab'
  // Home Page
  | 'home_quick_actions'
  | 'home_recent_items'

interface SeenGuidance {
  [key: string]: {
    seenAt: string
    dismissed: boolean
  }
}

export function useGuidance() {
  const [seenGuidance, setSeenGuidance] = useState<SeenGuidance>({})
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from local storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(GUIDANCE_STORAGE_KEY)
      if (stored) {
        setSeenGuidance(JSON.parse(stored))
      }
    } catch (err) {
      console.error('Failed to load guidance state:', err)
    }
    setIsLoaded(true)
  }, [])

  // Save to local storage when changed
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(GUIDANCE_STORAGE_KEY, JSON.stringify(seenGuidance))
      } catch (err) {
        console.error('Failed to save guidance state:', err)
      }
    }
  }, [seenGuidance, isLoaded])

  // Check if a tip has been seen
  const hasSeen = useCallback((tipId: GuidanceTipId): boolean => {
    return !!seenGuidance[tipId]
  }, [seenGuidance])

  // Check if a tip has been dismissed
  const isDismissed = useCallback((tipId: GuidanceTipId): boolean => {
    return seenGuidance[tipId]?.dismissed ?? false
  }, [seenGuidance])

  // Mark a tip as seen (not dismissed, just viewed)
  const markSeen = useCallback((tipId: GuidanceTipId) => {
    setSeenGuidance(prev => ({
      ...prev,
      [tipId]: {
        seenAt: new Date().toISOString(),
        dismissed: false,
      }
    }))
  }, [])

  // Dismiss a tip permanently
  const dismiss = useCallback((tipId: GuidanceTipId) => {
    setSeenGuidance(prev => ({
      ...prev,
      [tipId]: {
        seenAt: prev[tipId]?.seenAt || new Date().toISOString(),
        dismissed: true,
      }
    }))
  }, [])

  // Check if should show a tip (not dismissed)
  const shouldShow = useCallback((tipId: GuidanceTipId): boolean => {
    if (!isLoaded) return false
    return !isDismissed(tipId)
  }, [isLoaded, isDismissed])

  // Check if first time seeing (never seen before)
  const isFirstTime = useCallback((tipId: GuidanceTipId): boolean => {
    if (!isLoaded) return false
    return !hasSeen(tipId)
  }, [isLoaded, hasSeen])

  // Reset all guidance (for debugging/testing)
  const resetAll = useCallback(() => {
    setSeenGuidance({})
    localStorage.removeItem(GUIDANCE_STORAGE_KEY)
  }, [])

  return {
    isLoaded,
    hasSeen,
    isDismissed,
    markSeen,
    dismiss,
    shouldShow,
    isFirstTime,
    resetAll,
  }
}

// Helper hook for a single tip
export function useGuidanceTip(tipId: GuidanceTipId) {
  const { shouldShow, isFirstTime, markSeen, dismiss, isLoaded } = useGuidance()

  return {
    isLoaded,
    shouldShow: shouldShow(tipId),
    isFirstTime: isFirstTime(tipId),
    markSeen: () => markSeen(tipId),
    dismiss: () => dismiss(tipId),
  }
}

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CompletedSection, PrepModule, SessionSettings } from '@/types/database'

// Default order for completed phase sections
const DEFAULT_COMPLETED_SECTIONS: CompletedSection[] = [
  'dm_notes',
  'session_content',
  'player_notes',
  'thoughts_for_next',
]

// Default order for prep modules
const DEFAULT_PREP_MODULES: PrepModule[] = [
  'checklist',
  'references',
  'session_goals',
  'key_npcs',
  'session_opener',
  'random_tables',
  'music_ambiance',
]

// Sections that cannot be hidden or reordered (locked)
export const LOCKED_SECTIONS = ['session_notes', 'share_toggle', 'attendance']

// Sections that can be customized
export const CUSTOMIZABLE_COMPLETED_SECTIONS: { id: CompletedSection; label: string; icon: string }[] = [
  { id: 'dm_notes', label: 'DM Notes', icon: 'EyeOff' },
  { id: 'session_content', label: 'Session Content', icon: 'ScrollText' },
  { id: 'player_notes', label: 'Player Notes', icon: 'MessageSquare' },
  { id: 'thoughts_for_next', label: 'Thoughts for Next', icon: 'Lightbulb' },
]

export const CUSTOMIZABLE_PREP_MODULES: { id: PrepModule; label: string; color: string }[] = [
  { id: 'checklist', label: 'Checklist', color: 'yellow' },
  { id: 'references', label: 'Quick References', color: 'cyan' },
  { id: 'session_goals', label: 'Session Goals', color: 'purple' },
  { id: 'key_npcs', label: 'Key NPCs', color: 'green' },
  { id: 'session_opener', label: 'Session Opener', color: 'orange' },
  { id: 'random_tables', label: 'Random Tables', color: 'pink' },
  { id: 'music_ambiance', label: 'Music & Ambiance', color: 'teal' },
]

interface SessionLayoutPreferencesData {
  completedSectionOrder: CompletedSection[]
  prepModuleOrder: PrepModule[]
  collapsedSections: Record<string, boolean>
  hiddenSections: string[]
}

interface UseSessionLayoutPreferencesReturn {
  // Data
  completedSectionOrder: CompletedSection[]
  prepModuleOrder: PrepModule[]
  collapsedSections: Record<string, boolean>
  hiddenSections: string[]
  loaded: boolean

  // Actions
  setCompletedSectionOrder: (order: CompletedSection[]) => void
  setPrepModuleOrder: (order: PrepModule[]) => void
  toggleSectionCollapsed: (sectionId: string) => void
  toggleSectionHidden: (sectionId: string) => void
  resetToDefaults: () => void

  // Helpers
  isSectionCollapsed: (sectionId: string) => boolean
  isSectionHidden: (sectionId: string) => boolean
  isSectionLocked: (sectionId: string) => boolean

  // Campaign-level disabled sections (from campaign settings)
  isModuleDisabledByCampaign: (moduleId: PrepModule) => boolean
  isSectionDisabledByCampaign: (sectionId: CompletedSection) => boolean
}

export function useSessionLayoutPreferences(
  campaignId: string,
  userId: string | undefined,
  campaignSettings?: SessionSettings | null
): UseSessionLayoutPreferencesReturn {
  const supabase = createClient()
  const [preferences, setPreferences] = useState<SessionLayoutPreferencesData>({
    completedSectionOrder: DEFAULT_COMPLETED_SECTIONS,
    prepModuleOrder: DEFAULT_PREP_MODULES,
    collapsedSections: {},
    hiddenSections: [],
  })
  const [loaded, setLoaded] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const recordIdRef = useRef<string | null>(null)

  // Load preferences from database
  useEffect(() => {
    if (!userId || !campaignId) return

    const loadPreferences = async () => {
      const { data, error } = await supabase
        .from('user_campaign_preferences')
        .select('id, completed_section_order, prep_module_order, collapsed_sections, preferences')
        .eq('user_id', userId)
        .eq('campaign_id', campaignId)
        .single()

      if (data && !error) {
        recordIdRef.current = data.id
        setPreferences({
          completedSectionOrder: (data.completed_section_order as CompletedSection[]) || DEFAULT_COMPLETED_SECTIONS,
          prepModuleOrder: (data.prep_module_order as PrepModule[]) || DEFAULT_PREP_MODULES,
          collapsedSections: (data.collapsed_sections as Record<string, boolean>) || {},
          hiddenSections: (data.preferences as { hiddenSections?: string[] })?.hiddenSections || [],
        })
      }
      setLoaded(true)
    }

    loadPreferences()
  }, [campaignId, userId, supabase])

  // Save to database with debounce
  const saveToDatabase = useCallback(async (newPrefs: SessionLayoutPreferencesData) => {
    if (!userId || !campaignId) return

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(async () => {
      const payload = {
        completed_section_order: newPrefs.completedSectionOrder,
        prep_module_order: newPrefs.prepModuleOrder,
        collapsed_sections: newPrefs.collapsedSections,
        preferences: { hiddenSections: newPrefs.hiddenSections },
        updated_at: new Date().toISOString(),
      }

      if (recordIdRef.current) {
        await supabase
          .from('user_campaign_preferences')
          .update(payload)
          .eq('id', recordIdRef.current)
      } else {
        const { data } = await supabase
          .from('user_campaign_preferences')
          .insert({
            user_id: userId,
            campaign_id: campaignId,
            ...payload,
          })
          .select('id')
          .single()

        if (data) {
          recordIdRef.current = data.id
        }
      }
    }, 500)
  }, [campaignId, userId, supabase])

  // Update functions
  const setCompletedSectionOrder = useCallback((order: CompletedSection[]) => {
    const newPrefs = { ...preferences, completedSectionOrder: order }
    setPreferences(newPrefs)
    saveToDatabase(newPrefs)
  }, [preferences, saveToDatabase])

  const setPrepModuleOrder = useCallback((order: PrepModule[]) => {
    const newPrefs = { ...preferences, prepModuleOrder: order }
    setPreferences(newPrefs)
    saveToDatabase(newPrefs)
  }, [preferences, saveToDatabase])

  const toggleSectionCollapsed = useCallback((sectionId: string) => {
    const newCollapsed = {
      ...preferences.collapsedSections,
      [sectionId]: !preferences.collapsedSections[sectionId],
    }
    const newPrefs = { ...preferences, collapsedSections: newCollapsed }
    setPreferences(newPrefs)
    saveToDatabase(newPrefs)
  }, [preferences, saveToDatabase])

  const toggleSectionHidden = useCallback((sectionId: string) => {
    // Don't allow hiding locked sections
    if (LOCKED_SECTIONS.includes(sectionId)) return

    const isHidden = preferences.hiddenSections.includes(sectionId)
    const newHidden = isHidden
      ? preferences.hiddenSections.filter(id => id !== sectionId)
      : [...preferences.hiddenSections, sectionId]

    const newPrefs = { ...preferences, hiddenSections: newHidden }
    setPreferences(newPrefs)
    saveToDatabase(newPrefs)
  }, [preferences, saveToDatabase])

  const resetToDefaults = useCallback(() => {
    const defaultPrefs: SessionLayoutPreferencesData = {
      completedSectionOrder: DEFAULT_COMPLETED_SECTIONS,
      prepModuleOrder: DEFAULT_PREP_MODULES,
      collapsedSections: {},
      hiddenSections: [],
    }
    setPreferences(defaultPrefs)
    saveToDatabase(defaultPrefs)
  }, [saveToDatabase])

  // Helper functions
  const isSectionCollapsed = useCallback((sectionId: string): boolean => {
    return preferences.collapsedSections[sectionId] ?? false
  }, [preferences.collapsedSections])

  const isSectionHidden = useCallback((sectionId: string): boolean => {
    return preferences.hiddenSections.includes(sectionId)
  }, [preferences.hiddenSections])

  const isSectionLocked = useCallback((sectionId: string): boolean => {
    return LOCKED_SECTIONS.includes(sectionId)
  }, [])

  // Campaign-level disabled sections (from campaign settings)
  const isModuleDisabledByCampaign = useCallback((moduleId: PrepModule): boolean => {
    if (!campaignSettings) return false
    if (campaignSettings.all_optional_sections_hidden) return true
    return campaignSettings.disabled_prep_modules?.includes(moduleId) ?? false
  }, [campaignSettings])

  const isSectionDisabledByCampaign = useCallback((sectionId: CompletedSection): boolean => {
    if (!campaignSettings) return false
    if (campaignSettings.all_optional_sections_hidden) return true
    return campaignSettings.disabled_completed_sections?.includes(sectionId) ?? false
  }, [campaignSettings])

  return {
    completedSectionOrder: preferences.completedSectionOrder,
    prepModuleOrder: preferences.prepModuleOrder,
    collapsedSections: preferences.collapsedSections,
    hiddenSections: preferences.hiddenSections,
    loaded,
    setCompletedSectionOrder,
    setPrepModuleOrder,
    toggleSectionCollapsed,
    toggleSectionHidden,
    resetToDefaults,
    isSectionCollapsed,
    isSectionHidden,
    isSectionLocked,
    isModuleDisabledByCampaign,
    isSectionDisabledByCampaign,
  }
}

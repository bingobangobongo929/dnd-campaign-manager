'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

// Widget size type
export type WidgetSize = 'third' | 'half' | 'full'

// Widget definitions for DM and Player dashboards
export const DM_WIDGETS = [
  { id: 'campaignHeader', label: 'Campaign Header', required: true },
  { id: 'quickActions', label: 'Quick Actions', required: true },
  { id: 'nextSession', label: 'Next Session', required: false },
  { id: 'latestSession', label: 'Latest Session', required: false },
  { id: 'campaignStats', label: 'Campaign Stats', required: false },
  { id: 'partyOverview', label: 'Party Overview', required: false },
  { id: 'recentEvents', label: 'Recent Events', required: false },
  { id: 'upcomingPlot', label: 'Upcoming Plot', required: false },
  { id: 'recentSessions', label: 'Recent Sessions', required: false },
  { id: 'intelligenceStatus', label: 'AI Intelligence', required: false },
  { id: 'playerNotesReview', label: 'Player Notes', required: false },
  { id: 'dmToolbox', label: 'DM Toolbox', required: false },
] as const

export const PLAYER_WIDGETS = [
  { id: 'myCharacter', label: 'My Character', required: true },
  { id: 'nextSession', label: 'Next Session', required: false },
  { id: 'previouslyOn', label: 'Previously On...', required: false },
  { id: 'partyOverview', label: 'Party & Attendance', required: false },
  { id: 'quickActions', label: 'Quick Actions', required: false },
  { id: 'recentSessions', label: 'Recent Sessions', required: false },
] as const

export type DmWidgetId = typeof DM_WIDGETS[number]['id']
export type PlayerWidgetId = typeof PLAYER_WIDGETS[number]['id']

// Allowed sizes per widget - based on content analysis
export const WIDGET_SIZE_OPTIONS: Record<string, WidgetSize[]> = {
  // Flexible at all sizes (text/list-based)
  quickActions: ['third', 'half', 'full'],
  campaignStats: ['third', 'half', 'full'],
  recentEvents: ['third', 'half', 'full'],
  upcomingPlot: ['third', 'half', 'full'],
  latestSession: ['third', 'half', 'full'],
  intelligenceStatus: ['third', 'half', 'full'],
  playerNotesReview: ['third', 'half', 'full'],
  previouslyOn: ['third', 'half', 'full'],

  // Need minimum half-width (grids/buttons/images)
  partyOverview: ['half', 'full'],
  recentSessions: ['half', 'full'],
  dmToolbox: ['half', 'full'],
  myCharacter: ['half', 'full'],
  nextSession: ['half', 'full'],

  // Always full (hero/header widgets)
  campaignHeader: ['full'],
}

// Default sizes for widgets
export const DEFAULT_WIDGET_SIZES: Record<string, WidgetSize> = {
  // Full width
  campaignHeader: 'full',
  nextSession: 'full',
  partyOverview: 'full',
  recentSessions: 'full',
  myCharacter: 'full',
  previouslyOn: 'full',
  // Half width
  intelligenceStatus: 'half',
  playerNotesReview: 'half',
  dmToolbox: 'half',
  // Third width
  quickActions: 'third',
  latestSession: 'third',
  campaignStats: 'third',
  recentEvents: 'third',
  upcomingPlot: 'third',
}

// Widget preference with size
interface WidgetPreference {
  id: string
  size: WidgetSize
  visible: boolean
}

interface DashboardPreferences {
  dmWidgets: WidgetPreference[]
  playerWidgets: WidgetPreference[]
}

const DEFAULT_DM_WIDGETS: WidgetPreference[] = [
  { id: 'campaignHeader', size: 'full', visible: true },
  { id: 'quickActions', size: 'third', visible: true },
  { id: 'nextSession', size: 'full', visible: true },
  { id: 'latestSession', size: 'third', visible: true },
  { id: 'campaignStats', size: 'third', visible: true },
  { id: 'partyOverview', size: 'full', visible: true },
  { id: 'recentEvents', size: 'third', visible: true },
  { id: 'upcomingPlot', size: 'third', visible: true },
  { id: 'recentSessions', size: 'full', visible: true },
  { id: 'intelligenceStatus', size: 'half', visible: true },
  { id: 'playerNotesReview', size: 'half', visible: true },
  { id: 'dmToolbox', size: 'half', visible: true },
]

const DEFAULT_PLAYER_WIDGETS: WidgetPreference[] = [
  { id: 'myCharacter', size: 'full', visible: true },
  { id: 'nextSession', size: 'full', visible: true },
  { id: 'previouslyOn', size: 'full', visible: true },
  { id: 'partyOverview', size: 'full', visible: true },
  { id: 'quickActions', size: 'third', visible: true },
  { id: 'recentSessions', size: 'half', visible: true },
]

function getStorageKey(campaignId: string, userId: string) {
  return `dashboard-prefs-v2-${campaignId}-${userId}`
}

export function useDashboardPreferences(campaignId: string, userId: string | undefined) {
  const supabase = createClient()
  const [preferences, setPreferences] = useState<DashboardPreferences>({
    dmWidgets: DEFAULT_DM_WIDGETS,
    playerWidgets: DEFAULT_PLAYER_WIDGETS,
  })
  const [loaded, setLoaded] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const layoutIdRef = useRef<string | null>(null)

  // Load preferences from database (with localStorage fallback)
  useEffect(() => {
    if (!userId || !campaignId) return

    const loadPreferences = async () => {
      // Try to load from database first
      const { data, error } = await supabase
        .from('dashboard_layouts')
        .select('id, layout')
        .eq('user_id', userId)
        .eq('campaign_id', campaignId)
        .single()

      if (data && !error && data.layout) {
        layoutIdRef.current = data.id
        const dbPrefs = data.layout as DashboardPreferences
        // Validate and merge with defaults to handle new widgets
        const mergedPrefs = mergeWithDefaults(dbPrefs)
        setPreferences(mergedPrefs)
        setLoaded(true)
        return
      }

      // Fallback to localStorage (for migration)
      const key = getStorageKey(campaignId, userId)
      const stored = localStorage.getItem(key)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          // Handle old format (just arrays of IDs)
          if (Array.isArray(parsed.dmWidgets) && typeof parsed.dmWidgets[0] === 'string') {
            const migrated = migrateOldFormat(parsed)
            setPreferences(migrated)
            // Save migrated format to DB
            saveToDatabase(migrated)
          } else {
            setPreferences(mergeWithDefaults(parsed))
          }
        } catch {
          // Invalid stored data, use defaults
        }
      }
      setLoaded(true)
    }

    loadPreferences()
  }, [campaignId, userId])

  // Merge preferences with defaults to handle new widgets
  const mergeWithDefaults = (prefs: DashboardPreferences): DashboardPreferences => {
    const dmWidgetIds = prefs.dmWidgets.map(w => w.id)
    const playerWidgetIds = prefs.playerWidgets.map(w => w.id)

    // Add any missing widgets from defaults
    const mergedDm = [...prefs.dmWidgets]
    DEFAULT_DM_WIDGETS.forEach(defaultWidget => {
      if (!dmWidgetIds.includes(defaultWidget.id)) {
        mergedDm.push(defaultWidget)
      }
    })

    const mergedPlayer = [...prefs.playerWidgets]
    DEFAULT_PLAYER_WIDGETS.forEach(defaultWidget => {
      if (!playerWidgetIds.includes(defaultWidget.id)) {
        mergedPlayer.push(defaultWidget)
      }
    })

    return { dmWidgets: mergedDm, playerWidgets: mergedPlayer }
  }

  // Migrate old format (arrays of strings) to new format (arrays of objects)
  const migrateOldFormat = (oldPrefs: { dmWidgets: string[], playerWidgets: string[] }): DashboardPreferences => {
    return {
      dmWidgets: oldPrefs.dmWidgets.map(id => ({
        id,
        size: DEFAULT_WIDGET_SIZES[id] || 'full',
        visible: true,
      })),
      playerWidgets: oldPrefs.playerWidgets.map(id => ({
        id,
        size: DEFAULT_WIDGET_SIZES[id] || 'full',
        visible: true,
      })),
    }
  }

  // Save to database with debounce
  const saveToDatabase = useCallback(async (prefs: DashboardPreferences) => {
    if (!userId || !campaignId) return

    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Debounce saves by 500ms
    saveTimeoutRef.current = setTimeout(async () => {
      if (layoutIdRef.current) {
        // Update existing record
        await supabase
          .from('dashboard_layouts')
          .update({ layout: prefs, updated_at: new Date().toISOString() })
          .eq('id', layoutIdRef.current)
      } else {
        // Insert new record
        const { data } = await supabase
          .from('dashboard_layouts')
          .insert({
            user_id: userId,
            campaign_id: campaignId,
            layout: prefs,
          })
          .select('id')
          .single()

        if (data) {
          layoutIdRef.current = data.id
        }
      }

      // Also save to localStorage as backup
      const key = getStorageKey(campaignId, userId)
      localStorage.setItem(key, JSON.stringify(prefs))
    }, 500)
  }, [campaignId, userId, supabase])

  // Save preferences
  const savePreferences = useCallback((newPrefs: DashboardPreferences) => {
    setPreferences(newPrefs)
    saveToDatabase(newPrefs)
  }, [saveToDatabase])

  // Toggle a DM widget visibility
  const toggleDmWidget = useCallback((widgetId: string) => {
    const widget = DM_WIDGETS.find(w => w.id === widgetId)
    if (widget?.required) return // Can't toggle required widgets

    const newWidgets = preferences.dmWidgets.map(w =>
      w.id === widgetId ? { ...w, visible: !w.visible } : w
    )

    // If widget doesn't exist yet (was hidden from defaults), add it
    if (!newWidgets.find(w => w.id === widgetId)) {
      newWidgets.push({
        id: widgetId,
        size: DEFAULT_WIDGET_SIZES[widgetId] || 'full',
        visible: true,
      })
    }

    savePreferences({ ...preferences, dmWidgets: newWidgets })
  }, [preferences, savePreferences])

  // Toggle a Player widget visibility
  const togglePlayerWidget = useCallback((widgetId: string) => {
    const widget = PLAYER_WIDGETS.find(w => w.id === widgetId)
    if (widget?.required) return // Can't toggle required widgets

    const newWidgets = preferences.playerWidgets.map(w =>
      w.id === widgetId ? { ...w, visible: !w.visible } : w
    )

    // If widget doesn't exist yet, add it
    if (!newWidgets.find(w => w.id === widgetId)) {
      newWidgets.push({
        id: widgetId,
        size: DEFAULT_WIDGET_SIZES[widgetId] || 'full',
        visible: true,
      })
    }

    savePreferences({ ...preferences, playerWidgets: newWidgets })
  }, [preferences, savePreferences])

  // Set widget size
  const setDmWidgetSize = useCallback((widgetId: string, size: WidgetSize) => {
    // Validate size is allowed for this widget
    const allowedSizes = WIDGET_SIZE_OPTIONS[widgetId]
    if (!allowedSizes?.includes(size)) return

    const newWidgets = preferences.dmWidgets.map(w =>
      w.id === widgetId ? { ...w, size } : w
    )
    savePreferences({ ...preferences, dmWidgets: newWidgets })
  }, [preferences, savePreferences])

  const setPlayerWidgetSize = useCallback((widgetId: string, size: WidgetSize) => {
    const allowedSizes = WIDGET_SIZE_OPTIONS[widgetId]
    if (!allowedSizes?.includes(size)) return

    const newWidgets = preferences.playerWidgets.map(w =>
      w.id === widgetId ? { ...w, size } : w
    )
    savePreferences({ ...preferences, playerWidgets: newWidgets })
  }, [preferences, savePreferences])

  // Reorder DM widgets
  const reorderDmWidgets = useCallback((newOrder: DmWidgetId[]) => {
    // Reorder based on the new ID order, preserving size and visibility
    const reordered = newOrder.map(id => {
      const existing = preferences.dmWidgets.find(w => w.id === id)
      return existing || { id, size: DEFAULT_WIDGET_SIZES[id] || 'full', visible: true }
    })
    savePreferences({ ...preferences, dmWidgets: reordered })
  }, [preferences, savePreferences])

  // Reorder Player widgets
  const reorderPlayerWidgets = useCallback((newOrder: PlayerWidgetId[]) => {
    const reordered = newOrder.map(id => {
      const existing = preferences.playerWidgets.find(w => w.id === id)
      return existing || { id, size: DEFAULT_WIDGET_SIZES[id] || 'full', visible: true }
    })
    savePreferences({ ...preferences, playerWidgets: reordered })
  }, [preferences, savePreferences])

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    savePreferences({
      dmWidgets: DEFAULT_DM_WIDGETS,
      playerWidgets: DEFAULT_PLAYER_WIDGETS,
    })
  }, [savePreferences])

  // Check if a widget is visible
  const isDmWidgetVisible = useCallback((widgetId: DmWidgetId) => {
    const widget = preferences.dmWidgets.find(w => w.id === widgetId)
    return widget?.visible ?? false
  }, [preferences.dmWidgets])

  const isPlayerWidgetVisible = useCallback((widgetId: PlayerWidgetId) => {
    const widget = preferences.playerWidgets.find(w => w.id === widgetId)
    return widget?.visible ?? false
  }, [preferences.playerWidgets])

  // Get widget size
  const getDmWidgetSize = useCallback((widgetId: DmWidgetId): WidgetSize => {
    const widget = preferences.dmWidgets.find(w => w.id === widgetId)
    return widget?.size ?? DEFAULT_WIDGET_SIZES[widgetId] ?? 'full'
  }, [preferences.dmWidgets])

  const getPlayerWidgetSize = useCallback((widgetId: PlayerWidgetId): WidgetSize => {
    const widget = preferences.playerWidgets.find(w => w.id === widgetId)
    return widget?.size ?? DEFAULT_WIDGET_SIZES[widgetId] ?? 'full'
  }, [preferences.playerWidgets])

  // Get visible widget IDs in order (for backwards compatibility)
  const getVisibleDmWidgetIds = useCallback((): DmWidgetId[] => {
    return preferences.dmWidgets
      .filter(w => w.visible)
      .map(w => w.id as DmWidgetId)
  }, [preferences.dmWidgets])

  const getVisiblePlayerWidgetIds = useCallback((): PlayerWidgetId[] => {
    return preferences.playerWidgets
      .filter(w => w.visible)
      .map(w => w.id as PlayerWidgetId)
  }, [preferences.playerWidgets])

  // Get hidden widgets
  const getHiddenDmWidgets = useCallback(() => {
    return DM_WIDGETS.filter(w => {
      const pref = preferences.dmWidgets.find(p => p.id === w.id)
      return !pref?.visible
    })
  }, [preferences.dmWidgets])

  const getHiddenPlayerWidgets = useCallback(() => {
    return PLAYER_WIDGETS.filter(w => {
      const pref = preferences.playerWidgets.find(p => p.id === w.id)
      return !pref?.visible
    })
  }, [preferences.playerWidgets])

  return {
    preferences,
    loaded,
    toggleDmWidget,
    togglePlayerWidget,
    setDmWidgetSize,
    setPlayerWidgetSize,
    reorderDmWidgets,
    reorderPlayerWidgets,
    resetToDefaults,
    isDmWidgetVisible,
    isPlayerWidgetVisible,
    getDmWidgetSize,
    getPlayerWidgetSize,
    getVisibleDmWidgetIds,
    getVisiblePlayerWidgetIds,
    getHiddenDmWidgets,
    getHiddenPlayerWidgets,
  }
}

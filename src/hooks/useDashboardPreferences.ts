'use client'

import { useState, useEffect, useCallback } from 'react'

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

interface DashboardPreferences {
  dmWidgets: DmWidgetId[]
  playerWidgets: PlayerWidgetId[]
}

const DEFAULT_DM_WIDGETS: DmWidgetId[] = [
  'campaignHeader',
  'quickActions',
  'nextSession',
  'latestSession',
  'campaignStats',
  'partyOverview',
  'recentEvents',
  'upcomingPlot',
  'recentSessions',
  'intelligenceStatus',
  'playerNotesReview',
  'dmToolbox',
]

const DEFAULT_PLAYER_WIDGETS: PlayerWidgetId[] = [
  'myCharacter',
  'nextSession',
  'previouslyOn',
  'partyOverview',
  'quickActions',
  'recentSessions',
]

function getStorageKey(campaignId: string, userId: string) {
  return `dashboard-prefs-${campaignId}-${userId}`
}

export function useDashboardPreferences(campaignId: string, userId: string | undefined) {
  const [preferences, setPreferences] = useState<DashboardPreferences>({
    dmWidgets: DEFAULT_DM_WIDGETS,
    playerWidgets: DEFAULT_PLAYER_WIDGETS,
  })
  const [loaded, setLoaded] = useState(false)

  // Load preferences from localStorage
  useEffect(() => {
    if (!userId) return

    const key = getStorageKey(campaignId, userId)
    const stored = localStorage.getItem(key)

    if (stored) {
      try {
        const parsed = JSON.parse(stored) as DashboardPreferences
        setPreferences(parsed)
      } catch {
        // Invalid stored data, use defaults
      }
    }
    setLoaded(true)
  }, [campaignId, userId])

  // Save preferences to localStorage
  const savePreferences = useCallback((newPrefs: DashboardPreferences) => {
    if (!userId) return

    const key = getStorageKey(campaignId, userId)
    localStorage.setItem(key, JSON.stringify(newPrefs))
    setPreferences(newPrefs)
  }, [campaignId, userId])

  // Toggle a DM widget
  const toggleDmWidget = useCallback((widgetId: string) => {
    const widget = DM_WIDGETS.find(w => w.id === widgetId)
    if (widget?.required) return // Can't toggle required widgets

    const typedWidgetId = widgetId as DmWidgetId
    const newWidgets = preferences.dmWidgets.includes(typedWidgetId)
      ? preferences.dmWidgets.filter(id => id !== typedWidgetId)
      : [...preferences.dmWidgets, typedWidgetId]

    savePreferences({ ...preferences, dmWidgets: newWidgets })
  }, [preferences, savePreferences])

  // Toggle a Player widget
  const togglePlayerWidget = useCallback((widgetId: string) => {
    const widget = PLAYER_WIDGETS.find(w => w.id === widgetId)
    if (widget?.required) return // Can't toggle required widgets

    const typedWidgetId = widgetId as PlayerWidgetId
    const newWidgets = preferences.playerWidgets.includes(typedWidgetId)
      ? preferences.playerWidgets.filter(id => id !== typedWidgetId)
      : [...preferences.playerWidgets, typedWidgetId]

    savePreferences({ ...preferences, playerWidgets: newWidgets })
  }, [preferences, savePreferences])

  // Reorder DM widgets
  const reorderDmWidgets = useCallback((newOrder: DmWidgetId[]) => {
    savePreferences({ ...preferences, dmWidgets: newOrder })
  }, [preferences, savePreferences])

  // Reorder Player widgets
  const reorderPlayerWidgets = useCallback((newOrder: PlayerWidgetId[]) => {
    savePreferences({ ...preferences, playerWidgets: newOrder })
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
    return preferences.dmWidgets.includes(widgetId)
  }, [preferences.dmWidgets])

  const isPlayerWidgetVisible = useCallback((widgetId: PlayerWidgetId) => {
    return preferences.playerWidgets.includes(widgetId)
  }, [preferences.playerWidgets])

  return {
    preferences,
    loaded,
    toggleDmWidget,
    togglePlayerWidget,
    reorderDmWidgets,
    reorderPlayerWidgets,
    resetToDefaults,
    isDmWidgetVisible,
    isPlayerWidgetVisible,
  }
}

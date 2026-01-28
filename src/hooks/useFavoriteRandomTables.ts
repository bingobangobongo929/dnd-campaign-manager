'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface FavoriteRandomTablesData {
  // IDs of user-created tables that are favorited
  tableFavorites: string[]
  // IDs of template tables that are favorited (e.g., 'human-male-names')
  templateFavorites: string[]
}

interface UseFavoriteRandomTablesReturn {
  tableFavorites: string[]
  templateFavorites: string[]
  loaded: boolean
  isTableFavorite: (tableId: string) => boolean
  isTemplateFavorite: (templateId: string) => boolean
  toggleTableFavorite: (tableId: string) => void
  toggleTemplateFavorite: (templateId: string) => void
}

export function useFavoriteRandomTables(
  campaignId: string,
  userId: string | undefined
): UseFavoriteRandomTablesReturn {
  const supabase = createClient()
  const [favorites, setFavorites] = useState<FavoriteRandomTablesData>({
    tableFavorites: [],
    templateFavorites: [],
  })
  const [loaded, setLoaded] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const recordIdRef = useRef<string | null>(null)

  // Load favorites from database
  useEffect(() => {
    if (!userId || !campaignId) return

    const loadFavorites = async () => {
      const { data, error } = await supabase
        .from('user_campaign_preferences')
        .select('id, preferences')
        .eq('user_id', userId)
        .eq('campaign_id', campaignId)
        .single()

      if (data && !error) {
        recordIdRef.current = data.id
        const prefs = data.preferences as Record<string, any> | null
        setFavorites({
          tableFavorites: prefs?.tableFavorites || [],
          templateFavorites: prefs?.templateFavorites || [],
        })
      }
      setLoaded(true)
    }

    loadFavorites()
  }, [campaignId, userId, supabase])

  // Save to database with debounce
  const saveToDatabase = useCallback(async (newFavorites: FavoriteRandomTablesData) => {
    if (!userId || !campaignId) return

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(async () => {
      // First get existing preferences to merge
      const { data: existing } = await supabase
        .from('user_campaign_preferences')
        .select('preferences')
        .eq('user_id', userId)
        .eq('campaign_id', campaignId)
        .single()

      const existingPrefs = (existing?.preferences as Record<string, any>) || {}
      const mergedPrefs = {
        ...existingPrefs,
        tableFavorites: newFavorites.tableFavorites,
        templateFavorites: newFavorites.templateFavorites,
      }

      const payload = {
        preferences: mergedPrefs,
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
    }, 300)
  }, [campaignId, userId, supabase])

  // Check if a table is favorited
  const isTableFavorite = useCallback((tableId: string): boolean => {
    return favorites.tableFavorites.includes(tableId)
  }, [favorites.tableFavorites])

  // Check if a template is favorited
  const isTemplateFavorite = useCallback((templateId: string): boolean => {
    return favorites.templateFavorites.includes(templateId)
  }, [favorites.templateFavorites])

  // Toggle table favorite
  const toggleTableFavorite = useCallback((tableId: string) => {
    const isFav = favorites.tableFavorites.includes(tableId)
    const newTableFavorites = isFav
      ? favorites.tableFavorites.filter(id => id !== tableId)
      : [...favorites.tableFavorites, tableId]

    const newFavorites = { ...favorites, tableFavorites: newTableFavorites }
    setFavorites(newFavorites)
    saveToDatabase(newFavorites)
  }, [favorites, saveToDatabase])

  // Toggle template favorite
  const toggleTemplateFavorite = useCallback((templateId: string) => {
    const isFav = favorites.templateFavorites.includes(templateId)
    const newTemplateFavorites = isFav
      ? favorites.templateFavorites.filter(id => id !== templateId)
      : [...favorites.templateFavorites, templateId]

    const newFavorites = { ...favorites, templateFavorites: newTemplateFavorites }
    setFavorites(newFavorites)
    saveToDatabase(newFavorites)
  }, [favorites, saveToDatabase])

  return {
    tableFavorites: favorites.tableFavorites,
    templateFavorites: favorites.templateFavorites,
    loaded,
    isTableFavorite,
    isTemplateFavorite,
    toggleTableFavorite,
    toggleTemplateFavorite,
  }
}

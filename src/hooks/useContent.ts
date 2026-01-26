'use client'

import { createContext, useContext, useCallback, useEffect, useState, useMemo } from 'react'
import { useSupabase, useUser } from './useSupabase'

// Content types
export type ContentType = 'campaign' | 'oneshot'

// Base content interface (shared fields between campaigns and oneshots)
export interface ContentBase {
  id: string
  user_id: string
  name: string
  description?: string | null
  image_url?: string | null
  game_system?: string | null
  content_mode: string
  created_at: string
  updated_at: string
}

// Campaign-specific fields
export interface CampaignContent extends ContentBase {
  contentType: 'campaign'
  duration_type?: string | null
  setting?: string | null
  status?: string | null
  next_session_date?: string | null
  next_session_location?: string | null
  collaboration_settings?: Record<string, unknown> | null
  last_intelligence_run?: string | null
}

// Oneshot-specific fields
export interface OneshotContent extends ContentBase {
  contentType: 'oneshot'
  tagline?: string | null
  level_min?: number | null
  level_max?: number | null
  player_count_min?: number | null
  player_count_max?: number | null
  estimated_duration?: string | null
  introduction?: string | null
  setting_notes?: string | null
  session_plan?: string | null
  twists?: string | null
  status?: string | null
}

// Union type for content
export type Content = CampaignContent | OneshotContent

// Content context value
export interface ContentContextValue {
  // Content identification
  contentId: string | null
  contentType: ContentType | null

  // The loaded content
  content: Content | null

  // For database queries - these are the actual IDs to use
  campaignId: string | null  // Set if contentType === 'campaign'
  oneshotId: string | null   // Set if contentType === 'oneshot'

  // Ownership
  isOwner: boolean

  // Loading state
  loading: boolean
  error: string | null

  // Actions
  reload: () => Promise<void>
}

// Default context value
const defaultContextValue: ContentContextValue = {
  contentId: null,
  contentType: null,
  content: null,
  campaignId: null,
  oneshotId: null,
  isOwner: false,
  loading: true,
  error: null,
  reload: async () => {},
}

// Create context
export const ContentContext = createContext<ContentContextValue>(defaultContextValue)

// Hook to use content context
export function useContent(): ContentContextValue {
  const context = useContext(ContentContext)
  if (!context) {
    throw new Error('useContent must be used within a ContentProvider')
  }
  return context
}

// Hook to fetch content by ID and type
export function useContentLoader(
  contentId: string | null,
  contentType: ContentType | null
): ContentContextValue {
  const supabase = useSupabase()
  const { user, loading: userLoading } = useUser()

  const [content, setContent] = useState<Content | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)

  const fetchContent = useCallback(async () => {
    if (!contentId || !contentType) {
      setContent(null)
      setIsOwner(false)
      setLoading(false)
      return
    }

    try {
      setError(null)

      if (contentType === 'campaign') {
        const { data, error: fetchError } = await supabase
          .from('campaigns')
          .select('*')
          .eq('id', contentId)
          .is('deleted_at', null)
          .single()

        if (fetchError) throw fetchError
        if (!data) throw new Error('Campaign not found')

        setContent({
          ...data,
          contentType: 'campaign',
        } as CampaignContent)
        setIsOwner(user?.id === data.user_id)

      } else if (contentType === 'oneshot') {
        const { data, error: fetchError } = await supabase
          .from('oneshots')
          .select('*')
          .eq('id', contentId)
          .is('deleted_at', null)
          .single()

        if (fetchError) throw fetchError
        if (!data) throw new Error('Oneshot not found')

        setContent({
          ...data,
          contentType: 'oneshot',
        } as OneshotContent)
        setIsOwner(user?.id === data.user_id)
      }
    } catch (err) {
      console.error('Failed to fetch content:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch content')
      setContent(null)
      setIsOwner(false)
    } finally {
      setLoading(false)
    }
  }, [contentId, contentType, supabase, user?.id])

  useEffect(() => {
    if (!userLoading) {
      fetchContent()
    }
  }, [userLoading, fetchContent])

  const reload = useCallback(async () => {
    setLoading(true)
    await fetchContent()
  }, [fetchContent])

  // Compute the campaign/oneshot IDs for queries
  const campaignId = contentType === 'campaign' ? contentId : null
  const oneshotId = contentType === 'oneshot' ? contentId : null

  return useMemo(() => ({
    contentId,
    contentType,
    content,
    campaignId,
    oneshotId,
    isOwner,
    loading: userLoading || loading,
    error,
    reload,
  }), [contentId, contentType, content, campaignId, oneshotId, isOwner, userLoading, loading, error, reload])
}

// Helper hook for building unified queries
export function useContentQuery() {
  const { campaignId, oneshotId, contentType } = useContent()
  const supabase = useSupabase()

  // Build a query filter for unified tables
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buildFilter = useCallback((query: any) => {
    if (contentType === 'campaign' && campaignId) {
      return query.eq('campaign_id', campaignId).is('oneshot_id', null)
    } else if (contentType === 'oneshot' && oneshotId) {
      return query.eq('oneshot_id', oneshotId).is('campaign_id', null)
    }
    return query
  }, [campaignId, oneshotId, contentType])

  // Get the correct ID field and value for inserts
  const getContentFields = useCallback(() => {
    if (contentType === 'campaign' && campaignId) {
      return { campaign_id: campaignId, oneshot_id: null }
    } else if (contentType === 'oneshot' && oneshotId) {
      return { campaign_id: null, oneshot_id: oneshotId }
    }
    return {}
  }, [campaignId, oneshotId, contentType])

  return {
    campaignId,
    oneshotId,
    contentType,
    buildFilter,
    getContentFields,
  }
}

// Type guard helpers
export function isCampaign(content: Content | null): content is CampaignContent {
  return content?.contentType === 'campaign'
}

export function isOneshot(content: Content | null): content is OneshotContent {
  return content?.contentType === 'oneshot'
}

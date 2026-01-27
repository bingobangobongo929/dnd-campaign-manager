'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSupabase, useUser } from '@/hooks'

interface IntelligenceBadgeResult {
  pendingCount: number
  loading: boolean
  refresh: () => Promise<void>
}

/**
 * Hook to fetch the count of pending Intelligence suggestions for a campaign.
 * Used to show badge indicators in navigation.
 */
export function useIntelligenceBadge(campaignId: string | null): IntelligenceBadgeResult {
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const supabase = useSupabase()
  const { user } = useUser()

  const fetchCount = useCallback(async () => {
    if (!campaignId || !user) {
      setPendingCount(0)
      setLoading(false)
      return
    }

    try {
      const { count, error } = await supabase
        .from('intelligence_suggestions')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaignId)
        .eq('status', 'pending')

      if (error) {
        console.error('Error fetching suggestion count:', error)
        setPendingCount(0)
      } else {
        setPendingCount(count || 0)
      }
    } catch (err) {
      console.error('Failed to fetch suggestion count:', err)
      setPendingCount(0)
    } finally {
      setLoading(false)
    }
  }, [campaignId, user, supabase])

  useEffect(() => {
    fetchCount()
  }, [fetchCount])

  return {
    pendingCount,
    loading,
    refresh: fetchCount,
  }
}

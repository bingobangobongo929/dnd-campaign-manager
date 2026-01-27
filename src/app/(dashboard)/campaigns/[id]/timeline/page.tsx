'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

/**
 * Timeline redirect page
 *
 * Timeline functionality is now integrated into the World page as a tab.
 * This page redirects users to the World page with the timeline tab active.
 */
export default function TimelinePage() {
  const params = useParams()
  const router = useRouter()
  const campaignId = params.id as string

  useEffect(() => {
    // Set the world tab to timeline before redirecting
    localStorage.setItem('world-active-tab', 'timeline')
    router.replace(`/campaigns/${campaignId}/lore`)
  }, [campaignId, router])

  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-10 h-10 border-2 border-[--arcane-purple] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

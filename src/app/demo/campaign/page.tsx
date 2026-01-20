'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

// Demo campaign ID from migration
const DEMO_CAMPAIGN_ID = '00000000-0000-0000-0001-000000000001'

export default function DemoCampaignPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the demo campaign canvas
    router.replace(`/campaigns/${DEMO_CAMPAIGN_ID}/canvas?demo=true`)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-4" />
        <p className="text-gray-400">Loading demo campaign...</p>
      </div>
    </div>
  )
}

'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Swords, ArrowRight, X } from 'lucide-react'
import { useAppStore } from '@/store'
import { useState } from 'react'

export function CampaignContextBanner() {
  const router = useRouter()
  const pathname = usePathname()
  const { currentCampaign } = useAppStore()
  const [dismissed, setDismissed] = useState(false)

  // Don't show if:
  // - No current campaign
  // - Already on a campaign page
  // - Banner dismissed
  if (!currentCampaign || dismissed) {
    return null
  }

  // Check if we're on a campaign page
  const isCampaignPage = pathname.startsWith('/campaigns/')

  // Only show on non-campaign pages
  if (isCampaignPage) {
    return null
  }

  const handleReturn = () => {
    router.push(`/campaigns/${currentCampaign.id}/canvas`)
  }

  return (
    <div className="fixed top-[var(--topbar-height)] left-0 right-0 z-80 px-4 py-0 pointer-events-none">
      <div className="max-w-4xl mx-auto">
        <div className="pointer-events-auto inline-flex items-center gap-3 px-4 py-2 bg-[--arcane-purple]/10 border border-[--arcane-purple]/20 rounded-b-xl text-sm">
          <Swords className="w-4 h-4 text-[--arcane-purple]" />
          <span className="text-[--text-secondary]">
            Working on: <span className="text-[--arcane-purple] font-medium">{currentCampaign.name}</span>
          </span>
          <button
            onClick={handleReturn}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[--arcane-purple]/20 text-[--arcane-purple] hover:bg-[--arcane-purple]/30 transition-colors text-xs font-medium"
          >
            Return
            <ArrowRight className="w-3 h-3" />
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded hover:bg-white/10 transition-colors text-gray-500 hover:text-gray-300"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

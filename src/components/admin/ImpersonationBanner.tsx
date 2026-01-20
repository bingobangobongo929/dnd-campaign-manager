'use client'

import { X, Eye, User, Crown, Sparkles } from 'lucide-react'
import { useAppStore, useIsImpersonating, useImpersonatedTier } from '@/store'
import type { UserTier } from '@/types/database'

const TIER_INFO: Record<UserTier, { label: string; icon: typeof User; color: string }> = {
  free: { label: 'Free', icon: User, color: 'bg-gray-500' },
  standard: { label: 'Standard', icon: Sparkles, color: 'bg-blue-500' },
  premium: { label: 'Premium', icon: Crown, color: 'bg-amber-500' },
}

export function ImpersonationBanner() {
  const isImpersonating = useIsImpersonating()
  const impersonatedTier = useImpersonatedTier()
  const setImpersonatedTier = useAppStore((state) => state.setImpersonatedTier)

  if (!isImpersonating || !impersonatedTier) return null

  const tierInfo = TIER_INFO[impersonatedTier]
  const Icon = tierInfo.icon

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-black py-2 px-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Eye className="w-4 h-4" />
          <span className="text-sm font-medium">
            Viewing as <strong>{tierInfo.label}</strong> tier user
          </span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold text-white ${tierInfo.color}`}>
            <Icon className="w-3 h-3" />
            {tierInfo.label}
          </span>
        </div>
        <button
          onClick={() => setImpersonatedTier(null)}
          className="flex items-center gap-1.5 px-3 py-1 bg-black/20 hover:bg-black/30 rounded text-sm font-medium transition-colors"
        >
          <X className="w-4 h-4" />
          Exit Preview
        </button>
      </div>
    </div>
  )
}

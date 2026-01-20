'use client'

import { useState } from 'react'
import { Eye, User, Crown, Sparkles, Check, X } from 'lucide-react'
import { useAppStore, useIsImpersonating, useImpersonatedTier } from '@/store'
import type { UserTier } from '@/types/database'
import { cn } from '@/lib/utils'

const TIERS: { value: UserTier; label: string; description: string; icon: typeof User; color: string }[] = [
  {
    value: 'free',
    label: 'Free',
    description: 'No AI features, basic functionality',
    icon: User,
    color: 'border-gray-500 bg-gray-500/10 hover:bg-gray-500/20',
  },
  {
    value: 'standard',
    label: 'Standard',
    description: 'AI features enabled, standard limits',
    icon: Sparkles,
    color: 'border-blue-500 bg-blue-500/10 hover:bg-blue-500/20',
  },
  {
    value: 'premium',
    label: 'Premium',
    description: 'All features, priority AI access',
    icon: Crown,
    color: 'border-amber-500 bg-amber-500/10 hover:bg-amber-500/20',
  },
]

export function ImpersonationSelector() {
  const isImpersonating = useIsImpersonating()
  const impersonatedTier = useImpersonatedTier()
  const setImpersonatedTier = useAppStore((state) => state.setImpersonatedTier)
  const [isOpen, setIsOpen] = useState(false)

  const handleSelectTier = (tier: UserTier) => {
    setImpersonatedTier(tier)
    setIsOpen(false)
  }

  const handleStopImpersonating = () => {
    setImpersonatedTier(null)
    setIsOpen(false)
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
          <Eye className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h3 className="font-semibold text-white">View As</h3>
          <p className="text-sm text-gray-400">Test the app as different user tiers</p>
        </div>
      </div>

      {isImpersonating && impersonatedTier ? (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-amber-300">Currently viewing as:</span>
              <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-200 text-sm font-medium">
                {TIERS.find(t => t.value === impersonatedTier)?.label}
              </span>
            </div>
            <button
              onClick={handleStopImpersonating}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 rounded-lg text-sm text-amber-200 transition-colors"
            >
              <X className="w-4 h-4" />
              Exit Preview
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {TIERS.map((tier) => {
          const Icon = tier.icon
          const isSelected = impersonatedTier === tier.value

          return (
            <button
              key={tier.value}
              onClick={() => handleSelectTier(tier.value)}
              className={cn(
                'relative p-4 rounded-xl border-2 text-left transition-all',
                isSelected
                  ? tier.color.replace('hover:', '') + ' ring-2 ring-offset-2 ring-offset-[#0c0c0e]'
                  : 'border-white/10 hover:border-white/20 bg-white/[0.02]',
                tier.value === 'free' && isSelected && 'ring-gray-500',
                tier.value === 'standard' && isSelected && 'ring-blue-500',
                tier.value === 'premium' && isSelected && 'ring-amber-500'
              )}
            >
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <Check className={cn(
                    'w-4 h-4',
                    tier.value === 'free' && 'text-gray-400',
                    tier.value === 'standard' && 'text-blue-400',
                    tier.value === 'premium' && 'text-amber-400'
                  )} />
                </div>
              )}
              <Icon className={cn(
                'w-6 h-6 mb-2',
                tier.value === 'free' && 'text-gray-400',
                tier.value === 'standard' && 'text-blue-400',
                tier.value === 'premium' && 'text-amber-400'
              )} />
              <h4 className="font-medium text-white mb-1">{tier.label}</h4>
              <p className="text-xs text-gray-400">{tier.description}</p>
            </button>
          )
        })}
      </div>

      <p className="mt-4 text-xs text-gray-500 text-center">
        Preview mode affects your view only. Refresh the page or click "Exit Preview" to return to normal.
      </p>
    </div>
  )
}

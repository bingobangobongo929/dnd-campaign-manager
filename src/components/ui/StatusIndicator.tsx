'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export type CampaignStatus = 'active' | 'paused' | 'completed' | 'hiatus' | 'archived'

const statusStyles: Record<CampaignStatus, {
  dot: string
  text: string
  label: string
  useCheckIcon?: boolean
  cardClass: string
}> = {
  active: {
    dot: 'bg-green-500',
    text: 'text-green-400',
    label: 'Active',
    cardClass: ''
  },
  paused: {
    dot: 'bg-amber-500',
    text: 'text-amber-400',
    label: 'Paused',
    cardClass: 'opacity-80'
  },
  hiatus: {
    dot: 'bg-amber-500',
    text: 'text-amber-400',
    label: 'On Hiatus',
    cardClass: 'opacity-80'
  },
  completed: {
    dot: 'bg-gray-500',
    text: 'text-gray-400',
    label: 'Completed',
    useCheckIcon: true,
    cardClass: 'opacity-70 grayscale-[30%]'
  },
  archived: {
    dot: 'bg-gray-600',
    text: 'text-gray-500',
    label: 'Archived',
    useCheckIcon: true,
    cardClass: 'opacity-60 grayscale-[50%]'
  }
}

interface StatusIndicatorProps {
  status: CampaignStatus
  className?: string
  showLabel?: boolean
  size?: 'sm' | 'md'
}

export function StatusIndicator({
  status,
  className,
  showLabel = true,
  size = 'sm'
}: StatusIndicatorProps) {
  const style = statusStyles[status]
  const dotSize = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5'
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'

  return (
    <span className={cn("flex items-center gap-1.5", textSize, style.text, className)}>
      {style.useCheckIcon ? (
        <Check className={iconSize} />
      ) : (
        <span className={cn("rounded-full", dotSize, style.dot)} />
      )}
      {showLabel && style.label}
    </span>
  )
}

/**
 * Get the card class modifier for a given status
 */
export function getStatusCardClass(status: CampaignStatus | undefined | null): string {
  if (!status) return ''
  return statusStyles[status]?.cardClass || ''
}

/**
 * Determine campaign status from various indicators
 */
export function determineCampaignStatus(campaign: {
  status?: string | null
  updated_at?: string | null
}): CampaignStatus {
  if (campaign.status === 'completed') return 'completed'
  if (campaign.status === 'hiatus' || campaign.status === 'paused') return 'paused'
  if (campaign.status === 'archived') return 'archived'
  return 'active'
}

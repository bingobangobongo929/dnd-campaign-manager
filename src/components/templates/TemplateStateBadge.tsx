'use client'

import { cn } from '@/lib/utils'
import { Pause, Archive, Play } from 'lucide-react'
import type { ContentMode } from '@/types/database'

interface TemplateStateBadgeProps {
  mode: ContentMode
  inactiveReason?: string | null
  size?: 'sm' | 'md'
  className?: string
}

export function TemplateStateBadge({
  mode,
  inactiveReason,
  size = 'md',
  className,
}: TemplateStateBadgeProps) {
  const getConfig = () => {
    switch (mode) {
      case 'inactive':
        const reasonLabel = getInactiveReasonLabel(inactiveReason)
        return {
          icon: reasonLabel === 'Deceased' ? Archive : Pause,
          label: reasonLabel,
          bgColor: 'bg-gray-500/15',
          textColor: 'text-gray-400',
          borderColor: 'border-gray-500/30',
        }
      case 'active':
      default:
        return {
          icon: Play,
          label: 'Active',
          bgColor: 'bg-green-500/15',
          textColor: 'text-green-400',
          borderColor: 'border-green-500/30',
        }
    }
  }

  const config = getConfig()
  const Icon = config.icon

  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-xs gap-1'
    : 'px-2.5 py-1 text-xs gap-1.5'

  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-lg border',
        sizeClasses,
        config.bgColor,
        config.textColor,
        config.borderColor,
        className
      )}
    >
      <Icon className={iconSize} />
      {config.label}
    </span>
  )
}

function getInactiveReasonLabel(reason?: string | null): string {
  switch (reason) {
    case 'completed':
      return 'Completed'
    case 'on_hiatus':
      return 'On Hiatus'
    case 'retired':
      return 'Retired'
    case 'deceased':
      return 'Deceased'
    case 'archived':
      return 'Archived'
    default:
      return 'Inactive'
  }
}

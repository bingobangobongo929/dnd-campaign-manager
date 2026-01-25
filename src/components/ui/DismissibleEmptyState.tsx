'use client'

import { useState } from 'react'
import Link from 'next/link'
import { X, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SectionId = 'campaigns' | 'adventures' | 'oneshots' | 'characters' | 'playing'
export type ColorScheme = 'blue' | 'amber' | 'green' | 'purple' | 'emerald'

const colorSchemes: Record<ColorScheme, {
  bg: string
  border: string
  iconBg: string
  iconColor: string
  buttonBg: string
}> = {
  blue: {
    bg: 'from-blue-500/5 to-transparent',
    border: 'border-blue-500/20',
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
    buttonBg: 'bg-blue-600 hover:bg-blue-500'
  },
  amber: {
    bg: 'from-amber-500/5 to-transparent',
    border: 'border-amber-500/20',
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-400',
    buttonBg: 'bg-amber-600 hover:bg-amber-500'
  },
  green: {
    bg: 'from-green-500/5 to-transparent',
    border: 'border-green-500/20',
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-400',
    buttonBg: 'bg-green-600 hover:bg-green-500'
  },
  purple: {
    bg: 'from-purple-500/5 to-transparent',
    border: 'border-purple-500/20',
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-purple-400',
    buttonBg: 'bg-purple-600 hover:bg-purple-500'
  },
  emerald: {
    bg: 'from-emerald-500/5 to-transparent',
    border: 'border-emerald-500/20',
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-400',
    buttonBg: 'bg-emerald-600 hover:bg-emerald-500'
  }
}

interface DismissibleEmptyStateProps {
  sectionId: SectionId
  icon: React.ReactNode
  title: string
  description: string
  primaryAction: {
    label: string
    href: string
    icon?: React.ReactNode
  }
  secondaryAction?: {
    label: string
    href: string
    icon?: React.ReactNode
  }
  colorScheme: ColorScheme
  onDismiss?: (sectionId: SectionId, permanent: boolean) => void
  className?: string
  /** Use compact mode for mobile */
  compact?: boolean
}

export function DismissibleEmptyState({
  sectionId,
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  colorScheme,
  onDismiss,
  className,
  compact = false,
}: DismissibleEmptyStateProps) {
  const [showDismissConfirm, setShowDismissConfirm] = useState(false)
  const colors = colorSchemes[colorScheme]

  const handleDismiss = (permanent: boolean) => {
    onDismiss?.(sectionId, permanent)
    setShowDismissConfirm(false)
  }

  if (showDismissConfirm) {
    return (
      <div className={cn(
        'relative rounded-xl bg-gradient-to-br border border-dashed text-center',
        colors.bg,
        colors.border,
        compact ? 'p-6' : 'p-8',
        className
      )}>
        <h4 className="text-base font-semibold text-white mb-4">Hide this section?</h4>
        <div className={cn(
          'flex justify-center gap-3',
          compact && 'flex-col'
        )}>
          <button
            onClick={() => handleDismiss(false)}
            className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] rounded-lg text-sm font-medium text-white transition-colors"
          >
            Hide for now
          </button>
          <button
            onClick={() => handleDismiss(true)}
            className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] rounded-lg text-sm font-medium text-gray-400 transition-colors"
          >
            Don't show again
          </button>
        </div>
        <p className="mt-4 text-xs text-gray-500">
          You can re-enable sections in Settings
        </p>
        <button
          onClick={() => setShowDismissConfirm(false)}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors"
          aria-label="Cancel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div className={cn(
      'relative rounded-xl bg-gradient-to-br border border-dashed text-center',
      colors.bg,
      colors.border,
      compact ? 'p-6' : 'p-8',
      className
    )}>
      {/* Dismiss button */}
      {onDismiss && (
        <button
          onClick={() => setShowDismissConfirm(true)}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Icon */}
      <div className={cn(
        'mx-auto mb-4 rounded-2xl flex items-center justify-center',
        colors.iconBg,
        compact ? 'w-12 h-12' : 'w-14 h-14'
      )}>
        <div className={colors.iconColor}>
          {icon}
        </div>
      </div>

      {/* Content */}
      <h3 className={cn(
        'font-semibold text-white mb-1',
        compact ? 'text-base' : 'text-lg'
      )}>
        {title}
      </h3>
      <p className={cn(
        'text-gray-400 mb-5',
        compact ? 'text-xs' : 'text-sm'
      )}>
        {description}
      </p>

      {/* Actions */}
      <div className={cn(
        'flex justify-center gap-2',
        compact && 'flex-col'
      )}>
        <Link
          href={primaryAction.href}
          className={cn(
            'inline-flex items-center justify-center gap-2 px-4 py-2.5 text-white text-sm font-medium rounded-xl transition-colors',
            colors.buttonBg
          )}
        >
          {primaryAction.icon}
          {primaryAction.label}
        </Link>
        {secondaryAction && (
          <Link
            href={secondaryAction.href}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors"
          >
            {secondaryAction.icon || <Sparkles className="w-4 h-4" />}
            {secondaryAction.label}
          </Link>
        )}
      </div>
    </div>
  )
}

/**
 * Get the color scheme for a section
 */
export function getSectionColorScheme(sectionId: SectionId): ColorScheme {
  switch (sectionId) {
    case 'campaigns': return 'blue'
    case 'adventures': return 'amber'
    case 'oneshots': return 'green'
    case 'characters': return 'purple'
    case 'playing': return 'emerald'
    default: return 'blue'
  }
}

/**
 * Default empty state content for each section
 */
export const EMPTY_STATE_CONTENT: Record<SectionId, {
  title: string
  description: string
  primaryLabel: string
  primaryHref: string
  demoHref: string
}> = {
  campaigns: {
    title: 'Begin Your Adventure',
    description: 'Create your first campaign and start building your world',
    primaryLabel: 'Create Campaign',
    primaryHref: '/campaigns/new',
    demoHref: '/demo/campaign'
  },
  adventures: {
    title: 'Start an Adventure',
    description: 'Multi-session stories that span 3-9 sessions',
    primaryLabel: 'Create Adventure',
    primaryHref: '/adventures/new',
    demoHref: '/demo/campaign'
  },
  oneshots: {
    title: 'Quick Adventures Await',
    description: 'Single-session adventures for quick games',
    primaryLabel: 'Create One-Shot',
    primaryHref: '/oneshots/new',
    demoHref: '/demo/oneshot'
  },
  characters: {
    title: 'Your Vault Awaits',
    description: 'Create characters to track across campaigns',
    primaryLabel: 'Create Character',
    primaryHref: '/vault/new',
    demoHref: '/demo/character'
  },
  playing: {
    title: 'Join a Campaign',
    description: 'Ask your DM for an invite link to join their game',
    primaryLabel: 'Enter Invite Code',
    primaryHref: '/join',
    demoHref: '/demo/campaign'
  }
}

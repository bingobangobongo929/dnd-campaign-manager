'use client'

import {
  Crown,
  Dice5,
  Users,
  PenLine,
  Layers,
  Globe,
  Bookmark,
  Sparkles,
  Link,
  Clock,
  Download,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Badge variants for all content types
 *
 * Ownership/Role:
 * - owner: You created this, you control it
 * - playing: You're a player in this campaign/adventure
 * - co-dm: You're helping run this
 *
 * Content State:
 * - draft: Work in progress
 * - template: Ready to use, not active
 * - published: Shared with community
 * - saved: From someone else's template
 *
 * Character Source (vault):
 * - original: Created in vault
 * - in-play: Linked to active campaign
 * - session-0: Pre-campaign snapshot
 * - export: Point-in-time export
 */
export type BadgeVariant =
  | 'owner'
  | 'playing'
  | 'co-dm'
  | 'draft'
  | 'template'
  | 'published'
  | 'saved'
  | 'original'
  | 'in-play'
  | 'session-0'
  | 'export'

interface BadgeConfig {
  icon: LucideIcon
  label: string
  shortLabel: string
  className: string
}

const BADGE_CONFIG: Record<BadgeVariant, BadgeConfig> = {
  // Ownership/Role badges
  owner: {
    icon: Crown,
    label: 'Owner',
    shortLabel: 'Owner',
    className: 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/25',
  },
  playing: {
    icon: Dice5,
    label: 'Playing',
    shortLabel: 'Playing',
    className: 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/25',
  },
  'co-dm': {
    icon: Users,
    label: 'Co-DM',
    shortLabel: 'Co-DM',
    className: 'bg-gradient-to-r from-purple-600 to-blue-500 text-white shadow-lg shadow-purple-500/25',
  },

  // Content state badges
  draft: {
    icon: PenLine,
    label: 'Draft',
    shortLabel: 'Draft',
    className: 'bg-amber-500/10 border border-dashed border-amber-500/50 text-amber-400',
  },
  template: {
    icon: Layers,
    label: 'Template',
    shortLabel: 'Template',
    className: 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-400',
  },
  published: {
    icon: Globe,
    label: 'Published',
    shortLabel: 'Published',
    className: 'bg-green-500/20 border border-green-500/40 text-green-400',
  },
  saved: {
    icon: Bookmark,
    label: 'Saved',
    shortLabel: 'Saved',
    className: 'bg-purple-500/20 border border-purple-500/40 text-purple-400',
  },

  // Character source badges (vault)
  original: {
    icon: Sparkles,
    label: 'Original',
    shortLabel: 'Original',
    className: 'bg-purple-500/10 border border-purple-500/30 text-purple-400',
  },
  'in-play': {
    icon: Link,
    label: 'In-Play',
    shortLabel: 'In-Play',
    className: 'bg-blue-500/10 border border-blue-500/30 text-blue-400',
  },
  'session-0': {
    icon: Clock,
    label: 'Session 0',
    shortLabel: 'S0',
    className: 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400',
  },
  export: {
    icon: Download,
    label: 'Export',
    shortLabel: 'Export',
    className: 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400',
  },
}

export interface ContentBadgeProps {
  variant: BadgeVariant
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  showIcon?: boolean
  progress?: number // For drafts: 0-100
  className?: string
}

export function ContentBadge({
  variant,
  size = 'md',
  showLabel = true,
  showIcon = true,
  progress,
  className,
}: ContentBadgeProps) {
  const config = BADGE_CONFIG[variant]
  const Icon = config.icon

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-md backdrop-blur-sm',
        sizeClasses[size],
        config.className,
        className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {showLabel && (
        <span>{size === 'sm' ? config.shortLabel : config.label}</span>
      )}
      {variant === 'draft' && typeof progress === 'number' && (
        <span className="text-amber-500/70">{progress}%</span>
      )}
    </span>
  )
}

/**
 * Compact badge for tight spaces - icon only with tooltip
 */
export function ContentBadgeIcon({
  variant,
  size = 'md',
  className,
}: Omit<ContentBadgeProps, 'showLabel' | 'showIcon' | 'progress'>) {
  const config = BADGE_CONFIG[variant]
  const Icon = config.icon

  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-7 h-7',
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-md backdrop-blur-sm',
        sizeClasses[size],
        config.className,
        className
      )}
      title={config.label}
    >
      <Icon className={iconSizes[size]} />
    </span>
  )
}

/**
 * Multiple badges in a row (e.g., Owner + Published)
 */
export function ContentBadgeGroup({
  badges,
  size = 'md',
  className,
}: {
  badges: Array<{ variant: BadgeVariant; progress?: number }>
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  if (badges.length === 0) return null

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {badges.map((badge, index) => (
        <ContentBadge
          key={badge.variant}
          variant={badge.variant}
          size={size}
          progress={badge.progress}
          // Only show label on first badge in compact mode
          showLabel={index === 0 || size !== 'sm'}
        />
      ))}
    </div>
  )
}

// Export config for use in other components
export { BADGE_CONFIG }

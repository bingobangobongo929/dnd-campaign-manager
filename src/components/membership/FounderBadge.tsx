'use client'

import { Crown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FounderBadgeProps {
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

/**
 * Founder badge component - displays the Crown icon with optional label
 *
 * Crown icon represents early adopters and founders
 */
export function FounderBadge({ size = 'md', showLabel = false, className }: FounderBadgeProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }

  const textSizes = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-amber-400 animate-founder-glow',
        className
      )}
      title="Founder - Early Multiloop supporter"
    >
      <Crown className={cn(sizeClasses[size], 'flex-shrink-0')} />
      {showLabel && (
        <span className={cn('font-medium', textSizes[size])}>
          Founder
        </span>
      )}
    </span>
  )
}

/**
 * Inline founder indicator for use next to usernames
 */
export function FounderIndicator({ className }: { className?: string }) {
  return (
    <span
      className={cn('inline-flex items-center animate-founder-glow', className)}
      title="Founder - Early Multiloop supporter"
    >
      <Crown className="w-4 h-4 text-amber-400" />
    </span>
  )
}

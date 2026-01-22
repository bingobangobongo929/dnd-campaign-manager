'use client'

import { cn } from '@/lib/utils'

interface FounderBadgeProps {
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

/**
 * Founder badge component - displays the founder icon with optional label
 *
 * The icon is a custom compass/pioneer design representing early adopters
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
        'inline-flex items-center gap-1 text-amber-400',
        className
      )}
      title="Founder - Early Multiloop supporter"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={cn(sizeClasses[size], 'flex-shrink-0')}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Compass rose / pioneer badge design */}
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
        />
        <circle
          cx="12"
          cy="12"
          r="3"
          fill="currentColor"
        />
        {/* North point */}
        <path
          d="M12 2 L14 8 L12 6 L10 8 Z"
          fill="currentColor"
        />
        {/* South point */}
        <path
          d="M12 22 L14 16 L12 18 L10 16 Z"
          fill="currentColor"
        />
        {/* East point */}
        <path
          d="M22 12 L16 14 L18 12 L16 10 Z"
          fill="currentColor"
        />
        {/* West point */}
        <path
          d="M2 12 L8 14 L6 12 L8 10 Z"
          fill="currentColor"
        />
        {/* Diagonal lines */}
        <line x1="5" y1="5" x2="8" y2="8" stroke="currentColor" strokeWidth="1" />
        <line x1="19" y1="5" x2="16" y2="8" stroke="currentColor" strokeWidth="1" />
        <line x1="5" y1="19" x2="8" y2="16" stroke="currentColor" strokeWidth="1" />
        <line x1="19" y1="19" x2="16" y2="16" stroke="currentColor" strokeWidth="1" />
      </svg>
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
      className={cn('inline-flex items-center', className)}
      title="Founder - Early Multiloop supporter"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-4 h-4 text-amber-400"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <circle cx="12" cy="12" r="3" fill="currentColor" />
        <path d="M12 2 L14 8 L12 6 L10 8 Z" fill="currentColor" />
        <path d="M12 22 L14 16 L12 18 L10 16 Z" fill="currentColor" />
        <path d="M22 12 L16 14 L18 12 L16 10 Z" fill="currentColor" />
        <path d="M2 12 L8 14 L6 12 L8 10 Z" fill="currentColor" />
      </svg>
    </span>
  )
}

'use client'

import { cn } from '@/lib/utils'
import { isUnlimited, getUsagePercent, formatLimit } from '@/lib/membership'

interface UsageBarProps {
  label: string
  used: number
  limit: number
  unit?: string
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * Visual progress bar showing usage against a limit
 */
export function UsageBar({
  label,
  used,
  limit,
  unit = '',
  showLabel = true,
  size = 'md',
  className,
}: UsageBarProps) {
  const unlimited = isUnlimited(limit)
  const percent = getUsagePercent(used, limit)

  // Color based on usage percentage
  const getBarColor = () => {
    if (unlimited) return 'bg-emerald-500'
    if (percent >= 100) return 'bg-red-500'
    if (percent >= 80) return 'bg-amber-500'
    return 'bg-emerald-500'
  }

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  }

  const formatValue = (value: number) => {
    if (unit === 'MB' && value >= 1024) {
      return `${(value / 1024).toFixed(1)} GB`
    }
    return `${value}${unit ? ` ${unit}` : ''}`
  }

  return (
    <div className={cn('space-y-1', className)}>
      {showLabel && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium">
            {formatValue(used)} / {unlimited ? 'Unlimited' : formatValue(limit)}
          </span>
        </div>
      )}
      <div className={cn('w-full bg-muted rounded-full overflow-hidden', sizeClasses[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-300', getBarColor())}
          style={{ width: unlimited ? '0%' : `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  )
}

/**
 * Compact usage indicator for inline display
 */
export function UsageIndicator({
  used,
  limit,
  className,
}: {
  used: number
  limit: number
  className?: string
}) {
  const unlimited = isUnlimited(limit)
  const percent = getUsagePercent(used, limit)

  const getTextColor = () => {
    if (unlimited) return 'text-emerald-500'
    if (percent >= 100) return 'text-red-500'
    if (percent >= 80) return 'text-amber-500'
    return 'text-muted-foreground'
  }

  return (
    <span className={cn('text-sm', getTextColor(), className)}>
      {used}/{unlimited ? '∞' : limit}
    </span>
  )
}

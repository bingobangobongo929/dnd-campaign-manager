'use client'

import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  /** Workflow tip that guides users on how features connect */
  tip?: string
  action?: React.ReactNode
  secondaryAction?: React.ReactNode
  className?: string
  /** Use compact mode for smaller sections within pages */
  compact?: boolean
}

export function EmptyState({
  icon,
  title,
  description,
  tip,
  action,
  secondaryAction,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center',
      compact ? 'py-8' : 'py-12',
      className
    )}>
      {icon && (
        <div className={cn(
          'text-[--text-tertiary]',
          compact ? 'mb-3' : 'mb-4'
        )}>
          {icon}
        </div>
      )}
      <h3 className={cn(
        'font-semibold text-[--text-primary]',
        compact ? 'text-base' : 'text-lg'
      )}>
        {title}
      </h3>
      {description && (
        <p className={cn(
          'mt-1 text-[--text-secondary] max-w-sm',
          compact ? 'text-xs' : 'text-sm'
        )}>
          {description}
        </p>
      )}
      {tip && (
        <p className="mt-3 text-xs text-purple-400/80 max-w-md italic">
          {tip}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className={cn(
          'flex items-center gap-3',
          compact ? 'mt-3' : 'mt-4'
        )}>
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  )
}

/**
 * Smaller inline empty state for sections within pages
 */
export function InlineEmptyState({
  icon,
  message,
  action,
  className,
}: {
  icon?: React.ReactNode
  message: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-4 rounded-lg bg-white/5 border border-white/10',
        className
      )}
    >
      {icon && <div className="text-gray-500 flex-shrink-0">{icon}</div>}
      <span className="text-sm text-gray-400 flex-1">{message}</span>
      {action}
    </div>
  )
}

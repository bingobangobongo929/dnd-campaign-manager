'use client'

import { cn } from '@/lib/utils'
import { ShieldX, ArrowLeft, Home } from 'lucide-react'
import Link from 'next/link'

interface AccessDeniedProps {
  title?: string
  message?: string
  /** Link to navigate back to (defaults to campaign dashboard) */
  backLink?: string
  backLabel?: string
  /** Additional action button */
  action?: React.ReactNode
  className?: string
  /** Use compact mode for inline sections */
  compact?: boolean
}

export function AccessDenied({
  title = 'Access Denied',
  message = "You don't have permission to view this content.",
  backLink,
  backLabel = 'Go Back',
  action,
  className,
  compact = false,
}: AccessDeniedProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8' : 'py-16',
        className
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-red-500/10 text-red-400',
          compact ? 'w-12 h-12 mb-3' : 'w-16 h-16 mb-4'
        )}
      >
        <ShieldX className={compact ? 'w-6 h-6' : 'w-8 h-8'} />
      </div>

      <h2
        className={cn(
          'font-semibold text-[--text-primary]',
          compact ? 'text-base' : 'text-xl'
        )}
      >
        {title}
      </h2>

      <p
        className={cn(
          'mt-2 text-[--text-secondary] max-w-md',
          compact ? 'text-xs' : 'text-sm'
        )}
      >
        {message}
      </p>

      <div className={cn('flex items-center gap-3', compact ? 'mt-4' : 'mt-6')}>
        {backLink && (
          <Link
            href={backLink}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
              'bg-white/5 hover:bg-white/10 border border-white/10',
              'text-[--text-secondary] hover:text-[--text-primary]',
              'transition-colors',
              compact ? 'text-xs' : 'text-sm'
            )}
          >
            <ArrowLeft className="w-4 h-4" />
            {backLabel}
          </Link>
        )}
        {action}
      </div>
    </div>
  )
}

/**
 * Full page access denied for use as a page component
 */
export function AccessDeniedPage({
  campaignId,
  message,
}: {
  campaignId?: string
  message?: string
}) {
  const dashboardLink = campaignId
    ? `/campaigns/${campaignId}/dashboard`
    : '/home'

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <AccessDenied
        message={message}
        backLink={dashboardLink}
        backLabel={campaignId ? 'Back to Dashboard' : 'Go Home'}
        action={
          !campaignId ? (
            <Link
              href="/home"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm transition-colors"
            >
              <Home className="w-4 h-4" />
              Home
            </Link>
          ) : undefined
        }
      />
    </div>
  )
}

/**
 * Inline access denied for sections within a page
 */
export function InlineAccessDenied({
  message = "You don't have permission to view this section.",
  className,
}: {
  message?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-4 rounded-lg bg-red-500/5 border border-red-500/20',
        className
      )}
    >
      <ShieldX className="w-5 h-5 text-red-400 flex-shrink-0" />
      <span className="text-sm text-red-300">{message}</span>
    </div>
  )
}

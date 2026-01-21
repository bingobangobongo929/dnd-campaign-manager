'use client'

import { Info, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AttributionBannerProps {
  templateName: string
  creatorName?: string | null
  templateId?: string | null
  contentType: 'campaign' | 'character' | 'oneshot'
  version?: number | null
  className?: string
  compact?: boolean
}

export function AttributionBanner({
  templateName,
  creatorName,
  templateId,
  contentType,
  version,
  className,
  compact = false,
}: AttributionBannerProps) {
  // Build the link to the original template if available
  const getTemplateLink = () => {
    if (!templateId) return null
    switch (contentType) {
      case 'campaign':
        return `/campaigns/${templateId}/view`
      case 'character':
        return `/vault/${templateId}/view`
      case 'oneshot':
        return `/oneshots/${templateId}/view`
      default:
        return null
    }
  }

  const templateLink = getTemplateLink()

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-gray-400', className)}>
        <span>Based on template by</span>
        <span className="font-medium text-purple-400">
          {creatorName || 'Community Creator'}
        </span>
        {version && (
          <span className="text-xs px-1.5 py-0.5 bg-purple-500/10 text-purple-400 rounded">
            v{version}
          </span>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl bg-purple-500/5 border border-purple-500/20',
        className
      )}
    >
      <div className="p-2 bg-purple-500/10 rounded-lg shrink-0">
        <Info className="w-4 h-4 text-purple-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-300">
          This content is based on a community template
        </p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-sm font-medium text-white truncate">
            "{templateName}"
          </span>
          <span className="text-sm text-gray-400">by</span>
          <span className="text-sm font-medium text-purple-400">
            {creatorName || 'Community Creator'}
          </span>
          {version && (
            <span className="text-xs px-1.5 py-0.5 bg-purple-500/10 text-purple-400 rounded">
              v{version}
            </span>
          )}
        </div>
        {templateLink && (
          <a
            href={templateLink}
            className="inline-flex items-center gap-1.5 mt-2 text-xs text-purple-400 hover:text-purple-300 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            View Original
          </a>
        )}
      </div>
    </div>
  )
}

// Simpler card version for list items
export function AttributionTag({
  creatorName,
  className,
}: {
  creatorName?: string | null
  className?: string
}) {
  return (
    <span className={cn('text-xs text-gray-500', className)}>
      Based on template by{' '}
      <span className="text-purple-400">{creatorName || 'Community Creator'}</span>
    </span>
  )
}

'use client'

import { cn } from '@/lib/utils'
import { UsageBar } from './UsageBar'
import { FounderBadge } from './FounderBadge'
import type { TierLimits, UserUsage } from '@/lib/membership'

interface UsageGridProps {
  limits: TierLimits
  usage: UserUsage
  isFounder: boolean
  className?: string
}

/**
 * Grid displaying all usage statistics
 */
export function UsageGrid({ limits, usage, isFounder, className }: UsageGridProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {isFounder && (
        <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <FounderBadge size="md" />
          <div>
            <p className="text-sm font-medium text-amber-400">Founder Status</p>
            <p className="text-xs text-muted-foreground">
              You have expanded limits as an early supporter
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <UsageCard
          title="Campaigns"
          description="Active and archived campaigns"
          used={usage.campaigns}
          limit={limits.campaigns}
        />
        <UsageCard
          title="One-Shots"
          description="Active and archived one-shots"
          used={usage.oneshots}
          limit={limits.oneshots}
        />
        <UsageCard
          title="Vault Characters"
          description="Characters in your vault"
          used={usage.vaultCharacters}
          limit={limits.vaultCharacters}
        />
        <UsageCard
          title="Storage"
          description="Images and file uploads"
          used={usage.storageMB}
          limit={limits.storageMB}
          unit="MB"
        />
        <UsageCard
          title="Share Links"
          description="Active share links"
          used={usage.shareLinks}
          limit={limits.shareLinks}
        />
        <UsageCard
          title="Public Templates"
          description="Published templates"
          used={usage.publicTemplates}
          limit={limits.publicTemplates}
        />
      </div>
    </div>
  )
}

interface UsageCardProps {
  title: string
  description: string
  used: number
  limit: number
  unit?: string
}

function UsageCard({ title, description, used, limit, unit }: UsageCardProps) {
  return (
    <div className="p-4 bg-card border rounded-lg space-y-3">
      <div>
        <h4 className="font-medium">{title}</h4>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <UsageBar label="" used={used} limit={limit} unit={unit} showLabel={false} size="lg" />
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Used</span>
        <span className="font-medium">
          {unit === 'MB' && used >= 1024
            ? `${(used / 1024).toFixed(1)} GB`
            : `${used}${unit ? ` ${unit}` : ''}`}
          {' / '}
          {limit === -1
            ? 'Unlimited'
            : unit === 'MB' && limit >= 1024
            ? `${(limit / 1024).toFixed(1)} GB`
            : `${limit}${unit ? ` ${unit}` : ''}`}
        </span>
      </div>
    </div>
  )
}

/**
 * Compact usage summary for settings sidebar
 */
export function UsageSummary({
  limits,
  usage,
  className,
}: {
  limits: TierLimits
  usage: UserUsage
  className?: string
}) {
  const items = [
    { label: 'Campaigns', used: usage.campaigns, limit: limits.campaigns },
    { label: 'One-Shots', used: usage.oneshots, limit: limits.oneshots },
    { label: 'Characters', used: usage.vaultCharacters, limit: limits.vaultCharacters },
    { label: 'Storage', used: usage.storageMB, limit: limits.storageMB, unit: 'MB' },
  ]

  return (
    <div className={cn('space-y-2', className)}>
      {items.map((item) => (
        <UsageBar
          key={item.label}
          label={item.label}
          used={item.used}
          limit={item.limit}
          unit={item.unit}
          size="sm"
        />
      ))}
    </div>
  )
}

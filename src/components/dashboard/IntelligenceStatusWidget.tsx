'use client'

import Link from 'next/link'
import {
  Brain,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users as UsersIcon,
  Link2,
  ChevronRight,
} from 'lucide-react'
import { DashboardWidget } from './DashboardWidget'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

interface Suggestion {
  type: 'timeline' | 'npc' | 'relationship' | 'inconsistency'
  count: number
  description: string
}

interface IntelligenceStatusWidgetProps {
  campaignId: string
  lastRunAt: string | null
  cooldownUntil?: string | null
  suggestions?: Suggestion[]
  onRunAnalysis?: () => void
  className?: string
}

const SUGGESTION_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
  timeline: { icon: Clock, color: 'text-cyan-400' },
  npc: { icon: UsersIcon, color: 'text-purple-400' },
  relationship: { icon: Link2, color: 'text-blue-400' },
  inconsistency: { icon: AlertCircle, color: 'text-amber-400' },
}

export function IntelligenceStatusWidget({
  campaignId,
  lastRunAt,
  cooldownUntil,
  suggestions = [],
  onRunAnalysis,
  className,
}: IntelligenceStatusWidgetProps) {
  const now = new Date()
  const isOnCooldown = cooldownUntil && new Date(cooldownUntil) > now
  const lastRun = lastRunAt ? formatDistanceToNow(new Date(lastRunAt), { addSuffix: true }) : null
  const cooldownRemaining = cooldownUntil
    ? formatDistanceToNow(new Date(cooldownUntil))
    : null

  const totalSuggestions = suggestions.reduce((sum, s) => sum + s.count, 0)

  return (
    <DashboardWidget
      title="Intelligence"
      icon={Brain}
      action={{ label: 'View All', href: `/campaigns/${campaignId}/intelligence` }}
      className={className}
    >
      {/* Status Block */}
      <div className="p-3 bg-white/[0.02] border border-white/[0.08] rounded-lg mb-4">
        {isOnCooldown ? (
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <div>
              <p className="text-sm text-amber-400">Available in {cooldownRemaining}</p>
              {lastRun && (
                <p className="text-xs text-gray-500">Last analyzed {lastRun}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <div>
                <p className="text-sm text-green-400">Available now</p>
                {lastRun && (
                  <p className="text-xs text-gray-500">Last run {lastRun}</p>
                )}
              </div>
            </div>
            {onRunAnalysis && (
              <button
                onClick={onRunAnalysis}
                className="px-3 py-1.5 text-xs font-medium text-purple-300 bg-purple-600/20 hover:bg-purple-600/30 rounded-lg transition-colors"
              >
                Run Analysis
              </button>
            )}
          </div>
        )}
      </div>

      {/* Suggestions */}
      {totalSuggestions > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Pending Suggestions
          </p>
          {suggestions.filter(s => s.count > 0).map((suggestion) => {
            const config = SUGGESTION_CONFIG[suggestion.type]
            const Icon = config?.icon || AlertCircle

            return (
              <Link
                key={suggestion.type}
                href={`/campaigns/${campaignId}/intelligence?filter=${suggestion.type}`}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.02] transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <Icon className={cn("w-4 h-4", config?.color || 'text-gray-400')} />
                  <div>
                    <p className="text-sm text-white">
                      {suggestion.count} {suggestion.type === 'timeline' ? 'timeline events' : suggestion.type === 'npc' ? 'new NPCs' : suggestion.type === 'relationship' ? 'relationships' : 'inconsistencies'}
                    </p>
                    <p className="text-xs text-gray-500">{suggestion.description}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-4">
          <CheckCircle2 className="w-8 h-8 text-gray-600 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">All caught up!</p>
          <p className="text-gray-600 text-xs">No new suggestions</p>
        </div>
      )}
    </DashboardWidget>
  )
}

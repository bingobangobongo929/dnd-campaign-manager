'use client'

import { useEffect, useState } from 'react'
import {
  History,
  Loader2,
  Filter,
  Calendar,
  User,
  Map,
  BookOpen,
  Scroll,
  Share2,
  Zap,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { formatActivityAction, getActivityIcon, type ActivityAction } from '@/lib/activity-log'

interface ActivityLogEntry {
  id: string
  action: ActivityAction
  entity_type: string
  entity_id: string | null
  entity_name: string | null
  changes: Record<string, { old?: unknown; new?: unknown }> | null
  metadata: Record<string, unknown> | null
  created_at: string
}

const ENTITY_TYPE_ICONS: Record<string, typeof User> = {
  character: User,
  campaign: Map,
  session: BookOpen,
  oneshot: Scroll,
  share: Share2,
  canvas_group: Zap,
}

const ENTITY_TYPE_COLORS: Record<string, string> = {
  character: 'text-purple-400 bg-purple-500/10',
  campaign: 'text-blue-400 bg-blue-500/10',
  session: 'text-green-400 bg-green-500/10',
  oneshot: 'text-amber-400 bg-amber-500/10',
  share: 'text-pink-400 bg-pink-500/10',
  canvas_group: 'text-cyan-400 bg-cyan-500/10',
}

export default function ActivityLogPage() {
  const [activities, setActivities] = useState<ActivityLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string | null>(null)
  const [days, setDays] = useState(30)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [stats, setStats] = useState<{ byType: Record<string, number>; total: number } | null>(null)

  useEffect(() => {
    loadActivity()
  }, [filter, days])

  const loadActivity = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('limit', '100')
      params.set('days', days.toString())
      if (filter) params.set('type', filter)

      const res = await fetch(`/api/activity?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setActivities(data.activities || [])
        setStats(data.stats || null)
      }
    } catch (error) {
      console.error('Failed to load activity:', error)
    } finally {
      setLoading(false)
    }
  }

  // Group activities by date
  const groupedActivities: Record<string, ActivityLogEntry[]> = {}
  for (const activity of activities) {
    const date = new Date(activity.created_at).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
    if (!groupedActivities[date]) {
      groupedActivities[date] = []
    }
    groupedActivities[date].push(activity)
  }

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[--arcane-purple] to-indigo-600 flex items-center justify-center">
            <History className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="page-title">Activity Log</h1>
            <p className="page-subtitle">Track changes across your content</p>
          </div>
        </div>
        <button
          onClick={loadActivity}
          disabled={loading}
          className="btn btn-secondary"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <button
            onClick={() => setFilter(null)}
            className={cn(
              'p-4 rounded-xl border transition-all text-left',
              !filter
                ? 'bg-[--arcane-purple]/10 border-[--arcane-purple]'
                : 'bg-[--bg-surface] border-[--border] hover:border-[--arcane-purple]/50'
            )}
          >
            <p className="text-2xl font-bold text-[--text-primary]">{stats.total}</p>
            <p className="text-xs text-[--text-tertiary]">All Actions</p>
          </button>
          {Object.entries(stats.byType).map(([type, count]) => {
            const Icon = ENTITY_TYPE_ICONS[type] || History
            const colorClass = ENTITY_TYPE_COLORS[type] || 'text-gray-400 bg-gray-500/10'
            return (
              <button
                key={type}
                onClick={() => setFilter(filter === type ? null : type)}
                className={cn(
                  'p-4 rounded-xl border transition-all text-left',
                  filter === type
                    ? 'bg-[--arcane-purple]/10 border-[--arcane-purple]'
                    : 'bg-[--bg-surface] border-[--border] hover:border-[--arcane-purple]/50'
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center', colorClass)}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-lg font-bold text-[--text-primary]">{count}</p>
                </div>
                <p className="text-xs text-[--text-tertiary] capitalize">{type}s</p>
              </button>
            )
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[--text-tertiary]" />
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="bg-[--bg-elevated] border border-[--border] rounded-lg px-3 py-2 text-sm text-[--text-primary] focus:outline-none focus:border-[--arcane-purple]"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
        </div>
        {filter && (
          <button
            onClick={() => setFilter(null)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[--arcane-purple]/10 text-[--arcane-purple] rounded-lg hover:bg-[--arcane-purple]/20"
          >
            <Filter className="w-3 h-3" />
            Clear filter
          </button>
        )}
      </div>

      {/* Activity List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[--arcane-purple]" />
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-20">
          <History className="w-12 h-12 text-[--text-tertiary] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[--text-primary] mb-2">No activity yet</h3>
          <p className="text-sm text-[--text-tertiary]">
            Activity will appear here as you create and edit content.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedActivities).map(([date, items]) => (
            <div key={date}>
              <h3 className="text-sm font-semibold text-[--text-tertiary] mb-4">{date}</h3>
              <div className="space-y-2">
                {items.map((activity) => {
                  const Icon = ENTITY_TYPE_ICONS[activity.entity_type] || History
                  const colorClass = ENTITY_TYPE_COLORS[activity.entity_type] || 'text-gray-400 bg-gray-500/10'
                  const isExpanded = expandedId === activity.id
                  const hasChanges = activity.changes && Object.keys(activity.changes).length > 0

                  return (
                    <div
                      key={activity.id}
                      className="card p-4 hover:border-[--arcane-purple]/30 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', colorClass)}>
                          <Icon className="w-5 h-5" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-[--text-primary]">
                              {formatActivityAction(activity.action)}
                            </span>
                            {activity.entity_name && (
                              <>
                                <span className="text-[--text-tertiary]">·</span>
                                <span className="text-sm text-[--arcane-purple] font-medium truncate">
                                  {activity.entity_name}
                                </span>
                              </>
                            )}
                          </div>
                          <p className="text-xs text-[--text-tertiary] mt-1">
                            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                          </p>
                        </div>

                        {/* Expand button */}
                        {hasChanges && (
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : activity.id)}
                            className="p-2 rounded-lg hover:bg-[--bg-hover] transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-[--text-tertiary]" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-[--text-tertiary]" />
                            )}
                          </button>
                        )}
                      </div>

                      {/* Expanded Changes */}
                      {isExpanded && hasChanges && (
                        <div className="mt-4 pt-4 border-t border-[--border]">
                          <p className="text-xs font-semibold text-[--text-tertiary] uppercase tracking-wide mb-3">
                            Changes
                          </p>
                          <div className="space-y-2">
                            {Object.entries(activity.changes!).map(([field, change]) => (
                              <div key={field} className="text-sm">
                                <span className="font-medium text-[--text-secondary] capitalize">
                                  {field.replace(/_/g, ' ')}:
                                </span>
                                <div className="mt-1 grid grid-cols-2 gap-2">
                                  {change.old !== undefined && (
                                    <div className="p-2 rounded-lg bg-red-500/5 border border-red-500/20">
                                      <p className="text-xs text-red-400 mb-1">Before</p>
                                      <p className="text-xs text-[--text-secondary] line-clamp-2">
                                        {typeof change.old === 'string'
                                          ? change.old.replace(/<[^>]*>/g, '').substring(0, 100) || '(empty)'
                                          : JSON.stringify(change.old)}
                                      </p>
                                    </div>
                                  )}
                                  {change.new !== undefined && (
                                    <div className="p-2 rounded-lg bg-green-500/5 border border-green-500/20">
                                      <p className="text-xs text-green-400 mb-1">After</p>
                                      <p className="text-xs text-[--text-secondary] line-clamp-2">
                                        {typeof change.new === 'string'
                                          ? change.new.replace(/<[^>]*>/g, '').substring(0, 100) || '(empty)'
                                          : JSON.stringify(change.new)}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

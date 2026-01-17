'use client'

import { useEffect, useState, useCallback } from 'react'
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
  RefreshCw,
  AlertCircle,
  Radio,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { formatActivityAction, getActivityIcon, type ActivityAction } from '@/lib/activity-log'
import { createClient } from '@/lib/supabase/client'

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

// Format change for display with before/after
interface FormattedChange {
  field: string
  type: 'added' | 'removed' | 'changed'
  oldValue?: string
  newValue?: string
}

function formatChanges(changes: Record<string, { old?: unknown; new?: unknown }> | null): FormattedChange[] {
  if (!changes) return []

  const formatted: FormattedChange[] = []

  for (const [field, change] of Object.entries(changes)) {
    const oldVal = change.old
    const newVal = change.new
    const fieldName = field.replace(/_/g, ' ')

    // Handle empty transitions
    const oldEmpty = oldVal === null || oldVal === undefined || oldVal === ''
    const newEmpty = newVal === null || newVal === undefined || newVal === ''

    if (oldEmpty && newEmpty) continue

    const formatValue = (val: unknown): string => {
      if (val === null || val === undefined || val === '') return ''
      if (typeof val === 'string') {
        // Truncate long values
        return val.length > 150 ? val.substring(0, 150) + '...' : val
      }
      return JSON.stringify(val)
    }

    if (oldEmpty && !newEmpty) {
      formatted.push({
        field: fieldName,
        type: 'added',
        newValue: formatValue(newVal),
      })
    } else if (!oldEmpty && newEmpty) {
      formatted.push({
        field: fieldName,
        type: 'removed',
        oldValue: formatValue(oldVal),
      })
    } else {
      formatted.push({
        field: fieldName,
        type: 'changed',
        oldValue: formatValue(oldVal),
        newValue: formatValue(newVal),
      })
    }
  }

  return formatted
}

// Get action-specific context message
function getActionContext(action: string, metadata: Record<string, unknown> | null): string | null {
  if (!metadata) return null

  if (action === 'share.create') {
    const type = metadata.share_type as string
    return `Shared ${type} with ${metadata.sections_included ? (metadata.sections_included as string[]).length : 'all'} sections`
  }
  if (action === 'share.revoke') {
    return `Revoked ${metadata.share_type} share link`
  }
  if (action === 'data.import') {
    return `Imported ${metadata.imported || 0} characters, updated ${metadata.updated || 0}`
  }
  if (action === 'character.image_change' && metadata.type === 'ai_enhancement') {
    return 'AI-enhanced character image'
  }
  if (action === 'session.create' || action === 'session.delete') {
    return metadata.campaign_name ? `Campaign: ${metadata.campaign_name}` : null
  }

  return null
}

export default function ActivityLogPage() {
  const [activities, setActivities] = useState<ActivityLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string | null>(null)
  const [days, setDays] = useState(30)
  const [stats, setStats] = useState<{ byType: Record<string, number>; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLive, setIsLive] = useState(false)

  const supabase = createClient()

  const loadActivity = useCallback(async () => {
    setLoading(true)
    setError(null)
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
      } else {
        const errData = await res.json().catch(() => ({}))
        setError(errData.error || 'Failed to load activity')
      }
    } catch (err) {
      console.error('Failed to load activity:', err)
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }, [filter, days])

  useEffect(() => {
    loadActivity()
  }, [loadActivity])

  // Real-time subscription for new activity
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      channel = supabase
        .channel('activity-log-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'activity_log',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            // Add new activity to the top of the list
            const newActivity = payload.new as ActivityLogEntry
            setActivities(prev => [newActivity, ...prev])
            // Update stats
            setStats(prev => {
              if (!prev) return { total: 1, byType: { [newActivity.entity_type]: 1 } }
              return {
                total: prev.total + 1,
                byType: {
                  ...prev.byType,
                  [newActivity.entity_type]: (prev.byType[newActivity.entity_type] || 0) + 1,
                },
              }
            })
          }
        )
        .subscribe((status) => {
          setIsLive(status === 'SUBSCRIBED')
        })
    }

    setupRealtime()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [supabase])

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
        <div className="flex items-center gap-3">
          {isLive && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span className="text-xs font-medium text-emerald-400">Live</span>
            </div>
          )}
          <button
            onClick={loadActivity}
            disabled={loading}
            className="btn btn-secondary"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-400">{error}</p>
            <p className="text-xs text-red-400/70 mt-1">
              Make sure the activity_log table exists. Run migration 025 in Supabase.
            </p>
          </div>
        </div>
      )}

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
            className="bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2 text-sm text-[--text-primary] focus:outline-none focus:border-[--arcane-purple]"
            style={{ colorScheme: 'dark' }}
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
              <div className="space-y-3">
                {items.map((activity) => {
                  const Icon = ENTITY_TYPE_ICONS[activity.entity_type] || History
                  const colorClass = ENTITY_TYPE_COLORS[activity.entity_type] || 'text-gray-400 bg-gray-500/10'
                  const formattedChanges = formatChanges(activity.changes)
                  const actionContext = getActionContext(activity.action, activity.metadata)

                  return (
                    <div
                      key={activity.id}
                      className="card p-4 hover:border-[--arcane-purple]/30 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', colorClass)}>
                          <Icon className="w-6 h-6" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {/* Header row: Action + Entity Name */}
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-sm font-semibold text-[--text-primary]">
                              {formatActivityAction(activity.action)}
                            </span>
                          </div>

                          {/* Entity name as main subject */}
                          {activity.entity_name && (
                            <p className="text-base font-medium text-[--arcane-purple] mb-1">
                              {activity.entity_name}
                            </p>
                          )}

                          {/* Action-specific context */}
                          {actionContext && (
                            <p className="text-xs text-[--text-secondary] mb-2">
                              {actionContext}
                            </p>
                          )}

                          {/* Changes with before/after */}
                          {formattedChanges.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {formattedChanges.map((change, idx) => (
                                <div key={idx} className="text-xs">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-[--text-secondary] capitalize">{change.field}</span>
                                    <span className={cn(
                                      'px-1.5 py-0.5 rounded text-[10px] font-medium',
                                      change.type === 'added' && 'bg-green-500/20 text-green-400',
                                      change.type === 'removed' && 'bg-red-500/20 text-red-400',
                                      change.type === 'changed' && 'bg-amber-500/20 text-amber-400'
                                    )}>
                                      {change.type}
                                    </span>
                                  </div>
                                  {change.type === 'changed' && (
                                    <div className="pl-2 border-l-2 border-white/10 space-y-1">
                                      <p className="text-red-400/70">
                                        <span className="text-red-400/50 mr-1">−</span>
                                        {change.oldValue}
                                      </p>
                                      <p className="text-green-400/70">
                                        <span className="text-green-400/50 mr-1">+</span>
                                        {change.newValue}
                                      </p>
                                    </div>
                                  )}
                                  {change.type === 'added' && (
                                    <p className="pl-2 border-l-2 border-green-500/30 text-green-400/70">
                                      {change.newValue}
                                    </p>
                                  )}
                                  {change.type === 'removed' && (
                                    <p className="pl-2 border-l-2 border-red-500/30 text-red-400/70 line-through">
                                      {change.oldValue}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Timestamp */}
                          <p className="text-xs text-[--text-tertiary] mt-3">
                            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
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

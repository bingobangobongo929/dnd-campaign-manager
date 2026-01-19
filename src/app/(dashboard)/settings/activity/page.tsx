'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  History,
  User,
  Map,
  BookOpen,
  Scroll,
  Share2,
  Zap,
  RefreshCw,
  AlertCircle,
  Radio,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  ImageIcon,
  Upload,
  Download,
  Sparkles,
  Link2,
  Move,
  Maximize2,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { cn } from '@/lib/utils'
import { type ActivityAction } from '@/lib/activity-log'
import { createClient } from '@/lib/supabase/client'
import { BackToTopButton } from '@/components/ui/back-to-top'
import { MobileLayout, MobileBottomSheet } from '@/components/mobile'
import { useIsMobile } from '@/hooks'
import { Spinner } from '@/components/ui'

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

// Entity type colors - subtle background tints
const ENTITY_COLORS: Record<string, { dot: string; bg: string }> = {
  character: { dot: 'bg-purple-400', bg: 'bg-purple-500/5' },
  campaign: { dot: 'bg-blue-400', bg: 'bg-blue-500/5' },
  session: { dot: 'bg-green-400', bg: 'bg-green-500/5' },
  oneshot: { dot: 'bg-amber-400', bg: 'bg-amber-500/5' },
  share: { dot: 'bg-pink-400', bg: 'bg-pink-500/5' },
  canvas_group: { dot: 'bg-cyan-400', bg: 'bg-cyan-500/5' },
}

// Get a simple action verb for the timeline
function getActionVerb(action: ActivityAction): { verb: string; icon: typeof Plus; color: string } {
  const map: Record<string, { verb: string; icon: typeof Plus; color: string }> = {
    'character.create': { verb: 'Created', icon: Plus, color: 'text-green-400' },
    'character.edit': { verb: 'Edited', icon: Pencil, color: 'text-amber-400' },
    'character.delete': { verb: 'Deleted', icon: Trash2, color: 'text-red-400' },
    'character.image_change': { verb: 'Updated image for', icon: ImageIcon, color: 'text-purple-400' },
    'campaign.create': { verb: 'Created', icon: Plus, color: 'text-green-400' },
    'campaign.edit': { verb: 'Edited', icon: Pencil, color: 'text-amber-400' },
    'campaign.delete': { verb: 'Deleted', icon: Trash2, color: 'text-red-400' },
    'session.create': { verb: 'Added session to', icon: Plus, color: 'text-green-400' },
    'session.edit': { verb: 'Updated session in', icon: Pencil, color: 'text-amber-400' },
    'session.delete': { verb: 'Removed session from', icon: Trash2, color: 'text-red-400' },
    'oneshot.create': { verb: 'Created', icon: Plus, color: 'text-green-400' },
    'oneshot.edit': { verb: 'Edited', icon: Pencil, color: 'text-amber-400' },
    'oneshot.delete': { verb: 'Deleted', icon: Trash2, color: 'text-red-400' },
    'canvas.character_move': { verb: 'Moved', icon: Move, color: 'text-blue-400' },
    'canvas.character_resize': { verb: 'Resized', icon: Maximize2, color: 'text-blue-400' },
    'canvas.group_create': { verb: 'Created group in', icon: Plus, color: 'text-green-400' },
    'canvas.group_edit': { verb: 'Edited group in', icon: Pencil, color: 'text-amber-400' },
    'canvas.group_delete': { verb: 'Deleted group from', icon: Trash2, color: 'text-red-400' },
    'share.create': { verb: 'Shared', icon: Link2, color: 'text-pink-400' },
    'share.revoke': { verb: 'Unshared', icon: Link2, color: 'text-red-400' },
    'data.export': { verb: 'Exported', icon: Download, color: 'text-blue-400' },
    'data.import': { verb: 'Imported', icon: Upload, color: 'text-green-400' },
    'ai.generate_image': { verb: 'Generated image with AI for', icon: Sparkles, color: 'text-purple-400' },
    'ai.analyze': { verb: 'Analyzed with AI', icon: Sparkles, color: 'text-purple-400' },
  }
  return map[action] || { verb: 'Updated', icon: Pencil, color: 'text-gray-400' }
}

// Get entity type label
function getEntityLabel(type: string): string {
  const labels: Record<string, string> = {
    character: 'character',
    campaign: 'campaign',
    session: 'session',
    oneshot: 'one-shot',
    share: 'share',
    canvas_group: 'canvas',
  }
  return labels[type] || type
}

// Format field changes for expandable details
function getChangeSummary(changes: Record<string, { old?: unknown; new?: unknown }> | null): string[] {
  if (!changes) return []
  return Object.keys(changes).map(field => field.replace(/_/g, ' '))
}

// Timeline item component - clean, scannable design
function TimelineItem({ activity, isLast }: { activity: ActivityLogEntry; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const { verb, icon: Icon, color } = getActionVerb(activity.action)
  const entityColor = ENTITY_COLORS[activity.entity_type] || { dot: 'bg-gray-400', bg: 'bg-gray-500/5' }
  const changedFields = getChangeSummary(activity.changes)
  const hasDetails = changedFields.length > 0

  return (
    <div className="relative flex gap-4">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-[11px] top-7 bottom-0 w-px bg-white/[0.06]" />
      )}

      {/* Dot */}
      <div className={cn('w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5', entityColor.bg)}>
        <div className={cn('w-2 h-2 rounded-full', entityColor.dot)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-6">
        {/* Main line - the key scannable info */}
        <div className="flex items-start gap-2">
          <p className="text-sm text-gray-300 leading-relaxed">
            <span className={cn('font-medium', color)}>{verb}</span>
            {' '}
            {activity.entity_name ? (
              <span className="text-white font-medium">{activity.entity_name}</span>
            ) : (
              <span className="text-gray-400">{getEntityLabel(activity.entity_type)}</span>
            )}
          </p>
        </div>

        {/* Timestamp + expand button */}
        <div className="flex items-center gap-3 mt-1">
          <time
            className="text-xs text-gray-500"
            title={format(new Date(activity.created_at), 'PPpp')}
          >
            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
          </time>

          {hasDetails && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              <span>{changedFields.length} field{changedFields.length !== 1 ? 's' : ''} changed</span>
              <ChevronDown className={cn('w-3 h-3 transition-transform', expanded && 'rotate-180')} />
            </button>
          )}
        </div>

        {/* Expandable details */}
        {expanded && hasDetails && (
          <div className="mt-3 pl-3 border-l-2 border-white/[0.06] space-y-1">
            {changedFields.map((field, idx) => (
              <p key={idx} className="text-xs text-gray-500 capitalize">{field}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ActivityLogPage() {
  const isMobile = useIsMobile()
  const [activities, setActivities] = useState<ActivityLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string | null>(null)
  const [days, setDays] = useState(30)
  const [stats, setStats] = useState<{ byType: Record<string, number>; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLive, setIsLive] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)

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

  // Filter pill options
  const filterOptions = [
    { key: null, label: 'All' },
    { key: 'character', label: 'Characters' },
    { key: 'campaign', label: 'Campaigns' },
    { key: 'session', label: 'Sessions' },
    { key: 'oneshot', label: 'One-shots' },
    { key: 'share', label: 'Shares' },
  ]

  // ============ MOBILE LAYOUT ============
  if (isMobile) {
    return (
      <MobileLayout
        title="Activity"
        showBackButton
        backHref="/settings"
        actions={
          <button onClick={() => setIsFilterOpen(true)} className="p-2 rounded-lg active:bg-white/10">
            <History className="w-5 h-5 text-gray-400" />
          </button>
        }
      >
        <div className="px-4 pb-24">
          {/* Live indicator - subtle */}
          {isLive && (
            <div className="flex items-center gap-2 mb-4">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-400">Live</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Filter Pills - horizontal scroll */}
          <div className="flex gap-2 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-none">
            {filterOptions.map(opt => (
              <button
                key={opt.key || 'all'}
                onClick={() => setFilter(opt.key)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                  filter === opt.key
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : 'bg-white/[0.03] text-gray-400 border border-white/[0.06]'
                )}
              >
                {opt.label}
                {opt.key && stats?.byType[opt.key] ? ` (${stats.byType[opt.key]})` : ''}
              </button>
            ))}
          </div>

          {/* Activity Timeline */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-16">
              <History className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No activity yet</p>
              <p className="text-xs text-gray-600 mt-1">Activity will appear as you make changes</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedActivities).map(([date, items]) => (
                <div key={date}>
                  <h3 className="text-xs font-medium text-gray-500 mb-4 sticky top-0 bg-[--bg-primary] py-2 -mt-2">{date}</h3>
                  <div>
                    {items.map((activity, idx) => (
                      <TimelineItem
                        key={activity.id}
                        activity={activity}
                        isLast={idx === items.length - 1}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Filter Bottom Sheet */}
        <MobileBottomSheet
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="Options"
        >
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 mb-2 block">Time Period</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 7, label: '7 days' },
                  { value: 30, label: '30 days' },
                  { value: 90, label: '90 days' },
                  { value: 365, label: '1 year' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setDays(opt.value)}
                    className={cn(
                      'py-3 rounded-xl text-sm font-medium transition-colors',
                      days === opt.value
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : 'bg-white/[0.03] text-gray-400 border border-white/[0.06]'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => { loadActivity(); setIsFilterOpen(false) }}
              className="w-full flex items-center justify-center gap-2 py-3 bg-purple-600 active:bg-purple-500 text-white font-medium rounded-xl"
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
              Refresh
            </button>
          </div>
        </MobileBottomSheet>
      </MobileLayout>
    )
  }

  // ============ DESKTOP LAYOUT ============
  return (
    <>
      {/* Page Header - simplified */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[--arcane-purple] to-indigo-600 flex items-center justify-center">
            <History className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="page-title">Activity</h1>
            <p className="page-subtitle">Your recent changes</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isLive && (
            <div className="flex items-center gap-2 px-2.5 py-1 bg-emerald-500/10 rounded-full">
              <Radio className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-400">Live</span>
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

      {/* Clean filter bar */}
      <div className="flex items-center justify-between gap-4 mb-8">
        {/* Filter pills */}
        <div className="flex gap-2 flex-wrap">
          {filterOptions.map(opt => (
            <button
              key={opt.key || 'all'}
              onClick={() => setFilter(opt.key)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                filter === opt.key
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'bg-white/[0.03] text-gray-400 border border-white/[0.06] hover:border-white/10'
              )}
            >
              {opt.label}
              {opt.key && stats?.byType[opt.key] ? ` (${stats.byType[opt.key]})` : ''}
            </button>
          ))}
        </div>

        {/* Time period selector */}
        <select
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value))}
          className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-purple-500/50"
          style={{ colorScheme: 'dark' }}
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last year</option>
        </select>
      </div>

      {/* Activity Timeline */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-20">
          <History className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No activity yet</h3>
          <p className="text-sm text-gray-500">
            Activity will appear here as you create and edit content.
          </p>
        </div>
      ) : (
        <div className="max-w-2xl">
          {Object.entries(groupedActivities).map(([date, items]) => (
            <div key={date} className="mb-8">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">{date}</h3>
              <div className="pl-2">
                {items.map((activity, idx) => (
                  <TimelineItem
                    key={activity.id}
                    activity={activity}
                    isLast={idx === items.length - 1}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <BackToTopButton />
    </>
  )
}

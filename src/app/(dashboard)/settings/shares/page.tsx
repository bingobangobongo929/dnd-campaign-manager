'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Share2,
  Eye,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  Loader2,
  Users,
  TrendingUp,
  Clock,
  Filter,
  ChevronDown,
  ChevronUp,
  Link2,
  User,
  Scroll,
  Map,
  Calendar,
  BarChart3,
  AlertCircle,
  ArrowLeft,
  StickyNote,
  Activity,
  Zap,
  Monitor,
  Smartphone,
  Globe,
  RefreshCw,
  Flame,
  Crown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { Modal } from '@/components/ui'
import { formatDate, formatDistanceToNow } from '@/lib/utils'
import Link from 'next/link'
import Image from 'next/image'
import { getInitials } from '@/lib/utils'

interface ShareData {
  id: string
  share_code: string
  type: 'character' | 'oneshot' | 'campaign'
  item_id: string
  item_name: string
  item_image?: string | null
  included_sections: Record<string, boolean>
  expires_at: string | null
  view_count: number
  last_viewed_at: string | null
  note: string | null
  created_at: string
  is_expired: boolean
  unique_viewers?: number
  views_last_7_days?: number
  views_last_30_days?: number
}

interface ShareSummary {
  total_shares: number
  active_shares: number
  expired_shares: number
  total_views: number
  total_unique_viewers: number
  views_last_7_days: number
  views_last_30_days: number
  viewing_now: number
  views_last_hour: number
  by_type: {
    character: number
    oneshot: number
    campaign: number
  }
}

interface DailyView {
  date: string
  views: number
}

interface TrendingShare {
  id: string
  item_name: string
  type: 'character' | 'oneshot' | 'campaign'
  views_last_7_days: number
  item_image: string | null
}

interface PopularShare {
  id: string
  item_name: string
  type: 'character' | 'oneshot' | 'campaign'
  view_count: number
  item_image: string | null
}

interface RecentActivity {
  share_id: string
  share_type: string
  item_name: string
  viewed_at: string
}

interface ViewHistory {
  total_views: number
  unique_viewers: number
  viewing_now: number
  views_last_hour: number
  views_last_24_hours: number
  week_over_week_change: number
  this_week_views: number
  last_week_views: number
  chart_data: Array<{ date: string; views: number; unique_viewers: number }>
  hourly_views: number[]
  peak_hour: string
  top_referrers: Array<{ domain: string; count: number }>
  device_stats: Array<{ device: string; count: number }>
  browser_stats: Array<{ browser: string; count: number }>
  recent_views: Array<{ time: string; device: string; referrer: string | null }>
}

const TYPE_ICONS = {
  character: User,
  oneshot: Scroll,
  campaign: Map,
}

const TYPE_COLORS = {
  character: 'text-purple-400 bg-purple-500/15',
  oneshot: 'text-amber-400 bg-amber-500/15',
  campaign: 'text-blue-400 bg-blue-500/15',
}

const TYPE_LABELS = {
  character: 'Character',
  oneshot: 'One-Shot',
  campaign: 'Campaign',
}

const DEVICE_ICONS: Record<string, React.ElementType> = {
  Desktop: Monitor,
  Mobile: Smartphone,
  Tablet: Smartphone,
  Bot: Globe,
  Unknown: Globe,
}

// Mini bar chart component (CSS-based)
function MiniBarChart({ data, height = 60 }: { data: DailyView[]; height?: number }) {
  const maxViews = Math.max(...data.map(d => d.views), 1)

  return (
    <div className="flex items-end gap-[2px]" style={{ height }}>
      {data.map((day, i) => {
        const barHeight = (day.views / maxViews) * 100
        const isToday = i === data.length - 1
        return (
          <div
            key={day.date}
            className="group relative flex-1 min-w-[4px]"
            style={{ height: '100%' }}
          >
            <div
              className={`absolute bottom-0 left-0 right-0 rounded-t transition-all ${
                isToday ? 'bg-purple-500' : 'bg-purple-500/40 group-hover:bg-purple-500/60'
              }`}
              style={{ height: `${Math.max(barHeight, 2)}%` }}
            />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#1a1a1f] border border-white/10 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
              {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: {day.views} views
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Larger chart for modal
function ViewsChart({ data, height = 120 }: { data: Array<{ date: string; views: number; unique_viewers: number }>; height?: number }) {
  const maxViews = Math.max(...data.map(d => d.views), 1)

  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((day, i) => {
        const barHeight = (day.views / maxViews) * 100
        const uniqueHeight = (day.unique_viewers / maxViews) * 100
        return (
          <div
            key={day.date}
            className="group relative flex-1 min-w-[8px]"
            style={{ height: '100%' }}
          >
            {/* Total views bar */}
            <div
              className="absolute bottom-0 left-0 right-0 bg-purple-500/30 rounded-t transition-all"
              style={{ height: `${Math.max(barHeight, 1)}%` }}
            />
            {/* Unique viewers bar */}
            <div
              className="absolute bottom-0 left-0 right-0 bg-purple-500 rounded-t transition-all"
              style={{ height: `${Math.max(uniqueHeight, 1)}%` }}
            />
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1.5 bg-[#1a1a1f] border border-white/10 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
              <div className="text-white font-medium">
                {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
              <div className="text-gray-400">{day.views} views</div>
              <div className="text-purple-400">{day.unique_viewers} unique</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Hourly heatmap component
function HourlyHeatmap({ data }: { data: number[] }) {
  const maxViews = Math.max(...data, 1)

  return (
    <div className="grid grid-cols-12 gap-1">
      {data.map((views, hour) => {
        const intensity = views / maxViews
        const isAM = hour < 12
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
        return (
          <div
            key={hour}
            className="group relative aspect-square rounded"
            style={{
              backgroundColor: intensity > 0
                ? `rgba(168, 85, 247, ${0.1 + intensity * 0.8})`
                : 'rgba(255,255,255,0.02)',
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center text-[9px] text-gray-500">
              {displayHour}{isAM ? 'a' : 'p'}
            </div>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-[#1a1a1f] border border-white/10 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
              {displayHour}:00 {isAM ? 'AM' : 'PM'}: {views} views
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Progress bar for stats
function StatBar({ value, max, color = 'purple' }: { value: number; max: number; color?: string }) {
  const percentage = max > 0 ? (value / max) * 100 : 0
  const colors: Record<string, string> = {
    purple: 'bg-purple-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    amber: 'bg-amber-500',
  }
  return (
    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
      <div
        className={`h-full ${colors[color]} rounded-full transition-all duration-500`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}

export default function SharesPage() {
  const [shares, setShares] = useState<ShareData[]>([])
  const [summary, setSummary] = useState<ShareSummary | null>(null)
  const [dailyViews, setDailyViews] = useState<DailyView[]>([])
  const [trendingShares, setTrendingShares] = useState<TrendingShare[]>([])
  const [popularShares, setPopularShares] = useState<PopularShare[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [typeFilter, setTypeFilter] = useState<'all' | 'character' | 'oneshot' | 'campaign'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all')

  // Expanded rows for details
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<ShareData | null>(null)
  const [deleting, setDeleting] = useState(false)

  // View history modal
  const [viewHistoryShare, setViewHistoryShare] = useState<ShareData | null>(null)
  const [viewHistory, setViewHistory] = useState<ViewHistory | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Auto-refresh
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadShares = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setIsRefreshing(true)
    setError(null)
    try {
      const res = await fetch('/api/shares')
      if (!res.ok) throw new Error('Failed to load shares')
      const data = await res.json()
      setShares(data.shares || [])
      setSummary(data.summary || null)
      setDailyViews(data.daily_views || [])
      setTrendingShares(data.trending_shares || [])
      setPopularShares(data.popular_shares || [])
      setRecentActivity(data.recent_activity || [])
      setLastRefresh(new Date())
    } catch (err) {
      setError('Failed to load shares. Please try again.')
      console.error('Load shares error:', err)
    }
    if (!silent) setLoading(false)
    setIsRefreshing(false)
  }, [])

  useEffect(() => {
    loadShares()

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => loadShares(true), 30000)
    return () => clearInterval(interval)
  }, [loadShares])

  const loadViewHistory = async (share: ShareData) => {
    setViewHistoryShare(share)
    setLoadingHistory(true)
    try {
      const res = await fetch(`/api/shares/${share.id}/views?type=${share.type}`)
      if (res.ok) {
        const data = await res.json()
        setViewHistory(data)
      }
    } catch (err) {
      console.error('Load view history error:', err)
    }
    setLoadingHistory(false)
  }

  const copyLink = async (share: ShareData) => {
    const url = share.type === 'character'
      ? `${window.location.origin}/share/c/${share.share_code}`
      : share.type === 'oneshot'
        ? `${window.location.origin}/share/oneshot/${share.share_code}`
        : `${window.location.origin}/share/campaign/${share.share_code}`

    await navigator.clipboard.writeText(url)
    setCopiedId(share.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const deleteShare = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/shares?id=${deleteTarget.id}&type=${deleteTarget.type}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setShares(prev => prev.filter(s => s.id !== deleteTarget.id))
        if (summary) {
          setSummary({
            ...summary,
            total_shares: summary.total_shares - 1,
            active_shares: deleteTarget.is_expired ? summary.active_shares : summary.active_shares - 1,
            expired_shares: deleteTarget.is_expired ? summary.expired_shares - 1 : summary.expired_shares,
          })
        }
      }
    } catch (err) {
      console.error('Delete share error:', err)
    }
    setDeleting(false)
    setDeleteTarget(null)
  }

  // Filter shares
  const filteredShares = shares.filter(share => {
    if (typeFilter !== 'all' && share.type !== typeFilter) return false
    if (statusFilter === 'active' && share.is_expired) return false
    if (statusFilter === 'expired' && !share.is_expired) return false
    return true
  })

  const getShareUrl = (share: ShareData) => {
    if (share.type === 'character') return `/share/c/${share.share_code}`
    if (share.type === 'oneshot') return `/share/oneshot/${share.share_code}`
    return `/share/campaign/${share.share_code}`
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="page-header">
          <div className="flex items-center gap-4">
            <Link
              href="/settings"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </Link>
            <div className="flex-1">
              <h1 className="page-title flex items-center gap-3">
                <Share2 className="w-8 h-8 text-purple-400" />
                Share Analytics
              </h1>
              <p className="page-subtitle">Track views and engagement on your shared content</p>
            </div>
            <button
              onClick={() => loadShares(true)}
              disabled={isRefreshing}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw className={`w-5 h-5 text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        ) : error ? (
          <div className="card p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-400 mb-4">{error}</p>
            <button onClick={() => loadShares()} className="btn btn-primary">
              Try Again
            </button>
          </div>
        ) : (
          <>
            {/* Real-time Activity Banner */}
            {summary && summary.viewing_now > 0 && (
              <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-500 animate-ping" />
                  </div>
                  <span className="text-green-400 font-medium">
                    {summary.viewing_now} {summary.viewing_now === 1 ? 'person' : 'people'} viewing your content right now
                  </span>
                </div>
              </div>
            )}

            {/* Summary Stats Grid */}
            {summary && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
                <div className="card p-4">
                  <Share2 className="w-5 h-5 text-purple-400 mb-2" />
                  <p className="text-2xl font-bold text-white">{summary.active_shares}</p>
                  <p className="text-xs text-gray-500">Active Links</p>
                </div>
                <div className="card p-4">
                  <Eye className="w-5 h-5 text-blue-400 mb-2" />
                  <p className="text-2xl font-bold text-white">{summary.total_views}</p>
                  <p className="text-xs text-gray-500">Total Views</p>
                </div>
                <div className="card p-4">
                  <Users className="w-5 h-5 text-green-400 mb-2" />
                  <p className="text-2xl font-bold text-white">{summary.total_unique_viewers}</p>
                  <p className="text-xs text-gray-500">Unique Viewers</p>
                </div>
                <div className="card p-4">
                  <Activity className="w-5 h-5 text-amber-400 mb-2" />
                  <p className="text-2xl font-bold text-white">{summary.views_last_hour}</p>
                  <p className="text-xs text-gray-500">Last Hour</p>
                </div>
                <div className="card p-4">
                  <TrendingUp className="w-5 h-5 text-cyan-400 mb-2" />
                  <p className="text-2xl font-bold text-white">{summary.views_last_7_days}</p>
                  <p className="text-xs text-gray-500">This Week</p>
                </div>
                <div className="card p-4">
                  <Calendar className="w-5 h-5 text-pink-400 mb-2" />
                  <p className="text-2xl font-bold text-white">{summary.views_last_30_days}</p>
                  <p className="text-xs text-gray-500">This Month</p>
                </div>
              </div>
            )}

            {/* Views Chart & Activity Section */}
            <div className="grid lg:grid-cols-3 gap-6 mb-8">
              {/* Views Over Time Chart */}
              <div className="lg:col-span-2 card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-purple-400" />
                    Views (Last 14 Days)
                  </h3>
                  <span className="text-xs text-gray-500">
                    Updated {formatDistanceToNow(lastRefresh)}
                  </span>
                </div>
                {dailyViews.length > 0 ? (
                  <MiniBarChart data={dailyViews} height={80} />
                ) : (
                  <div className="h-20 flex items-center justify-center text-gray-500 text-sm">
                    No view data yet
                  </div>
                )}
              </div>

              {/* Recent Activity Feed */}
              <div className="card p-5">
                <h3 className="font-medium text-white flex items-center gap-2 mb-4">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Live Activity
                </h3>
                {recentActivity.length > 0 ? (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {recentActivity.slice(0, 8).map((activity, i) => (
                      <div
                        key={`${activity.share_id}-${activity.viewed_at}-${i}`}
                        className="flex items-center gap-2 text-sm p-2 rounded-lg bg-white/[0.02]"
                      >
                        <div className={`w-6 h-6 rounded flex items-center justify-center ${TYPE_COLORS[activity.share_type as keyof typeof TYPE_COLORS]}`}>
                          {(() => {
                            const Icon = TYPE_ICONS[activity.share_type as keyof typeof TYPE_ICONS]
                            return <Icon className="w-3 h-3" />
                          })()}
                        </div>
                        <span className="flex-1 truncate text-gray-400">
                          {activity.item_name}
                        </span>
                        <span className="text-xs text-gray-600">
                          {formatDistanceToNow(activity.viewed_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-32 flex items-center justify-center text-gray-500 text-sm">
                    No recent activity
                  </div>
                )}
              </div>
            </div>

            {/* Trending & Popular */}
            {(trendingShares.length > 0 || popularShares.length > 0) && (
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                {/* Trending */}
                {trendingShares.length > 0 && (
                  <div className="card p-5">
                    <h3 className="font-medium text-white flex items-center gap-2 mb-4">
                      <Flame className="w-4 h-4 text-orange-400" />
                      Trending This Week
                    </h3>
                    <div className="space-y-2">
                      {trendingShares.map((share, i) => (
                        <div
                          key={share.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.02] transition-colors"
                        >
                          <span className="w-5 text-sm font-bold text-gray-500">#{i + 1}</span>
                          {share.item_image ? (
                            <Image
                              src={share.item_image}
                              alt=""
                              width={32}
                              height={32}
                              className="w-8 h-8 rounded object-cover"
                            />
                          ) : (
                            <div className={`w-8 h-8 rounded flex items-center justify-center ${TYPE_COLORS[share.type]}`}>
                              {(() => {
                                const Icon = TYPE_ICONS[share.type]
                                return <Icon className="w-4 h-4" />
                              })()}
                            </div>
                          )}
                          <span className="flex-1 truncate text-gray-300">{share.item_name}</span>
                          <span className="text-sm text-purple-400 font-medium">
                            {share.views_last_7_days} views
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Most Popular */}
                {popularShares.length > 0 && (
                  <div className="card p-5">
                    <h3 className="font-medium text-white flex items-center gap-2 mb-4">
                      <Crown className="w-4 h-4 text-yellow-400" />
                      Most Popular
                    </h3>
                    <div className="space-y-2">
                      {popularShares.map((share, i) => (
                        <div
                          key={share.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.02] transition-colors"
                        >
                          <span className="w-5 text-sm font-bold text-gray-500">#{i + 1}</span>
                          {share.item_image ? (
                            <Image
                              src={share.item_image}
                              alt=""
                              width={32}
                              height={32}
                              className="w-8 h-8 rounded object-cover"
                            />
                          ) : (
                            <div className={`w-8 h-8 rounded flex items-center justify-center ${TYPE_COLORS[share.type]}`}>
                              {(() => {
                                const Icon = TYPE_ICONS[share.type]
                                return <Icon className="w-4 h-4" />
                              })()}
                            </div>
                          )}
                          <span className="flex-1 truncate text-gray-300">{share.item_name}</span>
                          <span className="text-sm text-blue-400 font-medium">
                            {share.view_count} total
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-500">Filter:</span>
              </div>

              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
                className="px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500/50"
              >
                <option value="all">All Types</option>
                <option value="character">Characters</option>
                <option value="oneshot">One-Shots</option>
                <option value="campaign">Campaigns</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500/50"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
              </select>

              {/* Results count */}
              <span className="text-sm text-gray-500 ml-auto">
                {filteredShares.length} {filteredShares.length === 1 ? 'link' : 'links'}
              </span>
            </div>

            {/* Shares List */}
            {filteredShares.length === 0 ? (
              <div className="card p-12 text-center">
                <Share2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-400 mb-2">No shared links</h3>
                <p className="text-sm text-gray-600">
                  {shares.length === 0
                    ? "You haven't shared anything yet. Share a character, one-shot, or campaign to see it here."
                    : "No links match your current filters."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredShares.map((share) => {
                  const TypeIcon = TYPE_ICONS[share.type]
                  const isExpanded = expandedId === share.id
                  const isCopied = copiedId === share.id

                  return (
                    <div
                      key={share.id}
                      className={`card overflow-hidden transition-all ${share.is_expired ? 'opacity-60' : ''}`}
                    >
                      {/* Main Row */}
                      <div className="p-4 flex items-center gap-4">
                        {/* Image/Icon */}
                        <div className="flex-shrink-0">
                          {share.item_image ? (
                            <Image
                              src={share.item_image}
                              alt={share.item_name}
                              width={48}
                              height={48}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${TYPE_COLORS[share.type]}`}>
                              {share.type === 'character' ? (
                                <span className="text-lg font-bold">{getInitials(share.item_name)}</span>
                              ) : (
                                <TypeIcon className="w-6 h-6" />
                              )}
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-white truncate">{share.item_name}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLORS[share.type]}`}>
                              {TYPE_LABELS[share.type]}
                            </span>
                            {share.is_expired && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">
                                Expired
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            {share.note && (
                              <span className="flex items-center gap-1 text-gray-400">
                                <StickyNote className="w-3 h-3" />
                                {share.note}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {share.view_count} views
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Created {formatDistanceToNow(share.created_at)}
                            </span>
                            {share.last_viewed_at && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Last viewed {formatDistanceToNow(share.last_viewed_at)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => copyLink(share)}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                            title="Copy link"
                          >
                            {isCopied ? (
                              <Check className="w-4 h-4 text-green-400" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                          <a
                            href={getShareUrl(share)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                            title="Open link"
                          >
                            <ExternalLink className="w-4 h-4 text-gray-400" />
                          </a>
                          <button
                            onClick={() => loadViewHistory(share)}
                            className="p-2 rounded-lg bg-white/5 hover:bg-purple-500/20 transition-colors"
                            title="View analytics"
                          >
                            <BarChart3 className="w-4 h-4 text-gray-400 hover:text-purple-400" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(share)}
                            className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 transition-colors"
                            title="Revoke link"
                          >
                            <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />
                          </button>
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : share.id)}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                            title={isExpanded ? 'Hide details' : 'Show details'}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-0 border-t border-white/5">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
                            <div className="text-center p-3 rounded-lg bg-white/5">
                              <p className="text-xl font-bold text-white">{share.view_count}</p>
                              <p className="text-xs text-gray-500">Total Views</p>
                            </div>
                            <div className="text-center p-3 rounded-lg bg-white/5">
                              <p className="text-xl font-bold text-white">{share.unique_viewers || 0}</p>
                              <p className="text-xs text-gray-500">Unique Viewers</p>
                            </div>
                            <div className="text-center p-3 rounded-lg bg-white/5">
                              <p className="text-xl font-bold text-white">{share.views_last_7_days || 0}</p>
                              <p className="text-xs text-gray-500">Views (7 days)</p>
                            </div>
                            <div className="text-center p-3 rounded-lg bg-white/5">
                              <p className="text-xl font-bold text-white">{share.views_last_30_days || 0}</p>
                              <p className="text-xs text-gray-500">Views (30 days)</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Share Code:</span>
                              <span className="ml-2 font-mono text-purple-400">{share.share_code}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Created:</span>
                              <span className="ml-2 text-white">{formatDate(share.created_at)}</span>
                            </div>
                            {share.expires_at && (
                              <div>
                                <span className="text-gray-500">Expires:</span>
                                <span className={`ml-2 ${share.is_expired ? 'text-red-400' : 'text-white'}`}>
                                  {formatDate(share.expires_at)}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Included Sections */}
                          {Object.keys(share.included_sections || {}).length > 0 && (
                            <div className="mt-4">
                              <p className="text-xs text-gray-500 mb-2">Included sections:</p>
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(share.included_sections)
                                  .filter(([_, enabled]) => enabled)
                                  .map(([key]) => (
                                    <span
                                      key={key}
                                      className="text-xs px-2 py-1 rounded bg-white/5 text-gray-400"
                                    >
                                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                                    </span>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Revoke Share Link?"
        description="This action cannot be undone"
      >
        <div className="space-y-4">
          <p className="text-gray-400">
            Are you sure you want to revoke the share link for <strong className="text-white">{deleteTarget?.item_name}</strong>?
          </p>
          <p className="text-sm text-gray-500">
            Anyone with this link will no longer be able to view it.
          </p>
          <div className="flex gap-3">
            <button
              className="btn btn-secondary flex-1"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </button>
            <button
              className="btn flex-1 bg-red-500 hover:bg-red-600 text-white"
              onClick={deleteShare}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Revoke Link
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Detailed Analytics Modal */}
      <Modal
        isOpen={!!viewHistoryShare}
        onClose={() => {
          setViewHistoryShare(null)
          setViewHistory(null)
        }}
        title={`Analytics: ${viewHistoryShare?.item_name}`}
        description="Detailed view statistics and insights"
        size="lg"
      >
        {loadingHistory ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
          </div>
        ) : viewHistory ? (
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
            {/* Real-time Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
                <div className="flex items-center gap-2 mb-1">
                  {viewHistory.viewing_now > 0 && (
                    <div className="relative">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-500 animate-ping" />
                    </div>
                  )}
                  <p className="text-xs text-green-400">Right Now</p>
                </div>
                <p className="text-2xl font-bold text-white">{viewHistory.viewing_now}</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5">
                <p className="text-xs text-gray-500 mb-1">Last Hour</p>
                <p className="text-2xl font-bold text-white">{viewHistory.views_last_hour}</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5">
                <p className="text-xs text-gray-500 mb-1">Last 24h</p>
                <p className="text-2xl font-bold text-white">{viewHistory.views_last_24_hours}</p>
              </div>
            </div>

            {/* Summary with Trend */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white/5">
                <p className="text-2xl font-bold text-white">{viewHistory.total_views}</p>
                <p className="text-xs text-gray-500">Total Views</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5">
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-white">{viewHistory.this_week_views}</p>
                  {viewHistory.week_over_week_change !== 0 && (
                    <span className={`flex items-center text-xs font-medium ${
                      viewHistory.week_over_week_change > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {viewHistory.week_over_week_change > 0 ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3" />
                      )}
                      {Math.abs(viewHistory.week_over_week_change)}%
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">This Week vs Last</p>
              </div>
            </div>

            {/* Views Chart */}
            {viewHistory.chart_data.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-400">Views Over Time (30 Days)</h4>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-purple-500" />
                      Unique
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-purple-500/30" />
                      Total
                    </span>
                  </div>
                </div>
                <ViewsChart data={viewHistory.chart_data} height={100} />
              </div>
            )}

            {/* Hourly Activity Heatmap */}
            {viewHistory.hourly_views.some(v => v > 0) && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-400">Activity by Hour</h4>
                  <span className="text-xs text-gray-500">Peak: {viewHistory.peak_hour}</span>
                </div>
                <HourlyHeatmap data={viewHistory.hourly_views} />
              </div>
            )}

            {/* Device & Browser Stats */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Device Stats */}
              {viewHistory.device_stats.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Devices</h4>
                  <div className="space-y-2">
                    {viewHistory.device_stats.map(({ device, count }) => {
                      const Icon = DEVICE_ICONS[device] || Globe
                      const maxCount = viewHistory.device_stats[0]?.count || 1
                      return (
                        <div key={device}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="flex items-center gap-2 text-gray-400">
                              <Icon className="w-4 h-4" />
                              {device}
                            </span>
                            <span className="text-white">{count}</span>
                          </div>
                          <StatBar value={count} max={maxCount} color="purple" />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Traffic Sources */}
              {viewHistory.top_referrers.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Traffic Sources</h4>
                  <div className="space-y-2">
                    {viewHistory.top_referrers.slice(0, 5).map(({ domain, count }) => {
                      const maxCount = viewHistory.top_referrers[0]?.count || 1
                      return (
                        <div key={domain}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-400 truncate">{domain}</span>
                            <span className="text-white">{count}</span>
                          </div>
                          <StatBar value={count} max={maxCount} color="blue" />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Recent Activity Feed */}
            {viewHistory.recent_views.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-3">Recent Activity</h4>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {viewHistory.recent_views.map((view, i) => {
                    const Icon = DEVICE_ICONS[view.device] || Globe
                    return (
                      <div
                        key={`${view.time}-${i}`}
                        className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02] text-sm"
                      >
                        <Icon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <span className="text-gray-400 flex-1">
                          {view.referrer || 'Direct'}
                        </span>
                        <span className="text-xs text-gray-600">
                          {formatDistanceToNow(view.time)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No view history available yet.</p>
        )}
      </Modal>
    </AppLayout>
  )
}

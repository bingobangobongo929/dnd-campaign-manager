'use client'

import { useEffect, useState } from 'react'
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
  by_type: {
    character: number
    oneshot: number
    campaign: number
  }
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

export default function SharesPage() {
  const [shares, setShares] = useState<ShareData[]>([])
  const [summary, setSummary] = useState<ShareSummary | null>(null)
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
  const [viewHistory, setViewHistory] = useState<any>(null)
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    loadShares()
  }, [])

  const loadShares = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/shares')
      if (!res.ok) throw new Error('Failed to load shares')
      const data = await res.json()
      setShares(data.shares || [])
      setSummary(data.summary || null)
    } catch (err) {
      setError('Failed to load shares. Please try again.')
      console.error('Load shares error:', err)
    }
    setLoading(false)
  }

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
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="page-header">
          <div className="flex items-center gap-4">
            <Link
              href="/settings"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </Link>
            <div>
              <h1 className="page-title flex items-center gap-3">
                <Share2 className="w-8 h-8 text-purple-400" />
                Shared Links
              </h1>
              <p className="page-subtitle">Manage and track all your shared content</p>
            </div>
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
            <button onClick={loadShares} className="btn btn-primary">
              Try Again
            </button>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            {summary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                <div className="card p-4">
                  <Share2 className="w-5 h-5 text-purple-400 mb-2" />
                  <p className="text-2xl font-bold text-white">{summary.total_shares}</p>
                  <p className="text-xs text-gray-500">Total Links</p>
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
                  <TrendingUp className="w-5 h-5 text-amber-400 mb-2" />
                  <p className="text-2xl font-bold text-white">{summary.views_last_7_days}</p>
                  <p className="text-xs text-gray-500">Views (7 days)</p>
                </div>
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
                onChange={(e) => setTypeFilter(e.target.value as any)}
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
                onChange={(e) => setStatusFilter(e.target.value as any)}
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

                          {/* View History Button */}
                          <button
                            onClick={() => loadViewHistory(share)}
                            className="mt-4 flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-400 bg-purple-500/10 rounded-lg hover:bg-purple-500/20 transition-colors"
                          >
                            <BarChart3 className="w-4 h-4" />
                            View Analytics
                          </button>
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

      {/* View History Modal */}
      <Modal
        isOpen={!!viewHistoryShare}
        onClose={() => {
          setViewHistoryShare(null)
          setViewHistory(null)
        }}
        title={`Analytics: ${viewHistoryShare?.item_name}`}
        description="View history and traffic sources"
        size="lg"
      >
        {loadingHistory ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
          </div>
        ) : viewHistory ? (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white/5">
                <p className="text-2xl font-bold text-white">{viewHistory.total_views}</p>
                <p className="text-xs text-gray-500">Total Views (tracked)</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5">
                <p className="text-2xl font-bold text-white">{viewHistory.unique_viewers}</p>
                <p className="text-xs text-gray-500">Unique Viewers</p>
              </div>
            </div>

            {/* Chart Data (simplified list view) */}
            {viewHistory.chart_data?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-3">Views by Day</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {viewHistory.chart_data.slice(-14).reverse().map((day: any) => (
                    <div key={day.date} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                      <span className="text-sm text-gray-400">{formatDate(day.date)}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-white">{day.views} views</span>
                        <span className="text-sm text-gray-500">{day.unique_viewers} unique</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Referrers */}
            {viewHistory.top_referrers?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-3">Traffic Sources</h4>
                <div className="space-y-2">
                  {viewHistory.top_referrers.map((ref: any) => (
                    <div key={ref.domain} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                      <span className="text-sm text-gray-400">{ref.domain}</span>
                      <span className="text-sm text-white">{ref.count} visits</span>
                    </div>
                  ))}
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

'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import {
  Bug,
  Lightbulb,
  HelpCircle,
  Heart,
  RefreshCw,
  Loader2,
  Search,
  ChevronDown,
  X,
  MessageSquare,
  Image,
  Monitor,
  Globe,
  Clock,
  AlertTriangle,
  CheckCircle,
  Circle,
  PlayCircle,
  XCircle,
  Ban,
  Send,
  Eye,
  EyeOff,
  Trash2,
  ChevronRight,
  Download,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Feedback, FeedbackStatus, FeedbackType, FeedbackPriority } from '@/types/database'

type FeedbackListItem = Feedback & {
  attachment_count: number
  response_count: number
}

const TYPE_CONFIG: Record<FeedbackType, { icon: typeof Bug; color: string; label: string }> = {
  bug: { icon: Bug, color: 'text-red-400 bg-red-400/10', label: 'Bug' },
  feature: { icon: Lightbulb, color: 'text-amber-400 bg-amber-400/10', label: 'Feature' },
  question: { icon: HelpCircle, color: 'text-blue-400 bg-blue-400/10', label: 'Question' },
  praise: { icon: Heart, color: 'text-pink-400 bg-pink-400/10', label: 'Praise' },
}

const STATUS_CONFIG: Record<FeedbackStatus, { icon: typeof Circle; color: string; label: string }> = {
  new: { icon: Circle, color: 'text-blue-400 bg-blue-400/10 border-blue-400/30', label: 'New' },
  reviewing: { icon: Eye, color: 'text-purple-400 bg-purple-400/10 border-purple-400/30', label: 'Reviewing' },
  in_progress: { icon: PlayCircle, color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30', label: 'In Progress' },
  fixed: { icon: CheckCircle, color: 'text-green-400 bg-green-400/10 border-green-400/30', label: 'Fixed' },
  closed: { icon: XCircle, color: 'text-gray-400 bg-gray-400/10 border-gray-400/30', label: 'Closed' },
  wont_fix: { icon: Ban, color: 'text-red-400 bg-red-400/10 border-red-400/30', label: "Won't Fix" },
}

const PRIORITY_CONFIG: Record<FeedbackPriority, { color: string; label: string }> = {
  low: { color: 'text-gray-400', label: 'Low' },
  medium: { color: 'text-yellow-400', label: 'Medium' },
  high: { color: 'text-orange-400', label: 'High' },
  critical: { color: 'text-red-400', label: 'Critical' },
}

export default function AdminFeedbackPage() {
  const [feedback, setFeedback] = useState<FeedbackListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<{ total: number; byStatus: Record<string, number>; byType: Record<string, number> }>({
    total: 0,
    byStatus: {},
    byType: {},
  })

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Selected feedback detail
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback & { feedback_attachments: any[]; feedback_responses: any[] } | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Response form
  const [responseContent, setResponseContent] = useState('')
  const [isInternalNote, setIsInternalNote] = useState(false)
  const [sendingResponse, setSendingResponse] = useState(false)

  const loadFeedback = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (typeFilter !== 'all') params.set('type', typeFilter)
      if (priorityFilter !== 'all') params.set('priority', priorityFilter)
      if (searchQuery) params.set('search', searchQuery)

      const res = await fetch(`/api/admin/feedback?${params}`)
      if (!res.ok) throw new Error('Failed to load feedback')

      const data = await res.json()
      setFeedback(data.feedback || [])
      setStats(data.stats)
    } catch (err) {
      console.error('Failed to load feedback:', err)
      toast.error('Failed to load feedback')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, typeFilter, priorityFilter, searchQuery])

  useEffect(() => {
    loadFeedback()
  }, [loadFeedback])

  const loadFeedbackDetail = async (id: string) => {
    setLoadingDetail(true)
    setSelectedId(id)
    try {
      const res = await fetch(`/api/admin/feedback/${id}`)
      if (!res.ok) throw new Error('Failed to load feedback detail')

      const data = await res.json()
      setSelectedFeedback(data.feedback)
    } catch (err) {
      console.error('Failed to load feedback detail:', err)
      toast.error('Failed to load feedback detail')
    } finally {
      setLoadingDetail(false)
    }
  }

  const updateStatus = async (id: string, newStatus: FeedbackStatus) => {
    try {
      const res = await fetch(`/api/admin/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) throw new Error('Failed to update status')

      toast.success('Status updated')
      loadFeedback()
      if (selectedId === id) {
        loadFeedbackDetail(id)
      }
    } catch (err) {
      console.error('Failed to update status:', err)
      toast.error('Failed to update status')
    }
  }

  const sendResponse = async () => {
    if (!selectedId || !responseContent.trim()) return

    setSendingResponse(true)
    try {
      const res = await fetch(`/api/admin/feedback/${selectedId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: responseContent,
          is_internal: isInternalNote,
        }),
      })

      if (!res.ok) throw new Error('Failed to send response')

      toast.success(isInternalNote ? 'Internal note added' : 'Response sent')
      setResponseContent('')
      setIsInternalNote(false)
      loadFeedbackDetail(selectedId)
    } catch (err) {
      console.error('Failed to send response:', err)
      toast.error('Failed to send response')
    } finally {
      setSendingResponse(false)
    }
  }

  const deleteFeedback = async (id: string) => {
    if (!confirm('Are you sure you want to delete this feedback? This cannot be undone.')) return

    try {
      const res = await fetch(`/api/admin/feedback/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete feedback')

      toast.success('Feedback deleted')
      setSelectedId(null)
      setSelectedFeedback(null)
      loadFeedback()
    } catch (err) {
      console.error('Failed to delete feedback:', err)
      toast.error('Failed to delete feedback')
    }
  }

  // Export feedback to CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Type', 'Priority', 'Status', 'Title', 'Description', 'User ID', 'User Email', 'Route', 'Created At']
    const rows = feedback.map(item => [
      item.id,
      TYPE_CONFIG[item.type]?.label || item.type,
      item.priority ? (PRIORITY_CONFIG[item.priority]?.label || item.priority) : '',
      STATUS_CONFIG[item.status]?.label || item.status,
      item.title || '',
      item.description || '',
      item.user_id || '',
      item.user_email || '',
      item.current_route || '',
      item.created_at ? new Date(item.created_at).toISOString() : '',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""').replace(/\n/g, ' ')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `feedback-export-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
    toast.success(`Exported ${feedback.length} feedback items to CSV`)
  }

  const newCount = stats.byStatus['new'] || 0

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Feedback Dashboard</h1>
            <p className="text-gray-400 text-sm">Manage user feedback, bug reports, and feature requests</p>
          </div>
          <button
            onClick={loadFeedback}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-colors"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-sm text-gray-400">Total</div>
          </div>
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <div className="text-2xl font-bold text-blue-400">{newCount}</div>
            <div className="text-sm text-blue-400/70">New</div>
          </div>
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <div className="text-2xl font-bold text-red-400">{stats.byType['bug'] || 0}</div>
            <div className="text-sm text-red-400/70">Bugs</div>
          </div>
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <div className="text-2xl font-bold text-amber-400">{stats.byType['feature'] || 0}</div>
            <div className="text-sm text-amber-400/70">Features</div>
          </div>
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
            <div className="text-2xl font-bold text-green-400">{stats.byStatus['fixed'] || 0}</div>
            <div className="text-sm text-green-400/70">Fixed</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search feedback..."
              className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 w-64"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500/50"
          >
            <option value="all">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500/50"
          >
            <option value="all">All Types</option>
            {Object.entries(TYPE_CONFIG).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500/50"
          >
            <option value="all">All Priority</option>
            {Object.entries(PRIORITY_CONFIG).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <button
            onClick={handleExportCSV}
            disabled={feedback.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Export feedback to CSV"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>

        {/* Main content - split view */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Feedback list */}
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h2 className="font-semibold text-white">Feedback ({feedback.length})</h2>
            </div>

            {loading ? (
              <div className="p-8 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : feedback.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No feedback found
              </div>
            ) : (
              <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                {feedback.map(item => {
                  const typeConfig = TYPE_CONFIG[item.type]
                  const statusConfig = STATUS_CONFIG[item.status]
                  const TypeIcon = typeConfig.icon
                  const StatusIcon = statusConfig.icon

                  return (
                    <button
                      key={item.id}
                      onClick={() => loadFeedbackDetail(item.id)}
                      className={cn(
                        'w-full p-4 text-left hover:bg-white/5 transition-colors',
                        selectedId === item.id && 'bg-white/5'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', typeConfig.color)}>
                          <TypeIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn('px-2 py-0.5 text-xs rounded-full border', statusConfig.color)}>
                              {statusConfig.label}
                            </span>
                            {item.priority && (
                              <span className={cn('text-xs', PRIORITY_CONFIG[item.priority].color)}>
                                {PRIORITY_CONFIG[item.priority].label}
                              </span>
                            )}
                          </div>
                          <h3 className="font-medium text-white truncate">{item.title}</h3>
                          <p className="text-sm text-gray-400 truncate">{item.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>{item.user_email || 'Unknown user'}</span>
                            <span>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
                            {item.attachment_count > 0 && (
                              <span className="flex items-center gap-1">
                                <Image className="w-3 h-3" />
                                {item.attachment_count}
                              </span>
                            )}
                            {item.response_count > 0 && (
                              <span className="flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" />
                                {item.response_count}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Feedback detail */}
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            {!selectedId ? (
              <div className="p-8 flex flex-col items-center justify-center h-full text-gray-500">
                <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
                <p>Select a feedback item to view details</p>
              </div>
            ) : loadingDetail ? (
              <div className="p-8 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : selectedFeedback ? (
              <div className="flex flex-col h-full max-h-[700px]">
                {/* Detail header */}
                <div className="p-4 border-b border-white/10">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        {(() => {
                          const tc = TYPE_CONFIG[selectedFeedback.type]
                          const Icon = tc.icon
                          return (
                            <div className={cn('w-6 h-6 rounded flex items-center justify-center', tc.color)}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                          )
                        })()}
                        <h2 className="font-semibold text-white">{selectedFeedback.title}</h2>
                      </div>
                      <p className="text-sm text-gray-400">
                        {selectedFeedback.user_email} &middot; {format(new Date(selectedFeedback.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteFeedback(selectedFeedback.id)}
                      className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Status quick change */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {Object.entries(STATUS_CONFIG).map(([key, { label, color }]) => (
                      <button
                        key={key}
                        onClick={() => updateStatus(selectedFeedback.id, key as FeedbackStatus)}
                        className={cn(
                          'px-3 py-1 text-xs rounded-full border transition-all',
                          selectedFeedback.status === key
                            ? color
                            : 'border-white/10 text-gray-400 hover:border-white/20'
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Detail content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Description */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-1">Description</h4>
                    <p className="text-white whitespace-pre-wrap">{selectedFeedback.description}</p>
                  </div>

                  {/* Bug-specific fields */}
                  {selectedFeedback.type === 'bug' && (
                    <>
                      {selectedFeedback.reproduce_steps && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-400 mb-1">Steps to Reproduce</h4>
                          <p className="text-white whitespace-pre-wrap">{selectedFeedback.reproduce_steps}</p>
                        </div>
                      )}
                      {(selectedFeedback.expected_behavior || selectedFeedback.actual_behavior) && (
                        <div className="grid grid-cols-2 gap-4">
                          {selectedFeedback.expected_behavior && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-400 mb-1">Expected</h4>
                              <p className="text-white text-sm">{selectedFeedback.expected_behavior}</p>
                            </div>
                          )}
                          {selectedFeedback.actual_behavior && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-400 mb-1">Actual</h4>
                              <p className="text-white text-sm">{selectedFeedback.actual_behavior}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {/* Attachments */}
                  {selectedFeedback.feedback_attachments?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Attachments</h4>
                      <div className="flex gap-2 flex-wrap">
                        {selectedFeedback.feedback_attachments.map((att: any) => (
                          <a
                            key={att.id}
                            href={att.public_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="relative block w-24 h-24 rounded-lg overflow-hidden border border-white/10 hover:border-purple-500/50 transition-colors"
                          >
                            <img src={att.public_url} alt="" className="w-full h-full object-cover" />
                            {att.is_screenshot && (
                              <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-purple-600 text-white text-[10px] rounded">
                                Screenshot
                              </span>
                            )}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Technical context */}
                  <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Technical Context</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-gray-400">Route:</span>
                        <span className="text-white truncate">{selectedFeedback.current_route || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Monitor className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-gray-400">Screen:</span>
                        <span className="text-white">{selectedFeedback.screen_resolution || 'Unknown'}</span>
                      </div>
                      {selectedFeedback.browser_info && (
                        <div className="flex items-center gap-2">
                          <Globe className="w-3.5 h-3.5 text-gray-500" />
                          <span className="text-gray-400">Browser:</span>
                          <span className="text-white">
                            {(selectedFeedback.browser_info as any).name} {(selectedFeedback.browser_info as any).version}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-gray-400">Session:</span>
                        <span className="text-white">{Math.floor((selectedFeedback.session_duration_seconds || 0) / 60)} min</span>
                      </div>
                    </div>

                    {selectedFeedback.console_errors && (selectedFeedback.console_errors as any[]).length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <h5 className="text-xs font-medium text-amber-400 mb-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Console Errors ({(selectedFeedback.console_errors as any[]).length})
                        </h5>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {(selectedFeedback.console_errors as any[]).slice(0, 5).map((err, i) => (
                            <div key={i} className="text-xs text-red-400 font-mono truncate">
                              {err.message}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Responses */}
                  {selectedFeedback.feedback_responses?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Responses</h4>
                      <div className="space-y-3">
                        {selectedFeedback.feedback_responses.map((resp: any) => (
                          <div
                            key={resp.id}
                            className={cn(
                              'p-3 rounded-lg',
                              resp.is_internal
                                ? 'bg-amber-500/10 border border-amber-500/20'
                                : resp.is_status_change
                                ? 'bg-purple-500/10 border border-purple-500/20'
                                : 'bg-white/5 border border-white/10'
                            )}
                          >
                            {resp.is_internal && (
                              <span className="text-xs text-amber-400 font-medium mb-1 block">Internal Note</span>
                            )}
                            <p className="text-white text-sm">{resp.content}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {format(new Date(resp.created_at), 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Response form */}
                <div className="p-4 border-t border-white/10">
                  <div className="flex gap-2 mb-2">
                    <button
                      onClick={() => setIsInternalNote(false)}
                      className={cn(
                        'px-3 py-1 text-xs rounded-full border transition-all',
                        !isInternalNote
                          ? 'bg-white/10 border-white/20 text-white'
                          : 'border-white/10 text-gray-400'
                      )}
                    >
                      Public Response
                    </button>
                    <button
                      onClick={() => setIsInternalNote(true)}
                      className={cn(
                        'px-3 py-1 text-xs rounded-full border transition-all',
                        isInternalNote
                          ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                          : 'border-white/10 text-gray-400'
                      )}
                    >
                      Internal Note
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <textarea
                      value={responseContent}
                      onChange={e => setResponseContent(e.target.value)}
                      placeholder={isInternalNote ? 'Add internal note...' : 'Write a response...'}
                      rows={2}
                      className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 resize-none"
                    />
                    <button
                      onClick={sendResponse}
                      disabled={!responseContent.trim() || sendingResponse}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
                    >
                      {sendingResponse ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

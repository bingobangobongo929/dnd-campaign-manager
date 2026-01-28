'use client'

import { useState, useEffect } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import {
  Bug,
  Lightbulb,
  HelpCircle,
  Heart,
  MessageSquarePlus,
  Loader2,
  ChevronDown,
  ChevronUp,
  Circle,
  Eye,
  PlayCircle,
  CheckCircle,
  XCircle,
  Ban,
  Image,
  MessageSquare,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useFeedback } from '@/components/feedback'
import type { Feedback, FeedbackStatus, FeedbackType } from '@/types/database'

type FeedbackWithDetails = Feedback & {
  feedback_attachments: { id: string; public_url: string; is_screenshot: boolean }[]
  feedback_responses: {
    id: string
    content: string
    created_at: string
    is_status_change: boolean
    old_status: string | null
    new_status: string | null
  }[]
}

const TYPE_CONFIG: Record<FeedbackType, { icon: typeof Bug; color: string; label: string }> = {
  bug: { icon: Bug, color: 'text-red-400 bg-red-400/10', label: 'Bug Report' },
  feature: { icon: Lightbulb, color: 'text-amber-400 bg-amber-400/10', label: 'Feature Request' },
  question: { icon: HelpCircle, color: 'text-blue-400 bg-blue-400/10', label: 'Question' },
  praise: { icon: Heart, color: 'text-pink-400 bg-pink-400/10', label: 'Praise' },
}

const STATUS_CONFIG: Record<FeedbackStatus, { icon: typeof Circle; color: string; label: string; description: string }> = {
  new: { icon: Circle, color: 'text-blue-400 bg-blue-400/10 border-blue-400/30', label: 'New', description: "We've received your feedback" },
  reviewing: { icon: Eye, color: 'text-purple-400 bg-purple-400/10 border-purple-400/30', label: 'Reviewing', description: "We're looking into this" },
  in_progress: { icon: PlayCircle, color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30', label: 'In Progress', description: "We're working on it" },
  fixed: { icon: CheckCircle, color: 'text-green-400 bg-green-400/10 border-green-400/30', label: 'Fixed', description: 'This has been resolved' },
  closed: { icon: XCircle, color: 'text-gray-400 bg-gray-400/10 border-gray-400/30', label: 'Closed', description: 'This feedback has been closed' },
  wont_fix: { icon: Ban, color: 'text-red-400 bg-red-400/10 border-red-400/30', label: "Won't Fix", description: "We've decided not to pursue this" },
}

export default function UserFeedbackPage() {
  const { openFeedback } = useFeedback()
  const [feedback, setFeedback] = useState<FeedbackWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    loadFeedback()
  }, [])

  const loadFeedback = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/feedback')
      if (!res.ok) throw new Error('Failed to load feedback')

      const data = await res.json()
      setFeedback(data.feedback || [])
    } catch (err) {
      console.error('Failed to load feedback:', err)
      toast.error('Failed to load your feedback')
    } finally {
      setLoading(false)
    }
  }

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const deleteFeedback = async (id: string) => {
    const item = feedback.find(f => f.id === id)
    if (!item) return

    // Can only delete own feedback that is still 'new' with no responses
    if (item.status !== 'new' || item.first_response_at) {
      toast.error('You can only delete feedback that has not been reviewed yet')
      return
    }

    if (!confirm('Are you sure you want to delete this feedback?')) return

    setDeletingId(id)
    try {
      // Use regular feedback API - RLS handles permission
      const res = await fetch('/api/feedback', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })

      // The RLS will block if not deletable, but we handle client-side for UX
      if (!res.ok) throw new Error('Cannot delete')

      toast.success('Feedback deleted')
      setFeedback(prev => prev.filter(f => f.id !== id))
    } catch (err) {
      toast.error('Unable to delete this feedback')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">My Feedback</h1>
            <p className="text-gray-400 text-sm mt-1">View the status of your feedback and bug reports</p>
          </div>
          <button
            onClick={() => openFeedback()}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-colors"
          >
            <MessageSquarePlus className="w-4 h-4" />
            New Feedback
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : feedback.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No feedback yet</h3>
            <p className="text-gray-400 mb-6">
              Have a bug report, feature request, or question? Let us know!
            </p>
            <button
              onClick={() => openFeedback()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-colors"
            >
              <MessageSquarePlus className="w-4 h-4" />
              Send Feedback
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {feedback.map(item => {
              const typeConfig = TYPE_CONFIG[item.type]
              const statusConfig = STATUS_CONFIG[item.status]
              const TypeIcon = typeConfig.icon
              const StatusIcon = statusConfig.icon
              const isExpanded = expandedIds.has(item.id)
              const canDelete = item.status === 'new' && !item.first_response_at
              const publicResponses = item.feedback_responses?.filter(r => !r.is_status_change) || []

              return (
                <div
                  key={item.id}
                  className="bg-white/5 border border-white/10 rounded-xl overflow-hidden"
                >
                  {/* Header */}
                  <button
                    onClick={() => toggleExpanded(item.id)}
                    className="w-full p-4 text-left hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', typeConfig.color)}>
                        <TypeIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn('px-2 py-0.5 text-xs rounded-full border flex items-center gap-1', statusConfig.color)}>
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig.label}
                          </span>
                          <span className="text-xs text-gray-500">{typeConfig.label}</span>
                        </div>
                        <h3 className="font-medium text-white">{item.title}</h3>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                          <span>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
                          {item.feedback_attachments?.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Image className="w-3 h-3" />
                              {item.feedback_attachments.length} attachment(s)
                            </span>
                          )}
                          {publicResponses.length > 0 && (
                            <span className="flex items-center gap-1 text-purple-400">
                              <MessageSquare className="w-3 h-3" />
                              {publicResponses.length} response(s)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {canDelete && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteFeedback(item.id)
                            }}
                            disabled={deletingId === item.id}
                            className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                          >
                            {deletingId === item.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 space-y-4 border-t border-white/10">
                      {/* Status explanation */}
                      <div className={cn('p-3 rounded-lg border mt-4', statusConfig.color.replace('text-', 'text-').replace('bg-', 'bg-'))}>
                        <div className="flex items-center gap-2">
                          <StatusIcon className="w-4 h-4" />
                          <span className="font-medium">{statusConfig.label}</span>
                        </div>
                        <p className="text-sm mt-1 opacity-80">{statusConfig.description}</p>
                      </div>

                      {/* Description */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-400 mb-1">Description</h4>
                        <p className="text-white whitespace-pre-wrap">{item.description}</p>
                      </div>

                      {/* Bug details */}
                      {item.type === 'bug' && (
                        <>
                          {item.reproduce_steps && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-400 mb-1">Steps to Reproduce</h4>
                              <p className="text-white whitespace-pre-wrap text-sm">{item.reproduce_steps}</p>
                            </div>
                          )}
                          {(item.expected_behavior || item.actual_behavior) && (
                            <div className="grid grid-cols-2 gap-4">
                              {item.expected_behavior && (
                                <div>
                                  <h4 className="text-sm font-medium text-gray-400 mb-1">Expected</h4>
                                  <p className="text-white text-sm">{item.expected_behavior}</p>
                                </div>
                              )}
                              {item.actual_behavior && (
                                <div>
                                  <h4 className="text-sm font-medium text-gray-400 mb-1">Actual</h4>
                                  <p className="text-white text-sm">{item.actual_behavior}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}

                      {/* Attachments */}
                      {item.feedback_attachments?.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-400 mb-2">Attachments</h4>
                          <div className="flex gap-2 flex-wrap">
                            {item.feedback_attachments.map(att => (
                              <a
                                key={att.id}
                                href={att.public_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="relative block w-20 h-20 rounded-lg overflow-hidden border border-white/10 hover:border-purple-500/50 transition-colors"
                              >
                                <img src={att.public_url} alt="" className="w-full h-full object-cover" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Responses */}
                      {publicResponses.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-400 mb-2">Admin Responses</h4>
                          <div className="space-y-3">
                            {publicResponses.map(resp => (
                              <div
                                key={resp.id}
                                className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg"
                              >
                                <p className="text-white text-sm">{resp.content}</p>
                                <p className="text-xs text-purple-400/70 mt-2">
                                  {format(new Date(resp.created_at), 'MMM d, yyyy h:mm a')}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Meta info */}
                      <div className="text-xs text-gray-500 pt-2 border-t border-white/10">
                        Submitted {format(new Date(item.created_at), 'MMMM d, yyyy')} at {format(new Date(item.created_at), 'h:mm a')}
                        {item.updated_at !== item.created_at && (
                          <span> &middot; Last updated {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

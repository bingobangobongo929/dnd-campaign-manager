'use client'

import { useState } from 'react'
import {
  ThumbsUp,
  ThumbsDown,
  Check,
  X,
  Edit2,
  Loader2,
  Sparkles,
  Clock,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Suggestion {
  id: string
  type: string
  content: string
  category?: string
  usageLogId?: string
}

interface SuggestionCardProps {
  suggestion: Suggestion
  onAccept: (suggestion: Suggestion) => void
  onEdit?: (suggestion: Suggestion) => void
  onDismiss: (suggestion: Suggestion) => void
}

export function SuggestionCard({
  suggestion,
  onAccept,
  onEdit,
  onDismiss,
}: SuggestionCardProps) {
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const recordFeedback = async (
    actionTaken: 'accepted' | 'edited' | 'dismissed',
    feedbackValue?: 'positive' | 'negative'
  ) => {
    try {
      await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usageLogId: suggestion.usageLogId,
          suggestionType: suggestion.type,
          suggestionContent: suggestion.content,
          actionTaken,
          feedback: feedbackValue || feedback,
        }),
      })
    } catch (error) {
      console.error('Failed to record feedback:', error)
    }
  }

  const handleAccept = async () => {
    setIsProcessing(true)
    await recordFeedback('accepted')
    onAccept(suggestion)
    setIsProcessing(false)
  }

  const handleEdit = async () => {
    if (onEdit) {
      await recordFeedback('edited')
      onEdit(suggestion)
    }
  }

  const handleDismiss = async () => {
    await recordFeedback('dismissed')
    onDismiss(suggestion)
  }

  const handleFeedback = (value: 'positive' | 'negative') => {
    setFeedback(prev => prev === value ? null : value)
  }

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'timeline': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'npc': return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
      case 'relationship': return 'bg-pink-500/10 text-pink-400 border-pink-500/20'
      case 'inconsistency': return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      case 'missing': return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
      default: return 'bg-white/[0.02] text-gray-400 border-[--border]'
    }
  }

  return (
    <div className={cn(
      "p-4 rounded-lg border",
      getCategoryColor(suggestion.category)
    )}>
      {/* Category badge */}
      {suggestion.category && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium capitalize">{suggestion.category}</span>
        </div>
      )}

      {/* Content */}
      <p className="text-sm text-gray-300 mb-3">{suggestion.content}</p>

      {/* Actions */}
      <div className="flex items-center justify-between">
        {/* Feedback buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleFeedback('positive')}
            className={cn(
              "p-1.5 rounded transition-colors",
              feedback === 'positive'
                ? "bg-green-500/20 text-green-400"
                : "hover:bg-white/[0.05] text-gray-500"
            )}
            title="Good suggestion"
          >
            <ThumbsUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleFeedback('negative')}
            className={cn(
              "p-1.5 rounded transition-colors",
              feedback === 'negative'
                ? "bg-red-500/20 text-red-400"
                : "hover:bg-white/[0.05] text-gray-500"
            )}
            title="Not helpful"
          >
            <ThumbsDown className="w-4 h-4" />
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDismiss}
            className="btn btn-sm btn-secondary"
          >
            <X className="w-3 h-3 mr-1" />
            Dismiss
          </button>
          {onEdit && (
            <button
              onClick={handleEdit}
              className="btn btn-sm btn-secondary"
            >
              <Edit2 className="w-3 h-3 mr-1" />
              Edit
            </button>
          )}
          <button
            onClick={handleAccept}
            disabled={isProcessing}
            className="btn btn-sm btn-primary"
          >
            {isProcessing ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <>
                <Check className="w-3 h-3 mr-1" />
                Accept
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// Review Queue component for displaying grouped suggestions
interface ReviewQueueProps {
  suggestions: Suggestion[]
  onAccept: (suggestion: Suggestion) => void
  onEdit?: (suggestion: Suggestion) => void
  onDismiss: (suggestion: Suggestion) => void
  isOnCooldown?: boolean
  cooldownRemaining?: string
  lastRunAt?: string
}

export function ReviewQueue({
  suggestions,
  onAccept,
  onEdit,
  onDismiss,
  isOnCooldown,
  cooldownRemaining,
  lastRunAt,
}: ReviewQueueProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['timeline', 'npc', 'relationship'])
  )

  // Group suggestions by category
  const groupedSuggestions = suggestions.reduce((acc, suggestion) => {
    const category = suggestion.category || 'other'
    if (!acc[category]) acc[category] = []
    acc[category].push(suggestion)
    return acc
  }, {} as Record<string, Suggestion[]>)

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'timeline': return '⏱️'
      case 'npc': return '👥'
      case 'relationship': return '🔗'
      case 'inconsistency': return '⚠️'
      case 'missing': return '📝'
      default: return '💡'
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'timeline': return 'Timeline Events'
      case 'npc': return 'NPC Updates'
      case 'relationship': return 'Relationships'
      case 'inconsistency': return 'Inconsistencies'
      case 'missing': return 'Missing Info'
      default: return 'Suggestions'
    }
  }

  if (isOnCooldown) {
    return (
      <div className="bg-white/[0.02] border border-[--border] rounded-xl p-6 text-center">
        <Clock className="w-10 h-10 text-purple-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-white mb-2">On Cooldown</h3>
        <p className="text-gray-400 text-sm mb-4">
          Available again in <strong className="text-white">{cooldownRemaining}</strong>
        </p>
        {lastRunAt && (
          <p className="text-xs text-gray-500">
            Last run: {new Date(lastRunAt).toLocaleString()}
          </p>
        )}
        <div className="mt-6 p-4 bg-purple-500/10 rounded-lg text-left">
          <p className="text-sm text-purple-300">
            While you wait, make sure your session notes are up to date for the best suggestions next time.
          </p>
        </div>
      </div>
    )
  }

  if (suggestions.length === 0) {
    return (
      <div className="bg-white/[0.02] border border-[--border] rounded-xl p-6 text-center">
        <Sparkles className="w-10 h-10 text-gray-600 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-white mb-2">No Suggestions</h3>
        <p className="text-gray-400 text-sm">
          Run Intelligence to generate suggestions from your campaign data.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h3 className="font-medium text-white">Review Queue</h3>
          <span className="text-xs text-gray-500">({suggestions.length} suggestions)</span>
        </div>
      </div>

      {/* Grouped Suggestions */}
      {Object.entries(groupedSuggestions).map(([category, items]) => (
        <div key={category} className="border border-[--border] rounded-lg overflow-hidden">
          {/* Category Header */}
          <button
            onClick={() => toggleCategory(category)}
            className="w-full flex items-center justify-between p-3 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
          >
            <div className="flex items-center gap-2">
              <span>{getCategoryIcon(category)}</span>
              <span className="font-medium text-white">{getCategoryLabel(category)}</span>
              <span className="text-xs text-gray-500">({items.length})</span>
            </div>
            {expandedCategories.has(category) ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
          </button>

          {/* Category Items */}
          {expandedCategories.has(category) && (
            <div className="p-3 space-y-3">
              {items.map(suggestion => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onAccept={onAccept}
                  onEdit={onEdit}
                  onDismiss={onDismiss}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// Inline feedback buttons for simpler use cases
interface InlineFeedbackProps {
  suggestionType: string
  suggestionContent: string
  usageLogId?: string
  className?: string
}

export function InlineFeedback({
  suggestionType,
  suggestionContent,
  usageLogId,
  className,
}: InlineFeedbackProps) {
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const submitFeedback = async (value: 'positive' | 'negative') => {
    if (submitted) return

    setFeedback(value)
    setSubmitted(true)

    try {
      await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usageLogId,
          suggestionType,
          suggestionContent: suggestionContent.slice(0, 500),
          actionTaken: 'accepted',
          feedback: value,
        }),
      })
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    }
  }

  if (submitted) {
    return (
      <span className="text-xs text-gray-500">
        Thanks for the feedback!
      </span>
    )
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <span className="text-xs text-gray-500 mr-1">Helpful?</span>
      <button
        onClick={() => submitFeedback('positive')}
        className="p-1 hover:bg-green-500/20 rounded text-gray-500 hover:text-green-400 transition-colors"
        title="Yes, this was helpful"
      >
        <ThumbsUp className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => submitFeedback('negative')}
        className="p-1 hover:bg-red-500/20 rounded text-gray-500 hover:text-red-400 transition-colors"
        title="No, this wasn't helpful"
      >
        <ThumbsDown className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Brain, Check, X, Loader2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import NextLink from 'next/link'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { IntelligenceSuggestion, SuggestionType } from '@/types/database'

interface CharacterSuggestionsIndicatorProps {
  characterId: string
  characterName: string
  campaignId: string
  className?: string
}

const SUGGESTION_TYPE_LABELS: Partial<Record<SuggestionType, string>> = {
  status_change: 'Status Change',
  secret_revealed: 'Secret Revealed',
  story_hook: 'Story Hook',
  quote: 'Quote',
  important_person: 'Important Person',
  relationship: 'Relationship',
}

export function CharacterSuggestionsIndicator({
  characterId,
  characterName,
  campaignId,
  className,
}: CharacterSuggestionsIndicatorProps) {
  const [suggestions, setSuggestions] = useState<IntelligenceSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())

  // Fetch suggestions for this character
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const response = await fetch(
          `/api/ai/suggestions?campaignId=${campaignId}&status=pending&characterId=${characterId}`
        )
        if (response.ok) {
          const data = await response.json()
          setSuggestions(data.suggestions || [])
        }
      } catch (error) {
        console.error('Failed to fetch character suggestions:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSuggestions()
  }, [campaignId, characterId])

  const handleAction = async (suggestionId: string, action: 'approve' | 'reject') => {
    setProcessingIds(prev => new Set(prev).add(suggestionId))

    try {
      const response = await fetch('/api/ai/suggestions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionId, action }),
      })

      if (!response.ok) {
        throw new Error('Failed to process suggestion')
      }

      // Remove from local state
      setSuggestions(prev => prev.filter(s => s.id !== suggestionId))
      toast.success(action === 'approve' ? 'Suggestion applied' : 'Suggestion dismissed')
    } catch (error) {
      console.error('Error processing suggestion:', error)
      toast.error('Failed to process suggestion')
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(suggestionId)
        return next
      })
    }
  }

  // Don't show anything if loading or no suggestions
  if (loading || suggestions.length === 0) {
    return null
  }

  return (
    <div
      className={cn(
        'rounded-xl overflow-hidden transition-all',
        className
      )}
      style={{
        backgroundColor: 'rgba(139, 92, 246, 0.08)',
        border: '1px solid rgba(139, 92, 246, 0.25)',
      }}
    >
      {/* Header - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors"
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'rgba(139, 92, 246, 0.2)' }}
        >
          <Brain className="w-4 h-4 text-purple-400" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-medium text-purple-300">
            {suggestions.length} pending suggestion{suggestions.length !== 1 ? 's' : ''}
          </p>
          <p className="text-xs text-purple-400/70">
            From Campaign Intelligence
          </p>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-purple-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-purple-400" />
        )}
      </button>

      {/* Expanded suggestions list */}
      {expanded && (
        <div className="border-t border-purple-500/20 p-3 space-y-2">
          {suggestions.slice(0, 5).map(suggestion => {
            const isProcessing = processingIds.has(suggestion.id)
            const typeLabel = SUGGESTION_TYPE_LABELS[suggestion.suggestion_type] ||
              suggestion.suggestion_type.replace(/_/g, ' ')

            return (
              <div
                key={suggestion.id}
                className="flex items-start gap-3 p-2 rounded-lg"
                style={{ backgroundColor: 'rgba(26, 26, 36, 0.6)' }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-purple-300 uppercase tracking-wide mb-1">
                    {typeLabel}
                  </p>
                  <p className="text-sm text-gray-300 line-clamp-2">
                    {formatSuggestedValue(suggestion.suggested_value, suggestion.suggestion_type)}
                  </p>
                  {suggestion.ai_reasoning && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                      {suggestion.ai_reasoning}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAction(suggestion.id, 'approve')
                    }}
                    disabled={isProcessing}
                    className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors disabled:opacity-50"
                    title="Apply"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAction(suggestion.id, 'reject')
                    }}
                    disabled={isProcessing}
                    className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors disabled:opacity-50"
                    title="Dismiss"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}

          {/* Show link to Intelligence page if more than 5 suggestions */}
          {suggestions.length > 5 && (
            <p className="text-xs text-purple-400/70 text-center pt-1">
              +{suggestions.length - 5} more suggestions
            </p>
          )}

          {/* Link to full Intelligence page */}
          <NextLink
            href={`/campaigns/${campaignId}/intelligence`}
            className="flex items-center justify-center gap-2 w-full mt-2 py-2 rounded-lg text-xs font-medium text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            View all in Intelligence
          </NextLink>
        </div>
      )}
    </div>
  )
}

function formatSuggestedValue(value: unknown, type: SuggestionType): string {
  if (value === null || value === undefined) return 'None'
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    // Handle status_change
    if ('status' in obj) return String(obj.status)
    // Handle important_person
    if ('name' in obj && 'relationship' in obj) {
      return `${obj.name} (${obj.relationship})`
    }
    // Handle story_hook
    if ('hook' in obj) return String(obj.hook)
    // Handle quote
    if (typeof obj === 'string') return obj
    return JSON.stringify(value)
  }
  return String(value)
}

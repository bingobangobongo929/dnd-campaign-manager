'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Brain, CheckCircle, XCircle, Clock, Sparkles, AlertTriangle, ChevronLeft, RefreshCw } from 'lucide-react'
import type { VaultCharacter, IntelligenceSuggestion } from '@/types/database'

type SuggestionFilter = 'all' | 'pending' | 'applied' | 'rejected'

const SUGGESTION_TYPE_LABELS: Record<string, string> = {
  completeness: 'Missing Field',
  consistency: 'Consistency Issue',
  quote: 'Quote',
  npc_detected: 'NPC Detected',
  location_detected: 'Location',
  plot_hook: 'Plot Hook',
  enrichment: 'Enrichment',
  timeline_issue: 'Timeline Issue',
}

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'bg-emerald-500/20 text-emerald-400',
  medium: 'bg-amber-500/20 text-amber-400',
  low: 'bg-zinc-500/20 text-zinc-400',
}

export default function CharacterIntelligencePage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const characterId = params.id as string

  const [character, setCharacter] = useState<VaultCharacter | null>(null)
  const [suggestions, setSuggestions] = useState<IntelligenceSuggestion[]>([])
  const [counts, setCounts] = useState({ pending: 0, applied: 0, rejected: 0 })
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [filter, setFilter] = useState<SuggestionFilter>('pending')
  const [provider, setProvider] = useState<'anthropic' | 'google'>('anthropic')
  const [lastAnalysis, setLastAnalysis] = useState<string | null>(null)

  const loadCharacter = useCallback(async () => {
    const { data, error } = await supabase
      .from('vault_characters')
      .select('*')
      .eq('id', characterId)
      .single()

    if (error || !data) {
      router.push('/vault')
      return
    }

    setCharacter(data)
    setLastAnalysis(data.last_intelligence_run)
  }, [characterId, router, supabase])

  const loadSuggestions = useCallback(async () => {
    const statusParam = filter === 'all' ? '' : `&status=${filter}`
    const response = await fetch(`/api/ai/character-suggestions?characterId=${characterId}${statusParam}`)
    const data = await response.json()

    if (data.suggestions) {
      setSuggestions(data.suggestions)
      setCounts(data.counts)
      if (data.lastAnalysis) {
        setLastAnalysis(data.lastAnalysis)
      }
    }
  }, [characterId, filter])

  useEffect(() => {
    const init = async () => {
      await loadCharacter()
      await loadSuggestions()
      setLoading(false)
    }
    init()
  }, [loadCharacter, loadSuggestions])

  const handleAnalyze = async () => {
    setAnalyzing(true)
    try {
      const response = await fetch('/api/ai/analyze-character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId, provider }),
      })

      const data = await response.json()

      if (data.success) {
        await loadSuggestions()
        setLastAnalysis(new Date().toISOString())
      } else {
        console.error('Analysis failed:', data.error)
      }
    } catch (error) {
      console.error('Analysis error:', error)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleApprove = async (suggestionId: string) => {
    try {
      const response = await fetch('/api/ai/character-suggestions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionId, action: 'approve' }),
      })

      if (response.ok) {
        await loadSuggestions()
      }
    } catch (error) {
      console.error('Approve error:', error)
    }
  }

  const handleReject = async (suggestionId: string) => {
    try {
      const response = await fetch('/api/ai/character-suggestions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionId, action: 'reject' }),
      })

      if (response.ok) {
        await loadSuggestions()
      }
    } catch (error) {
      console.error('Reject error:', error)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[--bg-base] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[--arcane-purple] border-t-transparent rounded-full spinner" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[--bg-base]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[--bg-elevated] border-b border-[--border-default]">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push(`/vault/${characterId}`)}
                className="p-2 rounded-lg hover:bg-[--bg-hover] text-[--text-secondary]"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-[--arcane-purple]" />
                  <h1 className="text-xl font-bold text-[--text-primary]">
                    Character Intelligence
                  </h1>
                </div>
                <p className="text-sm text-[--text-secondary]">
                  {character?.name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Provider selector */}
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as 'anthropic' | 'google')}
                className="px-3 py-2 rounded-lg bg-[--bg-surface] border border-[--border-default] text-[--text-primary] text-sm"
              >
                <option value="anthropic">Claude</option>
                <option value="google">Gemini</option>
              </select>

              {/* Analyze button */}
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[--arcane-purple] hover:bg-[--arcane-purple-light] text-white font-medium disabled:opacity-50"
              >
                {analyzing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {analyzing ? 'Analyzing...' : 'Analyze'}
              </button>
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-4 flex items-center gap-6 text-sm">
            <span className="text-[--text-secondary]">
              {lastAnalysis ? (
                <>Last analysis: {formatTimeAgo(lastAnalysis)}</>
              ) : (
                'No analysis yet'
              )}
            </span>
            <span className="text-amber-400">{counts.pending} pending</span>
            <span className="text-emerald-400">{counts.applied} applied</span>
            <span className="text-zinc-400">{counts.rejected} rejected</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* Filters sidebar */}
          <div className="w-56 flex-shrink-0">
            <div className="sticky top-32 space-y-2">
              <h3 className="text-xs font-semibold text-[--text-secondary] uppercase tracking-wider mb-3">
                Filter
              </h3>
              {(['all', 'pending', 'applied', 'rejected'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`w-full px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                    filter === f
                      ? 'bg-[--arcane-purple]/20 text-[--arcane-purple]'
                      : 'text-[--text-secondary] hover:bg-[--bg-hover]'
                  }`}
                >
                  {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                  {f !== 'all' && (
                    <span className="float-right opacity-60">
                      {counts[f as keyof typeof counts]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Suggestions list */}
          <div className="flex-1 space-y-4">
            {suggestions.length === 0 ? (
              <div className="text-center py-12">
                <Brain className="w-12 h-12 text-[--text-muted] mx-auto mb-4" />
                <p className="text-[--text-secondary]">
                  {filter === 'pending'
                    ? 'No pending suggestions. Run an analysis to get recommendations.'
                    : 'No suggestions found with this filter.'}
                </p>
              </div>
            ) : (
              suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="bg-[--bg-elevated] rounded-xl border border-[--border-default] overflow-hidden"
                >
                  <div className="p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-[--arcane-purple]/20 text-[--arcane-purple]">
                          {SUGGESTION_TYPE_LABELS[suggestion.suggestion_type] || suggestion.suggestion_type}
                        </span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${CONFIDENCE_COLORS[suggestion.confidence]}`}>
                          {suggestion.confidence}
                        </span>
                        <span className="text-xs text-[--text-muted]">
                          {formatTimeAgo(suggestion.created_at)}
                        </span>
                      </div>

                      <span className="text-xs text-[--text-secondary] bg-[--bg-surface] px-2 py-0.5 rounded">
                        {suggestion.field_name}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="mb-4">
                      {suggestion.source_excerpt && (
                        <p className="text-sm text-[--text-secondary] mb-2 italic border-l-2 border-[--border-default] pl-3">
                          "{suggestion.source_excerpt.substring(0, 200)}
                          {suggestion.source_excerpt.length > 200 ? '...' : ''}"
                        </p>
                      )}

                      <div className="bg-[--bg-surface] rounded-lg p-3">
                        <p className="text-sm text-[--text-primary] font-medium mb-1">
                          Suggestion:
                        </p>
                        <p className="text-sm text-[--text-secondary]">
                          {typeof suggestion.suggested_value === 'string'
                            ? suggestion.suggested_value
                            : JSON.stringify(suggestion.suggested_value, null, 2)}
                        </p>
                      </div>

                      {suggestion.ai_reasoning && (
                        <p className="text-xs text-[--text-muted] mt-2 flex items-start gap-1">
                          <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          {suggestion.ai_reasoning}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    {suggestion.status === 'pending' && (
                      <div className="flex items-center gap-2 pt-3 border-t border-[--border-default]">
                        <button
                          onClick={() => handleApprove(suggestion.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-sm font-medium transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(suggestion.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-500/20 hover:bg-zinc-500/30 text-zinc-400 text-sm font-medium transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    )}

                    {suggestion.status !== 'pending' && (
                      <div className="flex items-center gap-2 pt-3 border-t border-[--border-default]">
                        <span className={`flex items-center gap-1 text-xs ${
                          suggestion.status === 'applied' ? 'text-emerald-400' : 'text-zinc-400'
                        }`}>
                          {suggestion.status === 'applied' ? (
                            <><CheckCircle className="w-3 h-3" /> Applied</>
                          ) : (
                            <><XCircle className="w-3 h-3" /> Rejected</>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  Brain,
  Sparkles,
  Loader2,
  Check,
  X,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Filter,
  History,
  FileQuestion,
  AlertTriangle,
  UserPlus,
  MapPin,
  Lightbulb,
  Wand2,
  Clock,
  Quote,
  Type,
  ListChecks,
  GitMerge,
  Copy,
  MessageSquare,
  Link2,
  Eye,
  ArrowLeft,
} from 'lucide-react'
import { AI_PROVIDERS, AIProvider } from '@/lib/ai/config'
import { useAppStore, useCanUseAI } from '@/store'
import { AppLayout } from '@/components/layout/app-layout'
import { useIsMobile } from '@/hooks'
import { CharacterIntelligencePageMobile } from './page.mobile'
import type { VaultCharacter, IntelligenceSuggestion, SuggestionType, ConfidenceLevel } from '@/types/database'

// Icons for each suggestion type
const SUGGESTION_ICONS: Record<string, typeof Brain> = {
  summary: FileQuestion,
  completeness: FileQuestion,
  consistency: AlertTriangle,
  grammar: Type,
  formatting: ListChecks,
  quote: Quote,
  npc_detected: UserPlus,
  location_detected: MapPin,
  plot_hook: Lightbulb,
  enrichment: Wand2,
  timeline_issue: Clock,
  lore_conflict: AlertTriangle,
  redundancy: Copy,
  voice_inconsistency: MessageSquare,
  relationship_gap: Link2,
  secret_opportunity: Eye,
  cross_reference: GitMerge,
}

// Colors for each suggestion type
const SUGGESTION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  summary: { bg: 'rgba(139, 92, 246, 0.12)', text: '#a78bfa', border: 'rgba(139, 92, 246, 0.3)' },
  completeness: { bg: 'rgba(251, 191, 36, 0.12)', text: '#fbbf24', border: 'rgba(251, 191, 36, 0.3)' },
  consistency: { bg: 'rgba(249, 115, 22, 0.12)', text: '#fb923c', border: 'rgba(249, 115, 22, 0.3)' },
  grammar: { bg: 'rgba(239, 68, 68, 0.12)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' },
  formatting: { bg: 'rgba(99, 102, 241, 0.12)', text: '#818cf8', border: 'rgba(99, 102, 241, 0.3)' },
  quote: { bg: 'rgba(16, 185, 129, 0.12)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' },
  npc_detected: { bg: 'rgba(34, 211, 238, 0.12)', text: '#22d3ee', border: 'rgba(34, 211, 238, 0.3)' },
  location_detected: { bg: 'rgba(74, 222, 128, 0.12)', text: '#4ade80', border: 'rgba(74, 222, 128, 0.3)' },
  plot_hook: { bg: 'rgba(192, 132, 252, 0.12)', text: '#c084fc', border: 'rgba(192, 132, 252, 0.3)' },
  enrichment: { bg: 'rgba(56, 189, 248, 0.12)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.3)' },
  timeline_issue: { bg: 'rgba(251, 146, 60, 0.12)', text: '#fb923c', border: 'rgba(251, 146, 60, 0.3)' },
  lore_conflict: { bg: 'rgba(239, 68, 68, 0.12)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' },
  redundancy: { bg: 'rgba(156, 163, 175, 0.12)', text: '#9ca3af', border: 'rgba(156, 163, 175, 0.3)' },
  voice_inconsistency: { bg: 'rgba(236, 72, 153, 0.12)', text: '#f472b6', border: 'rgba(236, 72, 153, 0.3)' },
  relationship_gap: { bg: 'rgba(245, 158, 11, 0.12)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' },
  secret_opportunity: { bg: 'rgba(139, 92, 246, 0.12)', text: '#a78bfa', border: 'rgba(139, 92, 246, 0.3)' },
  cross_reference: { bg: 'rgba(59, 130, 246, 0.12)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' },
}

// Human-readable labels
const SUGGESTION_LABELS: Record<string, string> = {
  summary: 'Summary',
  completeness: 'Missing Field',
  consistency: 'Consistency Issue',
  grammar: 'Grammar Fix',
  formatting: 'Formatting',
  quote: 'Quote',
  npc_detected: 'NPC Detected',
  location_detected: 'Location',
  plot_hook: 'Plot Hook',
  enrichment: 'Enrichment',
  timeline_issue: 'Timeline Issue',
  lore_conflict: 'Lore Conflict',
  redundancy: 'Redundancy',
  voice_inconsistency: 'Voice Issue',
  relationship_gap: 'Relationship Gap',
  secret_opportunity: 'Secret Opportunity',
  cross_reference: 'Cross Reference',
}

const CONFIDENCE_COLORS: Record<ConfidenceLevel, string> = {
  high: '#10B981',
  medium: '#F59E0B',
  low: '#EF4444',
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return 'None'
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }
  return String(value)
}

export default function CharacterIntelligencePage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const { aiProvider } = useAppStore()
  const canUseAI = useCanUseAI()
  const characterId = params.id as string
  const isMobile = useIsMobile()

  const [character, setCharacter] = useState<VaultCharacter | null>(null)
  const [suggestions, setSuggestions] = useState<IntelligenceSuggestion[]>([])
  const [counts, setCounts] = useState({ pending: 0, applied: 0, rejected: 0 })
  const [loading, setLoading] = useState(true)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(aiProvider)

  // Filter state
  const [showHistory, setShowHistory] = useState(false)
  const [typeFilters, setTypeFilters] = useState<Set<string>>(new Set())
  const [confidenceFilters, setConfidenceFilters] = useState<Set<ConfidenceLevel>>(new Set())
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Action state
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())


  const loadData = useCallback(async () => {
    if (!characterId) return

    if (!hasLoadedOnce) {
      setLoading(true)
    }

    // Load character
    const { data: charData, error: charError } = await supabase
      .from('vault_characters')
      .select('*')
      .eq('id', characterId)
      .single()

    if (charError || !charData) {
      router.push('/vault')
      return
    }
    setCharacter(charData)

    // Load suggestions
    const status = showHistory ? null : 'pending'
    const response = await fetch(`/api/ai/character-suggestions?characterId=${characterId}${status ? `&status=${status}` : ''}`)
    const data = await response.json()

    setSuggestions(data.suggestions || [])
    setCounts(data.counts || { pending: 0, applied: 0, rejected: 0 })

    setLoading(false)
    setHasLoadedOnce(true)
  }, [characterId, showHistory, supabase, router, hasLoadedOnce])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Redirect if AI is disabled
  useEffect(() => {
    if (!loading && !canUseAI) {
      router.push(`/vault/${characterId}`)
    }
  }, [canUseAI, loading, characterId, router])

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    setAnalysisError(null)

    try {
      const response = await fetch('/api/ai/analyze-character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId,
          provider: selectedProvider,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Analysis failed')
      }

      await loadData()

      if (data.suggestionsSaved > 0) {
        const skippedMsg = data.suggestionsSkipped > 0 ? ` (${data.suggestionsSkipped} duplicates skipped)` : ''
        toast.success(`Analysis complete: ${data.suggestionsSaved} new suggestion${data.suggestionsSaved === 1 ? '' : 's'}${skippedMsg}`)
      } else if (data.suggestionsSkipped > 0) {
        toast.info(`Analysis complete: ${data.suggestionsSkipped} duplicate suggestion${data.suggestionsSkipped === 1 ? '' : 's'} skipped`)
      } else if (data.suggestionsGenerated > 0) {
        // AI found suggestions but none were saved - likely RLS issue
        toast.error(`Found ${data.suggestionsGenerated} suggestions but failed to save them. Please run migration 022 in Supabase.`)
        setAnalysisError('Suggestions could not be saved to database. Run migration 022_vault_intelligence_rls.sql in your Supabase SQL Editor.')
      } else {
        toast.info('Analysis complete: No new suggestions')
      }
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Analysis failed')
      toast.error('Analysis failed')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleAction = async (suggestionId: string, action: 'approve' | 'reject') => {
    setProcessingIds(prev => new Set(prev).add(suggestionId))

    try {
      const response = await fetch('/api/ai/character-suggestions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionId, action }),
      })

      if (response.ok) {
        setSuggestions(prev => prev.filter(s => s.id !== suggestionId))
        setCounts(prev => ({
          ...prev,
          pending: prev.pending - 1,
          [action === 'approve' ? 'applied' : 'rejected']: prev[action === 'approve' ? 'applied' : 'rejected'] + 1,
        }))
        toast.success(action === 'approve' ? 'Suggestion applied' : 'Suggestion dismissed')
      } else {
        toast.error('Failed to process suggestion')
      }
    } catch (err) {
      console.error('Action error:', err)
      toast.error('Failed to process suggestion')
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(suggestionId)
        return next
      })
    }
  }

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleTypeFilter = (type: string) => {
    if (type === '__clear__') {
      setTypeFilters(new Set())
      setConfidenceFilters(new Set())
      return
    }
    setTypeFilters(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  const toggleConfidenceFilter = (level: ConfidenceLevel) => {
    setConfidenceFilters(prev => {
      const next = new Set(prev)
      if (next.has(level)) next.delete(level)
      else next.add(level)
      return next
    })
  }

  // Filter suggestions
  const filteredSuggestions = suggestions.filter(s => {
    if (typeFilters.size > 0 && !typeFilters.has(s.suggestion_type)) return false
    if (confidenceFilters.size > 0 && !confidenceFilters.has(s.confidence)) return false
    return true
  })

  // Count by type
  const suggestionCounts = suggestions.reduce((acc, s) => {
    acc[s.suggestion_type] = (acc[s.suggestion_type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // State for mobile filter sheet
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)

  // ============ MOBILE LAYOUT ============
  if (isMobile) {
    return (
      <CharacterIntelligencePageMobile
        characterId={characterId}
        character={character}
        suggestions={suggestions}
        counts={counts}
        loading={loading}
        canUseAI={canUseAI}
        isAnalyzing={isAnalyzing}
        analysisError={analysisError}
        selectedProvider={selectedProvider}
        showHistory={showHistory}
        setShowHistory={setShowHistory}
        typeFilters={typeFilters}
        confidenceFilters={confidenceFilters}
        toggleTypeFilter={toggleTypeFilter}
        toggleConfidenceFilter={toggleConfidenceFilter}
        filteredSuggestions={filteredSuggestions}
        suggestionCounts={suggestionCounts}
        processingIds={processingIds}
        isFilterSheetOpen={isFilterSheetOpen}
        setIsFilterSheetOpen={setIsFilterSheetOpen}
        handleAnalyze={handleAnalyze}
        handleAction={handleAction}
      />
    )
  }

  // ============ DESKTOP LAYOUT ============
  if (loading) {
    return (
      <AppLayout characterId={characterId}>
        <div className="min-h-screen bg-[--bg-base] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[--arcane-purple]" />
        </div>
      </AppLayout>
    )
  }

  if (!canUseAI) {
    return null
  }

  return (
    <AppLayout characterId={characterId}>
      <div className="min-h-screen bg-[--bg-base]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[--bg-elevated] border-b border-[--border-default]">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <button
                  onClick={() => router.push(`/vault/${characterId}`)}
                  className="p-2 -ml-2 rounded-lg hover:bg-white/5 text-[--text-secondary] transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    backgroundColor: 'rgba(139, 92, 246, 0.15)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                  }}
                >
                  <Brain className="w-5 h-5 text-[#8B5CF6]" />
                </div>
                <h1 className="text-2xl font-bold" style={{ color: '#f3f4f6' }}>
                  Character Intelligence
                </h1>
              </div>
              <p className="text-sm ml-12" style={{ color: '#6b7280' }}>
                {character?.name}
                {' • '}
                {character?.last_intelligence_run
                  ? `Last analysis: ${formatTimeAgo(character.last_intelligence_run)}`
                  : 'Never analyzed'}
                {' • '}
                <span style={{ color: '#8B5CF6' }}>{counts.pending} pending</span>
                {' • '}
                <span style={{ color: '#10B981' }}>{counts.applied} applied</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Model Selector */}
              <div className="relative">
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value as AIProvider)}
                  className="appearance-none bg-[--bg-surface] border border-[--border] rounded-lg px-4 py-2 pr-10 text-sm font-medium cursor-pointer hover:border-[--arcane-purple]/50 transition-colors"
                  style={{ color: '#f3f4f6', colorScheme: 'dark' }}
                >
                  {(Object.keys(AI_PROVIDERS) as AIProvider[]).map(provider => (
                    <option key={provider} value={provider}>
                      {AI_PROVIDERS[provider].name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#6b7280' }} />
              </div>

              <button
                className="btn btn-primary flex items-center gap-2"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isAnalyzing ? 'Analyzing...' : 'Analyze Character'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {analysisError && (
        <div className="max-w-6xl mx-auto px-6 pt-4">
          <div
            className="flex items-center gap-3 p-4 rounded-xl"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
            }}
          >
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-400">Analysis Error</p>
              <p className="text-xs text-red-400/70 mt-0.5">{analysisError}</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="w-64 flex-shrink-0 space-y-6">
            {/* History toggle */}
            <div>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-all flex items-center gap-2 ${
                  showHistory ? 'ring-1 ring-[--arcane-purple]/30 bg-[--arcane-purple]/10' : 'hover:bg-white/5'
                }`}
                style={{ color: showHistory ? '#a78bfa' : '#9ca3af' }}
              >
                <History className="w-4 h-4" />
                Show History
              </button>
            </div>

            {/* Filter by Type */}
            {suggestions.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: '#6b7280' }}>
                  <Filter className="w-3.5 h-3.5" />
                  Filter by Type
                </h3>
                <div className="space-y-1">
                  {Object.keys(SUGGESTION_ICONS).map(type => {
                    const count = suggestionCounts[type] || 0
                    if (count === 0 && typeFilters.size === 0) return null
                    const Icon = SUGGESTION_ICONS[type]
                    const colors = SUGGESTION_COLORS[type] || SUGGESTION_COLORS.completeness
                    const isActive = typeFilters.has(type)
                    return (
                      <button
                        key={type}
                        onClick={() => toggleTypeFilter(type)}
                        className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-all flex items-center gap-2 ${
                          isActive ? 'ring-1 ring-white/20' : ''
                        }`}
                        style={{
                          backgroundColor: isActive ? colors.bg : 'transparent',
                          color: isActive ? colors.text : '#9ca3af',
                        }}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="flex-1">{SUGGESTION_LABELS[type] || type}</span>
                        {count > 0 && (
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                            {count}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Filter by Confidence */}
            {suggestions.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#6b7280' }}>
                  Filter by Confidence
                </h3>
                <div className="space-y-1">
                  {(['high', 'medium', 'low'] as ConfidenceLevel[]).map(level => {
                    const count = suggestions.filter(s => s.confidence === level).length
                    if (count === 0 && confidenceFilters.size === 0) return null
                    const isActive = confidenceFilters.has(level)
                    const color = CONFIDENCE_COLORS[level]
                    return (
                      <button
                        key={level}
                        onClick={() => toggleConfidenceFilter(level)}
                        className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-all flex items-center gap-2 ${
                          isActive ? 'ring-1 ring-white/20' : ''
                        }`}
                        style={{
                          backgroundColor: isActive ? `${color}15` : 'transparent',
                          color: isActive ? color : '#9ca3af',
                        }}
                      >
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                        <span className="flex-1 capitalize">{level}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                          {count}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Clear filters */}
            {(typeFilters.size > 0 || confidenceFilters.size > 0) && (
              <button
                className="w-full text-sm px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-center"
                style={{ color: '#9ca3af' }}
                onClick={() => {
                  setTypeFilters(new Set())
                  setConfidenceFilters(new Set())
                }}
              >
                Clear all filters
              </button>
            )}
          </aside>

          {/* Main Content */}
          <main className="flex-1 space-y-3">
            {/* Character Summary Section */}
            {character?.summary && (
              <div
                className="rounded-xl p-4 mb-4"
                style={{
                  backgroundColor: 'rgba(26, 26, 36, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#6b7280' }}>
                  Current Summary
                </h3>
                <p className="text-sm" style={{ color: '#d1d5db' }}>
                  {character.summary}
                </p>
              </div>
            )}

            {isAnalyzing && (
              <div className="flex flex-col items-center justify-center py-20">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
                  style={{
                    backgroundColor: 'rgba(139, 92, 246, 0.15)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                  }}
                >
                  <Loader2 className="w-8 h-8 text-[#8B5CF6] animate-spin" />
                </div>
                <p className="text-lg font-semibold mb-2" style={{ color: '#f3f4f6' }}>
                  Analyzing Character
                </p>
                <p className="text-sm text-center max-w-md" style={{ color: '#6b7280' }}>
                  Using {AI_PROVIDERS[selectedProvider].name} to scan for improvements...
                </p>
              </div>
            )}

            {!isAnalyzing && filteredSuggestions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
                  style={{
                    backgroundColor: suggestions.length === 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(107, 114, 128, 0.15)',
                    border: suggestions.length === 0 ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(107, 114, 128, 0.3)',
                  }}
                >
                  <CheckCircle2 className="w-8 h-8" style={{ color: suggestions.length === 0 ? '#34d399' : '#6b7280' }} />
                </div>
                <p className="text-lg font-semibold mb-2" style={{ color: '#f3f4f6' }}>
                  {suggestions.length === 0 ? 'No Pending Suggestions' : 'No Matches'}
                </p>
                <p className="text-sm text-center max-w-md" style={{ color: '#6b7280' }}>
                  {suggestions.length === 0
                    ? 'Run an analysis to detect grammar issues, lore conflicts, and improvement opportunities.'
                    : 'No suggestions match your current filters.'}
                </p>
              </div>
            )}

            {!isAnalyzing && filteredSuggestions.map(suggestion => {
              const Icon = SUGGESTION_ICONS[suggestion.suggestion_type] || FileQuestion
              const colors = SUGGESTION_COLORS[suggestion.suggestion_type] || SUGGESTION_COLORS.completeness
              const isExpanded = expandedIds.has(suggestion.id)
              const isProcessing = processingIds.has(suggestion.id)

              return (
                <div
                  key={suggestion.id}
                  className="rounded-xl overflow-hidden"
                  style={{
                    backgroundColor: 'rgba(26, 26, 36, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <div className="p-4">
                    {/* Header */}
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span
                            className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded"
                            style={{ backgroundColor: colors.bg, color: colors.text }}
                          >
                            <Icon className="w-3 h-3" />
                            {SUGGESTION_LABELS[suggestion.suggestion_type] || suggestion.suggestion_type}
                          </span>
                          <span
                            className="text-[10px] font-medium px-2 py-0.5 rounded"
                            style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.05)',
                              color: CONFIDENCE_COLORS[suggestion.confidence],
                            }}
                          >
                            {suggestion.confidence.charAt(0).toUpperCase() + suggestion.confidence.slice(1)} confidence
                          </span>
                          <span className="text-[10px]" style={{ color: '#6b7280' }}>
                            {formatTimeAgo(suggestion.created_at)}
                          </span>
                          {suggestion.status !== 'pending' && (
                            <span
                              className="text-[10px] font-medium px-2 py-0.5 rounded"
                              style={{
                                backgroundColor: suggestion.status === 'applied' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                color: suggestion.status === 'applied' ? '#34d399' : '#f87171',
                              }}
                            >
                              {suggestion.status}
                            </span>
                          )}
                        </div>

                        <p className="font-semibold text-[15px] mb-1" style={{ color: '#f3f4f6' }}>
                          {suggestion.field_name.replace(/_/g, ' ')}
                        </p>

                        {/* Suggested value */}
                        <div
                          className="text-sm p-2 rounded-lg"
                          style={{
                            backgroundColor: 'rgba(139, 92, 246, 0.08)',
                            border: '1px solid rgba(139, 92, 246, 0.15)',
                          }}
                        >
                          <p className="whitespace-pre-wrap" style={{ color: '#d1d5db' }}>
                            {formatValue(suggestion.suggested_value)}
                          </p>
                        </div>

                        {/* AI Reasoning */}
                        {suggestion.ai_reasoning && (
                          <p className="text-xs mt-2" style={{ color: '#9ca3af' }}>
                            {suggestion.ai_reasoning}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      {suggestion.status === 'pending' && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleAction(suggestion.id, 'approve')}
                            disabled={isProcessing}
                            className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors disabled:opacity-50"
                            title="Approve"
                          >
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleAction(suggestion.id, 'reject')}
                            disabled={isProcessing}
                            className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors disabled:opacity-50"
                            title="Reject"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => toggleExpanded(suggestion.id)}
                            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" style={{ color: '#6b7280' }} />
                            ) : (
                              <ChevronDown className="w-4 h-4" style={{ color: '#6b7280' }} />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div
                      className="px-4 pb-4 pt-0 space-y-3"
                      style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}
                    >
                      {/* Source excerpt */}
                      {suggestion.source_excerpt && (
                        <div>
                          <span className="text-[10px] uppercase tracking-wider font-semibold block mb-1" style={{ color: '#6b7280' }}>
                            Source
                          </span>
                          <blockquote
                            className="text-sm p-3 rounded-lg italic"
                            style={{
                              backgroundColor: 'rgba(16, 185, 129, 0.08)',
                              borderLeft: '3px solid #10B981',
                              color: '#9ca3af',
                            }}
                          >
                            &quot;{suggestion.source_excerpt}&quot;
                          </blockquote>
                        </div>
                      )}

                      {/* Current value */}
                      {suggestion.current_value !== null && suggestion.current_value !== undefined && (
                        <div>
                          <span className="text-[10px] uppercase tracking-wider font-semibold block mb-1" style={{ color: '#6b7280' }}>
                            Current Value
                          </span>
                          <p className="text-sm" style={{ color: '#6b7280' }}>
                            {formatValue(suggestion.current_value)}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </main>
        </div>
      </div>
      </div>
    </AppLayout>
  )
}

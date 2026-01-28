'use client'

import {
  Sparkles,
  Loader2,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  Filter,
  History,
  FileQuestion,
} from 'lucide-react'
import { AI_PROVIDERS, AIProvider } from '@/lib/ai/config'
import { AppLayout } from '@/components/layout/app-layout'
import { MobileLayout, MobileBottomSheet } from '@/components/mobile'
import type { VaultCharacter, IntelligenceSuggestion, ConfidenceLevel } from '@/types/database'

// Icons for each suggestion type
const SUGGESTION_ICONS: Record<string, any> = {
  summary: FileQuestion,
  completeness: FileQuestion,
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
}

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

export interface CharacterIntelligencePageMobileProps {
  characterId: string
  character: VaultCharacter | null
  suggestions: IntelligenceSuggestion[]
  counts: { pending: number; applied: number; rejected: number }
  loading: boolean
  canUseAI: boolean
  isAnalyzing: boolean
  analysisError: string | null
  selectedProvider: AIProvider
  showHistory: boolean
  setShowHistory: (show: boolean) => void
  typeFilters: Set<string>
  confidenceFilters: Set<ConfidenceLevel>
  toggleTypeFilter: (type: string) => void
  toggleConfidenceFilter: (level: ConfidenceLevel) => void
  filteredSuggestions: IntelligenceSuggestion[]
  suggestionCounts: Record<string, number>
  processingIds: Set<string>
  isFilterSheetOpen: boolean
  setIsFilterSheetOpen: (open: boolean) => void
  handleAnalyze: () => void
  handleAction: (suggestionId: string, action: 'approve' | 'reject') => void
}

export function CharacterIntelligencePageMobile({
  characterId,
  character,
  suggestions,
  counts,
  loading,
  canUseAI,
  isAnalyzing,
  analysisError,
  selectedProvider,
  showHistory,
  setShowHistory,
  typeFilters,
  confidenceFilters,
  toggleTypeFilter,
  toggleConfidenceFilter,
  filteredSuggestions,
  suggestionCounts,
  processingIds,
  isFilterSheetOpen,
  setIsFilterSheetOpen,
  handleAnalyze,
  handleAction,
}: CharacterIntelligencePageMobileProps) {
  if (loading) {
    return (
      <AppLayout characterId={characterId}>
        <MobileLayout title="Intelligence" showBackButton backHref={`/vault/${characterId}`}>
          <div className="flex items-center justify-center h-[60vh]">
            <Loader2 className="w-10 h-10 animate-spin text-[--arcane-purple]" />
          </div>
        </MobileLayout>
      </AppLayout>
    )
  }

  if (!canUseAI) {
    return null
  }

  return (
    <AppLayout characterId={characterId}>
      <MobileLayout
        title="Intelligence"
        showBackButton
        backHref={`/vault/${characterId}`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFilterSheetOpen(true)}
              className={`p-2 rounded-lg transition-colors ${
                (typeFilters.size > 0 || confidenceFilters.size > 0)
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'active:bg-white/10 text-gray-400'
              }`}
            >
              <Filter className="w-5 h-5" />
            </button>
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="p-2 rounded-lg bg-[--arcane-purple] active:bg-[--arcane-purple]/80 transition-colors"
            >
              {isAnalyzing ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
        }
      >
        <div className="px-4 pb-24">
          {/* Stats Bar */}
          <div className="flex items-center justify-between py-3 mb-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-4 text-xs">
              <span className="text-purple-400">{counts.pending} pending</span>
              <span className="text-emerald-400">{counts.applied} applied</span>
            </div>
            <span className="text-xs text-gray-500">
              {character?.last_intelligence_run
                ? `Last: ${formatTimeAgo(character.last_intelligence_run)}`
                : 'Never analyzed'}
            </span>
          </div>

          {/* Error */}
          {analysisError && (
            <div className="flex items-center gap-2 p-3 rounded-xl mb-4 bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">{analysisError}</p>
            </div>
          )}

          {/* Analyzing State */}
          {isAnalyzing && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-14 h-14 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center mb-4">
                <Loader2 className="w-7 h-7 text-purple-400 animate-spin" />
              </div>
              <p className="text-white font-medium mb-1">Analyzing...</p>
              <p className="text-xs text-gray-500">Using {AI_PROVIDERS[selectedProvider].name}</p>
            </div>
          )}

          {/* Empty State */}
          {!isAnalyzing && filteredSuggestions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-14 h-14 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              </div>
              <p className="text-white font-medium mb-1">
                {suggestions.length === 0 ? 'No Pending Suggestions' : 'No Matches'}
              </p>
              <p className="text-xs text-gray-500 text-center px-6">
                {suggestions.length === 0
                  ? 'Run an analysis to detect improvements'
                  : 'Adjust your filters'}
              </p>
            </div>
          )}

          {/* Suggestions List */}
          {!isAnalyzing && filteredSuggestions.length > 0 && (
            <div className="space-y-3">
              {filteredSuggestions.map(suggestion => {
                const Icon = SUGGESTION_ICONS[suggestion.suggestion_type] || FileQuestion
                const colors = SUGGESTION_COLORS[suggestion.suggestion_type] || SUGGESTION_COLORS.completeness
                const isProcessing = processingIds.has(suggestion.id)

                return (
                  <div
                    key={suggestion.id}
                    className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]"
                  >
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded"
                        style={{ backgroundColor: colors.bg, color: colors.text }}
                      >
                        <Icon className="w-3 h-3" />
                        {SUGGESTION_LABELS[suggestion.suggestion_type] || suggestion.suggestion_type}
                      </span>
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/5"
                        style={{ color: CONFIDENCE_COLORS[suggestion.confidence] }}
                      >
                        {suggestion.confidence}
                      </span>
                    </div>

                    {/* Field */}
                    <p className="text-sm font-medium text-white mb-2">
                      {suggestion.field_name.replace(/_/g, ' ')}
                    </p>

                    {/* Value */}
                    <div
                      className="text-xs p-2 rounded-lg mb-3"
                      style={{ backgroundColor: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.15)' }}
                    >
                      <p className="text-gray-300 line-clamp-3">
                        {formatValue(suggestion.suggested_value)}
                      </p>
                    </div>

                    {/* Actions */}
                    {suggestion.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAction(suggestion.id, 'approve')}
                          disabled={isProcessing}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 active:bg-emerald-500/20 transition-colors text-sm font-medium disabled:opacity-50"
                        >
                          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          Apply
                        </button>
                        <button
                          onClick={() => handleAction(suggestion.id, 'reject')}
                          disabled={isProcessing}
                          className="py-2 px-3 rounded-lg bg-red-500/10 text-red-400 active:bg-red-500/20 transition-colors disabled:opacity-50"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </MobileLayout>

      {/* Filter Bottom Sheet */}
      <MobileBottomSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        title="Filters"
      >
        <div className="space-y-6">
          {/* History Toggle */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
              showHistory ? 'bg-purple-500/15 text-purple-400' : 'bg-white/5 text-gray-400'
            }`}
          >
            <History className="w-5 h-5" />
            <span className="flex-1 text-left">Show History</span>
            {showHistory && <Check className="w-4 h-4" />}
          </button>

          {/* Type Filters */}
          {suggestions.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Filter by Type</h3>
              <div className="flex flex-wrap gap-2">
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
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        isActive ? 'ring-1 ring-white/20' : ''
                      }`}
                      style={{
                        backgroundColor: isActive ? colors.bg : 'rgba(255,255,255,0.05)',
                        color: isActive ? colors.text : '#9ca3af',
                      }}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {SUGGESTION_LABELS[type] || type}
                      <span className="ml-1 opacity-60">{count}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Confidence Filters */}
          {suggestions.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Filter by Confidence</h3>
              <div className="flex gap-2">
                {(['high', 'medium', 'low'] as ConfidenceLevel[]).map(level => {
                  const count = suggestions.filter(s => s.confidence === level).length
                  const isActive = confidenceFilters.has(level)
                  const color = CONFIDENCE_COLORS[level]
                  return (
                    <button
                      key={level}
                      onClick={() => toggleConfidenceFilter(level)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                        isActive ? 'ring-1 ring-white/20' : ''
                      }`}
                      style={{
                        backgroundColor: isActive ? `${color}15` : 'rgba(255,255,255,0.05)',
                        color: isActive ? color : '#9ca3af',
                      }}
                    >
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                      {level} ({count})
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Clear Filters */}
          {(typeFilters.size > 0 || confidenceFilters.size > 0) && (
            <button
              className="w-full py-2 text-sm text-gray-400 active:text-white transition-colors"
              onClick={() => {
                toggleTypeFilter('__clear__')
              }}
            >
              Clear all filters
            </button>
          )}
        </div>
      </MobileBottomSheet>
    </AppLayout>
  )
}

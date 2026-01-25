'use client'

import { cn } from '@/lib/utils'
import {
  Sparkles,
  Loader2,
  Check,
  X,
  Filter,
  AlertCircle,
  CheckCircle2,
  Edit2,
  History,
  Clock,
} from 'lucide-react'
import NextLink from 'next/link'
import { Modal } from '@/components/ui'
import { TimelineEventEditor, type TimelineEventFormData } from '@/components/timeline'
import { AppLayout } from '@/components/layout/app-layout'
import { MobileLayout, MobileBottomSheet } from '@/components/mobile'
import { AI_PROVIDERS, AIProvider } from '@/lib/ai/config'
import type { Campaign, Character, Session, IntelligenceSuggestion, SuggestionType, ConfidenceLevel } from '@/types/database'

// Shared constants from main file
const SUGGESTION_ICONS: Record<string, any> = {
  status_change: require('lucide-react').Skull,
  secret_revealed: require('lucide-react').Eye,
  story_hook: require('lucide-react').Bookmark,
  quote: require('lucide-react').Quote,
  important_person: require('lucide-react').User,
  relationship: require('lucide-react').Link,
  timeline_event: require('lucide-react').CalendarDays,
  completeness: require('lucide-react').FileQuestion,
  consistency: require('lucide-react').AlertTriangle,
  npc_detected: require('lucide-react').UserPlus,
  location_detected: require('lucide-react').MapPin,
  plot_hook: require('lucide-react').Lightbulb,
  enrichment: require('lucide-react').Wand2,
  timeline_issue: require('lucide-react').Clock,
  grammar: require('lucide-react').Type,
  formatting: require('lucide-react').ListChecks,
  lore_conflict: require('lucide-react').AlertTriangle,
  redundancy: require('lucide-react').Copy,
  voice_inconsistency: require('lucide-react').MessageSquare,
  relationship_gap: require('lucide-react').Link2,
  secret_opportunity: require('lucide-react').Eye,
  cross_reference: require('lucide-react').GitMerge,
}

const SUGGESTION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  status_change: { bg: 'rgba(239, 68, 68, 0.12)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' },
  secret_revealed: { bg: 'rgba(139, 92, 246, 0.12)', text: '#a78bfa', border: 'rgba(139, 92, 246, 0.3)' },
  story_hook: { bg: 'rgba(59, 130, 246, 0.12)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' },
  quote: { bg: 'rgba(16, 185, 129, 0.12)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' },
  important_person: { bg: 'rgba(245, 158, 11, 0.12)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' },
  relationship: { bg: 'rgba(236, 72, 153, 0.12)', text: '#f472b6', border: 'rgba(236, 72, 153, 0.3)' },
  timeline_event: { bg: 'rgba(99, 102, 241, 0.12)', text: '#818cf8', border: 'rgba(99, 102, 241, 0.3)' },
  completeness: { bg: 'rgba(251, 191, 36, 0.12)', text: '#fbbf24', border: 'rgba(251, 191, 36, 0.3)' },
  consistency: { bg: 'rgba(249, 115, 22, 0.12)', text: '#fb923c', border: 'rgba(249, 115, 22, 0.3)' },
  npc_detected: { bg: 'rgba(34, 211, 238, 0.12)', text: '#22d3ee', border: 'rgba(34, 211, 238, 0.3)' },
  location_detected: { bg: 'rgba(74, 222, 128, 0.12)', text: '#4ade80', border: 'rgba(74, 222, 128, 0.3)' },
  plot_hook: { bg: 'rgba(192, 132, 252, 0.12)', text: '#c084fc', border: 'rgba(192, 132, 252, 0.3)' },
  enrichment: { bg: 'rgba(56, 189, 248, 0.12)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.3)' },
  timeline_issue: { bg: 'rgba(251, 146, 60, 0.12)', text: '#fb923c', border: 'rgba(251, 146, 60, 0.3)' },
  grammar: { bg: 'rgba(239, 68, 68, 0.12)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' },
  formatting: { bg: 'rgba(99, 102, 241, 0.12)', text: '#818cf8', border: 'rgba(99, 102, 241, 0.3)' },
  lore_conflict: { bg: 'rgba(239, 68, 68, 0.12)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' },
  redundancy: { bg: 'rgba(156, 163, 175, 0.12)', text: '#9ca3af', border: 'rgba(156, 163, 175, 0.3)' },
  voice_inconsistency: { bg: 'rgba(236, 72, 153, 0.12)', text: '#f472b6', border: 'rgba(236, 72, 153, 0.3)' },
  relationship_gap: { bg: 'rgba(245, 158, 11, 0.12)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' },
  secret_opportunity: { bg: 'rgba(139, 92, 246, 0.12)', text: '#a78bfa', border: 'rgba(139, 92, 246, 0.3)' },
  cross_reference: { bg: 'rgba(59, 130, 246, 0.12)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' },
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

function formatValue(value: unknown, suggestionType?: SuggestionType): string {
  if (value === null || value === undefined) return 'None'
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    if (suggestionType === 'timeline_event' && 'title' in (value as object)) {
      const e = value as { title: string; description: string; event_type: string; character_names?: string[] }
      return `${e.title} (${e.event_type})${e.character_names?.length ? ` - ${e.character_names.join(', ')}` : ''}`
    }
    if ('status' in (value as object)) {
      return (value as { status: string }).status
    }
    if ('name' in (value as object)) {
      const p = value as { name: string; relationship: string; notes?: string }
      return `${p.name} (${p.relationship})`
    }
    if ('hook' in (value as object)) {
      return (value as { hook: string }).hook
    }
    return JSON.stringify(value)
  }
  return String(value)
}

export interface CampaignIntelligencePageMobileProps {
  campaignId: string
  campaign: Campaign | null
  characters: Character[]
  sessions: Session[]
  suggestions: IntelligenceSuggestion[]
  counts: { pending: number; applied: number; rejected: number }
  loading: boolean
  canUseAI: boolean
  isAnalyzing: boolean
  analysisError: string | null
  selectedProvider: AIProvider
  showHistory: boolean
  setShowHistory: (show: boolean) => void
  typeFilters: Set<SuggestionType>
  confidenceFilters: Set<ConfidenceLevel>
  toggleTypeFilter: (type: SuggestionType) => void
  toggleConfidenceFilter: (level: ConfidenceLevel) => void
  filteredSuggestions: IntelligenceSuggestion[]
  suggestionCounts: Record<SuggestionType, number>
  processingIds: Set<string>
  isFilterSheetOpen: boolean
  setIsFilterSheetOpen: (open: boolean) => void
  handleAnalyze: () => void
  handleAction: (suggestionId: string, action: 'approve' | 'reject', finalValue?: unknown) => void
  getCharacterForSuggestion: (suggestion: IntelligenceSuggestion) => Character | null
  // Edit modal state
  editingSuggestion: IntelligenceSuggestion | null
  setEditingSuggestion: (suggestion: IntelligenceSuggestion | null) => void
  editFormData: TimelineEventFormData
  setEditFormData: (data: TimelineEventFormData) => void
  openEditModal: (suggestion: IntelligenceSuggestion) => void
  handleSaveEdit: () => void
  // Cooldown state
  cooldownStatus?: {
    isOnCooldown: boolean
    remainingFormatted: string
    availableAt: string | null
  } | null
}

export function CampaignIntelligencePageMobile({
  campaignId,
  campaign,
  characters,
  sessions,
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
  getCharacterForSuggestion,
  editingSuggestion,
  setEditingSuggestion,
  editFormData,
  setEditFormData,
  openEditModal,
  handleSaveEdit,
  cooldownStatus,
}: CampaignIntelligencePageMobileProps) {
  if (loading) {
    return (
      <AppLayout campaignId={campaignId}>
        <MobileLayout title="Intelligence" showBackButton backHref={`/campaigns/${campaignId}/canvas`}>
          <div className="flex items-center justify-center h-[60vh]">
            <div className="w-10 h-10 border-2 border-[--arcane-purple] border-t-transparent rounded-full spinner" />
          </div>
        </MobileLayout>
      </AppLayout>
    )
  }

  if (!canUseAI) {
    return null
  }

  return (
    <AppLayout campaignId={campaignId}>
      <MobileLayout
        title="Intelligence"
        showBackButton
        backHref={`/campaigns/${campaignId}/canvas`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFilterSheetOpen(true)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                (typeFilters.size > 0 || confidenceFilters.size > 0)
                  ? "bg-purple-500/20 text-purple-400"
                  : "active:bg-white/10 text-gray-400"
              )}
            >
              <Filter className="w-5 h-5" />
            </button>
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || cooldownStatus?.isOnCooldown}
              className={cn(
                "p-2 rounded-lg transition-colors",
                cooldownStatus?.isOnCooldown
                  ? "bg-amber-500/20 text-amber-400"
                  : "bg-[--arcane-purple] active:bg-[--arcane-purple]/80"
              )}
            >
              {isAnalyzing ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : cooldownStatus?.isOnCooldown ? (
                <Clock className="w-5 h-5" />
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
              {campaign?.last_intelligence_run
                ? `Last: ${formatTimeAgo(campaign.last_intelligence_run)}`
                : 'Never analyzed'}
            </span>
          </div>

          {/* Cooldown Banner */}
          {cooldownStatus?.isOnCooldown && (
            <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-amber-300 text-sm">
                    Available in {cooldownStatus.remainingFormatted}
                  </p>
                  <p className="text-xs text-amber-400/70 mt-1">
                    Update session notes while you wait for best results.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <button
                      onClick={() => setShowHistory(true)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-amber-300 bg-amber-500/20 active:bg-amber-500/30 rounded-lg transition-colors"
                    >
                      <History className="w-3.5 h-3.5" />
                      Previous Suggestions
                    </button>
                    <NextLink
                      href={`/campaigns/${campaignId}/sessions`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-400 active:text-gray-300 transition-colors"
                    >
                      Update Notes
                    </NextLink>
                  </div>
                </div>
              </div>
            </div>
          )}

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
                  ? 'Run an analysis to detect updates'
                  : 'Adjust your filters'}
              </p>
            </div>
          )}

          {/* Suggestions List */}
          {!isAnalyzing && filteredSuggestions.length > 0 && (
            <div className="space-y-3">
              {filteredSuggestions.map(suggestion => {
                const Icon = SUGGESTION_ICONS[suggestion.suggestion_type]
                const colors = SUGGESTION_COLORS[suggestion.suggestion_type] || SUGGESTION_COLORS.completeness
                const isProcessing = processingIds.has(suggestion.id)
                const character = getCharacterForSuggestion(suggestion)

                return (
                  <div
                    key={suggestion.id}
                    className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]"
                  >
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: colors.bg }}
                      >
                        <Icon className="w-4 h-4" style={{ color: colors.text }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-white truncate">
                          {suggestion.suggestion_type === 'timeline_event'
                            ? (suggestion.suggested_value as { title?: string })?.title || 'Timeline Event'
                            : suggestion.character_name || character?.name || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {suggestion.suggestion_type.replace(/_/g, ' ')} • {suggestion.confidence} confidence
                        </p>
                      </div>
                    </div>

                    {/* Value */}
                    <div
                      className="text-sm p-2 rounded-lg mb-3"
                      style={{ backgroundColor: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.15)' }}
                    >
                      <p className="text-gray-300 text-xs line-clamp-2">
                        {formatValue(suggestion.suggested_value, suggestion.suggestion_type)}
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
                        {suggestion.suggestion_type === 'timeline_event' && (
                          <button
                            onClick={() => openEditModal(suggestion)}
                            disabled={isProcessing}
                            className="py-2 px-3 rounded-lg bg-blue-500/10 text-blue-400 active:bg-blue-500/20 transition-colors disabled:opacity-50"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
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
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-lg transition-colors",
              showHistory ? "bg-purple-500/15 text-purple-400" : "bg-white/5 text-gray-400"
            )}
          >
            <History className="w-5 h-5" />
            <span className="flex-1 text-left">Show History</span>
            {showHistory && <Check className="w-4 h-4" />}
          </button>

          {/* Type Filters */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Filter by Type</h3>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(SUGGESTION_ICONS) as SuggestionType[]).map(type => {
                const count = suggestionCounts[type] || 0
                if (count === 0 && typeFilters.size === 0) return null
                const Icon = SUGGESTION_ICONS[type]
                const colors = SUGGESTION_COLORS[type] || SUGGESTION_COLORS.completeness
                const isActive = typeFilters.has(type)
                return (
                  <button
                    key={type}
                    onClick={() => toggleTypeFilter(type)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                      isActive ? "ring-1 ring-white/20" : ""
                    )}
                    style={{
                      backgroundColor: isActive ? colors.bg : 'rgba(255,255,255,0.05)',
                      color: isActive ? colors.text : '#9ca3af',
                    }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {type.replace(/_/g, ' ')}
                    <span className="ml-1 opacity-60">{count}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Confidence Filters */}
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
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all",
                      isActive ? "ring-1 ring-white/20" : ""
                    )}
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

          {/* Clear Filters */}
          {(typeFilters.size > 0 || confidenceFilters.size > 0) && (
            <button
              className="w-full py-2 text-sm text-gray-400 active:text-white transition-colors"
              onClick={() => {
                // Clear all filters - main component handles the state
                Array.from(typeFilters).forEach(type => toggleTypeFilter(type))
                Array.from(confidenceFilters).forEach(level => toggleConfidenceFilter(level))
              }}
            >
              Clear all filters
            </button>
          )}
        </div>
      </MobileBottomSheet>

      {/* Edit Timeline Event Modal */}
      <Modal
        isOpen={!!editingSuggestion}
        onClose={() => setEditingSuggestion(null)}
        title="Edit Timeline Event"
        description="Edit the details before adding to your timeline"
        size="lg"
      >
        <div className="space-y-4">
          <TimelineEventEditor
            formData={editFormData}
            onChange={setEditFormData}
            characters={characters}
            sessions={sessions}
            mode="compact"
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-[--border]">
            <button
              className="btn btn-secondary"
              onClick={() => setEditingSuggestion(null)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSaveEdit}
              disabled={!editFormData.title.trim()}
            >
              Save & Add
            </button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}

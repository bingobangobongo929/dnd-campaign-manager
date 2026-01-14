'use client'

import { useState } from 'react'
import {
  Filter,
  Check,
  Loader2,
  RotateCcw,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Square,
  CheckSquare,
  Skull,
  Eye,
  Bookmark,
  Quote,
  User,
  Link,
  Grid3X3,
  List,
} from 'lucide-react'
import { SuggestionCard, GeneratedSuggestion } from './suggestion-card'
import type { Character, SuggestionType, ConfidenceLevel } from '@/types/database'

interface HubSuggestionsProps {
  suggestions: GeneratedSuggestion[]
  allSuggestions: GeneratedSuggestion[]
  characters: Character[]
  selectedIndices: Set<number>
  onToggle: (index: number) => void
  onSelectAll: () => void
  onDeselectAll: () => void
  suggestionCounts: Record<SuggestionType, number>
  typeFilters: Set<SuggestionType>
  onTypeFilterChange: (filters: Set<SuggestionType>) => void
  confidenceFilters: Set<ConfidenceLevel>
  onConfidenceFilterChange: (filters: Set<ConfidenceLevel>) => void
  isAnalyzing: boolean
  noNewContent: boolean
  analysisError: string | null
  onAnalyze: () => void
  onReset: () => void
  isResetting: boolean
}

const SUGGESTION_TYPES: { type: SuggestionType; label: string; icon: typeof Skull; color: string }[] = [
  { type: 'status_change', label: 'Status Changes', icon: Skull, color: '#f87171' },
  { type: 'secret_revealed', label: 'Secrets Revealed', icon: Eye, color: '#a78bfa' },
  { type: 'story_hook', label: 'Story Hooks', icon: Bookmark, color: '#60a5fa' },
  { type: 'quote', label: 'Quotes', icon: Quote, color: '#34d399' },
  { type: 'important_person', label: 'Important People', icon: User, color: '#fbbf24' },
  { type: 'relationship', label: 'Relationships', icon: Link, color: '#f472b6' },
]

const CONFIDENCE_LEVELS: { level: ConfidenceLevel; label: string; color: string }[] = [
  { level: 'high', label: 'High', color: '#10B981' },
  { level: 'medium', label: 'Medium', color: '#F59E0B' },
  { level: 'low', label: 'Low', color: '#EF4444' },
]

export function HubSuggestions({
  suggestions,
  allSuggestions,
  characters,
  selectedIndices,
  onToggle,
  onSelectAll,
  onDeselectAll,
  suggestionCounts,
  typeFilters,
  onTypeFilterChange,
  confidenceFilters,
  onConfidenceFilterChange,
  isAnalyzing,
  noNewContent,
  analysisError,
  onAnalyze,
  onReset,
  isResetting,
}: HubSuggestionsProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')

  const toggleTypeFilter = (type: SuggestionType) => {
    const next = new Set(typeFilters)
    if (next.has(type)) {
      next.delete(type)
    } else {
      next.add(type)
    }
    onTypeFilterChange(next)
  }

  const toggleConfidenceFilter = (level: ConfidenceLevel) => {
    const next = new Set(confidenceFilters)
    if (next.has(level)) {
      next.delete(level)
    } else {
      next.add(level)
    }
    onConfidenceFilterChange(next)
  }

  const getCharacterForSuggestion = (suggestion: GeneratedSuggestion) => {
    if (suggestion.character_id) {
      return characters.find(c => c.id === suggestion.character_id)
    }
    return characters.find(c =>
      c.name.toLowerCase() === suggestion.character_name.toLowerCase()
    )
  }

  // Get the original index in allSuggestions for a filtered suggestion
  const getOriginalIndex = (filteredIndex: number): number => {
    const suggestion = suggestions[filteredIndex]
    return allSuggestions.indexOf(suggestion)
  }

  const hasFilters = typeFilters.size > 0 || confidenceFilters.size > 0

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <aside className="intelligence-hub-sidebar">
        <div className="space-y-6">
          {/* Actions */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#6b7280' }}>
              Actions
            </h3>
            <div className="space-y-2">
              <button
                className="btn btn-primary w-full flex items-center justify-center gap-2"
                onClick={onAnalyze}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {isAnalyzing ? 'Analyzing...' : 'Analyze New Content'}
              </button>
              <button
                className="btn btn-secondary w-full flex items-center justify-center gap-2"
                onClick={onReset}
                disabled={isResetting}
              >
                {isResetting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
                Re-scan Everything
              </button>
            </div>
          </div>

          {/* Selection */}
          {allSuggestions.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#6b7280' }}>
                Selection
              </h3>
              <div className="space-y-2">
                <button
                  className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-2"
                  style={{ color: '#9ca3af' }}
                  onClick={onSelectAll}
                >
                  <CheckSquare className="w-4 h-4" />
                  Select All ({suggestions.length})
                </button>
                <button
                  className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-2"
                  style={{ color: '#9ca3af' }}
                  onClick={onDeselectAll}
                >
                  <Square className="w-4 h-4" />
                  Deselect All
                </button>
              </div>
            </div>
          )}

          {/* Filter by Type */}
          {allSuggestions.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: '#6b7280' }}>
                <Filter className="w-3.5 h-3.5" />
                Filter by Type
              </h3>
              <div className="space-y-1">
                {SUGGESTION_TYPES.map(({ type, label, icon: Icon, color }) => {
                  const count = suggestionCounts[type] || 0
                  if (count === 0) return null
                  const isActive = typeFilters.has(type)
                  return (
                    <button
                      key={type}
                      onClick={() => toggleTypeFilter(type)}
                      className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-all flex items-center gap-2 ${
                        isActive ? 'ring-1 ring-white/20' : ''
                      }`}
                      style={{
                        backgroundColor: isActive ? `${color}15` : 'transparent',
                        color: isActive ? color : '#9ca3af',
                      }}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="flex-1">{label}</span>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                      >
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Filter by Confidence */}
          {allSuggestions.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#6b7280' }}>
                Filter by Confidence
              </h3>
              <div className="space-y-1">
                {CONFIDENCE_LEVELS.map(({ level, label, color }) => {
                  const count = allSuggestions.filter(s => s.confidence === level).length
                  if (count === 0) return null
                  const isActive = confidenceFilters.has(level)
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
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="flex-1">{label}</span>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                      >
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Clear Filters */}
          {hasFilters && (
            <button
              className="w-full text-sm px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-center"
              style={{ color: '#9ca3af' }}
              onClick={() => {
                onTypeFilterChange(new Set())
                onConfidenceFilterChange(new Set())
              }}
            >
              Clear all filters
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="intelligence-hub-content">
        {/* Error display */}
        {analysisError && (
          <div
            className="flex items-center gap-3 p-4 rounded-xl mb-4"
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
        )}

        {/* Analyzing state */}
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
              Analyzing Campaign
            </p>
            <p className="text-sm text-center max-w-md" style={{ color: '#6b7280' }}>
              Scanning sessions, character updates, and relationships for changes since last analysis...
            </p>
          </div>
        )}

        {/* No new content state */}
        {!isAnalyzing && noNewContent && allSuggestions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-lg font-semibold mb-2" style={{ color: '#f3f4f6' }}>
              All Caught Up!
            </p>
            <p className="text-sm text-center max-w-md" style={{ color: '#6b7280' }}>
              No new sessions or character updates since the last analysis.
              Add new session notes or update characters, then run the analysis again.
            </p>
          </div>
        )}

        {/* Empty state (no analysis run yet) */}
        {!isAnalyzing && !noNewContent && allSuggestions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
              style={{
                backgroundColor: 'rgba(139, 92, 246, 0.15)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
              }}
            >
              <Sparkles className="w-8 h-8 text-[#8B5CF6]" />
            </div>
            <p className="text-lg font-semibold mb-2" style={{ color: '#f3f4f6' }}>
              Ready to Analyze
            </p>
            <p className="text-sm text-center max-w-md mb-6" style={{ color: '#6b7280' }}>
              Click &quot;Analyze New Content&quot; in the sidebar to scan your campaign for character updates, new relationships, quotes, and more.
            </p>
          </div>
        )}

        {/* Suggestions list */}
        {!isAnalyzing && suggestions.length > 0 && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold" style={{ color: '#f3f4f6' }}>
                  {suggestions.length} Suggestion{suggestions.length !== 1 ? 's' : ''}
                  {hasFilters && ` (filtered from ${allSuggestions.length})`}
                </h2>
                <p className="text-xs" style={{ color: '#6b7280' }}>
                  {selectedIndices.size} selected
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white/10' : 'hover:bg-white/5'}`}
                  style={{ color: viewMode === 'list' ? '#f3f4f6' : '#6b7280' }}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white/10' : 'hover:bg-white/5'}`}
                  style={{ color: viewMode === 'grid' ? '#f3f4f6' : '#6b7280' }}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Suggestions grid/list */}
            <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'space-y-3'}>
              {suggestions.map((suggestion, filteredIndex) => {
                const originalIndex = getOriginalIndex(filteredIndex)
                return (
                  <SuggestionCard
                    key={originalIndex}
                    suggestion={suggestion}
                    character={getCharacterForSuggestion(suggestion)}
                    isSelected={selectedIndices.has(originalIndex)}
                    onToggle={() => onToggle(originalIndex)}
                  />
                )
              })}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  Brain,
  Sparkles,
  Clock,
  LayoutDashboard,
  ListChecks,
  Filter,
  Check,
  Loader2,
  RotateCcw,
  ChevronDown,
} from 'lucide-react'
import { HubOverview } from './hub-overview'
import { HubSuggestions } from './hub-suggestions'
import { HubTimeline } from './hub-timeline'
import { GeneratedSuggestion } from './suggestion-card'
import type { Campaign, Character, Session, TimelineEvent, SuggestionType, ConfidenceLevel } from '@/types/database'

interface CampaignHubProps {
  isOpen: boolean
  onClose: () => void
  campaign: Campaign
  characters: Character[]
  sessions: Session[]
  timelineEvents: TimelineEvent[]
  onDataRefresh: () => void
}

type TabId = 'overview' | 'suggestions' | 'timeline'

interface TabConfig {
  id: TabId
  label: string
  icon: typeof LayoutDashboard
  count?: number
}

interface AnalysisStats {
  sessionsAnalyzed: number
  charactersUpdated: number
  totalCharacters: number
  totalRelationships: number
}

export function CampaignHub({
  isOpen,
  onClose,
  campaign,
  characters,
  sessions,
  timelineEvents,
  onDataRefresh,
}: CampaignHubProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [mounted, setMounted] = useState(false)

  // Suggestions state
  const [suggestions, setSuggestions] = useState<GeneratedSuggestion[]>([])
  const [selectedSuggestionIndices, setSelectedSuggestionIndices] = useState<Set<number>>(new Set())
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [analysisStats, setAnalysisStats] = useState<AnalysisStats | null>(null)
  const [noNewContent, setNoNewContent] = useState(false)

  // Filter state
  const [typeFilters, setTypeFilters] = useState<Set<SuggestionType>>(new Set())
  const [confidenceFilters, setConfidenceFilters] = useState<Set<ConfidenceLevel>>(new Set())

  // Timeline generation state
  const [generatedTimelineEvents, setGeneratedTimelineEvents] = useState<Array<{
    title: string
    description: string
    event_type: string
    character_ids: string[]
  }>>([])
  const [selectedTimelineIndices, setSelectedTimelineIndices] = useState<Set<number>>(new Set())
  const [isGeneratingTimeline, setIsGeneratingTimeline] = useState(false)
  const [timelineError, setTimelineError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleAnalyze = useCallback(async () => {
    setIsAnalyzing(true)
    setAnalysisError(null)
    setNoNewContent(false)

    try {
      const response = await fetch('/api/ai/analyze-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: campaign.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMsg = data.details
          ? `${data.error}: ${data.details}`
          : data.error || 'Failed to analyze campaign'
        throw new Error(errorMsg)
      }

      if (data.message === 'No new content since last analysis') {
        setNoNewContent(true)
        setSuggestions([])
        setSelectedSuggestionIndices(new Set())
      } else {
        setSuggestions(data.suggestions || [])
        setSelectedSuggestionIndices(new Set(data.suggestions?.map((_: GeneratedSuggestion, i: number) => i) || []))
        setNoNewContent(false)
      }

      setAnalysisStats(data.stats || null)

      // Auto-switch to suggestions tab if we got results
      if (data.suggestions?.length > 0) {
        setActiveTab('suggestions')
      }
    } catch (err) {
      console.error('Analysis error:', err)
      setAnalysisError(err instanceof Error ? err.message : 'Failed to analyze campaign')
    } finally {
      setIsAnalyzing(false)
    }
  }, [campaign.id])

  const handleReset = useCallback(async () => {
    setIsResetting(true)
    try {
      const response = await fetch('/api/ai/reset-intelligence-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: campaign.id }),
      })
      if (response.ok) {
        setNoNewContent(false)
        setSuggestions([])
        setSelectedSuggestionIndices(new Set())
        onDataRefresh()
      }
    } catch (err) {
      console.error('Reset error:', err)
    } finally {
      setIsResetting(false)
    }
  }, [campaign.id, onDataRefresh])

  const handleApplySuggestions = useCallback(async () => {
    const selectedSuggestions = suggestions.filter((_, i) => selectedSuggestionIndices.has(i))
    if (selectedSuggestions.length === 0) return

    setIsApplying(true)

    try {
      const response = await fetch('/api/ai/apply-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.id,
          suggestions: selectedSuggestions,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to apply suggestions')
      }

      // Remove applied suggestions from the list
      const remainingSuggestions = suggestions.filter((_, i) => !selectedSuggestionIndices.has(i))
      setSuggestions(remainingSuggestions)
      setSelectedSuggestionIndices(new Set())

      onDataRefresh()
    } catch (err) {
      console.error('Apply error:', err)
      setAnalysisError(err instanceof Error ? err.message : 'Failed to apply suggestions')
    } finally {
      setIsApplying(false)
    }
  }, [campaign.id, suggestions, selectedSuggestionIndices, onDataRefresh])

  const toggleSuggestion = useCallback((index: number) => {
    setSelectedSuggestionIndices(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }, [])

  // Filter suggestions based on active filters
  const filteredSuggestions = suggestions.filter(s => {
    if (typeFilters.size > 0 && !typeFilters.has(s.suggestion_type)) return false
    if (confidenceFilters.size > 0 && !confidenceFilters.has(s.confidence)) return false
    return true
  })

  // Count suggestions by type for sidebar
  const suggestionCounts = suggestions.reduce((acc, s) => {
    acc[s.suggestion_type] = (acc[s.suggestion_type] || 0) + 1
    return acc
  }, {} as Record<SuggestionType, number>)

  const tabs: TabConfig[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'suggestions', label: 'Suggestions', icon: Sparkles, count: suggestions.length },
    { id: 'timeline', label: 'Timeline', icon: Clock, count: timelineEvents.length },
  ]

  const formatLastRun = (lastRun: string | null): string => {
    if (!lastRun) return 'Never'
    const date = new Date(lastRun)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (!mounted || !isOpen) return null

  return createPortal(
    <div className="intelligence-hub">
      {/* Header */}
      <header className="intelligence-hub-header">
        <div className="flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              backgroundColor: 'rgba(139, 92, 246, 0.15)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
            }}
          >
            <Brain className="w-5 h-5 text-[#8B5CF6]" />
          </div>
          <div>
            <h1 className="text-lg font-semibold" style={{ color: '#f3f4f6' }}>
              Campaign Intelligence
            </h1>
            <p className="text-xs" style={{ color: '#6b7280' }}>
              {campaign.name} • Last analysis: {formatLastRun(campaign.last_intelligence_run)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick action buttons */}
          {activeTab === 'suggestions' && suggestions.length > 0 && (
            <button
              className="btn btn-primary btn-sm flex items-center gap-2"
              onClick={handleApplySuggestions}
              disabled={selectedSuggestionIndices.size === 0 || isApplying}
            >
              {isApplying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Apply {selectedSuggestionIndices.size} Selected
            </button>
          )}

          <button
            className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white/5 transition-colors"
            onClick={onClose}
          >
            <X className="w-5 h-5" style={{ color: '#9ca3af' }} />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav className="intelligence-hub-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`intelligence-hub-tab ${activeTab === tab.id ? 'active' : ''}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="intelligence-hub-tab-count">{tab.count}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Body */}
      <div className="intelligence-hub-body">
        {activeTab === 'overview' && (
          <HubOverview
            campaign={campaign}
            characters={characters}
            sessions={sessions}
            timelineEvents={timelineEvents}
            suggestions={suggestions}
            isAnalyzing={isAnalyzing}
            noNewContent={noNewContent}
            analysisError={analysisError}
            onAnalyze={handleAnalyze}
            onReset={handleReset}
            isResetting={isResetting}
            onSwitchTab={setActiveTab}
          />
        )}

        {activeTab === 'suggestions' && (
          <HubSuggestions
            suggestions={filteredSuggestions}
            allSuggestions={suggestions}
            characters={characters}
            selectedIndices={selectedSuggestionIndices}
            onToggle={toggleSuggestion}
            onSelectAll={() => setSelectedSuggestionIndices(new Set(filteredSuggestions.map((_, i) => suggestions.indexOf(filteredSuggestions[i]))))}
            onDeselectAll={() => setSelectedSuggestionIndices(new Set())}
            suggestionCounts={suggestionCounts}
            typeFilters={typeFilters}
            onTypeFilterChange={setTypeFilters}
            confidenceFilters={confidenceFilters}
            onConfidenceFilterChange={setConfidenceFilters}
            isAnalyzing={isAnalyzing}
            noNewContent={noNewContent}
            analysisError={analysisError}
            onAnalyze={handleAnalyze}
            onReset={handleReset}
            isResetting={isResetting}
          />
        )}

        {activeTab === 'timeline' && (
          <HubTimeline
            campaign={campaign}
            characters={characters}
            sessions={sessions}
            timelineEvents={timelineEvents}
            generatedEvents={generatedTimelineEvents}
            selectedIndices={selectedTimelineIndices}
            onToggleEvent={(index) => {
              setSelectedTimelineIndices(prev => {
                const next = new Set(prev)
                if (next.has(index)) next.delete(index)
                else next.add(index)
                return next
              })
            }}
            isGenerating={isGeneratingTimeline}
            error={timelineError}
            onGenerate={async (selectedSessionIds) => {
              setIsGeneratingTimeline(true)
              setTimelineError(null)
              try {
                const selectedSessions = sessions.filter(s => selectedSessionIds.has(s.id))
                const response = await fetch('/api/ai/generate-timeline', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    sessions: selectedSessions.map(s => ({
                      id: s.id,
                      title: s.title || `Session ${s.session_number}`,
                      notes: s.notes || '',
                      session_date: s.date,
                    })),
                    characters: characters.map(c => ({ id: c.id, name: c.name })),
                  }),
                })
                const data = await response.json()
                if (!response.ok) throw new Error(data.error || 'Failed to generate timeline')
                setGeneratedTimelineEvents(data.events || [])
                setSelectedTimelineIndices(new Set(data.events?.map((_: unknown, i: number) => i) || []))
              } catch (err) {
                setTimelineError(err instanceof Error ? err.message : 'Failed to generate timeline')
              } finally {
                setIsGeneratingTimeline(false)
              }
            }}
            onAddEvents={async () => {
              const selectedEvents = generatedTimelineEvents.filter((_, i) => selectedTimelineIndices.has(i))
              if (selectedEvents.length === 0) return

              try {
                // Add events via API
                const response = await fetch('/api/timeline/bulk-add', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    campaignId: campaign.id,
                    events: selectedEvents.map(e => ({
                      ...e,
                      event_date: new Date().toISOString().split('T')[0],
                    })),
                  }),
                })

                if (response.ok) {
                  setGeneratedTimelineEvents([])
                  setSelectedTimelineIndices(new Set())
                  onDataRefresh()
                }
              } catch (err) {
                console.error('Failed to add timeline events:', err)
              }
            }}
            onDataRefresh={onDataRefresh}
          />
        )}
      </div>
    </div>,
    document.body
  )
}

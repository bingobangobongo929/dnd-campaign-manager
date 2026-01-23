'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Brain,
  Sparkles,
  Loader2,
  Check,
  X,
  Filter,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Skull,
  Eye,
  Bookmark,
  Quote,
  User,
  Link,
  History,
  CalendarDays,
  Edit2,
  FileQuestion,
  AlertTriangle,
  UserPlus,
  MapPin,
  Lightbulb,
  Wand2,
  Clock,
  Type,
  ListChecks,
  Copy,
  MessageSquare,
  Link2,
  GitMerge,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react'
import { Modal, AccessDeniedPage } from '@/components/ui'
import { TimelineEventEditor, type TimelineEventFormData } from '@/components/timeline'
import { AppLayout } from '@/components/layout/app-layout'
import { useSupabase, useUser, useIsMobile, usePermissions } from '@/hooks'
import { CampaignIntelligencePageMobile } from './page.mobile'
import { useAppStore, useCanUseAI } from '@/store'
import { AI_PROVIDERS, AIProvider } from '@/lib/ai/config'
import type { Campaign, Character, Session, IntelligenceSuggestion, SuggestionType, ConfidenceLevel } from '@/types/database'

const SUGGESTION_ICONS: Record<SuggestionType, typeof Skull> = {
  status_change: Skull,
  secret_revealed: Eye,
  story_hook: Bookmark,
  quote: Quote,
  important_person: User,
  relationship: Link,
  timeline_event: CalendarDays,
  completeness: FileQuestion,
  consistency: AlertTriangle,
  npc_detected: UserPlus,
  location_detected: MapPin,
  plot_hook: Lightbulb,
  enrichment: Wand2,
  timeline_issue: Clock,
  // Character Intelligence types
  grammar: Type,
  formatting: ListChecks,
  lore_conflict: AlertTriangle,
  redundancy: Copy,
  voice_inconsistency: MessageSquare,
  relationship_gap: Link2,
  secret_opportunity: Eye,
  cross_reference: GitMerge,
}

const SUGGESTION_COLORS: Record<SuggestionType, { bg: string; text: string; border: string }> = {
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
  // Character Intelligence types
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
    // Timeline event formatting
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

export default function IntelligencePage() {
  const params = useParams()
  const router = useRouter()
  const supabase = useSupabase()
  const { user } = useUser()
  const { aiProvider, settings } = useAppStore()
  const isAdmin = settings?.role === 'moderator' || settings?.role === 'super_admin'
  const canUseAI = useCanUseAI()

  const campaignId = params.id as string
  const isMobile = useIsMobile()

  // Permissions
  const { loading: permissionsLoading, isMember, isDm } = usePermissions(campaignId)

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [characters, setCharacters] = useState<Character[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [suggestions, setSuggestions] = useState<IntelligenceSuggestion[]>([])
  const [counts, setCounts] = useState({ pending: 0, applied: 0, rejected: 0 })
  const [loading, setLoading] = useState(true)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(aiProvider)

  // Filter state
  const [showHistory, setShowHistory] = useState(false)
  const [typeFilters, setTypeFilters] = useState<Set<SuggestionType>>(new Set())
  const [confidenceFilters, setConfidenceFilters] = useState<Set<ConfidenceLevel>>(new Set())
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Action state
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, 'positive' | 'negative'>>({})

  // Edit state for timeline suggestions
  const [editingSuggestion, setEditingSuggestion] = useState<IntelligenceSuggestion | null>(null)
  const [editFormData, setEditFormData] = useState<TimelineEventFormData>({
    title: '',
    description: '',
    event_type: 'other',
    event_date: '',
    session_id: null,
    location: '',
    is_major: false,
    character_ids: [],
  })

  const loadData = useCallback(async () => {
    if (!user || !campaignId) return

    // Only show loading spinner on initial load, not refetches
    if (!hasLoadedOnce) {
      setLoading(true)
    }

    // Load campaign
    const { data: campaignData } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (!campaignData) {
      router.push('/campaigns')
      return
    }
    setCampaign(campaignData)

    // Load characters for reference
    const { data: charactersData } = await supabase
      .from('characters')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('type', { ascending: true })
      .order('name')

    setCharacters(charactersData || [])

    // Load sessions for timeline event linking
    const { data: sessionsData } = await supabase
      .from('sessions')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('session_number', { ascending: false })

    setSessions(sessionsData || [])

    // Load suggestions
    const status = showHistory ? null : 'pending'
    const response = await fetch(`/api/ai/suggestions?campaignId=${campaignId}${status ? `&status=${status}` : ''}`)
    const data = await response.json()

    setSuggestions(data.suggestions || [])
    setCounts(data.counts || { pending: 0, applied: 0, rejected: 0 })

    setLoading(false)
    setHasLoadedOnce(true)
  }, [user, campaignId, showHistory, supabase, router, hasLoadedOnce])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Redirect if AI is disabled
  useEffect(() => {
    if (!loading && !canUseAI) {
      router.push(`/campaigns/${campaignId}/canvas`)
    }
  }, [canUseAI, loading, campaignId, router])

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    setAnalysisError(null)

    try {
      const response = await fetch('/api/ai/analyze-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          provider: selectedProvider,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Analysis failed')
      }

      // Reload suggestions
      await loadData()

      if (data.suggestionsCreated > 0) {
        toast.success(`Analysis complete: ${data.suggestionsCreated} suggestion${data.suggestionsCreated === 1 ? '' : 's'} found`)
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

  const handleReset = async () => {
    setIsResetting(true)
    try {
      await fetch('/api/ai/reset-intelligence-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId }),
      })
      await loadData()
    } catch (err) {
      console.error('Reset error:', err)
    } finally {
      setIsResetting(false)
    }
  }

  // Handle suggestion feedback (thumbs up/down)
  const handleFeedback = async (suggestionId: string, feedback: 'positive' | 'negative') => {
    // Optimistically update UI
    setFeedbackGiven(prev => ({ ...prev, [suggestionId]: feedback }))

    try {
      const suggestion = suggestions.find(s => s.id === suggestionId)

      await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestionId,
          suggestionType: suggestion?.suggestion_type,
          suggestionContent: typeof suggestion?.suggested_value === 'string'
            ? suggestion.suggested_value
            : JSON.stringify(suggestion?.suggested_value),
          feedback,
        }),
      })
    } catch (err) {
      console.error('Failed to submit feedback:', err)
      // Don't revert UI - feedback is non-critical
    }
  }

  const handleAction = async (suggestionId: string, action: 'approve' | 'reject', finalValue?: unknown) => {
    setProcessingIds(prev => new Set(prev).add(suggestionId))

    try {
      const response = await fetch('/api/ai/suggestions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionId, action, finalValue }),
      })

      if (response.ok) {
        // Remove from list or update status
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

  // Open edit modal for timeline suggestions
  const openEditModal = (suggestion: IntelligenceSuggestion) => {
    if (suggestion.suggestion_type !== 'timeline_event') return

    const value = suggestion.suggested_value as {
      title: string
      description: string
      event_type: string
      event_date?: string
      session_id?: string
      location?: string
      is_major?: boolean
      character_names?: string[]
      character_ids?: string[]
    }

    // Try to resolve character names to IDs if we have them
    let resolvedCharacterIds: string[] = value.character_ids || []
    if (resolvedCharacterIds.length === 0 && value.character_names?.length) {
      // Try to match character names to IDs
      resolvedCharacterIds = value.character_names
        .map(name => {
          const char = characters.find(c => c.name.toLowerCase() === name.toLowerCase())
          return char?.id
        })
        .filter((id): id is string => !!id)
    }

    setEditFormData({
      title: value.title || '',
      description: value.description || '',
      event_type: value.event_type || 'other',
      event_date: value.event_date || new Date().toISOString().split('T')[0],
      session_id: value.session_id || null,
      location: value.location || '',
      is_major: value.is_major || false,
      character_ids: resolvedCharacterIds,
    })
    setEditingSuggestion(suggestion)
  }

  // Save edited suggestion
  const handleSaveEdit = async () => {
    if (!editingSuggestion) return

    // Map character IDs back to names for storage
    const characterNames = editFormData.character_ids
      .map(id => characters.find(c => c.id === id)?.name)
      .filter((name): name is string => !!name)

    const finalValue = {
      title: editFormData.title,
      description: editFormData.description,
      event_type: editFormData.event_type,
      event_date: editFormData.event_date,
      session_id: editFormData.session_id,
      location: editFormData.location,
      is_major: editFormData.is_major,
      character_ids: editFormData.character_ids,
      character_names: characterNames,
    }

    await handleAction(editingSuggestion.id, 'approve', finalValue)
    setEditingSuggestion(null)
  }

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleTypeFilter = (type: SuggestionType) => {
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
  }, {} as Record<SuggestionType, number>)

  const getCharacterForSuggestion = (suggestion: IntelligenceSuggestion): Character | null => {
    if (suggestion.character_id) {
      return characters.find(c => c.id === suggestion.character_id) ?? null
    }
    return null
  }

  // State for mobile filter sheet
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)

  // ============ MOBILE LAYOUT ============
  if (isMobile) {
    return (
      <CampaignIntelligencePageMobile
        campaignId={campaignId}
        campaign={campaign}
        characters={characters}
        sessions={sessions}
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
        getCharacterForSuggestion={getCharacterForSuggestion}
        editingSuggestion={editingSuggestion}
        setEditingSuggestion={setEditingSuggestion}
        editFormData={editFormData}
        setEditFormData={setEditFormData}
        openEditModal={openEditModal}
        handleSaveEdit={handleSaveEdit}
      />
    )
  }

  // ============ DESKTOP LAYOUT ============
  if (loading || permissionsLoading) {
    return (
      <AppLayout campaignId={campaignId}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[--arcane-purple]" />
        </div>
      </AppLayout>
    )
  }

  // Permission check - only DMs can access Campaign Intelligence
  if (!isMember || !isDm) {
    return (
      <AppLayout campaignId={campaignId}>
        <AccessDeniedPage
          campaignId={campaignId}
          message="Campaign Intelligence is only available to DMs and Co-DMs."
        />
      </AppLayout>
    )
  }

  if (!canUseAI) {
    return null
  }

  return (
    <AppLayout campaignId={campaignId}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
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
                Campaign Intelligence
              </h1>
            </div>
            <p className="text-sm" style={{ color: '#6b7280' }}>
              {campaign?.last_intelligence_run
                ? `Last analysis: ${formatTimeAgo(campaign.last_intelligence_run)}`
                : 'Never analyzed'}
              {' • '}
              <span style={{ color: '#8B5CF6' }}>{counts.pending} pending</span>
              {' • '}
              <span style={{ color: '#10B981' }}>{counts.applied} applied</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Model Selector - Admin only */}
            {isAdmin && (
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
            )}

            <button
              className="btn btn-secondary flex items-center gap-2"
              onClick={handleReset}
              disabled={isResetting}
            >
              {isResetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              Reset
            </button>

            <button
              className="btn btn-primary flex items-center gap-2"
              onClick={handleAnalyze}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isAnalyzing ? 'Analyzing...' : 'Analyze Campaign'}
            </button>
          </div>
        </div>

        {/* Error */}
        {analysisError && (
          <div
            className="flex items-center gap-3 p-4 rounded-xl mb-6"
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

        {/* Main content */}
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
                  {(Object.keys(SUGGESTION_ICONS) as SuggestionType[]).map(type => {
                    const count = suggestionCounts[type] || 0
                    if (count === 0 && typeFilters.size === 0) return null
                    const Icon = SUGGESTION_ICONS[type]
                    const colors = SUGGESTION_COLORS[type]
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
                        <span className="flex-1 capitalize">{type.replace(/_/g, ' ')}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                          {count}
                        </span>
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

          {/* Suggestions list */}
          <main className="flex-1 space-y-3">
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
                  Using {AI_PROVIDERS[selectedProvider].name} to scan for character updates...
                </p>
              </div>
            )}

            {!isAnalyzing && filteredSuggestions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
                  style={{
                    backgroundColor: suggestions.length === 0 ? 'rgba(139, 92, 246, 0.15)' : 'rgba(107, 114, 128, 0.15)',
                    border: suggestions.length === 0 ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(107, 114, 128, 0.3)',
                  }}
                >
                  {suggestions.length === 0 ? (
                    <Brain className="w-8 h-8" style={{ color: '#a78bfa' }} />
                  ) : (
                    <CheckCircle2 className="w-8 h-8" style={{ color: '#6b7280' }} />
                  )}
                </div>
                <p className="text-lg font-semibold mb-2" style={{ color: '#f3f4f6' }}>
                  {suggestions.length === 0 ? 'Ready to Analyze' : 'No Matches'}
                </p>
                <p className="text-sm text-center max-w-md" style={{ color: '#6b7280' }}>
                  {suggestions.length === 0
                    ? 'Campaign Intelligence scans your session notes to suggest timeline events, detect new NPCs, track relationships, and identify plot threads.'
                    : 'No suggestions match your current filters.'}
                </p>
                {suggestions.length === 0 && (
                  <>
                    <p className="text-xs text-purple-400/80 mt-3 max-w-md italic text-center">
                      For best results, make sure your session notes are up-to-date with detailed summaries of what happened in each session.
                    </p>
                    <button
                      className="btn btn-primary flex items-center gap-2 mt-6"
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                    >
                      <Sparkles className="w-4 h-4" />
                      Analyze Campaign
                    </button>
                  </>
                )}
              </div>
            )}

            {!isAnalyzing && filteredSuggestions.map(suggestion => {
              const Icon = SUGGESTION_ICONS[suggestion.suggestion_type]
              const colors = SUGGESTION_COLORS[suggestion.suggestion_type]
              const isExpanded = expandedIds.has(suggestion.id)
              const isProcessing = processingIds.has(suggestion.id)
              const character = getCharacterForSuggestion(suggestion)

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
                            {suggestion.suggestion_type.replace(/_/g, ' ')}
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
                            Detected {formatTimeAgo(suggestion.created_at)}
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

                        {suggestion.suggestion_type === 'timeline_event' ? (
                          <p className="font-semibold text-[15px] mb-1" style={{ color: '#f3f4f6' }}>
                            {(() => {
                              const val = suggestion.suggested_value as { title?: string; event_type?: string } | null
                              return val?.title || 'New Timeline Event'
                            })()}
                            <span className="font-normal text-sm ml-2" style={{ color: '#6b7280' }}>
                              → Campaign Timeline
                            </span>
                          </p>
                        ) : (
                          <p className="font-semibold text-[15px] mb-1" style={{ color: '#f3f4f6' }}>
                            {suggestion.character_name || character?.name || 'Unknown'}
                            <span className="font-normal text-sm ml-2" style={{ color: '#6b7280' }}>
                              → {suggestion.field_name.replace(/_/g, ' ')}
                            </span>
                          </p>
                        )}

                        {/* Suggested value */}
                        <div
                          className="text-sm p-2 rounded-lg"
                          style={{
                            backgroundColor: 'rgba(139, 92, 246, 0.08)',
                            border: '1px solid rgba(139, 92, 246, 0.15)',
                          }}
                        >
                          <p style={{ color: '#d1d5db' }}>
                            {formatValue(suggestion.suggested_value, suggestion.suggestion_type)}
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
                          {/* Feedback buttons */}
                          <div className="flex items-center gap-1 mr-2 border-r border-white/10 pr-3">
                            <button
                              onClick={() => handleFeedback(suggestion.id, 'positive')}
                              className={cn(
                                "p-1.5 rounded transition-colors",
                                feedbackGiven[suggestion.id] === 'positive'
                                  ? "bg-green-500/20 text-green-400"
                                  : "hover:bg-white/5 text-gray-500 hover:text-gray-400"
                              )}
                              title="Good suggestion"
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleFeedback(suggestion.id, 'negative')}
                              className={cn(
                                "p-1.5 rounded transition-colors",
                                feedbackGiven[suggestion.id] === 'negative'
                                  ? "bg-red-500/20 text-red-400"
                                  : "hover:bg-white/5 text-gray-500 hover:text-gray-400"
                              )}
                              title="Not helpful"
                            >
                              <ThumbsDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <button
                            onClick={() => handleAction(suggestion.id, 'approve')}
                            disabled={isProcessing}
                            className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors disabled:opacity-50"
                            title="Approve"
                          >
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          </button>
                          {suggestion.suggestion_type === 'timeline_event' && (
                            <button
                              onClick={() => openEditModal(suggestion)}
                              disabled={isProcessing}
                              className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors disabled:opacity-50"
                              title="Edit before approving"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
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
                      <div>
                        <span className="text-[10px] uppercase tracking-wider font-semibold block mb-1" style={{ color: '#6b7280' }}>
                          Source from Session Notes
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

                      {/* Current value */}
                      {suggestion.current_value !== null && suggestion.current_value !== undefined && (
                        <div>
                          <span className="text-[10px] uppercase tracking-wider font-semibold block mb-1" style={{ color: '#6b7280' }}>
                            Current Value
                          </span>
                          <p className="text-sm" style={{ color: '#6b7280' }}>
                            {formatValue(suggestion.current_value, suggestion.suggestion_type)}
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
              Save & Add to Timeline
            </button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}

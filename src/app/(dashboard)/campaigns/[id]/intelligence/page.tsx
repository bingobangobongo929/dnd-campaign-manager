'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import NextLink from 'next/link'
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
  Target,
  Swords,
} from 'lucide-react'
import { Modal, AccessDeniedPage } from '@/components/ui'
import { GuidanceTip } from '@/components/guidance/GuidanceTip'
import { TimelineEventEditor, type TimelineEventFormData } from '@/components/timeline'
import { AppLayout, CampaignPageHeader } from '@/components/layout'
import {
  PartyModal,
  TagManager,
  FactionManager,
  RelationshipManager,
} from '@/components/campaign'
import { ResizeToolbar } from '@/components/canvas'
import { UnifiedShareModal } from '@/components/share/UnifiedShareModal'
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
  quest_detected: Target,
  encounter_detected: Swords,
  plot_hook: Lightbulb,
  enrichment: Wand2,
  timeline_issue: Clock,
  summary: FileQuestion,
  // Character Intelligence types
  grammar: Type,
  formatting: ListChecks,
  lore_conflict: AlertTriangle,
  redundancy: Copy,
  voice_inconsistency: MessageSquare,
  relationship_gap: Link2,
  secret_opportunity: Eye,
  cross_reference: GitMerge,
  // Session linking types
  quest_session_link: CalendarDays,
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
  quest_detected: { bg: 'rgba(139, 92, 246, 0.12)', text: '#a78bfa', border: 'rgba(139, 92, 246, 0.3)' },
  encounter_detected: { bg: 'rgba(239, 68, 68, 0.12)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' },
  plot_hook: { bg: 'rgba(192, 132, 252, 0.12)', text: '#c084fc', border: 'rgba(192, 132, 252, 0.3)' },
  enrichment: { bg: 'rgba(56, 189, 248, 0.12)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.3)' },
  timeline_issue: { bg: 'rgba(251, 146, 60, 0.12)', text: '#fb923c', border: 'rgba(251, 146, 60, 0.3)' },
  summary: { bg: 'rgba(156, 163, 175, 0.12)', text: '#9ca3af', border: 'rgba(156, 163, 175, 0.3)' },
  // Character Intelligence types
  grammar: { bg: 'rgba(239, 68, 68, 0.12)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' },
  formatting: { bg: 'rgba(99, 102, 241, 0.12)', text: '#818cf8', border: 'rgba(99, 102, 241, 0.3)' },
  lore_conflict: { bg: 'rgba(239, 68, 68, 0.12)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' },
  redundancy: { bg: 'rgba(156, 163, 175, 0.12)', text: '#9ca3af', border: 'rgba(156, 163, 175, 0.3)' },
  voice_inconsistency: { bg: 'rgba(236, 72, 153, 0.12)', text: '#f472b6', border: 'rgba(236, 72, 153, 0.3)' },
  relationship_gap: { bg: 'rgba(245, 158, 11, 0.12)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' },
  secret_opportunity: { bg: 'rgba(139, 92, 246, 0.12)', text: '#a78bfa', border: 'rgba(139, 92, 246, 0.3)' },
  cross_reference: { bg: 'rgba(59, 130, 246, 0.12)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' },
  // Session linking types
  quest_session_link: { bg: 'rgba(99, 102, 241, 0.12)', text: '#818cf8', border: 'rgba(99, 102, 241, 0.3)' },
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
    // Location formatting
    if (suggestionType === 'location_detected' && 'name' in (value as object) && 'location_type' in (value as object)) {
      const loc = value as { name: string; location_type: string; description?: string; parent_location_name?: string }
      let result = `${loc.name} [${loc.location_type}]`
      if (loc.parent_location_name) result += ` in ${loc.parent_location_name}`
      return result
    }
    // Quest formatting
    if (suggestionType === 'quest_detected' && 'name' in (value as object)) {
      const quest = value as { name: string; quest_type?: string; status?: string; quest_giver_name?: string; location_name?: string }
      let result = `${quest.name} [${quest.quest_type || 'side_quest'}]`
      if (quest.quest_giver_name) result += ` from ${quest.quest_giver_name}`
      if (quest.location_name) result += ` → ${quest.location_name}`
      return result
    }
    // Encounter formatting
    if (suggestionType === 'encounter_detected' && 'name' in (value as object)) {
      const encounter = value as { name: string; encounter_type?: string; status?: string; difficulty?: string; location_name?: string; quest_name?: string }
      let result = `${encounter.name} [${encounter.encounter_type || 'combat'}]`
      if (encounter.difficulty) result += ` (${encounter.difficulty})`
      if (encounter.location_name) result += ` at ${encounter.location_name}`
      return result
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
  const { loading: permissionsLoading, isMember, isOwner, isDm } = usePermissions(campaignId)

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

  // Cooldown state
  const [cooldownStatus, setCooldownStatus] = useState<{
    isOnCooldown: boolean
    remainingFormatted: string
    availableAt: string | null
    cooldownHours?: number
  } | null>(null)

  // Confirmation modal state
  const [showAnalyzeConfirmModal, setShowAnalyzeConfirmModal] = useState(false)

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

  // Edit state for location suggestions
  const [editingLocationSuggestion, setEditingLocationSuggestion] = useState<IntelligenceSuggestion | null>(null)
  const [locationFormData, setLocationFormData] = useState({
    name: '',
    location_type: 'other',
    description: '',
    parent_location_name: '',
  })

  // Edit state for quest suggestions
  const [editingQuestSuggestion, setEditingQuestSuggestion] = useState<IntelligenceSuggestion | null>(null)
  const [questFormData, setQuestFormData] = useState({
    name: '',
    quest_type: 'side_quest',
    description: '',
    status: 'available',
    quest_giver_name: '',
    location_name: '',
  })

  // Edit state for encounter suggestions
  const [editingEncounterSuggestion, setEditingEncounterSuggestion] = useState<IntelligenceSuggestion | null>(null)
  const [encounterFormData, setEncounterFormData] = useState({
    name: '',
    encounter_type: 'combat',
    description: '',
    status: 'used',
    difficulty: '',
    location_name: '',
    quest_name: '',
  })

  // Bulk approval state
  const [isBulkApproving, setIsBulkApproving] = useState(false)

  // Modal state for burger menu
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [showLabelsModal, setShowLabelsModal] = useState(false)
  const [showFactionsModal, setShowFactionsModal] = useState(false)
  const [showRelationshipsModal, setShowRelationshipsModal] = useState(false)
  const [showResizeModal, setShowResizeModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)

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

    // Check cooldown status
    try {
      const cooldownResponse = await fetch(`/api/ai/cooldown?type=campaign_intelligence&entityId=${campaignId}`)
      if (cooldownResponse.ok) {
        const cooldownData = await cooldownResponse.json()
        setCooldownStatus(cooldownData)
      }
    } catch (err) {
      console.error('Failed to check cooldown:', err)
    }

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

  // Show confirmation modal before analyzing
  const handleAnalyzeClick = () => {
    setShowAnalyzeConfirmModal(true)
  }

  // Actually run the analysis after confirmation
  const handleAnalyzeConfirmed = async () => {
    setShowAnalyzeConfirmModal(false)
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

  // Open edit modal for location suggestions
  const openLocationEditModal = (suggestion: IntelligenceSuggestion) => {
    if (suggestion.suggestion_type !== 'location_detected') return

    const value = suggestion.suggested_value as {
      name: string
      location_type?: string
      description?: string
      parent_location_name?: string
    }

    setLocationFormData({
      name: value.name || '',
      location_type: value.location_type || 'other',
      description: value.description || '',
      parent_location_name: value.parent_location_name || '',
    })
    setEditingLocationSuggestion(suggestion)
  }

  // Save edited location suggestion
  const handleSaveLocationEdit = async () => {
    if (!editingLocationSuggestion) return

    const finalValue = {
      name: locationFormData.name,
      location_type: locationFormData.location_type,
      description: locationFormData.description || null,
      parent_location_name: locationFormData.parent_location_name || null,
    }

    await handleAction(editingLocationSuggestion.id, 'approve', finalValue)
    setEditingLocationSuggestion(null)
  }

  // Open edit modal for quest suggestions
  const openQuestEditModal = (suggestion: IntelligenceSuggestion) => {
    if (suggestion.suggestion_type !== 'quest_detected') return

    const value = suggestion.suggested_value as {
      name: string
      quest_type?: string
      description?: string
      status?: string
      quest_giver_name?: string
      location_name?: string
    }

    setQuestFormData({
      name: value.name || '',
      quest_type: value.quest_type || 'side_quest',
      description: value.description || '',
      status: value.status || 'available',
      quest_giver_name: value.quest_giver_name || '',
      location_name: value.location_name || '',
    })
    setEditingQuestSuggestion(suggestion)
  }

  // Save edited quest suggestion
  const handleSaveQuestEdit = async () => {
    if (!editingQuestSuggestion) return

    const finalValue = {
      name: questFormData.name,
      quest_type: questFormData.quest_type,
      description: questFormData.description || null,
      status: questFormData.status,
      quest_giver_name: questFormData.quest_giver_name || null,
      location_name: questFormData.location_name || null,
    }

    await handleAction(editingQuestSuggestion.id, 'approve', finalValue)
    setEditingQuestSuggestion(null)
  }

  // Open edit modal for encounter suggestions
  const openEncounterEditModal = (suggestion: IntelligenceSuggestion) => {
    if (suggestion.suggestion_type !== 'encounter_detected') return

    const value = suggestion.suggested_value as {
      name: string
      encounter_type?: string
      description?: string
      status?: string
      difficulty?: string
      location_name?: string
      quest_name?: string
    }

    setEncounterFormData({
      name: value.name || '',
      encounter_type: value.encounter_type || 'combat',
      description: value.description || '',
      status: value.status || 'used',
      difficulty: value.difficulty || '',
      location_name: value.location_name || '',
      quest_name: value.quest_name || '',
    })
    setEditingEncounterSuggestion(suggestion)
  }

  // Save edited encounter suggestion
  const handleSaveEncounterEdit = async () => {
    if (!editingEncounterSuggestion) return

    const finalValue = {
      name: encounterFormData.name,
      encounter_type: encounterFormData.encounter_type,
      description: encounterFormData.description || null,
      status: encounterFormData.status,
      difficulty: encounterFormData.difficulty || null,
      location_name: encounterFormData.location_name || null,
      quest_name: encounterFormData.quest_name || null,
    }

    await handleAction(editingEncounterSuggestion.id, 'approve', finalValue)
    setEditingEncounterSuggestion(null)
  }

  // Bulk approve all location suggestions
  const handleBulkApproveLocations = async () => {
    const locationSuggestions = filteredSuggestions.filter(
      s => s.suggestion_type === 'location_detected' && s.status === 'pending'
    )

    if (locationSuggestions.length === 0) return

    setIsBulkApproving(true)

    let successCount = 0
    let errorCount = 0

    for (const suggestion of locationSuggestions) {
      try {
        const response = await fetch('/api/ai/suggestions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            suggestionId: suggestion.id,
            action: 'approve',
            finalValue: suggestion.suggested_value,
          }),
        })

        if (response.ok) {
          successCount++
        } else {
          errorCount++
        }
      } catch (err) {
        errorCount++
      }
    }

    // Reload suggestions
    await loadData()

    if (successCount > 0) {
      toast.success(`${successCount} location${successCount === 1 ? '' : 's'} added to your campaign`)
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} location${errorCount === 1 ? '' : 's'} failed to add`)
    }

    setIsBulkApproving(false)
  }

  // Bulk approve all quest suggestions
  const handleBulkApproveQuests = async () => {
    const questSuggestions = filteredSuggestions.filter(
      s => s.suggestion_type === 'quest_detected' && s.status === 'pending'
    )

    if (questSuggestions.length === 0) return

    setIsBulkApproving(true)

    let successCount = 0
    let errorCount = 0

    for (const suggestion of questSuggestions) {
      try {
        const response = await fetch('/api/ai/suggestions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            suggestionId: suggestion.id,
            action: 'approve',
            finalValue: suggestion.suggested_value,
          }),
        })

        if (response.ok) {
          successCount++
        } else {
          errorCount++
        }
      } catch (err) {
        errorCount++
      }
    }

    // Reload suggestions
    await loadData()

    if (successCount > 0) {
      toast.success(`${successCount} quest${successCount === 1 ? '' : 's'} added to your campaign`)
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} quest${errorCount === 1 ? '' : 's'} failed to add`)
    }

    setIsBulkApproving(false)
  }

  // Bulk approve all encounter suggestions
  const handleBulkApproveEncounters = async () => {
    const encounterSuggestions = filteredSuggestions.filter(
      s => s.suggestion_type === 'encounter_detected' && s.status === 'pending'
    )

    if (encounterSuggestions.length === 0) return

    setIsBulkApproving(true)

    let successCount = 0
    let errorCount = 0

    for (const suggestion of encounterSuggestions) {
      try {
        const response = await fetch('/api/ai/suggestions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            suggestionId: suggestion.id,
            action: 'approve',
            finalValue: suggestion.suggested_value,
          }),
        })

        if (response.ok) {
          successCount++
        } else {
          errorCount++
        }
      } catch (err) {
        errorCount++
      }
    }

    // Reload suggestions
    await loadData()

    if (successCount > 0) {
      toast.success(`${successCount} encounter${successCount === 1 ? '' : 's'} added to your campaign`)
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} encounter${errorCount === 1 ? '' : 's'} failed to add`)
    }

    setIsBulkApproving(false)
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
        handleAnalyze={handleAnalyzeClick}
        handleAction={handleAction}
        getCharacterForSuggestion={getCharacterForSuggestion}
        editingSuggestion={editingSuggestion}
        setEditingSuggestion={setEditingSuggestion}
        editFormData={editFormData}
        setEditFormData={setEditFormData}
        openEditModal={openEditModal}
        handleSaveEdit={handleSaveEdit}
        cooldownStatus={cooldownStatus}
      />
    )
  }

  // ============ DESKTOP LAYOUT ============
  if (loading || permissionsLoading) {
    return (
      <AppLayout campaignId={campaignId} hideHeader>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[--arcane-purple]" />
        </div>
      </AppLayout>
    )
  }

  // Permission check - only DMs can access Campaign Intelligence
  if (!isMember || !isDm) {
    return (
      <AppLayout campaignId={campaignId} hideHeader>
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
    <AppLayout campaignId={campaignId} hideHeader>
      {/* Page Header with Burger Menu */}
      <CampaignPageHeader
        campaign={campaign}
        campaignId={campaignId}
        title="Intelligence"
        isOwner={isOwner}
        isDm={isDm}
        onOpenMembers={() => setShowMembersModal(true)}
        onOpenLabels={() => setShowLabelsModal(true)}
        onOpenFactions={() => setShowFactionsModal(true)}
        onOpenRelationships={() => setShowRelationshipsModal(true)}
        onOpenResize={() => setShowResizeModal(true)}
        onOpenShare={() => setShowShareModal(true)}
        actions={
          <button
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500/20 transition-colors font-medium disabled:opacity-50"
            onClick={handleAnalyzeClick}
            disabled={isAnalyzing || cooldownStatus?.isOnCooldown}
            title={cooldownStatus?.isOnCooldown ? `Available in ${cooldownStatus.remainingFormatted}` : undefined}
          >
            {isAnalyzing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : cooldownStatus?.isOnCooldown ? (
              <Clock className="w-4 h-4" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">
              {isAnalyzing ? 'Analyzing...' : cooldownStatus?.isOnCooldown ? cooldownStatus.remainingFormatted : 'Analyze'}
            </span>
          </button>
        }
      />

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* First-time guidance */}
        <GuidanceTip
          tipId="campaign_intelligence_intro"
          title="Welcome to Campaign Intelligence"
          description="AI analyzes your session notes to suggest timeline events, detect new NPCs, track relationships, and identify plot threads. For best results, make sure your session notes are up to date before running analysis."
          variant="banner"
          showOnce
          action={{
            label: 'Run Your First Analysis',
            onClick: () => handleAnalyzeClick(),
          }}
        />

        {/* Cooldown Banner */}
        {cooldownStatus?.isOnCooldown && (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-amber-300">
                  Available in {cooldownStatus.remainingFormatted}
                </h3>
                <p className="text-sm text-amber-400/70 mt-1">
                  While you wait, you can review your previous suggestions or make sure session notes are up to date.
                </p>
                <div className="flex flex-wrap gap-3 mt-3">
                  <button
                    onClick={() => setShowHistory(true)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 rounded-lg transition-colors"
                  >
                    <History className="w-4 h-4" />
                    View Previous Suggestions
                  </button>
                  <NextLink
                    href={`/campaigns/${campaignId}/sessions`}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-gray-300 transition-colors"
                  >
                    Update Session Notes
                  </NextLink>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status Bar */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm" style={{ color: '#6b7280' }}>
            {campaign?.last_intelligence_run
              ? `Last analysis: ${formatTimeAgo(campaign.last_intelligence_run)}`
              : 'Never analyzed'}
            {' • '}
            <span style={{ color: '#8B5CF6' }}>{counts.pending} pending</span>
            {' • '}
            <span style={{ color: '#10B981' }}>{counts.applied} applied</span>
          </p>

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
              onClick={handleAnalyzeClick}
              disabled={isAnalyzing || cooldownStatus?.isOnCooldown}
              title={cooldownStatus?.isOnCooldown ? `Available in ${cooldownStatus.remainingFormatted}` : undefined}
            >
              {isAnalyzing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : cooldownStatus?.isOnCooldown ? (
                <Clock className="w-4 h-4" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {isAnalyzing ? 'Analyzing...' : cooldownStatus?.isOnCooldown ? `Available in ${cooldownStatus.remainingFormatted}` : 'Analyze Campaign'}
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

            {/* Bulk approve locations, quests, and encounters */}
            {(() => {
              const locationCount = suggestions.filter(
                s => s.suggestion_type === 'location_detected' && s.status === 'pending'
              ).length
              const questCount = suggestions.filter(
                s => s.suggestion_type === 'quest_detected' && s.status === 'pending'
              ).length
              const encounterCount = suggestions.filter(
                s => s.suggestion_type === 'encounter_detected' && s.status === 'pending'
              ).length
              if (locationCount === 0 && questCount === 0 && encounterCount === 0) return null
              return (
                <div className="pt-4 border-t border-white/10">
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#6b7280' }}>
                    Bulk Actions
                  </h3>
                  <div className="space-y-2">
                    {locationCount > 0 && (
                      <button
                        onClick={handleBulkApproveLocations}
                        disabled={isBulkApproving}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-colors"
                        style={{
                          backgroundColor: 'rgba(74, 222, 128, 0.15)',
                          border: '1px solid rgba(74, 222, 128, 0.3)',
                          color: '#4ade80',
                        }}
                      >
                        {isBulkApproving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <MapPin className="w-4 h-4" />
                        )}
                        <span className="text-sm font-medium">
                          {isBulkApproving ? 'Adding...' : `Add All ${locationCount} Locations`}
                        </span>
                      </button>
                    )}
                    {questCount > 0 && (
                      <button
                        onClick={handleBulkApproveQuests}
                        disabled={isBulkApproving}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-colors"
                        style={{
                          backgroundColor: 'rgba(139, 92, 246, 0.15)',
                          border: '1px solid rgba(139, 92, 246, 0.3)',
                          color: '#a78bfa',
                        }}
                      >
                        {isBulkApproving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Target className="w-4 h-4" />
                        )}
                        <span className="text-sm font-medium">
                          {isBulkApproving ? 'Adding...' : `Add All ${questCount} Quests`}
                        </span>
                      </button>
                    )}
                    {encounterCount > 0 && (
                      <button
                        onClick={handleBulkApproveEncounters}
                        disabled={isBulkApproving}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-colors"
                        style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#f87171',
                        }}
                      >
                        {isBulkApproving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Swords className="w-4 h-4" />
                        )}
                        <span className="text-sm font-medium">
                          {isBulkApproving ? 'Adding...' : `Add All ${encounterCount} Encounters`}
                        </span>
                      </button>
                    )}
                  </div>
                  <p className="text-xs mt-2 text-center" style={{ color: '#6b7280' }}>
                    Creates all detected items at once
                  </p>
                </div>
              )
            })()}
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
                    {cooldownStatus?.isOnCooldown ? (
                      <div className="mt-6 text-center">
                        <p className="text-sm text-amber-400 mb-3">
                          Available in {cooldownStatus.remainingFormatted}
                        </p>
                        <button
                          onClick={() => setShowHistory(true)}
                          className="btn btn-secondary flex items-center gap-2"
                        >
                          <History className="w-4 h-4" />
                          View Previous Suggestions
                        </button>
                      </div>
                    ) : (
                      <button
                        className="btn btn-primary flex items-center gap-2 mt-6"
                        onClick={handleAnalyzeClick}
                        disabled={isAnalyzing}
                      >
                        <Sparkles className="w-4 h-4" />
                        Analyze Campaign
                      </button>
                    )}
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
                        ) : suggestion.suggestion_type === 'location_detected' ? (
                          <p className="font-semibold text-[15px] mb-1" style={{ color: '#f3f4f6' }}>
                            {(() => {
                              const val = suggestion.suggested_value as { name?: string; location_type?: string; parent_location_name?: string } | null
                              return val?.name || 'New Location'
                            })()}
                            <span className="font-normal text-sm ml-2" style={{ color: '#6b7280' }}>
                              → Locations
                            </span>
                          </p>
                        ) : suggestion.suggestion_type === 'quest_detected' ? (
                          <p className="font-semibold text-[15px] mb-1" style={{ color: '#f3f4f6' }}>
                            {(() => {
                              const val = suggestion.suggested_value as { name?: string; quest_type?: string; quest_giver_name?: string } | null
                              return val?.name || 'New Quest'
                            })()}
                            <span className="font-normal text-sm ml-2" style={{ color: '#6b7280' }}>
                              → Quests
                            </span>
                          </p>
                        ) : suggestion.suggestion_type === 'encounter_detected' ? (
                          <p className="font-semibold text-[15px] mb-1" style={{ color: '#f3f4f6' }}>
                            {(() => {
                              const val = suggestion.suggested_value as { name?: string; encounter_type?: string; difficulty?: string } | null
                              return val?.name || 'New Encounter'
                            })()}
                            <span className="font-normal text-sm ml-2" style={{ color: '#6b7280' }}>
                              → Encounters
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
                          {suggestion.suggestion_type === 'location_detected' && (
                            <button
                              onClick={() => openLocationEditModal(suggestion)}
                              disabled={isProcessing}
                              className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors disabled:opacity-50"
                              title="Edit before approving"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {suggestion.suggestion_type === 'quest_detected' && (
                            <button
                              onClick={() => openQuestEditModal(suggestion)}
                              disabled={isProcessing}
                              className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors disabled:opacity-50"
                              title="Edit before approving"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {suggestion.suggestion_type === 'encounter_detected' && (
                            <button
                              onClick={() => openEncounterEditModal(suggestion)}
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

      {/* Edit Location Modal */}
      <Modal
        isOpen={!!editingLocationSuggestion}
        onClose={() => setEditingLocationSuggestion(null)}
        title="Edit Location"
        description="Edit the details before adding to your locations"
        size="md"
      >
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={locationFormData.name}
              onChange={(e) => setLocationFormData({ ...locationFormData, name: e.target.value })}
              className="form-input"
              placeholder="The Rusty Nail"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Type
            </label>
            <select
              value={locationFormData.location_type}
              onChange={(e) => setLocationFormData({ ...locationFormData, location_type: e.target.value })}
              className="form-input"
            >
              <option value="region">Region</option>
              <option value="city">City</option>
              <option value="town">Town</option>
              <option value="village">Village</option>
              <option value="building">Building</option>
              <option value="tavern">Tavern</option>
              <option value="temple">Temple</option>
              <option value="dungeon">Dungeon</option>
              <option value="wilderness">Wilderness</option>
              <option value="landmark">Landmark</option>
              <option value="camp">Camp</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Parent Location */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Located In
            </label>
            <input
              type="text"
              value={locationFormData.parent_location_name}
              onChange={(e) => setLocationFormData({ ...locationFormData, parent_location_name: e.target.value })}
              className="form-input"
              placeholder="e.g., Waterdeep, The Sword Coast"
            />
            <p className="text-xs text-gray-500 mt-1">Leave empty if top-level location</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Description
            </label>
            <textarea
              value={locationFormData.description}
              onChange={(e) => setLocationFormData({ ...locationFormData, description: e.target.value })}
              className="form-input min-h-[100px]"
              placeholder="A brief description of this location..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[--border]">
            <button
              className="btn btn-secondary"
              onClick={() => setEditingLocationSuggestion(null)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSaveLocationEdit}
              disabled={!locationFormData.name.trim()}
            >
              Save & Add Location
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Quest Modal */}
      <Modal
        isOpen={!!editingQuestSuggestion}
        onClose={() => setEditingQuestSuggestion(null)}
        title="Edit Quest"
        description="Edit the details before adding to your quests"
        size="md"
      >
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={questFormData.name}
              onChange={(e) => setQuestFormData({ ...questFormData, name: e.target.value })}
              className="form-input"
              placeholder="Find the Missing Merchant"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Type
            </label>
            <select
              value={questFormData.quest_type}
              onChange={(e) => setQuestFormData({ ...questFormData, quest_type: e.target.value })}
              className="form-input"
            >
              <option value="main_quest">Main Quest</option>
              <option value="side_quest">Side Quest</option>
              <option value="personal">Personal Quest</option>
              <option value="faction">Faction Quest</option>
              <option value="plot_thread">Plot Thread</option>
              <option value="rumor">Rumor</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Status
            </label>
            <select
              value={questFormData.status}
              onChange={(e) => setQuestFormData({ ...questFormData, status: e.target.value })}
              className="form-input"
            >
              <option value="available">Available (not yet started)</option>
              <option value="active">Active (in progress)</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="abandoned">Abandoned</option>
            </select>
          </div>

          {/* Quest Giver */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Quest Giver
            </label>
            <input
              type="text"
              value={questFormData.quest_giver_name}
              onChange={(e) => setQuestFormData({ ...questFormData, quest_giver_name: e.target.value })}
              className="form-input"
              placeholder="e.g., Mayor Bramwell"
            />
            <p className="text-xs text-gray-500 mt-1">NPC name (will be matched to existing characters)</p>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Objective Location
            </label>
            <input
              type="text"
              value={questFormData.location_name}
              onChange={(e) => setQuestFormData({ ...questFormData, location_name: e.target.value })}
              className="form-input"
              placeholder="e.g., The Abandoned Mine"
            />
            <p className="text-xs text-gray-500 mt-1">Where the quest takes place (will be matched to existing locations)</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Description
            </label>
            <textarea
              value={questFormData.description}
              onChange={(e) => setQuestFormData({ ...questFormData, description: e.target.value })}
              className="form-input min-h-[100px]"
              placeholder="What the party needs to do..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[--border]">
            <button
              className="btn btn-secondary"
              onClick={() => setEditingQuestSuggestion(null)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSaveQuestEdit}
              disabled={!questFormData.name.trim()}
            >
              Save & Add Quest
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Encounter Modal */}
      <Modal
        isOpen={!!editingEncounterSuggestion}
        onClose={() => setEditingEncounterSuggestion(null)}
        title="Edit Encounter"
        description="Edit the details before adding to your encounters"
        size="md"
      >
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={encounterFormData.name}
              onChange={(e) => setEncounterFormData({ ...encounterFormData, name: e.target.value })}
              className="form-input"
              placeholder="Goblin Ambush"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Type
            </label>
            <select
              value={encounterFormData.encounter_type}
              onChange={(e) => setEncounterFormData({ ...encounterFormData, encounter_type: e.target.value })}
              className="form-input"
            >
              <option value="combat">Combat</option>
              <option value="social">Social</option>
              <option value="exploration">Exploration</option>
              <option value="trap">Trap/Hazard</option>
              <option value="skill_challenge">Skill Challenge</option>
              <option value="puzzle">Puzzle</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Status
            </label>
            <select
              value={encounterFormData.status}
              onChange={(e) => setEncounterFormData({ ...encounterFormData, status: e.target.value })}
              className="form-input"
            >
              <option value="prepared">Prepared (for future)</option>
              <option value="used">Used (already happened)</option>
              <option value="skipped">Skipped</option>
            </select>
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Difficulty
            </label>
            <select
              value={encounterFormData.difficulty}
              onChange={(e) => setEncounterFormData({ ...encounterFormData, difficulty: e.target.value })}
              className="form-input"
            >
              <option value="">Not set</option>
              <option value="trivial">Trivial</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="deadly">Deadly</option>
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Location
            </label>
            <input
              type="text"
              value={encounterFormData.location_name}
              onChange={(e) => setEncounterFormData({ ...encounterFormData, location_name: e.target.value })}
              className="form-input"
              placeholder="e.g., The Trade Road"
            />
            <p className="text-xs text-gray-500 mt-1">Location name (will be matched to existing locations)</p>
          </div>

          {/* Quest */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Related Quest
            </label>
            <input
              type="text"
              value={encounterFormData.quest_name}
              onChange={(e) => setEncounterFormData({ ...encounterFormData, quest_name: e.target.value })}
              className="form-input"
              placeholder="e.g., Find the Missing Merchant"
            />
            <p className="text-xs text-gray-500 mt-1">Quest name (will be matched to existing quests)</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Description
            </label>
            <textarea
              value={encounterFormData.description}
              onChange={(e) => setEncounterFormData({ ...encounterFormData, description: e.target.value })}
              className="form-input min-h-[100px]"
              placeholder="What happened in this encounter..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[--border]">
            <button
              className="btn btn-secondary"
              onClick={() => setEditingEncounterSuggestion(null)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSaveEncounterEdit}
              disabled={!encounterFormData.name.trim()}
            >
              Save & Add Encounter
            </button>
          </div>
        </div>
      </Modal>

      {/* Analyze Confirmation Modal */}
      <Modal
        isOpen={showAnalyzeConfirmModal}
        onClose={() => setShowAnalyzeConfirmModal(false)}
        title="Ready to Analyze?"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-300">
            For best results, make sure all party members have submitted their session notes and you&apos;ve added your own DM notes before running Intelligence.
          </p>
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-sm text-amber-300">
              <strong>Note:</strong> After running, there will be a cooldown of approximately <strong>12 hours</strong> before you can run again. This timing will vary by subscription tier and role in the future.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              className="btn btn-secondary"
              onClick={() => setShowAnalyzeConfirmModal(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary flex items-center gap-2"
              onClick={handleAnalyzeConfirmed}
            >
              <Sparkles className="w-4 h-4" />
              Run Analysis
            </button>
          </div>
        </div>
      </Modal>

      {/* Modals */}
      <PartyModal
        campaignId={campaignId}
        characters={characters}
        isOpen={showMembersModal}
        onClose={() => setShowMembersModal(false)}
      />

      {showLabelsModal && (
        <TagManager
          campaignId={campaignId}
          isOpen={showLabelsModal}
          onClose={() => setShowLabelsModal(false)}
        />
      )}

      {showFactionsModal && (
        <FactionManager
          campaignId={campaignId}
          characters={characters}
          isOpen={showFactionsModal}
          onClose={() => setShowFactionsModal(false)}
        />
      )}

      {showRelationshipsModal && (
        <RelationshipManager
          campaignId={campaignId}
          isOpen={showRelationshipsModal}
          onClose={() => setShowRelationshipsModal(false)}
        />
      )}

      {showResizeModal && (
        <ResizeToolbar
          onClose={() => setShowResizeModal(false)}
          characters={characters}
          onResize={async () => {}}
        />
      )}

      {campaign && (
        <UnifiedShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          contentType="campaign"
          contentId={campaignId}
          contentName={campaign.name}
          contentMode="active"
        />
      )}
    </AppLayout>
  )
}

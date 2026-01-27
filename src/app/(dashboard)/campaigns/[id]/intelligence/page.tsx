'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
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
  ChevronRight,
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
  Shield,
  Users,
  ScrollText,
  Layers,
  LayoutList,
  Package,
  Trophy,
  Search,
  Calendar,
} from 'lucide-react'
import { Modal, AccessDeniedPage, Tooltip } from '@/components/ui'
import { GuidanceTip } from '@/components/guidance/GuidanceTip'
import { TimelineEventEditor, type TimelineEventFormData } from '@/components/timeline'
import { AppLayout } from '@/components/layout'
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
  faction_detected: Shield,
  plot_hook: Lightbulb,
  enrichment: Wand2,
  timeline_issue: Clock,
  summary: FileQuestion,
  item_detected: Package,
  combat_outcome: Trophy,
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
  faction_detected: { bg: 'rgba(16, 185, 129, 0.12)', text: '#10b981', border: 'rgba(16, 185, 129, 0.3)' },
  plot_hook: { bg: 'rgba(192, 132, 252, 0.12)', text: '#c084fc', border: 'rgba(192, 132, 252, 0.3)' },
  enrichment: { bg: 'rgba(56, 189, 248, 0.12)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.3)' },
  timeline_issue: { bg: 'rgba(251, 146, 60, 0.12)', text: '#fb923c', border: 'rgba(251, 146, 60, 0.3)' },
  summary: { bg: 'rgba(156, 163, 175, 0.12)', text: '#9ca3af', border: 'rgba(156, 163, 175, 0.3)' },
  item_detected: { bg: 'rgba(212, 168, 67, 0.12)', text: '#d4a843', border: 'rgba(212, 168, 67, 0.3)' },
  combat_outcome: { bg: 'rgba(220, 38, 38, 0.12)', text: '#dc2626', border: 'rgba(220, 38, 38, 0.3)' },
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
    // Item formatting
    if (suggestionType === 'item_detected' && 'name' in (value as object)) {
      const item = value as { name: string; item_type?: string; rarity?: string; description?: string; owner_name?: string; location_name?: string }
      let result = `${item.name}`
      if (item.item_type) result += ` [${item.item_type}]`
      if (item.rarity) result += ` (${item.rarity})`
      if (item.owner_name) result += ` - owned by ${item.owner_name}`
      if (item.location_name) result += ` at ${item.location_name}`
      return result
    }
    // Combat outcome formatting
    if (suggestionType === 'combat_outcome' && 'outcome_type' in (value as object)) {
      const combat = value as { outcome_type: string; character_name?: string; description?: string; session_number?: number }
      let result = `${combat.outcome_type}`
      if (combat.character_name) result = `${combat.character_name}: ${result}`
      if (combat.description) result += ` - ${combat.description}`
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
  const searchParams = useSearchParams()
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

  // Pre-analysis preview state
  const [previewData, setPreviewData] = useState<{
    sessionsToAnalyze: Array<{ id: string; title: string | null; session_number: number; updated_at: string }>
    charactersUpdated: Array<{ id: string; name: string; type: string; updated_at: string }>
    lastRunTime: string | null
    isLoading: boolean
    totalSessionsCount?: number
    totalCharactersCount?: number
  }>({
    sessionsToAnalyze: [],
    charactersUpdated: [],
    lastRunTime: null,
    isLoading: false,
  })

  // Full Audit mode - analyze ALL sessions regardless of last run
  const [fullAuditMode, setFullAuditMode] = useState(false)

  // Filter state
  const [showHistory, setShowHistory] = useState(false)
  const [typeFilters, setTypeFilters] = useState<Set<SuggestionType>>(new Set())
  const [confidenceFilters, setConfidenceFilters] = useState<Set<ConfidenceLevel>>(new Set())
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Session filter from URL (for "Analyze This Session" feature)
  const sessionFilterId = searchParams.get('session')
  const sessionFilter = sessionFilterId ? sessions.find(s => s.id === sessionFilterId) : null

  // Grouping mode
  type GroupingMode = 'flat' | 'by_session' | 'by_type' | 'by_character'
  const [groupingMode, setGroupingMode] = useState<GroupingMode>('flat')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // Action state
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, 'positive' | 'negative'>>({})

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isMultiProcessing, setIsMultiProcessing] = useState(false)

  // Keyboard shortcuts state
  const [focusedIndex, setFocusedIndex] = useState<number>(-1)
  const [showShortcutsModal, setShowShortcutsModal] = useState(false)

  // Rejection reason state
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [suggestionToReject, setSuggestionToReject] = useState<IntelligenceSuggestion | null>(null)
  const [rejectReason, setRejectReason] = useState<string>('')

  // Rejection reason options
  const REJECTION_REASONS = [
    { value: '', label: 'No reason (quick dismiss)' },
    { value: 'incorrect', label: 'Incorrect - AI got this wrong' },
    { value: 'already_handled', label: 'Already handled manually' },
    { value: 'not_relevant', label: 'Not relevant to my campaign' },
    { value: 'will_add_manually', label: 'Will add this myself later' },
    { value: 'duplicate', label: 'Duplicate of another suggestion' },
  ]

  // History filter state
  const [historySearch, setHistorySearch] = useState('')
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'applied' | 'rejected'>('all')
  const [historyDateFrom, setHistoryDateFrom] = useState('')
  const [historyDateTo, setHistoryDateTo] = useState('')

  // Toggle selection of a suggestion
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Select all visible pending suggestions
  const selectAllPending = () => {
    const pendingIds = filteredSuggestions
      .filter(s => s.status === 'pending')
      .map(s => s.id)
    setSelectedIds(new Set(pendingIds))
  }

  // Clear selection
  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  // Apply selected suggestions
  const handleApplySelected = async () => {
    if (selectedIds.size === 0 || isMultiProcessing) return
    setIsMultiProcessing(true)

    const idsToProcess = Array.from(selectedIds)
    for (const id of idsToProcess) {
      await handleAction(id, 'approve')
    }

    setSelectedIds(new Set())
    setIsMultiProcessing(false)
  }

  // Dismiss selected suggestions
  const handleDismissSelected = async () => {
    if (selectedIds.size === 0 || isMultiProcessing) return
    setIsMultiProcessing(true)

    const idsToProcess = Array.from(selectedIds)
    for (const id of idsToProcess) {
      await handleAction(id, 'reject')
    }

    setSelectedIds(new Set())
    setIsMultiProcessing(false)
  }

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

  // Edit state for generic/simple suggestion types (status_change, secret_revealed, quote, story_hook, important_person, relationship)
  const [editingGenericSuggestion, setEditingGenericSuggestion] = useState<IntelligenceSuggestion | null>(null)
  const [genericFormData, setGenericFormData] = useState<{
    value: string
    label?: string
    description?: string
  }>({
    value: '',
    label: '',
    description: '',
  })

  // Bulk approval state
  const [isBulkApproving, setIsBulkApproving] = useState(false)
  const [isBulkDismissing, setIsBulkDismissing] = useState(false)

  // Undo state
  const [undoingSuggestionId, setUndoingSuggestionId] = useState<string | null>(null)
  const [showUndoConfirmModal, setShowUndoConfirmModal] = useState(false)
  const [suggestionToUndo, setSuggestionToUndo] = useState<IntelligenceSuggestion | null>(null)

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

  // Keyboard shortcuts
  useEffect(() => {
    // Compute pending suggestions from raw suggestions array
    const pendingSuggestions = suggestions.filter(s => s.status === 'pending')

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs or modals are open
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        showAnalyzeConfirmModal ||
        showUndoConfirmModal ||
        showShortcutsModal ||
        editingSuggestion ||
        editingLocationSuggestion ||
        editingQuestSuggestion ||
        editingEncounterSuggestion ||
        editingGenericSuggestion
      ) {
        return
      }

      switch (e.key.toLowerCase()) {
        case '?':
          e.preventDefault()
          setShowShortcutsModal(true)
          break

        case 'j': // Move down
          e.preventDefault()
          setFocusedIndex(prev => Math.min(prev + 1, pendingSuggestions.length - 1))
          break

        case 'k': // Move up
          e.preventDefault()
          setFocusedIndex(prev => Math.max(prev - 1, 0))
          break

        case 'a': // Approve
          if (e.shiftKey) {
            // Shift+A: Select all pending and approve
            e.preventDefault()
            if (pendingSuggestions.length > 0 && !isMultiProcessing) {
              // Select all pending, then apply
              const pendingIds = pendingSuggestions.map(s => s.id)
              setSelectedIds(new Set(pendingIds))
              // Apply after selection updates
              setTimeout(() => {
                // Manually trigger bulk apply
                const idsToProcess = pendingIds
                if (idsToProcess.length === 0) return

                setIsMultiProcessing(true)
                Promise.all(
                  idsToProcess.map(id =>
                    fetch('/api/ai/suggestions', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ suggestionId: id, action: 'approve' }),
                    })
                  )
                ).then(() => {
                  setSuggestions(prev => prev.filter(s => !pendingIds.includes(s.id)))
                  setCounts(prev => ({
                    ...prev,
                    pending: prev.pending - pendingIds.length,
                    applied: prev.applied + pendingIds.length,
                  }))
                  setSelectedIds(new Set())
                  toast.success(`Applied ${pendingIds.length} suggestions`)
                }).catch(err => {
                  console.error('Bulk apply error:', err)
                  toast.error('Some suggestions failed to apply')
                }).finally(() => {
                  setIsMultiProcessing(false)
                })
              }, 50)
            }
          } else {
            // A: Approve focused
            e.preventDefault()
            if (focusedIndex >= 0 && focusedIndex < pendingSuggestions.length) {
              const suggestion = pendingSuggestions[focusedIndex]
              handleAction(suggestion.id, 'approve')
            }
          }
          break

        case 'd': // Dismiss
          e.preventDefault()
          if (focusedIndex >= 0 && focusedIndex < pendingSuggestions.length) {
            const suggestion = pendingSuggestions[focusedIndex]
            handleAction(suggestion.id, 'reject')
          }
          break

        case 'e': // Edit
          e.preventDefault()
          if (focusedIndex >= 0 && focusedIndex < pendingSuggestions.length) {
            const suggestion = pendingSuggestions[focusedIndex]
            if (suggestion.suggestion_type === 'timeline_event') {
              openEditModal(suggestion)
            } else if (suggestion.suggestion_type === 'location_detected') {
              openLocationEditModal(suggestion)
            } else if (suggestion.suggestion_type === 'quest_detected') {
              openQuestEditModal(suggestion)
            } else if (suggestion.suggestion_type === 'encounter_detected') {
              openEncounterEditModal(suggestion)
            } else if (GENERIC_EDITABLE_TYPES.includes(suggestion.suggestion_type)) {
              openGenericEditModal(suggestion)
            }
          }
          break

        case 'enter': // Expand/collapse
          e.preventDefault()
          if (focusedIndex >= 0 && focusedIndex < pendingSuggestions.length) {
            const suggestion = pendingSuggestions[focusedIndex]
            toggleExpanded(suggestion.id)
          }
          break

        case 'escape':
          e.preventDefault()
          setFocusedIndex(-1)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    suggestions,
    focusedIndex,
    isMultiProcessing,
    showAnalyzeConfirmModal,
    showUndoConfirmModal,
    showShortcutsModal,
    editingSuggestion,
    editingLocationSuggestion,
    editingQuestSuggestion,
    editingEncounterSuggestion,
    editingGenericSuggestion,
  ])

  // Show confirmation modal before analyzing and fetch preview data
  const handleAnalyzeClick = async () => {
    setShowAnalyzeConfirmModal(true)
    setPreviewData(prev => ({ ...prev, isLoading: true }))

    try {
      // Fetch preview data from API - pass fullAuditMode to get ALL sessions if enabled
      const response = await fetch(`/api/ai/analyze-campaign/preview?campaignId=${campaignId}&fullAudit=${fullAuditMode}`)
      if (response.ok) {
        const data = await response.json()
        setPreviewData({
          sessionsToAnalyze: data.sessionsToAnalyze || [],
          charactersUpdated: data.charactersUpdated || [],
          lastRunTime: data.lastRunTime || null,
          isLoading: false,
        })
      } else {
        setPreviewData(prev => ({ ...prev, isLoading: false }))
      }
    } catch (err) {
      console.error('Failed to fetch preview data:', err)
      setPreviewData(prev => ({ ...prev, isLoading: false }))
    }
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
          fullAudit: fullAuditMode,
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
        // Show server message if present for better debugging
        toast.info(data.message || 'Analysis complete: No suggestions found')
      }
      // Reset full audit mode after analysis completes
      setFullAuditMode(false)
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

  const handleAction = async (suggestionId: string, action: 'approve' | 'reject', finalValue?: unknown, rejectReason?: string) => {
    setProcessingIds(prev => new Set(prev).add(suggestionId))

    try {
      const response = await fetch('/api/ai/suggestions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionId, action, finalValue, rejectReason }),
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

  // Show rejection reason modal
  const handleRejectClick = (suggestion: IntelligenceSuggestion) => {
    setSuggestionToReject(suggestion)
    setRejectReason('')
    setShowRejectModal(true)
  }

  // Execute rejection with reason
  const handleRejectConfirmed = async () => {
    if (!suggestionToReject) return
    setShowRejectModal(false)
    await handleAction(suggestionToReject.id, 'reject', undefined, rejectReason || undefined)
    setSuggestionToReject(null)
    setRejectReason('')
  }

  // Quick dismiss without reason
  const handleQuickDismiss = async (suggestion: IntelligenceSuggestion) => {
    await handleAction(suggestion.id, 'reject')
  }

  // Check if suggestion can be undone (applied within 24h based on creation time)
  const canUndoSuggestion = (suggestion: IntelligenceSuggestion) => {
    if (suggestion.status !== 'applied') return false
    const createdAt = suggestion.created_at ? new Date(suggestion.created_at) : null
    if (!createdAt) return false
    const hoursSinceCreated = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60)
    return hoursSinceCreated <= 24
  }

  // Handle undo confirmation
  const handleUndoClick = (suggestion: IntelligenceSuggestion) => {
    setSuggestionToUndo(suggestion)
    setShowUndoConfirmModal(true)
  }

  // Execute undo
  const handleUndoConfirmed = async () => {
    if (!suggestionToUndo) return

    setShowUndoConfirmModal(false)
    setUndoingSuggestionId(suggestionToUndo.id)

    try {
      const response = await fetch('/api/ai/suggestions/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionId: suggestionToUndo.id }),
      })

      const data = await response.json()

      if (response.ok) {
        // Update the suggestion status in the list
        setSuggestions(prev =>
          prev.map(s =>
            s.id === suggestionToUndo.id
              ? { ...s, status: 'pending', final_value: null }
              : s
          )
        )
        setCounts(prev => ({
          ...prev,
          applied: prev.applied - 1,
          pending: prev.pending + 1,
        }))
        toast.success(data.message || 'Suggestion undone')
      } else {
        toast.error(data.error || 'Failed to undo suggestion')
      }
    } catch (err) {
      console.error('Undo error:', err)
      toast.error('Failed to undo suggestion')
    } finally {
      setUndoingSuggestionId(null)
      setSuggestionToUndo(null)
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

  // Generic edit types that can be edited (simple text/value types)
  const GENERIC_EDITABLE_TYPES: SuggestionType[] = [
    'status_change', 'secret_revealed', 'quote', 'story_hook', 'important_person', 'relationship', 'npc_detected'
  ]

  // Open generic edit modal for simple suggestion types
  const openGenericEditModal = (suggestion: IntelligenceSuggestion) => {
    if (!GENERIC_EDITABLE_TYPES.includes(suggestion.suggestion_type)) return

    const value = suggestion.suggested_value as { [key: string]: unknown }

    // Extract the primary value based on type
    let primaryValue = ''
    let label = ''
    let description = ''

    switch (suggestion.suggestion_type) {
      case 'status_change':
        primaryValue = typeof value === 'string' ? value : (value.status as string) || ''
        break
      case 'secret_revealed':
        primaryValue = typeof value === 'string' ? value : (value.secret as string) || ''
        break
      case 'quote':
        primaryValue = typeof value === 'string' ? value : (value.quote as string) || (value.text as string) || ''
        break
      case 'story_hook':
        primaryValue = typeof value === 'string' ? value : (value.hook as string) || (value.text as string) || ''
        break
      case 'important_person':
        primaryValue = typeof value === 'string' ? value : (value.name as string) || ''
        label = (value.relationship as string) || ''
        break
      case 'relationship':
        primaryValue = (value.label as string) || (value.relationship as string) || ''
        description = (value.description as string) || ''
        break
      case 'npc_detected':
        primaryValue = (value.name as string) || ''
        description = (value.description as string) || ''
        break
      default:
        primaryValue = typeof value === 'string' ? value : JSON.stringify(value)
    }

    setGenericFormData({ value: primaryValue, label, description })
    setEditingGenericSuggestion(suggestion)
  }

  // Save generic edited suggestion
  const handleSaveGenericEdit = async () => {
    if (!editingGenericSuggestion) return

    const suggestionType = editingGenericSuggestion.suggestion_type
    const originalValue = editingGenericSuggestion.suggested_value as { [key: string]: unknown }
    let finalValue: unknown

    switch (suggestionType) {
      case 'status_change':
        finalValue = genericFormData.value
        break
      case 'secret_revealed':
        finalValue = { ...originalValue, secret: genericFormData.value }
        break
      case 'quote':
        finalValue = genericFormData.value
        break
      case 'story_hook':
        finalValue = genericFormData.value
        break
      case 'important_person':
        finalValue = { name: genericFormData.value, relationship: genericFormData.label }
        break
      case 'relationship':
        finalValue = { ...originalValue, label: genericFormData.value, description: genericFormData.description }
        break
      case 'npc_detected':
        finalValue = { ...originalValue, name: genericFormData.value, description: genericFormData.description }
        break
      default:
        finalValue = genericFormData.value
    }

    await handleAction(editingGenericSuggestion.id, 'approve', finalValue)
    setEditingGenericSuggestion(null)
  }

  // Get edit modal title based on suggestion type
  const getGenericEditTitle = () => {
    if (!editingGenericSuggestion) return 'Edit Suggestion'
    switch (editingGenericSuggestion.suggestion_type) {
      case 'status_change': return 'Edit Status Change'
      case 'secret_revealed': return 'Edit Secret'
      case 'quote': return 'Edit Quote'
      case 'story_hook': return 'Edit Story Hook'
      case 'important_person': return 'Edit Important Person'
      case 'relationship': return 'Edit Relationship'
      case 'npc_detected': return 'Edit NPC Details'
      default: return 'Edit Suggestion'
    }
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

  // Bulk approve all faction suggestions
  const handleBulkApproveFactions = async () => {
    const factionSuggestions = filteredSuggestions.filter(
      s => (s.suggestion_type as string) === 'faction_detected' && s.status === 'pending'
    )

    if (factionSuggestions.length === 0) return

    setIsBulkApproving(true)

    let successCount = 0
    let errorCount = 0

    for (const suggestion of factionSuggestions) {
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
      toast.success(`${successCount} faction${successCount === 1 ? '' : 's'} added to your campaign`)
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} faction${errorCount === 1 ? '' : 's'} failed to add`)
    }

    setIsBulkApproving(false)
  }

  // Bulk approve all NPC suggestions
  const handleBulkApproveNPCs = async () => {
    const npcSuggestions = filteredSuggestions.filter(
      s => s.suggestion_type === 'npc_detected' && s.status === 'pending'
    )

    if (npcSuggestions.length === 0) return

    setIsBulkApproving(true)

    let successCount = 0
    let errorCount = 0

    for (const suggestion of npcSuggestions) {
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
      toast.success(`${successCount} NPC${successCount === 1 ? '' : 's'} added to your campaign`)
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} NPC${errorCount === 1 ? '' : 's'} failed to add`)
    }

    setIsBulkApproving(false)
  }

  // Bulk approve all relationship suggestions
  const handleBulkApproveRelationships = async () => {
    const relationshipSuggestions = filteredSuggestions.filter(
      s => s.suggestion_type === 'relationship' && s.status === 'pending'
    )

    if (relationshipSuggestions.length === 0) return

    setIsBulkApproving(true)

    let successCount = 0
    let errorCount = 0

    for (const suggestion of relationshipSuggestions) {
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
      toast.success(`${successCount} relationship${successCount === 1 ? '' : 's'} added to your campaign`)
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} relationship${errorCount === 1 ? '' : 's'} failed to add`)
    }

    setIsBulkApproving(false)
  }

  // Generic bulk dismiss function for any suggestion type
  const handleBulkDismiss = async (suggestionType: SuggestionType, typeName: string) => {
    const suggestionsToRemove = filteredSuggestions.filter(
      s => s.suggestion_type === suggestionType && s.status === 'pending'
    )

    if (suggestionsToRemove.length === 0) return

    setIsBulkDismissing(true)

    let successCount = 0
    let errorCount = 0

    for (const suggestion of suggestionsToRemove) {
      try {
        const response = await fetch('/api/ai/suggestions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            suggestionId: suggestion.id,
            action: 'reject',
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
      toast.success(`${successCount} ${typeName}${successCount === 1 ? '' : 's'} dismissed`)
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} ${typeName}${errorCount === 1 ? '' : 's'} failed to dismiss`)
    }

    setIsBulkDismissing(false)
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
    // Session filter from URL
    if (sessionFilterId && s.session_id !== sessionFilterId) return false

    // History-specific filters (only apply when showHistory is true)
    if (showHistory) {
      // Status filter (applied/rejected)
      if (historyStatusFilter === 'applied' && s.status !== 'applied') return false
      if (historyStatusFilter === 'rejected' && s.status !== 'rejected') return false

      // Date range filter
      if (historyDateFrom) {
        const suggestionDate = new Date(s.created_at || '')
        const fromDate = new Date(historyDateFrom)
        if (suggestionDate < fromDate) return false
      }
      if (historyDateTo) {
        const suggestionDate = new Date(s.created_at || '')
        const toDate = new Date(historyDateTo)
        toDate.setHours(23, 59, 59, 999) // Include the entire end date
        if (suggestionDate > toDate) return false
      }

      // Search filter
      if (historySearch.trim()) {
        const searchLower = historySearch.toLowerCase().trim()
        const matchesCharacterName = s.character_name?.toLowerCase().includes(searchLower)
        const matchesFieldName = s.field_name?.toLowerCase().includes(searchLower)
        const matchesSuggestionType = s.suggestion_type.replace(/_/g, ' ').toLowerCase().includes(searchLower)
        const matchesReasoning = s.ai_reasoning?.toLowerCase().includes(searchLower)
        const matchesExcerpt = s.source_excerpt?.toLowerCase().includes(searchLower)
        const matchesSuggestedValue = typeof s.suggested_value === 'string'
          ? s.suggested_value.toLowerCase().includes(searchLower)
          : JSON.stringify(s.suggested_value || '').toLowerCase().includes(searchLower)
        const matchesRejectReason = s.status === 'rejected' && s.final_value
          ? (s.final_value as { reject_reason?: string })?.reject_reason?.toLowerCase().includes(searchLower)
          : false

        if (!matchesCharacterName && !matchesFieldName && !matchesSuggestionType &&
            !matchesReasoning && !matchesExcerpt && !matchesSuggestedValue && !matchesRejectReason) {
          return false
        }
      }
    }

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

  // Group suggestions based on grouping mode
  type SuggestionGroup = {
    id: string
    label: string
    sublabel?: string
    suggestions: IntelligenceSuggestion[]
    icon?: typeof Brain
  }

  const groupedSuggestions: SuggestionGroup[] = (() => {
    if (groupingMode === 'flat') {
      return [{ id: 'all', label: 'All Suggestions', suggestions: filteredSuggestions }]
    }

    if (groupingMode === 'by_session') {
      const groups: Record<string, IntelligenceSuggestion[]> = {}
      const noSession: IntelligenceSuggestion[] = []

      filteredSuggestions.forEach(s => {
        if (s.session_id) {
          if (!groups[s.session_id]) groups[s.session_id] = []
          groups[s.session_id].push(s)
        } else {
          noSession.push(s)
        }
      })

      const result: SuggestionGroup[] = Object.entries(groups)
        .map(([sessionId, suggs]) => {
          const session = sessions.find(s => s.id === sessionId)
          return {
            id: sessionId,
            label: session ? `Session ${session.session_number}${session.title ? `: ${session.title}` : ''}` : 'Unknown Session',
            sublabel: session?.date ? new Date(session.date).toLocaleDateString() : undefined,
            suggestions: suggs,
            icon: ScrollText,
          }
        })
        .sort((a, b) => {
          const sessionA = sessions.find(s => s.id === a.id)
          const sessionB = sessions.find(s => s.id === b.id)
          return (sessionB?.session_number || 0) - (sessionA?.session_number || 0)
        })

      if (noSession.length > 0) {
        result.push({ id: 'no-session', label: 'General Suggestions', suggestions: noSession })
      }

      return result
    }

    if (groupingMode === 'by_type') {
      const groups: Record<SuggestionType, IntelligenceSuggestion[]> = {} as Record<SuggestionType, IntelligenceSuggestion[]>

      filteredSuggestions.forEach(s => {
        if (!groups[s.suggestion_type]) groups[s.suggestion_type] = []
        groups[s.suggestion_type].push(s)
      })

      return Object.entries(groups)
        .map(([type, suggs]) => ({
          id: type,
          label: type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          suggestions: suggs,
          icon: SUGGESTION_ICONS[type as SuggestionType],
        }))
        .sort((a, b) => b.suggestions.length - a.suggestions.length)
    }

    if (groupingMode === 'by_character') {
      const groups: Record<string, IntelligenceSuggestion[]> = {}
      const noCharacter: IntelligenceSuggestion[] = []

      filteredSuggestions.forEach(s => {
        const charId = s.character_id || s.character_name
        if (charId) {
          if (!groups[charId]) groups[charId] = []
          groups[charId].push(s)
        } else {
          noCharacter.push(s)
        }
      })

      const result: SuggestionGroup[] = Object.entries(groups)
        .map(([charId, suggs]) => {
          const character = characters.find(c => c.id === charId)
          const name = character?.name || suggs[0]?.character_name || 'Unknown'
          return {
            id: charId,
            label: name,
            sublabel: character?.type === 'pc' ? 'Player Character' : character?.type === 'npc' ? 'NPC' : undefined,
            suggestions: suggs,
            icon: User,
          }
        })
        .sort((a, b) => b.suggestions.length - a.suggestions.length)

      if (noCharacter.length > 0) {
        result.push({ id: 'campaign-wide', label: 'Campaign-Wide', sublabel: 'Not tied to a specific character', suggestions: noCharacter })
      }

      return result
    }

    return [{ id: 'all', label: 'All Suggestions', suggestions: filteredSuggestions }]
  })()

  // Toggle group expansion
  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
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

  // Page actions for top bar
  const pageActions = (
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
  )

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
    <AppLayout campaignId={campaignId} topBarActions={pageActions}>
      <div className="max-w-6xl mx-auto px-4 py-6">
              {isAnalyzing ? 'Analyzing...' : cooldownStatus?.isOnCooldown ? cooldownStatus.remainingFormatted : 'Analyze'}
        {/* First-time guidance */}
        <GuidanceTip
          tipId="campaign_intelligence_intro"
          title="Welcome to Campaign Intelligence"
          description="Write session notes naturally, then let Campaign Intelligence suggest updates. It detects NPCs, locations, factions, timeline events, and relationships from your notes. Nothing changes without your approval."
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

            {/* History filters - only shown when viewing history */}
            {showHistory && (
              <div className="space-y-4 p-3 rounded-lg" style={{ backgroundColor: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.15)' }}>
                <h3 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2" style={{ color: '#a78bfa' }}>
                  <History className="w-3.5 h-3.5" />
                  History Filters
                </h3>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#6b7280' }} />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Search history..."
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg transition-colors"
                    style={{
                      backgroundColor: 'rgba(26, 26, 36, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#f3f4f6',
                    }}
                  />
                </div>

                {/* Status filter */}
                <div>
                  <label className="text-[10px] uppercase tracking-wider font-semibold block mb-2" style={{ color: '#6b7280' }}>
                    Status
                  </label>
                  <div className="flex gap-1">
                    {([
                      { value: 'all' as const, label: 'All' },
                      { value: 'applied' as const, label: 'Applied' },
                      { value: 'rejected' as const, label: 'Rejected' },
                    ]).map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => setHistoryStatusFilter(value)}
                        className={`flex-1 text-xs px-2 py-1.5 rounded transition-all ${
                          historyStatusFilter === value
                            ? value === 'applied'
                              ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
                              : value === 'rejected'
                                ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30'
                                : 'bg-[--arcane-purple]/20 text-[--arcane-purple] ring-1 ring-[--arcane-purple]/30'
                            : 'hover:bg-white/5 text-gray-400'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date range */}
                <div>
                  <label className="text-[10px] uppercase tracking-wider font-semibold block mb-2" style={{ color: '#6b7280' }}>
                    Date Range
                  </label>
                  <div className="space-y-2">
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#6b7280' }} />
                      <input
                        type="date"
                        value={historyDateFrom}
                        onChange={(e) => setHistoryDateFrom(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg transition-colors"
                        style={{
                          backgroundColor: 'rgba(26, 26, 36, 0.8)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#f3f4f6',
                          colorScheme: 'dark',
                        }}
                        placeholder="From"
                      />
                    </div>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#6b7280' }} />
                      <input
                        type="date"
                        value={historyDateTo}
                        onChange={(e) => setHistoryDateTo(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg transition-colors"
                        style={{
                          backgroundColor: 'rgba(26, 26, 36, 0.8)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#f3f4f6',
                          colorScheme: 'dark',
                        }}
                        placeholder="To"
                      />
                    </div>
                  </div>
                </div>

                {/* Clear history filters */}
                {(historySearch || historyStatusFilter !== 'all' || historyDateFrom || historyDateTo) && (
                  <button
                    onClick={() => {
                      setHistorySearch('')
                      setHistoryStatusFilter('all')
                      setHistoryDateFrom('')
                      setHistoryDateTo('')
                    }}
                    className="w-full text-xs px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors text-center"
                    style={{ color: '#9ca3af' }}
                  >
                    Clear history filters
                  </button>
                )}
              </div>
            )}

            {/* Grouping mode toggle */}
            {filteredSuggestions.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: '#6b7280' }}>
                  <Layers className="w-3.5 h-3.5" />
                  Group By
                </h3>
                <div className="grid grid-cols-2 gap-1">
                  {([
                    { mode: 'flat' as const, label: 'None', icon: LayoutList },
                    { mode: 'by_session' as const, label: 'Session', icon: ScrollText },
                    { mode: 'by_type' as const, label: 'Type', icon: Filter },
                    { mode: 'by_character' as const, label: 'Character', icon: User },
                  ]).map(({ mode, label, icon: Icon }) => (
                    <button
                      key={mode}
                      onClick={() => {
                        setGroupingMode(mode)
                        // Expand all groups by default when switching modes
                        if (mode !== 'flat') {
                          setExpandedGroups(new Set(groupedSuggestions.map(g => g.id)))
                        }
                      }}
                      className={`text-xs px-2 py-1.5 rounded-lg transition-all flex items-center gap-1.5 justify-center ${
                        groupingMode === mode
                          ? 'bg-[--arcane-purple]/20 text-[--arcane-purple] ring-1 ring-[--arcane-purple]/30'
                          : 'hover:bg-white/5 text-gray-400'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

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

            {/* Session filter indicator */}
            {sessionFilter && (
              <div className="p-3 rounded-lg mb-3" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <ScrollText className="w-4 h-4 flex-shrink-0" style={{ color: '#a78bfa' }} />
                    <span className="text-sm truncate" style={{ color: '#a78bfa' }}>
                      Session {sessionFilter.session_number}{sessionFilter.title ? `: ${sessionFilter.title}` : ''}
                    </span>
                  </div>
                  <button
                    onClick={() => router.push(`/campaigns/${campaignId}/intelligence`)}
                    className="p-1 rounded hover:bg-white/10 transition-colors flex-shrink-0"
                    title="Clear session filter"
                  >
                    <X className="w-4 h-4" style={{ color: '#a78bfa' }} />
                  </button>
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

            {/* Bulk approve locations, quests, encounters, factions, NPCs, and relationships */}
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
              const factionCount = suggestions.filter(
                s => (s.suggestion_type as string) === 'faction_detected' && s.status === 'pending'
              ).length
              const npcCount = suggestions.filter(
                s => s.suggestion_type === 'npc_detected' && s.status === 'pending'
              ).length
              const relationshipCount = suggestions.filter(
                s => s.suggestion_type === 'relationship' && s.status === 'pending'
              ).length
              if (locationCount === 0 && questCount === 0 && encounterCount === 0 && factionCount === 0 && npcCount === 0 && relationshipCount === 0) return null
              return (
                <div className="pt-4 border-t border-white/10">
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#6b7280' }}>
                    Bulk Actions
                  </h3>
                  <div className="space-y-3">
                    {locationCount > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-400 px-1">
                          <MapPin className="w-3.5 h-3.5 text-green-400" />
                          <span>{locationCount} Location{locationCount !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={handleBulkApproveLocations}
                            disabled={isBulkApproving || isBulkDismissing}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                            style={{ backgroundColor: 'rgba(74, 222, 128, 0.15)', border: '1px solid rgba(74, 222, 128, 0.3)', color: '#4ade80' }}
                          >
                            {isBulkApproving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            Add All
                          </button>
                          <button
                            onClick={() => handleBulkDismiss('location_detected', 'location')}
                            disabled={isBulkApproving || isBulkDismissing}
                            className="px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-white/5"
                            style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af' }}
                          >
                            {isBulkDismissing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    )}
                    {questCount > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-400 px-1">
                          <Target className="w-3.5 h-3.5 text-purple-400" />
                          <span>{questCount} Quest{questCount !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={handleBulkApproveQuests}
                            disabled={isBulkApproving || isBulkDismissing}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                            style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)', color: '#a78bfa' }}
                          >
                            {isBulkApproving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            Add All
                          </button>
                          <button
                            onClick={() => handleBulkDismiss('quest_detected', 'quest')}
                            disabled={isBulkApproving || isBulkDismissing}
                            className="px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-white/5"
                            style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af' }}
                          >
                            {isBulkDismissing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    )}
                    {encounterCount > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-400 px-1">
                          <Swords className="w-3.5 h-3.5 text-red-400" />
                          <span>{encounterCount} Encounter{encounterCount !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={handleBulkApproveEncounters}
                            disabled={isBulkApproving || isBulkDismissing}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                            style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171' }}
                          >
                            {isBulkApproving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            Add All
                          </button>
                          <button
                            onClick={() => handleBulkDismiss('encounter_detected', 'encounter')}
                            disabled={isBulkApproving || isBulkDismissing}
                            className="px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-white/5"
                            style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af' }}
                          >
                            {isBulkDismissing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    )}
                    {factionCount > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-400 px-1">
                          <Shield className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{factionCount} Faction{factionCount !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={handleBulkApproveFactions}
                            disabled={isBulkApproving || isBulkDismissing}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                            style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981' }}
                          >
                            {isBulkApproving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            Add All
                          </button>
                          <button
                            onClick={() => handleBulkDismiss('faction_detected' as SuggestionType, 'faction')}
                            disabled={isBulkApproving || isBulkDismissing}
                            className="px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-white/5"
                            style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af' }}
                          >
                            {isBulkDismissing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    )}
                    {npcCount > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-400 px-1">
                          <UserPlus className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{npcCount} NPC{npcCount !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={handleBulkApproveNPCs}
                            disabled={isBulkApproving || isBulkDismissing}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                            style={{ backgroundColor: 'rgba(34, 211, 238, 0.15)', border: '1px solid rgba(34, 211, 238, 0.3)', color: '#22d3ee' }}
                          >
                            {isBulkApproving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            Add All
                          </button>
                          <button
                            onClick={() => handleBulkDismiss('npc_detected', 'NPC')}
                            disabled={isBulkApproving || isBulkDismissing}
                            className="px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-white/5"
                            style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af' }}
                          >
                            {isBulkDismissing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    )}
                    {relationshipCount > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-400 px-1">
                          <Users className="w-3.5 h-3.5 text-pink-400" />
                          <span>{relationshipCount} Relationship{relationshipCount !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={handleBulkApproveRelationships}
                            disabled={isBulkApproving || isBulkDismissing}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                            style={{ backgroundColor: 'rgba(236, 72, 153, 0.15)', border: '1px solid rgba(236, 72, 153, 0.3)', color: '#f472b6' }}
                          >
                            {isBulkApproving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            Add All
                          </button>
                          <button
                            onClick={() => handleBulkDismiss('relationship', 'relationship')}
                            disabled={isBulkApproving || isBulkDismissing}
                            className="px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-white/5"
                            style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af' }}
                          >
                            {isBulkDismissing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
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
                {/* Icon */}
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
                  style={{
                    backgroundColor: suggestions.length === 0
                      ? (campaign?.last_intelligence_run ? 'rgba(16, 185, 129, 0.15)' : 'rgba(139, 92, 246, 0.15)')
                      : 'rgba(107, 114, 128, 0.15)',
                    border: suggestions.length === 0
                      ? (campaign?.last_intelligence_run ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(139, 92, 246, 0.3)')
                      : '1px solid rgba(107, 114, 128, 0.3)',
                  }}
                >
                  {suggestions.length === 0 ? (
                    campaign?.last_intelligence_run ? (
                      <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    ) : (
                      <Brain className="w-8 h-8" style={{ color: '#a78bfa' }} />
                    )
                  ) : (
                    <Filter className="w-8 h-8" style={{ color: '#6b7280' }} />
                  )}
                </div>

                {/* Title */}
                <p className="text-lg font-semibold mb-2" style={{ color: '#f3f4f6' }}>
                  {suggestions.length === 0
                    ? (campaign?.last_intelligence_run ? 'All Caught Up' : 'Ready to Analyze')
                    : 'No Matches'}
                </p>

                {/* Description */}
                <p className="text-sm text-center max-w-md" style={{ color: '#6b7280' }}>
                  {suggestions.length === 0 ? (
                    campaign?.last_intelligence_run ? (
                      sessions.length === 0 ? (
                        <>No session notes to analyze yet. Add session notes to discover NPCs, locations, and more.</>
                      ) : (
                        <>No new suggestions found. Your campaign data looks up to date since {formatTimeAgo(campaign.last_intelligence_run)}.</>
                      )
                    ) : (
                      sessions.length === 0 ? (
                        <>Add session notes to get started. Intelligence will detect NPCs, locations, factions, quests, and more.</>
                      ) : (
                        <>Campaign Intelligence scans your session notes to detect NPCs, locations, factions, quests, and more.</>
                      )
                    )
                  ) : (
                    <>No suggestions match your current filters. Try clearing filters to see all suggestions.</>
                  )}
                </p>

                {/* Stats (when analyzed recently) */}
                {suggestions.length === 0 && campaign?.last_intelligence_run && sessions.length > 0 && (
                  <div className="flex items-center gap-6 mt-4 text-sm">
                    <div className="text-center">
                      <p className="text-2xl font-semibold text-white">{sessions.length}</p>
                      <p className="text-gray-500 text-xs">Sessions Reviewed</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-semibold text-white">{characters.length}</p>
                      <p className="text-gray-500 text-xs">Characters Checked</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-semibold text-white">{counts.applied}</p>
                      <p className="text-gray-500 text-xs">Total Applied</p>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                {suggestions.length === 0 && (
                  <div className="mt-6 flex flex-col items-center gap-4">
                    {cooldownStatus?.isOnCooldown ? (
                      <>
                        <p className="text-sm text-amber-400">
                          Next analysis available in {cooldownStatus.remainingFormatted}
                        </p>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setShowHistory(true)}
                            className="btn btn-secondary flex items-center gap-2"
                          >
                            <History className="w-4 h-4" />
                            View History
                          </button>
                          <NextLink
                            href={`/campaigns/${campaignId}/sessions`}
                            className="btn btn-secondary flex items-center gap-2"
                          >
                            <ScrollText className="w-4 h-4" />
                            Update Notes
                          </NextLink>
                        </div>
                      </>
                    ) : (
                      <>
                        <button
                          className="btn btn-primary flex items-center gap-2"
                          onClick={handleAnalyzeClick}
                          disabled={isAnalyzing}
                        >
                          <Sparkles className="w-4 h-4" />
                          {campaign?.last_intelligence_run ? 'Run Analysis Again' : 'Analyze Campaign'}
                        </button>
                        {!campaign?.last_intelligence_run && (
                          <p className="text-xs text-purple-400/80 max-w-md italic text-center">
                            For best results, make sure your session notes include detailed summaries of what happened.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Suggestions list - grouped or flat */}
            {!isAnalyzing && groupingMode === 'flat' && filteredSuggestions.map((suggestion, index) => {
              const Icon = SUGGESTION_ICONS[suggestion.suggestion_type]
              const colors = SUGGESTION_COLORS[suggestion.suggestion_type]
              const isExpanded = expandedIds.has(suggestion.id)
              const isProcessing = processingIds.has(suggestion.id)
              const character = getCharacterForSuggestion(suggestion)
              const pendingIndex = filteredSuggestions.filter(s => s.status === 'pending').findIndex(s => s.id === suggestion.id)
              const isFocused = suggestion.status === 'pending' && pendingIndex === focusedIndex

              return (
                <div
                  key={suggestion.id}
                  className={cn(
                    "rounded-xl overflow-hidden transition-all",
                    selectedIds.has(suggestion.id) && "ring-2 ring-[--arcane-purple]",
                    isFocused && "ring-2 ring-amber-400/70"
                  )}
                  style={{
                    backgroundColor: isFocused
                      ? 'rgba(251, 191, 36, 0.1)'
                      : selectedIds.has(suggestion.id)
                        ? 'rgba(139, 92, 246, 0.1)'
                        : 'rgba(26, 26, 36, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <div className="p-4">
                    {/* Header */}
                    <div className="flex items-start gap-4">
                      {/* Selection checkbox for pending suggestions */}
                      {suggestion.status === 'pending' && (
                        <button
                          onClick={() => toggleSelection(suggestion.id)}
                          className={cn(
                            "flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                            selectedIds.has(suggestion.id)
                              ? "bg-[--arcane-purple] border-[--arcane-purple]"
                              : "border-gray-600 hover:border-gray-500"
                          )}
                        >
                          {selectedIds.has(suggestion.id) && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </button>
                      )}
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
                          {/* Edit button - show for all editable types */}
                          {(suggestion.suggestion_type === 'timeline_event' ||
                            suggestion.suggestion_type === 'location_detected' ||
                            suggestion.suggestion_type === 'quest_detected' ||
                            suggestion.suggestion_type === 'encounter_detected' ||
                            GENERIC_EDITABLE_TYPES.includes(suggestion.suggestion_type)) && (
                            <button
                              onClick={() => {
                                if (suggestion.suggestion_type === 'timeline_event') openEditModal(suggestion)
                                else if (suggestion.suggestion_type === 'location_detected') openLocationEditModal(suggestion)
                                else if (suggestion.suggestion_type === 'quest_detected') openQuestEditModal(suggestion)
                                else if (suggestion.suggestion_type === 'encounter_detected') openEncounterEditModal(suggestion)
                                else openGenericEditModal(suggestion)
                              }}
                              disabled={isProcessing}
                              className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors disabled:opacity-50"
                              title="Edit before approving"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleRejectClick(suggestion)}
                            disabled={isProcessing}
                            className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors disabled:opacity-50"
                            title="Dismiss (press D for quick dismiss)"
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
                      {/* Undo button for recently applied suggestions */}
                      {suggestion.status === 'applied' && canUndoSuggestion(suggestion) && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleUndoClick(suggestion)}
                            disabled={undoingSuggestionId === suggestion.id}
                            className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
                            title="Undo this suggestion (available for 24h)"
                          >
                            {undoingSuggestionId === suggestion.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RotateCcw className="w-3.5 h-3.5" />
                            )}
                            Undo
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
                      {/* Expand button only for non-pending, non-undoable suggestions */}
                      {suggestion.status !== 'pending' && !canUndoSuggestion(suggestion) && (
                        <div className="flex items-center gap-2 flex-shrink-0">
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
                        {(() => {
                          const sourceSession = suggestion.session_id
                            ? sessions.find(s => s.id === suggestion.session_id)
                            : null
                          return (
                            <>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: '#6b7280' }}>
                                  Source from Session Notes
                                </span>
                                {sourceSession && (
                                  <NextLink
                                    href={`/campaigns/${campaignId}/sessions/${sourceSession.id}?highlight=${encodeURIComponent(suggestion.source_excerpt.slice(0, 100))}`}
                                    className="text-[10px] font-medium text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
                                  >
                                    Session {sourceSession.session_number}{sourceSession.title ? `: ${sourceSession.title}` : ''}{sourceSession.date ? ` (${new Date(sourceSession.date).toLocaleDateString()})` : ''}
                                    <ChevronRight className="w-3 h-3" />
                                  </NextLink>
                                )}
                              </div>
                              {(() => {
                                // Get extended context from session notes
                                const sessionNotes = sourceSession?.notes || sourceSession?.summary || ''
                                const excerptIndex = sessionNotes.toLowerCase().indexOf(suggestion.source_excerpt.toLowerCase().slice(0, 30))
                                let extendedContext = ''
                                if (excerptIndex !== -1 && sessionNotes.length > suggestion.source_excerpt.length) {
                                  const start = Math.max(0, excerptIndex - 100)
                                  const end = Math.min(sessionNotes.length, excerptIndex + suggestion.source_excerpt.length + 100)
                                  extendedContext = (start > 0 ? '...' : '') + sessionNotes.slice(start, end).replace(/<[^>]*>/g, '') + (end < sessionNotes.length ? '...' : '')
                                }
                                return extendedContext && extendedContext.length > suggestion.source_excerpt.length + 20 ? (
                                  <Tooltip
                                    content={
                                      <div className="max-w-md text-xs leading-relaxed">
                                        <p className="font-semibold text-purple-400 mb-1">Extended Context:</p>
                                        <p className="text-gray-300">{extendedContext}</p>
                                      </div>
                                    }
                                    side="bottom"
                                    delay={500}
                                  >
                                    <blockquote
                                      className="text-sm p-3 rounded-lg italic cursor-help"
                                      style={{
                                        backgroundColor: 'rgba(16, 185, 129, 0.08)',
                                        borderLeft: '3px solid #10B981',
                                        color: '#9ca3af',
                                      }}
                                    >
                                      &quot;{suggestion.source_excerpt}&quot;
                                    </blockquote>
                                  </Tooltip>
                                ) : (
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
                                )
                              })()}
                            </>
                          )
                        })()}
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

                      {/* Applied value - show what was actually applied for history view */}
                      {suggestion.status === 'applied' && suggestion.final_value && (
                        <div>
                          <span className="text-[10px] uppercase tracking-wider font-semibold block mb-1" style={{ color: '#10b981' }}>
                            Applied Value
                          </span>
                          <div
                            className="text-sm p-2 rounded-lg"
                            style={{
                              backgroundColor: 'rgba(16, 185, 129, 0.08)',
                              border: '1px solid rgba(16, 185, 129, 0.2)',
                            }}
                          >
                            <p style={{ color: '#34d399' }}>
                              {(() => {
                                const finalVal = suggestion.final_value as Record<string, unknown>
                                // Check for specific entity IDs to show what was created
                                if (finalVal.timeline_event_id) return `Timeline event created (ID: ${String(finalVal.timeline_event_id).slice(0, 8)}...)`
                                if (finalVal.location_id) return `Location created: ${finalVal.name || 'New location'}`
                                if (finalVal.quest_id) return `Quest created: ${finalVal.name || 'New quest'}`
                                if (finalVal.encounter_id) return `Encounter created: ${finalVal.name || 'New encounter'}`
                                if (finalVal.faction_id) return `Faction created: ${finalVal.name || 'New faction'}`
                                if (finalVal.character_id) return `Character created/updated: ${finalVal.name || 'Character'}`
                                if (finalVal.relationship_id) return `Relationship created`
                                // Default: show the value
                                return formatValue(suggestion.final_value, suggestion.suggestion_type)
                              })()}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Rejection reason - show why it was dismissed for history view */}
                      {suggestion.status === 'rejected' && (
                        <div>
                          <span className="text-[10px] uppercase tracking-wider font-semibold block mb-1" style={{ color: '#f87171' }}>
                            Rejection Reason
                          </span>
                          <div
                            className="text-sm p-2 rounded-lg"
                            style={{
                              backgroundColor: 'rgba(239, 68, 68, 0.08)',
                              border: '1px solid rgba(239, 68, 68, 0.2)',
                            }}
                          >
                            <p style={{ color: '#f87171' }}>
                              {(() => {
                                const finalVal = suggestion.final_value as { reject_reason?: string } | null
                                const reason = finalVal?.reject_reason
                                if (!reason) return 'No reason provided (quick dismiss)'
                                // Map reason codes to readable labels
                                const reasonLabels: Record<string, string> = {
                                  'incorrect': 'Incorrect - AI got this wrong',
                                  'already_handled': 'Already handled manually',
                                  'not_relevant': 'Not relevant to my campaign',
                                  'will_add_manually': 'Will add this myself later',
                                  'duplicate': 'Duplicate of another suggestion',
                                }
                                return reasonLabels[reason] || reason
                              })()}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Grouped suggestions view */}
            {!isAnalyzing && groupingMode !== 'flat' && groupedSuggestions.map(group => {
              const isGroupExpanded = expandedGroups.has(group.id) || expandedGroups.size === 0
              const GroupIcon = group.icon || Brain

              return (
                <div key={group.id} className="mb-4">
                  {/* Group header */}
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg mb-2 transition-all hover:bg-white/5"
                    style={{
                      backgroundColor: 'rgba(26, 26, 36, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <GroupIcon className="w-5 h-5 text-[--arcane-purple]" />
                    <div className="flex-1 text-left">
                      <p className="font-medium text-white">{group.label}</p>
                      {group.sublabel && (
                        <p className="text-xs text-gray-500">{group.sublabel}</p>
                      )}
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-gray-400">
                      {group.suggestions.length}
                    </span>
                    {isGroupExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    )}
                  </button>

                  {/* Group suggestions */}
                  {isGroupExpanded && (
                    <div className="space-y-3 pl-2 border-l-2 border-[--arcane-purple]/20 ml-2">
                      {group.suggestions.map(suggestion => {
                        const Icon = SUGGESTION_ICONS[suggestion.suggestion_type]
                        const colors = SUGGESTION_COLORS[suggestion.suggestion_type]
                        const isExpanded = expandedIds.has(suggestion.id)
                        const isProcessing = processingIds.has(suggestion.id)
                        const character = getCharacterForSuggestion(suggestion)

                        return (
                          <div
                            key={suggestion.id}
                            className={cn(
                              "rounded-xl overflow-hidden transition-all",
                              selectedIds.has(suggestion.id) && "ring-2 ring-[--arcane-purple]"
                            )}
                            style={{
                              backgroundColor: selectedIds.has(suggestion.id) ? 'rgba(139, 92, 246, 0.1)' : 'rgba(26, 26, 36, 0.6)',
                              border: '1px solid rgba(255, 255, 255, 0.06)',
                            }}
                          >
                            <div className="p-4">
                              {/* Compact header for grouped view */}
                              <div className="flex items-start gap-4">
                                {/* Selection checkbox for pending suggestions */}
                                {suggestion.status === 'pending' && (
                                  <button
                                    onClick={() => toggleSelection(suggestion.id)}
                                    className={cn(
                                      "flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                                      selectedIds.has(suggestion.id)
                                        ? "bg-[--arcane-purple] border-[--arcane-purple]"
                                        : "border-gray-600 hover:border-gray-500"
                                    )}
                                  >
                                    {selectedIds.has(suggestion.id) && (
                                      <Check className="w-3 h-3 text-white" />
                                    )}
                                  </button>
                                )}
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
                                      {suggestion.confidence}
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

                                  {/* Suggestion title */}
                                  <p className="font-semibold text-[15px] mb-1" style={{ color: '#f3f4f6' }}>
                                    {suggestion.suggestion_type === 'timeline_event'
                                      ? (suggestion.suggested_value as { title?: string })?.title || 'New Timeline Event'
                                      : suggestion.suggestion_type === 'location_detected'
                                        ? (suggestion.suggested_value as { name?: string })?.name || 'New Location'
                                        : suggestion.suggestion_type === 'quest_detected'
                                          ? (suggestion.suggested_value as { name?: string })?.name || 'New Quest'
                                          : suggestion.suggestion_type === 'encounter_detected'
                                            ? (suggestion.suggested_value as { name?: string })?.name || 'New Encounter'
                                            : suggestion.character_name || character?.name || 'Unknown'}
                                    <span className="font-normal text-sm ml-2" style={{ color: '#6b7280' }}>
                                      → {suggestion.field_name.replace(/_/g, ' ')}
                                    </span>
                                  </p>

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
                                </div>

                                {/* Actions */}
                                {suggestion.status === 'pending' && (
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {/* Edit button for all editable types */}
                                    {(['timeline_event', 'location_detected', 'quest_detected', 'encounter_detected'].includes(suggestion.suggestion_type) ||
                                      GENERIC_EDITABLE_TYPES.includes(suggestion.suggestion_type)) && (
                                      <button
                                        onClick={() => {
                                          if (suggestion.suggestion_type === 'timeline_event') openEditModal(suggestion)
                                          else if (suggestion.suggestion_type === 'location_detected') openLocationEditModal(suggestion)
                                          else if (suggestion.suggestion_type === 'quest_detected') openQuestEditModal(suggestion)
                                          else if (suggestion.suggestion_type === 'encounter_detected') openEncounterEditModal(suggestion)
                                          else openGenericEditModal(suggestion)
                                        }}
                                        className="p-2 rounded-lg transition-colors hover:bg-white/5"
                                        style={{ color: '#9ca3af' }}
                                        title="Edit before applying"
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleAction(suggestion.id, 'approve')}
                                      disabled={isProcessing}
                                      className="p-2 rounded-lg transition-colors"
                                      style={{
                                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                        color: '#34d399',
                                      }}
                                      title="Apply suggestion"
                                    >
                                      {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    </button>
                                    <button
                                      onClick={() => handleRejectClick(suggestion)}
                                      disabled={isProcessing}
                                      className="p-2 rounded-lg transition-colors"
                                      style={{
                                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                        color: '#f87171',
                                      }}
                                      title="Dismiss suggestion (press D for quick dismiss)"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </main>
        </div>
      </div>

      {/* Multi-select floating action bar */}
      {selectedIds.size > 0 && (
        <div
          className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-3 rounded-xl shadow-2xl"
          style={{
            backgroundColor: 'rgba(26, 26, 36, 0.95)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <span className="text-sm font-medium text-white">
            {selectedIds.size} selected
          </span>
          <div className="w-px h-6 bg-white/10" />
          <button
            onClick={handleApplySelected}
            disabled={isMultiProcessing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              color: '#34d399',
            }}
          >
            {isMultiProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Apply Selected
          </button>
          <button
            onClick={handleDismissSelected}
            disabled={isMultiProcessing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: '#f87171',
            }}
          >
            <X className="w-4 h-4" />
            Dismiss Selected
          </button>
          <div className="w-px h-6 bg-white/10" />
          <button
            onClick={clearSelection}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Clear
          </button>
        </div>
      )}

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

      {/* Generic Edit Modal (for status_change, secret_revealed, quote, story_hook, important_person, relationship, npc_detected) */}
      <Modal
        isOpen={!!editingGenericSuggestion}
        onClose={() => setEditingGenericSuggestion(null)}
        title={getGenericEditTitle()}
        description="Edit the value before applying"
        size="md"
      >
        <div className="space-y-4">
          {/* Primary Value */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              {editingGenericSuggestion?.suggestion_type === 'status_change' ? 'Status' :
               editingGenericSuggestion?.suggestion_type === 'secret_revealed' ? 'Secret' :
               editingGenericSuggestion?.suggestion_type === 'quote' ? 'Quote' :
               editingGenericSuggestion?.suggestion_type === 'story_hook' ? 'Story Hook' :
               editingGenericSuggestion?.suggestion_type === 'important_person' ? 'Name' :
               editingGenericSuggestion?.suggestion_type === 'relationship' ? 'Relationship Label' :
               editingGenericSuggestion?.suggestion_type === 'npc_detected' ? 'NPC Name' :
               'Value'} <span className="text-red-400">*</span>
            </label>
            {['quote', 'secret_revealed', 'story_hook'].includes(editingGenericSuggestion?.suggestion_type || '') ? (
              <textarea
                value={genericFormData.value}
                onChange={(e) => setGenericFormData({ ...genericFormData, value: e.target.value })}
                className="form-input min-h-[100px]"
                placeholder="Enter value..."
              />
            ) : (
              <input
                type="text"
                value={genericFormData.value}
                onChange={(e) => setGenericFormData({ ...genericFormData, value: e.target.value })}
                className="form-input"
                placeholder="Enter value..."
              />
            )}
          </div>

          {/* Secondary field for important_person */}
          {editingGenericSuggestion?.suggestion_type === 'important_person' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Relationship
              </label>
              <input
                type="text"
                value={genericFormData.label || ''}
                onChange={(e) => setGenericFormData({ ...genericFormData, label: e.target.value })}
                className="form-input"
                placeholder="e.g., Father, Mentor, Enemy..."
              />
            </div>
          )}

          {/* Description field for relationship, npc_detected */}
          {['relationship', 'npc_detected'].includes(editingGenericSuggestion?.suggestion_type || '') && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Description
              </label>
              <textarea
                value={genericFormData.description || ''}
                onChange={(e) => setGenericFormData({ ...genericFormData, description: e.target.value })}
                className="form-input min-h-[80px]"
                placeholder="Additional details..."
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-[--border]">
            <button
              className="btn btn-secondary"
              onClick={() => setEditingGenericSuggestion(null)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSaveGenericEdit}
              disabled={!genericFormData.value.trim()}
            >
              Save & Apply
            </button>
          </div>
        </div>
      </Modal>

      {/* Analyze Confirmation Modal with Preview */}
      <Modal
        isOpen={showAnalyzeConfirmModal}
        onClose={() => setShowAnalyzeConfirmModal(false)}
        title="Ready to Analyze?"
        size="md"
      >
        <div className="space-y-4">
          {/* Full Audit Mode Toggle */}
          <label className="flex items-start gap-3 p-3 rounded-lg bg-[--bg-surface] border border-[--border] cursor-pointer hover:border-purple-500/30 transition-colors">
            <input
              type="checkbox"
              checked={fullAuditMode}
              onChange={async (e) => {
                const newValue = e.target.checked
                setFullAuditMode(newValue)
                // Re-fetch preview with new mode
                setPreviewData(prev => ({ ...prev, isLoading: true }))
                try {
                  const response = await fetch(`/api/ai/analyze-campaign/preview?campaignId=${campaignId}&fullAudit=${newValue}`)
                  if (response.ok) {
                    const data = await response.json()
                    setPreviewData({
                      sessionsToAnalyze: data.sessionsToAnalyze || [],
                      charactersUpdated: data.charactersUpdated || [],
                      lastRunTime: data.lastRunTime || null,
                      isLoading: false,
                    })
                  } else {
                    setPreviewData(prev => ({ ...prev, isLoading: false }))
                  }
                } catch {
                  setPreviewData(prev => ({ ...prev, isLoading: false }))
                }
              }}
              className="mt-0.5 w-4 h-4 rounded border-gray-600 bg-[--bg-base] text-purple-500 focus:ring-purple-500 focus:ring-offset-0"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white">Full Campaign Audit</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium">
                  Recommended for imports
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Analyze ALL sessions from the beginning, comparing notes against existing data to find gaps and mismatches.
                Use this for imported campaigns or when you want a complete reconciliation.
              </p>
            </div>
          </label>

          {/* Preview Section */}
          {previewData.isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
              <span className="ml-2 text-gray-400">Loading preview...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Last Run Info */}
              {previewData.lastRunTime && (
                <p className="text-sm text-gray-400">
                  Last analysis: {formatTimeAgo(previewData.lastRunTime)}
                </p>
              )}

              {/* Content to Analyze */}
              {(previewData.sessionsToAnalyze.length > 0 || previewData.charactersUpdated.length > 0) ? (
                <div className="grid grid-cols-2 gap-3">
                  {/* Sessions */}
                  <div className="p-3 rounded-lg bg-[--bg-surface] border border-[--border]">
                    <div className="flex items-center gap-2 mb-2">
                      <ScrollText className="w-4 h-4 text-purple-400" />
                      <span className="text-sm font-medium text-white">
                        {previewData.sessionsToAnalyze.length} Session{previewData.sessionsToAnalyze.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                      {previewData.sessionsToAnalyze.slice(0, 5).map(session => (
                        <p key={session.id} className="text-xs text-gray-400 truncate">
                          #{session.session_number}: {session.title || 'Untitled'}
                        </p>
                      ))}
                      {previewData.sessionsToAnalyze.length > 5 && (
                        <p className="text-xs text-gray-500">
                          +{previewData.sessionsToAnalyze.length - 5} more
                        </p>
                      )}
                      {previewData.sessionsToAnalyze.length === 0 && (
                        <p className="text-xs text-gray-500">No new sessions</p>
                      )}
                    </div>
                  </div>

                  {/* Characters */}
                  <div className="p-3 rounded-lg bg-[--bg-surface] border border-[--border]">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm font-medium text-white">
                        {previewData.charactersUpdated.length} Character{previewData.charactersUpdated.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                      {previewData.charactersUpdated.slice(0, 5).map(char => (
                        <p key={char.id} className="text-xs text-gray-400 truncate">
                          {char.name} ({char.type})
                        </p>
                      ))}
                      {previewData.charactersUpdated.length > 5 && (
                        <p className="text-xs text-gray-500">
                          +{previewData.charactersUpdated.length - 5} more
                        </p>
                      )}
                      {previewData.charactersUpdated.length === 0 && (
                        <p className="text-xs text-gray-500">No updated characters</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-sm text-amber-300">
                    {fullAuditMode
                      ? 'Full audit will analyze your entire campaign history. This may take longer than a regular analysis.'
                      : 'No new content since last analysis. Add session notes or update characters, or enable Full Campaign Audit to re-analyze everything.'}
                  </p>
                </div>
              )}

              {/* What Intelligence Looks For */}
              <details className="group">
                <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300 flex items-center gap-1">
                  <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
                  What Intelligence looks for
                </summary>
                <div className="mt-2 p-3 rounded-lg bg-[--bg-surface] border border-[--border]">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><UserPlus className="w-3 h-3 text-cyan-400" /> NPCs</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-green-400" /> Locations</span>
                    <span className="flex items-center gap-1"><Target className="w-3 h-3 text-purple-400" /> Quests</span>
                    <span className="flex items-center gap-1"><Swords className="w-3 h-3 text-red-400" /> Encounters</span>
                    <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-emerald-400" /> Factions</span>
                    <span className="flex items-center gap-1"><Link className="w-3 h-3 text-pink-400" /> Relationships</span>
                    <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3 text-indigo-400" /> Timeline events</span>
                    <span className="flex items-center gap-1"><Skull className="w-3 h-3 text-red-400" /> Status changes</span>
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3 text-purple-400" /> Secrets revealed</span>
                    <span className="flex items-center gap-1"><Quote className="w-3 h-3 text-green-400" /> Quotes</span>
                    <span className="flex items-center gap-1"><Package className="w-3 h-3 text-amber-400" /> Items/Loot</span>
                    <span className="flex items-center gap-1"><Trophy className="w-3 h-3 text-red-400" /> Combat outcomes</span>
                  </div>
                </div>
              </details>
            </div>
          )}

          <p className="text-gray-300 text-sm">
            For best results, make sure all party members have submitted their session notes and you&apos;ve added your own DM notes.
          </p>

          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-xs text-amber-300">
              <strong>Note:</strong> After running, there will be a cooldown of approximately <strong>12 hours</strong> before you can run again.
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
              disabled={!fullAuditMode && previewData.sessionsToAnalyze.length === 0 && previewData.charactersUpdated.length === 0}
            >
              <Sparkles className="w-4 h-4" />
              {fullAuditMode ? 'Run Full Audit' : 'Run Analysis'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Undo Confirmation Modal */}
      <Modal
        isOpen={showUndoConfirmModal}
        onClose={() => {
          setShowUndoConfirmModal(false)
          setSuggestionToUndo(null)
        }}
        title="Undo Applied Suggestion?"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-300">
            This will reverse the changes made when this suggestion was applied.
          </p>

          {suggestionToUndo && (
            <div className="p-3 rounded-lg bg-[--bg-surface] border border-[--border]">
              <p className="text-sm font-medium text-white mb-1">
                {suggestionToUndo.suggestion_type.replace(/_/g, ' ')}
              </p>
              <p className="text-xs text-gray-400">
                {formatValue(suggestionToUndo.suggested_value, suggestionToUndo.suggestion_type)}
              </p>
            </div>
          )}

          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-xs text-amber-300">
              <strong>Warning:</strong> This action may delete entities created from this suggestion (NPCs, locations, quests, etc.) and cannot be undone.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              className="btn btn-secondary"
              onClick={() => {
                setShowUndoConfirmModal(false)
                setSuggestionToUndo(null)
              }}
            >
              Cancel
            </button>
            <button
              className="btn flex items-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30"
              onClick={handleUndoConfirmed}
            >
              <RotateCcw className="w-4 h-4" />
              Undo Suggestion
            </button>
          </div>
        </div>
      </Modal>

      {/* Keyboard Shortcuts Modal */}
      <Modal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
        title="Keyboard Shortcuts"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Use these shortcuts to navigate and manage suggestions quickly.
          </p>

          <div className="space-y-3">
            <div className="flex justify-between items-center py-1.5 border-b border-white/5">
              <span className="text-gray-300">Show shortcuts</span>
              <kbd className="px-2 py-1 rounded bg-[--bg-elevated] border border-[--border] text-xs font-mono text-gray-300">?</kbd>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-white/5">
              <span className="text-gray-300">Navigate down</span>
              <kbd className="px-2 py-1 rounded bg-[--bg-elevated] border border-[--border] text-xs font-mono text-gray-300">J</kbd>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-white/5">
              <span className="text-gray-300">Navigate up</span>
              <kbd className="px-2 py-1 rounded bg-[--bg-elevated] border border-[--border] text-xs font-mono text-gray-300">K</kbd>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-white/5">
              <span className="text-gray-300">Approve focused</span>
              <kbd className="px-2 py-1 rounded bg-[--bg-elevated] border border-[--border] text-xs font-mono text-gray-300">A</kbd>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-white/5">
              <span className="text-gray-300">Dismiss focused</span>
              <kbd className="px-2 py-1 rounded bg-[--bg-elevated] border border-[--border] text-xs font-mono text-gray-300">D</kbd>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-white/5">
              <span className="text-gray-300">Edit focused</span>
              <kbd className="px-2 py-1 rounded bg-[--bg-elevated] border border-[--border] text-xs font-mono text-gray-300">E</kbd>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-white/5">
              <span className="text-gray-300">Expand/collapse</span>
              <kbd className="px-2 py-1 rounded bg-[--bg-elevated] border border-[--border] text-xs font-mono text-gray-300">Enter</kbd>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-white/5">
              <span className="text-gray-300">Approve all visible</span>
              <div className="flex items-center gap-1">
                <kbd className="px-2 py-1 rounded bg-[--bg-elevated] border border-[--border] text-xs font-mono text-gray-300">Shift</kbd>
                <span className="text-gray-500">+</span>
                <kbd className="px-2 py-1 rounded bg-[--bg-elevated] border border-[--border] text-xs font-mono text-gray-300">A</kbd>
              </div>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-gray-300">Clear focus</span>
              <kbd className="px-2 py-1 rounded bg-[--bg-elevated] border border-[--border] text-xs font-mono text-gray-300">Esc</kbd>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              className="btn btn-secondary"
              onClick={() => setShowShortcutsModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Rejection Reason Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false)
          setSuggestionToReject(null)
          setRejectReason('')
        }}
        title="Dismiss Suggestion"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-300">
            Optionally select a reason for dismissing this suggestion to help improve future results.
          </p>

          {suggestionToReject && (
            <div className="p-3 rounded-lg bg-[--bg-surface] border border-[--border]">
              <p className="text-sm font-medium text-white mb-1">
                {suggestionToReject.suggestion_type.replace(/_/g, ' ')}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {formatValue(suggestionToReject.suggested_value, suggestionToReject.suggestion_type)}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm text-gray-400">Reason (optional)</label>
            <select
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="form-input w-full"
            >
              {REJECTION_REASONS.map(reason => (
                <option key={reason.value} value={reason.value}>
                  {reason.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              className="btn btn-secondary"
              onClick={() => {
                setShowRejectModal(false)
                setSuggestionToReject(null)
                setRejectReason('')
              }}
            >
              Cancel
            </button>
            <button
              className="btn flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30"
              onClick={handleRejectConfirmed}
            >
              <X className="w-4 h-4" />
              Dismiss
            </button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}

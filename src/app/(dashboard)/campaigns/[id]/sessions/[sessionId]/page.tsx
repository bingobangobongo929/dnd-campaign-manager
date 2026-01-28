'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  Calendar,
  Sparkles,
  Loader2,
  Users,
  Check,
  X,
  Pencil,
  Wand2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  CheckCircle2,
  ScrollText,
  AlertTriangle,
  RefreshCw,
  Lightbulb,
  ClipboardList,
  Brain,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  MessageSquare,
  Layout,
  Layers,
} from 'lucide-react'
import { toast } from 'sonner'
import { Input, Button, sanitizeHtml } from '@/components/ui'
import { RichTextEditor } from '@/components/editor'
import { AppLayout } from '@/components/layout/app-layout'
import { useSupabase, useUser, useIsMobile, usePermissions, useUserSettings, useSessionLayoutPreferences } from '@/hooks'
import { SessionDetailMobile } from './page.mobile'
import { useVersionedAutoSave } from '@/hooks/useAutoSave'
import { logActivity, diffChanges } from '@/lib/activity-log'
import { useAppStore } from '@/store'
import { cn, getInitials } from '@/lib/utils'
import Image from 'next/image'
import type { Session, Campaign, Character, SessionPhase, SessionState, SessionSettings, PrepModule, CompletedSection } from '@/types/database'
import {
  SessionWorkflow,
  PlayerNotes,
  ThoughtsForNextCard,
  SessionContent,
  MODULE_CONFIG,
  ALL_MODULES,
  checkModuleHasContent,
  CustomizeLayoutModal,
  KeyNpcsModule,
  parseKeyNpcsValue,
} from '@/components/sessions'
import { DmNotesSection } from '@/components/dm-notes'

export default function SessionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useSupabase()
  const { user } = useUser()
  const isMobile = useIsMobile()
  const { aiProvider, settings } = useAppStore()
  const { settings: userSettings, updateSettings } = useUserSettings()
  const isModOrAbove = settings?.role === 'moderator' || settings?.role === 'super_admin'

  // Enhanced view toggle - stored in database (user_settings.session_enhanced_view)
  // Only available for mods+
  const useEnhancedView = userSettings?.session_enhanced_view ?? false

  // Toggle handler - saves to database
  const handleToggleEnhancedView = async (enabled: boolean) => {
    await updateSettings({ session_enhanced_view: enabled })
  }

  // Show enhanced view only if mod+ AND toggle is on
  const showEnhancedView = isModOrAbove && useEnhancedView

  const campaignId = params.id as string
  const { isDm, can, loading: permissionsLoading } = usePermissions(campaignId)
  const sessionId = params.sessionId as string
  const isNew = sessionId === 'new'

  // Get initial phase from URL query param for new sessions
  const initialPhase = searchParams.get('phase') as SessionPhase | null

  // Get highlight text from Intelligence page navigation
  const highlightText = searchParams.get('highlight')
  const [showHighlightBanner, setShowHighlightBanner] = useState(!!highlightText)

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [sessionVersion, setSessionVersion] = useState(1)
  const [originalData, setOriginalData] = useState<any>(null)
  const [characters, setCharacters] = useState<Character[]>([])
  const [locations, setLocations] = useState<{ id: string; name: string; type?: string }[]>([])
  const [quests, setQuests] = useState<{ id: string; name: string; type: string; status: string }[]>([])
  const [encounters, setEncounters] = useState<{ id: string; name: string; type: string; status: string; difficulty?: string }[]>([])
  const [previousSessionData, setPreviousSessionData] = useState<Session | null>(null)
  const [attendees, setAttendees] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)

  const [formData, setFormData] = useState({
    session_number: '',
    title: '',
    date: '',
    summary: '',
    notes: '',
    dm_notes: '',
  })

  // Session state (for player access control)
  const [sessionState, setSessionState] = useState<SessionState>('private')
  const [shareNotesWithPlayers, setShareNotesWithPlayers] = useState<boolean | null>(null)

  // AI Expand Notes state
  const [expanding, setExpanding] = useState(false)
  const [pendingNotes, setPendingNotes] = useState<string | null>(null)
  const [pendingSummary, setPendingSummary] = useState<string | null>(null)
  const [pendingTitle, setPendingTitle] = useState<string | null>(null)
  const [showExpandedPreview, setShowExpandedPreview] = useState(false)
  const [aiReasoning, setAiReasoning] = useState<string>('')
  // detailedNotesCollapsed removed - no longer needed after redesign
  // Standard mode shows Session Notes directly, Enhanced mode shows both fields always visible
  const [previousThoughts, setPreviousThoughts] = useState<string>('')
  const [openPlayerNotesModal, setOpenPlayerNotesModal] = useState(false)

  // Optional sections expansion state (collapsed by default per plan)
  const [expandedSections, setExpandedSections] = useState<{
    detailedNotes: boolean
    dmNotes: boolean
    sessionContent: boolean
    playerNotes: boolean
    // Prep modules (for completed phase display)
    checklist: boolean
    references: boolean
    session_goals: boolean
    key_npcs: boolean
    session_opener: boolean
    random_tables: boolean
    music_ambiance: boolean
  }>({
    detailedNotes: false,
    dmNotes: false,
    sessionContent: false,
    playerNotes: false,
    // Prep modules start collapsed
    checklist: false,
    references: false,
    session_goals: false,
    key_npcs: false,
    session_opener: false,
    random_tables: false,
    music_ambiance: false,
  })

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  // Customize layout modal state
  const [showCustomizeModal, setShowCustomizeModal] = useState(false)

  // Session layout preferences hook - use campaign session settings
  const rawSessionSettings = campaign?.session_settings as {
    players_can_view_session_notes?: boolean
    players_can_add_session_notes?: boolean
    disabled_prep_modules?: string[]
    disabled_completed_sections?: string[]
    all_optional_sections_hidden?: boolean
  } | null

  // Normalize settings with defaults for required fields
  const sessionSettings: SessionSettings | null = rawSessionSettings ? {
    players_can_view_session_notes: rawSessionSettings.players_can_view_session_notes ?? true,
    players_can_add_session_notes: rawSessionSettings.players_can_add_session_notes ?? true,
    disabled_prep_modules: rawSessionSettings.disabled_prep_modules as PrepModule[] | undefined,
    disabled_completed_sections: rawSessionSettings.disabled_completed_sections as CompletedSection[] | undefined,
    all_optional_sections_hidden: rawSessionSettings.all_optional_sections_hidden,
  } : null

  const layoutPrefs = useSessionLayoutPreferences(
    campaignId,
    user?.id,
    sessionSettings
  )

  // Phase management - for new sessions use URL param, for existing use session data (only prep/completed now)
  const [currentPhase, setCurrentPhase] = useState<SessionPhase>(initialPhase || 'prep')

  useEffect(() => {
    if (user && campaignId && sessionId) {
      loadData()
    }
  }, [user, campaignId, sessionId])

  const loadData = async () => {
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

    // Load all characters for attendance
    const { data: charactersData } = await supabase
      .from('characters')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('type', { ascending: true })
      .order('name')

    setCharacters(charactersData || [])

    // Load locations for quick reference
    const { data: locationsData } = await supabase
      .from('lore_locations')
      .select('id, name, type')
      .eq('campaign_id', campaignId)
      .order('name')

    setLocations(locationsData || [])

    // Load quests for quick reference
    const { data: questsData } = await supabase
      .from('quests')
      .select('id, name, type, status')
      .eq('campaign_id', campaignId)
      .order('name')

    setQuests(questsData || [])

    // Load encounters for quick reference
    const { data: encountersData } = await supabase
      .from('encounters')
      .select('id, name, type, status, difficulty')
      .eq('campaign_id', campaignId)
      .order('name')

    setEncounters(encountersData || [])

    if (isNew) {
      // Get previous session for next session number, thoughts_for_next, and prep_checklist
      const { data: sessions } = await supabase
        .from('sessions')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('session_number', { ascending: false })
        .limit(1)

      const previousSession = sessions && sessions.length > 0 ? sessions[0] : null
      const nextNumber = previousSession?.session_number !== null && previousSession?.session_number !== undefined
        ? previousSession.session_number + 1
        : 0

      // Store thoughts from previous session and full previous session data
      const thoughtsFromPrevious = previousSession?.thoughts_for_next || ''
      setPreviousThoughts(thoughtsFromPrevious)
      setPreviousSessionData(previousSession)

      setFormData({
        session_number: nextNumber.toString(),
        title: '',
        date: new Date().toISOString().split('T')[0],
        summary: '',
        notes: '',
        dm_notes: '',
      })
      setLoading(false)
      setHasLoadedOnce(true)
      return
    }

    // Load existing session
    const { data: sessionData } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (!sessionData) {
      router.push(`/campaigns/${campaignId}/sessions`)
      return
    }

    setSession(sessionData)
    setSessionVersion((sessionData as any).version || 1)
    setOriginalData(sessionData)
    setCurrentPhase((sessionData.phase as SessionPhase) || 'prep')
    setSessionState((sessionData.state as SessionState) || 'private')
    setShareNotesWithPlayers(sessionData.share_notes_with_players)
    setFormData({
      session_number: sessionData.session_number?.toString() || '',
      title: sessionData.title || '',
      date: sessionData.date || '',
      summary: sessionData.summary || '',
      notes: sessionData.notes || '',
      dm_notes: sessionData.dm_notes || '',
    })

    // Load session attendees
    const { data: attendeesData } = await supabase
      .from('session_characters')
      .select('character_id')
      .eq('session_id', sessionId)

    setAttendees(attendeesData?.map(a => a.character_id) || [])

    // Fetch previous session for carry-over functionality
    if (sessionData.session_number && sessionData.session_number > 0) {
      const { data: prevSessions } = await supabase
        .from('sessions')
        .select('*')
        .eq('campaign_id', campaignId)
        .lt('session_number', sessionData.session_number)
        .order('session_number', { ascending: false })
        .limit(1)

      setPreviousSessionData(prevSessions && prevSessions.length > 0 ? prevSessions[0] : null)
    }

    setLoading(false)
    setHasLoadedOnce(true)
  }

  // Handle phase change - updates state and saves to DB for existing sessions
  const handlePhaseChange = async (newPhase: SessionPhase) => {
    setCurrentPhase(newPhase)

    // For existing sessions, save to database immediately
    if (!isNew && session) {
      try {
        const response = await fetch(
          `/api/campaigns/${campaignId}/sessions/${session.id}/workflow`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phase: newPhase }),
          }
        )

        if (!response.ok) {
          toast.error('Failed to update phase')
          return
        }

        const data = await response.json()
        setSession(data.session)
        toast.success(`Switched to ${newPhase === 'prep' ? 'Prep' : 'Completed'}`)
      } catch (error) {
        console.error('Failed to update phase:', error)
        toast.error('Failed to update phase')
      }
    }
  }

  // Handle session state change (for player access)
  const handleStateChange = async (newState: SessionState) => {
    setSessionState(newState)

    if (!isNew && session) {
      try {
        const response = await fetch(
          `/api/campaigns/${campaignId}/sessions/${session.id}/workflow`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state: newState }),
          }
        )

        if (!response.ok) {
          toast.error('Failed to update session state')
          return
        }

        const data = await response.json()
        setSession(data.session)

        const stateLabels: Record<SessionState, string> = {
          private: 'Private (DM only)',
          open: 'Open for player notes',
          locked: 'Locked (read-only)',
        }
        toast.success(`Session is now ${stateLabels[newState]}`)
      } catch (error) {
        console.error('Failed to update session state:', error)
        toast.error('Failed to update session state')
      }
    }
  }

  // Handle share notes toggle
  const handleShareNotesChange = async (share: boolean) => {
    setShareNotesWithPlayers(share)

    if (!isNew && session) {
      try {
        const response = await fetch(
          `/api/campaigns/${campaignId}/sessions/${session.id}/workflow`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shareNotesWithPlayers: share }),
          }
        )

        if (!response.ok) {
          toast.error('Failed to update sharing')
          return
        }

        const data = await response.json()
        setSession(data.session)
      } catch (error) {
        console.error('Failed to update sharing:', error)
        toast.error('Failed to update sharing')
      }
    }
  }

  // Toggle character attendance
  const toggleAttendee = async (characterId: string) => {
    if (isNew) {
      // For new sessions, just track locally
      setAttendees(prev =>
        prev.includes(characterId)
          ? prev.filter(id => id !== characterId)
          : [...prev, characterId]
      )
      return
    }

    const isAttending = attendees.includes(characterId)

    if (isAttending) {
      await supabase
        .from('session_characters')
        .delete()
        .eq('session_id', sessionId)
        .eq('character_id', characterId)
      setAttendees(attendees.filter(id => id !== characterId))
    } else {
      await supabase
        .from('session_characters')
        .insert({ session_id: sessionId, character_id: characterId })
      setAttendees([...attendees, characterId])
    }
  }

  // Auto-save functionality with version checking
  const saveSession = useCallback(async (data: typeof formData, expectedVersion: number): Promise<{ success: boolean; conflict?: boolean; newVersion?: number; error?: string }> => {
    if (isNew || !session) return { success: false, error: 'Cannot auto-save new entries' }

    // Check version before update
    const { data: current } = await supabase
      .from('sessions')
      .select('version')
      .eq('id', session.id)
      .single()

    if (current && current.version !== expectedVersion) {
      return {
        success: false,
        conflict: true,
        newVersion: current.version,
        error: `This session was edited elsewhere. Your version: ${expectedVersion}, Server version: ${current.version}`,
      }
    }

    const newVersion = expectedVersion + 1
    const payload = {
      title: data.title || null,
      date: data.date || null,
      summary: data.summary || null,
      notes: data.notes || '',
      dm_notes: data.dm_notes || null,
      version: newVersion,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('sessions')
      .update(payload)
      .eq('id', session.id)
      .eq('version', expectedVersion)

    if (error) {
      return { success: false, error: error.message }
    }

    // Log activity only if there are actual changes from original
    if (user) {
      const changes = diffChanges(originalData, payload, ['title', 'summary', 'notes'])
      if (changes && Object.keys(changes).length > 0) {
        logActivity(supabase, user.id, {
          action: 'session.edit',
          entity_type: 'session',
          entity_id: session.id,
          entity_name: data.title || `Session ${data.session_number}`,
          changes,
        })
        // Update originalData so we don't log the same changes again
        setOriginalData({ ...originalData, ...payload })
      }
    }

    setSessionVersion(newVersion)
    return { success: true, newVersion }
  }, [formData, session, supabase, isNew, originalData, user])

  const { status, hasConflict } = useVersionedAutoSave({
    data: formData,
    version: sessionVersion,
    onSave: saveSession,
    delay: 1500,
    enabled: !isNew && !!session && can.editSession,
    showToast: false,
  })

  // Create new session
  const handleCreate = async () => {
    // Different validation based on phase
    if (currentPhase === 'completed' && !formData.summary.trim()) {
      toast.error('Please add a summary first')
      return
    }

    const { data: newSession, error } = await supabase
      .from('sessions')
      .insert({
        campaign_id: campaignId,
        session_number: formData.session_number ? parseInt(formData.session_number) : 0,
        title: formData.title || null,
        date: formData.date || null,
        summary: formData.summary || null,
        notes: formData.notes || '',
        phase: currentPhase,
        state: 'private',
      })
      .select()
      .single()

    if (error || !newSession) {
      toast.error('Failed to create session')
      return
    }

    // Save attendees
    if (attendees.length > 0) {
      await supabase
        .from('session_characters')
        .insert(attendees.map(charId => ({
          session_id: newSession.id,
          character_id: charId,
        })))
    }

    toast.success('Session created')
    router.replace(`/campaigns/${campaignId}/sessions/${newSession.id}`)
  }

  // AI Expand Notes
  const handleExpandNotes = async () => {
    if (!formData.summary.trim() || expanding) return

    setExpanding(true)
    setPendingNotes('')
    setPendingSummary('')
    setPendingTitle(null)
    setAiReasoning('')
    setShowExpandedPreview(true)

    try {
      // Build known entities from campaign characters
      const knownEntities: string[] = []
      characters.forEach(char => {
        if (char.name) knownEntities.push(char.name)
      })

      // Build context
      const contextParts = []
      if (campaign?.name) contextParts.push(`Campaign: ${campaign.name}`)
      if (formData.title) contextParts.push(`Session Title: ${formData.title}`)
      contextParts.push(`Session Number: ${formData.session_number}`)

      const response = await fetch('/api/ai/expand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: formData.summary,
          context: contextParts.join('\n'),
          provider: aiProvider,
          mode: 'session',
          knownEntities,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error:', errorText)
        throw new Error('Failed to expand notes')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader')

      let fullText = ''
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        fullText += chunk

        // Parse sections from accumulated text
        const summaryMatch = fullText.match(/---CLEANED_SUMMARY---\n?([\s\S]*?)(?=---DETAILED_NOTES---|$)/)
        const notesMatch = fullText.match(/---DETAILED_NOTES---\n?([\s\S]*?)(?=---TITLE---|---REASONING---|$)/)
        const titleMatch = fullText.match(/---TITLE---\n?([\s\S]*?)(?=---REASONING---|$)/)
        const reasoningMatch = fullText.match(/---REASONING---\n?([\s\S]*)$/)

        if (summaryMatch) {
          setPendingSummary(summaryMatch[1].trim())
        }
        if (notesMatch) {
          setPendingNotes(notesMatch[1].trim())
        }
        if (titleMatch) {
          setPendingTitle(titleMatch[1].trim())
        }
        if (reasoningMatch) {
          setAiReasoning(reasoningMatch[1].trim())
        }
      }

      // Fallback if no sections found
      const summaryMatch = fullText.match(/---CLEANED_SUMMARY---\n?([\s\S]*?)(?=---DETAILED_NOTES---|$)/)
      const notesMatch = fullText.match(/---DETAILED_NOTES---\n?([\s\S]*?)(?=---TITLE---|---REASONING---|$)/)

      if (!summaryMatch && !notesMatch) {
        setPendingNotes(fullText.trim())
      }
    } catch (error) {
      console.error('Expand error:', error)
      toast.error('Failed to expand notes')
      setShowExpandedPreview(false)
      setPendingNotes(null)
      setPendingSummary(null)
      setPendingTitle(null)
    } finally {
      setExpanding(false)
    }
  }

  // Convert text to HTML bullet list (or pass through if already HTML)
  const formatSummaryAsHtml = (text: string): string => {
    // If already contains HTML list tags, pass through
    if (text.includes('<ul>') || text.includes('<li>')) {
      return text
    }

    // Split into lines and clean up
    const lines = text.split('\n').filter(line => line.trim())

    // If we have multiple lines, treat each as a bullet point
    if (lines.length > 1) {
      const listItems = lines.map(line => {
        // Remove any existing bullet characters
        const cleanLine = line.replace(/^[\s]*[•\-\*]\s*/, '').trim()
        // TipTap expects <p> inside <li> for proper parsing
        return cleanLine ? `<li><p>${cleanLine}</p></li>` : ''
      }).filter(Boolean).join('')
      return `<ul>${listItems}</ul>`
    }

    // Single line - return as-is
    return text
  }

  const acceptExpanded = () => {
    if (pendingSummary) {
      setFormData(prev => ({ ...prev, summary: formatSummaryAsHtml(pendingSummary) }))
    }
    if (pendingNotes) {
      setFormData(prev => ({ ...prev, notes: pendingNotes }))
    }
    if (pendingTitle && !formData.title.trim()) {
      setFormData(prev => ({ ...prev, title: pendingTitle }))
    }
    setShowExpandedPreview(false)
    setPendingNotes(null)
    setPendingSummary(null)
    setPendingTitle(null)
    setAiReasoning('')
  }

  const editExpanded = () => {
    if (pendingSummary) {
      setFormData(prev => ({ ...prev, summary: formatSummaryAsHtml(pendingSummary) }))
    }
    if (pendingNotes) {
      setFormData(prev => ({ ...prev, notes: pendingNotes }))
    }
    if (pendingTitle && !formData.title.trim()) {
      setFormData(prev => ({ ...prev, title: pendingTitle }))
    }
    setShowExpandedPreview(false)
    setPendingNotes(null)
    setPendingSummary(null)
    setPendingTitle(null)
    setAiReasoning('')
  }

  const declineExpanded = () => {
    setShowExpandedPreview(false)
    setPendingNotes(null)
    setPendingSummary(null)
    setPendingTitle(null)
    setAiReasoning('')
  }

  // Group characters by type - only show alive/active PCs for attendance
  const INACTIVE_STATUSES = ['dead', 'deceased', 'killed', 'retired', 'left', 'gone']
  const pcCharacters = characters.filter(c =>
    c.type === 'pc' &&
    (!c.status || !INACTIVE_STATUSES.includes(c.status.toLowerCase()))
  )

  // Mobile Layout
  if (isMobile) {
    return (
      <SessionDetailMobile
        campaignId={campaignId}
        sessionId={sessionId}
        isNew={isNew}
        loading={loading}
        formData={formData}
        setFormData={setFormData}
        status={status}
        hasConflict={hasConflict}
        attendees={attendees}
        toggleAttendee={toggleAttendee}
        characters={characters}
        pcCharacters={pcCharacters}
        showExpandedPreview={showExpandedPreview}
        expanding={expanding}
        pendingSummary={pendingSummary}
        pendingTitle={pendingTitle}
        pendingNotes={pendingNotes}
        handleCreate={handleCreate}
        handleExpandNotes={handleExpandNotes}
        acceptExpanded={acceptExpanded}
        editExpanded={editExpanded}
        declineExpanded={declineExpanded}
        formatSummaryAsHtml={formatSummaryAsHtml}
        showEnhancedView={showEnhancedView}
        session={session}
        campaign={campaign}
        userId={user?.id || ''}
        onSessionUpdate={setSession}
        // Phase-related props
        currentPhase={currentPhase}
        handlePhaseChange={handlePhaseChange}
        locations={locations}
        quests={quests}
        encounters={encounters}
        previousSession={previousSessionData}
        previousThoughts={previousThoughts}
        // Permission props
        isDm={isDm}
        canEditSession={can.editSession}
        // Session state props
        sessionState={sessionState}
        handleStateChange={handleStateChange}
        shareNotesWithPlayers={shareNotesWithPlayers}
        handleShareNotesChange={handleShareNotesChange}
        // DM Notes props
        dmNotes={formData.dm_notes}
        onDmNotesChange={(notes) => setFormData({ ...formData, dm_notes: notes })}
      />
    )
  }

  // Desktop Layout
  if (loading || permissionsLoading) {
    return (
      <AppLayout campaignId={campaignId}>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-10 h-10 animate-spin text-[--arcane-purple]" />
        </div>
      </AppLayout>
    )
  }

  // Player access check: players cannot view private sessions
  if (!isDm && !isNew && sessionState === 'private') {
    return (
      <AppLayout campaignId={campaignId}>
        <div className="max-w-2xl mx-auto px-6 py-16 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gray-500/10 flex items-center justify-center">
            <EyeOff className="w-10 h-10 text-gray-500" />
          </div>
          <h1 className="text-2xl font-semibold text-white mb-3">Session Not Available</h1>
          <p className="text-gray-400 mb-6">
            This session is still being prepared by the DM and is not yet available to players.
            You&apos;ll be able to view it once the DM opens it for notes.
          </p>
          <button
            onClick={() => router.push(`/campaigns/${campaignId}/sessions`)}
            className="btn btn-primary"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Sessions
          </button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout campaignId={campaignId}>
      {/* Conflict Warning Banner */}
      {hasConflict && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <div>
              <p className="text-sm font-medium text-amber-400">This session was modified elsewhere</p>
              <p className="text-xs text-amber-400/70">Your changes may conflict with the latest version. Reload to see updates.</p>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reload
          </button>
        </div>
      )}

      {/* Intelligence Highlight Banner */}
      {showHighlightBanner && highlightText && (
        <div className="bg-purple-500/10 border-b border-purple-500/30 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Brain className="w-5 h-5 text-purple-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-purple-400">From Campaign Intelligence</p>
              <p className="text-xs text-purple-400/70 truncate">&quot;{highlightText}&quot;</p>
            </div>
          </div>
          <button
            onClick={() => setShowHighlightBanner(false)}
            className="p-1.5 text-purple-400/70 hover:text-purple-400 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push(`/campaigns/${campaignId}/sessions`)}
            className="flex items-center gap-2 text-sm text-[--text-secondary] hover:text-[--text-primary] transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sessions
          </button>

          {/* Campaign Context */}
          {campaign && (
            <p className="text-xs text-[--text-tertiary] mb-4">
              <span className="text-[--arcane-purple]">{campaign.name}</span>
              <span className="mx-2">/</span>
              <span>Session Log</span>
            </p>
          )}

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-bold text-[--arcane-purple] bg-[--arcane-purple]/10 px-2 py-0.5 rounded">
                  Session {formData.session_number || '?'}
                </span>
                <div className="flex items-center gap-1.5 text-sm text-[--text-tertiary]">
                  <Calendar className="w-4 h-4" />
                  {can.editSession ? (
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="h-7 px-2 py-0 text-sm border-none bg-transparent hover:bg-[--bg-elevated] focus:bg-[--bg-elevated] rounded cursor-pointer"
                    />
                  ) : (
                    <span>{formData.date ? new Date(formData.date).toLocaleDateString() : 'No date'}</span>
                  )}
                </div>
              </div>
              {can.editSession ? (
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="text-2xl font-display font-semibold border-none bg-transparent px-0 h-auto focus:ring-0 placeholder:text-[--text-tertiary]"
                  placeholder="Session title (auto-suggested from notes)..."
                />
              ) : (
                <h1 className="text-2xl font-display font-semibold text-[--text-primary]">
                  {formData.title || `Session ${formData.session_number}`}
                </h1>
              )}
            </div>
            <div className="flex items-center gap-3">
              {!isNew && can.editSession && (
                <span className={cn(
                  "text-sm transition-opacity",
                  status === 'conflict' ? 'text-amber-400' : status === 'saving' ? 'text-[--text-tertiary]' : 'text-[--text-tertiary] opacity-60'
                )}>
                  {status === 'conflict' && 'Conflict detected'}
                  {status === 'saving' && 'Saving...'}
                  {status === 'saved' && '(auto-saved)'}
                  {status === 'idle' && '(auto-saved)'}
                </span>
              )}
              {/* View Mode Toggle - only for Mods+ */}
              {isModOrAbove && (
                <div className="flex items-center bg-white/[0.03] rounded-lg border border-white/[0.08] p-1">
                  <button
                    onClick={() => handleToggleEnhancedView(false)}
                    className={cn(
                      "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                      !useEnhancedView
                        ? "bg-[--arcane-purple] text-white"
                        : "text-gray-400 hover:text-white"
                    )}
                  >
                    Standard
                  </button>
                  <button
                    onClick={() => handleToggleEnhancedView(true)}
                    className={cn(
                      "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                      useEnhancedView
                        ? "bg-[--arcane-purple] text-white"
                        : "text-gray-400 hover:text-white"
                    )}
                  >
                    Enhanced
                  </button>
                </div>
              )}
              {isNew && isDm && (
                <Button onClick={handleCreate}>
                  Create Session
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* 2-Phase Toggle Bar - Only shown to DMs */}
        {isDm && (
          <div className="mb-8 p-1.5 bg-white/[0.03] rounded-xl border border-white/[0.08]">
            <div className="grid grid-cols-2 gap-1.5">
              {/* Prep Phase */}
              <button
                onClick={() => handlePhaseChange('prep')}
                className={cn(
                  "flex flex-col items-center gap-1.5 py-4 px-4 rounded-lg transition-all",
                  currentPhase === 'prep'
                    ? "bg-yellow-500/20 border-2 border-yellow-500/50 shadow-lg shadow-yellow-500/10"
                    : "border-2 border-transparent hover:bg-white/[0.04]"
                )}
              >
                <ClipboardList className={cn(
                  "w-6 h-6",
                  currentPhase === 'prep' ? "text-yellow-400" : "text-gray-500"
                )} />
                <span className={cn(
                  "text-sm font-semibold",
                  currentPhase === 'prep' ? "text-yellow-400" : "text-gray-400"
                )}>
                  Prep
                </span>
                <span className={cn(
                  "text-xs",
                  currentPhase === 'prep' ? "text-yellow-400/70" : "text-gray-600"
                )}>
                  Planning & Running
                </span>
              </button>

              {/* Completed Phase */}
              <button
                onClick={() => handlePhaseChange('completed')}
                className={cn(
                  "flex flex-col items-center gap-1.5 py-4 px-4 rounded-lg transition-all",
                  currentPhase === 'completed'
                    ? "bg-purple-500/20 border-2 border-purple-500/50 shadow-lg shadow-purple-500/10"
                    : "border-2 border-transparent hover:bg-white/[0.04]"
                )}
              >
                <CheckCircle2 className={cn(
                  "w-6 h-6",
                  currentPhase === 'completed' ? "text-purple-400" : "text-gray-500"
                )} />
                <span className={cn(
                  "text-sm font-semibold",
                  currentPhase === 'completed' ? "text-purple-400" : "text-gray-400"
                )}>
                  Completed
                </span>
                <span className={cn(
                  "text-xs",
                  currentPhase === 'completed' ? "text-purple-400/70" : "text-gray-600"
                )}>
                  Post-session
                </span>
              </button>
            </div>
          </div>
        )}

        {/* === PREP PHASE LAYOUT === (DM only) */}
        {isDm && currentPhase === 'prep' && (
          <>
            {/* Session Workflow - Full component for Prep mode */}
            {!isNew && session && campaign && isDm && (
              <div className="mb-8">
                <SessionWorkflow
                  session={session}
                  campaignId={campaignId}
                  characters={characters}
                  locations={locations}
                  quests={quests}
                  encounters={encounters}
                  previousSession={previousSessionData}
                  onUpdate={(updatedSession) => setSession(updatedSession)}
                  defaultSections={(campaign.default_session_sections as string[]) || []}
                  disabledModules={sessionSettings?.disabled_prep_modules}
                  collapsedSections={layoutPrefs.collapsedSections}
                  onToggleCollapsed={layoutPrefs.toggleSectionCollapsed}
                />
              </div>
            )}

            {/* Basic info for new sessions in Prep mode */}
            {isNew && (
              <div className="card p-6 mb-8 border-yellow-500/30 bg-yellow-500/5">
                <div className="flex items-center gap-2 mb-4">
                  <ClipboardList className="w-5 h-5 text-yellow-400" />
                  <span className="font-medium text-white">Session Planning</span>
                </div>
                <p className="text-sm text-gray-400 mb-4">
                  You&apos;re in prep mode. Use this to plan your upcoming session with notes, a checklist, and reference materials.
                  Switch to &quot;Completed&quot; when you&apos;re ready to add your session recap.
                </p>
                <div className="flex justify-end">
                  <Button onClick={handleCreate} size="lg" variant="primary">
                    Create Session
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* === COMPLETED PHASE LAYOUT === */}
        {(currentPhase === 'completed' || !isDm) && (
          <>
            {/* Session State Dropdown - DM only, for existing sessions */}
            {isDm && !isNew && session && (
              <div className="card p-4 mb-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-white">Session Status</span>
                  <div className="relative">
                    <select
                      value={sessionState}
                      onChange={(e) => handleStateChange(e.target.value as SessionState)}
                      className={cn(
                        "appearance-none pl-8 pr-10 py-2 rounded-lg text-sm font-medium cursor-pointer",
                        "bg-[--bg-elevated] border border-white/[0.08] focus:outline-none focus:border-[--arcane-purple]",
                        sessionState === 'private' && "text-gray-400",
                        sessionState === 'open' && "text-green-400",
                        sessionState === 'locked' && "text-amber-400"
                      )}
                    >
                      <option value="private">Private (DM only)</option>
                      <option value="open">Open for player notes</option>
                      <option value="locked">Locked (read-only)</option>
                    </select>
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2">
                      {sessionState === 'private' && <EyeOff className="w-4 h-4 text-gray-500" />}
                      {sessionState === 'open' && <Unlock className="w-4 h-4 text-green-400" />}
                      {sessionState === 'locked' && <Lock className="w-4 h-4 text-amber-400" />}
                    </div>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  {sessionState === 'private' && 'Players cannot see this session'}
                  {sessionState === 'open' && 'Players can view and add their notes'}
                  {sessionState === 'locked' && 'Session is finalized and read-only'}
                </p>
              </div>
            )}

            {/* Thoughts from Previous Session (context for new sessions - DM only) */}
            {isDm && isNew && previousThoughts && (
              <div className="card p-6 mb-8 border-purple-500/30 bg-purple-500/5">
                <div className="flex items-center gap-3 mb-4">
                  <Lightbulb className="w-5 h-5 text-purple-400" />
                  <label className="text-lg font-semibold text-purple-300">
                    From Previous Session
                  </label>
                </div>
                <p className="text-gray-300 text-sm whitespace-pre-wrap">{previousThoughts}</p>
                <p className="text-xs text-gray-500 mt-3">
                  These notes were left in the previous session for you to reference.
                </p>
              </div>
            )}

            {/* === STANDARD MODE: Single "Session Notes" field editing `notes` === */}
            {!showEnhancedView && (
              <div className="bg-[--bg-surface] rounded-xl overflow-hidden mb-8">
                <div className="p-5 border-b border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <ScrollText className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Session Notes</h3>
                      {can.editSession && (
                        <p className="text-sm text-[--text-tertiary]">
                          What happened this session? Try mentioning NPCs talked to, locations visited, key decisions...
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-5">

                {can.editSession ? (
                  <RichTextEditor
                    content={formData.notes}
                    onChange={(content) => setFormData({ ...formData, notes: content })}
                    placeholder="What happened this session? Try mentioning NPCs talked to, locations visited, key decisions..."
                    className="min-h-[200px]"
                  />
                ) : (
                  /* Read-only notes for players - only show if shared */
                  <>
                    {shareNotesWithPlayers ? (
                      <div className="prose prose-invert prose-sm max-w-none [&>ul]:mt-1 [&>ul]:mb-2 [&>li]:my-0.5">
                        {formData.notes ? (
                          <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(formData.notes) }} />
                        ) : (
                          <p className="text-[--text-tertiary] italic">No session notes available yet.</p>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-white/[0.02] rounded-lg border border-[--border]">
                        <EyeOff className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-400 text-sm">The DM hasn&apos;t shared their session notes.</p>
                        <p className="text-gray-600 text-xs mt-1">
                          You can still add your own notes and read notes from other party members below.
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* Share with players checkbox - DM only */}
                {can.editSession && !isNew && (
                  <div className="mt-4 pt-4 border-t border-white/[0.06]">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={shareNotesWithPlayers ?? false}
                        onChange={(e) => handleShareNotesChange(e.target.checked)}
                        className="w-4 h-4 rounded border-[--border] bg-[--bg-surface] text-[--arcane-purple] focus:ring-[--arcane-purple]/50"
                      />
                      <span className="text-sm text-gray-400">Share with players</span>
                      <span className="text-xs text-gray-600">(when session is open or locked)</span>
                    </label>
                  </div>
                )}
                </div>
              </div>
            )}

            {/* === ENHANCED MODE: "Quick Recap" (summary) + "Detailed Notes" (notes) === */}
            {showEnhancedView && (
              <>
                {/* Quick Recap - edits summary field */}
                <div className="bg-[--bg-surface] rounded-xl overflow-hidden mb-8">
                  <div className="p-5 border-b border-white/[0.06]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-500/10">
                          <ClipboardList className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">Quick Recap</h3>
                          {can.editSession && (
                            <p className="text-sm text-[--text-tertiary]">
                              Write quick bullets about what happened. You can expand them into detailed notes when ready.
                            </p>
                          )}
                        </div>
                      </div>
                      {can.editSession && !showExpandedPreview && (
                        <button
                          onClick={handleExpandNotes}
                          disabled={!formData.summary.trim() || expanding}
                          className={cn(
                            "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                            "bg-[--arcane-purple]/10 border border-[--arcane-purple]/30 text-[--arcane-purple]",
                            "hover:bg-[--arcane-purple]/20 hover:border-[--arcane-purple]/50",
                            "disabled:opacity-50 disabled:cursor-not-allowed"
                          )}
                        >
                          {expanding ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Wand2 className="w-4 h-4" />
                          )}
                          Expand Notes
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="p-5">
                    {can.editSession ? (
                      <RichTextEditor
                        content={formData.summary}
                        onChange={(content) => setFormData({ ...formData, summary: content })}
                        placeholder="Write quick bullets about what happened. You can expand them into detailed notes when ready."
                        className="min-h-[150px]"
                      />
                    ) : (
                      /* Read-only summary for players - only show if shared */
                      <>
                        {shareNotesWithPlayers ? (
                          <div className="prose prose-invert prose-sm max-w-none [&>ul]:mt-1 [&>ul]:mb-2 [&>li]:my-0.5">
                            {formData.summary ? (
                              <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(formData.summary) }} />
                            ) : (
                              <p className="text-[--text-tertiary] italic">No quick recap available yet.</p>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-6 bg-white/[0.02] rounded-lg">
                            <EyeOff className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                            <p className="text-gray-500 text-xs">Not shared by DM</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Detailed Notes - edits notes field - always visible in enhanced mode */}
                <div className="bg-[--bg-surface] rounded-xl overflow-hidden mb-8">
                  <div className="p-5 border-b border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <ScrollText className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">Detailed Notes</h3>
                        <p className="text-sm text-[--text-tertiary]">
                          Full prose session narrative (expanded from Quick Recap)
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                      {can.editSession ? (
                        <RichTextEditor
                          content={formData.notes}
                          onChange={(content) => setFormData({ ...formData, notes: content })}
                          placeholder="Detailed session notes..."
                          className="min-h-[300px] mt-4"
                        />
                      ) : (
                        /* Read-only notes for players - only show if shared */
                        <>
                          {shareNotesWithPlayers ? (
                            <div className="prose prose-invert prose-sm max-w-none [&>h3]:mt-6 [&>h3:first-child]:mt-0 [&>h3]:mb-2 [&>h3]:text-base [&>h3]:font-semibold [&>ul]:mt-1 [&>ul]:mb-4 [&>p]:mb-4 mt-4">
                              {formData.notes ? (
                                <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(formData.notes) }} />
                              ) : (
                                <p className="text-[--text-tertiary] italic">No detailed notes available yet.</p>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-8 bg-white/[0.02] rounded-lg border border-[--border] mt-4">
                              <EyeOff className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                              <p className="text-gray-400 text-sm">The DM hasn&apos;t shared their session notes.</p>
                              <p className="text-gray-600 text-xs mt-1">
                                You can still add your own notes and read notes from other party members below.
                              </p>
                            </div>
                          )}
                        </>
                      )}

                      {/* Share with players checkbox - DM only */}
                      {can.editSession && !isNew && (
                        <div className="mt-4 pt-4 border-t border-white/[0.06]">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={shareNotesWithPlayers ?? false}
                              onChange={(e) => handleShareNotesChange(e.target.checked)}
                              className="w-4 h-4 rounded border-[--border] bg-[--bg-surface] text-[--arcane-purple] focus:ring-[--arcane-purple]/50"
                            />
                            <span className="text-sm text-gray-400">Share with players</span>
                            <span className="text-xs text-gray-600">(when session is open or locked)</span>
                          </label>
                        </div>
                      )}
                  </div>
                </div>
              </>
            )}

            {/* Expansion Preview - DM only */}
            {can.editSession && showExpandedPreview && (
              <div className="card p-6 mb-8 border-[--arcane-purple]/30 bg-[--arcane-purple]/5">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-[--arcane-purple]" />
                  <span className="text-lg font-semibold text-[--arcane-purple]">
                    {expanding ? 'Processing...' : 'Expansion Preview'}
                  </span>
                  {expanding && (
                    <Loader2 className="w-4 h-4 animate-spin text-[--arcane-purple]" />
                  )}
                </div>

                {/* Cleaned Summary Preview */}
                {pendingSummary && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-[--text-secondary] mb-2">Cleaned Summary:</h4>
                    <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                      <div
                        className="prose prose-invert prose-sm max-w-none [&>ul]:mt-1 [&>ul]:mb-2 [&>li]:my-0.5 text-[--text-secondary]"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(formatSummaryAsHtml(pendingSummary)) }}
                      />
                    </div>
                  </div>
                )}

                {/* Generated Title Preview */}
                {pendingTitle && !formData.title.trim() && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-[--text-secondary] mb-2">Suggested Title:</h4>
                    <div className="p-3 rounded-lg bg-[--arcane-gold]/5 border border-[--arcane-gold]/20">
                      <p className="text-base font-medium text-[--arcane-gold]">{pendingTitle}</p>
                    </div>
                  </div>
                )}

                {/* Detailed Notes Preview */}
                {pendingNotes && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-[--text-secondary] mb-2">Detailed Notes:</h4>
                    <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                      <div
                        className="prose prose-invert prose-sm max-w-none [&>h3]:mt-6 [&>h3:first-child]:mt-0 [&>h3]:mb-2 [&>h3]:text-base [&>h3]:font-semibold [&>ul]:mt-1 [&>ul]:mb-4 [&>p]:mb-4"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(pendingNotes) }}
                      />
                    </div>
                  </div>
                )}

                {/* Context Used */}
                {aiReasoning && (
                  <div className="mb-6 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                    <p className="text-xs text-[--text-tertiary] mb-1">Context Used:</p>
                    <p className="text-sm text-[--text-secondary] whitespace-pre-wrap">{aiReasoning}</p>
                  </div>
                )}

                {!expanding && (pendingNotes || pendingSummary) && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={acceptExpanded}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      Accept
                    </button>
                    <button
                      onClick={editExpanded}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[--arcane-purple]/10 border border-[--arcane-purple]/30 text-[--arcane-purple] hover:bg-[--arcane-purple]/20 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                      Accept & Edit
                    </button>
                    <button
                      onClick={declineExpanded}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Decline
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Attendance Section */}
            <div className="card p-6 mb-8">
              <div className="flex items-center gap-3 mb-4">
                <Users className="w-5 h-5 text-[--arcane-purple]" />
                <div>
                  <label className="text-lg font-semibold text-[--text-primary] block">
                    Attendance
                  </label>
                  <span className="text-sm text-[--text-tertiary]">
                    {can.editSession ? 'Who was present this session?' : 'Characters present this session'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {pcCharacters.map((char) => {
                  const isAttending = attendees.includes(char.id)
                  // Players see read-only display
                  if (!can.editSession) {
                    if (!isAttending) return null
                    return (
                      <div
                        key={char.id}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[--arcane-purple]/20 border border-[--arcane-purple]/50"
                      >
                        {char.image_url ? (
                          <Image
                            src={char.image_url}
                            alt={char.name}
                            width={24}
                            height={24}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-[--bg-elevated] flex items-center justify-center text-xs font-medium">
                            {getInitials(char.name)}
                          </div>
                        )}
                        <span className="text-sm font-medium text-white">{char.name}</span>
                      </div>
                    )
                  }
                  // DMs can toggle attendance
                  return (
                    <button
                      key={char.id}
                      onClick={() => toggleAttendee(char.id)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
                        isAttending
                          ? "bg-[--arcane-purple]/20 border-[--arcane-purple]/50 text-white"
                          : "border-white/10 text-[--text-secondary] hover:border-white/20"
                      )}
                    >
                      {char.image_url ? (
                        <Image
                          src={char.image_url}
                          alt={char.name}
                          width={24}
                          height={24}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-[--bg-elevated] flex items-center justify-center text-xs font-medium">
                          {getInitials(char.name)}
                        </div>
                      )}
                      <span className="text-sm font-medium">{char.name}</span>
                      {isAttending && (
                        <Check className="w-4 h-4 text-[--arcane-purple]" />
                      )}
                    </button>
                  )
                })}
                {!can.editSession && attendees.length === 0 && (
                  <p className="text-sm text-[--text-tertiary]">No attendance recorded.</p>
                )}
                {can.editSession && pcCharacters.length === 0 && (
                  <p className="text-sm text-[--text-tertiary]">No player characters in this campaign yet.</p>
                )}
              </div>
            </div>

            {/* Prep Notes from Planning - Only show if any modules have content */}
            {!isNew && session && isDm && (() => {
              const modulesWithContent = ALL_MODULES.filter(m => checkModuleHasContent(m, session))
              if (modulesWithContent.length === 0) return null

              return (
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-px flex-1 bg-[--border]" />
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prep Notes (from planning)
                    </span>
                    <div className="h-px flex-1 bg-[--border]" />
                  </div>

                  <div className="space-y-3">
                    {modulesWithContent.map((moduleId) => {
                      const config = MODULE_CONFIG[moduleId]
                      const Icon = config.icon
                      const isExpanded = expandedSections[moduleId as keyof typeof expandedSections]

                      // Get the content for display
                      let content: string | null = null
                      let displayContent: React.ReactNode = null

                      switch (moduleId) {
                        case 'checklist':
                          const checklist = (session.prep_checklist as unknown as Array<{id: string, text: string, checked: boolean}>) || []
                          const completedCount = checklist.filter(i => i.checked).length
                          displayContent = (
                            <div className="space-y-1.5">
                              {checklist.map(item => (
                                <div key={item.id} className={cn("flex items-center gap-2 text-sm", item.checked && "opacity-60")}>
                                  {item.checked ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                                  ) : (
                                    <div className="w-4 h-4 border border-gray-600 rounded flex-shrink-0" />
                                  )}
                                  <span className={item.checked ? "line-through text-gray-500" : "text-gray-300"}>{item.text}</span>
                                </div>
                              ))}
                            </div>
                          )
                          content = `${completedCount}/${checklist.length} completed`
                          break
                        case 'references':
                          const refs = session.pinned_references as unknown as Array<{label: string}> | null
                          if (refs && refs.length > 0) {
                            displayContent = (
                              <div className="text-sm text-gray-300 whitespace-pre-wrap">
                                {refs.map(r => r.label).join('\n')}
                              </div>
                            )
                            content = `${refs.length} items`
                          }
                          break
                        case 'session_goals':
                          content = session.session_goals || null
                          displayContent = <div className="text-sm text-gray-300 whitespace-pre-wrap">{content}</div>
                          break
                        case 'key_npcs':
                          const keyNpcsData = parseKeyNpcsValue(session.key_npcs as string | null)
                          const hasKeyNpcs = keyNpcsData.linkedCharacterIds.length > 0 || keyNpcsData.notes.trim().length > 0
                          content = hasKeyNpcs ? 'Has content' : null
                          displayContent = hasKeyNpcs ? (
                            <KeyNpcsModule
                              value={keyNpcsData}
                              onChange={() => {}}
                              characters={characters}
                              readOnly
                            />
                          ) : null
                          break
                        case 'session_opener':
                          content = session.session_opener || null
                          displayContent = <div className="text-sm text-gray-300 whitespace-pre-wrap">{content}</div>
                          break
                        case 'random_tables':
                          content = session.random_tables || null
                          displayContent = <div className="text-sm text-gray-300 whitespace-pre-wrap">{content}</div>
                          break
                        case 'music_ambiance':
                          content = session.music_ambiance || null
                          displayContent = <div className="text-sm text-gray-300 whitespace-pre-wrap">{content}</div>
                          break
                      }

                      return (
                        <div
                          key={moduleId}
                          className={cn(
                            "rounded-xl border transition-all",
                            config.bgColor,
                            config.borderColor
                          )}
                        >
                          <button
                            onClick={() => toggleSection(moduleId as keyof typeof expandedSections)}
                            className="w-full flex items-center gap-3 p-4 text-left"
                          >
                            {isExpanded ? (
                              <ChevronDown className={cn("w-4 h-4 flex-shrink-0", config.iconColor)} />
                            ) : (
                              <ChevronRight className={cn("w-4 h-4 flex-shrink-0", config.iconColor)} />
                            )}
                            <Icon className={cn("w-5 h-5 flex-shrink-0", config.iconColor)} />
                            <div className="flex-1 min-w-0">
                              <span className="font-medium text-white">{config.label}</span>
                              {!isExpanded && content && (
                                <p className="text-xs text-gray-500 mt-0.5 truncate">{
                                  moduleId === 'checklist' ? content : (content.length > 60 ? content.slice(0, 60) + '...' : content)
                                }</p>
                              )}
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="px-4 pb-4 border-t border-white/[0.05]">
                              <div className="pt-3">
                                {displayContent}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}

            {/* === OPTIONAL SECTIONS CARD === */}
            {!isNew && session && isDm && !sessionSettings?.all_optional_sections_hidden && (
              <div className="bg-[--bg-surface] rounded-xl overflow-hidden mb-8">
                {/* Section Header */}
                <div className="p-5 border-b border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-500/10">
                        <Layers className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">Additional Tools</h3>
                        <p className="text-sm text-[--text-tertiary]">
                          Optional sections to enhance your session records
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowCustomizeModal(true)}
                      className="text-sm text-gray-400 hover:text-purple-400 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/[0.05] border border-transparent hover:border-purple-500/20"
                      title="Customize layout"
                    >
                      <Layout className="w-4 h-4" />
                      Customize
                    </button>
                  </div>
                </div>

                {/* Optional Sections Content */}
                <div className="p-5 space-y-4">

            {/* Optional: DM Notes Section (Collapsible) */}
            {isDm &&
             !layoutPrefs.isSectionHidden('dm_notes') &&
             !layoutPrefs.isSectionDisabledByCampaign('dm_notes') && (
              <div className="bg-white/[0.02] rounded-lg overflow-hidden transition-all">
                <button
                  onClick={() => toggleSection('dmNotes')}
                  className="w-full p-4 flex items-center justify-between hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {expandedSections.dmNotes ? (
                      <ChevronDown className="w-4 h-4 text-[--text-tertiary]" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-[--text-tertiary]" />
                    )}
                    <EyeOff className="w-5 h-5 text-red-400/70" />
                    <div className="text-left">
                      <span className="font-medium text-[--text-primary] block">DM Notes</span>
                      <span className="text-xs text-[--text-tertiary]">
                        Private notes about this session - plot threads, player behaviors. Never visible to players.
                      </span>
                    </div>
                  </div>
                  {formData.dm_notes && (
                    <span className="text-xs text-[--text-tertiary] bg-white/[0.05] px-2 py-0.5 rounded">
                      Has content
                    </span>
                  )}
                </button>
                {expandedSections.dmNotes && (
                  <div className="px-4 pb-4 border-t border-white/[0.06]">
                    <DmNotesSection
                      dmNotes={formData.dm_notes}
                      onDmNotesChange={(notes) => setFormData({ ...formData, dm_notes: notes })}
                      showVisibilityToggle={false}
                      placeholder="Private notes about this session. Plot threads to follow up, player behaviors, etc."
                      collapsed={false}
                      hideHeader
                    />
                  </div>
                )}
              </div>
            )}

            {/* Optional: Session Content - Quests & Encounters (Collapsible) */}
            {!layoutPrefs.isSectionHidden('session_content') &&
             !layoutPrefs.isSectionDisabledByCampaign('session_content') && (
              <div className="bg-white/[0.02] rounded-lg overflow-hidden transition-all">
                <button
                  onClick={() => toggleSection('sessionContent')}
                  className="w-full p-4 flex items-center justify-between hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {expandedSections.sessionContent ? (
                      <ChevronDown className="w-4 h-4 text-[--text-tertiary]" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-[--text-tertiary]" />
                    )}
                    <ScrollText className="w-5 h-5 text-blue-400/70" />
                    <div className="text-left">
                      <span className="font-medium text-[--text-primary] block">Session Content</span>
                      <span className="text-xs text-[--text-tertiary]">
                        Add quests and encounters featured in this session. Campaign Intelligence can also detect these from your session notes, so you can focus on writing detailed recaps.
                      </span>
                    </div>
                  </div>
                </button>
                {expandedSections.sessionContent && (
                  <div className="px-4 pb-4 border-t border-white/[0.06]">
                    <SessionContent
                      sessionId={session.id}
                      campaignId={campaignId}
                      canEdit={can.editSession}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Optional: Player Notes Section (Collapsible) */}
            {!layoutPrefs.isSectionHidden('player_notes') &&
             !layoutPrefs.isSectionDisabledByCampaign('player_notes') && (
              <div className="bg-white/[0.02] rounded-lg overflow-hidden transition-all">
                <button
                  onClick={() => toggleSection('playerNotes')}
                  className="w-full p-4 flex items-center justify-between hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {expandedSections.playerNotes ? (
                      <ChevronDown className="w-4 h-4 text-[--text-tertiary]" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-[--text-tertiary]" />
                    )}
                    <MessageSquare className="w-5 h-5 text-green-400/70" />
                    <div className="text-left">
                      <span className="font-medium text-[--text-primary] block">Player Notes</span>
                      <span className="text-xs text-[--text-tertiary]">
                        Notes from players about this session from their character&apos;s perspective.
                      </span>
                    </div>
                  </div>
                </button>
                {expandedSections.playerNotes && (
                  <div className="px-4 pb-4 border-t border-white/[0.06]">
                    <PlayerNotes
                      sessionId={sessionId}
                      campaignId={campaignId}
                      characters={characters}
                      autoOpenAdd={openPlayerNotesModal}
                      onModalClose={() => setOpenPlayerNotesModal(false)}
                      sessionState={sessionState}
                    />
                  </div>
                )}
              </div>
            )}

                </div>
              </div>
            )}

            {/* Thoughts for Next Session - always visible for DMs on existing sessions */}
            {!isNew && session && isDm && (
              <div className="card p-6 mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <Lightbulb className="w-5 h-5 text-[--arcane-gold]" />
                  <div>
                    <label className="text-lg font-semibold text-[--text-primary] block">
                      Thoughts for Next Session
                    </label>
                    <span className="text-sm text-[--text-tertiary]">
                      Ideas for next session - loose threads, player interests to follow up on...
                    </span>
                  </div>
                </div>
                <ThoughtsForNextCard
                  campaignId={campaignId}
                  sessionId={session.id}
                  initialValue={session.thoughts_for_next || ''}
                  onSave={(value) => setSession({ ...session, thoughts_for_next: value })}
                  inline
                />
                <p className="text-xs text-[--text-tertiary] mt-3 flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-[--arcane-gold]" />
                  These notes will appear when you create your next session.
                </p>
              </div>
            )}

            {/* Create button for new sessions in Completed mode - DM only */}
            {isNew && isDm && (
              <div className="flex justify-end">
                <Button onClick={handleCreate} size="lg">
                  Create Session
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Customize Layout Modal */}
      <CustomizeLayoutModal
        isOpen={showCustomizeModal}
        onClose={() => setShowCustomizeModal(false)}
        sectionOrder={layoutPrefs.completedSectionOrder}
        hiddenSections={layoutPrefs.hiddenSections}
        onUpdateOrder={layoutPrefs.setCompletedSectionOrder}
        onToggleHidden={layoutPrefs.toggleSectionHidden}
        onReset={layoutPrefs.resetToDefaults}
      />
    </AppLayout>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Plus,
  Search,
  Calendar,
  FileText,
  Trash2,
  Users,
  ChevronDown,
  ChevronUp,
  Lock,
  Unlock,
  EyeOff,
  Loader2,
  ClipboardList,
  CheckCircle2,
  MessageSquare,
  Eye,
} from 'lucide-react'
import { Tooltip, sanitizeHtml, AccessDeniedPage, Modal } from '@/components/ui'
import { GuidanceTip } from '@/components/guidance/GuidanceTip'
import { AppLayout } from '@/components/layout'
import { BackToTopButton } from '@/components/ui/back-to-top'
import { SessionsPageMobile } from './page.mobile'
import { CharacterViewModal } from '@/components/character'
import { useSupabase, useUser, useIsMobile, usePermissions } from '@/hooks'
import { formatDate, cn, getInitials } from '@/lib/utils'
import { logActivity } from '@/lib/activity-log'
import Image from 'next/image'
import type { Campaign, Session, Character, Tag, CharacterTag, SessionState, SessionPhase } from '@/types/database'

// Convert basic markdown to HTML for display (or pass through if already HTML)
function markdownToHtml(text: string): string {
  // If already contains HTML list tags, pass through (it's already formatted)
  let html = text
  if (!text.includes('<ul>') && !text.includes('<li>') && !text.includes('<p>')) {
    html = text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br/>')
  }
  return sanitizeHtml(html)
}

interface NoteContributor {
  character_id: string | null
  character_name: string | null
  character_image: string | null
  user_id: string | null
  username: string | null
  user_avatar: string | null
}

interface SessionWithAttendees extends Session {
  attendees: Character[]
  noteContributors?: NoteContributor[]
}

export default function SessionsPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = useSupabase()
  const { user } = useUser()
  const isMobile = useIsMobile()

  const campaignId = params.id as string

  // Permissions
  const { can, loading: permissionsLoading, isMember, isOwner, isDm } = usePermissions(campaignId)

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [sessions, setSessions] = useState<SessionWithAttendees[]>([])
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Character preview modal state
  const [viewingCharacter, setViewingCharacter] = useState<Character | null>(null)
  const [characterTags, setCharacterTags] = useState<(CharacterTag & { tag: Tag; related_character?: Character | null })[]>([])

  // Expanded session notes state
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState<SessionWithAttendees | null>(null)
  const [deleting, setDeleting] = useState(false)

  const toggleExpanded = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  useEffect(() => {
    if (user && campaignId) {
      loadData()
    }
  }, [user, campaignId])

  const loadData = async () => {
    // Only show loading spinner on initial load, not refetches
    if (!hasLoadedOnce) {
      setLoading(true)
    }

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

    // Load all characters for the campaign
    const { data: charactersData } = await supabase
      .from('characters')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('name')

    setCharacters(charactersData || [])

    // Load sessions
    const { data: sessionsData } = await supabase
      .from('sessions')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('date', { ascending: false })

    if (sessionsData && sessionsData.length > 0) {
      // Load all session_characters for this campaign's sessions
      const sessionIds = sessionsData.map(s => s.id)
      const { data: sessionCharacters } = await supabase
        .from('session_characters')
        .select('session_id, character_id')
        .in('session_id', sessionIds)

      // Load player notes for all sessions to get contributors
      const { data: playerNotes } = await supabase
        .from('player_session_notes')
        .select(`
          session_id,
          character_id,
          added_by_user_id,
          character:characters(id, name, image_url),
          added_by_user:user_settings!player_session_notes_added_by_user_id_fkey(user_id, username, avatar_url)
        `)
        .in('session_id', sessionIds)
        .eq('is_shared_with_party', true)

      // Group player notes by session and deduplicate contributors
      const notesBySession = new Map<string, NoteContributor[]>()
      playerNotes?.forEach(note => {
        const contributors = notesBySession.get(note.session_id) || []
        // Only add if not already present (deduplicate by character or user)
        const key = note.character_id || note.added_by_user_id
        if (!contributors.find(c => (c.character_id || c.user_id) === key)) {
          contributors.push({
            character_id: note.character_id,
            character_name: (note.character as any)?.name || null,
            character_image: (note.character as any)?.image_url || null,
            user_id: note.added_by_user_id,
            username: (note.added_by_user as any)?.username || null,
            user_avatar: (note.added_by_user as any)?.avatar_url || null,
          })
        }
        notesBySession.set(note.session_id, contributors)
      })

      // Map attendees and note contributors to each session
      const sessionsWithAttendees = sessionsData.map(session => ({
        ...session,
        attendees: sessionCharacters
          ?.filter(sc => sc.session_id === session.id)
          .map(sc => charactersData?.find(c => c.id === sc.character_id))
          .filter(Boolean) as Character[] || [],
        noteContributors: notesBySession.get(session.id) || [],
      }))

      setSessions(sessionsWithAttendees)
    } else {
      setSessions([])
    }

    setLoading(false)
    setHasLoadedOnce(true)
  }

  // Filter sessions: players only see open/locked sessions, DMs see all
  const visibleSessions = sessions.filter((session) => {
    // DMs see all sessions
    if (isDm) return true
    // Players only see open or locked sessions (not private)
    const state = (session.state as SessionState) || 'private'
    return state === 'open' || state === 'locked'
  })

  const filteredSessions = visibleSessions.filter((session) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      session.title?.toLowerCase().includes(query) ||
      session.summary?.toLowerCase().includes(query) ||
      session.notes?.toLowerCase().includes(query)
    )
  })

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const session = sessions.find(s => s.id === id)
    if (session) {
      setSessionToDelete(session)
      setShowDeleteModal(true)
    }
  }

  const confirmDelete = async () => {
    if (!sessionToDelete) return

    setDeleting(true)
    try {
      await supabase.from('sessions').delete().eq('id', sessionToDelete.id)
      setSessions(sessions.filter((s) => s.id !== sessionToDelete.id))

      // Log activity
      if (user) {
        await logActivity(supabase, user.id, {
          action: 'session.delete',
          entity_type: 'session',
          entity_id: sessionToDelete.id,
          entity_name: `Session ${sessionToDelete.session_number}: ${sessionToDelete.title || 'Untitled'}`,
          metadata: {
            campaign_id: campaignId,
            campaign_name: campaign?.name,
            session_number: sessionToDelete.session_number,
          },
        })
      }

      setShowDeleteModal(false)
      setSessionToDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  const handleSessionClick = (session: SessionWithAttendees) => {
    router.push(`/campaigns/${campaignId}/sessions/${session.id}`)
  }

  const handleCharacterClick = async (character: Character) => {
    // Load character tags for the view modal
    const { data: tagsData } = await supabase
      .from('character_tags')
      .select(`
        *,
        tag:tags(*),
        related_character:characters!character_tags_related_character_id_fkey(*)
      `)
      .eq('character_id', character.id)

    setCharacterTags(tagsData || [])
    setViewingCharacter(character)
  }

  // Mobile Layout
  if (isMobile) {
    return (
      <SessionsPageMobile
        campaignId={campaignId}
        loading={loading}
        sessions={sessions}
        filteredSessions={filteredSessions}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        expandedIds={expandedIds}
        toggleExpanded={toggleExpanded}
        viewingCharacter={viewingCharacter}
        setViewingCharacter={setViewingCharacter}
        characterTags={characterTags}
        handleSessionClick={handleSessionClick}
        handleCharacterClick={handleCharacterClick}
        handleDelete={handleDelete}
        isDm={isDm}
      />
    )
  }

  // Navigate to create session
  const handleAddSession = () => {
    router.push(`/campaigns/${campaignId}/sessions/new`)
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

  // Permission check - must be a member with view permission
  if (!isMember || !can.viewSessions) {
    return (
      <AppLayout campaignId={campaignId}>
        <AccessDeniedPage
          campaignId={campaignId}
          message="You don't have permission to view sessions for this campaign."
        />
      </AppLayout>
    )
  }

  return (
    <AppLayout campaignId={campaignId}>
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* First-time guidance */}
        <GuidanceTip
          tipId="campaign_sessions_intro"
          title="Session Notes Power Your Campaign"
          description="Document your sessions with detailed notes. Campaign Intelligence uses these notes to suggest timeline events, detect new NPCs, and track relationships automatically."
          variant="banner"
          showOnce
        />

        {/* Search and Add Session Button */}
        <div className="flex items-center gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[--text-tertiary]" />
            <input
              type="text"
              className="form-input pl-12"
              style={{ paddingLeft: '48px' }}
              placeholder="Search sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {can.addSession && (
            <button
              onClick={handleAddSession}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Session
            </button>
          )}
        </div>

        {/* Sessions List */}
        {filteredSessions.length === 0 ? (
          <div className="empty-state">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-purple-500/10 flex items-center justify-center">
              <FileText className="w-8 h-8 text-purple-400" />
            </div>
            <h2 className="empty-state-title">
              {searchQuery ? 'No matching sessions' : 'Record Your Adventures'}
            </h2>
            <p className="empty-state-description">
              {searchQuery
                ? 'Try a different search term'
                : 'Document each session to track your campaign story. Add summaries, attendees, and detailed notes.'}
            </p>
            {!searchQuery && (
              <>
                <p className="text-xs text-purple-400/80 mt-3 max-w-md italic">
                  Session notes power Campaign Intelligence - add detailed notes to get timeline events, NPC suggestions, and relationship tracking.
                </p>
                {can.addSession && (
                  <div className="mt-6">
                    <button
                      onClick={handleAddSession}
                      className="btn btn-primary flex items-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      Add Session
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {filteredSessions.map((session, index) => {
              const phase = (session.phase as SessionPhase) || 'completed'
              const state = (session.state as SessionState) || 'private'
              const isPrep = phase === 'prep'
              const hasSummary = !!session.summary?.trim()
              const hasNotes = !!session.notes?.trim()
              const isEnhancedMode = hasSummary && hasNotes
              const dmNotesShared = session.share_notes_with_players !== false
              const canSeeDmContent = isDm || dmNotesShared
              const hasPlayerPerspectives = session.noteContributors && session.noteContributors.length > 0

              // For prep sessions, check prep content
              const prepChecklist = (session.prep_checklist as Array<{ checked: boolean }>) || []
              const checklistDone = prepChecklist.filter(i => i.checked).length
              const hasSessionGoals = !!session.session_goals?.trim()
              const hasSessionOpener = !!session.session_opener?.trim()

              return (
                <div
                  key={session.id}
                  className={cn(
                    "rounded-xl cursor-pointer animate-slide-in-up transition-all duration-200 border-l-4",
                    isPrep ? "border-l-yellow-500/50" : "border-l-purple-500/50"
                  )}
                  style={{
                    animationDelay: `${index * 50}ms`,
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  }}
                  onClick={() => handleSessionClick(session)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4)'
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)'
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'
                  }}
                >
                  <div className="p-6">
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Phase Badge - Primary indicator */}
                        {isPrep ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
                            <ClipboardList className="w-3.5 h-3.5" />
                            Prep
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-purple-500/15 text-purple-400 border border-purple-500/30">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Done
                          </span>
                        )}

                        {/* Session Number */}
                        <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white/5 text-gray-400">
                          #{session.session_number}
                        </span>

                        {/* Date */}
                        <span className="text-sm text-[--text-tertiary] flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          {formatDate(session.date)}
                        </span>

                        {/* State Badge */}
                        {state === 'private' && (
                          <span className="flex items-center gap-1 text-xs text-gray-400 bg-gray-500/10 px-2 py-0.5 rounded">
                            <EyeOff className="w-3 h-3" />
                            Private
                          </span>
                        )}
                        {state === 'open' && (
                          <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded">
                            <Unlock className="w-3 h-3" />
                            {isDm ? 'Open' : 'Open for notes'}
                          </span>
                        )}
                        {state === 'locked' && (
                          <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                            <Lock className="w-3 h-3" />
                            Locked
                          </span>
                        )}
                      </div>

                      {can.deleteSession && (
                        <button
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-[--arcane-ember] hover:bg-[--arcane-ember]/10 transition-colors flex-shrink-0"
                          onClick={(e) => handleDelete(session.id, e)}
                          title="Delete session"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-semibold text-[--text-primary] mb-4">
                      {session.title || 'Untitled Session'}
                    </h3>

                    {/* Content Sections */}
                    <div className="space-y-4">
                      {/* PREP PHASE: Show prep status */}
                      {isPrep && isDm && (
                        <div className="p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                          <div className="flex items-center gap-2 mb-3">
                            <ClipboardList className="w-4 h-4 text-yellow-400" />
                            <span className="text-sm font-medium text-yellow-400">Prep Status</span>
                          </div>
                          <div className="space-y-1.5 text-sm text-gray-400">
                            {prepChecklist.length > 0 && (
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className={cn("w-4 h-4", checklistDone === prepChecklist.length ? "text-green-400" : "text-gray-500")} />
                                <span>Checklist: {checklistDone}/{prepChecklist.length} done</span>
                              </div>
                            )}
                            {hasSessionGoals && (
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                                <span>Session goals set</span>
                              </div>
                            )}
                            {hasSessionOpener && (
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                                <span>Session opener ready</span>
                              </div>
                            )}
                            {prepChecklist.length === 0 && !hasSessionGoals && !hasSessionOpener && (
                              <span className="text-gray-500 italic">No prep content yet</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* COMPLETED PHASE: DM Notes Section - only show if visible and has content */}
                      {!isPrep && canSeeDmContent && (hasSummary || hasNotes) && (
                        <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                          {/* Section header with share indicator for DM */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-blue-400" />
                              <span className="text-sm font-medium text-gray-300">
                                {isEnhancedMode ? 'Quick Recap' : 'Session Notes'}
                              </span>
                            </div>
                            {isDm && (
                              <span className={cn(
                                "flex items-center gap-1 text-xs px-2 py-0.5 rounded",
                                dmNotesShared ? "text-green-400 bg-green-500/10" : "text-gray-500 bg-gray-500/10"
                              )}>
                                {dmNotesShared ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                {dmNotesShared ? 'Shared' : 'Hidden'}
                              </span>
                            )}
                          </div>

                          {/* Content - handle Standard vs Enhanced */}
                          {isEnhancedMode ? (
                            <>
                              {/* Enhanced: Show summary */}
                              <div
                                className="prose prose-invert prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-5 [&>ul]:mt-1 [&>ul]:mb-2 [&_li]:my-0.5 [&>p]:mb-2 text-[--text-secondary]"
                                dangerouslySetInnerHTML={{ __html: markdownToHtml(session.summary!) }}
                              />
                              {/* Toggle for detailed notes */}
                              <button
                                onClick={(e) => toggleExpanded(session.id, e)}
                                className="flex items-center gap-2 mt-3 text-sm text-[--arcane-purple] hover:text-[--arcane-purple]/80 transition-colors"
                              >
                                {expandedIds.has(session.id) ? (
                                  <>
                                    <ChevronUp className="w-4 h-4" />
                                    Hide detailed notes
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="w-4 h-4" />
                                    Show detailed notes
                                  </>
                                )}
                              </button>
                              {expandedIds.has(session.id) && (
                                <div className="mt-3 pt-3 border-t border-white/[0.06]">
                                  <div
                                    className="prose prose-invert prose-sm max-w-none [&>h3]:mt-6 [&>h3:first-child]:mt-0 [&>h3]:mb-2 [&>h3]:text-base [&>h3]:font-semibold [&>ul]:mt-1 [&>ul]:mb-4 [&>p]:mb-4"
                                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(session.notes!) }}
                                  />
                                </div>
                              )}
                            </>
                          ) : hasNotes ? (
                            <>
                              {/* Standard: Show notes directly */}
                              <div
                                className={cn(
                                  "prose prose-invert prose-sm max-w-none [&>h3]:mt-6 [&>h3:first-child]:mt-0 [&>h3]:mb-2 [&>h3]:text-base [&>h3]:font-semibold [&>ul]:mt-1 [&>ul]:mb-4 [&>p]:mb-4",
                                  !expandedIds.has(session.id) && "line-clamp-4"
                                )}
                                dangerouslySetInnerHTML={{ __html: sanitizeHtml(session.notes!) }}
                              />
                              {session.notes!.length > 300 && (
                                <button
                                  onClick={(e) => toggleExpanded(session.id, e)}
                                  className="flex items-center gap-2 mt-3 text-sm text-[--arcane-purple] hover:text-[--arcane-purple]/80 transition-colors"
                                >
                                  {expandedIds.has(session.id) ? (
                                    <>
                                      <ChevronUp className="w-4 h-4" />
                                      Show less
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="w-4 h-4" />
                                      Show more
                                    </>
                                  )}
                                </button>
                              )}
                            </>
                          ) : (
                            /* Edge case: Only summary exists */
                            <div
                              className="prose prose-invert prose-sm max-w-none text-[--text-secondary]"
                              dangerouslySetInnerHTML={{ __html: markdownToHtml(session.summary!) }}
                            />
                          )}
                        </div>
                      )}

                      {/* Player Perspectives Section */}
                      {hasPlayerPerspectives && (
                        <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
                          <div className="flex items-center gap-2 mb-3">
                            <MessageSquare className="w-4 h-4 text-blue-400" />
                            <span className="text-sm font-medium text-blue-400">
                              Player Perspectives ({session.noteContributors!.length})
                            </span>
                          </div>
                          <div className="space-y-2">
                            {session.noteContributors!.slice(0, 2).map((contributor, idx) => {
                              const displayName = contributor.character_name || contributor.username || 'Player'
                              const avatarUrl = contributor.character_image || contributor.user_avatar
                              return (
                                <div key={contributor.character_id || contributor.user_id || idx} className="flex items-start gap-2">
                                  {avatarUrl ? (
                                    <Image
                                      src={avatarUrl}
                                      alt={displayName}
                                      width={24}
                                      height={24}
                                      className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                                    />
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 font-medium text-[10px] flex-shrink-0">
                                      {getInitials(displayName)}
                                    </div>
                                  )}
                                  <span className="text-sm text-gray-400">
                                    <span className="text-gray-300 font-medium">{displayName}:</span>{' '}
                                    <span className="line-clamp-1">Added their perspective</span>
                                  </span>
                                </div>
                              )
                            })}
                            {session.noteContributors!.length > 2 && (
                              <span className="text-xs text-blue-400/70">
                                +{session.noteContributors!.length - 2} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer: Attendees */}
                    {session.attendees.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-white/[0.06]">
                        <div className="flex items-center gap-3">
                          <Tooltip content="Session Attendees" side="top" delay={200}>
                            <Users className="w-4 h-4 text-[--text-tertiary]" />
                          </Tooltip>
                          <div className="flex -space-x-2">
                            {session.attendees.slice(0, 6).map((char) => (
                              <Tooltip key={char.id} content={char.name} side="top" delay={200}>
                                <div
                                  className="relative w-7 h-7 rounded-full overflow-hidden hover:z-10 hover:scale-110 transition-transform cursor-pointer"
                                  style={{
                                    border: '2px solid #12121a',
                                    backgroundColor: '#1a1a24',
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleCharacterClick(char)
                                  }}
                                >
                                  {char.image_url ? (
                                    <Image
                                      src={char.image_url}
                                      alt={char.name}
                                      fill
                                      className="object-cover"
                                      sizes="28px"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-[--text-tertiary]">
                                      {getInitials(char.name)}
                                    </div>
                                  )}
                                </div>
                              </Tooltip>
                            ))}
                            {session.attendees.length > 6 && (
                              <Tooltip content={`${session.attendees.length - 6} more attendees`} side="top">
                                <div
                                  className="relative w-7 h-7 rounded-full flex items-center justify-center"
                                  style={{
                                    border: '2px solid #12121a',
                                    backgroundColor: '#1a1a24',
                                  }}
                                >
                                  <span className="text-[9px] font-bold text-[--text-tertiary]">
                                    +{session.attendees.length - 6}
                                  </span>
                                </div>
                              </Tooltip>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {session.attendees.length} {session.attendees.length === 1 ? 'attendee' : 'attendees'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Character View Modal */}
        {viewingCharacter && (
          <CharacterViewModal
            character={viewingCharacter}
            tags={characterTags}
            onEdit={() => {
              // Could navigate to character editor if needed
              setViewingCharacter(null)
            }}
            onClose={() => setViewingCharacter(null)}
          />
        )}
      </div>
      <BackToTopButton />

      {/* Delete Session Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setSessionToDelete(null)
        }}
        title="Delete Session"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-[--text-secondary]">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-[--text-primary]">
              Session {sessionToDelete?.session_number}: {sessionToDelete?.title || 'Untitled'}
            </span>
            ? This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => {
                setShowDeleteModal(false)
                setSessionToDelete(null)
              }}
              className="px-4 py-2 text-sm font-medium text-[--text-secondary] bg-[--bg-elevated] border border-[--border] rounded-lg hover:bg-[--bg-hover] transition-colors"
              disabled={deleting}
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              disabled={deleting}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {deleting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete Session
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}

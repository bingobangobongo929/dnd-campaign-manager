'use client'

import { useState } from 'react'
import {
  Plus,
  Search,
  Calendar,
  FileText,
  Trash2,
  Users,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  CheckCircle2,
  Lock,
  Unlock,
  EyeOff,
  Loader2,
  MessageSquare,
  Eye,
} from 'lucide-react'
import { sanitizeHtml } from '@/components/ui'
import { AppLayout } from '@/components/layout/app-layout'
import { MobileLayout, MobileBottomSheet } from '@/components/mobile'
import { CharacterViewModal } from '@/components/character'
import { formatDate, getInitials } from '@/lib/utils'
import Image from 'next/image'
import type { Campaign, Session, Character, Tag, CharacterTag, SessionState, SessionPhase } from '@/types/database'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

// Convert basic markdown to HTML for display
function markdownToHtml(text: string): string {
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

export interface SessionsPageMobileProps {
  campaignId: string
  loading: boolean
  sessions: SessionWithAttendees[]
  filteredSessions: SessionWithAttendees[]
  searchQuery: string
  setSearchQuery: (query: string) => void
  expandedIds: Set<string>
  toggleExpanded: (id: string, e: React.MouseEvent) => void
  viewingCharacter: Character | null
  setViewingCharacter: (char: Character | null) => void
  characterTags: (CharacterTag & { tag: Tag; related_character?: Character | null })[]
  handleSessionClick: (session: SessionWithAttendees) => void
  handleCharacterClick: (character: Character) => void
  handleDelete: (id: string, e: React.MouseEvent) => void
  isDm?: boolean
}

export function SessionsPageMobile({
  campaignId,
  loading,
  filteredSessions,
  searchQuery,
  setSearchQuery,
  expandedIds,
  toggleExpanded,
  viewingCharacter,
  setViewingCharacter,
  characterTags,
  handleSessionClick,
  handleCharacterClick,
  handleDelete,
  isDm = false,
}: SessionsPageMobileProps) {
  const router = useRouter()
  const [showCreateSheet, setShowCreateSheet] = useState(false)

  const handleCreateSession = (phase: 'prep' | 'completed') => {
    router.push(`/campaigns/${campaignId}/sessions/new?phase=${phase}`)
    setShowCreateSheet(false)
  }
  if (loading) {
    return (
      <AppLayout campaignId={campaignId}>
        <MobileLayout title="Sessions" showBackButton backHref={`/campaigns/${campaignId}/canvas`}>
          <div className="flex items-center justify-center h-[60vh]">
            <Loader2 className="w-10 h-10 animate-spin text-[--arcane-purple]" />
          </div>
        </MobileLayout>
      </AppLayout>
    )
  }

  return (
    <AppLayout campaignId={campaignId}>
      <MobileLayout
        title="Sessions"
        showBackButton
        backHref={`/campaigns/${campaignId}/canvas`}
        actions={
          <button
            onClick={() => setShowCreateSheet(true)}
            className="p-2 rounded-lg bg-[--arcane-purple] text-white active:bg-[--arcane-purple]/80"
          >
            <Plus className="w-5 h-5" />
          </button>
        }
      >
        <div className="px-4 pb-24">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[--arcane-purple]/50"
              placeholder="Search sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Sessions List */}
          {filteredSessions.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                <FileText className="w-8 h-8 text-purple-400" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">
                {searchQuery ? 'No matching sessions' : 'Record Your Adventures'}
              </h2>
              <p className="text-sm text-gray-400 mb-6 max-w-xs mx-auto">
                {searchQuery ? 'Try a different search' : 'Document each session to track your campaign story'}
              </p>
              {!searchQuery && (
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => handleCreateSession('prep')}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-xl active:bg-yellow-500/20 font-medium"
                  >
                    <ClipboardList className="w-5 h-5" />
                    Plan Session
                  </button>
                  <button
                    onClick={() => handleCreateSession('completed')}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded-xl active:bg-purple-500/20 font-medium"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Add Recap
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSessions.map((session) => {
                const phase = (session.phase as SessionPhase) || 'completed'
                const state = (session.state as SessionState) || 'private'
                const isPrep = phase === 'prep'
                const hasSummary = !!session.summary?.trim()
                const hasNotes = !!session.notes?.trim()
                const isEnhancedMode = hasSummary && hasNotes
                const dmNotesShared = session.share_notes_with_players !== false
                const canSeeDmContent = isDm || dmNotesShared
                const hasPlayerPerspectives = session.noteContributors && session.noteContributors.length > 0


                return (
                  <div
                    key={session.id}
                    className={cn(
                      "bg-white/[0.04] rounded-xl border border-white/[0.06] overflow-hidden active:bg-white/[0.06] transition-colors border-l-4",
                      isPrep ? "border-l-yellow-500/50" : "border-l-purple-500/50"
                    )}
                    onClick={() => handleSessionClick(session)}
                  >
                    <div className="p-4">
                      {/* Header row */}
                      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                        {/* Phase Badge */}
                        {isPrep ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
                            <ClipboardList className="w-3 h-3" />
                            Prep
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded bg-purple-500/15 text-purple-400 border border-purple-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            Done
                          </span>
                        )}

                        {/* Session Number */}
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-white/5 text-gray-400">
                          #{session.session_number}
                        </span>

                        {/* Date */}
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(session.date)}
                        </span>

                        {/* State Badge */}
                        {state === 'private' && (
                          <span className="flex items-center gap-1 text-[10px] text-gray-400 bg-gray-500/10 px-1.5 py-0.5 rounded">
                            <EyeOff className="w-2.5 h-2.5" />
                          </span>
                        )}
                        {state === 'open' && (
                          <span className="flex items-center gap-1 text-[10px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">
                            <Unlock className="w-2.5 h-2.5" />
                          </span>
                        )}
                        {state === 'locked' && (
                          <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                            <Lock className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-base font-semibold text-white mb-3">
                        {session.title || 'Untitled Session'}
                      </h3>

                      {/* Content Sections */}
                      <div className="space-y-3">
                        {/* PREP PHASE: Simple indicator - the phase badge is the main indicator */}
                        {isPrep && isDm && !hasSummary && !hasNotes && (
                          <div className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                            <div className="flex items-center gap-2 text-yellow-400/70">
                              <ClipboardList className="w-3.5 h-3.5" />
                              <span className="text-xs">Tap to continue planning</span>
                            </div>
                          </div>
                        )}

                        {/* COMPLETED PHASE: DM Notes Section - only show if visible and has content */}
                        {!isPrep && canSeeDmContent && (hasSummary || hasNotes) && (
                          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                            {/* Section header */}
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-blue-400" />
                                <span className="text-xs font-medium text-gray-400">
                                  {isEnhancedMode ? 'Recap' : 'Notes'}
                                </span>
                              </div>
                              {isDm && (
                                <span className={cn(
                                  "flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded",
                                  dmNotesShared ? "text-green-400 bg-green-500/10" : "text-gray-500 bg-gray-500/10"
                                )}>
                                  {dmNotesShared ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                                </span>
                              )}
                            </div>

                            {/* Content */}
                            {isEnhancedMode ? (
                              <>
                                <div
                                  className="text-sm text-gray-400 line-clamp-3"
                                  dangerouslySetInnerHTML={{ __html: markdownToHtml(session.summary!) }}
                                />
                                <button
                                  onClick={(e) => toggleExpanded(session.id, e)}
                                  className="flex items-center gap-1 mt-2 text-xs text-[--arcane-purple] active:opacity-70"
                                >
                                  {expandedIds.has(session.id) ? (
                                    <>
                                      <ChevronUp className="w-3.5 h-3.5" />
                                      Hide details
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="w-3.5 h-3.5" />
                                      Show details
                                    </>
                                  )}
                                </button>
                                {expandedIds.has(session.id) && (
                                  <div className="mt-2 pt-2 border-t border-white/[0.04]">
                                    <div
                                      className="prose prose-invert prose-sm max-w-none text-gray-400"
                                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(session.notes!) }}
                                    />
                                  </div>
                                )}
                              </>
                            ) : hasNotes ? (
                              <>
                                <div
                                  className={cn(
                                    "prose prose-invert prose-sm max-w-none text-gray-400",
                                    !expandedIds.has(session.id) && "line-clamp-3"
                                  )}
                                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(session.notes!) }}
                                />
                                {session.notes!.length > 200 && (
                                  <button
                                    onClick={(e) => toggleExpanded(session.id, e)}
                                    className="flex items-center gap-1 mt-2 text-xs text-[--arcane-purple] active:opacity-70"
                                  >
                                    {expandedIds.has(session.id) ? (
                                      <>
                                        <ChevronUp className="w-3.5 h-3.5" />
                                        Less
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="w-3.5 h-3.5" />
                                        More
                                      </>
                                    )}
                                  </button>
                                )}
                              </>
                            ) : (
                              <div
                                className="text-sm text-gray-400 line-clamp-3"
                                dangerouslySetInnerHTML={{ __html: markdownToHtml(session.summary!) }}
                              />
                            )}
                          </div>
                        )}

                        {/* Player Perspectives */}
                        {hasPlayerPerspectives && (
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
                            <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                            <span className="text-xs text-blue-400">
                              {session.noteContributors!.length} player {session.noteContributors!.length === 1 ? 'perspective' : 'perspectives'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Footer: Attendees + Delete */}
                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/[0.06]">
                        {/* Attendees */}
                        {session.attendees.length > 0 ? (
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-gray-500" />
                            <div className="flex -space-x-1.5">
                              {session.attendees.slice(0, 4).map((char) => (
                                <div
                                  key={char.id}
                                  className="w-6 h-6 rounded-full overflow-hidden border-2 border-[#12121a] bg-[#1a1a24]"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleCharacterClick(char)
                                  }}
                                >
                                  {char.image_url ? (
                                    <Image
                                      src={char.image_url}
                                      alt={char.name}
                                      width={24}
                                      height={24}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-gray-500">
                                      {getInitials(char.name)}
                                    </div>
                                  )}
                                </div>
                              ))}
                              {session.attendees.length > 4 && (
                                <div className="w-6 h-6 rounded-full border-2 border-[#12121a] bg-[#1a1a24] flex items-center justify-center">
                                  <span className="text-[8px] font-bold text-gray-500">
                                    +{session.attendees.length - 4}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-600">No attendees</div>
                        )}

                        {/* Delete button */}
                        {isDm && (
                          <button
                            onClick={(e) => handleDelete(session.id, e)}
                            className="p-2 rounded-lg text-red-400 active:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Create Session Sheet */}
        <MobileBottomSheet
          isOpen={showCreateSheet}
          onClose={() => setShowCreateSheet(false)}
          title="New Session"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-400 text-center">
              What would you like to do?
            </p>
            <button
              onClick={() => handleCreateSession('prep')}
              className="w-full flex items-center gap-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl active:bg-yellow-500/20"
            >
              <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="text-left">
                <div className="font-medium text-white">Plan Session</div>
                <div className="text-xs text-gray-400">Prepare for an upcoming game</div>
              </div>
            </button>
            <button
              onClick={() => handleCreateSession('completed')}
              className="w-full flex items-center gap-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl active:bg-purple-500/20"
            >
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-purple-400" />
              </div>
              <div className="text-left">
                <div className="font-medium text-white">Add Recap</div>
                <div className="text-xs text-gray-400">Record a session that happened</div>
              </div>
            </button>
            <button
              onClick={() => setShowCreateSheet(false)}
              className="w-full py-3 rounded-xl bg-white/[0.04] text-gray-400 font-medium active:bg-white/[0.08]"
            >
              Cancel
            </button>
          </div>
        </MobileBottomSheet>

        {/* Character View Modal */}
        {viewingCharacter && (
          <CharacterViewModal
            character={viewingCharacter}
            tags={characterTags}
            onEdit={() => setViewingCharacter(null)}
            onClose={() => setViewingCharacter(null)}
          />
        )}
      </MobileLayout>
    </AppLayout>
  )
}

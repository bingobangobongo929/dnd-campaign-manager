'use client'

import { useState } from 'react'
import {
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
  ScrollText,
  AlertTriangle,
  RefreshCw,
  ClipboardList,
  CheckCircle2,
  Lightbulb,
  Lock,
  Unlock,
  EyeOff,
} from 'lucide-react'
import { sanitizeHtml } from '@/components/ui'
import { RichTextEditor } from '@/components/editor'
import { AppLayout } from '@/components/layout/app-layout'
import { MobileLayout } from '@/components/mobile'
import { SessionWorkflow, PlayerNotes, ThoughtsForNextCard } from '@/components/sessions'
import { cn, getInitials } from '@/lib/utils'
import Image from 'next/image'
import type { Character, Session, Campaign, SessionPhase, SessionState } from '@/types/database'

export interface SessionDetailMobileProps {
  campaignId: string
  sessionId: string
  isNew: boolean
  loading: boolean
  formData: {
    session_number: number | string | null
    title: string
    date: string
    summary: string
    notes: string
  }
  setFormData: React.Dispatch<React.SetStateAction<any>>
  status: string // Matches SaveStatus type which includes 'idle' | 'saving' | 'saved' | 'error' | 'conflict'
  hasConflict: boolean
  attendees: string[]
  toggleAttendee: (id: string) => void
  characters: Character[]
  pcCharacters: Character[]
  showExpandedPreview: boolean
  expanding: boolean
  pendingSummary: string | null
  pendingTitle: string | null
  pendingNotes: string | null
  detailedNotesCollapsed: boolean
  setDetailedNotesCollapsed: (collapsed: boolean) => void
  handleCreate: () => void
  handleExpandNotes: () => void
  acceptExpanded: () => void
  editExpanded: () => void
  declineExpanded: () => void
  formatSummaryAsHtml: (summary: string) => string
  showEnhancedView: boolean
  // Props for SessionWorkflow and PlayerNotes
  session: Session | null
  campaign: Campaign | null
  userId: string
  onSessionUpdate: (session: Session) => void
  // Phase-related props
  currentPhase: SessionPhase
  handlePhaseChange: (phase: SessionPhase) => void
  locations: { id: string; name: string; type?: string }[]
  quests: { id: string; name: string; type: string; status: string }[]
  encounters: { id: string; name: string; type: string; status: string; difficulty?: string }[]
  previousSession: Session | null
  previousThoughts: string
  // Permission props
  isDm: boolean
  canEditSession: boolean
  // Session state props
  sessionState: SessionState
  handleStateChange: (state: SessionState) => void
  shareNotesWithPlayers: boolean | null
  handleShareNotesChange: (share: boolean) => void
}

export function SessionDetailMobile({
  campaignId,
  sessionId,
  isNew,
  loading,
  formData,
  setFormData,
  status,
  hasConflict,
  attendees,
  toggleAttendee,
  characters,
  pcCharacters,
  showExpandedPreview,
  expanding,
  pendingSummary,
  pendingTitle,
  pendingNotes,
  detailedNotesCollapsed,
  setDetailedNotesCollapsed,
  handleCreate,
  handleExpandNotes,
  acceptExpanded,
  editExpanded,
  declineExpanded,
  formatSummaryAsHtml,
  showEnhancedView,
  session,
  campaign,
  userId,
  onSessionUpdate,
  // Phase-related props
  currentPhase,
  handlePhaseChange,
  locations,
  quests,
  encounters,
  previousSession,
  previousThoughts,
  // Permission props
  isDm,
  canEditSession,
  // Session state props
  sessionState,
  handleStateChange,
  shareNotesWithPlayers,
  handleShareNotesChange,
}: SessionDetailMobileProps) {
  // Note: isDm and canEditSession come from the parent component's usePermissions hook
  const [openPlayerNotesModal, setOpenPlayerNotesModal] = useState(false)

  if (loading) {
    return (
      <AppLayout campaignId={campaignId}>
        <MobileLayout title={isNew ? 'New Session' : `Session ${formData.session_number || ''}`} showBackButton backHref={`/campaigns/${campaignId}/sessions`}>
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
        title={isNew ? 'New Session' : `Session ${formData.session_number || ''}`}
        showBackButton
        backHref={`/campaigns/${campaignId}/sessions`}
        actions={
          isNew && isDm ? (
            <button
              onClick={handleCreate}
              disabled={!formData.summary.trim()}
              className="px-3 py-1.5 text-sm font-medium bg-[--arcane-purple] text-white rounded-lg active:bg-[--arcane-purple]/80 disabled:opacity-50"
            >
              Create
            </button>
          ) : canEditSession ? (
            <span className={cn(
              "text-xs",
              status === 'saving' ? 'text-gray-400' : status === 'conflict' ? 'text-amber-400' : 'text-gray-500'
            )}>
              {status === 'saving' ? 'Saving...' : status === 'conflict' ? 'Conflict!' : 'Saved'}
            </span>
          ) : null
        }
      >
        <div className="px-4 pb-24">
          {/* Conflict Warning - Only show for editors */}
          {canEditSession && hasConflict && (
            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium text-amber-400">Modified elsewhere</span>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-3 py-2 bg-amber-500 text-black text-sm font-medium rounded-lg active:bg-amber-400 w-full justify-center"
              >
                <RefreshCw className="w-4 h-4" />
                Reload
              </button>
            </div>
          )}

          {/* Title & Date */}
          <div className="mb-4">
            {canEditSession ? (
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full text-xl font-semibold bg-transparent border-none text-white placeholder-gray-500 focus:outline-none mb-2"
                placeholder="Session title..."
              />
            ) : (
              <h1 className="text-xl font-semibold text-white mb-2">
                {formData.title || `Session ${formData.session_number}`}
              </h1>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              {canEditSession ? (
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="bg-transparent border-none text-sm text-gray-400 focus:outline-none"
                  style={{ colorScheme: 'dark' }}
                />
              ) : (
                <span className="text-sm text-gray-400">
                  {formData.date ? new Date(formData.date).toLocaleDateString() : 'No date'}
                </span>
              )}
            </div>
          </div>

          {/* Phase Toggle Bar - Mobile Optimized - DM only (2-phase: Prep/Completed) */}
          {isDm && (
            <div className="mb-4 p-1 bg-white/[0.03] rounded-xl border border-white/[0.08]">
              <div className="grid grid-cols-2 gap-1">
                {/* Prep Phase */}
                <button
                  onClick={() => handlePhaseChange('prep')}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg transition-all",
                    currentPhase === 'prep'
                      ? "bg-yellow-500/20 border border-yellow-500/50"
                      : "border border-transparent active:bg-white/[0.04]"
                  )}
                >
                  <ClipboardList className={cn(
                    "w-5 h-5",
                    currentPhase === 'prep' ? "text-yellow-400" : "text-gray-500"
                  )} />
                  <span className={cn(
                    "text-xs font-semibold",
                    currentPhase === 'prep' ? "text-yellow-400" : "text-gray-400"
                  )}>
                    Prep
                  </span>
                </button>

                {/* Completed Phase */}
                <button
                  onClick={() => handlePhaseChange('completed')}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg transition-all",
                    currentPhase === 'completed'
                      ? "bg-purple-500/20 border border-purple-500/50"
                      : "border border-transparent active:bg-white/[0.04]"
                  )}
                >
                  <CheckCircle2 className={cn(
                    "w-5 h-5",
                    currentPhase === 'completed' ? "text-purple-400" : "text-gray-500"
                  )} />
                  <span className={cn(
                    "text-xs font-semibold",
                    currentPhase === 'completed' ? "text-purple-400" : "text-gray-400"
                  )}>
                    Completed
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* === PREP PHASE LAYOUT === (DM only) */}
          {isDm && currentPhase === 'prep' && (
            <>
              {/* Thoughts from Previous Session */}
              {previousThoughts && (
                <div className="mb-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium text-purple-300">From Previous Session</span>
                  </div>
                  <p className="text-sm text-gray-300 whitespace-pre-wrap">{previousThoughts}</p>
                </div>
              )}

              {/* Session Workflow for Prep mode */}
              {!isNew && session && isDm && (
                <div className="mb-4 p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                  <SessionWorkflow
                    session={session}
                    campaignId={campaignId}
                    characters={characters}
                    locations={locations}
                    quests={quests}
                    encounters={encounters}
                    previousSession={previousSession}
                    onUpdate={onSessionUpdate}
                  />
                </div>
              )}

              {/* Create button for new sessions in Prep mode */}
              {isNew && (
                <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <ClipboardList className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm font-medium text-white">Session Planning</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">
                    You&apos;re in prep mode. Create the session to start planning.
                  </p>
                  <button
                    onClick={handleCreate}
                    className="w-full py-2.5 bg-yellow-500 text-black rounded-lg font-medium active:bg-yellow-400"
                  >
                    Create Session
                  </button>
                </div>
              )}
            </>
          )}

          {/* === COMPLETED PHASE LAYOUT === (shown for all users, players always see this) */}
          {(currentPhase === 'completed' || !isDm) && (
            <>
              {/* Session State Dropdown - DM only, for existing sessions */}
              {isDm && !isNew && session && (
                <div className="mb-4 p-3 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-400">Session Status</span>
                    <div className="relative">
                      <select
                        value={sessionState}
                        onChange={(e) => handleStateChange(e.target.value as SessionState)}
                        className={cn(
                          "appearance-none pl-7 pr-8 py-1.5 rounded-lg border text-xs font-medium cursor-pointer",
                          "bg-[#0a0a0f] focus:outline-none",
                          sessionState === 'private' && "text-gray-400 border-gray-600",
                          sessionState === 'open' && "text-green-400 border-green-500/30",
                          sessionState === 'locked' && "text-amber-400 border-amber-500/30"
                        )}
                      >
                        <option value="private">Private</option>
                        <option value="open">Open</option>
                        <option value="locked">Locked</option>
                      </select>
                      <div className="absolute left-2 top-1/2 -translate-y-1/2">
                        {sessionState === 'private' && <EyeOff className="w-3.5 h-3.5 text-gray-500" />}
                        {sessionState === 'open' && <Unlock className="w-3.5 h-3.5 text-green-400" />}
                        {sessionState === 'locked' && <Lock className="w-3.5 h-3.5 text-amber-400" />}
                      </div>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-600 mt-1.5">
                    {sessionState === 'private' && 'Players cannot see this session'}
                    {sessionState === 'open' && 'Players can view and add notes'}
                    {sessionState === 'locked' && 'Finalized, read-only'}
                  </p>
                </div>
              )}

              {/* Thoughts from Previous Session (for new completed sessions - DM only) */}
              {isDm && isNew && previousThoughts && (
                <div className="mb-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium text-purple-300">From Previous Session</span>
                  </div>
                  <p className="text-sm text-gray-300 whitespace-pre-wrap">{previousThoughts}</p>
                </div>
              )}

              {/* Summary Section */}
              <div className="mb-4 p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-white">Summary</span>
                  {canEditSession && showEnhancedView && !showExpandedPreview && (
                    <button
                      onClick={handleExpandNotes}
                      disabled={!formData.summary.trim() || expanding}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-[--arcane-purple]/10 text-[--arcane-purple] rounded-lg active:bg-[--arcane-purple]/20 disabled:opacity-50"
                    >
                      {expanding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                      Expand
                    </button>
                  )}
                </div>
                {canEditSession ? (
                  <RichTextEditor
                    content={formData.summary}
                    onChange={(content) => setFormData({ ...formData, summary: content })}
                    placeholder="Bullet points of what happened..."
                    className="min-h-[150px]"
                  />
                ) : (
                  /* Read-only summary for players */
                  <div className="prose prose-invert prose-sm max-w-none">
                    {formData.summary ? (
                      <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(formData.summary) }} />
                    ) : (
                      <p className="text-gray-500 italic">No summary available yet.</p>
                    )}
                  </div>
                )}

                {/* Share with players checkbox - DM only */}
                {canEditSession && !isNew && (
                  <div className="mt-3 pt-3 border-t border-white/[0.06]">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={shareNotesWithPlayers ?? false}
                        onChange={(e) => handleShareNotesChange(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-xs text-gray-400">Share with players</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Expansion Preview - DM only */}
              {canEditSession && showExpandedPreview && (
                <div className="mb-4 p-4 bg-[--arcane-purple]/5 rounded-xl border border-[--arcane-purple]/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-[--arcane-purple]" />
                    <span className="text-sm font-medium text-[--arcane-purple]">
                      {expanding ? 'Processing...' : 'Preview'}
                    </span>
                    {expanding && <Loader2 className="w-3 h-3 animate-spin text-[--arcane-purple]" />}
                  </div>

                  {pendingSummary && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1">Cleaned Summary:</p>
                      <div className="p-2 rounded-lg bg-white/[0.02] text-sm text-gray-300" dangerouslySetInnerHTML={{ __html: sanitizeHtml(formatSummaryAsHtml(pendingSummary)) }} />
                    </div>
                  )}

                  {pendingTitle && !formData.title.trim() && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1">Suggested Title:</p>
                      <p className="p-2 rounded-lg bg-[--arcane-gold]/5 text-sm font-medium text-[--arcane-gold]">{pendingTitle}</p>
                    </div>
                  )}

                  {pendingNotes && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1">Detailed Notes:</p>
                      <div className="p-2 rounded-lg bg-white/[0.02] text-sm text-gray-300 prose prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(pendingNotes) }} />
                    </div>
                  )}

                  {!expanding && (pendingNotes || pendingSummary) && (
                    <div className="flex gap-2">
                      <button onClick={acceptExpanded} className="flex-1 py-2 rounded-lg bg-green-500/10 text-green-400 text-sm font-medium active:bg-green-500/20">
                        <Check className="w-4 h-4 inline mr-1" />Accept
                      </button>
                      <button onClick={editExpanded} className="flex-1 py-2 rounded-lg bg-[--arcane-purple]/10 text-[--arcane-purple] text-sm font-medium active:bg-[--arcane-purple]/20">
                        <Pencil className="w-4 h-4 inline mr-1" />Edit
                      </button>
                      <button onClick={declineExpanded} className="py-2 px-3 rounded-lg bg-red-500/10 text-red-400 text-sm font-medium active:bg-red-500/20">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Attendance */}
              <div className="mb-4 p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-[--arcane-purple]" />
                  <span className="text-sm font-medium text-white">Attendance</span>
                  <span className="text-xs text-gray-500">({attendees.length})</span>
                </div>

                {/* PCs */}
                {pcCharacters.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Player Characters</p>
                    <div className="flex flex-wrap gap-2">
                      {pcCharacters.map((char) => {
                        const isAttending = attendees.includes(char.id)
                        // Players see read-only display (only attending characters)
                        if (!canEditSession) {
                          if (!isAttending) return null
                          return (
                            <div
                              key={char.id}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[--arcane-purple]/20 border border-[--arcane-purple]"
                            >
                              <div className="w-5 h-5 rounded-full overflow-hidden bg-[--bg-surface] flex-shrink-0">
                                {char.image_url ? (
                                  <Image src={char.image_url} alt={char.name} width={20} height={20} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[8px] font-bold">{getInitials(char.name)}</div>
                                )}
                              </div>
                              <span className="text-xs font-medium text-white">{char.name}</span>
                            </div>
                          )
                        }
                        // DMs can toggle attendance
                        return (
                          <button
                            key={char.id}
                            onClick={() => toggleAttendee(char.id)}
                            className={cn(
                              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors',
                              isAttending
                                ? 'bg-[--arcane-purple]/20 border-[--arcane-purple] text-white'
                                : 'bg-transparent border-white/10 text-gray-400 opacity-60'
                            )}
                          >
                            <div className="w-5 h-5 rounded-full overflow-hidden bg-[--bg-surface] flex-shrink-0">
                              {char.image_url ? (
                                <Image src={char.image_url} alt={char.name} width={20} height={20} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[8px] font-bold">{getInitials(char.name)}</div>
                              )}
                            </div>
                            <span className="text-xs font-medium">{char.name}</span>
                            {isAttending && <Check className="w-3 h-3 text-[--arcane-purple]" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {!canEditSession && attendees.length === 0 && (
                  <p className="text-xs text-gray-500 text-center py-2">No attendance recorded</p>
                )}
                {canEditSession && pcCharacters.length === 0 && (
                  <p className="text-xs text-gray-500 text-center py-2">No characters yet</p>
                )}
              </div>

              {/* Detailed Notes Section */}
              {(formData.notes || (!detailedNotesCollapsed && canEditSession)) && (
                <div className="mb-4 p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                  {canEditSession ? (
                    /* DM can toggle and edit */
                    <>
                      <button
                        onClick={() => setDetailedNotesCollapsed(!detailedNotesCollapsed)}
                        className="w-full flex items-center justify-between mb-3"
                      >
                        <div className="flex items-center gap-2">
                          <ScrollText className="w-4 h-4 text-[--arcane-purple]" />
                          <span className="text-sm font-medium text-white">Detailed Notes</span>
                        </div>
                        {detailedNotesCollapsed ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronUp className="w-4 h-4 text-gray-500" />}
                      </button>

                      {!detailedNotesCollapsed && (
                        <RichTextEditor
                          content={formData.notes}
                          onChange={(content) => setFormData({ ...formData, notes: content })}
                          placeholder="Detailed notes..."
                          className="min-h-[200px]"
                        />
                      )}
                    </>
                  ) : (
                    /* Players see read-only view */
                    <>
                      <div className="flex items-center gap-2 mb-3">
                        <ScrollText className="w-4 h-4 text-[--arcane-purple]" />
                        <span className="text-sm font-medium text-white">Detailed Notes</span>
                      </div>
                      <div className="prose prose-invert prose-sm max-w-none">
                        <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(formData.notes) }} />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Thoughts for Next - Standalone card for Completed mode - DM only */}
              {!isNew && session && isDm && (
                <ThoughtsForNextCard
                  campaignId={campaignId}
                  sessionId={session.id}
                  initialValue={session.thoughts_for_next || ''}
                  onSave={(value) => onSessionUpdate({ ...session, thoughts_for_next: value })}
                />
              )}

              {/* Player Notes Section */}
              {!isNew && session && (
                <div className="mb-4 p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                  <PlayerNotes
                    sessionId={sessionId}
                    campaignId={campaignId}
                    characters={characters}
                    autoOpenAdd={openPlayerNotesModal}
                    onModalClose={() => setOpenPlayerNotesModal(false)}
                  />
                </div>
              )}

              {/* Create button for new sessions in Completed mode - DM only */}
              {isNew && isDm && (
                <button
                  onClick={handleCreate}
                  disabled={!formData.summary.trim()}
                  className="w-full py-3 bg-[--arcane-purple] text-white rounded-xl font-medium active:bg-[--arcane-purple]/80 disabled:opacity-50"
                >
                  Create Session
                </button>
              )}
            </>
          )}
        </div>
      </MobileLayout>
    </AppLayout>
  )
}

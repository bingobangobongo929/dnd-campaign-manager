'use client'

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
} from 'lucide-react'
import { sanitizeHtml } from '@/components/ui'
import { RichTextEditor } from '@/components/editor'
import { AppLayout } from '@/components/layout/app-layout'
import { MobileLayout } from '@/components/mobile'
import { cn, getInitials } from '@/lib/utils'
import Image from 'next/image'
import type { Character } from '@/types/database'

export interface SessionDetailMobileProps {
  campaignId: string
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
  npcCharacters: Character[]
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
  canUseAI: boolean
}

export function SessionDetailMobile({
  campaignId,
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
  npcCharacters,
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
  canUseAI,
}: SessionDetailMobileProps) {
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
          isNew ? (
            <button
              onClick={handleCreate}
              disabled={!formData.summary.trim()}
              className="px-3 py-1.5 text-sm font-medium bg-[--arcane-purple] text-white rounded-lg active:bg-[--arcane-purple]/80 disabled:opacity-50"
            >
              Create
            </button>
          ) : (
            <span className={cn(
              "text-xs",
              status === 'saving' ? 'text-gray-400' : status === 'conflict' ? 'text-amber-400' : 'text-gray-500'
            )}>
              {status === 'saving' ? 'Saving...' : status === 'conflict' ? 'Conflict!' : 'Saved'}
            </span>
          )
        }
      >
        <div className="px-4 pb-24">
          {/* Conflict Warning */}
          {hasConflict && (
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
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full text-xl font-semibold bg-transparent border-none text-white placeholder-gray-500 focus:outline-none mb-2"
              placeholder="Session title..."
            />
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="bg-transparent border-none text-sm text-gray-400 focus:outline-none"
                style={{ colorScheme: 'dark' }}
              />
            </div>
          </div>

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

            {/* NPCs */}
            {npcCharacters.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">NPCs</p>
                <div className="flex flex-wrap gap-2">
                  {npcCharacters.map((char) => {
                    const isAttending = attendees.includes(char.id)
                    return (
                      <button
                        key={char.id}
                        onClick={() => toggleAttendee(char.id)}
                        className={cn(
                          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors',
                          isAttending
                            ? 'bg-[--arcane-gold]/20 border-[--arcane-gold] text-white'
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
                        {isAttending && <Check className="w-3 h-3 text-[--arcane-gold]" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {characters.length === 0 && (
              <p className="text-xs text-gray-500 text-center py-2">No characters yet</p>
            )}
          </div>

          {/* Summary Section */}
          <div className="mb-4 p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-white">Summary</span>
              {canUseAI && !showExpandedPreview && (
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
            <RichTextEditor
              content={formData.summary}
              onChange={(content) => setFormData({ ...formData, summary: content })}
              placeholder="Bullet points of what happened..."
              className="min-h-[150px]"
            />
          </div>

          {/* AI Expansion Preview */}
          {showExpandedPreview && (
            <div className="mb-4 p-4 bg-[--arcane-purple]/5 rounded-xl border border-[--arcane-purple]/30">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-[--arcane-purple]" />
                <span className="text-sm font-medium text-[--arcane-purple]">
                  {expanding ? 'Processing...' : 'AI Preview'}
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

          {/* Detailed Notes Section */}
          {(formData.notes || !detailedNotesCollapsed) && (
            <div className="mb-4 p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
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
            </div>
          )}

          {/* Create button for new sessions */}
          {isNew && (
            <button
              onClick={handleCreate}
              disabled={!formData.summary.trim()}
              className="w-full py-3 bg-[--arcane-purple] text-white rounded-xl font-medium active:bg-[--arcane-purple]/80 disabled:opacity-50"
            >
              Create Session
            </button>
          )}
        </div>
      </MobileLayout>
    </AppLayout>
  )
}

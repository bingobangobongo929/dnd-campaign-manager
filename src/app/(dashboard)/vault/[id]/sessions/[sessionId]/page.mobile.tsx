'use client'

import {
  Sparkles,
  Loader2,
  Check,
  X,
  Pencil,
  Brain,
  ChevronDown,
  ChevronUp,
  Wand2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { MobileLayout } from '@/components/mobile'
import { Button, Input, sanitizeHtml } from '@/components/ui'
import { RichTextEditor } from '@/components/editor'
import { PartyMemberSelector } from '@/components/sessions'
import type { VaultCharacter } from '@/types/database'

export interface VaultSessionEditorMobileProps {
  characterId: string
  isNew: boolean
  character: VaultCharacter | null
  loading: boolean
  formData: {
    session_number: string
    session_date: string
    title: string
    campaign_name: string
    summary: string
    notes: string
  }
  setFormData: React.Dispatch<React.SetStateAction<{
    session_number: string
    session_date: string
    title: string
    campaign_name: string
    summary: string
    notes: string
  }>>
  status: string
  hasConflict: boolean
  expanding: boolean
  showExpandedPreview: boolean
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
  formatSummaryAsHtml: (text: string) => string
  onNavigate: (path: string) => void
  canUseAI: boolean
  hasPartyMembers: boolean
  selectedAttendees: string[]
  onAttendeesChange: (ids: string[]) => void
}

export function VaultSessionEditorMobile({
  characterId,
  isNew,
  character,
  loading,
  formData,
  setFormData,
  status,
  hasConflict,
  expanding,
  showExpandedPreview,
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
  onNavigate,
  canUseAI,
  hasPartyMembers,
  selectedAttendees,
  onAttendeesChange,
}: VaultSessionEditorMobileProps) {
  if (loading) {
    return (
      <AppLayout characterId={characterId}>
        <MobileLayout title={isNew ? 'New Session' : 'Edit Session'} showBackButton backHref={`/vault/${characterId}/sessions`}>
          <div className="flex items-center justify-center h-[60vh]">
            <div className="w-10 h-10 border-2 border-[--arcane-purple] border-t-transparent rounded-full spinner" />
          </div>
        </MobileLayout>
      </AppLayout>
    )
  }

  return (
    <AppLayout characterId={characterId}>
      <MobileLayout
        title={isNew ? 'New Session' : `Session ${formData.session_number || '?'}`}
        showBackButton
        backHref={`/vault/${characterId}/sessions`}
        actions={
          <div className="flex items-center gap-2">
            {!isNew && (
              <span className="text-xs text-gray-500">
                {status === 'saving' && 'Saving...'}
                {status === 'saved' && 'Saved'}
                {status === 'idle' && 'Saved'}
              </span>
            )}
            {isNew && (
              <button
                onClick={handleCreate}
                className="px-3 py-1.5 rounded-lg bg-[--arcane-purple] text-white text-sm font-medium active:bg-[--arcane-purple]/80"
              >
                Create
              </button>
            )}
          </div>
        }
      >
        <div className="px-4 pb-24">
          {/* Conflict Warning */}
          {hasConflict && (
            <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium text-amber-400">Modified elsewhere</span>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-1 text-xs text-amber-400 active:text-amber-300"
              >
                <RefreshCw className="w-3 h-3" />
                Reload
              </button>
            </div>
          )}

          {/* Character Context */}
          {character && (
            <p className="text-xs text-gray-500 mb-4">
              <span className="text-[--arcane-purple]">{character.name}</span>
              <span className="mx-2">/</span>
              <span>Play Journal</span>
            </p>
          )}

          {/* Session Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-1 text-xs font-semibold rounded bg-[--arcane-purple]/10 text-[--arcane-purple]">
                #{formData.session_number || '?'}
              </span>
              <Input
                type="date"
                value={formData.session_date}
                onChange={(e) => setFormData({ ...formData, session_date: e.target.value })}
                className="h-7 px-2 py-0 text-xs border-none bg-white/5 rounded"
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="text-lg font-semibold border-none bg-transparent px-0 h-auto focus:ring-0 placeholder:text-gray-600"
              placeholder="Session title..."
            />
          </div>

          {/* Party Members Present */}
          {hasPartyMembers && (
            <div className="mb-6">
              <PartyMemberSelector
                characterId={characterId}
                selectedIds={selectedAttendees}
                onChange={onAttendeesChange}
                label="Party Members Present"
              />
            </div>
          )}

          {/* Summary Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <label className="text-base font-semibold text-white block">Summary</label>
                <span className="text-xs text-gray-500">Bullet points of what happened</span>
              </div>
              {canUseAI && !showExpandedPreview && (
                <button
                  onClick={handleExpandNotes}
                  disabled={!formData.summary.trim() || expanding}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[--arcane-gold]/10 border border-[--arcane-gold]/30 text-[--arcane-gold] text-xs font-medium active:bg-[--arcane-gold]/20 disabled:opacity-50"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  {expanding ? 'Expanding...' : 'Expand'}
                </button>
              )}
            </div>
            <RichTextEditor
              content={formData.summary}
              onChange={(content) => setFormData({ ...formData, summary: content })}
              placeholder="Write your session summary..."
              className="min-h-[180px]"
            />
          </div>

          {/* AI Preview Panel */}
          {showExpandedPreview && (
            <div className="mb-6 p-4 rounded-xl bg-[--arcane-purple]/5 border border-[--arcane-purple]/30">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-[--arcane-purple]" />
                <span className="text-sm font-semibold text-[--arcane-purple]">
                  {expanding ? 'Processing...' : 'AI Preview'}
                </span>
                {expanding && <Loader2 className="w-3 h-3 animate-spin text-[--arcane-purple]" />}
              </div>

              {pendingSummary && (
                <div className="mb-4">
                  <h4 className="text-xs font-medium text-gray-500 mb-1">Cleaned Summary:</h4>
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] text-sm text-gray-300"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(formatSummaryAsHtml(pendingSummary)) }}
                  />
                </div>
              )}

              {pendingTitle && !formData.title.trim() && (
                <div className="mb-4">
                  <h4 className="text-xs font-medium text-gray-500 mb-1">Suggested Title:</h4>
                  <p className="text-sm font-medium text-[--arcane-gold]">{pendingTitle}</p>
                </div>
              )}

              {pendingNotes && (
                <div className="mb-4">
                  <h4 className="text-xs font-medium text-gray-500 mb-1">Detailed Notes:</h4>
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] prose prose-invert prose-sm max-w-none text-gray-300"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(pendingNotes) }}
                  />
                </div>
              )}

              {!expanding && (pendingNotes || pendingSummary) && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={acceptExpanded}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-medium active:bg-green-500/20"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Accept
                  </button>
                  <button
                    onClick={editExpanded}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[--arcane-purple]/10 border border-[--arcane-purple]/30 text-[--arcane-purple] text-xs font-medium active:bg-[--arcane-purple]/20"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={declineExpanded}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium active:bg-red-500/20"
                  >
                    <X className="w-3.5 h-3.5" />
                    Decline
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Detailed Notes Section */}
          {formData.notes && !showExpandedPreview && (
            <div className="mb-6">
              <button
                onClick={() => setDetailedNotesCollapsed(!detailedNotesCollapsed)}
                className="w-full flex items-center justify-between mb-3"
              >
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-[--arcane-purple]" />
                  <span className="text-base font-semibold text-white">Detailed Notes</span>
                </div>
                {detailedNotesCollapsed ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                )}
              </button>

              {!detailedNotesCollapsed && (
                <RichTextEditor
                  content={formData.notes}
                  onChange={(content) => setFormData({ ...formData, notes: content })}
                  placeholder="Detailed session notes..."
                  className="min-h-[200px]"
                />
              )}
            </div>
          )}

          {/* Create button at bottom for new sessions */}
          {isNew && (
            <div className="mt-6">
              <button
                onClick={handleCreate}
                className="w-full py-3 rounded-xl bg-[--arcane-purple] text-white font-medium active:bg-[--arcane-purple]/80"
              >
                Create Session
              </button>
            </div>
          )}
        </div>
      </MobileLayout>
    </AppLayout>
  )
}

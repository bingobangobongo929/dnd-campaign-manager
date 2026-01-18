'use client'

import {
  Plus,
  Search,
  Calendar,
  FileText,
  Trash2,
  Users,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { sanitizeHtml } from '@/components/ui'
import { AppLayout } from '@/components/layout/app-layout'
import { MobileLayout, MobileBottomSheet } from '@/components/mobile'
import { CharacterViewModal } from '@/components/character'
import { formatDate, getInitials } from '@/lib/utils'
import Image from 'next/image'
import type { Campaign, Session, Character, Tag, CharacterTag } from '@/types/database'

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

interface SessionWithAttendees extends Session {
  attendees: Character[]
}

export interface SessionsPageMobileProps {
  campaignId: string
  loading: boolean
  sessions: SessionWithAttendees[]
  filteredSessions: SessionWithAttendees[]
  searchQuery: string
  setSearchQuery: (query: string) => void
  isCreateModalOpen: boolean
  setIsCreateModalOpen: (open: boolean) => void
  formData: {
    title: string
    date: string
    summary: string
  }
  setFormData: React.Dispatch<React.SetStateAction<{ title: string; date: string; summary: string }>>
  saving: boolean
  expandedIds: Set<string>
  toggleExpanded: (id: string, e: React.MouseEvent) => void
  viewingCharacter: Character | null
  setViewingCharacter: (char: Character | null) => void
  characterTags: (CharacterTag & { tag: Tag; related_character?: Character | null })[]
  handleSessionClick: (session: SessionWithAttendees) => void
  handleCharacterClick: (character: Character) => void
  handleDelete: (id: string, e: React.MouseEvent) => void
  handleCreate: () => void
}

export function SessionsPageMobile({
  campaignId,
  loading,
  filteredSessions,
  searchQuery,
  setSearchQuery,
  isCreateModalOpen,
  setIsCreateModalOpen,
  formData,
  setFormData,
  saving,
  expandedIds,
  toggleExpanded,
  viewingCharacter,
  setViewingCharacter,
  characterTags,
  handleSessionClick,
  handleCharacterClick,
  handleDelete,
  handleCreate,
}: SessionsPageMobileProps) {
  if (loading) {
    return (
      <AppLayout campaignId={campaignId}>
        <MobileLayout title="Sessions" showBackButton backHref={`/campaigns/${campaignId}/canvas`}>
          <div className="flex items-center justify-center h-[60vh]">
            <div className="w-10 h-10 border-2 border-[--arcane-purple] border-t-transparent rounded-full spinner" />
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
            onClick={() => setIsCreateModalOpen(true)}
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
            <div className="text-center py-16">
              <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-white mb-2">
                {searchQuery ? 'No matching sessions' : 'No sessions yet'}
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                {searchQuery ? 'Try a different search' : 'Record your first adventure'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-3 bg-[--arcane-purple] text-white rounded-xl active:bg-[--arcane-purple]/80 font-medium"
                >
                  <Plus className="w-5 h-5" />
                  Create Session
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-white/[0.04] rounded-xl border border-white/[0.06] overflow-hidden active:bg-white/[0.06] transition-colors"
                  onClick={() => handleSessionClick(session)}
                >
                  <div className="p-4">
                    {/* Header row */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 text-[10px] font-bold rounded bg-purple-500/20 text-purple-400 uppercase">
                        #{session.session_number}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(session.date)}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-semibold text-white mb-2">
                      {session.title || 'Untitled Session'}
                    </h3>

                    {/* Summary preview */}
                    {session.summary && (
                      <div
                        className="text-sm text-gray-400 line-clamp-2 mb-3"
                        dangerouslySetInnerHTML={{ __html: markdownToHtml(session.summary) }}
                      />
                    )}

                    {/* Expandable notes */}
                    {session.notes && (
                      <>
                        <button
                          onClick={(e) => toggleExpanded(session.id, e)}
                          className="flex items-center gap-1 text-xs text-[--arcane-purple] mb-3 active:opacity-70"
                        >
                          {expandedIds.has(session.id) ? (
                            <>
                              <ChevronUp className="w-4 h-4" />
                              Hide notes
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4" />
                              Show notes
                            </>
                          )}
                        </button>

                        {expandedIds.has(session.id) && (
                          <div className="mb-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                            <div
                              className="prose prose-invert prose-sm max-w-none text-gray-400"
                              dangerouslySetInnerHTML={{ __html: sanitizeHtml(session.notes) }}
                            />
                          </div>
                        )}
                      </>
                    )}

                    {/* Footer: Attendees + Delete */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
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
                      <button
                        onClick={(e) => handleDelete(session.id, e)}
                        className="p-2 rounded-lg text-red-400 active:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Session Sheet */}
        <MobileBottomSheet
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false)
            setFormData({
              title: '',
              date: new Date().toISOString().split('T')[0],
              summary: '',
            })
          }}
          title="New Session"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Title</label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[--arcane-purple]/50"
                placeholder="e.g., The Journey Begins"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Date</label>
              <input
                type="date"
                className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-[--arcane-purple]/50"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Summary (optional)</label>
              <textarea
                className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[--arcane-purple]/50 resize-none"
                placeholder="Brief summary..."
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="flex-1 py-3 rounded-xl bg-white/[0.04] text-gray-300 font-medium active:bg-white/[0.08]"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!formData.title.trim() || saving}
                className="flex-1 py-3 rounded-xl bg-[--arcane-purple] text-white font-medium active:bg-[--arcane-purple]/80 disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create'}
              </button>
            </div>
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

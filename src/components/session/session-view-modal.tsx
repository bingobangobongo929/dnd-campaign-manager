'use client'

import { X, Pencil, Calendar, Users } from 'lucide-react'
import { cn, formatDate, getInitials } from '@/lib/utils'
import Image from 'next/image'
import type { Session, Character } from '@/types/database'

interface SessionViewModalProps {
  session: Session
  attendees: Character[]
  onEdit: () => void
  onClose: () => void
  onCharacterClick?: (character: Character) => void
}

export function SessionViewModal({
  session,
  attendees,
  onEdit,
  onClose,
  onCharacterClick,
}: SessionViewModalProps) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="session-view-modal relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          className="absolute top-5 right-5 btn btn-ghost btn-icon z-10"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="p-6 border-b border-[--border] bg-[--bg-elevated] rounded-t-2xl">
          <div className="flex items-start gap-4">
            {/* Session Number Badge */}
            <div className="w-16 h-16 rounded-xl bg-[--arcane-purple]/10 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-display font-bold text-[--arcane-purple]">
                {session.session_number}
              </span>
            </div>

            <div className="flex-1 min-w-0 pr-10">
              <div className="flex items-center gap-3 mb-2">
                <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[--arcane-purple]/10 text-[--arcane-purple]">
                  Session {session.session_number}
                </span>
                <span className="text-sm text-[--text-tertiary] flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {formatDate(session.date)}
                </span>
              </div>
              <h2 className="text-2xl font-display font-semibold text-[--text-primary] mb-2">
                {session.title || 'Untitled Session'}
              </h2>
              {session.summary && (
                <p className="text-[--text-secondary] leading-relaxed">
                  {session.summary}
                </p>
              )}

              {/* Attendees */}
              {attendees.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-[--text-tertiary]" />
                    <span className="text-sm text-[--text-tertiary]">
                      {attendees.length} attendee{attendees.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {attendees.map((char) => (
                      <button
                        key={char.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          onCharacterClick?.(char)
                        }}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[--bg-surface] border border-[--border] hover:border-[--arcane-purple]/50 transition-all group"
                      >
                        <div className="relative w-6 h-6 rounded-full overflow-hidden bg-[--bg-elevated] flex-shrink-0">
                          {char.image_url ? (
                            <Image
                              src={char.image_url}
                              alt={char.name}
                              fill
                              className="object-cover"
                              sizes="24px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] font-medium text-[--text-secondary]">
                              {getInitials(char.name)}
                            </div>
                          )}
                        </div>
                        <span className="text-sm text-[--text-secondary] group-hover:text-[--text-primary] transition-colors">
                          {char.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Body: Notes */}
        <div className="p-6 max-h-[50vh] overflow-y-auto">
          {session.notes ? (
            <div>
              <h3 className="text-sm font-semibold text-[--text-tertiary] uppercase tracking-wide mb-3">
                Session Notes
              </h3>
              <div
                className="prose prose-invert prose-sm max-w-none text-[--text-secondary]"
                dangerouslySetInnerHTML={{ __html: session.notes }}
              />
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-[--text-tertiary]">
                No detailed notes yet.
              </p>
              <button
                className="btn btn-secondary mt-4"
                onClick={onEdit}
              >
                <Pencil className="w-4 h-4" />
                Add Notes
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[--border]">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-primary" onClick={onEdit}>
            <Pencil className="w-4 h-4" />
            Edit Session
          </button>
        </div>
      </div>
    </div>
  )
}

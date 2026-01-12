'use client'

import { X, Pencil, Calendar, Users } from 'lucide-react'
import { formatDate, getInitials } from '@/lib/utils'
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
        className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl"
        style={{
          backgroundColor: '#12121a',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-[--text-tertiary] hover:text-[--text-primary] hover:bg-[--bg-hover] transition-colors z-10"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="p-8 pb-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="pr-10">
            {/* Session meta */}
            <div className="flex items-center gap-3 mb-4">
              <span
                className="px-3 py-1.5 text-xs font-bold rounded-lg uppercase tracking-wide"
                style={{
                  backgroundColor: 'rgba(139, 92, 246, 0.15)',
                  color: '#a78bfa'
                }}
              >
                Session {session.session_number}
              </span>
              <span className="text-sm text-[--text-tertiary] flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {formatDate(session.date)}
              </span>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-[--text-primary] mb-4">
              {session.title || 'Untitled Session'}
            </h2>

            {/* Summary */}
            {session.summary && (
              <div
                className="p-4 rounded-xl mb-6"
                style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
              >
                <p className="text-[--text-secondary] leading-relaxed">
                  {session.summary}
                </p>
              </div>
            )}

            {/* Attendees */}
            {attendees.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-4 h-4 text-[--text-tertiary]" />
                  <span className="text-sm font-medium text-[--text-tertiary]">
                    {attendees.length} attendee{attendees.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {attendees.map((char) => (
                    <button
                      key={char.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        onCharacterClick?.(char)
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all min-w-[140px]"
                      style={{
                        backgroundColor: '#1a1a24',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.4)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                      }}
                    >
                      <div
                        className="relative w-7 h-7 rounded-full overflow-hidden flex-shrink-0"
                        style={{ backgroundColor: '#0a0a0f' }}
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
                          <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-[--text-tertiary]">
                            {getInitials(char.name)}
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-medium text-[--text-secondary] whitespace-nowrap">
                        {char.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Body: Notes */}
        <div className="p-8 max-h-[50vh] overflow-y-auto">
          {session.notes ? (
            <div>
              <h3
                className="text-xs font-bold uppercase tracking-wider mb-5 pb-4"
                style={{
                  color: '#6b7280',
                  borderBottom: '1px solid rgba(255,255,255,0.06)'
                }}
              >
                Session Notes
              </h3>
              <div
                className="prose prose-invert prose-sm max-w-none
                  prose-headings:mt-8 prose-headings:mb-3 prose-headings:font-bold prose-headings:text-[--text-primary]
                  prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
                  prose-p:mb-4 prose-p:leading-relaxed
                  prose-strong:text-[--text-primary] prose-strong:font-semibold
                  prose-ul:my-4 prose-li:my-1
                  prose-a:text-[--arcane-purple] prose-a:no-underline hover:prose-a:underline"
                style={{
                  color: '#d1d5db',
                  lineHeight: '1.8',
                }}
                dangerouslySetInnerHTML={{ __html: session.notes }}
              />
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-[--text-tertiary] mb-4">
                No detailed notes yet.
              </p>
              <button
                className="btn btn-secondary"
                onClick={onEdit}
              >
                <Pencil className="w-4 h-4" />
                Add Notes
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 px-8 py-5"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
        >
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

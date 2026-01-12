'use client'

import { getInitials } from '@/lib/utils'
import Image from 'next/image'
import type { TimelineViewProps } from './types'

/**
 * Journal View - "The Saga"
 * Campaign diary aesthetic with elegant typography and gold accents
 */
export function JournalView({ events, onEventClick, onCharacterClick }: TimelineViewProps) {
  if (events.length === 0) return null

  return (
    <div className="max-w-3xl mx-auto">
      {/* Journal Header */}
      <header className="text-center mb-14 pb-10" style={{ borderBottom: '1px solid rgba(212, 168, 67, 0.15)' }}>
        <div className="flex items-center justify-center gap-5 mb-5">
          <div className="w-20 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(212, 168, 67, 0.3))' }} />
          <span
            className="text-[11px] font-semibold uppercase tracking-[0.35em]"
            style={{ color: '#D4A843' }}
          >
            Chronicle
          </span>
          <div className="w-20 h-px" style={{ background: 'linear-gradient(to left, transparent, rgba(212, 168, 67, 0.3))' }} />
        </div>
        <h2
          className="text-3xl font-bold mb-3"
          style={{ color: '#f3f4f6' }}
        >
          Campaign Journal
        </h2>
        <p
          className="text-base"
          style={{ color: '#6b7280' }}
        >
          {events.length} recorded {events.length === 1 ? 'entry' : 'entries'}
        </p>
      </header>

      {/* Journal Entries */}
      <div className="space-y-12">
        {events.map((event, index) => (
          <article
            key={event.id}
            onClick={() => onEventClick(event)}
            className="group cursor-pointer"
          >
            <div
              className="relative pl-10 transition-all duration-300"
              style={{ borderLeft: '2px solid rgba(212, 168, 67, 0.15)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderLeftColor = 'rgba(212, 168, 67, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderLeftColor = 'rgba(212, 168, 67, 0.15)'
              }}
            >
              {/* Entry marker dot */}
              <div
                className="absolute -left-[9px] top-1 w-4 h-4 rounded-full transition-all duration-300 group-hover:scale-110"
                style={{
                  backgroundColor: '#D4A843',
                  boxShadow: '0 0 0 4px rgba(212, 168, 67, 0.15)',
                }}
              />

              {/* Date and Type */}
              <div className="flex items-center flex-wrap gap-3 mb-4">
                <time
                  className="text-[15px] font-semibold"
                  style={{ color: '#D4A843' }}
                >
                  {new Date(event.event_date).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </time>
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded"
                  style={{
                    backgroundColor: 'rgba(212, 168, 67, 0.08)',
                    color: '#9ca3af',
                    border: '1px solid rgba(212, 168, 67, 0.15)',
                  }}
                >
                  {event.event_type.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Title */}
              <h3
                className="text-2xl font-bold mb-4 leading-snug group-hover:text-[#D4A843] transition-colors"
                style={{ color: '#f3f4f6' }}
              >
                {event.title}
              </h3>

              {/* Description */}
              {event.description ? (
                <p
                  className="text-[15px] mb-6"
                  style={{ color: '#9ca3af', lineHeight: '1.85' }}
                >
                  {event.description}
                </p>
              ) : (
                <p
                  className="text-[15px] italic mb-6"
                  style={{ color: '#4b5563' }}
                >
                  No notes recorded...
                </p>
              )}

              {/* Characters present */}
              {event.characters.length > 0 && (
                <div
                  className="pt-6"
                  style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}
                >
                  <p
                    className="text-[10px] font-semibold uppercase tracking-wider mb-4"
                    style={{ color: '#6b7280' }}
                  >
                    Present
                  </p>
                  <div className="flex flex-wrap gap-5">
                    {event.characters.map((char) => (
                      <button
                        key={char.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          onCharacterClick(char, e)
                        }}
                        className="flex items-center gap-3 transition-all duration-200"
                        onMouseEnter={(e) => {
                          const span = e.currentTarget.querySelector('span')
                          if (span) span.style.color = '#D4A843'
                        }}
                        onMouseLeave={(e) => {
                          const span = e.currentTarget.querySelector('span')
                          if (span) span.style.color = '#9ca3af'
                        }}
                      >
                        <div
                          className="relative w-10 h-10 rounded-full overflow-hidden transition-all duration-200"
                          style={{
                            border: '2px solid rgba(212, 168, 67, 0.25)',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                          }}
                        >
                          {char.image_url ? (
                            <Image
                              src={char.image_url}
                              alt={char.name}
                              fill
                              className="object-cover"
                              sizes="40px"
                            />
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center text-sm font-bold"
                              style={{ backgroundColor: '#1a1a24', color: '#6b7280' }}
                            >
                              {getInitials(char.name)}
                            </div>
                          )}
                        </div>
                        <span
                          className="text-sm font-medium transition-colors"
                          style={{ color: '#9ca3af' }}
                        >
                          {char.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Spacer between entries */}
            {index < events.length - 1 && (
              <div
                className="h-px mt-12"
                style={{ background: 'linear-gradient(to right, transparent, rgba(212, 168, 67, 0.12), transparent)' }}
              />
            )}
          </article>
        ))}
      </div>

      {/* Journal Footer */}
      <footer className="text-center mt-16 pt-10" style={{ borderTop: '1px solid rgba(212, 168, 67, 0.15)' }}>
        <p
          className="text-sm italic"
          style={{ color: '#4b5563' }}
        >
          End of entries
        </p>
      </footer>
    </div>
  )
}

'use client'

import { formatDate, getInitials } from '@/lib/utils'
import Image from 'next/image'
import type { TimelineViewProps } from './types'

/**
 * Journal View - Campaign diary aesthetic
 * Clear entry separation, proper hierarchy, readable typography
 */
export function JournalView({ events, onEventClick, onCharacterClick }: TimelineViewProps) {
  if (events.length === 0) return null

  return (
    <div className="max-w-3xl mx-auto">
      {/* Journal Header */}
      <header className="text-center mb-12 pb-8" style={{ borderBottom: '1px solid rgba(212, 168, 67, 0.2)' }}>
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="w-16 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(212, 168, 67, 0.4))' }} />
          <span
            className="text-xs font-bold uppercase tracking-[0.3em]"
            style={{ color: '#D4A843' }}
          >
            Chronicle
          </span>
          <div className="w-16 h-px" style={{ background: 'linear-gradient(to left, transparent, rgba(212, 168, 67, 0.4))' }} />
        </div>
        <h2
          className="text-3xl font-bold"
          style={{ color: '#f3f4f6' }}
        >
          Campaign Journal
        </h2>
        <p
          className="text-base mt-3"
          style={{ color: '#6b7280' }}
        >
          {events.length} recorded {events.length === 1 ? 'entry' : 'entries'}
        </p>
      </header>

      {/* Journal Entries */}
      <div className="space-y-10">
        {events.map((event, index) => (
          <article
            key={event.id}
            onClick={() => onEventClick(event)}
            className="group cursor-pointer"
          >
            <div
              className="relative pl-8"
              style={{ borderLeft: '2px solid rgba(212, 168, 67, 0.2)', border: '3px solid green' }} // DEBUG
              onMouseEnter={(e) => {
                e.currentTarget.style.borderLeftColor = 'rgba(212, 168, 67, 0.5)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderLeftColor = 'rgba(212, 168, 67, 0.2)'
              }}
            >
              {/* Entry marker */}
              <div
                className="absolute -left-[7px] top-2 w-3 h-3 rounded-full transition-colors"
                style={{ backgroundColor: 'rgba(212, 168, 67, 0.4)' }}
              />

              {/* Date and Type */}
              <div className="flex items-center gap-4 mb-4">
                <time
                  className="text-sm font-semibold"
                  style={{ color: '#D4A843' }}
                >
                  {new Date(event.event_date).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </time>
                <span
                  className="text-xs font-medium uppercase tracking-wide px-2 py-1 rounded"
                  style={{
                    backgroundColor: 'rgba(212, 168, 67, 0.1)',
                    color: '#9ca3af'
                  }}
                >
                  {event.event_type.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Title */}
              <h3
                className="text-2xl font-bold mb-4 transition-colors"
                style={{ color: '#f3f4f6' }}
              >
                {event.title}
              </h3>

              {/* Description */}
              {event.description ? (
                <p
                  className="text-base mb-6"
                  style={{ color: '#9ca3af', lineHeight: '1.8' }}
                >
                  {event.description}
                </p>
              ) : (
                <p
                  className="text-base italic mb-6"
                  style={{ color: '#4b5563' }}
                >
                  No notes recorded...
                </p>
              )}

              {/* Characters present */}
              {event.characters.length > 0 && (
                <div
                  className="pt-5"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <p
                    className="text-xs font-bold uppercase tracking-wider mb-4"
                    style={{ color: '#6b7280' }}
                  >
                    Present
                  </p>
                  <div className="flex flex-wrap gap-4">
                    {event.characters.map((char) => (
                      <button
                        key={char.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          onCharacterClick(char, e)
                        }}
                        className="flex items-center gap-3 transition-colors"
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
                          className="relative w-10 h-10 rounded-full overflow-hidden"
                          style={{ border: '2px solid rgba(212, 168, 67, 0.3)' }}
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
                className="h-px mt-10"
                style={{ background: 'linear-gradient(to right, rgba(212, 168, 67, 0.1), rgba(212, 168, 67, 0.2), rgba(212, 168, 67, 0.1))' }}
              />
            )}
          </article>
        ))}
      </div>

      {/* Journal Footer */}
      <footer className="text-center mt-16 pt-8" style={{ borderTop: '1px solid rgba(212, 168, 67, 0.2)' }}>
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

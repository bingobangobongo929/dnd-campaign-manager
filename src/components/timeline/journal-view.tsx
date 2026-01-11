'use client'

import { formatDate, getInitials } from '@/lib/utils'
import Image from 'next/image'
import type { TimelineViewProps } from './types'

/**
 * Journal View - Campaign diary aesthetic
 * Reads like a personal logbook. Elegant, narrative-focused.
 */
export function JournalView({ events, onEventClick, onCharacterClick }: TimelineViewProps) {
  if (events.length === 0) return null

  return (
    <div className="max-w-2xl mx-auto">
      {/* Journal Header */}
      <header className="text-center mb-10 pb-8 border-b border-[--arcane-gold]/20">
        <div className="inline-flex items-center gap-3 mb-3">
          <div className="w-12 h-px bg-gradient-to-r from-transparent to-[--arcane-gold]/40" />
          <span className="text-xs text-[--arcane-gold] uppercase tracking-[0.3em]">Chronicle</span>
          <div className="w-12 h-px bg-gradient-to-l from-transparent to-[--arcane-gold]/40" />
        </div>
        <h2 className="text-2xl font-display text-[--text-primary]">Campaign Journal</h2>
        <p className="text-sm text-[--text-tertiary] mt-2">{events.length} recorded entries</p>
      </header>

      {/* Journal Entries */}
      <div className="space-y-8">
        {events.map((event, index) => (
          <article
            key={event.id}
            onClick={() => onEventClick(event)}
            className="group cursor-pointer"
          >
            <div className="relative pl-6 border-l-2 border-[--arcane-gold]/20 hover:border-[--arcane-gold]/40 transition-colors">
              {/* Entry marker */}
              <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-[--arcane-gold]/40 group-hover:bg-[--arcane-gold] transition-colors" />

              {/* Date line */}
              <div className="flex items-center gap-4 mb-3">
                <time className="text-sm font-medium text-[--arcane-gold]/80">
                  {new Date(event.event_date).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </time>
                <span className="text-xs text-[--text-tertiary] capitalize">
                  {event.event_type.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-xl font-semibold text-[--text-primary] mb-3 group-hover:text-[--arcane-gold] transition-colors">
                {event.title}
              </h3>

              {/* Description */}
              {event.description ? (
                <p className="text-[--text-secondary] leading-relaxed mb-4">
                  {event.description}
                </p>
              ) : (
                <p className="text-[--text-tertiary] italic mb-4">
                  No notes recorded...
                </p>
              )}

              {/* Characters present */}
              {event.characters.length > 0 && (
                <div className="pt-4 border-t border-[--border]/50">
                  <p className="text-xs text-[--text-tertiary] mb-3">Present:</p>
                  <div className="flex flex-wrap gap-3">
                    {event.characters.map((char) => (
                      <button
                        key={char.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          onCharacterClick(char, e)
                        }}
                        className="flex items-center gap-2 group/char"
                      >
                        <div className="relative w-8 h-8 rounded-full overflow-hidden border border-[--arcane-gold]/30 group-hover/char:border-[--arcane-gold] transition-colors">
                          {char.image_url ? (
                            <Image
                              src={char.image_url}
                              alt={char.name}
                              fill
                              className="object-cover"
                              sizes="32px"
                            />
                          ) : (
                            <div className="w-full h-full bg-[--bg-elevated] flex items-center justify-center text-xs font-medium text-[--text-tertiary]">
                              {getInitials(char.name)}
                            </div>
                          )}
                        </div>
                        <span className="text-sm text-[--text-secondary] group-hover/char:text-[--arcane-gold] transition-colors">
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
              <div className="h-px bg-gradient-to-r from-[--arcane-gold]/10 via-[--arcane-gold]/20 to-[--arcane-gold]/10 mt-8" />
            )}
          </article>
        ))}
      </div>

      {/* Journal Footer */}
      <footer className="text-center mt-12 pt-8 border-t border-[--arcane-gold]/20">
        <p className="text-sm text-[--text-tertiary] italic">End of entries</p>
      </footer>
    </div>
  )
}

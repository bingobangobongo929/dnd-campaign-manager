'use client'

import { formatDate, getInitials } from '@/lib/utils'
import Image from 'next/image'
import type { TimelineViewProps } from './types'

/**
 * Journal View - Campaign diary/logbook style
 * Narrative-focused, reads like a story journal. Warm, parchment-like aesthetic.
 */
export function JournalView({ events, onEventClick, onCharacterClick }: TimelineViewProps) {
  if (events.length === 0) return null

  return (
    <div className="max-w-2xl mx-auto">
      {/* Journal Cover */}
      <div className="text-center mb-8 pb-6 border-b border-[--arcane-gold]/20">
        <h2 className="font-display text-2xl text-[--arcane-gold] mb-1">Campaign Journal</h2>
        <p className="text-sm text-[--text-tertiary]">
          {events.length} entries recorded
        </p>
      </div>

      {/* Journal Entries */}
      <div className="space-y-8">
        {events.map((event, index) => (
          <article
            key={event.id}
            className="relative cursor-pointer group animate-slide-in-up"
            style={{ animationDelay: `${index * 40}ms` }}
            onClick={() => onEventClick(event)}
          >
            {/* Entry Container - Parchment style */}
            <div className="p-6 rounded-lg bg-gradient-to-br from-[#1a1814] to-[#141210] border border-[--arcane-gold]/10 hover:border-[--arcane-gold]/30 transition-all shadow-lg">
              {/* Date Header - Like a journal date */}
              <div className="flex items-center justify-between mb-4">
                <time className="font-display text-[--arcane-gold]/80 text-sm tracking-wide">
                  {new Date(event.event_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </time>
                <span className="text-xs text-[--text-tertiary] italic capitalize">
                  {event.event_type.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Title - Handwritten feel */}
              <h3 className="font-display text-xl text-[--text-primary] mb-3 leading-tight">
                {event.title}
              </h3>

              {/* Description - Journal entry text */}
              {event.description ? (
                <div className="text-[--text-secondary] leading-relaxed mb-4 italic">
                  <span className="text-2xl text-[--arcane-gold]/60 font-serif leading-none mr-1">"</span>
                  <span className="line-clamp-4">{event.description}</span>
                  <span className="text-2xl text-[--arcane-gold]/60 font-serif leading-none ml-1">"</span>
                </div>
              ) : (
                <p className="text-[--text-tertiary] text-sm italic mb-4">
                  No notes recorded for this entry...
                </p>
              )}

              {/* Characters - Like signatures or mentions */}
              {event.characters.length > 0 && (
                <div className="pt-4 border-t border-[--arcane-gold]/10">
                  <p className="text-xs text-[--text-tertiary] mb-2 uppercase tracking-wider">
                    Those Present
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {event.characters.map((char) => (
                      <button
                        key={char.id}
                        onClick={(e) => onCharacterClick(char, e)}
                        className="flex items-center gap-2 hover:text-[--arcane-gold] transition-colors"
                      >
                        <div className="relative w-8 h-8 rounded-full overflow-hidden border border-[--arcane-gold]/20 bg-[--bg-surface]">
                          {char.image_url ? (
                            <Image
                              src={char.image_url}
                              alt={char.name}
                              fill
                              className="object-cover"
                              sizes="32px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-medium text-[--text-secondary]">
                              {getInitials(char.name)}
                            </div>
                          )}
                        </div>
                        <span className="text-sm font-medium text-[--text-secondary] group-hover:text-[--text-primary]">
                          {char.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Decorative connector */}
            {index < events.length - 1 && (
              <div className="absolute left-1/2 -translate-x-1/2 -bottom-4 w-px h-8 bg-gradient-to-b from-[--arcane-gold]/20 to-transparent" />
            )}
          </article>
        ))}
      </div>

      {/* Journal End */}
      <div className="text-center mt-8 pt-6 border-t border-[--arcane-gold]/20">
        <p className="text-sm text-[--text-tertiary] italic">
          ~ End of recorded entries ~
        </p>
      </div>
    </div>
  )
}

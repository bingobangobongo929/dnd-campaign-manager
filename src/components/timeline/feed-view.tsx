'use client'

import { formatDate, getInitials } from '@/lib/utils'
import Image from 'next/image'
import type { TimelineViewProps } from './types'

/**
 * Feed View - Editorial card stack
 * Clean, spacious cards with clear hierarchy. Reads like a curated news feed.
 */
export function FeedView({ events, onEventClick, onCharacterClick }: TimelineViewProps) {
  if (events.length === 0) return null

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {events.map((event, index) => (
        <article
          key={event.id}
          onClick={() => onEventClick(event)}
          className="group cursor-pointer"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <div className="relative p-6 rounded-2xl bg-[--bg-surface] border border-[--border] transition-all duration-300 hover:border-[--arcane-purple]/40 hover:shadow-[0_0_30px_-10px_rgba(139,92,246,0.3)]">
            {/* Top row: Date and Type */}
            <div className="flex items-center justify-between mb-4">
              <time className="text-sm text-[--text-tertiary] tabular-nums">
                {formatDate(event.event_date)}
              </time>
              <span className="text-xs font-medium text-[--arcane-purple] uppercase tracking-widest">
                {event.event_type.replace(/_/g, ' ')}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-xl font-semibold text-[--text-primary] leading-snug mb-3 group-hover:text-[--arcane-purple] transition-colors">
              {event.title}
            </h3>

            {/* Description - full text, soft wrapping */}
            {event.description && (
              <p className="text-[--text-secondary] leading-relaxed mb-5">
                {event.description}
              </p>
            )}

            {/* Characters */}
            {event.characters.length > 0 && (
              <div className="pt-4 border-t border-[--border]">
                <p className="text-xs text-[--text-tertiary] uppercase tracking-wider mb-3">
                  Characters
                </p>
                <div className="flex flex-wrap gap-2">
                  {event.characters.map((char) => (
                    <button
                      key={char.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        onCharacterClick(char, e)
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-full bg-[--bg-elevated] border border-[--border] hover:border-[--arcane-gold]/50 hover:bg-[--arcane-gold]/5 transition-all"
                    >
                      <div className="relative w-6 h-6 rounded-full overflow-hidden bg-[--bg-surface] ring-2 ring-[--bg-elevated]">
                        {char.image_url ? (
                          <Image
                            src={char.image_url}
                            alt={char.name}
                            fill
                            className="object-cover"
                            sizes="24px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] font-semibold text-[--text-tertiary]">
                            {getInitials(char.name)}
                          </div>
                        )}
                      </div>
                      <span className="text-sm text-[--text-secondary]">
                        {char.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Subtle corner accent */}
            <div className="absolute top-0 right-0 w-16 h-16 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-[--arcane-purple]" />
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}

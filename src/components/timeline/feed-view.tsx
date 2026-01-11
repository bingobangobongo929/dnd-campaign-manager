'use client'

import { Calendar, Users } from 'lucide-react'
import { formatDate, getInitials } from '@/lib/utils'
import Image from 'next/image'
import type { TimelineViewProps } from './types'

/**
 * Feed View - Simple vertical card stack
 * Clean, social-media style feed. Easy to scan, minimal visual noise.
 */
export function FeedView({ events, onEventClick, onCharacterClick }: TimelineViewProps) {
  if (events.length === 0) return null

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {events.map((event, index) => (
        <article
          key={event.id}
          className="card p-5 cursor-pointer hover:border-[--arcane-purple]/30 transition-all animate-slide-in-up"
          style={{ animationDelay: `${index * 30}ms` }}
          onClick={() => onEventClick(event)}
        >
          {/* Date & Type Header */}
          <div className="flex items-center gap-3 mb-3 text-sm">
            <time className="text-[--text-tertiary] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(event.event_date)}
            </time>
            <span className="text-[--text-tertiary]">·</span>
            <span className="text-[--arcane-purple] font-medium capitalize">
              {event.event_type.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-[--text-primary] mb-2">
            {event.title}
          </h3>

          {/* Description */}
          {event.description && (
            <p className="text-[--text-secondary] text-sm leading-relaxed mb-4 line-clamp-3">
              {event.description}
            </p>
          )}

          {/* Characters */}
          {event.characters.length > 0 && (
            <div className="flex items-center gap-3 pt-3 border-t border-[--border]">
              <Users className="w-4 h-4 text-[--text-tertiary]" />
              <div className="flex items-center gap-2 flex-wrap">
                {event.characters.map((char) => (
                  <button
                    key={char.id}
                    onClick={(e) => onCharacterClick(char, e)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[--bg-elevated] hover:bg-[--arcane-purple]/10 transition-colors group"
                  >
                    <div className="relative w-5 h-5 rounded-full overflow-hidden bg-[--bg-surface]">
                      {char.image_url ? (
                        <Image
                          src={char.image_url}
                          alt={char.name}
                          fill
                          className="object-cover"
                          sizes="20px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[8px] font-medium text-[--text-secondary]">
                          {getInitials(char.name)}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-[--text-secondary] group-hover:text-[--text-primary] transition-colors">
                      {char.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </article>
      ))}
    </div>
  )
}

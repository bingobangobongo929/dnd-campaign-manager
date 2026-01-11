'use client'

import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDate, getInitials } from '@/lib/utils'
import Image from 'next/image'
import type { TimelineViewProps } from './types'

/**
 * Storyboard View - Horizontal filmstrip
 * Scroll through events like panels in a story. Cinematic feel.
 */
export function StoryboardView({ events, onEventClick, onCharacterClick }: TimelineViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  if (events.length === 0) return null

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const amount = 340 // Card width + gap
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -amount : amount,
        behavior: 'smooth'
      })
    }
  }

  return (
    <div className="relative -mx-6">
      {/* Navigation Arrows */}
      <button
        onClick={() => scroll('left')}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-[--bg-surface]/95 border border-[--border] flex items-center justify-center text-[--text-secondary] hover:text-[--text-primary] hover:border-[--arcane-purple]/50 transition-all shadow-xl backdrop-blur-sm"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={() => scroll('right')}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-[--bg-surface]/95 border border-[--border] flex items-center justify-center text-[--text-secondary] hover:text-[--text-primary] hover:border-[--arcane-purple]/50 transition-all shadow-xl backdrop-blur-sm"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Scrollable Track */}
      <div
        ref={scrollRef}
        className="flex gap-5 overflow-x-auto py-6 px-20 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {events.map((event, index) => (
          <article
            key={event.id}
            onClick={() => onEventClick(event)}
            className="flex-shrink-0 w-80 snap-center cursor-pointer group"
          >
            <div className="h-full rounded-2xl bg-[--bg-surface] border border-[--border] overflow-hidden transition-all duration-300 hover:border-[--arcane-purple]/40 hover:shadow-[0_0_40px_-15px_rgba(139,92,246,0.4)]">
              {/* Card Header */}
              <div className="p-5 border-b border-[--border]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-[--arcane-purple] font-medium uppercase tracking-wider">
                    {event.event_type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-[--text-tertiary] tabular-nums">
                    {formatDate(event.event_date)}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-[--text-primary] leading-snug group-hover:text-[--arcane-purple] transition-colors">
                  {event.title}
                </h3>
              </div>

              {/* Card Body */}
              <div className="p-5">
                {event.description ? (
                  <p className="text-sm text-[--text-secondary] leading-relaxed line-clamp-4 mb-4">
                    {event.description}
                  </p>
                ) : (
                  <p className="text-sm text-[--text-tertiary] italic mb-4">
                    No description
                  </p>
                )}

                {/* Characters */}
                {event.characters.length > 0 && (
                  <div className="pt-4 border-t border-[--border]">
                    <div className="flex flex-wrap gap-2">
                      {event.characters.slice(0, 4).map((char) => (
                        <button
                          key={char.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            onCharacterClick(char, e)
                          }}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[--bg-elevated] border border-[--border] hover:border-[--arcane-gold]/50 transition-colors"
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
                              <div className="w-full h-full flex items-center justify-center text-[8px] font-semibold text-[--text-tertiary]">
                                {getInitials(char.name)}
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-[--text-secondary]">
                            {char.name.split(' ')[0]}
                          </span>
                        </button>
                      ))}
                      {event.characters.length > 4 && (
                        <span className="text-xs text-[--text-tertiary] self-center">
                          +{event.characters.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Panel Number */}
              <div className="px-5 pb-4">
                <span className="text-xs text-[--text-tertiary]">
                  {index + 1} / {events.length}
                </span>
              </div>
            </div>
          </article>
        ))}

        {/* End Cap */}
        <div className="flex-shrink-0 w-40 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-[--bg-surface] border border-[--border] flex items-center justify-center mx-auto mb-2">
              <span className="text-[--text-tertiary]">+</span>
            </div>
            <p className="text-xs text-[--text-tertiary]">Add event</p>
          </div>
        </div>
      </div>

      {/* Fade edges */}
      <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[--bg-base] to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-[--bg-base] to-transparent pointer-events-none" />
    </div>
  )
}

'use client'

import { useRef } from 'react'
import {
  Calendar,
  User,
  Scroll,
  Swords,
  MapPin,
  Crown,
  Skull,
  Star,
  Heart,
  Shield,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { formatDate, getInitials, EVENT_TYPE_COLORS } from '@/lib/utils'
import Image from 'next/image'
import type { TimelineViewProps } from './types'

const EVENT_ICONS: Record<string, typeof Calendar> = {
  session: Scroll,
  character_intro: User,
  combat: Swords,
  discovery: MapPin,
  quest_start: Star,
  quest_complete: Crown,
  death: Skull,
  romance: Heart,
  alliance: Shield,
  other: Calendar,
}

/**
 * Storyboard View - Horizontal filmstrip
 * Scroll through events like a comic strip or movie storyboard.
 * Cinematic feel perfect for D&D campaigns.
 */
export function StoryboardView({ events, onEventClick, onCharacterClick }: TimelineViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  if (events.length === 0) return null

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 320 // Card width + gap
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  return (
    <div className="relative -mx-4">
      {/* Scroll Buttons */}
      <button
        onClick={() => scroll('left')}
        className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-[--bg-surface]/90 border border-[--border] flex items-center justify-center text-[--text-secondary] hover:text-[--text-primary] hover:border-[--arcane-purple]/50 transition-all shadow-lg backdrop-blur-sm"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={() => scroll('right')}
        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-[--bg-surface]/90 border border-[--border] flex items-center justify-center text-[--text-secondary] hover:text-[--text-primary] hover:border-[--arcane-purple]/50 transition-all shadow-lg backdrop-blur-sm"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Timeline Track */}
      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[--arcane-purple]/30 to-transparent" />

      {/* Scrollable Container */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 pt-4 px-16 snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {events.map((event, index) => {
          const Icon = EVENT_ICONS[event.event_type] || Calendar
          const color = EVENT_TYPE_COLORS[event.event_type] || EVENT_TYPE_COLORS.other

          return (
            <article
              key={event.id}
              className="relative flex-shrink-0 w-72 snap-center animate-slide-in-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Timeline dot */}
              <div
                className="absolute left-1/2 -translate-x-1/2 -top-2 w-4 h-4 rounded-full border-2 border-[--bg-base]"
                style={{ backgroundColor: color }}
              />

              {/* Card */}
              <button
                onClick={() => onEventClick(event)}
                className="w-full mt-4 bg-[--bg-surface] rounded-xl border border-[--border] hover:border-[--arcane-purple]/50 transition-all overflow-hidden text-left group"
              >
                {/* Card Header with gradient */}
                <div
                  className="h-20 p-4 flex items-end"
                  style={{
                    background: `linear-gradient(135deg, ${color}20 0%, ${color}05 100%)`
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${color}30`, color }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-medium capitalize" style={{ color }}>
                      {event.event_type.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4">
                  <time className="text-xs text-[--text-tertiary] flex items-center gap-1 mb-2">
                    <Calendar className="w-3 h-3" />
                    {formatDate(event.event_date)}
                  </time>
                  <h3 className="font-semibold text-[--text-primary] mb-2 line-clamp-2 group-hover:text-[--arcane-purple] transition-colors">
                    {event.title}
                  </h3>
                  {event.description && (
                    <p className="text-sm text-[--text-secondary] line-clamp-2 mb-3">
                      {event.description}
                    </p>
                  )}

                  {/* Characters */}
                  {event.characters.length > 0 && (
                    <div className="flex items-center gap-2 pt-3 border-t border-[--border]">
                      <div className="flex -space-x-2">
                        {event.characters.slice(0, 4).map((char) => (
                          <div
                            key={char.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              onCharacterClick(char, e)
                            }}
                            className="relative w-7 h-7 rounded-full overflow-hidden border-2 border-[--bg-surface] bg-[--bg-elevated] hover:z-10 hover:scale-110 transition-transform cursor-pointer"
                            title={char.name}
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
                              <div className="w-full h-full flex items-center justify-center text-[9px] font-medium text-[--text-secondary]">
                                {getInitials(char.name)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      {event.characters.length > 4 && (
                        <span className="text-xs text-[--text-tertiary]">
                          +{event.characters.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </button>

              {/* Panel number */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-[--bg-elevated] rounded text-[10px] text-[--text-tertiary] border border-[--border]">
                {index + 1}
              </div>
            </article>
          )
        })}

        {/* End marker */}
        <div className="flex-shrink-0 w-32 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 rounded-full bg-[--bg-elevated] border border-[--border] flex items-center justify-center mx-auto mb-2">
              <span className="text-xs text-[--text-tertiary]">...</span>
            </div>
            <p className="text-xs text-[--text-tertiary]">More to come</p>
          </div>
        </div>
      </div>

      {/* Scroll hint gradient */}
      <div className="absolute top-0 bottom-0 left-0 w-16 bg-gradient-to-r from-[--bg-base] to-transparent pointer-events-none" />
      <div className="absolute top-0 bottom-0 right-0 w-16 bg-gradient-to-l from-[--bg-base] to-transparent pointer-events-none" />
    </div>
  )
}

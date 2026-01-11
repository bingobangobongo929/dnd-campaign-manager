'use client'

import { useState } from 'react'
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
  ChevronDown,
} from 'lucide-react'
import { formatDate, getInitials, EVENT_TYPE_COLORS, cn } from '@/lib/utils'
import Image from 'next/image'
import type { TimelineViewProps, TimelineEventWithCharacters } from './types'

const EVENT_CONFIG: Record<string, { icon: typeof Calendar; label: string }> = {
  session: { icon: Scroll, label: 'Sessions' },
  character_intro: { icon: User, label: 'Introductions' },
  combat: { icon: Swords, label: 'Battles' },
  discovery: { icon: MapPin, label: 'Discoveries' },
  quest_start: { icon: Star, label: 'Quests Begun' },
  quest_complete: { icon: Crown, label: 'Quests Completed' },
  death: { icon: Skull, label: 'Deaths' },
  romance: { icon: Heart, label: 'Romance' },
  alliance: { icon: Shield, label: 'Alliances' },
  other: { icon: Calendar, label: 'Other' },
}

/**
 * Chapters View - Collapsible sections by event type
 * Organized by what happened, not when. Clean accordion style.
 */
export function ChaptersView({ events, onEventClick, onCharacterClick }: TimelineViewProps) {
  // Group events by type
  const grouped = events.reduce((acc, event) => {
    const type = event.event_type || 'other'
    if (!acc[type]) acc[type] = []
    acc[type].push(event)
    return acc
  }, {} as Record<string, TimelineEventWithCharacters[]>)

  // Sort by count, most events first
  const sortedTypes = Object.entries(grouped).sort(([, a], [, b]) => b.length - a.length)

  // Track expanded sections
  const [expanded, setExpanded] = useState<Set<string>>(new Set(sortedTypes.map(([type]) => type)))

  const toggleSection = (type: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }

  if (events.length === 0) return null

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {sortedTypes.map(([type, typeEvents]) => {
        const config = EVENT_CONFIG[type] || EVENT_CONFIG.other
        const Icon = config.icon
        const color = EVENT_TYPE_COLORS[type as keyof typeof EVENT_TYPE_COLORS] || EVENT_TYPE_COLORS.other
        const isExpanded = expanded.has(type)

        return (
          <section key={type} className="rounded-2xl bg-[--bg-surface] border border-[--border] overflow-hidden">
            {/* Section Header - Clickable */}
            <button
              onClick={() => toggleSection(type)}
              className="w-full flex items-center gap-4 p-5 text-left hover:bg-[--bg-elevated]/50 transition-colors"
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${color}15` }}
              >
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-[--text-primary]">
                  {config.label}
                </h2>
                <p className="text-sm text-[--text-tertiary]">
                  {typeEvents.length} event{typeEvents.length !== 1 ? 's' : ''}
                </p>
              </div>
              <ChevronDown
                className={cn(
                  "w-5 h-5 text-[--text-tertiary] transition-transform duration-200",
                  isExpanded && "rotate-180"
                )}
              />
            </button>

            {/* Events List */}
            {isExpanded && (
              <div className="border-t border-[--border]">
                {typeEvents.map((event, index) => (
                  <div
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    className={cn(
                      "flex items-start gap-4 p-5 cursor-pointer hover:bg-[--bg-elevated]/30 transition-colors",
                      index !== typeEvents.length - 1 && "border-b border-[--border]/50"
                    )}
                  >
                    {/* Date column */}
                    <div className="w-20 flex-shrink-0 pt-0.5">
                      <time className="text-sm text-[--text-tertiary] tabular-nums">
                        {formatDate(event.event_date)}
                      </time>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-[--text-primary] mb-1">
                        {event.title}
                      </h3>
                      {event.description && (
                        <p className="text-sm text-[--text-secondary] leading-relaxed line-clamp-2">
                          {event.description}
                        </p>
                      )}
                    </div>

                    {/* Characters */}
                    {event.characters.length > 0 && (
                      <div className="flex -space-x-2 flex-shrink-0">
                        {event.characters.slice(0, 4).map((char) => (
                          <button
                            key={char.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              onCharacterClick(char, e)
                            }}
                            className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-[--bg-surface] bg-[--bg-elevated] hover:z-10 hover:scale-110 hover:border-[--arcane-gold]/50 transition-all"
                            title={char.name}
                          >
                            {char.image_url ? (
                              <Image
                                src={char.image_url}
                                alt={char.name}
                                fill
                                className="object-cover"
                                sizes="32px"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-[--text-tertiary]">
                                {getInitials(char.name)}
                              </div>
                            )}
                          </button>
                        ))}
                        {event.characters.length > 4 && (
                          <div className="w-8 h-8 rounded-full border-2 border-[--bg-surface] bg-[--bg-elevated] flex items-center justify-center">
                            <span className="text-xs font-medium text-[--text-tertiary]">
                              +{event.characters.length - 4}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

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
import { formatDate, getInitials } from '@/lib/utils'
import Image from 'next/image'
import type { TimelineViewProps, TimelineEventWithCharacters } from './types'

const EVENT_CONFIG: Record<string, { icon: typeof Calendar; label: string; color: string }> = {
  session: { icon: Scroll, label: 'Sessions', color: '#8B5CF6' },
  character_intro: { icon: User, label: 'Introductions', color: '#06B6D4' },
  combat: { icon: Swords, label: 'Battles', color: '#EF4444' },
  discovery: { icon: MapPin, label: 'Discoveries', color: '#10B981' },
  quest_start: { icon: Star, label: 'Quests Begun', color: '#F59E0B' },
  quest_complete: { icon: Crown, label: 'Quests Completed', color: '#D4A843' },
  death: { icon: Skull, label: 'Deaths', color: '#6B7280' },
  romance: { icon: Heart, label: 'Romance', color: '#EC4899' },
  alliance: { icon: Shield, label: 'Alliances', color: '#3B82F6' },
  other: { icon: Calendar, label: 'Other Events', color: '#9CA3AF' },
}

/**
 * Chapters View - Collapsible sections by event type
 * Prominent headers, generous spacing, clean accordion
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

  // Track expanded sections - all expanded by default
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
    <div className="max-w-4xl mx-auto space-y-6">
      {sortedTypes.map(([type, typeEvents]) => {
        const config = EVENT_CONFIG[type] || EVENT_CONFIG.other
        const Icon = config.icon
        const isExpanded = expanded.has(type)

        return (
          <section
            key={type}
            className="rounded-xl overflow-hidden"
            style={{
              backgroundColor: '#12121a',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {/* Section Header */}
            <button
              onClick={() => toggleSection(type)}
              className="w-full flex items-center gap-5 p-6 text-left transition-colors"
              style={{ backgroundColor: isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent' }}
              onMouseEnter={(e) => {
                if (!isExpanded) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'
              }}
              onMouseLeave={(e) => {
                if (!isExpanded) e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${config.color}20` }}
              >
                <Icon className="w-7 h-7" style={{ color: config.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <h2
                  className="text-xl font-bold"
                  style={{ color: '#f3f4f6' }}
                >
                  {config.label}
                </h2>
                <p
                  className="text-sm mt-1"
                  style={{ color: '#6b7280' }}
                >
                  {typeEvents.length} event{typeEvents.length !== 1 ? 's' : ''}
                </p>
              </div>
              <ChevronDown
                className="w-6 h-6 transition-transform duration-200"
                style={{
                  color: '#6b7280',
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                }}
              />
            </button>

            {/* Events List */}
            {isExpanded && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                {typeEvents.map((event, index) => (
                  <div
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    className="flex items-start gap-5 p-6 cursor-pointer transition-colors"
                    style={{
                      borderBottom: index !== typeEvents.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                  >
                    {/* Date column */}
                    <div className="w-24 flex-shrink-0 pt-1">
                      <time
                        className="text-sm font-medium tabular-nums"
                        style={{ color: '#6b7280' }}
                      >
                        {formatDate(event.event_date)}
                      </time>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3
                        className="text-lg font-semibold mb-2"
                        style={{ color: '#f3f4f6' }}
                      >
                        {event.title}
                      </h3>
                      {event.description && (
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: '#9ca3af', lineHeight: '1.6' }}
                        >
                          {event.description.length > 200
                            ? event.description.slice(0, 200) + '...'
                            : event.description}
                        </p>
                      )}
                    </div>

                    {/* Characters */}
                    {event.characters.length > 0 && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex -space-x-2">
                          {event.characters.slice(0, 4).map((char) => (
                            <button
                              key={char.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                onCharacterClick(char, e)
                              }}
                              className="relative w-10 h-10 rounded-full overflow-hidden transition-transform hover:scale-110 hover:z-10"
                              style={{
                                backgroundColor: '#1a1a24',
                                border: '2px solid #12121a',
                              }}
                              title={char.name}
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
                                  className="w-full h-full flex items-center justify-center text-xs font-bold"
                                  style={{ color: '#6b7280' }}
                                >
                                  {getInitials(char.name)}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                        {event.characters.length > 4 && (
                          <span
                            className="text-sm font-medium"
                            style={{ color: '#6b7280' }}
                          >
                            +{event.characters.length - 4}
                          </span>
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

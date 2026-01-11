'use client'

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
  ChevronRight,
} from 'lucide-react'
import { formatDate, getInitials, EVENT_TYPE_COLORS } from '@/lib/utils'
import Image from 'next/image'
import type { TimelineViewProps, TimelineEventWithCharacters } from './types'

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

const EVENT_LABELS: Record<string, string> = {
  session: 'Sessions',
  character_intro: 'Character Introductions',
  combat: 'Battles & Combat',
  discovery: 'Discoveries',
  quest_start: 'Quests Started',
  quest_complete: 'Quests Completed',
  death: 'Deaths',
  romance: 'Romance',
  alliance: 'Alliances',
  other: 'Other Events',
}

/**
 * Chapters View - Grouped by event type/story arc
 * Organizes events by what happened, not when. Better for narrative overview.
 */
export function ChaptersView({ events, onEventClick, onCharacterClick }: TimelineViewProps) {
  if (events.length === 0) return null

  // Group events by type
  const groupedByType = events.reduce((acc, event) => {
    const type = event.event_type || 'other'
    if (!acc[type]) acc[type] = []
    acc[type].push(event)
    return acc
  }, {} as Record<string, TimelineEventWithCharacters[]>)

  // Sort groups by most events first
  const sortedGroups = Object.entries(groupedByType).sort(([, a], [, b]) => b.length - a.length)

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {sortedGroups.map(([type, typeEvents]) => {
        const Icon = EVENT_ICONS[type] || Calendar
        const color = EVENT_TYPE_COLORS[type as keyof typeof EVENT_TYPE_COLORS] || EVENT_TYPE_COLORS.other
        const label = EVENT_LABELS[type] || 'Events'

        return (
          <section key={type} className="animate-slide-in-up">
            {/* Chapter Header */}
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[--border]">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${color}15`, color }}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-[--text-primary]">
                  {label}
                </h2>
                <p className="text-sm text-[--text-tertiary]">
                  {typeEvents.length} event{typeEvents.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Events List */}
            <div className="space-y-2 pl-2">
              {typeEvents.map((event) => (
                <button
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-[--bg-elevated] hover:bg-[--bg-surface] border border-transparent hover:border-[--border] transition-all text-left group"
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-[--text-primary] truncate">
                      {event.title}
                    </h3>
                    <p className="text-xs text-[--text-tertiary]">
                      {formatDate(event.event_date)}
                      {event.characters.length > 0 && (
                        <span className="ml-2">
                          · {event.characters.map(c => c.name).join(', ')}
                        </span>
                      )}
                    </p>
                  </div>
                  {/* Character Avatars */}
                  {event.characters.length > 0 && (
                    <div className="flex -space-x-1.5">
                      {event.characters.slice(0, 3).map((char) => (
                        <div
                          key={char.id}
                          onClick={(e) => onCharacterClick(char, e)}
                          className="relative w-6 h-6 rounded-full overflow-hidden border-2 border-[--bg-elevated] bg-[--bg-surface] hover:z-10 hover:scale-110 transition-transform"
                          title={char.name}
                        >
                          {char.image_url ? (
                            <Image
                              src={char.image_url}
                              alt={char.name}
                              fill
                              className="object-cover"
                              sizes="24px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[8px] font-medium text-[--text-secondary]">
                              {getInitials(char.name)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <ChevronRight className="w-4 h-4 text-[--text-tertiary] opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

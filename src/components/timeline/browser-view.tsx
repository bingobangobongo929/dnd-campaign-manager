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
  Users,
  Pencil,
} from 'lucide-react'
import { formatDate, getInitials, EVENT_TYPE_COLORS, cn } from '@/lib/utils'
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

/**
 * Browser View - Two-panel navigation
 * Left panel: Scrollable list of events
 * Right panel: Selected event details
 * Familiar pattern like email clients or file browsers.
 */
export function BrowserView({ events, onEventClick, onCharacterClick }: TimelineViewProps) {
  const [selectedEvent, setSelectedEvent] = useState<TimelineEventWithCharacters | null>(
    events.length > 0 ? events[0] : null
  )

  if (events.length === 0) return null

  return (
    <div className="flex gap-6 h-[calc(100vh-240px)] min-h-[500px]">
      {/* Left Panel - Event List */}
      <div className="w-80 flex-shrink-0 flex flex-col bg-[--bg-elevated] rounded-xl border border-[--border] overflow-hidden">
        <div className="p-3 border-b border-[--border]">
          <h3 className="font-medium text-[--text-primary] text-sm">
            All Events ({events.length})
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {events.map((event) => {
            const Icon = EVENT_ICONS[event.event_type] || Calendar
            const color = EVENT_TYPE_COLORS[event.event_type] || EVENT_TYPE_COLORS.other
            const isSelected = selectedEvent?.id === event.id

            return (
              <button
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className={cn(
                  'w-full flex items-start gap-3 p-3 text-left transition-colors border-b border-[--border]/50',
                  isSelected
                    ? 'bg-[--arcane-purple]/10 border-l-2 border-l-[--arcane-purple]'
                    : 'hover:bg-[--bg-surface] border-l-2 border-l-transparent'
                )}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: `${color}15`, color }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={cn(
                    'font-medium truncate text-sm',
                    isSelected ? 'text-[--text-primary]' : 'text-[--text-secondary]'
                  )}>
                    {event.title}
                  </h4>
                  <p className="text-xs text-[--text-tertiary] mt-0.5">
                    {formatDate(event.event_date)}
                  </p>
                  {event.characters.length > 0 && (
                    <div className="flex -space-x-1 mt-1.5">
                      {event.characters.slice(0, 4).map((char) => (
                        <div
                          key={char.id}
                          className="relative w-5 h-5 rounded-full overflow-hidden border border-[--bg-elevated] bg-[--bg-surface]"
                        >
                          {char.image_url ? (
                            <Image
                              src={char.image_url}
                              alt={char.name}
                              fill
                              className="object-cover"
                              sizes="20px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[7px] font-medium text-[--text-tertiary]">
                              {getInitials(char.name)}
                            </div>
                          )}
                        </div>
                      ))}
                      {event.characters.length > 4 && (
                        <div className="w-5 h-5 rounded-full border border-[--bg-elevated] bg-[--bg-surface] flex items-center justify-center">
                          <span className="text-[7px] text-[--text-tertiary]">
                            +{event.characters.length - 4}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right Panel - Event Details */}
      <div className="flex-1 bg-[--bg-surface] rounded-xl border border-[--border] overflow-hidden flex flex-col">
        {selectedEvent ? (
          <>
            {/* Detail Header */}
            <div className="p-5 border-b border-[--border]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded capitalize"
                      style={{
                        backgroundColor: `${EVENT_TYPE_COLORS[selectedEvent.event_type] || EVENT_TYPE_COLORS.other}15`,
                        color: EVENT_TYPE_COLORS[selectedEvent.event_type] || EVENT_TYPE_COLORS.other
                      }}
                    >
                      {selectedEvent.event_type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-sm text-[--text-tertiary] flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(selectedEvent.event_date)}
                    </span>
                  </div>
                  <h2 className="text-xl font-display font-semibold text-[--text-primary]">
                    {selectedEvent.title}
                  </h2>
                </div>
                <button
                  onClick={() => onEventClick(selectedEvent)}
                  className="btn btn-secondary btn-sm"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
              </div>
            </div>

            {/* Detail Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {/* Description */}
              {selectedEvent.description ? (
                <div className="mb-6">
                  <h3 className="text-xs font-semibold text-[--text-tertiary] uppercase tracking-wide mb-2">
                    Description
                  </h3>
                  <p className="text-[--text-secondary] leading-relaxed whitespace-pre-wrap">
                    {selectedEvent.description}
                  </p>
                </div>
              ) : (
                <div className="mb-6 p-4 rounded-lg bg-[--bg-elevated] text-center">
                  <p className="text-sm text-[--text-tertiary]">
                    No description yet
                  </p>
                  <button
                    onClick={() => onEventClick(selectedEvent)}
                    className="text-sm text-[--arcane-purple] hover:underline mt-1"
                  >
                    Add one
                  </button>
                </div>
              )}

              {/* Characters */}
              {selectedEvent.characters.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-[--text-tertiary] uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Users className="w-3.5 h-3.5" />
                    Characters Involved
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedEvent.characters.map((char) => (
                      <button
                        key={char.id}
                        onClick={(e) => onCharacterClick(char, e)}
                        className="flex items-center gap-3 p-3 rounded-lg bg-[--bg-elevated] hover:bg-[--arcane-purple]/10 transition-colors text-left"
                      >
                        <div className="relative w-10 h-10 rounded-full overflow-hidden bg-[--bg-surface]">
                          {char.image_url ? (
                            <Image
                              src={char.image_url}
                              alt={char.name}
                              fill
                              className="object-cover"
                              sizes="40px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm font-medium text-[--text-secondary]">
                              {getInitials(char.name)}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-[--text-primary]">{char.name}</p>
                          <p className="text-xs text-[--text-tertiary] capitalize">{char.type}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[--text-tertiary]">Select an event to view details</p>
          </div>
        )}
      </div>
    </div>
  )
}

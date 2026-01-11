'use client'

import { useState } from 'react'
import { Calendar, Pencil } from 'lucide-react'
import { formatDate, getInitials, cn } from '@/lib/utils'
import Image from 'next/image'
import type { TimelineViewProps, TimelineEventWithCharacters } from './types'

/**
 * Browser View - Two-panel navigation
 * Left: scrollable event list. Right: selected event detail.
 * Clean, functional, familiar pattern.
 */
export function BrowserView({ events, onEventClick, onCharacterClick }: TimelineViewProps) {
  const [selected, setSelected] = useState<TimelineEventWithCharacters | null>(
    events.length > 0 ? events[0] : null
  )

  if (events.length === 0) return null

  return (
    <div className="flex gap-6 h-[600px]">
      {/* Left Panel - Event List */}
      <div className="w-80 flex-shrink-0 rounded-2xl bg-[--bg-surface] border border-[--border] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-[--border]">
          <h3 className="font-semibold text-[--text-primary]">Events</h3>
          <p className="text-sm text-[--text-tertiary]">{events.length} total</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {events.map((event) => {
            const isSelected = selected?.id === event.id
            return (
              <button
                key={event.id}
                onClick={() => setSelected(event)}
                className={cn(
                  "w-full text-left p-4 border-b border-[--border]/50 transition-colors",
                  isSelected
                    ? "bg-[--arcane-purple]/10 border-l-2 border-l-[--arcane-purple]"
                    : "hover:bg-[--bg-elevated]/50 border-l-2 border-l-transparent"
                )}
              >
                <p className="text-xs text-[--text-tertiary] mb-1 tabular-nums">
                  {formatDate(event.event_date)}
                </p>
                <h4 className={cn(
                  "font-medium leading-snug",
                  isSelected ? "text-[--text-primary]" : "text-[--text-secondary]"
                )}>
                  {event.title}
                </h4>
                {event.characters.length > 0 && (
                  <div className="flex -space-x-1 mt-2">
                    {event.characters.slice(0, 3).map((char) => (
                      <div
                        key={char.id}
                        className="w-5 h-5 rounded-full overflow-hidden border border-[--bg-surface] bg-[--bg-elevated]"
                      >
                        {char.image_url ? (
                          <Image
                            src={char.image_url}
                            alt={char.name}
                            width={20}
                            height={20}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[8px] text-[--text-tertiary]">
                            {getInitials(char.name)}
                          </div>
                        )}
                      </div>
                    ))}
                    {event.characters.length > 3 && (
                      <div className="w-5 h-5 rounded-full border border-[--bg-surface] bg-[--bg-elevated] flex items-center justify-center text-[8px] text-[--text-tertiary]">
                        +{event.characters.length - 3}
                      </div>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Right Panel - Event Detail */}
      <div className="flex-1 rounded-2xl bg-[--bg-surface] border border-[--border] overflow-hidden flex flex-col">
        {selected ? (
          <>
            {/* Detail Header */}
            <div className="p-6 border-b border-[--border]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <time className="text-sm text-[--text-tertiary] flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {formatDate(selected.event_date)}
                    </time>
                    <span className="text-xs text-[--arcane-purple] font-medium uppercase tracking-wide">
                      {selected.event_type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <h2 className="text-2xl font-semibold text-[--text-primary]">
                    {selected.title}
                  </h2>
                </div>
                <button
                  onClick={() => onEventClick(selected)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[--bg-elevated] border border-[--border] text-sm text-[--text-secondary] hover:text-[--text-primary] hover:border-[--arcane-purple]/50 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </button>
              </div>
            </div>

            {/* Detail Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Description */}
              <section className="mb-8">
                <h3 className="text-xs text-[--text-tertiary] uppercase tracking-wider mb-3">
                  Description
                </h3>
                {selected.description ? (
                  <p className="text-[--text-secondary] leading-relaxed whitespace-pre-wrap">
                    {selected.description}
                  </p>
                ) : (
                  <p className="text-[--text-tertiary] italic">
                    No description yet.{' '}
                    <button
                      onClick={() => onEventClick(selected)}
                      className="text-[--arcane-purple] hover:underline"
                    >
                      Add one
                    </button>
                  </p>
                )}
              </section>

              {/* Characters */}
              {selected.characters.length > 0 && (
                <section>
                  <h3 className="text-xs text-[--text-tertiary] uppercase tracking-wider mb-3">
                    Characters ({selected.characters.length})
                  </h3>
                  <div className="space-y-2">
                    {selected.characters.map((char) => (
                      <button
                        key={char.id}
                        onClick={(e) => onCharacterClick(char, e)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-[--bg-elevated] border border-[--border] hover:border-[--arcane-gold]/50 transition-colors text-left"
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
                            <div className="w-full h-full flex items-center justify-center text-sm font-medium text-[--text-tertiary]">
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
                </section>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[--text-tertiary]">Select an event</p>
          </div>
        )}
      </div>
    </div>
  )
}

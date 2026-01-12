'use client'

import { useState } from 'react'
import { Calendar, Pencil } from 'lucide-react'
import { formatDate, getInitials } from '@/lib/utils'
import Image from 'next/image'
import type { TimelineViewProps, TimelineEventWithCharacters } from './types'

/**
 * Browser View - Two-panel navigation
 * Wider left panel (35%), detail on right. Clean and functional.
 */
export function BrowserView({ events, onEventClick, onCharacterClick }: TimelineViewProps) {
  const [selected, setSelected] = useState<TimelineEventWithCharacters | null>(
    events.length > 0 ? events[0] : null
  )

  if (events.length === 0) return null

  return (
    <div className="flex gap-6 h-[650px]">
      {/* Left Panel - Event List (35% width) */}
      <div
        className="w-[35%] min-w-[320px] flex-shrink-0 rounded-xl overflow-hidden flex flex-col"
        style={{
          backgroundColor: '#12121a',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <h3
            className="text-lg font-bold"
            style={{ color: '#f3f4f6' }}
          >
            Events
          </h3>
          <p
            className="text-sm mt-1"
            style={{ color: '#6b7280' }}
          >
            {events.length} total
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {events.map((event) => {
            const isSelected = selected?.id === event.id
            return (
              <button
                key={event.id}
                onClick={() => setSelected(event)}
                className="w-full text-left p-5 transition-colors"
                style={{
                  backgroundColor: isSelected ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  borderLeft: isSelected ? '3px solid #8B5CF6' : '3px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <p
                  className="text-xs font-medium mb-2 tabular-nums"
                  style={{ color: '#6b7280' }}
                >
                  {formatDate(event.event_date)}
                </p>
                <h4
                  className="text-base font-semibold leading-snug mb-2"
                  style={{ color: isSelected ? '#f3f4f6' : '#d1d5db' }}
                >
                  {event.title}
                </h4>
                {event.characters.length > 0 && (
                  <div className="flex -space-x-1.5 mt-3">
                    {event.characters.slice(0, 4).map((char) => (
                      <div
                        key={char.id}
                        className="w-7 h-7 rounded-full overflow-hidden"
                        style={{
                          backgroundColor: '#1a1a24',
                          border: '2px solid #12121a',
                        }}
                      >
                        {char.image_url ? (
                          <Image
                            src={char.image_url}
                            alt={char.name}
                            width={28}
                            height={28}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center text-[10px] font-bold"
                            style={{ color: '#6b7280' }}
                          >
                            {getInitials(char.name)}
                          </div>
                        )}
                      </div>
                    ))}
                    {event.characters.length > 4 && (
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
                        style={{
                          backgroundColor: '#1a1a24',
                          border: '2px solid #12121a',
                          color: '#6b7280'
                        }}
                      >
                        +{event.characters.length - 4}
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
      <div
        className="flex-1 rounded-xl overflow-hidden flex flex-col"
        style={{
          backgroundColor: '#12121a',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {selected ? (
          <>
            {/* Detail Header */}
            <div className="p-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-4 mb-3">
                    <time
                      className="text-sm font-medium flex items-center gap-2"
                      style={{ color: '#6b7280' }}
                    >
                      <Calendar className="w-4 h-4" />
                      {formatDate(selected.event_date)}
                    </time>
                    <span
                      className="text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded"
                      style={{
                        backgroundColor: 'rgba(139, 92, 246, 0.15)',
                        color: '#a78bfa'
                      }}
                    >
                      {selected.event_type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <h2
                    className="text-2xl font-bold"
                    style={{ color: '#f3f4f6' }}
                  >
                    {selected.title}
                  </h2>
                </div>
                <button
                  onClick={() => onEventClick(selected)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors"
                  style={{
                    backgroundColor: '#1a1a24',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#9ca3af'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.5)'
                    e.currentTarget.style.color = '#f3f4f6'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                    e.currentTarget.style.color = '#9ca3af'
                  }}
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
                <h3
                  className="text-xs font-bold uppercase tracking-wider mb-4"
                  style={{ color: '#6b7280' }}
                >
                  Description
                </h3>
                {selected.description ? (
                  <p
                    className="text-base leading-relaxed whitespace-pre-wrap"
                    style={{ color: '#d1d5db', lineHeight: '1.8' }}
                  >
                    {selected.description}
                  </p>
                ) : (
                  <p style={{ color: '#4b5563' }}>
                    No description yet.{' '}
                    <button
                      onClick={() => onEventClick(selected)}
                      className="transition-colors"
                      style={{ color: '#8B5CF6' }}
                      onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                      onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                    >
                      Add one
                    </button>
                  </p>
                )}
              </section>

              {/* Characters */}
              {selected.characters.length > 0 && (
                <section>
                  <h3
                    className="text-xs font-bold uppercase tracking-wider mb-4"
                    style={{ color: '#6b7280' }}
                  >
                    Characters ({selected.characters.length})
                  </h3>
                  <div className="space-y-3">
                    {selected.characters.map((char) => (
                      <button
                        key={char.id}
                        onClick={(e) => onCharacterClick(char, e)}
                        className="w-full flex items-center gap-4 p-4 rounded-xl text-left transition-colors"
                        style={{
                          backgroundColor: '#1a1a24',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(212, 168, 67, 0.5)'
                          e.currentTarget.style.backgroundColor = 'rgba(212, 168, 67, 0.05)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                          e.currentTarget.style.backgroundColor = '#1a1a24'
                        }}
                      >
                        <div
                          className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0"
                          style={{ backgroundColor: '#0a0a0f' }}
                        >
                          {char.image_url ? (
                            <Image
                              src={char.image_url}
                              alt={char.name}
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center text-base font-bold"
                              style={{ color: '#6b7280' }}
                            >
                              {getInitials(char.name)}
                            </div>
                          )}
                        </div>
                        <div>
                          <p
                            className="text-base font-semibold"
                            style={{ color: '#f3f4f6' }}
                          >
                            {char.name}
                          </p>
                          <p
                            className="text-sm capitalize mt-0.5"
                            style={{ color: '#6b7280' }}
                          >
                            {char.type}
                          </p>
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
            <p style={{ color: '#4b5563' }}>Select an event</p>
          </div>
        )}
      </div>
    </div>
  )
}

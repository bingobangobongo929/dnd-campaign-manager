'use client'

import { formatDate, getInitials } from '@/lib/utils'
import Image from 'next/image'
import type { TimelineViewProps } from './types'

/**
 * Feed View - Clean vertical card stack
 * Generous spacing, clear hierarchy, no cramping
 */
export function FeedView({ events, onEventClick, onCharacterClick }: TimelineViewProps) {
  if (events.length === 0) return null

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {events.map((event) => (
        <article
          key={event.id}
          onClick={() => onEventClick(event)}
          className="group cursor-pointer"
        >
          <div
            className="p-6 rounded-xl transition-all duration-200"
            style={{
              backgroundColor: '#12121a',
              border: '3px solid purple', // DEBUG
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.4)'
              e.currentTarget.style.boxShadow = '0 4px 24px rgba(139, 92, 246, 0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            {/* Header: Date and Category */}
            <div className="flex items-center justify-between mb-4">
              <time
                className="text-sm font-medium tabular-nums"
                style={{ color: '#9ca3af' }}
              >
                {formatDate(event.event_date)}
              </time>
              <span
                className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full"
                style={{
                  backgroundColor: 'rgba(139, 92, 246, 0.15)',
                  color: '#a78bfa'
                }}
              >
                {event.event_type.replace(/_/g, ' ')}
              </span>
            </div>

            {/* Title */}
            <h3
              className="text-xl font-semibold mb-4 leading-relaxed transition-colors"
              style={{ color: '#f3f4f6' }}
            >
              {event.title}
            </h3>

            {/* Description */}
            {event.description && (
              <p
                className="text-base leading-relaxed mb-6"
                style={{ color: '#9ca3af', lineHeight: '1.7' }}
              >
                {event.description}
              </p>
            )}

            {/* Characters Section */}
            {event.characters.length > 0 && (
              <div
                className="pt-5 mt-5"
                style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
              >
                <p
                  className="text-xs font-bold uppercase tracking-wider mb-4"
                  style={{ color: '#6b7280' }}
                >
                  Characters
                </p>
                <div className="flex flex-wrap gap-3">
                  {event.characters.map((char) => (
                    <button
                      key={char.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        onCharacterClick(char, e)
                      }}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all"
                      style={{
                        backgroundColor: '#1a1a24',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(212, 168, 67, 0.5)'
                        e.currentTarget.style.backgroundColor = 'rgba(212, 168, 67, 0.08)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                        e.currentTarget.style.backgroundColor = '#1a1a24'
                      }}
                    >
                      <div
                        className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0"
                        style={{ backgroundColor: '#0a0a0f' }}
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
                          <div
                            className="w-full h-full flex items-center justify-center text-xs font-bold"
                            style={{ color: '#6b7280' }}
                          >
                            {getInitials(char.name)}
                          </div>
                        )}
                      </div>
                      <span
                        className="text-sm font-medium"
                        style={{ color: '#d1d5db' }}
                      >
                        {char.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </article>
      ))}
    </div>
  )
}

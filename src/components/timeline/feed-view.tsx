'use client'

import { formatDate, getInitials } from '@/lib/utils'
import Image from 'next/image'
import type { TimelineViewProps } from './types'

/**
 * Feed View - "The Chronicle"
 * Clean vertical card stack with generous spacing and clear hierarchy
 */
export function FeedView({ events, onEventClick, onCharacterClick }: TimelineViewProps) {
  if (events.length === 0) return null

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {events.map((event) => (
        <article
          key={event.id}
          onClick={() => onEventClick(event)}
          className="group cursor-pointer"
        >
          <div
            className="p-6 rounded-xl transition-all duration-300"
            style={{
              backgroundColor: 'rgba(18, 18, 26, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              backdropFilter: 'blur(8px)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)'
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(139, 92, 246, 0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            {/* Header Row: Date + Event Type */}
            <div className="flex items-center justify-between mb-4">
              <time
                className="text-sm font-medium tabular-nums"
                style={{ color: '#9ca3af' }}
              >
                {formatDate(event.event_date)}
              </time>
              <span
                className="text-[11px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full"
                style={{
                  backgroundColor: 'rgba(139, 92, 246, 0.12)',
                  color: '#a78bfa',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                }}
              >
                {event.event_type.replace(/_/g, ' ')}
              </span>
            </div>

            {/* Title */}
            <h3
              className="text-xl font-semibold mb-3 leading-snug group-hover:text-[#a78bfa] transition-colors"
              style={{ color: '#f3f4f6' }}
            >
              {event.title}
            </h3>

            {/* Description */}
            {event.description && (
              <p
                className="text-[15px] leading-relaxed mb-5"
                style={{ color: '#9ca3af', lineHeight: '1.7' }}
              >
                {event.description.length > 280
                  ? event.description.slice(0, 280) + '...'
                  : event.description}
              </p>
            )}

            {/* Characters Section */}
            {event.characters.length > 0 && (
              <div
                className="pt-5"
                style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}
              >
                <p
                  className="text-[11px] font-semibold uppercase tracking-wider mb-3"
                  style={{ color: '#6b7280' }}
                >
                  Characters
                </p>
                <div className="flex flex-wrap gap-2">
                  {event.characters.map((char) => (
                    <button
                      key={char.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        onCharacterClick(char, e)
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200"
                      style={{
                        backgroundColor: 'rgba(26, 26, 36, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(212, 168, 67, 0.4)'
                        e.currentTarget.style.backgroundColor = 'rgba(212, 168, 67, 0.08)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)'
                        e.currentTarget.style.backgroundColor = 'rgba(26, 26, 36, 0.8)'
                      }}
                    >
                      <div
                        className="relative w-7 h-7 rounded-full overflow-hidden flex-shrink-0"
                        style={{ backgroundColor: '#0a0a0f' }}
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
                          <div
                            className="w-full h-full flex items-center justify-center text-[10px] font-bold"
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

'use client'

import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDate, getInitials } from '@/lib/utils'
import Image from 'next/image'
import type { TimelineViewProps } from './types'

/**
 * Storyboard View - "The Tapestry"
 * Horizontal filmstrip with smooth scrolling and clear cards
 */
export function StoryboardView({ events, onEventClick, onCharacterClick }: TimelineViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  if (events.length === 0) return null

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const amount = 380 // Card width + gap
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
        className="absolute left-6 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200"
        style={{
          backgroundColor: 'rgba(18, 18, 26, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          color: '#9ca3af',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.4)'
          e.currentTarget.style.color = '#f3f4f6'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'
          e.currentTarget.style.color = '#9ca3af'
        }}
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={() => scroll('right')}
        className="absolute right-6 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200"
        style={{
          backgroundColor: 'rgba(18, 18, 26, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          color: '#9ca3af',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.4)'
          e.currentTarget.style.color = '#f3f4f6'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'
          e.currentTarget.style.color = '#9ca3af'
        }}
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
            className="flex-shrink-0 w-[360px] snap-center cursor-pointer group"
          >
            <div
              className="h-full rounded-xl overflow-hidden transition-all duration-300"
              style={{
                backgroundColor: 'rgba(18, 18, 26, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.35)'
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(139, 92, 246, 0.12)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              {/* Card Header */}
              <div className="p-5" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded"
                    style={{
                      backgroundColor: 'rgba(139, 92, 246, 0.12)',
                      color: '#a78bfa',
                      border: '1px solid rgba(139, 92, 246, 0.2)',
                    }}
                  >
                    {event.event_type.replace(/_/g, ' ')}
                  </span>
                  <span
                    className="text-xs font-medium tabular-nums"
                    style={{ color: '#6b7280' }}
                  >
                    {formatDate(event.event_date)}
                  </span>
                </div>
                <h3
                  className="text-lg font-semibold leading-snug group-hover:text-[#a78bfa] transition-colors"
                  style={{ color: '#f3f4f6' }}
                >
                  {event.title}
                </h3>
              </div>

              {/* Card Body */}
              <div className="p-5">
                {event.description ? (
                  <p
                    className="text-sm leading-relaxed mb-5"
                    style={{ color: '#9ca3af', lineHeight: '1.65' }}
                  >
                    {event.description.length > 140
                      ? event.description.slice(0, 140) + '...'
                      : event.description}
                  </p>
                ) : (
                  <p
                    className="text-sm italic mb-5"
                    style={{ color: '#4b5563' }}
                  >
                    No description
                  </p>
                )}

                {/* Characters */}
                {event.characters.length > 0 && (
                  <div
                    className="pt-4"
                    style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}
                  >
                    <div className="flex flex-wrap gap-2">
                      {event.characters.slice(0, 4).map((char) => (
                        <button
                          key={char.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            onCharacterClick(char, e)
                          }}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all duration-200"
                          style={{
                            backgroundColor: 'rgba(26, 26, 36, 0.8)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(212, 168, 67, 0.4)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)'
                          }}
                        >
                          <div
                            className="relative w-5 h-5 rounded-full overflow-hidden"
                            style={{ backgroundColor: '#0a0a0f' }}
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
                              <div
                                className="w-full h-full flex items-center justify-center text-[9px] font-bold"
                                style={{ color: '#6b7280' }}
                              >
                                {getInitials(char.name)}
                              </div>
                            )}
                          </div>
                          <span
                            className="text-xs font-medium"
                            style={{ color: '#d1d5db' }}
                          >
                            {char.name.split(' ')[0]}
                          </span>
                        </button>
                      ))}
                      {event.characters.length > 4 && (
                        <span
                          className="text-xs font-medium self-center px-2"
                          style={{ color: '#6b7280' }}
                        >
                          +{event.characters.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Panel Number */}
              <div className="px-5 pb-4">
                <span
                  className="text-xs font-medium"
                  style={{ color: '#4b5563' }}
                >
                  {index + 1} of {events.length}
                </span>
              </div>
            </div>
          </article>
        ))}

        {/* End spacer for proper scroll */}
        <div className="flex-shrink-0 w-20" />
      </div>

      {/* Fade edges */}
      <div
        className="absolute inset-y-0 left-0 w-20 pointer-events-none"
        style={{ background: 'linear-gradient(to right, var(--bg-base), transparent)' }}
      />
      <div
        className="absolute inset-y-0 right-0 w-20 pointer-events-none"
        style={{ background: 'linear-gradient(to left, var(--bg-base), transparent)' }}
      />
    </div>
  )
}

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
  Book,
  Plus,
  MoreHorizontal,
  Edit2,
  Trash2,
  FolderPlus,
} from 'lucide-react'
import { formatDate, getInitials, cn } from '@/lib/utils'
import Image from 'next/image'
import type { TimelineViewProps, TimelineEventWithCharacters } from './types'
import type { CampaignEra } from '@/types/database'

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
 * Chapters View - "The Codex"
 * Groups events by eras/chapters if available, otherwise by event type
 */
export function ChaptersView({
  events,
  eras = [],
  canAdd = true,
  canEdit = true,
  canDelete = true,
  onEventClick,
  onCharacterClick,
  onEraCreate,
  onEraEdit,
  onEraDelete,
  onEventEraChange,
}: TimelineViewProps) {
  // Track expanded sections
  const [expandedEras, setExpandedEras] = useState<Set<string>>(new Set(eras.map(e => e.id)))
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set())
  const [eraMenuOpen, setEraMenuOpen] = useState<string | null>(null)

  const toggleEra = (eraId: string) => {
    setExpandedEras(prev => {
      const next = new Set(prev)
      if (next.has(eraId)) {
        next.delete(eraId)
      } else {
        next.add(eraId)
      }
      return next
    })
  }

  const toggleType = (type: string) => {
    setExpandedTypes(prev => {
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

  // If we have eras, group by era
  const hasEras = eras.length > 0

  if (hasEras) {
    // Group events by era
    const eventsByEra: Record<string, TimelineEventWithCharacters[]> = {}
    const unassignedEvents: TimelineEventWithCharacters[] = []

    events.forEach(event => {
      if (event.era_id) {
        if (!eventsByEra[event.era_id]) {
          eventsByEra[event.era_id] = []
        }
        eventsByEra[event.era_id].push(event)
      } else {
        unassignedEvents.push(event)
      }
    })

    // Sort eras by sort_order
    const sortedEras = [...eras].sort((a, b) => a.sort_order - b.sort_order)

    return (
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Era-based sections */}
        {sortedEras.map(era => {
          const eraEvents = eventsByEra[era.id] || []
          const isExpanded = expandedEras.has(era.id)

          return (
            <section
              key={era.id}
              className="rounded-xl overflow-hidden"
              style={{
                backgroundColor: 'rgba(18, 18, 26, 0.8)',
                border: `1px solid ${era.color}20`,
              }}
            >
              {/* Era Header */}
              <div className="relative">
                <button
                  onClick={() => toggleEra(era.id)}
                  className="w-full flex items-center gap-4 p-5 text-left transition-all duration-200"
                  style={{
                    backgroundColor: isExpanded ? `${era.color}08` : 'transparent',
                    borderLeft: `4px solid ${era.color}`,
                  }}
                  onMouseEnter={(e) => {
                    if (!isExpanded) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)'
                  }}
                  onMouseLeave={(e) => {
                    if (!isExpanded) e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: `${era.color}15`,
                      border: `1px solid ${era.color}25`,
                    }}
                  >
                    <Book className="w-6 h-6" style={{ color: era.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2
                      className="text-lg font-bold"
                      style={{ color: era.color }}
                    >
                      {era.name}
                    </h2>
                    {era.description && (
                      <p className="text-sm text-gray-500 line-clamp-1">{era.description}</p>
                    )}
                    <p className="text-xs text-gray-600 mt-1">
                      {eraEvents.length} event{eraEvents.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <ChevronDown
                    className="w-5 h-5 transition-transform duration-300"
                    style={{
                      color: '#6b7280',
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                    }}
                  />
                </button>

                {/* Era Actions Menu - only show if user has edit or delete permission */}
                {((canEdit && onEraEdit) || (canDelete && onEraDelete)) && (
                  <div className="absolute right-14 top-1/2 -translate-y-1/2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEraMenuOpen(eraMenuOpen === era.id ? null : era.id)
                      }}
                      className="p-2 hover:bg-white/[0.05] rounded-lg transition-colors"
                    >
                      <MoreHorizontal className="w-4 h-4 text-gray-500" />
                    </button>
                    {eraMenuOpen === era.id && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setEraMenuOpen(null)}
                        />
                        <div className="absolute right-0 top-full mt-1 w-40 rounded-lg shadow-xl z-50 overflow-hidden bg-[#1a1a24] border border-white/10">
                          {canEdit && onEraEdit && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onEraEdit(era)
                                setEraMenuOpen(null)
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/[0.05]"
                            >
                              <Edit2 className="w-4 h-4" />
                              Edit Chapter
                            </button>
                          )}
                          {canDelete && onEraDelete && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (confirm(`Delete "${era.name}"? Events will become unassigned.`)) {
                                  onEraDelete(era.id)
                                }
                                setEraMenuOpen(null)
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-white/[0.05]"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Events List */}
              {isExpanded && (
                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  {eraEvents.length === 0 ? (
                    <p className="text-center py-8 text-gray-500 text-sm">
                      No events in this chapter yet
                    </p>
                  ) : (
                    eraEvents.map((event, index) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        isLast={index === eraEvents.length - 1}
                        onEventClick={onEventClick}
                        onCharacterClick={onCharacterClick}
                      />
                    ))
                  )}
                </div>
              )}
            </section>
          )
        })}

        {/* Unassigned Events */}
        {unassignedEvents.length > 0 && (
          <section
            className="rounded-xl overflow-hidden"
            style={{
              backgroundColor: 'rgba(18, 18, 26, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <button
              onClick={() => toggleEra('unassigned')}
              className="w-full flex items-center gap-4 p-5 text-left transition-all duration-200"
              style={{
                backgroundColor: expandedEras.has('unassigned') ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                borderLeft: '4px solid #6b7280',
              }}
              onMouseEnter={(e) => {
                if (!expandedEras.has('unassigned')) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)'
              }}
              onMouseLeave={(e) => {
                if (!expandedEras.has('unassigned')) e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gray-500/10 border border-gray-500/20">
                <Calendar className="w-6 h-6 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-gray-400">Uncategorized</h2>
                <p className="text-xs text-gray-600 mt-1">
                  {unassignedEvents.length} event{unassignedEvents.length !== 1 ? 's' : ''} not assigned to a chapter
                </p>
              </div>
              <ChevronDown
                className={cn(
                  "w-5 h-5 transition-transform duration-300 text-gray-600",
                  expandedEras.has('unassigned') && "rotate-180"
                )}
              />
            </button>

            {expandedEras.has('unassigned') && (
              <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                {unassignedEvents.map((event, index) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    isLast={index === unassignedEvents.length - 1}
                    onEventClick={onEventClick}
                    onCharacterClick={onCharacterClick}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Add Chapter Button - only show if user has add permission */}
        {canAdd && onEraCreate && (
          <button
            onClick={onEraCreate}
            className="w-full p-4 rounded-xl border-2 border-dashed border-gray-700 hover:border-purple-500/50 transition-colors flex items-center justify-center gap-2 text-gray-500 hover:text-purple-400"
          >
            <Plus className="w-5 h-5" />
            Add Story Chapter
          </button>
        )}
      </div>
    )
  }

  // Fallback: Group events by type (original behavior)
  const grouped = events.reduce((acc, event) => {
    const type = event.event_type || 'other'
    if (!acc[type]) acc[type] = []
    acc[type].push(event)
    return acc
  }, {} as Record<string, TimelineEventWithCharacters[]>)

  const sortedTypes = Object.entries(grouped).sort(([, a], [, b]) => b.length - a.length)

  // Initialize all as expanded
  if (expandedTypes.size === 0 && sortedTypes.length > 0) {
    setExpandedTypes(new Set(sortedTypes.map(([type]) => type)))
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Hint to create chapters - only show if user has add permission */}
      {canAdd && onEraCreate && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 mb-6">
          <div className="flex items-center gap-3">
            <FolderPlus className="w-5 h-5 text-purple-400" />
            <div>
              <p className="text-sm font-medium text-purple-300">Organize your timeline</p>
              <p className="text-xs text-purple-400/70">Create story chapters to group related events</p>
            </div>
          </div>
          <button
            onClick={onEraCreate}
            className="px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 text-sm hover:bg-purple-500/20 transition-colors"
          >
            Create Chapter
          </button>
        </div>
      )}

      {sortedTypes.map(([type, typeEvents]) => {
        const config = EVENT_CONFIG[type] || EVENT_CONFIG.other
        const Icon = config.icon
        const isExpanded = expandedTypes.has(type)

        return (
          <section
            key={type}
            className="rounded-xl overflow-hidden"
            style={{
              backgroundColor: 'rgba(18, 18, 26, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <button
              onClick={() => toggleType(type)}
              className="w-full flex items-center gap-4 p-5 text-left transition-all duration-200"
              style={{
                backgroundColor: isExpanded ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (!isExpanded) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)'
              }}
              onMouseLeave={(e) => {
                if (!isExpanded) e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: `${config.color}15`,
                  border: `1px solid ${config.color}25`,
                }}
              >
                <Icon className="w-6 h-6" style={{ color: config.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-gray-100">{config.label}</h2>
                <p className="text-sm text-gray-500">
                  {typeEvents.length} event{typeEvents.length !== 1 ? 's' : ''}
                </p>
              </div>
              <ChevronDown
                className={cn(
                  "w-5 h-5 transition-transform duration-300 text-gray-600",
                  isExpanded && "rotate-180"
                )}
              />
            </button>

            {isExpanded && (
              <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                {typeEvents.map((event, index) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    isLast={index === typeEvents.length - 1}
                    onEventClick={onEventClick}
                    onCharacterClick={onCharacterClick}
                  />
                ))}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

// Reusable event card component
function EventCard({
  event,
  isLast,
  onEventClick,
  onCharacterClick,
}: {
  event: TimelineEventWithCharacters
  isLast: boolean
  onEventClick: (event: TimelineEventWithCharacters) => void
  onCharacterClick: (character: any, e: React.MouseEvent) => void
}) {
  return (
    <div
      onClick={() => onEventClick(event)}
      className="flex items-start gap-5 p-5 cursor-pointer transition-all duration-200"
      style={{
        borderBottom: !isLast ? '1px solid rgba(255, 255, 255, 0.04)' : 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      {/* Date column */}
      <div className="w-24 flex-shrink-0 pt-0.5">
        <time className="text-sm font-medium tabular-nums text-gray-500">
          {formatDate(event.event_date)}
        </time>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <h3 className="text-base font-semibold leading-snug text-gray-100">
            {event.title}
          </h3>
          {event.is_major && (
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
          )}
        </div>
        {event.description && (
          <p className="text-sm leading-relaxed text-gray-400" style={{ lineHeight: '1.6' }}>
            {event.description.length > 180
              ? event.description.slice(0, 180) + '...'
              : event.description}
          </p>
        )}
      </div>

      {/* Characters */}
      {event.characters.length > 0 && (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="flex -space-x-2">
            {event.characters.slice(0, 4).map((char) => (
              <button
                key={char.id}
                onClick={(e) => {
                  e.stopPropagation()
                  onCharacterClick(char, e)
                }}
                className="relative w-9 h-9 rounded-full overflow-hidden transition-all duration-200 hover:scale-110 hover:z-10"
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
                    sizes="36px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-500">
                    {getInitials(char.name)}
                  </div>
                )}
              </button>
            ))}
          </div>
          {event.characters.length > 4 && (
            <span className="text-xs font-medium ml-1 text-gray-500">
              +{event.characters.length - 4}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import {
  Clock,
  Sparkles,
  Plus,
  Loader2,
  AlertCircle,
  Check,
  Square,
  CheckSquare,
  Calendar,
  User,
  Sword,
  MapPin,
  Star,
  Heart,
  Users,
  Scroll,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import type { Campaign, Character, Session, TimelineEvent } from '@/types/database'

interface GeneratedTimelineEvent {
  title: string
  description: string
  event_type: string
  character_ids: string[]
}

interface HubTimelineProps {
  campaign: Campaign
  characters: Character[]
  sessions: Session[]
  timelineEvents: TimelineEvent[]
  generatedEvents: GeneratedTimelineEvent[]
  selectedIndices: Set<number>
  onToggleEvent: (index: number) => void
  isGenerating: boolean
  error: string | null
  onGenerate: (selectedSessionIds: Set<string>) => Promise<void>
  onAddEvents: () => Promise<void>
  onDataRefresh: () => void
}

const EVENT_TYPE_CONFIG: Record<string, { icon: typeof Star; color: string; label: string }> = {
  plot: { icon: Scroll, color: '#8B5CF6', label: 'Plot' },
  character_intro: { icon: User, color: '#10B981', label: 'Character Intro' },
  character_death: { icon: User, color: '#EF4444', label: 'Character Death' },
  death: { icon: User, color: '#EF4444', label: 'Death' },
  location: { icon: MapPin, color: '#F59E0B', label: 'Location' },
  combat: { icon: Sword, color: '#EF4444', label: 'Combat' },
  revelation: { icon: Star, color: '#A78BFA', label: 'Revelation' },
  discovery: { icon: Star, color: '#60A5FA', label: 'Discovery' },
  quest_start: { icon: Scroll, color: '#10B981', label: 'Quest Start' },
  quest_end: { icon: Scroll, color: '#F59E0B', label: 'Quest End' },
  quest_complete: { icon: Check, color: '#10B981', label: 'Quest Complete' },
  session: { icon: Calendar, color: '#6B7280', label: 'Session' },
  romance: { icon: Heart, color: '#EC4899', label: 'Romance' },
  alliance: { icon: Users, color: '#06B6D4', label: 'Alliance' },
  other: { icon: Star, color: '#6B7280', label: 'Other' },
}

export function HubTimeline({
  campaign,
  characters,
  sessions,
  timelineEvents,
  generatedEvents,
  selectedIndices,
  onToggleEvent,
  isGenerating,
  error,
  onGenerate,
  onAddEvents,
  onDataRefresh,
}: HubTimelineProps) {
  const [mode, setMode] = useState<'view' | 'generate'>('view')
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set())
  const [isAdding, setIsAdding] = useState(false)
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())

  const toggleSession = (sessionId: string) => {
    setSelectedSessionIds(prev => {
      const next = new Set(prev)
      if (next.has(sessionId)) next.delete(sessionId)
      else next.add(sessionId)
      return next
    })
  }

  const selectAllSessions = () => {
    setSelectedSessionIds(new Set(sessions.map(s => s.id)))
  }

  const handleGenerate = async () => {
    await onGenerate(selectedSessionIds)
  }

  const handleAddEvents = async () => {
    setIsAdding(true)
    try {
      await onAddEvents()
      setMode('view')
    } finally {
      setIsAdding(false)
    }
  }

  const toggleEventExpanded = (eventId: string) => {
    setExpandedEvents(prev => {
      const next = new Set(prev)
      if (next.has(eventId)) next.delete(eventId)
      else next.add(eventId)
      return next
    })
  }

  const getCharacterNames = (characterIds: string[] | null): string => {
    if (!characterIds || characterIds.length === 0) return ''
    return characterIds
      .map(id => characters.find(c => c.id === id)?.name)
      .filter(Boolean)
      .join(', ')
  }

  // Group timeline events by type for stats
  const eventsByType = timelineEvents.reduce((acc, e) => {
    acc[e.event_type] = (acc[e.event_type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <aside className="intelligence-hub-sidebar">
        <div className="space-y-6">
          {/* Mode Toggle */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#6b7280' }}>
              Mode
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => setMode('view')}
                className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-all flex items-center gap-2 ${
                  mode === 'view' ? 'ring-1 ring-amber-400/30 bg-amber-400/10' : 'hover:bg-white/5'
                }`}
                style={{ color: mode === 'view' ? '#fbbf24' : '#9ca3af' }}
              >
                <Clock className="w-4 h-4" />
                View Timeline
              </button>
              <button
                onClick={() => setMode('generate')}
                className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-all flex items-center gap-2 ${
                  mode === 'generate' ? 'ring-1 ring-purple-400/30 bg-purple-400/10' : 'hover:bg-white/5'
                }`}
                style={{ color: mode === 'generate' ? '#a78bfa' : '#9ca3af' }}
              >
                <Sparkles className="w-4 h-4" />
                Generate Events
              </button>
            </div>
          </div>

          {/* Stats */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#6b7280' }}>
              Timeline Stats
            </h3>
            <div
              className="p-3 rounded-lg space-y-2"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
            >
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: '#9ca3af' }}>Total Events</span>
                <span className="font-semibold" style={{ color: '#f3f4f6' }}>{timelineEvents.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: '#9ca3af' }}>Sessions</span>
                <span className="font-semibold" style={{ color: '#f3f4f6' }}>{sessions.length}</span>
              </div>
            </div>
          </div>

          {/* Event Type Breakdown */}
          {Object.keys(eventsByType).length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#6b7280' }}>
                By Type
              </h3>
              <div className="space-y-1">
                {Object.entries(eventsByType)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => {
                    const config = EVENT_TYPE_CONFIG[type] || EVENT_TYPE_CONFIG.other
                    return (
                      <div
                        key={type}
                        className="flex items-center gap-2 text-sm px-2 py-1.5"
                      >
                        <config.icon className="w-3.5 h-3.5" style={{ color: config.color }} />
                        <span className="flex-1" style={{ color: '#9ca3af' }}>{config.label}</span>
                        <span className="text-xs" style={{ color: '#6b7280' }}>{count}</span>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {/* Quick Link to Full Timeline */}
          <a
            href={`/campaigns/${campaign.id}/timeline`}
            className="w-full text-sm px-3 py-2 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-2"
            style={{ color: '#9ca3af' }}
          >
            <ExternalLink className="w-4 h-4" />
            Open Full Timeline
          </a>
        </div>
      </aside>

      {/* Main content */}
      <main className="intelligence-hub-content">
        {/* Error display */}
        {error && (
          <div
            className="flex items-center gap-3 p-4 rounded-xl mb-4"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
            }}
          >
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* View Mode */}
        {mode === 'view' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold" style={{ color: '#f3f4f6' }}>
                {timelineEvents.length} Timeline Event{timelineEvents.length !== 1 ? 's' : ''}
              </h2>
            </div>

            {timelineEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
                  style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                  }}
                >
                  <Clock className="w-8 h-8 text-amber-400" />
                </div>
                <p className="text-lg font-semibold mb-2" style={{ color: '#f3f4f6' }}>
                  No Timeline Events Yet
                </p>
                <p className="text-sm text-center max-w-md mb-6" style={{ color: '#6b7280' }}>
                  Generate events from your session notes or create them manually on the Timeline page.
                </p>
                <button
                  className="btn btn-primary flex items-center gap-2"
                  onClick={() => setMode('generate')}
                >
                  <Sparkles className="w-4 h-4" />
                  Generate from Sessions
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {timelineEvents
                  .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())
                  .map(event => {
                    const config = EVENT_TYPE_CONFIG[event.event_type] || EVENT_TYPE_CONFIG.other
                    const isExpanded = expandedEvents.has(event.id)
                    const charNames = getCharacterNames(event.character_ids)

                    return (
                      <div
                        key={event.id}
                        className="rounded-xl overflow-hidden"
                        style={{
                          backgroundColor: 'rgba(26, 26, 36, 0.6)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                        }}
                      >
                        <button
                          onClick={() => toggleEventExpanded(event.id)}
                          className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors"
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{
                              backgroundColor: `${config.color}15`,
                              border: `1px solid ${config.color}30`,
                            }}
                          >
                            <config.icon className="w-4 h-4" style={{ color: config.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate" style={{ color: '#f3f4f6' }}>
                              {event.title}
                            </p>
                            <div className="flex items-center gap-2 text-xs" style={{ color: '#6b7280' }}>
                              <span>{new Date(event.event_date).toLocaleDateString()}</span>
                              {charNames && (
                                <>
                                  <span>•</span>
                                  <span className="truncate">{charNames}</span>
                                </>
                              )}
                            </div>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" style={{ color: '#6b7280' }} />
                          ) : (
                            <ChevronDown className="w-4 h-4" style={{ color: '#6b7280' }} />
                          )}
                        </button>
                        {isExpanded && event.description && (
                          <div
                            className="px-4 pb-4 pt-0"
                            style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}
                          >
                            <p className="text-sm" style={{ color: '#9ca3af' }}>
                              {event.description}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })}
              </div>
            )}
          </>
        )}

        {/* Generate Mode */}
        {mode === 'generate' && !isGenerating && generatedEvents.length === 0 && (
          <>
            <div className="mb-4">
              <h2 className="font-semibold mb-1" style={{ color: '#f3f4f6' }}>
                Generate Timeline Events
              </h2>
              <p className="text-sm" style={{ color: '#6b7280' }}>
                Select sessions to analyze for timeline events
              </p>
            </div>

            {sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <p className="text-lg font-semibold mb-2" style={{ color: '#f3f4f6' }}>
                  No Sessions Available
                </p>
                <p className="text-sm text-center max-w-md" style={{ color: '#6b7280' }}>
                  Create some sessions with notes first, then you can generate timeline events from them.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <button
                    className="text-sm px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-2"
                    style={{ color: '#9ca3af' }}
                    onClick={selectAllSessions}
                  >
                    <CheckSquare className="w-4 h-4" />
                    Select All
                  </button>
                  <button
                    className="text-sm px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-2"
                    style={{ color: '#9ca3af' }}
                    onClick={() => setSelectedSessionIds(new Set())}
                  >
                    <Square className="w-4 h-4" />
                    Clear
                  </button>
                  <span className="text-xs ml-auto" style={{ color: '#6b7280' }}>
                    {selectedSessionIds.size} of {sessions.length} selected
                  </span>
                </div>

                <div className="space-y-2 mb-6">
                  {sessions
                    .sort((a, b) => b.session_number - a.session_number)
                    .map(session => {
                      const isSelected = selectedSessionIds.has(session.id)
                      const hasNotes = session.notes && session.notes.length > 0
                      return (
                        <button
                          key={session.id}
                          onClick={() => toggleSession(session.id)}
                          disabled={!hasNotes}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                            !hasNotes ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          style={{
                            backgroundColor: isSelected ? 'rgba(139, 92, 246, 0.1)' : 'rgba(26, 26, 36, 0.6)',
                            border: isSelected ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)',
                          }}
                        >
                          <div
                            className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                              isSelected ? 'bg-[#8B5CF6]' : ''
                            }`}
                            style={{
                              border: isSelected ? 'none' : '2px solid rgba(255, 255, 255, 0.2)',
                            }}
                          >
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium" style={{ color: '#f3f4f6' }}>
                              Session {session.session_number}
                              {session.title && `: ${session.title}`}
                            </p>
                            <p className="text-xs" style={{ color: '#6b7280' }}>
                              {session.date} • {hasNotes ? `${session.notes!.length} chars of notes` : 'No notes'}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                </div>

                <button
                  className="btn btn-primary flex items-center gap-2"
                  onClick={handleGenerate}
                  disabled={selectedSessionIds.size === 0}
                >
                  <Sparkles className="w-4 h-4" />
                  Generate Events from {selectedSessionIds.size} Session{selectedSessionIds.size !== 1 ? 's' : ''}
                </button>
              </>
            )}
          </>
        )}

        {/* Generating state */}
        {isGenerating && (
          <div className="flex flex-col items-center justify-center py-20">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
              style={{
                backgroundColor: 'rgba(139, 92, 246, 0.15)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
              }}
            >
              <Loader2 className="w-8 h-8 text-[#8B5CF6] animate-spin" />
            </div>
            <p className="text-lg font-semibold mb-2" style={{ color: '#f3f4f6' }}>
              Generating Timeline Events
            </p>
            <p className="text-sm text-center max-w-md" style={{ color: '#6b7280' }}>
              Analyzing session notes for significant events...
            </p>
          </div>
        )}

        {/* Review generated events */}
        {mode === 'generate' && !isGenerating && generatedEvents.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold" style={{ color: '#f3f4f6' }}>
                  {generatedEvents.length} Event{generatedEvents.length !== 1 ? 's' : ''} Generated
                </h2>
                <p className="text-xs" style={{ color: '#6b7280' }}>
                  {selectedIndices.size} selected to add
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="text-sm px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                  style={{ color: '#9ca3af' }}
                  onClick={() => {
                    // Select all generated events
                    const allIndices = new Set(generatedEvents.map((_, i) => i))
                    generatedEvents.forEach((_, i) => {
                      if (!selectedIndices.has(i)) onToggleEvent(i)
                    })
                  }}
                >
                  Select All
                </button>
                <button
                  className="btn btn-primary flex items-center gap-2"
                  onClick={handleAddEvents}
                  disabled={selectedIndices.size === 0 || isAdding}
                >
                  {isAdding ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Add {selectedIndices.size} Event{selectedIndices.size !== 1 ? 's' : ''}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {generatedEvents.map((event, index) => {
                const config = EVENT_TYPE_CONFIG[event.event_type] || EVENT_TYPE_CONFIG.other
                const isSelected = selectedIndices.has(index)
                const charNames = getCharacterNames(event.character_ids)

                return (
                  <button
                    key={index}
                    onClick={() => onToggleEvent(index)}
                    className="w-full flex items-start gap-3 p-4 rounded-xl text-left transition-all"
                    style={{
                      backgroundColor: isSelected ? 'rgba(139, 92, 246, 0.1)' : 'rgba(26, 26, 36, 0.6)',
                      border: isSelected ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isSelected ? 'bg-[#8B5CF6]' : ''
                      }`}
                      style={{
                        border: isSelected ? 'none' : '2px solid rgba(255, 255, 255, 0.2)',
                      }}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: `${config.color}15`,
                        border: `1px solid ${config.color}30`,
                      }}
                    >
                      <config.icon className="w-4 h-4" style={{ color: config.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded"
                          style={{
                            backgroundColor: `${config.color}15`,
                            color: config.color,
                          }}
                        >
                          {config.label}
                        </span>
                      </div>
                      <p className="font-medium mb-1" style={{ color: '#f3f4f6' }}>
                        {event.title}
                      </p>
                      {event.description && (
                        <p className="text-sm mb-2 line-clamp-2" style={{ color: '#9ca3af' }}>
                          {event.description}
                        </p>
                      )}
                      {charNames && (
                        <p className="text-xs" style={{ color: '#6b7280' }}>
                          Characters: {charNames}
                        </p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  Users,
  BookOpen,
  Map,
  Network,
  Image as ImageIcon,
  Calendar,
  Scroll,
  Castle,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  Sword,
  Shield,
  Crown,
  Star,
  ChevronRight,
  Play,
  X,
  ZoomIn,
  ExternalLink,
} from 'lucide-react'
import { getInitials, formatDate } from '@/lib/utils'
import { ReadOnlyCanvas } from './read-only-canvas'
import { RelationshipGraph } from './relationship-graph'

interface CampaignShareClientProps {
  campaign: any
  sections: Record<string, boolean>
  availableTabs: string[]
  pcs: any[]
  npcs: any[]
  sessions: any[]
  sessionAttendees: Record<string, any[]>
  timelineEvents: any[]
  worldMaps: any[]
  relationships: any[]
  lore: any[]
  gallery: any[]
  canvasGroups: any[]
  characterTags: Record<string, any[]>
  characters: any[]
}

const TAB_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  overview: BookOpen,
  party: Users,
  cast: Users,
  story: Scroll,
  world: Castle,
  relationships: Network,
  canvas: Map,
  gallery: ImageIcon,
}

const TAB_LABELS: Record<string, string> = {
  overview: 'Overview',
  party: 'The Party',
  cast: 'The Cast',
  story: 'The Story',
  world: 'The World',
  relationships: 'Relationships',
  canvas: 'Canvas',
  gallery: 'Gallery',
}

const EVENT_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  combat: Sword,
  discovery: Star,
  npc_interaction: Users,
  location_visit: MapPin,
  quest_start: Play,
  quest_complete: Crown,
  level_up: Shield,
  death: X,
  resurrection: Star,
  acquisition: Star,
  plot_point: BookOpen,
  character_moment: Users,
  world_event: Castle,
  session_start: Play,
  session_end: Clock,
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  combat: 'bg-red-500/15 text-red-400 border-red-500/20',
  discovery: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  npc_interaction: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  location_visit: 'bg-green-500/15 text-green-400 border-green-500/20',
  quest_start: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  quest_complete: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  level_up: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  death: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
  resurrection: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  acquisition: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  plot_point: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
  character_moment: 'bg-pink-500/15 text-pink-400 border-pink-500/20',
  world_event: 'bg-teal-500/15 text-teal-400 border-teal-500/20',
  session_start: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
  session_end: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
}

const LORE_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  family_tree: Users,
  faction: Shield,
  timeline: Clock,
  location: MapPin,
  artifact: Star,
  prophecy: BookOpen,
}

function markdownToHtml(text: string): string {
  if (!text) return ''
  if (text.includes('<ul>') || text.includes('<li>') || text.includes('<p>')) {
    return text
  }
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br/>')
}

export function CampaignShareClient({
  campaign,
  sections,
  availableTabs,
  pcs,
  npcs,
  sessions,
  sessionAttendees,
  timelineEvents,
  worldMaps,
  relationships,
  lore,
  gallery,
  canvasGroups,
  characterTags,
  characters,
}: CampaignShareClientProps) {
  const [activeTab, setActiveTab] = useState(availableTabs[0] || 'overview')
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())
  const [expandedCharacters, setExpandedCharacters] = useState<Set<string>>(new Set())
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [timelineView, setTimelineView] = useState<'feed' | 'journal'>('feed')

  const toggleSession = (id: string) => {
    setExpandedSessions(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleCharacter = (id: string) => {
    setExpandedCharacters(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Group lore by type
  const loreByType = lore.reduce((acc, item) => {
    const type = item.lore_type || 'other'
    if (!acc[type]) acc[type] = []
    acc[type].push(item)
    return acc
  }, {} as Record<string, any[]>)

  // Group events by session
  const eventsBySession = timelineEvents.reduce((acc, event) => {
    const sessionId = event.session_id || 'unassigned'
    if (!acc[sessionId]) acc[sessionId] = []
    acc[sessionId].push(event)
    return acc
  }, {} as Record<string, any[]>)

  return (
    <div className="min-h-screen bg-[#0a0a0c]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a0c]/95 backdrop-blur-sm border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 sm:py-6">
            <div className="flex items-center gap-4">
              {campaign.cover_image_url && (
                <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-xl overflow-hidden flex-shrink-0">
                  <Image
                    src={campaign.cover_image_url}
                    alt={campaign.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white truncate">
                  {campaign.name}
                </h1>
                {campaign.game_system && (
                  <p className="text-sm text-gray-400 mt-0.5">{campaign.game_system}</p>
                )}
              </div>
              {campaign.status && (
                <span className={`px-3 py-1 text-xs font-medium rounded-full flex-shrink-0 ${
                  campaign.status === 'active' ? 'bg-green-500/15 text-green-400' :
                  campaign.status === 'completed' ? 'bg-blue-500/15 text-blue-400' :
                  campaign.status === 'paused' ? 'bg-yellow-500/15 text-yellow-400' :
                  'bg-gray-500/15 text-gray-400'
                }`}>
                  {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                </span>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          {availableTabs.length > 1 && (
            <nav className="flex gap-1 pb-2 overflow-x-auto scrollbar-hide">
              {availableTabs.map(tab => {
                const Icon = TAB_ICONS[tab] || BookOpen
                const isActive = activeTab === tab
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                      isActive
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{TAB_LABELS[tab]}</span>
                  </button>
                )
              })}
            </nav>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {sections.campaignInfo && campaign.description && (
              <div className="p-6 bg-white/[0.02] rounded-2xl border border-white/[0.06]">
                <h2 className="text-lg font-semibold text-white mb-4">About This Campaign</h2>
                <div
                  className="prose prose-invert prose-sm max-w-none text-gray-300"
                  dangerouslySetInnerHTML={{ __html: markdownToHtml(campaign.description) }}
                />
              </div>
            )}

            {sections.partySummary && pcs.length > 0 && (
              <div className="p-6 bg-white/[0.02] rounded-2xl border border-white/[0.06]">
                <h2 className="text-lg font-semibold text-white mb-4">The Adventuring Party</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {pcs.map(pc => (
                    <div key={pc.id} className="text-center">
                      <div className="relative w-20 h-20 mx-auto rounded-full overflow-hidden mb-2 border-2 border-purple-500/30">
                        {pc.image_url ? (
                          <Image src={pc.image_url} alt={pc.name} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full bg-purple-500/10 flex items-center justify-center">
                            <span className="text-xl font-bold text-purple-400">{getInitials(pc.name)}</span>
                          </div>
                        )}
                      </div>
                      <h3 className="text-sm font-medium text-white truncate">{pc.name}</h3>
                      {pc.race && pc.class && (
                        <p className="text-xs text-gray-500 truncate">{pc.race} {pc.class}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {pcs.length > 0 && (
                <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.06] text-center">
                  <Users className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{pcs.length}</div>
                  <div className="text-xs text-gray-500">Party Members</div>
                </div>
              )}
              {sessions.length > 0 && (
                <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.06] text-center">
                  <Scroll className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{sessions.length}</div>
                  <div className="text-xs text-gray-500">Sessions</div>
                </div>
              )}
              {npcs.length > 0 && (
                <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.06] text-center">
                  <Crown className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{npcs.length}</div>
                  <div className="text-xs text-gray-500">NPCs</div>
                </div>
              )}
              {timelineEvents.length > 0 && (
                <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.06] text-center">
                  <Clock className="w-6 h-6 text-green-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{timelineEvents.length}</div>
                  <div className="text-xs text-gray-500">Events</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Party Tab */}
        {activeTab === 'party' && (
          <div className="space-y-6">
            {pcs.map(pc => (
              <div
                key={pc.id}
                className="bg-white/[0.02] rounded-2xl border border-white/[0.06] overflow-hidden"
              >
                <button
                  onClick={() => toggleCharacter(pc.id)}
                  className="w-full p-4 sm:p-6 flex items-center gap-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden flex-shrink-0">
                    {pc.image_url ? (
                      <Image src={pc.image_url} alt={pc.name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full bg-purple-500/10 flex items-center justify-center">
                        <span className="text-2xl font-bold text-purple-400">{getInitials(pc.name)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <h3 className="text-lg font-semibold text-white">{pc.name}</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {pc.race && (
                        <span className="text-xs px-2 py-0.5 bg-purple-500/15 text-purple-400 rounded">{pc.race}</span>
                      )}
                      {pc.class && (
                        <span className="text-xs px-2 py-0.5 bg-blue-500/15 text-blue-400 rounded">{pc.class}</span>
                      )}
                      {pc.level && (
                        <span className="text-xs px-2 py-0.5 bg-amber-500/15 text-amber-400 rounded">Level {pc.level}</span>
                      )}
                    </div>
                  </div>
                  {expandedCharacters.has(pc.id) ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </button>

                {expandedCharacters.has(pc.id) && (
                  <div className="px-4 sm:px-6 pb-6 border-t border-white/[0.06] pt-4 space-y-4">
                    {sections.pcDetails && (
                      <>
                        {pc.background && (
                          <div>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Background</h4>
                            <p className="text-sm text-gray-300">{pc.background}</p>
                          </div>
                        )}
                        {pc.personality && (
                          <div>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Personality</h4>
                            <p className="text-sm text-gray-300">{pc.personality}</p>
                          </div>
                        )}
                        {pc.backstory && (
                          <div>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Backstory</h4>
                            <div
                              className="prose prose-invert prose-sm max-w-none text-gray-300"
                              dangerouslySetInnerHTML={{ __html: markdownToHtml(pc.backstory) }}
                            />
                          </div>
                        )}
                      </>
                    )}
                    {sections.pcSecrets && pc.secrets && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">Secrets</h4>
                        <p className="text-sm text-gray-300">{pc.secrets}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Cast Tab */}
        {activeTab === 'cast' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {npcs.map(npc => (
                <div
                  key={npc.id}
                  className="bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-hidden"
                >
                  <div className="p-4 flex items-start gap-3">
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                      {npc.image_url ? (
                        <Image src={npc.image_url} alt={npc.name} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gray-500/10 flex items-center justify-center">
                          <span className="text-sm font-bold text-gray-400">{getInitials(npc.name)}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-white truncate">{npc.name}</h3>
                      {npc.role && (
                        <p className="text-xs text-gray-500 truncate">{npc.role}</p>
                      )}
                      {sections.npcDetails && npc.description && (
                        <p className="text-xs text-gray-400 mt-2 line-clamp-3">{npc.description}</p>
                      )}
                    </div>
                  </div>
                  {sections.npcSecrets && npc.secrets && (
                    <div className="px-4 pb-4">
                      <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <p className="text-xs text-gray-300 line-clamp-2">{npc.secrets}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Story Tab */}
        {activeTab === 'story' && (
          <div className="space-y-8">
            {/* View Toggle */}
            {(sections.sessionRecaps || sections.timeline) && sessions.length > 0 && timelineEvents.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => setTimelineView('feed')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    timelineView === 'feed'
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Sessions
                </button>
                <button
                  onClick={() => setTimelineView('journal')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    timelineView === 'journal'
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Timeline
                </button>
              </div>
            )}

            {/* Sessions View */}
            {(timelineView === 'feed' || !sections.timeline) && sections.sessionRecaps && (
              <div className="space-y-4">
                {sessions.map((session, index) => {
                  const attendees = sessionAttendees[session.id] || []
                  const isExpanded = expandedSessions.has(session.id)

                  return (
                    <div
                      key={session.id}
                      className="bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-hidden"
                    >
                      <button
                        onClick={() => toggleSession(session.id)}
                        className="w-full p-4 sm:p-5 text-left hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <span className="px-3 py-1.5 text-xs font-bold rounded-lg uppercase tracking-wide bg-purple-500/15 text-purple-400 flex-shrink-0">
                            Session {session.session_number || index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-base font-semibold text-white truncate">
                                {session.title || 'Untitled Session'}
                              </h3>
                              <span className="text-xs text-gray-500 flex-shrink-0">
                                {formatDate(session.date)}
                              </span>
                            </div>
                            {session.summary && (
                              <div
                                className={`prose prose-invert prose-sm max-w-none text-gray-400 ${!isExpanded ? 'line-clamp-2' : ''}`}
                                dangerouslySetInnerHTML={{ __html: markdownToHtml(session.summary) }}
                              />
                            )}
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-4 sm:px-5 pb-5 border-t border-white/[0.06] pt-4 space-y-4">
                          {/* Attendees */}
                          {attendees.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Attendees</h4>
                              <div className="flex flex-wrap gap-2">
                                {attendees.map(char => (
                                  <div key={char.id} className="flex items-center gap-2 px-2 py-1 bg-white/[0.04] rounded-lg">
                                    {char.image_url ? (
                                      <Image
                                        src={char.image_url}
                                        alt={char.name}
                                        width={20}
                                        height={20}
                                        className="rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-[8px] font-bold text-gray-400">
                                        {getInitials(char.name)}
                                      </div>
                                    )}
                                    <span className="text-xs text-gray-300">{char.name}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Full Notes */}
                          {sections.sessionNotes && session.notes && (
                            <div>
                              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Detailed Notes</h4>
                              <div
                                className="prose prose-invert prose-sm max-w-none text-gray-300"
                                dangerouslySetInnerHTML={{ __html: session.notes }}
                              />
                            </div>
                          )}

                          {/* Session Events */}
                          {eventsBySession[session.id] && eventsBySession[session.id].length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Key Events</h4>
                              <div className="space-y-2">
                                {eventsBySession[session.id].map((event: any) => {
                                  const EventIcon = EVENT_TYPE_ICONS[event.event_type] || Star
                                  const colorClasses = EVENT_TYPE_COLORS[event.event_type] || 'bg-gray-500/15 text-gray-400'

                                  return (
                                    <div key={event.id} className="flex items-start gap-3 p-2 bg-white/[0.02] rounded-lg">
                                      <div className={`p-1.5 rounded ${colorClasses.split(' ')[0]}`}>
                                        <EventIcon className={`w-3 h-3 ${colorClasses.split(' ')[1]}`} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm text-white">{event.title}</p>
                                        {event.description && (
                                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{event.description}</p>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Timeline View */}
            {timelineView === 'journal' && sections.timeline && (
              <div className="relative">
                <div className="absolute left-4 sm:left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-500/50 via-purple-500/20 to-transparent" />
                <div className="space-y-6">
                  {timelineEvents.map((event, index) => {
                    const EventIcon = EVENT_TYPE_ICONS[event.event_type] || Star
                    const colorClasses = EVENT_TYPE_COLORS[event.event_type] || 'bg-gray-500/15 text-gray-400 border-gray-500/20'

                    return (
                      <div key={event.id} className="relative pl-10 sm:pl-16">
                        <div className={`absolute left-2 sm:left-6 w-4 h-4 sm:w-5 sm:h-5 rounded-full ${colorClasses.split(' ')[0]} border ${colorClasses.split(' ')[2] || 'border-white/10'} flex items-center justify-center`}>
                          <EventIcon className={`w-2 h-2 sm:w-2.5 sm:h-2.5 ${colorClasses.split(' ')[1]}`} />
                        </div>
                        <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-xs px-2 py-0.5 rounded ${colorClasses}`}>
                              {event.event_type.replace(/_/g, ' ')}
                            </span>
                            {event.event_date && (
                              <span className="text-xs text-gray-500">{formatDate(event.event_date)}</span>
                            )}
                            {event.is_major && (
                              <Star className="w-3 h-3 text-amber-400" />
                            )}
                          </div>
                          <h3 className="text-sm font-semibold text-white mb-1">{event.title}</h3>
                          {event.description && (
                            <p className="text-xs text-gray-400">{event.description}</p>
                          )}
                          {event.location && (
                            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {event.location}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* World Tab */}
        {activeTab === 'world' && (
          <div className="space-y-8">
            {/* Maps */}
            {sections.worldMaps && worldMaps.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">Maps</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {worldMaps.map(map => (
                    <div
                      key={map.id}
                      className="relative aspect-video rounded-xl overflow-hidden border border-white/[0.06] cursor-pointer group"
                      onClick={() => setSelectedImage(map.image_url)}
                    >
                      <Image src={map.image_url} alt={map.name} fill className="object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ZoomIn className="w-8 h-8 text-white" />
                      </div>
                      <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80">
                        <h3 className="text-sm font-medium text-white">{map.name}</h3>
                        {map.is_primary && (
                          <span className="text-xs text-purple-400">Primary Map</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lore by Type */}
            {sections.lore && (Object.entries(loreByType) as [string, any[]][]).map(([type, items]) => {
              const Icon = LORE_TYPE_ICONS[type] || BookOpen
              return (
                <div key={type}>
                  <div className="flex items-center gap-2 mb-4">
                    <Icon className="w-5 h-5 text-purple-400" />
                    <h2 className="text-lg font-semibold text-white capitalize">
                      {type.replace(/_/g, ' ')}s
                    </h2>
                    <span className="text-sm text-gray-500">({items.length})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {items.map(item => (
                      <div
                        key={item.id}
                        className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]"
                      >
                        <h3 className="text-sm font-semibold text-white mb-2">{item.title}</h3>
                        {item.content && (
                          <div
                            className="prose prose-invert prose-sm max-w-none text-gray-400 line-clamp-4"
                            dangerouslySetInnerHTML={{ __html: markdownToHtml(item.content) }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Relationships Tab */}
        {activeTab === 'relationships' && (
          <div className="space-y-8">
            {/* Network Graph */}
            <div className="h-[500px] bg-white/[0.02] rounded-2xl border border-white/[0.06] overflow-hidden">
              <RelationshipGraph
                characters={characters}
                relationships={relationships}
              />
            </div>

            {/* Relationship List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {relationships.map(rel => {
                const fromChar = characters.find(c => c.id === rel.character_id)
                const toChar = characters.find(c => c.id === rel.related_character_id)
                if (!fromChar || !toChar) return null

                return (
                  <div
                    key={rel.id}
                    className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        {[fromChar, toChar].map((char, i) => (
                          <div
                            key={char.id}
                            className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-[#0a0a0c]"
                            style={{ zIndex: 2 - i }}
                          >
                            {char.image_url ? (
                              <Image src={char.image_url} alt={char.name} fill className="object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-400">
                                {getInitials(char.name)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-sm text-white">
                          <span className="truncate">{fromChar.name}</span>
                          <ChevronRight className="w-3 h-3 text-gray-500 flex-shrink-0" />
                          <span className="truncate">{toChar.name}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          rel.relationship_type === 'ally' ? 'bg-green-500/15 text-green-400' :
                          rel.relationship_type === 'enemy' ? 'bg-red-500/15 text-red-400' :
                          rel.relationship_type === 'family' ? 'bg-purple-500/15 text-purple-400' :
                          'bg-gray-500/15 text-gray-400'
                        }`}>
                          {rel.relationship_label || rel.relationship_type}
                        </span>
                      </div>
                    </div>
                    {!rel.is_known_to_party && (
                      <p className="text-xs text-amber-500 mt-2">Hidden from party</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Canvas Tab */}
        {activeTab === 'canvas' && (
          <div className="h-[600px] sm:h-[700px] lg:h-[800px] bg-white/[0.02] rounded-2xl border border-white/[0.06] overflow-hidden">
            <ReadOnlyCanvas
              characters={characters}
              characterTags={characterTags}
              groups={canvasGroups}
            />
          </div>
        )}

        {/* Gallery Tab */}
        {activeTab === 'gallery' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {gallery.map(item => (
              <div
                key={item.id}
                className="relative aspect-square rounded-xl overflow-hidden border border-white/[0.06] cursor-pointer group"
                onClick={() => setSelectedImage(item.image_url)}
              >
                <Image src={item.image_url} alt={item.title || 'Gallery image'} fill className="object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ZoomIn className="w-8 h-8 text-white" />
                </div>
                {item.title && (
                  <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/80">
                    <p className="text-xs text-white truncate">{item.title}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Image Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
            onClick={() => setSelectedImage(null)}
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <Image
              src={selectedImage}
              alt="Full size image"
              width={1200}
              height={800}
              className="object-contain max-h-[90vh] w-auto"
            />
          </div>
        </div>
      )}
    </div>
  )
}

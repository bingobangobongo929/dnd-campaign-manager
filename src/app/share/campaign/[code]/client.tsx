'use client'

import { useState, useEffect, useMemo } from 'react'
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
  Eye,
  FileText,
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

// Section component matching character share page
function Section({ title, icon: Icon, count, children, id }: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  count?: number
  children: React.ReactNode
  id?: string
}) {
  return (
    <section id={id} className="mb-8 scroll-mt-6">
      <div className="border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="flex items-center gap-4 p-4 sm:p-5 bg-white/[0.02] border-b border-white/[0.06]">
          <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
          </div>
          <h2 className="text-base sm:text-lg font-semibold text-white/90 tracking-wide uppercase flex-1">
            {title}
            {count !== undefined && count > 0 && (
              <span className="ml-2 text-sm text-gray-500 font-normal normal-case">({count})</span>
            )}
          </h2>
        </div>
        <div className="p-4 sm:p-6">
          {children}
        </div>
      </div>
    </section>
  )
}

// Field label component
function FieldLabel({ children, emoji, count }: { children: React.ReactNode; emoji?: string; count?: number }) {
  return (
    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
      {emoji && <span>{emoji}</span>}
      {children}
      {count !== undefined && count > 0 && (
        <span className="text-gray-600">({count})</span>
      )}
    </h4>
  )
}

// Back to top button
function BackToTopButton() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setShow(window.scrollY > 500)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (!show) return null

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-8 right-8 z-50 w-12 h-12 rounded-full bg-purple-600/90 hover:bg-purple-500 text-white shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110"
      aria-label="Back to top"
    >
      <ChevronUp className="w-6 h-6" />
    </button>
  )
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
  const [expandedCharacters, setExpandedCharacters] = useState<Set<string>>(new Set())
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [timelineView, setTimelineView] = useState<'feed' | 'journal'>('feed')
  const [heroLightbox, setHeroLightbox] = useState(false)
  const [castGroupBy, setCastGroupBy] = useState<'none' | 'faction' | 'status'>('none')
  const [castFilter, setCastFilter] = useState<string>('all')

  // Extract factions from character tags
  type TagInfo = { name: string; color: string; count: number }
  const { factionTags, statusTags } = useMemo(() => {
    const factions: Record<string, TagInfo> = {}
    const statuses: Record<string, TagInfo> = {}

    npcs.forEach(npc => {
      const tags = characterTags[npc.id] || []
      tags.forEach((t: any) => {
        if (t.tag?.category === 'faction' || t.tag?.name?.toLowerCase().includes('faction')) {
          const existing = factions[t.tag.name] || { name: t.tag.name, color: t.tag.color, count: 0 }
          factions[t.tag.name] = { ...existing, count: existing.count + 1 }
        }
        if (t.tag?.category === 'status') {
          const existing = statuses[t.tag.name] || { name: t.tag.name, color: t.tag.color, count: 0 }
          statuses[t.tag.name] = { ...existing, count: existing.count + 1 }
        }
      })
    })

    return { factionTags: factions, statusTags: statuses }
  }, [npcs, characterTags])

  // Group NPCs by faction or status
  const groupedNpcs = castGroupBy === 'none'
    ? { 'All NPCs': npcs }
    : castGroupBy === 'faction'
      ? npcs.reduce((acc, npc) => {
          const tags = characterTags[npc.id] || []
          const factionTag = tags.find((t: any) => t.tag?.category === 'faction' || t.tag?.name?.toLowerCase().includes('faction'))
          const group = factionTag?.tag?.name || 'Unaffiliated'
          if (!acc[group]) acc[group] = []
          acc[group].push(npc)
          return acc
        }, {} as Record<string, any[]>)
      : npcs.reduce((acc, npc) => {
          const tags = characterTags[npc.id] || []
          const statusTag = tags.find((t: any) => t.tag?.category === 'status')
          const group = statusTag?.tag?.name || 'Unknown Status'
          if (!acc[group]) acc[group] = []
          acc[group].push(npc)
          return acc
        }, {} as Record<string, any[]>)

  // Filter NPCs if a specific filter is applied
  const filteredGroupedNpcs = castFilter === 'all'
    ? groupedNpcs
    : Object.fromEntries(
        Object.entries(groupedNpcs).map(([group, chars]) => [
          group,
          (chars as any[]).filter(npc => {
            const tags = characterTags[npc.id] || []
            return tags.some((t: any) => t.tag?.name === castFilter)
          })
        ]).filter(([_, chars]) => (chars as any[]).length > 0)
      )

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
      {/* Hero Section with Campaign Image */}
      <div className="relative">
        {/* Background Image with Overlay */}
        {campaign.image_url && (
          <div className="absolute inset-0 h-[400px] sm:h-[500px]">
            <Image
              src={campaign.image_url}
              alt={campaign.name}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/70 to-[#0a0a0c]" />
          </div>
        )}

        {/* Hero Content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 pb-8">
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* Campaign Image - Clickable */}
            {campaign.image_url && (
              <button
                onClick={() => setHeroLightbox(true)}
                className="relative w-48 sm:w-64 lg:w-80 aspect-[3/4] rounded-2xl overflow-hidden border-2 border-white/[0.1] shadow-2xl flex-shrink-0 group cursor-pointer mx-auto lg:mx-0"
              >
                <Image
                  src={campaign.image_url}
                  alt={campaign.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Eye className="w-10 h-10 text-white" />
                </div>
              </button>
            )}

            {/* Campaign Info */}
            <div className="flex-1 text-center lg:text-left">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 drop-shadow-lg">
                {campaign.name}
              </h1>

              {/* Status & System */}
              <div className="flex items-center justify-center lg:justify-start gap-3 mb-6 flex-wrap">
                {campaign.game_system && (
                  <span className="px-3 py-1.5 text-sm font-medium rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {campaign.game_system}
                  </span>
                )}
                {campaign.status && (
                  <span className={`px-3 py-1.5 text-sm font-medium rounded-lg ${
                    campaign.status === 'active' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                    campaign.status === 'completed' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                    campaign.status === 'paused' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                    'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                  }`}>
                    {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                  </span>
                )}
              </div>

              {/* Campaign Description */}
              {campaign.description && (
                <div className="prose prose-invert prose-lg max-w-none text-gray-300 mb-6">
                  <div dangerouslySetInnerHTML={{ __html: markdownToHtml(campaign.description) }} />
                </div>
              )}

              {/* Quick Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto lg:mx-0">
                {pcs.length > 0 && (
                  <div className="bg-white/[0.05] backdrop-blur-sm rounded-xl p-4 text-center border border-white/[0.08]">
                    <Users className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">{pcs.length}</div>
                    <div className="text-xs text-gray-400">Party Members</div>
                  </div>
                )}
                {sessions.length > 0 && (
                  <div className="bg-white/[0.05] backdrop-blur-sm rounded-xl p-4 text-center border border-white/[0.08]">
                    <Scroll className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">{sessions.length}</div>
                    <div className="text-xs text-gray-400">Sessions</div>
                  </div>
                )}
                {npcs.length > 0 && (
                  <div className="bg-white/[0.05] backdrop-blur-sm rounded-xl p-4 text-center border border-white/[0.08]">
                    <Crown className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">{npcs.length}</div>
                    <div className="text-xs text-gray-400">NPCs</div>
                  </div>
                )}
                {timelineEvents.length > 0 && (
                  <div className="bg-white/[0.05] backdrop-blur-sm rounded-xl p-4 text-center border border-white/[0.08]">
                    <Clock className="w-6 h-6 text-green-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">{timelineEvents.length}</div>
                    <div className="text-xs text-gray-400">Events</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation - Sticky */}
      {availableTabs.length > 1 && (
        <div className="sticky top-0 z-40 bg-[#0a0a0c]/95 backdrop-blur-sm border-b border-white/[0.06]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex gap-1 py-3 overflow-x-auto scrollbar-hide">
              {availableTabs.map(tab => {
                const Icon = TAB_ICONS[tab] || BookOpen
                const isActive = activeTab === tab
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-lg shadow-purple-500/10'
                        : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{TAB_LABELS[tab]}</span>
                  </button>
                )
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Party Preview */}
            {sections.partySummary && pcs.length > 0 && (
              <Section title="The Adventuring Party" icon={Users} count={pcs.length} id="party-preview">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {pcs.map(pc => (
                    <div key={pc.id} className="group">
                      <div className="relative aspect-[3/4] rounded-xl overflow-hidden border border-white/[0.06] mb-3">
                        {pc.image_url ? (
                          <Image src={pc.image_url} alt={pc.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-500/20 to-transparent flex items-center justify-center">
                            <span className="text-3xl font-bold text-purple-400">{getInitials(pc.name)}</span>
                          </div>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-white truncate text-center">{pc.name}</h3>
                      {(pc.race || pc.class) && (
                        <p className="text-xs text-gray-500 truncate text-center">{pc.race} {pc.class}</p>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Recent Sessions Preview */}
            {sessions.length > 0 && (
              <Section title="Recent Adventures" icon={Scroll} count={sessions.length} id="recent-sessions">
                <div className="space-y-4">
                  {sessions.slice(0, 3).map((session, index) => (
                    <div key={session.id} className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-purple-500/15 text-purple-400">
                          Session {session.session_number || index + 1}
                        </span>
                        <span className="text-xs text-gray-500">{formatDate(session.date)}</span>
                      </div>
                      <h3 className="text-base font-semibold text-white mb-2">{session.title || 'Untitled Session'}</h3>
                      {session.summary && (
                        <div className="prose prose-invert prose-sm max-w-none text-gray-400 line-clamp-3" dangerouslySetInnerHTML={{ __html: markdownToHtml(session.summary) }} />
                      )}
                    </div>
                  ))}
                  {sessions.length > 3 && (
                    <button
                      onClick={() => setActiveTab('story')}
                      className="w-full py-3 text-sm text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      View all {sessions.length} sessions →
                    </button>
                  )}
                </div>
              </Section>
            )}
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
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden flex-shrink-0 border border-white/[0.08]">
                    {pc.image_url ? (
                      <Image src={pc.image_url} alt={pc.name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-500/20 to-transparent flex items-center justify-center">
                        <span className="text-2xl font-bold text-purple-400">{getInitials(pc.name)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <h3 className="text-lg sm:text-xl font-semibold text-white">{pc.name}</h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {pc.race && (
                        <span className="text-xs px-2.5 py-1 bg-purple-500/15 text-purple-400 rounded-lg">{pc.race}</span>
                      )}
                      {pc.class && (
                        <span className="text-xs px-2.5 py-1 bg-blue-500/15 text-blue-400 rounded-lg">{pc.class}</span>
                      )}
                      {pc.level && (
                        <span className="text-xs px-2.5 py-1 bg-amber-500/15 text-amber-400 rounded-lg">Level {pc.level}</span>
                      )}
                    </div>
                  </div>
                  {expandedCharacters.has(pc.id) ? (
                    <ChevronUp className="w-6 h-6 text-gray-500 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-6 h-6 text-gray-500 flex-shrink-0" />
                  )}
                </button>

                {expandedCharacters.has(pc.id) && (
                  <div className="px-4 sm:px-6 pb-6 border-t border-white/[0.06] pt-6 space-y-6">
                    {sections.pcDetails && (
                      <>
                        {pc.background && (
                          <div>
                            <FieldLabel>Background</FieldLabel>
                            <p className="text-gray-300">{pc.background}</p>
                          </div>
                        )}
                        {pc.personality && (
                          <div>
                            <FieldLabel>Personality</FieldLabel>
                            <p className="text-gray-300">{pc.personality}</p>
                          </div>
                        )}
                        {pc.backstory && (
                          <div>
                            <FieldLabel>Backstory</FieldLabel>
                            <div className="prose prose-invert max-w-none text-gray-300" dangerouslySetInnerHTML={{ __html: markdownToHtml(pc.backstory) }} />
                          </div>
                        )}
                        {pc.goals && (
                          <div>
                            <FieldLabel>Goals</FieldLabel>
                            <p className="text-gray-300">{pc.goals}</p>
                          </div>
                        )}
                        {pc.notes && (
                          <div>
                            <FieldLabel>Notes</FieldLabel>
                            <div className="prose prose-invert max-w-none text-gray-300" dangerouslySetInnerHTML={{ __html: markdownToHtml(pc.notes) }} />
                          </div>
                        )}
                      </>
                    )}
                    {sections.pcSecrets && pc.secrets && (
                      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <FieldLabel emoji="🔒">Secrets</FieldLabel>
                        <p className="text-gray-300">{pc.secrets}</p>
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
            {/* Grouping and Filter Controls */}
            <div className="flex flex-wrap items-center gap-4 p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Group by:</span>
                <select
                  value={castGroupBy}
                  onChange={(e) => setCastGroupBy(e.target.value as 'none' | 'faction' | 'status')}
                  className="px-3 py-1.5 text-sm bg-[#1a1a24] border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500/50"
                >
                  <option value="none">None</option>
                  {Object.keys(factionTags).length > 0 && <option value="faction">Faction</option>}
                  {Object.keys(statusTags).length > 0 && <option value="status">Status</option>}
                </select>
              </div>

              {/* Tag Filters */}
              {(Object.keys(factionTags).length > 0 || Object.keys(statusTags).length > 0) && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setCastFilter('all')}
                    className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                      castFilter === 'all'
                        ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                        : 'bg-white/[0.02] text-gray-400 border-white/10 hover:border-white/20'
                    }`}
                  >
                    All ({npcs.length})
                  </button>
                  {Object.entries(factionTags).map(([name, { color, count }]) => (
                    <button
                      key={name}
                      onClick={() => setCastFilter(name)}
                      className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                        castFilter === name
                          ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                          : 'hover:border-white/20'
                      }`}
                      style={{
                        backgroundColor: castFilter === name ? undefined : `${color}15`,
                        color: castFilter === name ? undefined : color,
                        borderColor: castFilter === name ? undefined : `${color}30`,
                      }}
                    >
                      {name} ({count})
                    </button>
                  ))}
                </div>
              )}

              <span className="ml-auto text-xs text-gray-500">
                {npcs.length} NPC{npcs.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* NPC Cards grouped */}
            {Object.entries(filteredGroupedNpcs).map(([groupName, groupNpcs]) => (
              <div key={groupName}>
                {castGroupBy !== 'none' && (
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    {groupName}
                    <span className="text-sm text-gray-500 font-normal">({(groupNpcs as any[]).length})</span>
                  </h3>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(groupNpcs as any[]).map(npc => {
                    const npcTags = characterTags[npc.id] || []
                    const statusTag = npcTags.find((t: any) => t.tag?.category === 'status')

                    return (
                      <div
                        key={npc.id}
                        className="bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-hidden hover:border-purple-500/30 transition-colors"
                      >
                        <div className="p-4 flex items-start gap-4">
                          <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-white/[0.08]">
                            {npc.image_url ? (
                              <Image src={npc.image_url} alt={npc.name} fill className="object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-gray-500/20 to-transparent flex items-center justify-center">
                                <span className="text-lg font-bold text-gray-400">{getInitials(npc.name)}</span>
                              </div>
                            )}
                            {/* Status Badge on Image */}
                            {statusTag && (
                              <div
                                className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
                                style={{
                                  backgroundColor: `${statusTag.tag.color}30`,
                                  color: statusTag.tag.color,
                                }}
                              >
                                {statusTag.tag.name}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-semibold text-white truncate">{npc.name}</h3>
                              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-500/20 text-gray-400 rounded">
                                NPC
                              </span>
                            </div>
                            {npc.role && (
                              <p className="text-sm text-gray-500 truncate">{npc.role}</p>
                            )}
                            {(npc.race || npc.class) && (
                              <p className="text-xs text-gray-600 truncate mt-0.5">
                                {npc.race}{npc.race && npc.class ? ' ' : ''}{npc.class}
                              </p>
                            )}
                            {/* Tags with proper styling */}
                            {npcTags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {npcTags
                                  .filter((t: any) => t.tag?.category !== 'status')
                                  .slice(0, 4)
                                  .map((t: any) => (
                                    <span
                                      key={t.id}
                                      className="px-1.5 py-0.5 text-[10px] rounded"
                                      style={{
                                        backgroundColor: `${t.tag?.color || '#888'}15`,
                                        color: t.tag?.color || '#888',
                                      }}
                                    >
                                      {t.tag?.name}
                                    </span>
                                  ))}
                                {npcTags.filter((t: any) => t.tag?.category !== 'status').length > 4 && (
                                  <span className="px-1.5 py-0.5 text-[10px] text-gray-500">
                                    +{npcTags.filter((t: any) => t.tag?.category !== 'status').length - 4}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        {sections.npcDetails && (npc.description || npc.personality || npc.backstory) && (
                          <div className="px-4 pb-4 space-y-3">
                            {npc.description && (
                              <div className="prose prose-invert prose-sm max-w-none text-gray-400 prose-p:my-2" dangerouslySetInnerHTML={{ __html: markdownToHtml(npc.description) }} />
                            )}
                            {npc.personality && (
                              <div className="prose prose-invert prose-sm max-w-none text-gray-500 italic prose-p:my-2" dangerouslySetInnerHTML={{ __html: markdownToHtml(npc.personality) }} />
                            )}
                            {npc.backstory && (
                              <div className="prose prose-invert prose-sm max-w-none text-gray-400 prose-p:my-2 prose-h3:text-base prose-h3:font-semibold prose-h3:mt-4 prose-h3:mb-2" dangerouslySetInnerHTML={{ __html: markdownToHtml(npc.backstory) }} />
                            )}
                          </div>
                        )}
                        {sections.npcSecrets && npc.secrets && (
                          <div className="mx-4 mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <div className="flex items-center gap-1.5 text-xs text-red-400 mb-1">
                              <span>🔒</span> Secret
                            </div>
                            <p className="text-xs text-gray-300">{npc.secrets}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Story Tab */}
        {activeTab === 'story' && (
          <div className="space-y-8">
            {/* View Toggle */}
            {sections.timeline && timelineEvents.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => setTimelineView('feed')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    timelineView === 'feed'
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  Session Notes
                </button>
                <button
                  onClick={() => setTimelineView('journal')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    timelineView === 'journal'
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  Timeline
                </button>
              </div>
            )}

            {/* Sessions View - All expanded by default */}
            {(timelineView === 'feed' || !sections.timeline || timelineEvents.length === 0) && sections.sessionRecaps && (
              <div className="space-y-6">
                {sessions.map((session, index) => {
                  const attendees = sessionAttendees[session.id] || []
                  const sessionEvents = eventsBySession[session.id] || []

                  return (
                    <div
                      key={session.id}
                      className="bg-white/[0.02] rounded-2xl border border-white/[0.06] overflow-hidden"
                    >
                      {/* Session Header */}
                      <div className="p-5 sm:p-6 border-b border-white/[0.06]">
                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                          <span className="px-3 py-1.5 text-xs font-bold rounded-lg uppercase tracking-wide bg-purple-500/15 text-purple-400">
                            Session {session.session_number || index + 1}
                          </span>
                          <span className="text-sm text-gray-500 flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            {formatDate(session.date)}
                          </span>
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-4">
                          {session.title || 'Untitled Session'}
                        </h3>

                        {/* Summary */}
                        {session.summary && (
                          <div className="mb-4">
                            <div className="prose prose-invert max-w-none text-gray-300" dangerouslySetInnerHTML={{ __html: markdownToHtml(session.summary) }} />
                          </div>
                        )}

                        {/* Attendees */}
                        {attendees.length > 0 && (
                          <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
                            <Users className="w-4 h-4 text-gray-500" />
                            <div className="flex flex-wrap gap-2">
                              {attendees.map((char: any) => (
                                <div key={char.id} className="flex items-center gap-2 px-2.5 py-1 bg-white/[0.04] rounded-lg">
                                  {char.image_url ? (
                                    <Image src={char.image_url} alt={char.name} width={20} height={20} className="rounded-full object-cover" />
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
                      </div>

                      {/* Detailed Notes - Always shown */}
                      {sections.sessionNotes && session.notes && (
                        <div className="p-5 sm:p-6 bg-white/[0.01]">
                          <FieldLabel emoji="📝">Detailed Notes</FieldLabel>
                          <div className="prose prose-invert max-w-none text-gray-300 [&>h3]:mt-6 [&>h3:first-child]:mt-0 [&>h3]:mb-2 [&>h3]:text-base [&>h3]:font-semibold [&>ul]:mt-1 [&>ul]:mb-4 [&>p]:mb-4" dangerouslySetInnerHTML={{ __html: session.notes }} />
                        </div>
                      )}

                      {/* Session Events */}
                      {sessionEvents.length > 0 && (
                        <div className="p-5 sm:p-6 border-t border-white/[0.06]">
                          <FieldLabel emoji="⚔️" count={sessionEvents.length}>Key Events</FieldLabel>
                          <div className="space-y-3">
                            {sessionEvents.map((event: any) => {
                              const EventIcon = EVENT_TYPE_ICONS[event.event_type] || Star
                              const colorClasses = EVENT_TYPE_COLORS[event.event_type] || 'bg-gray-500/15 text-gray-400'

                              return (
                                <div key={event.id} className="flex items-start gap-3 p-3 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                                  <div className={`p-2 rounded-lg ${colorClasses.split(' ')[0]}`}>
                                    <EventIcon className={`w-4 h-4 ${colorClasses.split(' ')[1]}`} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white">{event.title}</p>
                                    {event.description && (
                                      <p className="text-sm text-gray-400 mt-1">{event.description}</p>
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
                  )
                })}
              </div>
            )}

            {/* Timeline View */}
            {timelineView === 'journal' && sections.timeline && timelineEvents.length > 0 && (
              <div className="relative pl-8">
                <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-500/50 via-purple-500/20 to-transparent" />
                <div className="space-y-6">
                  {timelineEvents.map((event) => {
                    const EventIcon = EVENT_TYPE_ICONS[event.event_type] || Star
                    const colorClasses = EVENT_TYPE_COLORS[event.event_type] || 'bg-gray-500/15 text-gray-400 border-gray-500/20'

                    return (
                      <div key={event.id} className="relative">
                        <div className={`absolute -left-5 w-6 h-6 rounded-full ${colorClasses.split(' ')[0]} border-2 ${colorClasses.split(' ')[2] || 'border-white/10'} flex items-center justify-center`}>
                          <EventIcon className={`w-3 h-3 ${colorClasses.split(' ')[1]}`} />
                        </div>
                        <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] p-5">
                          <div className="flex items-center gap-2 mb-3 flex-wrap">
                            <span className={`text-xs px-2.5 py-1 rounded-lg ${colorClasses}`}>
                              {event.event_type.replace(/_/g, ' ')}
                            </span>
                            {event.event_date && (
                              <span className="text-xs text-gray-500">{formatDate(event.event_date)}</span>
                            )}
                            {event.is_major && (
                              <Star className="w-4 h-4 text-amber-400" />
                            )}
                          </div>
                          <h3 className="text-base font-semibold text-white mb-2">{event.title}</h3>
                          {event.description && (
                            <p className="text-sm text-gray-400">{event.description}</p>
                          )}
                          {event.location && (
                            <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
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
              <Section title="Maps" icon={Map} count={worldMaps.length} id="maps">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {worldMaps.map(map => (
                    <div
                      key={map.id}
                      className="relative aspect-video rounded-xl overflow-hidden border border-white/[0.06] cursor-pointer group"
                      onClick={() => setSelectedImage(map.image_url)}
                    >
                      <Image src={map.image_url} alt={map.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ZoomIn className="w-10 h-10 text-white" />
                      </div>
                      <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80">
                        <h3 className="text-sm font-semibold text-white">{map.name}</h3>
                        {map.is_primary && (
                          <span className="text-xs text-purple-400">Primary Map</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Lore by Type */}
            {sections.lore && (Object.entries(loreByType) as [string, any[]][]).map(([type, items]) => {
              const Icon = LORE_TYPE_ICONS[type] || BookOpen
              return (
                <Section key={type} title={`${type.replace(/_/g, ' ')}s`} icon={Icon} count={items.length} id={`lore-${type}`}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {items.map((item: any) => (
                      <div
                        key={item.id}
                        className="p-5 bg-white/[0.02] rounded-xl border border-white/[0.06]"
                      >
                        <h3 className="text-base font-semibold text-white mb-3">{item.title}</h3>
                        {item.content && (
                          <div className="prose prose-invert prose-sm max-w-none text-gray-400" dangerouslySetInnerHTML={{ __html: markdownToHtml(item.content) }} />
                        )}
                      </div>
                    ))}
                  </div>
                </Section>
              )
            })}
          </div>
        )}

        {/* Relationships Tab */}
        {activeTab === 'relationships' && (
          <div className="space-y-8">
            {/* Network Graph */}
            <div className="h-[500px] sm:h-[600px] bg-white/[0.02] rounded-2xl border border-white/[0.06] overflow-hidden">
              <RelationshipGraph
                characters={characters}
                relationships={relationships}
              />
            </div>

            {/* Relationship List */}
            <Section title="All Relationships" icon={Network} count={relationships.length} id="relationship-list">
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
                              className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-[#0a0a0c]"
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
                          <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded ${
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
                        <p className="text-xs text-amber-500 mt-3 flex items-center gap-1">
                          <span>🔒</span> Hidden from party
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </Section>
          </div>
        )}

        {/* Canvas Tab */}
        {activeTab === 'canvas' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Use mouse wheel to zoom, drag to pan. Use controls in bottom-left to zoom +/- or fit view.
            </p>
            <div className="h-[600px] sm:h-[700px] lg:h-[800px] bg-white/[0.02] rounded-2xl border border-white/[0.06] overflow-hidden">
              <ReadOnlyCanvas
                characters={characters}
                characterTags={characterTags}
                groups={canvasGroups}
              />
            </div>
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
                <Image src={item.image_url} alt={item.title || 'Gallery image'} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ZoomIn className="w-10 h-10 text-white" />
                </div>
                {item.title && (
                  <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80">
                    <p className="text-xs text-white truncate">{item.title}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Hero Image Lightbox */}
      {heroLightbox && campaign.image_url && (
        <div
          className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-8"
          onClick={() => setHeroLightbox(false)}
        >
          <button
            className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            onClick={() => setHeroLightbox(false)}
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <img
            src={campaign.image_url}
            alt={campaign.name}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Image Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-8"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            onClick={() => setSelectedImage(null)}
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <img
            src={selectedImage}
            alt="Full size image"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Back to Top Button */}
      <BackToTopButton />
    </div>
  )
}

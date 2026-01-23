'use client'

import { useState, useEffect, use } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Users,
  Swords,
  MapPin,
  BookOpen,
  Eye,
  EyeOff,
  List,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  RotateCcw,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn, getInitials } from '@/lib/utils'
import type { Oneshot, OneshotNpc, OneshotEncounter, OneshotLocation } from '@/types/database'

interface PresentPageProps {
  params: Promise<{ id: string }>
}

interface Section {
  id: string
  type: 'intro' | 'setting' | 'session_plan' | 'npcs' | 'encounters' | 'locations' | 'twists' | 'handouts'
  title: string
  content?: string
  completed: boolean
}

export default function PresentPage({ params }: PresentPageProps) {
  const { id: oneshotId } = use(params)
  const [oneshot, setOneshot] = useState<Oneshot | null>(null)
  const [npcs, setNpcs] = useState<OneshotNpc[]>([])
  const [encounters, setEncounters] = useState<OneshotEncounter[]>([])
  const [locations, setLocations] = useState<OneshotLocation[]>([])
  const [loading, setLoading] = useState(true)

  const [sections, setSections] = useState<Section[]>([])
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set())
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  // Timer state
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)

  // Load data
  useEffect(() => {
    async function loadData() {
      const supabase = createClient()

      const [oneshotRes, npcsRes, encountersRes, locationsRes] = await Promise.all([
        supabase.from('oneshots').select('*').eq('id', oneshotId).single(),
        supabase.from('oneshot_npcs').select('*').eq('oneshot_id', oneshotId).order('sort_order'),
        supabase.from('oneshot_encounters').select('*').eq('oneshot_id', oneshotId).order('sort_order'),
        supabase.from('oneshot_locations').select('*').eq('oneshot_id', oneshotId).order('sort_order'),
      ])

      if (oneshotRes.data) {
        setOneshot(oneshotRes.data)

        // Build sections from oneshot content
        const content = oneshotRes.data.content as Record<string, string> | null
        const builtSections: Section[] = []

        if (content?.introduction) {
          builtSections.push({
            id: 'intro',
            type: 'intro',
            title: 'Introduction',
            content: content.introduction,
            completed: false,
          })
        }
        if (content?.setting) {
          builtSections.push({
            id: 'setting',
            type: 'setting',
            title: 'Setting',
            content: content.setting,
            completed: false,
          })
        }
        if (content?.session_plan) {
          builtSections.push({
            id: 'session_plan',
            type: 'session_plan',
            title: 'Session Plan',
            content: content.session_plan,
            completed: false,
          })
        }

        setSections(builtSections)
        if (builtSections.length > 0) {
          setActiveSection(builtSections[0].id)
        }
      }

      if (npcsRes.data) setNpcs(npcsRes.data)
      if (encountersRes.data) setEncounters(encountersRes.data)
      if (locationsRes.data) setLocations(locationsRes.data)

      setLoading(false)
    }

    loadData()
  }, [oneshotId])

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (timerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(s => s + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [timerRunning])

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const toggleSectionComplete = (sectionId: string) => {
    const newCompleted = new Set(completedSections)
    if (newCompleted.has(sectionId)) {
      newCompleted.delete(sectionId)
    } else {
      newCompleted.add(sectionId)
    }
    setCompletedSections(newCompleted)
  }

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedItems(newExpanded)
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    )
  }

  if (!oneshot) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <p className="text-gray-400">Oneshot not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex">
      {/* Sidebar */}
      <div
        className={cn(
          "w-72 bg-[#12121a] border-r border-[--border] flex flex-col transition-all duration-300",
          !showSidebar && "-ml-72"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-[--border]">
          <Link
            href={`/oneshots/${oneshotId}`}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Exit Present Mode
          </Link>
          <h1 className="font-bold text-white truncate">{oneshot.title}</h1>
          {oneshot.system && (
            <p className="text-xs text-gray-500 mt-1">{oneshot.system}</p>
          )}
        </div>

        {/* Timer */}
        <div className="p-4 border-b border-[--border]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="font-mono text-lg text-white">{formatTime(timerSeconds)}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setTimerRunning(!timerRunning)}
                className="p-1.5 hover:bg-white/[0.05] rounded text-gray-400"
              >
                {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button
                onClick={() => {
                  setTimerRunning(false)
                  setTimerSeconds(0)
                }}
                className="p-1.5 hover:bg-white/[0.05] rounded text-gray-400"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Section Navigation */}
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Sections</p>
          <div className="space-y-1">
            {sections.map((section, idx) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors",
                  activeSection === section.id
                    ? "bg-purple-600/20 text-purple-400"
                    : "text-gray-400 hover:bg-white/[0.05] hover:text-white"
                )}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleSectionComplete(section.id)
                  }}
                  className={cn(
                    "w-5 h-5 rounded border flex items-center justify-center flex-shrink-0",
                    completedSections.has(section.id)
                      ? "bg-green-600 border-green-600"
                      : "border-gray-600 hover:border-gray-500"
                  )}
                >
                  {completedSections.has(section.id) && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </button>
                <span className={cn(
                  completedSections.has(section.id) && "line-through text-gray-500"
                )}>
                  {idx + 1}. {section.title}
                </span>
              </button>
            ))}
          </div>

          {/* Quick Access */}
          {(npcs.length > 0 || encounters.length > 0 || locations.length > 0) && (
            <>
              <p className="text-xs text-gray-500 uppercase tracking-wider mt-6 mb-3">Quick Access</p>
              <div className="space-y-1">
                {npcs.length > 0 && (
                  <button
                    onClick={() => setActiveSection('npcs')}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm",
                      activeSection === 'npcs'
                        ? "bg-purple-600/20 text-purple-400"
                        : "text-gray-400 hover:bg-white/[0.05]"
                    )}
                  >
                    <Users className="w-4 h-4" />
                    NPCs ({npcs.length})
                  </button>
                )}
                {encounters.length > 0 && (
                  <button
                    onClick={() => setActiveSection('encounters')}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm",
                      activeSection === 'encounters'
                        ? "bg-purple-600/20 text-purple-400"
                        : "text-gray-400 hover:bg-white/[0.05]"
                    )}
                  >
                    <Swords className="w-4 h-4" />
                    Encounters ({encounters.length})
                  </button>
                )}
                {locations.length > 0 && (
                  <button
                    onClick={() => setActiveSection('locations')}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm",
                      activeSection === 'locations'
                        ? "bg-purple-600/20 text-purple-400"
                        : "text-gray-400 hover:bg-white/[0.05]"
                    )}
                  >
                    <MapPin className="w-4 h-4" />
                    Locations ({locations.length})
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Progress */}
        <div className="p-4 border-t border-[--border]">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>Progress</span>
            <span>{completedSections.size}/{sections.length}</span>
          </div>
          <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-600 transition-all"
              style={{ width: `${(completedSections.size / Math.max(sections.length, 1)) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="h-14 bg-[#12121a] border-b border-[--border] flex items-center justify-between px-4">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-2 hover:bg-white/[0.05] rounded-lg text-gray-400"
          >
            <List className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-white/[0.05] rounded-lg text-gray-400"
            >
              {isFullscreen ? (
                <Minimize2 className="w-5 h-5" />
              ) : (
                <Maximize2 className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-3xl mx-auto">
            {/* Section Content */}
            {activeSection && sections.find(s => s.id === activeSection) && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">
                  {sections.find(s => s.id === activeSection)?.title}
                </h2>
                <div className="prose prose-invert prose-purple max-w-none">
                  <div
                    className="text-gray-300 whitespace-pre-wrap leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: sections.find(s => s.id === activeSection)?.content || ''
                    }}
                  />
                </div>
              </div>
            )}

            {/* NPCs Panel */}
            {activeSection === 'npcs' && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">NPCs</h2>
                <div className="space-y-4">
                  {npcs.map(npc => (
                    <div
                      key={npc.id}
                      className="bg-white/[0.02] border border-[--border] rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() => toggleExpanded(npc.id)}
                        className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/[0.02]"
                      >
                        {npc.image_url ? (
                          <Image
                            src={npc.image_url}
                            alt={npc.name}
                            width={56}
                            height={56}
                            className="rounded-lg"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-purple-600/20 flex items-center justify-center text-purple-400 font-bold">
                            {getInitials(npc.name)}
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-bold text-white text-lg">{npc.name}</p>
                          {npc.description && (
                            <p className="text-sm text-gray-400">{npc.description}</p>
                          )}
                        </div>
                        {expandedItems.has(npc.id) ? (
                          <ChevronDown className="w-5 h-5 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-500" />
                        )}
                      </button>

                      {expandedItems.has(npc.id) && (
                        <div className="px-4 pb-4 space-y-4 border-t border-[--border] pt-4">
                          {npc.appearance && (
                            <div>
                              <p className="text-sm font-medium text-gray-400 mb-1">Appearance</p>
                              <p className="text-gray-300">{npc.appearance}</p>
                            </div>
                          )}
                          {npc.personality && (
                            <div>
                              <p className="text-sm font-medium text-gray-400 mb-1">Personality</p>
                              <p className="text-gray-300">{npc.personality}</p>
                            </div>
                          )}
                          {npc.motivation && (
                            <div>
                              <p className="text-sm font-medium text-gray-400 mb-1">Motivation</p>
                              <p className="text-gray-300">{npc.motivation}</p>
                            </div>
                          )}
                          {npc.stat_block && (
                            <div>
                              <p className="text-sm font-medium text-gray-400 mb-1">Stats</p>
                              <pre className="text-sm text-gray-300 font-mono bg-black/20 p-3 rounded-lg overflow-x-auto">
                                {npc.stat_block}
                              </pre>
                            </div>
                          )}
                          {npc.external_link && (
                            <a
                              href={npc.external_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300"
                            >
                              <ExternalLink className="w-4 h-4" />
                              Open full stat block
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Encounters Panel */}
            {activeSection === 'encounters' && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">Encounters</h2>
                <div className="space-y-4">
                  {encounters.map(encounter => {
                    const difficultyColors: Record<string, string> = {
                      easy: 'text-green-400 bg-green-500/10',
                      medium: 'text-yellow-400 bg-yellow-500/10',
                      hard: 'text-orange-400 bg-orange-500/10',
                      deadly: 'text-red-400 bg-red-500/10',
                    }

                    return (
                      <div
                        key={encounter.id}
                        className="bg-white/[0.02] border border-[--border] rounded-lg overflow-hidden"
                      >
                        <button
                          onClick={() => toggleExpanded(encounter.id)}
                          className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/[0.02]"
                        >
                          <div className="w-14 h-14 rounded-lg bg-red-600/20 flex items-center justify-center">
                            <Swords className="w-7 h-7 text-red-400" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-white text-lg">{encounter.name}</p>
                              <span className={cn(
                                "text-xs px-2 py-0.5 rounded capitalize",
                                difficultyColors[encounter.difficulty || 'medium']
                              )}>
                                {encounter.difficulty || 'medium'}
                              </span>
                            </div>
                            {encounter.description && (
                              <p className="text-sm text-gray-400">{encounter.description}</p>
                            )}
                          </div>
                          {expandedItems.has(encounter.id) ? (
                            <ChevronDown className="w-5 h-5 text-gray-500" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-500" />
                          )}
                        </button>

                        {expandedItems.has(encounter.id) && (
                          <div className="px-4 pb-4 space-y-4 border-t border-[--border] pt-4">
                            {encounter.tactics && (
                              <div>
                                <p className="text-sm font-medium text-gray-400 mb-1">Tactics</p>
                                <p className="text-gray-300">{encounter.tactics}</p>
                              </div>
                            )}
                            {encounter.terrain && (
                              <div>
                                <p className="text-sm font-medium text-gray-400 mb-1">Terrain</p>
                                <p className="text-gray-300">{encounter.terrain}</p>
                              </div>
                            )}
                            {encounter.rewards && (
                              <div>
                                <p className="text-sm font-medium text-gray-400 mb-1">Rewards</p>
                                <p className="text-gray-300">{encounter.rewards}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Locations Panel */}
            {activeSection === 'locations' && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">Locations</h2>
                <div className="space-y-4">
                  {locations.map(location => (
                    <div
                      key={location.id}
                      className="bg-white/[0.02] border border-[--border] rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() => toggleExpanded(location.id)}
                        className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/[0.02]"
                      >
                        <div className="w-14 h-14 rounded-lg bg-green-600/20 flex items-center justify-center">
                          <MapPin className="w-7 h-7 text-green-400" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-white text-lg">{location.name}</p>
                          {location.description && (
                            <p className="text-sm text-gray-400">{location.description}</p>
                          )}
                        </div>
                        {expandedItems.has(location.id) ? (
                          <ChevronDown className="w-5 h-5 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-500" />
                        )}
                      </button>

                      {expandedItems.has(location.id) && (
                        <div className="px-4 pb-4 space-y-4 border-t border-[--border] pt-4">
                          {location.features && (
                            <div>
                              <p className="text-sm font-medium text-gray-400 mb-1">Features</p>
                              <p className="text-gray-300 whitespace-pre-wrap">{location.features}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

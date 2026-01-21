'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Users,
  Eye,
  EyeOff,
  Scroll,
  Target,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Save,
  Clock,
  Swords,
  BookOpen,
  AlertTriangle,
  GripVertical,
  Loader2,
  X,
  Check,
  Copy,
  Share2,
  Zap,
  UserPlus,
  Timer,
  Shield,
  ExternalLink,
} from 'lucide-react'
import { Modal, MarkdownContent } from '@/components/ui'
import { MobileLayout, MobileBottomSheet } from '@/components/mobile'
import { useSupabase, useUser, useIsMobile } from '@/hooks'
import { cn } from '@/lib/utils'
import type { Oneshot, OneshotRun } from '@/types/database'

// Common D&D conditions
const CONDITIONS = [
  { id: 'blinded', name: 'Blinded', color: 'bg-gray-500' },
  { id: 'charmed', name: 'Charmed', color: 'bg-pink-500' },
  { id: 'deafened', name: 'Deafened', color: 'bg-gray-400' },
  { id: 'frightened', name: 'Frightened', color: 'bg-yellow-500' },
  { id: 'grappled', name: 'Grappled', color: 'bg-orange-500' },
  { id: 'incapacitated', name: 'Incapacitated', color: 'bg-red-700' },
  { id: 'invisible', name: 'Invisible', color: 'bg-blue-300' },
  { id: 'paralyzed', name: 'Paralyzed', color: 'bg-purple-600' },
  { id: 'petrified', name: 'Petrified', color: 'bg-stone-500' },
  { id: 'poisoned', name: 'Poisoned', color: 'bg-green-500' },
  { id: 'prone', name: 'Prone', color: 'bg-amber-600' },
  { id: 'restrained', name: 'Restrained', color: 'bg-orange-600' },
  { id: 'stunned', name: 'Stunned', color: 'bg-yellow-600' },
  { id: 'unconscious', name: 'Unconscious', color: 'bg-red-900' },
  { id: 'exhaustion', name: 'Exhaustion', color: 'bg-slate-600' },
  { id: 'concentration', name: 'Concentrating', color: 'bg-cyan-500' },
]

// Encounter preset interface
interface EncounterPreset {
  id: string
  name: string
  combatants: {
    name: string
    count: number
    hp: number
    ac: number
    initiative?: number
  }[]
}

// Initiative tracker entry
interface InitiativeEntry {
  id: string
  name: string
  initiative: number
  hp?: number
  maxHp?: number
  ac?: number
  notes?: string
  isPlayer: boolean
  isActive: boolean
  conditions: string[] // Array of condition IDs
}

// Quick reference panel type
type PanelType = 'session' | 'npcs' | 'twists' | null

export default function OneshotRunPage() {
  const router = useRouter()
  const params = useParams()
  const supabase = useSupabase()
  const { user } = useUser()
  const isMobile = useIsMobile()

  const oneshotId = params.id as string

  // Mobile-specific state
  const [mobileTab, setMobileTab] = useState<'initiative' | 'notes' | 'reference'>('notes')

  // Core state
  const [oneshot, setOneshot] = useState<Oneshot | null>(null)
  const [loading, setLoading] = useState(true)

  // Timer state
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Initiative tracker
  const [initiative, setInitiative] = useState<InitiativeEntry[]>([])
  const [currentTurn, setCurrentTurn] = useState(0)
  const [addCombatantOpen, setAddCombatantOpen] = useState(false)
  const [newCombatant, setNewCombatant] = useState({
    name: '',
    initiative: 10,
    hp: 0,
    ac: 10,
    isPlayer: false,
  })

  // Quick reference panels
  const [activePanel, setActivePanel] = useState<PanelType>(null)
  const [showTwists, setShowTwists] = useState(false)

  // Session notes
  const [sessionNotes, setSessionNotes] = useState('')
  const [groupName, setGroupName] = useState('')
  const [playerCount, setPlayerCount] = useState(4)

  // End session modal
  const [endSessionOpen, setEndSessionOpen] = useState(false)
  const [sessionRating, setSessionRating] = useState(4)
  const [saving, setSaving] = useState(false)

  // Player view share
  const [playerViewOpen, setPlayerViewOpen] = useState(false)
  const [playerViewCode, setPlayerViewCode] = useState<string | null>(null)
  const [playerViewCopied, setPlayerViewCopied] = useState(false)
  const [creatingPlayerView, setCreatingPlayerView] = useState(false)

  // Encounter presets
  const [encounterPresets, setEncounterPresets] = useState<EncounterPreset[]>([])
  const [presetsOpen, setPresetsOpen] = useState(false)

  // Conditions management
  const [conditionsEntryId, setConditionsEntryId] = useState<string | null>(null)

  // Pacing alerts
  const [pacingDismissed, setPacingDismissed] = useState(false)

  // Load oneshot data
  useEffect(() => {
    if (user && oneshotId) {
      loadOneshot()
    }
  }, [user, oneshotId])

  const loadOneshot = async () => {
    const { data } = await supabase
      .from('oneshots')
      .select('*')
      .eq('id', oneshotId)
      .single()

    if (!data) {
      router.push('/campaigns')
      return
    }

    setOneshot(data)

    // Load encounter presets
    if (data.encounter_presets && Array.isArray(data.encounter_presets)) {
      setEncounterPresets(data.encounter_presets as EncounterPreset[])
    }

    // Check for existing player view session
    const { data: existingSession } = await supabase
      .from('run_sessions')
      .select('share_code')
      .eq('oneshot_id', oneshotId)
      .eq('user_id', user!.id)
      .eq('is_active', true)
      .maybeSingle()

    if (existingSession) {
      setPlayerViewCode(existingSession.share_code)
    }

    setLoading(false)
  }

  // Parse duration string to minutes (e.g., "3-4 hours" -> 210)
  const parseDurationToMinutes = (duration: string | null): number | null => {
    if (!duration) return null
    const hourMatch = duration.match(/(\d+)(?:-(\d+))?\s*hour/i)
    if (hourMatch) {
      const min = parseInt(hourMatch[1])
      const max = hourMatch[2] ? parseInt(hourMatch[2]) : min
      return ((min + max) / 2) * 60
    }
    const minMatch = duration.match(/(\d+)\s*min/i)
    if (minMatch) return parseInt(minMatch[1])
    return null
  }

  // Get pacing status
  const getPacingStatus = () => {
    if (!oneshot?.estimated_duration || pacingDismissed) return null
    const targetMinutes = parseDurationToMinutes(oneshot.estimated_duration)
    if (!targetMinutes) return null

    const currentMinutes = timerSeconds / 60
    const percentage = (currentMinutes / targetMinutes) * 100

    if (percentage >= 100) return { level: 'over', message: 'Over estimated time!', percentage }
    if (percentage >= 85) return { level: 'warning', message: 'Approaching time limit', percentage }
    if (percentage >= 50) return { level: 'halfway', message: 'Halfway through', percentage }
    return null
  }

  const pacingStatus = getPacingStatus()

  // Timer logic
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(s => s + 1)
      }, 1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [timerRunning])

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Initiative logic
  const sortInitiative = useCallback((entries: InitiativeEntry[]) => {
    return [...entries].sort((a, b) => b.initiative - a.initiative)
  }, [])

  const addCombatant = () => {
    if (!newCombatant.name.trim()) return

    const entry: InitiativeEntry = {
      id: crypto.randomUUID(),
      name: newCombatant.name,
      initiative: newCombatant.initiative,
      hp: newCombatant.hp || undefined,
      maxHp: newCombatant.hp || undefined,
      ac: newCombatant.ac,
      isPlayer: newCombatant.isPlayer,
      isActive: false,
      conditions: [],
    }

    setInitiative(prev => sortInitiative([...prev, entry]))
    setNewCombatant({ name: '', initiative: 10, hp: 0, ac: 10, isPlayer: false })
    setAddCombatantOpen(false)
  }

  // Add multiple combatants from encounter preset
  const addFromPreset = (preset: EncounterPreset) => {
    const newEntries: InitiativeEntry[] = []

    for (const combatant of preset.combatants) {
      for (let i = 0; i < combatant.count; i++) {
        const entry: InitiativeEntry = {
          id: crypto.randomUUID(),
          name: combatant.count > 1 ? `${combatant.name} ${i + 1}` : combatant.name,
          initiative: combatant.initiative || Math.floor(Math.random() * 20) + 1,
          hp: combatant.hp || undefined,
          maxHp: combatant.hp || undefined,
          ac: combatant.ac || 10,
          isPlayer: false,
          isActive: false,
          conditions: [],
        }
        newEntries.push(entry)
      }
    }

    setInitiative(prev => sortInitiative([...prev, ...newEntries]))
    setPresetsOpen(false)
  }

  // Toggle condition on a combatant
  const toggleCondition = (entryId: string, conditionId: string) => {
    setInitiative(prev => prev.map(entry => {
      if (entry.id === entryId) {
        const hasCondition = entry.conditions.includes(conditionId)
        return {
          ...entry,
          conditions: hasCondition
            ? entry.conditions.filter(c => c !== conditionId)
            : [...entry.conditions, conditionId],
        }
      }
      return entry
    }))
  }

  // Create player view share link
  const createPlayerView = async () => {
    setCreatingPlayerView(true)
    try {
      // Generate a random share code
      const shareCode = Array.from({ length: 8 }, () =>
        'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]
      ).join('')

      const { error } = await supabase.from('run_sessions').insert({
        oneshot_id: oneshotId,
        user_id: user!.id,
        share_code: shareCode,
        session_state: { initiative, currentTurn, timerSeconds },
        is_active: true,
      })

      if (error) throw error

      setPlayerViewCode(shareCode)
    } catch (err) {
      console.error('Failed to create player view:', err)
      alert('Failed to create player view link')
    }
    setCreatingPlayerView(false)
  }

  // Update session state periodically
  useEffect(() => {
    if (!playerViewCode || !timerRunning) return

    const interval = setInterval(async () => {
      await supabase
        .from('run_sessions')
        .update({ session_state: { initiative, currentTurn, timerSeconds } })
        .eq('share_code', playerViewCode)
    }, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [playerViewCode, initiative, currentTurn, timerSeconds, timerRunning])

  // Copy player view URL
  const copyPlayerViewUrl = async () => {
    if (!playerViewCode) return
    const url = `${window.location.origin}/run/${playerViewCode}`
    await navigator.clipboard.writeText(url)
    setPlayerViewCopied(true)
    setTimeout(() => setPlayerViewCopied(false), 2000)
  }

  // End player view session
  const endPlayerView = async () => {
    if (!playerViewCode) return
    await supabase
      .from('run_sessions')
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq('share_code', playerViewCode)
    setPlayerViewCode(null)
  }

  const removeCombatant = (id: string) => {
    setInitiative(prev => {
      const newList = prev.filter(e => e.id !== id)
      if (currentTurn >= newList.length) {
        setCurrentTurn(Math.max(0, newList.length - 1))
      }
      return newList
    })
  }

  const nextTurn = () => {
    if (initiative.length === 0) return
    setCurrentTurn(prev => (prev + 1) % initiative.length)
  }

  const prevTurn = () => {
    if (initiative.length === 0) return
    setCurrentTurn(prev => (prev - 1 + initiative.length) % initiative.length)
  }

  const updateHp = (id: string, delta: number) => {
    setInitiative(prev => prev.map(e => {
      if (e.id === id && e.hp !== undefined) {
        const newHp = Math.max(0, e.hp + delta)
        return { ...e, hp: newHp }
      }
      return e
    }))
  }

  const clearInitiative = () => {
    setInitiative([])
    setCurrentTurn(0)
  }

  // End session & save run
  const handleEndSession = async () => {
    if (!oneshot) return

    setSaving(true)
    try {
      await supabase.from('oneshot_runs').insert({
        oneshot_id: oneshotId,
        run_date: new Date().toISOString().split('T')[0],
        group_name: groupName || null,
        player_count: playerCount,
        notes: sessionNotes || null,
        rating: sessionRating,
      })

      router.push(`/oneshots/${oneshotId}`)
    } catch (err) {
      console.error('Save run error:', err)
      alert('Failed to save session')
    } finally {
      setSaving(false)
    }
  }

  // ============ MOBILE LAYOUT ============
  if (isMobile) {
    if (loading) {
      return (
        <MobileLayout title="Run Mode" showBackButton backHref={`/oneshots/${oneshotId}`}>
          <div className="flex items-center justify-center h-[60vh]">
            <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full spinner" />
          </div>
        </MobileLayout>
      )
    }

    if (!oneshot) return null

    return (
      <>
        <div className="min-h-screen bg-[#0a0a0c] flex flex-col">
          {/* Mobile Header with Timer */}
          <header className="sticky top-0 z-50 bg-[#0d0d0f]/95 backdrop-blur-xl border-b border-white/[0.06] safe-area-top">
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => router.push(`/oneshots/${oneshotId}`)}
                  className="flex items-center gap-2 text-gray-400 active:text-white transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="text-center flex-1 px-4">
                  <h1 className="text-sm font-semibold text-white truncate">{oneshot.title}</h1>
                </div>

                <button
                  onClick={() => setEndSessionOpen(true)}
                  className="px-3 py-1.5 bg-red-500/80 active:bg-red-500 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  End
                </button>
              </div>

              {/* Timer */}
              <div className="flex items-center justify-center gap-3 bg-white/[0.03] rounded-xl px-4 py-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="font-mono text-xl font-semibold text-white tabular-nums">
                  {formatTime(timerSeconds)}
                </span>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => setTimerRunning(!timerRunning)}
                    className={cn(
                      "p-2 rounded-lg transition-colors",
                      timerRunning
                        ? "bg-amber-500/20 text-amber-400 active:bg-amber-500/30"
                        : "bg-emerald-500/20 text-emerald-400 active:bg-emerald-500/30"
                    )}
                  >
                    {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => { setTimerSeconds(0); setTimerRunning(false) }}
                    className="p-2 rounded-lg text-gray-400 active:text-white active:bg-white/[0.05] transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-t border-white/[0.06]">
              <button
                onClick={() => setMobileTab('initiative')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors",
                  mobileTab === 'initiative'
                    ? "text-purple-400 bg-purple-500/10 border-b-2 border-purple-500"
                    : "text-gray-500"
                )}
              >
                <Swords className="w-4 h-4" />
                Initiative
              </button>
              <button
                onClick={() => setMobileTab('notes')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors",
                  mobileTab === 'notes'
                    ? "text-purple-400 bg-purple-500/10 border-b-2 border-purple-500"
                    : "text-gray-500"
                )}
              >
                <BookOpen className="w-4 h-4" />
                Notes
              </button>
              <button
                onClick={() => setMobileTab('reference')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors",
                  mobileTab === 'reference'
                    ? "text-purple-400 bg-purple-500/10 border-b-2 border-purple-500"
                    : "text-gray-500"
                )}
              >
                <Target className="w-4 h-4" />
                Reference
              </button>
            </div>
          </header>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto pb-24">
            {/* Initiative Tab */}
            {mobileTab === 'initiative' && (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-white">Combat Tracker</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAddCombatantOpen(true)}
                      className="p-2 rounded-lg bg-purple-500/20 text-purple-400 active:bg-purple-500/30 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    {initiative.length > 0 && (
                      <button
                        onClick={clearInitiative}
                        className="p-2 rounded-lg text-red-400 active:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Turn Navigation */}
                {initiative.length > 0 && (
                  <div className="flex items-center justify-between bg-white/[0.03] rounded-lg p-3">
                    <button
                      onClick={prevTurn}
                      className="p-2 rounded-lg active:bg-white/[0.05] transition-colors"
                    >
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    </button>
                    <span className="text-sm text-gray-400">
                      Round {Math.floor(currentTurn / initiative.length) + 1}
                    </span>
                    <button
                      onClick={nextTurn}
                      className="p-2 rounded-lg active:bg-white/[0.05] transition-colors"
                    >
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                )}

                {/* Initiative List */}
                {initiative.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Swords className="w-12 h-12 text-gray-600 mb-3" />
                    <p className="text-sm text-gray-500 mb-4">No combatants yet</p>
                    <button
                      onClick={() => setAddCombatantOpen(true)}
                      className="px-4 py-2 bg-purple-600 active:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Add Combatant
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {initiative.map((entry, index) => (
                      <div
                        key={entry.id}
                        className={cn(
                          "p-3 rounded-xl transition-all",
                          index === currentTurn
                            ? "bg-purple-500/20 border border-purple-500/30"
                            : "bg-white/[0.02] border border-transparent",
                          entry.hp === 0 && "opacity-50"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm font-mono font-semibold text-white">
                              {entry.initiative}
                            </span>
                            <div>
                              <span className={cn(
                                "font-medium text-sm",
                                entry.isPlayer ? "text-emerald-400" : "text-white"
                              )}>
                                {entry.name}
                              </span>
                              {entry.ac && (
                                <span className="text-xs text-gray-500 ml-2">AC {entry.ac}</span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => removeCombatant(entry.id)}
                            className="p-2 rounded-lg text-gray-500 active:text-red-400 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* HP Bar */}
                        {entry.hp !== undefined && entry.maxHp !== undefined && (
                          <div className="mt-3 flex items-center gap-2">
                            <button
                              onClick={() => updateHp(entry.id, -1)}
                              className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 active:bg-red-500/30 flex items-center justify-center text-sm font-bold"
                            >
                              -
                            </button>
                            <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full transition-all",
                                  entry.hp > entry.maxHp * 0.5 ? "bg-emerald-500" :
                                  entry.hp > entry.maxHp * 0.25 ? "bg-amber-500" : "bg-red-500"
                                )}
                                style={{ width: `${(entry.hp / entry.maxHp) * 100}%` }}
                              />
                            </div>
                            <button
                              onClick={() => updateHp(entry.id, 1)}
                              className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 active:bg-emerald-500/30 flex items-center justify-center text-sm font-bold"
                            >
                              +
                            </button>
                            <span className="text-xs font-mono text-gray-400 w-14 text-right">
                              {entry.hp}/{entry.maxHp}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Notes Tab */}
            {mobileTab === 'notes' && (
              <div className="p-4 flex flex-col h-full">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-4 h-4 text-gray-500" />
                  <h3 className="text-sm font-medium text-gray-400">Session Notes</h3>
                </div>
                <textarea
                  value={sessionNotes}
                  onChange={e => setSessionNotes(e.target.value)}
                  placeholder="Take notes during the session..."
                  className="flex-1 min-h-[300px] w-full p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-purple-500/30 resize-none text-sm"
                />

                {/* Session Info */}
                <div className="mt-4 p-4 bg-white/[0.02] rounded-xl border border-white/[0.06] space-y-3">
                  <h3 className="text-xs text-gray-500 uppercase tracking-wider">Session Info</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Group Name</label>
                      <input
                        type="text"
                        value={groupName}
                        onChange={e => setGroupName(e.target.value)}
                        placeholder="Tuesday Crew"
                        className="w-full py-2 px-3 text-sm bg-white/[0.03] border border-white/[0.08] rounded-lg text-white placeholder:text-gray-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Players</label>
                      <input
                        type="number"
                        value={playerCount}
                        onChange={e => setPlayerCount(parseInt(e.target.value) || 0)}
                        min={1}
                        max={10}
                        className="w-full py-2 px-3 text-sm bg-white/[0.03] border border-white/[0.08] rounded-lg text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Reference Tab */}
            {mobileTab === 'reference' && (
              <div className="p-4 space-y-4">
                {/* Quick Stats */}
                <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                  <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">One-Shot Info</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Level</span>
                      <span className="text-white">{oneshot.level}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Players</span>
                      <span className="text-white">{oneshot.player_count_min}-{oneshot.player_count_max}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Duration</span>
                      <span className="text-white">{oneshot.estimated_duration || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">System</span>
                      <span className="text-white">{oneshot.game_system}</span>
                    </div>
                  </div>
                </div>

                {/* Reference Panels */}
                <div className="space-y-3">
                  {/* Session Plan */}
                  <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-hidden">
                    <button
                      onClick={() => setActivePanel(activePanel === 'session' ? null : 'session')}
                      className="w-full flex items-center justify-between p-3 active:bg-white/[0.04] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-purple-400" />
                        <span className="font-medium text-sm text-white">Session Plan</span>
                      </div>
                      {activePanel === 'session' ? (
                        <ChevronUp className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                    {activePanel === 'session' && (
                      <div className="px-3 pb-3 max-h-[200px] overflow-y-auto">
                        {oneshot.session_plan ? (
                          <MarkdownContent content={oneshot.session_plan} className="text-xs [&_p]:text-gray-400" />
                        ) : (
                          <p className="text-xs text-gray-400">No session plan added.</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* NPCs */}
                  <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-hidden">
                    <button
                      onClick={() => setActivePanel(activePanel === 'npcs' ? null : 'npcs')}
                      className="w-full flex items-center justify-between p-3 active:bg-white/[0.04] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-400" />
                        <span className="font-medium text-sm text-white">Key NPCs</span>
                      </div>
                      {activePanel === 'npcs' ? (
                        <ChevronUp className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                    {activePanel === 'npcs' && (
                      <div className="px-3 pb-3 max-h-[200px] overflow-y-auto">
                        {oneshot.key_npcs ? (
                          <MarkdownContent content={oneshot.key_npcs} className="text-xs [&_p]:text-gray-400" />
                        ) : (
                          <p className="text-xs text-gray-400">No NPCs added.</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Twists */}
                  <div className="bg-white/[0.02] rounded-xl border border-red-500/20 overflow-hidden">
                    <button
                      onClick={() => setActivePanel(activePanel === 'twists' ? null : 'twists')}
                      className="w-full flex items-center justify-between p-3 active:bg-white/[0.04] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        <span className="font-medium text-sm text-red-400">Secrets & Twists</span>
                      </div>
                      {activePanel === 'twists' ? (
                        <ChevronUp className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                    {activePanel === 'twists' && (
                      <div className="px-3 pb-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-500">DM Eyes Only</span>
                          <button
                            onClick={() => setShowTwists(!showTwists)}
                            className="p-1.5 rounded-lg text-gray-400 active:text-white transition-colors"
                          >
                            {showTwists ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {showTwists ? (
                          <div className="max-h-[200px] overflow-y-auto">
                            {oneshot.twists ? (
                              <MarkdownContent content={oneshot.twists} className="text-xs [&_p]:text-gray-400" />
                            ) : (
                              <p className="text-xs text-gray-400">No twists added.</p>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-6">
                            <EyeOff className="w-6 h-6 text-gray-600 mb-2" />
                            <p className="text-xs text-gray-500">Tap eye to reveal</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Introduction */}
                  {oneshot.introduction && (
                    <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                      <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Introduction</h3>
                      <p className="text-xs text-gray-400 line-clamp-6">
                        {oneshot.introduction}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Add Combatant Bottom Sheet */}
        <MobileBottomSheet
          isOpen={addCombatantOpen}
          onClose={() => setAddCombatantOpen(false)}
          title="Add Combatant"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Name</label>
              <input
                type="text"
                value={newCombatant.name}
                onChange={e => setNewCombatant(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Goblin, Player Name, etc."
                className="w-full py-3 px-4 bg-white/[0.03] border border-white/[0.08] rounded-lg text-white placeholder:text-gray-600"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Initiative</label>
                <input
                  type="number"
                  value={newCombatant.initiative}
                  onChange={e => setNewCombatant(prev => ({ ...prev, initiative: parseInt(e.target.value) || 0 }))}
                  className="w-full py-2 px-3 text-sm bg-white/[0.03] border border-white/[0.08] rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">HP</label>
                <input
                  type="number"
                  value={newCombatant.hp}
                  onChange={e => setNewCombatant(prev => ({ ...prev, hp: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                  className="w-full py-2 px-3 text-sm bg-white/[0.03] border border-white/[0.08] rounded-lg text-white placeholder:text-gray-600"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">AC</label>
                <input
                  type="number"
                  value={newCombatant.ac}
                  onChange={e => setNewCombatant(prev => ({ ...prev, ac: parseInt(e.target.value) || 10 }))}
                  className="w-full py-2 px-3 text-sm bg-white/[0.03] border border-white/[0.08] rounded-lg text-white"
                />
              </div>
            </div>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={newCombatant.isPlayer}
                onChange={e => setNewCombatant(prev => ({ ...prev, isPlayer: e.target.checked }))}
                className="w-5 h-5 rounded border-gray-600 text-purple-500"
              />
              <span className="text-sm text-gray-300">Player character</span>
            </label>

            <div className="flex gap-3 pt-2">
              <button
                className="flex-1 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-gray-300"
                onClick={() => setAddCombatantOpen(false)}
              >
                Cancel
              </button>
              <button
                className="flex-1 py-3 bg-purple-600 active:bg-purple-500 rounded-xl text-white font-medium disabled:opacity-50"
                onClick={addCombatant}
                disabled={!newCombatant.name.trim()}
              >
                Add
              </button>
            </div>
          </div>
        </MobileBottomSheet>

        {/* End Session Bottom Sheet */}
        <MobileBottomSheet
          isOpen={endSessionOpen}
          onClose={() => setEndSessionOpen(false)}
          title="End Session"
        >
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">Session Duration</p>
              <p className="text-3xl font-mono font-semibold text-white">{formatTime(timerSeconds)}</p>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2 text-center">Rating</label>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map(rating => (
                  <button
                    key={rating}
                    onClick={() => setSessionRating(rating)}
                    className={cn(
                      "w-12 h-12 rounded-xl text-lg font-semibold transition-colors",
                      sessionRating >= rating
                        ? "bg-purple-500/30 text-purple-300 border border-purple-500/50"
                        : "bg-white/[0.02] text-gray-500 border border-white/[0.06]"
                    )}
                  >
                    {rating}
                  </button>
                ))}
              </div>
            </div>

            {sessionNotes && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Notes Preview</label>
                <p className="text-sm text-gray-400 line-clamp-3">{sessionNotes}</p>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <button
                className="w-full flex items-center justify-center gap-2 py-3 bg-purple-600 active:bg-purple-500 rounded-xl text-white font-medium disabled:opacity-50"
                onClick={handleEndSession}
                disabled={saving}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save & Exit
              </button>
              <button
                className="w-full py-3 text-gray-400 text-sm"
                onClick={() => router.push(`/oneshots/${oneshotId}`)}
              >
                Exit Without Saving
              </button>
              <button
                className="w-full py-2 text-gray-500 text-sm"
                onClick={() => setEndSessionOpen(false)}
              >
                Continue Playing
              </button>
            </div>
          </div>
        </MobileBottomSheet>
      </>
    )
  }

  // ============ DESKTOP LAYOUT ============
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    )
  }

  if (!oneshot) return null

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex flex-col">
      {/* Header - Compact Run Mode Bar */}
      <header className="sticky top-0 z-50 bg-[#0d0d0f]/95 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/oneshots/${oneshotId}`)}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <h1 className="text-lg font-semibold text-white">{oneshot.title}</h1>
              <p className="text-xs text-gray-500">Run Mode</p>
            </div>
          </div>

          {/* Center - Timer */}
          <div className="flex items-center gap-3 bg-white/[0.03] rounded-xl px-4 py-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="font-mono text-xl font-semibold text-white tabular-nums">
              {formatTime(timerSeconds)}
            </span>
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={() => setTimerRunning(!timerRunning)}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  timerRunning
                    ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                    : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                )}
              >
                {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button
                onClick={() => { setTimerSeconds(0); setTimerRunning(false) }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.05] transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right - Player View & End Session */}
          <div className="flex items-center gap-2">
            {/* Player View Share */}
            {playerViewCode ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={copyPlayerViewUrl}
                  className="flex items-center gap-2 px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-sm font-medium rounded-lg transition-colors"
                >
                  {playerViewCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                  {playerViewCopied ? 'Copied!' : 'Player View'}
                </button>
                <button
                  onClick={endPlayerView}
                  className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                  title="End player view"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={createPlayerView}
                disabled={creatingPlayerView}
                className="flex items-center gap-2 px-3 py-2 bg-white/[0.05] hover:bg-white/[0.08] text-gray-300 text-sm font-medium rounded-lg transition-colors"
              >
                {creatingPlayerView ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
                Share Initiative
              </button>
            )}

            <button
              onClick={() => setEndSessionOpen(true)}
              className="px-4 py-2 bg-red-500/80 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              End Session
            </button>
          </div>
        </div>

        {/* Pacing Alert */}
        {pacingStatus && (
          <div className={cn(
            "px-4 py-2 flex items-center justify-between border-t",
            pacingStatus.level === 'over' && "bg-red-500/10 border-red-500/20",
            pacingStatus.level === 'warning' && "bg-amber-500/10 border-amber-500/20",
            pacingStatus.level === 'halfway' && "bg-blue-500/10 border-blue-500/20"
          )}>
            <div className="flex items-center gap-2">
              <Timer className={cn(
                "w-4 h-4",
                pacingStatus.level === 'over' && "text-red-400",
                pacingStatus.level === 'warning' && "text-amber-400",
                pacingStatus.level === 'halfway' && "text-blue-400"
              )} />
              <span className={cn(
                "text-sm font-medium",
                pacingStatus.level === 'over' && "text-red-400",
                pacingStatus.level === 'warning' && "text-amber-400",
                pacingStatus.level === 'halfway' && "text-blue-400"
              )}>
                {pacingStatus.message} ({Math.round(pacingStatus.percentage)}% of estimated {oneshot.estimated_duration})
              </span>
            </div>
            <button
              onClick={() => setPacingDismissed(true)}
              className="p-1 text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left - Initiative Tracker */}
        <div className="w-80 border-r border-white/[0.06] bg-[#0d0d0f]/50 flex flex-col">
          <div className="p-4 border-b border-white/[0.06]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Swords className="w-4 h-4 text-purple-400" />
                <h2 className="font-semibold text-white">Initiative</h2>
              </div>
              <div className="flex items-center gap-1">
                {encounterPresets.length > 0 && (
                  <button
                    onClick={() => setPresetsOpen(true)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                    title="Add from preset"
                  >
                    <Zap className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setAddCombatantOpen(true)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.05] transition-colors"
                  title="Add combatant"
                >
                  <Plus className="w-4 h-4" />
                </button>
                {initiative.length > 0 && (
                  <button
                    onClick={clearInitiative}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Clear all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Turn navigation */}
            {initiative.length > 0 && (
              <div className="flex items-center justify-between bg-white/[0.03] rounded-lg p-2">
                <button
                  onClick={prevTurn}
                  className="p-1.5 rounded hover:bg-white/[0.05] transition-colors"
                >
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                </button>
                <span className="text-sm text-gray-400">
                  Round {Math.floor(currentTurn / initiative.length) + 1}
                </span>
                <button
                  onClick={nextTurn}
                  className="p-1.5 rounded hover:bg-white/[0.05] transition-colors"
                >
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            )}
          </div>

          {/* Initiative List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {initiative.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <Swords className="w-10 h-10 text-gray-600 mb-3" />
                <p className="text-sm text-gray-500">No combatants yet</p>
                <button
                  onClick={() => setAddCombatantOpen(true)}
                  className="mt-3 text-xs text-purple-400 hover:text-purple-300"
                >
                  Add combatant
                </button>
              </div>
            ) : (
              initiative.map((entry, index) => (
                <div
                  key={entry.id}
                  className={cn(
                    "p-3 rounded-lg transition-all group",
                    index === currentTurn
                      ? "bg-purple-500/20 border border-purple-500/30"
                      : "bg-white/[0.02] border border-transparent hover:bg-white/[0.04]",
                    entry.hp === 0 && "opacity-50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded bg-white/10 flex items-center justify-center text-xs font-mono font-semibold text-white">
                        {entry.initiative}
                      </span>
                      <span className={cn(
                        "font-medium",
                        entry.isPlayer ? "text-emerald-400" : "text-white"
                      )}>
                        {entry.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setConditionsEntryId(entry.id)}
                        className="p-1 rounded text-gray-500 hover:text-purple-400 transition-colors opacity-0 group-hover:opacity-100"
                        title="Manage conditions"
                      >
                        <Shield className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeCombatant(entry.id)}
                        className="p-1 rounded text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Conditions Display */}
                  {entry.conditions.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {entry.conditions.map(condId => {
                        const cond = CONDITIONS.find(c => c.id === condId)
                        if (!cond) return null
                        return (
                          <button
                            key={condId}
                            onClick={() => toggleCondition(entry.id, condId)}
                            className={cn(
                              "px-1.5 py-0.5 rounded text-[10px] font-medium text-white",
                              cond.color
                            )}
                            title={`Remove ${cond.name}`}
                          >
                            {cond.name}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* HP Bar */}
                  {entry.hp !== undefined && entry.maxHp !== undefined && (
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={() => updateHp(entry.id, -1)}
                        className="w-6 h-6 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 flex items-center justify-center text-xs font-bold"
                      >
                        -
                      </button>
                      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full transition-all",
                            entry.hp > entry.maxHp * 0.5 ? "bg-emerald-500" :
                            entry.hp > entry.maxHp * 0.25 ? "bg-amber-500" : "bg-red-500"
                          )}
                          style={{ width: `${(entry.hp / entry.maxHp) * 100}%` }}
                        />
                      </div>
                      <button
                        onClick={() => updateHp(entry.id, 1)}
                        className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 flex items-center justify-center text-xs font-bold"
                      >
                        +
                      </button>
                      <span className="text-xs font-mono text-gray-400 w-12 text-right">
                        {entry.hp}/{entry.maxHp}
                      </span>
                    </div>
                  )}

                  {/* AC display */}
                  {entry.ac && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500">
                      <span>AC {entry.ac}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Center - Main Area */}
        <div className="flex-1 flex flex-col">
          {/* Quick Reference Tabs */}
          <div className="border-b border-white/[0.06] px-4 py-2 flex items-center gap-2">
            <button
              onClick={() => setActivePanel(activePanel === 'session' ? null : 'session')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors",
                activePanel === 'session'
                  ? "bg-purple-500/20 text-purple-300"
                  : "text-gray-400 hover:text-white hover:bg-white/[0.05]"
              )}
            >
              <Target className="w-4 h-4" />
              Session Plan
            </button>
            <button
              onClick={() => setActivePanel(activePanel === 'npcs' ? null : 'npcs')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors",
                activePanel === 'npcs'
                  ? "bg-purple-500/20 text-purple-300"
                  : "text-gray-400 hover:text-white hover:bg-white/[0.05]"
              )}
            >
              <Users className="w-4 h-4" />
              NPCs
            </button>
            <button
              onClick={() => {
                setActivePanel(activePanel === 'twists' ? null : 'twists')
              }}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors",
                activePanel === 'twists'
                  ? "bg-red-500/20 text-red-300"
                  : "text-gray-400 hover:text-white hover:bg-white/[0.05]"
              )}
            >
              <AlertTriangle className="w-4 h-4" />
              Secrets
            </button>
          </div>

          {/* Reference Panel Content */}
          {activePanel && (
            <div className="border-b border-white/[0.06] bg-white/[0.01] max-h-[40vh] overflow-y-auto">
              <div className="p-4">
                {activePanel === 'session' && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Session Plan</h3>
                    {oneshot.session_plan ? (
                      <MarkdownContent content={oneshot.session_plan} className="text-sm [&_p]:text-gray-300" />
                    ) : (
                      <p className="text-sm text-gray-300">No session plan added yet.</p>
                    )}
                  </div>
                )}
                {activePanel === 'npcs' && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Key NPCs</h3>
                    {oneshot.key_npcs ? (
                      <MarkdownContent content={oneshot.key_npcs} className="text-sm [&_p]:text-gray-300" />
                    ) : (
                      <p className="text-sm text-gray-300">No NPCs added yet.</p>
                    )}
                  </div>
                )}
                {activePanel === 'twists' && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-red-400">Twists & Secrets</h3>
                      <button
                        onClick={() => setShowTwists(!showTwists)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white transition-colors"
                      >
                        {showTwists ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {showTwists ? (
                      oneshot.twists ? (
                        <MarkdownContent content={oneshot.twists} className="text-sm [&_p]:text-gray-300" />
                      ) : (
                        <p className="text-sm text-gray-300">No twists added yet.</p>
                      )
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8">
                        <EyeOff className="w-8 h-8 text-gray-600 mb-2" />
                        <p className="text-sm text-gray-500">Click eye to reveal</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Session Notes */}
          <div className="flex-1 p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-medium text-gray-400">Session Notes</h3>
              </div>
            </div>
            <textarea
              value={sessionNotes}
              onChange={e => setSessionNotes(e.target.value)}
              placeholder="Take notes during the session... Key moments, player actions, plot developments, things to remember..."
              className="flex-1 w-full p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-purple-500/30 resize-none"
            />
          </div>
        </div>

        {/* Right - Quick Info */}
        <div className="w-64 border-l border-white/[0.06] bg-[#0d0d0f]/50 p-4 space-y-4">
          {/* Session Info */}
          <div className="space-y-3">
            <h3 className="text-xs text-gray-500 uppercase tracking-wider">Session Info</h3>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Group Name</label>
              <input
                type="text"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                placeholder="e.g., Tuesday Night Crew"
                className="w-full py-2 px-3 text-sm bg-white/[0.02] border border-white/[0.06] rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/30"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Player Count</label>
              <input
                type="number"
                value={playerCount}
                onChange={e => setPlayerCount(parseInt(e.target.value) || 0)}
                min={1}
                max={10}
                className="w-full py-2 px-3 text-sm bg-white/[0.02] border border-white/[0.06] rounded-lg text-white focus:outline-none focus:border-purple-500/30"
              />
            </div>
          </div>

          {/* Oneshot Quick Stats */}
          <div className="space-y-3 pt-4 border-t border-white/[0.06]">
            <h3 className="text-xs text-gray-500 uppercase tracking-wider">One-Shot Info</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Level</span>
                <span className="text-white">{oneshot.level}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Players</span>
                <span className="text-white">{oneshot.player_count_min}-{oneshot.player_count_max}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Duration</span>
                <span className="text-white">{oneshot.estimated_duration || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">System</span>
                <span className="text-white">{oneshot.game_system}</span>
              </div>
            </div>
          </div>

          {/* Introduction Quick View */}
          {oneshot.introduction && (
            <div className="space-y-2 pt-4 border-t border-white/[0.06]">
              <h3 className="text-xs text-gray-500 uppercase tracking-wider">Introduction</h3>
              <p className="text-xs text-gray-400 line-clamp-6">
                {oneshot.introduction.slice(0, 300)}
                {oneshot.introduction.length > 300 && '...'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Combatant Modal */}
      <Modal
        isOpen={addCombatantOpen}
        onClose={() => setAddCombatantOpen(false)}
        title="Add Combatant"
      >
        <div className="space-y-4 py-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Name</label>
            <input
              type="text"
              value={newCombatant.name}
              onChange={e => setNewCombatant(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Goblin, Player Name, etc."
              className="w-full py-2.5 px-4 bg-white/[0.02] border border-white/[0.06] rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/30"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Initiative</label>
              <input
                type="number"
                value={newCombatant.initiative}
                onChange={e => setNewCombatant(prev => ({ ...prev, initiative: parseInt(e.target.value) || 0 }))}
                className="w-full py-2.5 px-4 bg-white/[0.02] border border-white/[0.06] rounded-lg text-white focus:outline-none focus:border-purple-500/30"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">HP</label>
              <input
                type="number"
                value={newCombatant.hp}
                onChange={e => setNewCombatant(prev => ({ ...prev, hp: parseInt(e.target.value) || 0 }))}
                placeholder="0 = none"
                className="w-full py-2.5 px-4 bg-white/[0.02] border border-white/[0.06] rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/30"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">AC</label>
              <input
                type="number"
                value={newCombatant.ac}
                onChange={e => setNewCombatant(prev => ({ ...prev, ac: parseInt(e.target.value) || 10 }))}
                className="w-full py-2.5 px-4 bg-white/[0.02] border border-white/[0.06] rounded-lg text-white focus:outline-none focus:border-purple-500/30"
              />
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={newCombatant.isPlayer}
              onChange={e => setNewCombatant(prev => ({ ...prev, isPlayer: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-600 text-purple-500 focus:ring-purple-500"
            />
            <span className="text-sm text-gray-300">This is a player character</span>
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            onClick={() => setAddCombatantOpen(false)}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
            onClick={addCombatant}
            disabled={!newCombatant.name.trim()}
          >
            Add
          </button>
        </div>
      </Modal>

      {/* End Session Modal */}
      <Modal
        isOpen={endSessionOpen}
        onClose={() => setEndSessionOpen(false)}
        title="End Session"
        description="Save this session run to your history"
      >
        <div className="space-y-4 py-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Session Duration</label>
            <div className="text-2xl font-mono font-semibold text-white">
              {formatTime(timerSeconds)}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(rating => (
                <button
                  key={rating}
                  onClick={() => setSessionRating(rating)}
                  className={cn(
                    "w-10 h-10 rounded-lg text-lg font-semibold transition-colors",
                    sessionRating >= rating
                      ? "bg-purple-500/30 text-purple-300 border border-purple-500/50"
                      : "bg-white/[0.02] text-gray-500 border border-white/[0.06] hover:border-white/10"
                  )}
                >
                  {rating}
                </button>
              ))}
            </div>
          </div>

          {sessionNotes && (
            <div>
              <label className="block text-sm text-gray-400 mb-2">Session Notes Preview</label>
              <p className="text-sm text-gray-500 line-clamp-3">{sessionNotes}</p>
            </div>
          )}
        </div>

        <div className="flex justify-between pt-4 border-t border-white/[0.06]">
          <button
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            onClick={() => setEndSessionOpen(false)}
          >
            Continue Playing
          </button>
          <div className="flex gap-2">
            <button
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              onClick={() => router.push(`/oneshots/${oneshotId}`)}
            >
              Exit Without Saving
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
              onClick={handleEndSession}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save & Exit
            </button>
          </div>
        </div>
      </Modal>

      {/* Conditions Picker Modal */}
      <Modal
        isOpen={!!conditionsEntryId}
        onClose={() => setConditionsEntryId(null)}
        title="Manage Conditions"
      >
        {conditionsEntryId && (() => {
          const entry = initiative.find(e => e.id === conditionsEntryId)
          if (!entry) return null
          return (
            <div className="py-4">
              <p className="text-sm text-gray-400 mb-4">
                Select conditions for <span className="text-white font-medium">{entry.name}</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                {CONDITIONS.map(condition => {
                  const isActive = entry.conditions.includes(condition.id)
                  return (
                    <button
                      key={condition.id}
                      onClick={() => toggleCondition(conditionsEntryId, condition.id)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                        isActive
                          ? `${condition.color} text-white`
                          : "bg-white/[0.02] text-gray-400 hover:bg-white/[0.05]"
                      )}
                    >
                      {isActive && <Check className="w-3 h-3" />}
                      {condition.name}
                    </button>
                  )
                })}
              </div>
              <div className="flex justify-end pt-4 mt-4 border-t border-white/[0.06]">
                <button
                  onClick={() => setConditionsEntryId(null)}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* Encounter Presets Modal */}
      <Modal
        isOpen={presetsOpen}
        onClose={() => setPresetsOpen(false)}
        title="Add from Encounter Preset"
      >
        <div className="py-4 space-y-3">
          <p className="text-sm text-gray-400 mb-4">
            Quickly add pre-configured enemy groups to the initiative tracker.
          </p>
          {encounterPresets.length === 0 ? (
            <div className="text-center py-8">
              <Zap className="w-10 h-10 mx-auto text-gray-600 mb-3" />
              <p className="text-sm text-gray-500">No encounter presets defined</p>
              <p className="text-xs text-gray-600 mt-1">
                Add encounter presets in the oneshot editor
              </p>
            </div>
          ) : (
            encounterPresets.map(preset => (
              <button
                key={preset.id}
                onClick={() => addFromPreset(preset)}
                className="w-full p-4 bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] rounded-xl text-left transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">{preset.name}</span>
                  <span className="text-xs text-gray-500">
                    {preset.combatants.reduce((sum, c) => sum + c.count, 0)} enemies
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {preset.combatants.map((c, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-white/[0.05] rounded text-xs text-gray-400"
                    >
                      {c.count}x {c.name} (HP:{c.hp}, AC:{c.ac})
                    </span>
                  ))}
                </div>
              </button>
            ))
          )}
        </div>
      </Modal>
    </div>
  )
}

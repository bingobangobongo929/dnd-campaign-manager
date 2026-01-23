'use client'

import { useState, useEffect } from 'react'
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Loader2,
  FileText,
  Play,
  CheckCircle2,
  ClipboardList,
  Save,
  Lightbulb,
  ChevronDown,
  Pin,
  Timer,
  X,
  Clock,
  Pause,
  RefreshCw,
  MapPin,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type {
  Session,
  SessionPhase,
  SessionSection,
  PrepChecklistItem,
  SessionTimerState,
  PinnedReference,
  SessionAttendee,
} from '@/types/database'
import { v4 as uuidv4 } from 'uuid'

interface Character {
  id: string
  name: string
  type: 'pc' | 'npc'
  image_url?: string | null
}

interface Location {
  id: string
  name: string
  type?: string
}

interface SessionWorkflowProps {
  campaignId: string
  session: Session
  characters?: Character[]
  locations?: Location[]
  previousSession?: Session | null
  onUpdate?: (session: Session) => void
}

// Get default sections based on phase
function getDefaultSections(phase: SessionPhase): SessionSection[] {
  switch (phase) {
    case 'prep':
      return ['prep_checklist', 'thoughts_for_next', 'quick_reference']
    case 'live':
      return ['session_timer', 'quick_reference']
    case 'completed':
      return ['thoughts_for_next']
    default:
      return ['prep_checklist']
  }
}

export function SessionWorkflow({ campaignId, session, characters = [], locations = [], previousSession, onUpdate }: SessionWorkflowProps) {
  // Parse session data with proper types
  const [phase, setPhase] = useState<SessionPhase>((session.phase as SessionPhase) || 'prep')
  const [enabledSections, setEnabledSections] = useState<SessionSection[]>(
    (session.enabled_sections as unknown as SessionSection[]) || getDefaultSections((session.phase as SessionPhase) || 'prep')
  )
  const [prepChecklist, setPrepChecklist] = useState<PrepChecklistItem[]>(
    (session.prep_checklist as unknown as PrepChecklistItem[]) || []
  )
  const [thoughtsForNext, setThoughtsForNext] = useState(session.thoughts_for_next || '')
  const [timerState, setTimerState] = useState<SessionTimerState | null>(
    session.session_timer as unknown as SessionTimerState | null
  )
  const [pinnedRefs, setPinnedRefs] = useState<PinnedReference[]>(
    (session.pinned_references as unknown as PinnedReference[]) || []
  )

  const [newPrepItem, setNewPrepItem] = useState('')
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Quick reference state
  const [showCharacterPicker, setShowCharacterPicker] = useState(false)
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [newManualRef, setNewManualRef] = useState('')

  // Timer display state
  const [timerDisplay, setTimerDisplay] = useState('00:00:00')

  // Track changes
  useEffect(() => {
    const originalPhase = session.phase || 'prep'
    const originalChecklist = session.prep_checklist || []
    const originalThoughts = session.thoughts_for_next || ''
    const originalSections = session.enabled_sections || ['prep_checklist']

    const changed =
      phase !== originalPhase ||
      JSON.stringify(prepChecklist) !== JSON.stringify(originalChecklist) ||
      JSON.stringify(enabledSections) !== JSON.stringify(originalSections) ||
      thoughtsForNext !== originalThoughts

    setHasChanges(changed)
  }, [phase, prepChecklist, thoughtsForNext, enabledSections, session])

  // Timer update effect
  useEffect(() => {
    if (!timerState?.started_at || timerState.paused_at) return

    const updateDisplay = () => {
      const start = new Date(timerState.started_at!).getTime()
      const now = Date.now()
      const elapsed = Math.floor((now - start) / 1000) + (timerState.elapsed_seconds || 0)

      const hours = Math.floor(elapsed / 3600)
      const minutes = Math.floor((elapsed % 3600) / 60)
      const seconds = elapsed % 60

      setTimerDisplay(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      )
    }

    updateDisplay()
    const interval = setInterval(updateDisplay, 1000)
    return () => clearInterval(interval)
  }, [timerState])

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/sessions/${session.id}/workflow`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phase,
            prepChecklist,
            thoughtsForNext,
            enabledSections,
            sessionTimer: timerState,
            pinnedReferences: pinnedRefs,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to save')
        return
      }

      toast.success('Session updated')
      onUpdate?.(data.session)
      setHasChanges(false)
    } catch (error) {
      console.error('Failed to save:', error)
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  // Checklist functions
  const addPrepItem = () => {
    if (!newPrepItem.trim()) return
    setPrepChecklist([
      ...prepChecklist,
      { id: uuidv4(), text: newPrepItem.trim(), checked: false }
    ])
    setNewPrepItem('')
  }

  const togglePrepItem = (id: string) => {
    setPrepChecklist(prepChecklist.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    ))
  }

  const removePrepItem = (id: string) => {
    setPrepChecklist(prepChecklist.filter(item => item.id !== id))
  }

  // Section management
  const toggleSection = (section: SessionSection) => {
    if (enabledSections.includes(section)) {
      // Check if section has data before removing
      let hasData = false
      switch (section) {
        case 'prep_checklist':
          hasData = prepChecklist.length > 0
          break
        case 'thoughts_for_next':
          hasData = thoughtsForNext.trim().length > 0
          break
        case 'session_timer':
          hasData = timerState !== null && (timerState.elapsed_seconds > 0 || timerState.started_at !== null)
          break
        case 'quick_reference':
          hasData = pinnedRefs.length > 0
          break
      }

      if (hasData) {
        const confirmed = window.confirm(
          'This section has content. Removing it will clear the data. Continue?'
        )
        if (!confirmed) return

        // Clear the data
        switch (section) {
          case 'prep_checklist':
            setPrepChecklist([])
            break
          case 'thoughts_for_next':
            setThoughtsForNext('')
            break
          case 'session_timer':
            setTimerState(null)
            break
          case 'quick_reference':
            setPinnedRefs([])
            break
        }
      }

      setEnabledSections(enabledSections.filter(s => s !== section))
    } else {
      setEnabledSections([...enabledSections, section])
    }
  }

  // Timer functions
  const startTimer = () => {
    if (timerState?.started_at && !timerState.paused_at) return // Already running

    if (timerState?.paused_at) {
      // Resume from pause
      const pausedAt = new Date(timerState.paused_at).getTime()
      const startedAt = new Date(timerState.started_at!).getTime()
      const pausedDuration = pausedAt - startedAt
      const newElapsed = (timerState.elapsed_seconds || 0) + Math.floor(pausedDuration / 1000)

      setTimerState({
        ...timerState,
        started_at: new Date().toISOString(),
        paused_at: null,
        elapsed_seconds: newElapsed,
      })
    } else {
      // Fresh start
      setTimerState({
        started_at: new Date().toISOString(),
        paused_at: null,
        elapsed_seconds: 0,
        breaks: [],
      })
    }
  }

  const pauseTimer = () => {
    if (!timerState?.started_at || timerState.paused_at) return
    setTimerState({
      ...timerState,
      paused_at: new Date().toISOString(),
    })
  }

  const resetTimer = () => {
    setTimerState({
      started_at: null,
      paused_at: null,
      elapsed_seconds: 0,
      breaks: [],
    })
    setTimerDisplay('00:00:00')
  }

  // Carry over prep checklist from previous session
  const carryOverFromPrevious = () => {
    if (!previousSession?.prep_checklist) return
    const prevChecklist = previousSession.prep_checklist as unknown as PrepChecklistItem[]
    if (!prevChecklist.length) return

    // Reset all items to unchecked and give new IDs
    const carriedItems = prevChecklist.map(item => ({
      id: uuidv4(),
      text: item.text,
      checked: false,
    }))

    setPrepChecklist([...prepChecklist, ...carriedItems])
  }

  // Quick reference functions
  const addCharacterRef = (char: Character) => {
    // Don't add duplicates
    if (pinnedRefs.some(r => r.entity_id === char.id)) return

    setPinnedRefs([
      ...pinnedRefs,
      {
        entity_type: char.type === 'npc' ? 'npc' : 'character',
        entity_id: char.id,
        label: char.name,
      }
    ])
    setShowCharacterPicker(false)
  }

  const addLocationRef = (loc: Location) => {
    // Don't add duplicates
    if (pinnedRefs.some(r => r.entity_id === loc.id)) return

    setPinnedRefs([
      ...pinnedRefs,
      {
        entity_type: 'location',
        entity_id: loc.id,
        label: loc.name,
      }
    ])
    setShowLocationPicker(false)
  }

  const addManualRef = () => {
    if (!newManualRef.trim()) return
    setPinnedRefs([
      ...pinnedRefs,
      {
        entity_type: 'note',
        entity_id: uuidv4(),
        label: newManualRef.trim(),
      }
    ])
    setNewManualRef('')
  }

  const removeRef = (entityId: string) => {
    setPinnedRefs(pinnedRefs.filter(r => r.entity_id !== entityId))
  }

  // Filter out already pinned characters and locations
  const unpinnedCharacters = characters.filter(
    char => !pinnedRefs.some(r => r.entity_id === char.id)
  )

  const unpinnedLocations = locations.filter(
    loc => !pinnedRefs.some(r => r.entity_id === loc.id)
  )

  // Check if previous session has a prep checklist we can carry over
  const previousChecklist = previousSession?.prep_checklist as unknown as PrepChecklistItem[] | undefined
  const canCarryOver = previousChecklist && previousChecklist.length > 0

  // Phase configuration
  const phases: { value: SessionPhase; label: string; description: string; icon: typeof FileText; color: string }[] = [
    { value: 'prep', label: 'Prep', description: 'Preparing for session', icon: ClipboardList, color: 'text-yellow-400' },
    { value: 'live', label: 'Live', description: 'Session in progress', icon: Play, color: 'text-green-400' },
    { value: 'completed', label: 'Completed', description: 'Session finished', icon: CheckCircle2, color: 'text-purple-400' },
  ]

  // Available sections
  const availableSections: { id: SessionSection; label: string; icon: typeof FileText; description: string }[] = [
    { id: 'prep_checklist', label: 'Prep Checklist', icon: ClipboardList, description: 'Things to prepare before the session' },
    { id: 'thoughts_for_next', label: 'Thoughts for Next', icon: Lightbulb, description: 'Ideas and notes for the next session' },
    { id: 'quick_reference', label: 'Quick Reference', icon: Pin, description: 'Pin NPCs, locations for quick access' },
    { id: 'session_timer', label: 'Session Timer', icon: Timer, description: 'Track session duration' },
  ]

  const completedCount = prepChecklist.filter(item => item.checked).length

  return (
    <div className="card p-6 space-y-6">
      {/* Header with Phase Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-white">Session Workflow</span>
        </div>

        {/* Phase Dropdown */}
        <div className="relative">
          <select
            value={phase}
            onChange={(e) => setPhase(e.target.value as SessionPhase)}
            className={cn(
              "appearance-none pl-4 pr-10 py-2 rounded-lg border text-sm font-medium cursor-pointer",
              "bg-[#0a0a0f] border-[--border] focus:outline-none focus:border-purple-500",
              phase === 'prep' && "text-yellow-400 border-yellow-500/30",
              phase === 'live' && "text-green-400 border-green-500/30",
              phase === 'completed' && "text-purple-400 border-purple-500/30"
            )}
          >
            {phases.map(p => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {/* Section Toggles */}
      <div>
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          Active Sections
        </div>
        <div className="flex flex-wrap gap-2">
          {availableSections.map(section => {
            const isEnabled = enabledSections.includes(section.id)
            const Icon = section.icon
            return (
              <button
                key={section.id}
                onClick={() => toggleSection(section.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-colors",
                  isEnabled
                    ? "bg-purple-600/20 border-purple-500/50 text-purple-300"
                    : "bg-white/[0.02] border-[--border] text-gray-500 hover:border-gray-600"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {section.label}
                {isEnabled && <X className="w-3 h-3 ml-1 opacity-50" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Prep Checklist Section */}
      {enabledSections.includes('prep_checklist') && (
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-yellow-400" />
              <span className="font-medium text-white">Prep Checklist</span>
              {prepChecklist.length > 0 && (
                <span className="text-xs text-gray-500">
                  ({completedCount}/{prepChecklist.length})
                </span>
              )}
            </div>
            {canCarryOver && (
              <button
                onClick={carryOverFromPrevious}
                className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30 transition-colors flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Carry over from last session
              </button>
            )}
          </div>

          {/* Checklist Items */}
          <div className="space-y-2 mb-3">
            {prepChecklist.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-2 group",
                  item.checked && "opacity-60"
                )}
              >
                <button
                  onClick={() => togglePrepItem(item.id)}
                  className="flex-shrink-0"
                >
                  {item.checked ? (
                    <CheckSquare className="w-5 h-5 text-green-400" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-500" />
                  )}
                </button>
                <span className={cn(
                  "flex-1 text-sm",
                  item.checked ? "text-gray-500 line-through" : "text-gray-300"
                )}>
                  {item.text}
                </span>
                <button
                  onClick={() => removePrepItem(item.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/[0.05] rounded text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Add New Item */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newPrepItem}
              onChange={(e) => setNewPrepItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addPrepItem()}
              placeholder="Add prep item..."
              className="form-input flex-1 text-sm"
            />
            <button
              onClick={addPrepItem}
              disabled={!newPrepItem.trim()}
              className="btn btn-sm btn-secondary"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Default suggestions */}
          {prepChecklist.length === 0 && (
            <div className="mt-3 pt-3 border-t border-yellow-500/10">
              <p className="text-xs text-gray-500 mb-2">Quick add common items:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  'Review last session notes',
                  'Prepare NPC voices',
                  'Check encounter balance',
                  'Gather handouts/maps',
                  'Set up music playlist',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setPrepChecklist([
                      ...prepChecklist,
                      { id: uuidv4(), text: suggestion, checked: false }
                    ])}
                    className="text-xs px-2 py-1 bg-white/[0.05] hover:bg-white/[0.1] rounded text-gray-400"
                  >
                    + {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Session Timer Section */}
      {enabledSections.includes('session_timer') && (
        <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Timer className="w-5 h-5 text-green-400" />
              <span className="font-medium text-white">Session Timer</span>
            </div>
            <button
              onClick={resetTimer}
              className="text-xs text-gray-500 hover:text-gray-300"
            >
              Reset
            </button>
          </div>

          <div className="flex items-center justify-center gap-6">
            <span className="text-4xl font-mono text-white">
              {timerDisplay}
            </span>
            <div className="flex gap-2">
              {(!timerState?.started_at || timerState.paused_at) ? (
                <button
                  onClick={startTimer}
                  className="p-3 rounded-full bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                >
                  <Play className="w-6 h-6" />
                </button>
              ) : (
                <button
                  onClick={pauseTimer}
                  className="p-3 rounded-full bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors"
                >
                  <Pause className="w-6 h-6" />
                </button>
              )}
            </div>
          </div>

          {timerState?.started_at && (
            <p className="text-xs text-gray-500 text-center mt-3">
              Started at {new Date(timerState.started_at).toLocaleTimeString()}
            </p>
          )}
        </div>
      )}

      {/* Quick Reference Section */}
      {enabledSections.includes('quick_reference') && (
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Pin className="w-5 h-5 text-blue-400" />
              <span className="font-medium text-white">Quick Reference</span>
              {pinnedRefs.length > 0 && (
                <span className="text-xs text-gray-500">({pinnedRefs.length})</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {characters.length > 0 && (
                <button
                  onClick={() => {
                    setShowCharacterPicker(!showCharacterPicker)
                    setShowLocationPicker(false)
                  }}
                  className={cn(
                    "text-xs px-2 py-1 rounded transition-colors",
                    showCharacterPicker
                      ? "bg-blue-500/30 text-blue-300"
                      : "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                  )}
                >
                  <Plus className="w-3 h-3 inline mr-1" />
                  Character
                </button>
              )}
              {locations.length > 0 && (
                <button
                  onClick={() => {
                    setShowLocationPicker(!showLocationPicker)
                    setShowCharacterPicker(false)
                  }}
                  className={cn(
                    "text-xs px-2 py-1 rounded transition-colors",
                    showLocationPicker
                      ? "bg-emerald-500/30 text-emerald-300"
                      : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                  )}
                >
                  <MapPin className="w-3 h-3 inline mr-1" />
                  Location
                </button>
              )}
            </div>
          </div>

          {/* Character Picker Dropdown */}
          {showCharacterPicker && unpinnedCharacters.length > 0 && (
            <div className="mb-3 p-2 bg-white/[0.02] rounded-lg border border-white/[0.06] max-h-48 overflow-y-auto">
              <div className="text-xs text-gray-500 mb-2">Select a character to pin:</div>
              <div className="space-y-1">
                {unpinnedCharacters.map(char => (
                  <button
                    key={char.id}
                    onClick={() => addCharacterRef(char)}
                    className="w-full flex items-center gap-2 p-2 rounded hover:bg-white/[0.05] transition-colors text-left"
                  >
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded uppercase font-medium",
                      char.type === 'npc' ? "bg-amber-500/20 text-amber-400" : "bg-purple-500/20 text-purple-400"
                    )}>
                      {char.type}
                    </span>
                    <span className="text-sm text-gray-300">{char.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {showCharacterPicker && unpinnedCharacters.length === 0 && (
            <div className="mb-3 p-2 bg-white/[0.02] rounded-lg border border-white/[0.06]">
              <p className="text-xs text-gray-500">All characters are already pinned.</p>
            </div>
          )}

          {/* Location Picker Dropdown */}
          {showLocationPicker && unpinnedLocations.length > 0 && (
            <div className="mb-3 p-2 bg-white/[0.02] rounded-lg border border-white/[0.06] max-h-48 overflow-y-auto">
              <div className="text-xs text-gray-500 mb-2">Select a location to pin:</div>
              <div className="space-y-1">
                {unpinnedLocations.map(loc => (
                  <button
                    key={loc.id}
                    onClick={() => addLocationRef(loc)}
                    className="w-full flex items-center gap-2 p-2 rounded hover:bg-white/[0.05] transition-colors text-left"
                  >
                    <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-medium bg-emerald-500/20 text-emerald-400">
                      {loc.type || 'location'}
                    </span>
                    <span className="text-sm text-gray-300">{loc.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {showLocationPicker && unpinnedLocations.length === 0 && (
            <div className="mb-3 p-2 bg-white/[0.02] rounded-lg border border-white/[0.06]">
              <p className="text-xs text-gray-500">All locations are already pinned.</p>
            </div>
          )}

          {/* Pinned Items */}
          {pinnedRefs.length > 0 && (
            <div className="space-y-2 mb-3">
              {pinnedRefs.map((ref) => (
                <div
                  key={ref.entity_id}
                  className="flex items-center gap-2 p-2 bg-white/[0.02] rounded-lg group"
                >
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded uppercase font-medium",
                    ref.entity_type === 'npc' ? "bg-amber-500/20 text-amber-400" :
                    ref.entity_type === 'character' ? "bg-purple-500/20 text-purple-400" :
                    ref.entity_type === 'location' ? "bg-emerald-500/20 text-emerald-400" :
                    "bg-gray-500/20 text-gray-400"
                  )}>
                    {ref.entity_type}
                  </span>
                  <span className="text-sm text-gray-300 flex-1">{ref.label}</span>
                  <button
                    onClick={() => removeRef(ref.entity_id!)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/[0.05] rounded text-red-400 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Manual Note Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newManualRef}
              onChange={(e) => setNewManualRef(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addManualRef()}
              placeholder="Add a quick note..."
              className="form-input flex-1 text-sm"
            />
            <button
              onClick={addManualRef}
              disabled={!newManualRef.trim()}
              className="btn btn-sm btn-secondary"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {pinnedRefs.length === 0 && !showCharacterPicker && (
            <p className="text-xs text-gray-500 mt-2">
              Pin NPCs, characters, or add notes for quick access during the session.
            </p>
          )}
        </div>
      )}

      {/* Thoughts for Next Session */}
      {enabledSections.includes('thoughts_for_next') && (
        <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-5 h-5 text-purple-400" />
            <span className="font-medium text-white">Thoughts for Next Session</span>
          </div>
          <textarea
            value={thoughtsForNext}
            onChange={(e) => setThoughtsForNext(e.target.value)}
            placeholder="What should happen next? Any threads to follow up on? Ideas for future sessions..."
            rows={4}
            className="form-input w-full text-sm"
          />
          <p className="text-xs text-gray-500 mt-2">
            These notes will be shown when creating your next session.
          </p>
        </div>
      )}

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end pt-4 border-t border-[--border]">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

// Compact phase indicator for session cards
interface SessionPhaseIndicatorProps {
  phase: SessionPhase
  className?: string
}

export function SessionPhaseIndicator({ phase, className }: SessionPhaseIndicatorProps) {
  const phaseConfig: Record<SessionPhase, { label: string; color: string; bgColor: string }> = {
    prep: { label: 'Prep', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
    live: { label: 'Live', color: 'text-green-400', bgColor: 'bg-green-500/10' },
    completed: { label: 'Completed', color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
  }

  const config = phaseConfig[phase] || phaseConfig.prep

  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded",
      config.color,
      config.bgColor,
      className
    )}>
      {config.label}
    </span>
  )
}

// Standalone Thoughts for Next component for Completed mode
interface ThoughtsForNextProps {
  campaignId: string
  sessionId: string
  initialValue: string
  onSave?: (value: string) => void
}

export function ThoughtsForNextCard({ campaignId, sessionId, initialValue, onSave }: ThoughtsForNextProps) {
  const [thoughts, setThoughts] = useState(initialValue)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    setHasChanges(thoughts !== initialValue)
  }, [thoughts, initialValue])

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/sessions/${sessionId}/workflow`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ thoughtsForNext: thoughts }),
        }
      )

      if (!response.ok) {
        toast.error('Failed to save')
        return
      }

      toast.success('Saved')
      onSave?.(thoughts)
      setHasChanges(false)
    } catch (error) {
      console.error('Failed to save:', error)
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-5 h-5 text-purple-400" />
        <span className="text-lg font-semibold text-white">Thoughts for Next Session</span>
      </div>
      <textarea
        value={thoughts}
        onChange={(e) => setThoughts(e.target.value)}
        placeholder="What should happen next? Any threads to follow up on? Ideas for future sessions..."
        rows={4}
        className="form-input w-full text-sm mb-3"
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          These notes will be shown when creating your next session.
        </p>
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-sm btn-primary"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4 mr-1" />
                Save
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

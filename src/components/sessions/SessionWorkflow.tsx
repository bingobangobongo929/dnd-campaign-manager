'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Loader2,
  ClipboardList,
  Save,
  Lightbulb,
  Pin,
  X,
  ChevronDown,
  ChevronRight,
  Target,
  Users,
  MessageCircle,
  Dice5,
  Music,
  Settings,
  ExternalLink,
  GripVertical,
  FileText,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { RichTextEditor } from '@/components/editor'
import { KeyNpcsModule, parseKeyNpcsValue, serializeKeyNpcsValue, type KeyNpcsData } from './KeyNpcsModule'
import { QuickRollDropdown } from './QuickRollDropdown'
import type {
  Session,
  SessionPhase,
  PrepChecklistItem,
  PrepModule,
} from '@/types/database'
import { v4 as uuidv4 } from 'uuid'
import { useAppStore } from '@/store'

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

interface Quest {
  id: string
  name: string
  type: string
  status: string
}

interface Encounter {
  id: string
  name: string
  type: string
  status: string
  difficulty?: string
}

interface SessionWorkflowProps {
  campaignId: string
  session: Session
  characters?: Character[]
  locations?: Location[]
  quests?: Quest[]
  encounters?: Encounter[]
  previousSession?: Session | null
  onUpdate?: (session: Session) => void
  /** Campaign default session sections - modules matching these will auto-expand */
  defaultSections?: string[]
  /** Modules disabled by campaign settings - these will be hidden */
  disabledModules?: PrepModule[]
  /** User's collapsed sections from preferences (optional - if not provided, uses local state) */
  collapsedSections?: Record<string, boolean>
  /** Callback to toggle a section's collapsed state (optional - if not provided, uses local state) */
  onToggleCollapsed?: (sectionId: string) => void
}

// Module configuration - all 7 optional prep tools
const MODULE_CONFIG: Record<PrepModule, {
  label: string
  icon: typeof ClipboardList
  description: string
  color: string
  iconColor: string
  bgColor: string
  borderColor: string
  hoverBorder: string
}> = {
  checklist: {
    label: 'Checklist',
    icon: ClipboardList,
    description: 'Simple checkboxes for prep tasks',
    color: 'text-yellow-400',
    iconColor: 'text-yellow-400',
    bgColor: 'bg-yellow-500/5',
    borderColor: 'border-yellow-500/20',
    hoverBorder: 'hover:border-yellow-500/40',
  },
  references: {
    label: 'Quick References',
    icon: Pin,
    description: 'Key NPCs, locations, or notes to keep handy',
    color: 'text-cyan-400',
    iconColor: 'text-cyan-400',
    bgColor: 'bg-cyan-500/5',
    borderColor: 'border-cyan-500/20',
    hoverBorder: 'hover:border-cyan-500/40',
  },
  session_goals: {
    label: 'Session Goals',
    icon: Target,
    description: 'What you hope to accomplish this session',
    color: 'text-purple-400',
    iconColor: 'text-purple-400',
    bgColor: 'bg-purple-500/5',
    borderColor: 'border-purple-500/20',
    hoverBorder: 'hover:border-purple-500/40',
  },
  key_npcs: {
    label: 'Key NPCs',
    icon: Users,
    description: 'NPCs likely to appear and their motivations',
    color: 'text-green-400',
    iconColor: 'text-green-400',
    bgColor: 'bg-green-500/5',
    borderColor: 'border-green-500/20',
    hoverBorder: 'hover:border-green-500/40',
  },
  session_opener: {
    label: 'Session Opener',
    icon: MessageCircle,
    description: 'How you\'ll start the session - a scene, recap, or hook',
    color: 'text-orange-400',
    iconColor: 'text-orange-400',
    bgColor: 'bg-orange-500/5',
    borderColor: 'border-orange-500/20',
    hoverBorder: 'hover:border-orange-500/40',
  },
  random_tables: {
    label: 'Random Tables',
    icon: Dice5,
    description: 'Names, encounters, or other things to roll for',
    color: 'text-pink-400',
    iconColor: 'text-pink-400',
    bgColor: 'bg-pink-500/5',
    borderColor: 'border-pink-500/20',
    hoverBorder: 'hover:border-pink-500/40',
  },
  music_ambiance: {
    label: 'Music & Ambiance',
    icon: Music,
    description: 'Playlists, sound effects, or atmosphere notes',
    color: 'text-teal-400',
    iconColor: 'text-teal-400',
    bgColor: 'bg-teal-500/5',
    borderColor: 'border-teal-500/20',
    hoverBorder: 'hover:border-teal-500/40',
  },
}

// All available prep modules in display order
const ALL_MODULES: PrepModule[] = [
  'checklist',
  'references',
  'session_goals',
  'key_npcs',
  'session_opener',
  'random_tables',
  'music_ambiance',
]

export function SessionWorkflow({
  campaignId,
  session,
  characters = [],
  locations = [],
  quests = [],
  encounters = [],
  previousSession,
  onUpdate,
  defaultSections = [],
  disabledModules = [],
  collapsedSections: externalCollapsedSections,
  onToggleCollapsed,
}: SessionWorkflowProps) {
  // Parse session data
  const [prepNotes, setPrepNotes] = useState(session.prep_notes || '')

  // Module content states
  const [prepChecklist, setPrepChecklist] = useState<PrepChecklistItem[]>(
    (session.prep_checklist as unknown as PrepChecklistItem[]) || []
  )
  const [references, setReferences] = useState<string>(
    (() => {
      const pinnedRefs = session.pinned_references as unknown as Array<{label: string}> | null
      if (pinnedRefs && Array.isArray(pinnedRefs) && pinnedRefs.length > 0) {
        return pinnedRefs.map(r => r.label).join('\n')
      }
      return ''
    })()
  )
  const [sessionGoals, setSessionGoals] = useState<string>(
    session.session_goals || ''
  )
  const [keyNpcs, setKeyNpcs] = useState<KeyNpcsData>(() =>
    parseKeyNpcsValue(session.key_npcs as string | KeyNpcsData | null)
  )
  const [sessionOpener, setSessionOpener] = useState<string>(
    session.session_opener || ''
  )
  const [randomTables, setRandomTables] = useState<string>(
    session.random_tables || ''
  )
  const [musicAmbiance, setMusicAmbiance] = useState<string>(
    session.music_ambiance || ''
  )

  // Map campaign default section names to prep modules
  const sectionToModule: Record<string, PrepModule> = {
    'prep_checklist': 'checklist',
    'quick_reference': 'references',
    'session_goals': 'session_goals',
    'key_npcs': 'key_npcs',
    'session_opener': 'session_opener',
    'random_tables': 'random_tables',
    'music_ambiance': 'music_ambiance',
  }

  // UI state - which sections are expanded (local state as fallback)
  const [localExpandedModules, setLocalExpandedModules] = useState<Set<PrepModule>>(() => {
    const initialExpanded = new Set<PrepModule>()

    // Auto-expand modules that are in campaign defaults
    defaultSections.forEach(section => {
      const prepModule = sectionToModule[section]
      if (prepModule) {
        initialExpanded.add(prepModule)
      }
    })

    return initialExpanded
  })

  // Helper to check if a module is expanded
  // Priority: 1. User preference (from hook), 2. Campaign defaults, 3. Local state
  const isModuleExpanded = (moduleId: PrepModule): boolean => {
    // If we have external collapsed sections from hook, use those
    if (externalCollapsedSections) {
      const prefKey = `prep_${moduleId}`
      // If user has explicitly set a preference, use it
      if (prefKey in externalCollapsedSections) {
        return !externalCollapsedSections[prefKey]
      }
      // Otherwise, check if this module should be auto-expanded from campaign defaults
      const isDefaultExpanded = defaultSections.some(
        section => sectionToModule[section] === moduleId
      )
      return isDefaultExpanded
    }
    // Fall back to local state
    return localExpandedModules.has(moduleId)
  }

  // Module order state - customizable order of prep modules
  const [moduleOrder, setModuleOrder] = useState<PrepModule[]>(() => {
    // If session has custom order saved, use it; otherwise use default
    const savedOrder = (session.enabled_prep_modules as PrepModule[]) || []
    // If saved order has all modules, use it; otherwise use default with any saved order preferences
    if (savedOrder.length === ALL_MODULES.length) {
      return savedOrder
    }
    return ALL_MODULES
  })

  // Filter out disabled modules from display
  const visibleModuleOrder = moduleOrder.filter(m => !disabledModules.includes(m))

  // Inline drag state for reordering modules
  const [draggedModule, setDraggedModule] = useState<PrepModule | null>(null)
  const [dragOverModule, setDragOverModule] = useState<PrepModule | null>(null)

  const [newPrepItem, setNewPrepItem] = useState('')
  const [hasChanges, setHasChanges] = useState(false)
  const [previousThoughtsDismissed, setPreviousThoughtsDismissed] = useState(false)

  // Ref to track if we just saved - prevents feedback loop when session prop updates after save
  const justSavedRef = useRef(false)

  // Global auto-save status
  const setAutoSaveStatus = useAppStore((state) => state.setAutoSaveStatus)

  // Helper to check if a module has content
  const moduleHasContent = (moduleId: PrepModule): boolean => {
    switch (moduleId) {
      case 'checklist':
        return prepChecklist.length > 0
      case 'references':
        return references.trim().length > 0
      case 'session_goals':
        return sessionGoals.trim().length > 0
      case 'key_npcs':
        return keyNpcs.linkedCharacterIds.length > 0 || keyNpcs.notes.trim().length > 0
      case 'session_opener':
        return sessionOpener.trim().length > 0
      case 'random_tables':
        return randomTables.trim().length > 0
      case 'music_ambiance':
        return musicAmbiance.trim().length > 0
      default:
        return false
    }
  }

  // Get modules that have content (for completed phase display)
  const getModulesWithContent = (): PrepModule[] => {
    return ALL_MODULES.filter(m => moduleHasContent(m))
  }

  // Track changes
  useEffect(() => {
    // Skip change detection immediately after save to prevent feedback loop
    // The session prop updates after save, which would trigger this effect again
    if (justSavedRef.current) {
      justSavedRef.current = false
      return
    }

    const originalPrepNotes = session.prep_notes || ''
    const originalChecklist = session.prep_checklist || []
    const originalReferences = (() => {
      const pinnedRefs = session.pinned_references as unknown as Array<{label: string}> | null
      if (pinnedRefs && Array.isArray(pinnedRefs) && pinnedRefs.length > 0) {
        return pinnedRefs.map(r => r.label).join('\n')
      }
      return ''
    })()

    // Parse original keyNpcs for comparison
    const originalKeyNpcs = parseKeyNpcsValue(session.key_npcs as string | KeyNpcsData | null)

    const changed =
      prepNotes !== originalPrepNotes ||
      JSON.stringify(prepChecklist) !== JSON.stringify(originalChecklist) ||
      references !== originalReferences ||
      sessionGoals !== (session.session_goals || '') ||
      JSON.stringify(keyNpcs) !== JSON.stringify(originalKeyNpcs) ||
      sessionOpener !== (session.session_opener || '') ||
      randomTables !== (session.random_tables || '') ||
      musicAmbiance !== (session.music_ambiance || '')

    setHasChanges(changed)
  }, [prepNotes, prepChecklist, references, sessionGoals, keyNpcs, sessionOpener, randomTables, musicAmbiance, session])

  const handleSave = useCallback(async () => {
    setAutoSaveStatus('saving')
    try {
      // Convert references text to pinned_references format for backward compatibility
      const pinnedRefs = references
        .split('\n')
        .filter(line => line.trim())
        .map(line => ({
          entity_type: 'note' as const,
          entity_id: uuidv4(),
          label: line.trim(),
        }))

      // Determine which modules have content (for enabled_prep_modules tracking)
      const modulesWithContent = getModulesWithContent()

      const response = await fetch(
        `/api/campaigns/${campaignId}/sessions/${session.id}/workflow`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prepNotes,
            prepChecklist,
            enabledPrepModules: moduleOrder, // Save custom order
            pinnedReferences: pinnedRefs,
            sessionGoals,
            keyNpcs: serializeKeyNpcsValue(keyNpcs),
            sessionOpener,
            randomTables,
            musicAmbiance,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setAutoSaveStatus('error')
        toast.error(data.error || 'Failed to save')
        return
      }

      setAutoSaveStatus('saved')
      // Mark that we just saved to prevent feedback loop when session prop updates
      justSavedRef.current = true
      onUpdate?.(data.session)
      setHasChanges(false)

      // Reset to idle after showing saved status briefly
      setTimeout(() => setAutoSaveStatus('idle'), 2000)
    } catch (error) {
      console.error('Failed to save:', error)
      setAutoSaveStatus('error')
      toast.error('Failed to save')
    }
  }, [prepNotes, prepChecklist, references, sessionGoals, keyNpcs, sessionOpener, randomTables, musicAmbiance, moduleOrder, campaignId, session.id, onUpdate, setAutoSaveStatus])

  // Auto-save with debounce
  useEffect(() => {
    if (!hasChanges) return

    const timeoutId = setTimeout(() => {
      handleSave()
    }, 1500)

    return () => clearTimeout(timeoutId)
  }, [prepNotes, prepChecklist, references, sessionGoals, keyNpcs, sessionOpener, randomTables, musicAmbiance, hasChanges, handleSave])

  // Toggle module expansion
  const toggleModule = (moduleId: PrepModule) => {
    // If we have external toggle handler, use it
    if (onToggleCollapsed) {
      onToggleCollapsed(`prep_${moduleId}`)
      return
    }
    // Otherwise use local state
    setLocalExpandedModules(prev => {
      const next = new Set(prev)
      if (next.has(moduleId)) {
        next.delete(moduleId)
      } else {
        next.add(moduleId)
      }
      return next
    })
  }

  // Inline drag handlers for reordering modules
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, moduleId: PrepModule) => {
    setDraggedModule(moduleId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', moduleId)
    // Add visual feedback
    const target = e.currentTarget
    setTimeout(() => {
      target.style.opacity = '0.5'
    }, 0)
  }

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.style.opacity = '1'
    setDraggedModule(null)
    setDragOverModule(null)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, moduleId: PrepModule) => {
    e.preventDefault()
    if (draggedModule && draggedModule !== moduleId) {
      setDragOverModule(moduleId)
    }
  }

  const handleDragLeave = () => {
    setDragOverModule(null)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetModuleId: PrepModule) => {
    e.preventDefault()
    if (!draggedModule || draggedModule === targetModuleId) {
      setDragOverModule(null)
      return
    }

    const currentOrder = [...moduleOrder]
    const draggedIndex = currentOrder.indexOf(draggedModule)
    const targetIndex = currentOrder.indexOf(targetModuleId)

    if (draggedIndex === -1 || targetIndex === -1) return

    // Remove from old position and insert at new position
    const newOrder = [...currentOrder]
    newOrder.splice(draggedIndex, 1)
    newOrder.splice(targetIndex, 0, draggedModule)

    setModuleOrder(newOrder)
    setDragOverModule(null)
    setHasChanges(true) // Trigger auto-save
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

  // Get previous session thoughts
  const previousThoughts = previousSession?.thoughts_for_next || ''

  const completedCount = prepChecklist.filter(item => item.checked).length

  // Render the content for a specific module
  const renderModuleContent = (moduleId: PrepModule) => {
    const config = MODULE_CONFIG[moduleId]

    switch (moduleId) {
      case 'checklist':
        return (
          <div className="pt-3">
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

            {/* Quick suggestions for empty checklist */}
            {prepChecklist.length === 0 && (
              <div className="mt-3 pt-3 border-t border-yellow-500/10">
                <p className="text-xs text-gray-500 mb-2">Quick add:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Review last session',
                    'Prepare NPC voices',
                    'Check encounter balance',
                    'Gather maps/handouts',
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
        )

      case 'references':
        return (
          <div className="pt-3">
            <textarea
              value={references}
              onChange={(e) => setReferences(e.target.value)}
              placeholder="NPCs: Durnan, Xanathar agent&#10;Locations: Yawning Portal, Sewers&#10;Notes: Party owes 50gp to..."
              rows={4}
              className="form-input w-full text-sm"
            />
            <p className="text-xs text-gray-500 mt-2">
              One item per line. Quick notes for easy reference during the session.
            </p>
          </div>
        )

      case 'session_goals':
        return (
          <div className="pt-3">
            <textarea
              value={sessionGoals}
              onChange={(e) => setSessionGoals(e.target.value)}
              placeholder="- Get the party to the sewers&#10;- Introduce the Xanathar agent&#10;- Foreshadow the coming conflict"
              rows={4}
              className="form-input w-full text-sm"
            />
            <p className="text-xs text-gray-500 mt-2">
              What do you want to accomplish? Having clear goals helps keep the session focused.
            </p>
          </div>
        )

      case 'key_npcs':
        return (
          <div className="pt-3">
            <KeyNpcsModule
              value={keyNpcs}
              onChange={setKeyNpcs}
              characters={characters}
            />
          </div>
        )

      case 'session_opener':
        return (
          <div className="pt-3">
            <textarea
              value={sessionOpener}
              onChange={(e) => setSessionOpener(e.target.value)}
              placeholder="Start with the party waking up in the Yawning Portal. Durnan approaches with news about strange noises from the well..."
              rows={4}
              className="form-input w-full text-sm"
            />
            <p className="text-xs text-gray-500 mt-2">
              How will you kick things off? A strong opening sets the tone for the session.
            </p>
          </div>
        )

      case 'random_tables':
        return (
          <div className="pt-3 space-y-3">
            {/* Quick Roll Dropdown */}
            <QuickRollDropdown campaignId={campaignId} />

            {/* Link to Campaign Library */}
            <Link
              href={`/campaigns/${campaignId}/random-tables`}
              className="flex items-center gap-3 p-3 bg-pink-500/5 hover:bg-pink-500/10 border border-pink-500/20 hover:border-pink-500/30 rounded-lg transition-all group"
            >
              <Dice5 className="w-5 h-5 text-pink-400" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-white block">View All Tables</span>
                <span className="text-xs text-gray-500">Create, edit, and manage your table library</span>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-pink-400 transition-colors" />
            </Link>

            {/* Quick Notes */}
            <div>
              <label className="text-xs text-gray-500 block mb-1.5">Quick notes for this session:</label>
              <textarea
                value={randomTables}
                onChange={(e) => setRandomTables(e.target.value)}
                placeholder="Tables to remember: Waterdeep NPC Names, Sewer Encounters..."
                rows={2}
                className="form-input w-full text-sm"
              />
            </div>
          </div>
        )

      case 'music_ambiance':
        return (
          <div className="pt-3">
            <textarea
              value={musicAmbiance}
              onChange={(e) => setMusicAmbiance(e.target.value)}
              placeholder="Tavern: Medieval tavern ambiance playlist&#10;Combat: Epic battle music&#10;Exploration: Ambient dungeon sounds&#10;Emotional: Soft piano for dramatic moments"
              rows={4}
              className="form-input w-full text-sm"
            />
            <p className="text-xs text-gray-500 mt-2">
              Playlists, sound effects, or atmosphere notes for different scenes.
            </p>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Thoughts from last session Banner - only shows if previous session had content */}
      {previousThoughts && !previousThoughtsDismissed && (
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-purple-300 mb-1">Thoughts from last session</p>
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{previousThoughts}</p>
              </div>
            </div>
            <button
              onClick={() => setPreviousThoughtsDismissed(true)}
              className="p-1 text-purple-400/60 hover:text-purple-400 transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Prep Notes - Primary Workspace */}
      <div className="bg-[--bg-surface] rounded-xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Prep Notes</h3>
              <p className="text-sm text-[--text-tertiary]">
                Your main workspace for planning this session
              </p>
            </div>
          </div>
        </div>
        {/* Content */}
        <div className="p-5">
          <RichTextEditor
            content={prepNotes}
            onChange={setPrepNotes}
            placeholder="Plan your session however you like - scene ideas, NPC notes, encounters, or just a quick bullet list..."
            className="min-h-[200px]"
          />
        </div>
      </div>

      {/* Optional Prep Tools Section */}
      <div className="bg-[--bg-surface] rounded-xl overflow-hidden">
        {/* Section Header */}
        <div className="p-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Lightbulb className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Prep Tools</h3>
              <p className="text-sm text-[--text-tertiary]">
                Optional tools to help you prepare - drag to reorder
              </p>
            </div>
          </div>
        </div>

        {/* All Modules - Draggable, collapsible (in custom order, filtered by disabled) */}
        <div className="p-5 space-y-3">
          {visibleModuleOrder.map((moduleId) => {
            const config = MODULE_CONFIG[moduleId]
            const Icon = config.icon
            const isExpanded = isModuleExpanded(moduleId)
            const hasContent = moduleHasContent(moduleId)
            const isDragging = draggedModule === moduleId
            const isDragOver = dragOverModule === moduleId

            return (
              <div
                key={moduleId}
                draggable
                onDragStart={(e) => handleDragStart(e, moduleId)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, moduleId)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, moduleId)}
                className={cn(
                  "rounded-xl border transition-all",
                  config.bgColor,
                  config.borderColor,
                  config.hoverBorder,
                  isDragging && "opacity-50",
                  isDragOver && "border-purple-500 ring-2 ring-purple-500/30"
                )}
              >
                {/* Collapsible Header with drag handle */}
                <div className="flex items-center">
                  {/* Drag Handle */}
                  <div className="p-4 cursor-grab active:cursor-grabbing hover:bg-white/[0.03] rounded-l-xl transition-colors">
                    <GripVertical className="w-4 h-4 text-gray-500" />
                  </div>

                  {/* Expand/Collapse Button */}
                  <button
                    onClick={() => toggleModule(moduleId)}
                    className="flex-1 flex items-center gap-3 p-4 pl-0 text-left"
                  >
                    {isExpanded ? (
                      <ChevronDown className={cn("w-4 h-4 flex-shrink-0", config.iconColor)} />
                    ) : (
                      <ChevronRight className={cn("w-4 h-4 flex-shrink-0", config.iconColor)} />
                    )}
                    <Icon className={cn("w-5 h-5 flex-shrink-0", config.iconColor)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{config.label}</span>
                        {hasContent && (
                          <span className={cn(
                            "text-xs px-1.5 py-0.5 rounded",
                            config.bgColor,
                            config.color
                          )}>
                            {moduleId === 'checklist'
                              ? `${completedCount}/${prepChecklist.length}`
                              : 'Has content'
                            }
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{config.description}</p>
                    </div>
                  </button>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-white/[0.05]">
                    {renderModuleContent(moduleId)}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Campaign Settings Link - Footer */}
        <div className="px-5 py-4 border-t border-white/[0.06]">
          <Link
            href={`/campaigns/${campaignId}/settings`}
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-purple-400 transition-colors group"
          >
            <Settings className="w-4 h-4" />
            <span>Configure defaults in Campaign Settings</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        </div>
      </div>

    </div>
  )
}

// Export the module config and helper for use in completed phase
export { MODULE_CONFIG, ALL_MODULES }
export type { PrepModule }

// Helper function to check if module has content (exported for completed phase)
export function checkModuleHasContent(
  moduleId: PrepModule,
  session: Session
): boolean {
  switch (moduleId) {
    case 'checklist':
      const checklist = (session.prep_checklist as unknown as PrepChecklistItem[]) || []
      return checklist.length > 0
    case 'references':
      const refs = session.pinned_references as unknown as Array<{label: string}> | null
      return !!(refs && Array.isArray(refs) && refs.length > 0)
    case 'session_goals':
      return !!(session.session_goals?.trim())
    case 'key_npcs':
      const keyNpcsData = parseKeyNpcsValue(session.key_npcs as string | KeyNpcsData | null)
      return keyNpcsData.linkedCharacterIds.length > 0 || keyNpcsData.notes.trim().length > 0
    case 'session_opener':
      return !!(session.session_opener?.trim())
    case 'random_tables':
      return !!(session.random_tables?.trim())
    case 'music_ambiance':
      return !!(session.music_ambiance?.trim())
    default:
      return false
  }
}

// Compact phase indicator for session cards
interface SessionPhaseIndicatorProps {
  phase: SessionPhase
  className?: string
}

export function SessionPhaseIndicator({ phase, className }: SessionPhaseIndicatorProps) {
  const phaseConfig: Record<SessionPhase, { label: string; color: string; bgColor: string }> = {
    prep: { label: 'Prep', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
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
  inline?: boolean
}

export function ThoughtsForNextCard({ campaignId, sessionId, initialValue, onSave, inline }: ThoughtsForNextProps) {
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

  const content = (
    <>
      <textarea
        value={thoughts}
        onChange={(e) => setThoughts(e.target.value)}
        placeholder="Ideas for next session - loose threads, player interests to follow up on..."
        rows={4}
        className="form-input w-full text-sm"
      />
      {hasChanges && (
        <div className="flex justify-end mt-3">
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
        </div>
      )}
    </>
  )

  if (inline) {
    return content
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
        placeholder="Ideas for next session - loose threads, player interests to follow up on..."
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

'use client'

import { useState, useEffect, useCallback } from 'react'
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
  ChevronUp,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { RichTextEditor } from '@/components/editor'
import type {
  Session,
  SessionPhase,
  PrepChecklistItem,
  PrepModule,
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
}

// Module configuration with colors and icons
// Per plan: Only 2 optional modules - Checklist and Quick References
const MODULE_CONFIG: Record<PrepModule, {
  label: string
  icon: typeof ClipboardList
  description: string
  color: string
  bgColor: string
  borderColor: string
}> = {
  checklist: {
    label: 'Checklist',
    icon: ClipboardList,
    description: 'Simple checkboxes for prep tasks',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/5',
    borderColor: 'border-yellow-500/20',
  },
  references: {
    label: 'Quick References',
    icon: Pin,
    description: 'Text-based list of key NPCs, locations, notes',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/5',
    borderColor: 'border-cyan-500/20',
  },
}

// Available prep modules - only Checklist and References per plan
const AVAILABLE_MODULES: PrepModule[] = [
  'checklist',
  'references',
]

export function SessionWorkflow({
  campaignId,
  session,
  characters = [],
  locations = [],
  quests = [],
  encounters = [],
  previousSession,
  onUpdate
}: SessionWorkflowProps) {
  // Parse session data
  const [prepNotes, setPrepNotes] = useState(session.prep_notes || '')
  const [enabledModules, setEnabledModules] = useState<PrepModule[]>(
    (session.enabled_prep_modules as PrepModule[]) || []
  )

  // Module content states (only checklist and references per plan)
  const [prepChecklist, setPrepChecklist] = useState<PrepChecklistItem[]>(
    (session.prep_checklist as unknown as PrepChecklistItem[]) || []
  )
  const [references, setReferences] = useState<string>(
    // Convert old pinned_references to simple text format
    (() => {
      const pinnedRefs = session.pinned_references as unknown as Array<{label: string}> | null
      if (pinnedRefs && Array.isArray(pinnedRefs) && pinnedRefs.length > 0) {
        return pinnedRefs.map(r => r.label).join('\n')
      }
      return ''
    })()
  )

  const [newPrepItem, setNewPrepItem] = useState('')
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [showModuleMenu, setShowModuleMenu] = useState(false)
  const [previousThoughtsDismissed, setPreviousThoughtsDismissed] = useState(false)

  // Track changes
  useEffect(() => {
    const originalPrepNotes = session.prep_notes || ''
    const originalChecklist = session.prep_checklist || []
    const originalModules = session.enabled_prep_modules || []

    const changed =
      prepNotes !== originalPrepNotes ||
      JSON.stringify(prepChecklist) !== JSON.stringify(originalChecklist) ||
      JSON.stringify(enabledModules) !== JSON.stringify(originalModules) ||
      references !== ((() => {
        const pinnedRefs = session.pinned_references as unknown as Array<{label: string}> | null
        if (pinnedRefs && Array.isArray(pinnedRefs) && pinnedRefs.length > 0) {
          return pinnedRefs.map(r => r.label).join('\n')
        }
        return ''
      })())

    setHasChanges(changed)
  }, [prepNotes, prepChecklist, enabledModules, references, session])

  const handleSave = useCallback(async () => {
    setSaving(true)
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

      const response = await fetch(
        `/api/campaigns/${campaignId}/sessions/${session.id}/workflow`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prepNotes,
            prepChecklist,
            enabledPrepModules: enabledModules,
            pinnedReferences: pinnedRefs,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to save')
        return
      }

      toast.success('Saved')
      onUpdate?.(data.session)
      setHasChanges(false)
    } catch (error) {
      console.error('Failed to save:', error)
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }, [prepNotes, prepChecklist, enabledModules, references, campaignId, session.id, onUpdate])

  // Auto-save with debounce
  useEffect(() => {
    if (!hasChanges) return

    const timeoutId = setTimeout(() => {
      handleSave()
    }, 1500) // 1.5 second debounce

    return () => clearTimeout(timeoutId)
  }, [prepNotes, prepChecklist, references, hasChanges, handleSave])

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

  // Module management
  const addModule = (moduleId: PrepModule) => {
    if (!enabledModules.includes(moduleId)) {
      setEnabledModules([...enabledModules, moduleId])
    }
    setShowModuleMenu(false)
  }

  const removeModule = (moduleId: PrepModule) => {
    // Check if module has data
    let hasData = false
    switch (moduleId) {
      case 'checklist':
        hasData = prepChecklist.length > 0
        break
      case 'references':
        hasData = references.trim().length > 0
        break
    }

    if (hasData) {
      const confirmed = window.confirm(
        'This section has content. Removing it will clear the data. Continue?'
      )
      if (!confirmed) return

      // Clear the data
      switch (moduleId) {
        case 'checklist':
          setPrepChecklist([])
          break
        case 'references':
          setReferences('')
          break
      }
    }

    setEnabledModules(enabledModules.filter(m => m !== moduleId))
  }

  // Get previous session thoughts
  const previousThoughts = previousSession?.thoughts_for_next || ''

  // Modules not yet enabled
  const availableToAdd = AVAILABLE_MODULES.filter(m => !enabledModules.includes(m))

  const completedCount = prepChecklist.filter(item => item.checked).length

  return (
    <div className="space-y-6">
      {/* From Previous Session Banner */}
      {previousThoughts && !previousThoughtsDismissed && (
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-purple-300 mb-1">From Previous Session</p>
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
      <div className="bg-[--bg-surface] border border-[--border] rounded-xl p-5">
        <label className="text-sm font-medium text-white mb-3 block">Prep Notes</label>
        <RichTextEditor
          content={prepNotes}
          onChange={setPrepNotes}
          placeholder="Plan your session however you like - scene ideas, NPC notes, encounters, or just a quick bullet list..."
          className="min-h-[200px]"
        />
      </div>

      {/* Add Section Button - Always visible when modules available */}
      {availableToAdd.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setShowModuleMenu(!showModuleMenu)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all",
              "text-gray-500 hover:text-[--arcane-purple] hover:bg-[--arcane-purple]/5"
            )}
          >
            <Plus className="w-4 h-4" />
            Add Section
            {showModuleMenu ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {showModuleMenu && (
            <div className="absolute top-full left-0 mt-2 bg-[--bg-elevated] border border-[--border] rounded-lg shadow-xl z-10 min-w-[280px]">
              {availableToAdd.map((moduleId) => {
                const config = MODULE_CONFIG[moduleId]
                const Icon = config.icon
                return (
                  <button
                    key={moduleId}
                    onClick={() => addModule(moduleId)}
                    className="w-full flex items-start gap-3 p-3 hover:bg-white/[0.05] transition-colors text-left first:rounded-t-lg last:rounded-b-lg"
                  >
                    <Icon className={cn("w-5 h-5 mt-0.5", config.color)} />
                    <div>
                      <p className="text-sm font-medium text-white">{config.label}</p>
                      <p className="text-xs text-gray-500">{config.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Optional Modules Section - Only show when modules are enabled */}
      {enabledModules.length > 0 && (
        <div className="pt-4">
          {/* Section Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-[--border]" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Optional Sections</span>
            <div className="h-px flex-1 bg-[--border]" />
          </div>

          {/* Enabled Modules */}
          <div className="space-y-4">
            {/* Checklist Module */}
            {enabledModules.includes('checklist') && (
              <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-yellow-400" />
                    <span className="font-medium text-white">Checklist</span>
                    {prepChecklist.length > 0 && (
                      <span className="text-xs text-gray-500">
                        ({completedCount}/{prepChecklist.length})
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => removeModule('checklist')}
                    className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
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

                {/* Default suggestions for empty checklist */}
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

            {/* Quick References Module */}
            {enabledModules.includes('references') && (
              <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Pin className="w-5 h-5 text-cyan-400" />
                    <span className="font-medium text-white">Quick References</span>
                  </div>
                  <button
                    onClick={() => removeModule('references')}
                    className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

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
            )}
          </div>
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
  inline?: boolean // When true, renders without outer card wrapper (for embedding in another card)
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

  // When inline, just render the content without card wrapper
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

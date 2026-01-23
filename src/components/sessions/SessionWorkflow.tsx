'use client'

import { useState, useEffect } from 'react'
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Loader2,
  Calendar,
  FileText,
  Play,
  CheckCircle2,
  ClipboardList,
  ArrowRight,
  Save,
  Lightbulb,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Session } from '@/types/database'

type SessionPhase = 'planned' | 'prep' | 'active' | 'recap' | 'complete'

interface PrepItem {
  text: string
  completed: boolean
}

interface SessionWorkflowProps {
  campaignId: string
  session: Session
  onUpdate?: (session: Session) => void
}

export function SessionWorkflow({ campaignId, session, onUpdate }: SessionWorkflowProps) {
  const [phase, setPhase] = useState<SessionPhase>((session.phase as SessionPhase) || 'planned')
  const [prepChecklist, setPrepChecklist] = useState<PrepItem[]>(
    (session.prep_checklist as unknown as PrepItem[]) || []
  )
  const [thoughtsForNext, setThoughtsForNext] = useState(session.thoughts_for_next || '')
  const [newPrepItem, setNewPrepItem] = useState('')
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Track changes
  useEffect(() => {
    const originalPhase = session.phase || 'planned'
    const originalChecklist = session.prep_checklist || []
    const originalThoughts = session.thoughts_for_next || ''

    const changed =
      phase !== originalPhase ||
      JSON.stringify(prepChecklist) !== JSON.stringify(originalChecklist) ||
      thoughtsForNext !== originalThoughts

    setHasChanges(changed)
  }, [phase, prepChecklist, thoughtsForNext, session])

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
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to save')
        return
      }

      toast.success('Workflow saved!')
      onUpdate?.(data.session)
      setHasChanges(false)
    } catch (error) {
      console.error('Failed to save:', error)
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const addPrepItem = () => {
    if (!newPrepItem.trim()) return
    setPrepChecklist([...prepChecklist, { text: newPrepItem.trim(), completed: false }])
    setNewPrepItem('')
  }

  const togglePrepItem = (index: number) => {
    const updated = [...prepChecklist]
    updated[index].completed = !updated[index].completed
    setPrepChecklist(updated)
  }

  const removePrepItem = (index: number) => {
    setPrepChecklist(prepChecklist.filter((_, i) => i !== index))
  }

  const phases: { value: SessionPhase; label: string; icon: typeof Calendar; color: string }[] = [
    { value: 'planned', label: 'Planned', icon: Calendar, color: 'text-gray-400' },
    { value: 'prep', label: 'Prep', icon: ClipboardList, color: 'text-yellow-400' },
    { value: 'active', label: 'Active', icon: Play, color: 'text-green-400' },
    { value: 'recap', label: 'Recap', icon: FileText, color: 'text-blue-400' },
    { value: 'complete', label: 'Complete', icon: CheckCircle2, color: 'text-purple-400' },
  ]

  const completedCount = prepChecklist.filter(item => item.completed).length

  return (
    <div className="space-y-6">
      {/* Phase Selector */}
      <div>
        <label className="text-sm font-medium text-gray-400 mb-3 block">Session Phase</label>
        <div className="flex flex-wrap gap-2">
          {phases.map((p, idx) => {
            const Icon = p.icon
            const isActive = phase === p.value
            const currentIdx = phases.findIndex(x => x.value === phase)

            return (
              <div key={p.value} className="flex items-center">
                <button
                  onClick={() => setPhase(p.value)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors",
                    isActive
                      ? "bg-purple-600/20 border-purple-500/50 text-white"
                      : idx <= currentIdx
                        ? "bg-white/[0.02] border-[--border] text-gray-300 hover:border-purple-500/30"
                        : "bg-white/[0.02] border-[--border] text-gray-500 hover:border-purple-500/30"
                  )}
                >
                  <Icon className={cn("w-4 h-4", isActive && p.color)} />
                  {p.label}
                </button>
                {idx < phases.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-gray-600 mx-1" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Prep Checklist (shown in prep/active phases) */}
      {(phase === 'prep' || phase === 'active') && (
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
          </div>

          {/* Checklist Items */}
          <div className="space-y-2 mb-3">
            {prepChecklist.map((item, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex items-center gap-2 group",
                  item.completed && "opacity-60"
                )}
              >
                <button
                  onClick={() => togglePrepItem(idx)}
                  className="flex-shrink-0"
                >
                  {item.completed ? (
                    <CheckSquare className="w-5 h-5 text-green-400" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-500" />
                  )}
                </button>
                <span className={cn(
                  "flex-1 text-sm",
                  item.completed ? "text-gray-500 line-through" : "text-gray-300"
                )}>
                  {item.text}
                </span>
                <button
                  onClick={() => removePrepItem(idx)}
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

          {/* Default checklist suggestions */}
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
                    onClick={() => setPrepChecklist([...prepChecklist, { text: suggestion, completed: false }])}
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

      {/* Thoughts for Next Session (shown in recap/complete phases) */}
      {(phase === 'recap' || phase === 'complete') && (
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-5 h-5 text-blue-400" />
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
            These notes will appear in your next session&apos;s prep checklist.
          </p>
        </div>
      )}

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end">
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
    planned: { label: 'Planned', color: 'text-gray-400', bgColor: 'bg-gray-500/10' },
    prep: { label: 'Prep', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
    active: { label: 'Active', color: 'text-green-400', bgColor: 'bg-green-500/10' },
    recap: { label: 'Recap', color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
    complete: { label: 'Complete', color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
  }

  const config = phaseConfig[phase] || phaseConfig.planned

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

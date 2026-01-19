'use client'

/**
 * Vault Character Display Components
 *
 * Rich display components extracted from import preview, reusable across:
 * - Import preview page
 * - Character editor (display mode)
 * - Character view page
 *
 * All components support optional edit mode with inline editing.
 */

import React, { useState } from 'react'
import { Edit2, X, Plus, Check, Quote, Target, AlertCircle, Heart, BookOpen, Table2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  renderMarkdown,
  RELATIONSHIP_COLORS,
  COMPANION_TYPE_COLORS,
  DISPLAY_EMOJIS,
} from '@/lib/character-display'

// ============================================================================
// TYPES
// ============================================================================

export interface EditableProps {
  editable?: boolean
  onSave?: (value: any) => void
}

export interface BackstoryPhase {
  title: string
  content: string
}

export interface NPC {
  name: string
  nickname?: string | null
  relationship_type: string
  relationship_label?: string | null
  faction_affiliations?: string[]
  location?: string | null
  occupation?: string | null
  needs?: string | null
  can_provide?: string | null
  goals?: string | null
  secrets?: string | null
  personality_traits?: string[]
  full_notes: string
  relationship_status?: string
  image_url?: string | null
}

export interface Companion {
  name: string
  companion_type: string
  companion_species: string
  description?: string | null
  abilities?: string | null
  image_url?: string | null
}

export interface Rumor {
  statement: string
  is_true: boolean
}

export interface DmQA {
  question: string
  answer: string
}

// ============================================================================
// BULLET LIST DISPLAY (TL;DR, Plot Hooks, Fears, etc.)
// ============================================================================

interface BulletListDisplayProps extends EditableProps {
  items: string[]
  bulletColor?: 'purple' | 'amber' | 'orange'
  emptyMessage?: string
  placeholder?: string
}

export function BulletListDisplay({
  items,
  bulletColor = 'purple',
  emptyMessage = 'No items',
  editable = false,
  onSave,
  placeholder = 'Add item...',
}: BulletListDisplayProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editItems, setEditItems] = useState<string[]>([])
  const [newItem, setNewItem] = useState('')

  const bulletColorClass = {
    purple: 'text-purple-400',
    amber: 'text-amber-400',
    orange: 'text-orange-400',
  }[bulletColor]

  const handleStartEdit = () => {
    setEditItems([...items])
    setIsEditing(true)
  }

  const handleSave = () => {
    // Include newItem if user typed something but didn't click Plus
    const itemsToSave = newItem.trim()
      ? [...editItems, newItem.trim()]
      : editItems
    onSave?.(itemsToSave.filter(item => item.trim()))
    setIsEditing(false)
    setNewItem('')
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditItems([])
    setNewItem('')
  }

  const addItem = () => {
    if (newItem.trim()) {
      setEditItems([...editItems, newItem.trim()])
      setNewItem('')
    }
  }

  if (isEditing && editable) {
    return (
      <div className="space-y-2">
        {editItems.map((item, i) => (
          <div key={i} className="flex items-center gap-2 group">
            <span className={cn("flex-shrink-0", bulletColorClass)}>•</span>
            <input
              value={item}
              onChange={(e) => {
                const newItems = [...editItems]
                newItems[i] = e.target.value
                setEditItems(newItems)
              }}
              className="flex-1 py-1.5 px-2 bg-white/[0.03] border border-white/[0.08] rounded text-sm text-white/90 focus:outline-none focus:border-purple-500/30"
            />
            <button
              onClick={() => setEditItems(editItems.filter((_, idx) => idx !== i))}
              className="p-1 text-gray-500 hover:text-red-400 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <span className={cn("flex-shrink-0 opacity-50", bulletColorClass)}>•</span>
          <input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem())}
            placeholder={placeholder}
            className="flex-1 py-1.5 px-2 bg-white/[0.02] border border-white/[0.06] border-dashed rounded text-sm text-white/70 placeholder:text-gray-600 focus:outline-none focus:border-purple-500/30"
          />
          <button onClick={addItem} className="p-1 text-purple-400 hover:text-purple-300">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={handleCancel} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 text-xs bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30"
          >
            Save
          </button>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-between py-2">
        <p className="text-sm text-gray-500 italic">{emptyMessage}</p>
        {editable && (
          <button onClick={handleStartEdit} className="p-1 text-gray-500 hover:text-purple-400">
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="group relative">
      {editable && (
        <button
          onClick={handleStartEdit}
          className="absolute top-0 right-0 p-1 text-gray-500 hover:text-purple-400 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
      )}
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
            <span className={cn("flex-shrink-0", bulletColorClass)}>•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ============================================================================
// QUOTES DISPLAY
// ============================================================================

interface QuotesDisplayProps extends EditableProps {
  quotes: string[]
  emptyMessage?: string
}

export function QuotesDisplay({
  quotes,
  emptyMessage = 'No quotes',
  editable = false,
  onSave,
}: QuotesDisplayProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editQuotes, setEditQuotes] = useState<string[]>([])
  const [newQuote, setNewQuote] = useState('')

  const handleStartEdit = () => {
    setEditQuotes([...quotes])
    setIsEditing(true)
  }

  const handleSave = () => {
    // Include newQuote if user typed something but didn't click Plus
    const quotesToSave = newQuote.trim()
      ? [...editQuotes, newQuote.trim()]
      : editQuotes
    onSave?.(quotesToSave.filter(q => q.trim()))
    setIsEditing(false)
    setNewQuote('')
  }

  if (isEditing && editable) {
    return (
      <div className="space-y-2">
        {editQuotes.map((quote, i) => (
          <div key={i} className="flex items-start gap-2 group">
            <span className="text-gray-500 flex-shrink-0 mt-1.5">"</span>
            <textarea
              value={quote}
              onChange={(e) => {
                const newQuotes = [...editQuotes]
                newQuotes[i] = e.target.value
                setEditQuotes(newQuotes)
              }}
              className="flex-1 py-1.5 px-2 bg-white/[0.03] border border-white/[0.08] rounded text-sm text-gray-300 italic focus:outline-none focus:border-purple-500/30 resize-none min-h-[60px]"
            />
            <span className="text-gray-500 flex-shrink-0 mt-1.5">"</span>
            <button
              onClick={() => setEditQuotes(editQuotes.filter((_, idx) => idx !== i))}
              className="p-1 text-gray-500 hover:text-red-400 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <div className="flex items-start gap-2">
          <span className="text-gray-600 flex-shrink-0 mt-1.5">"</span>
          <textarea
            value={newQuote}
            onChange={(e) => setNewQuote(e.target.value)}
            placeholder="Add a memorable quote..."
            className="flex-1 py-1.5 px-2 bg-white/[0.02] border border-white/[0.06] border-dashed rounded text-sm text-gray-400 italic placeholder:text-gray-600 placeholder:not-italic focus:outline-none focus:border-purple-500/30 resize-none min-h-[40px]"
          />
          <span className="text-gray-600 flex-shrink-0 mt-1.5">"</span>
          <button
            onClick={() => {
              if (newQuote.trim()) {
                setEditQuotes([...editQuotes, newQuote.trim()])
                setNewQuote('')
              }
            }}
            className="p-1 text-purple-400 hover:text-purple-300"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={() => { setIsEditing(false); setNewQuote('') }} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white">
            Cancel
          </button>
          <button onClick={handleSave} className="px-3 py-1.5 text-xs bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30">
            Save
          </button>
        </div>
      </div>
    )
  }

  if (quotes.length === 0) {
    return (
      <div className="flex items-center justify-between py-2">
        <p className="text-sm text-gray-500 italic">{emptyMessage}</p>
        {editable && (
          <button onClick={handleStartEdit} className="p-1 text-gray-500 hover:text-purple-400">
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="group relative">
      {editable && (
        <button
          onClick={handleStartEdit}
          className="absolute top-0 right-0 p-1 text-gray-500 hover:text-purple-400 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
      )}
      <div className="space-y-1">
        {quotes.map((quote, i) => (
          <p key={i} className="text-sm text-gray-400 italic">"{quote}"</p>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// LIFE PHASE CARD
// ============================================================================

interface LifePhaseDisplayProps extends EditableProps {
  phases: BackstoryPhase[]
  emptyMessage?: string
}

export function LifePhaseDisplay({
  phases,
  emptyMessage = 'No life phases defined',
  editable = false,
  onSave,
}: LifePhaseDisplayProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editPhases, setEditPhases] = useState<BackstoryPhase[]>([])

  const handleStartEdit = () => {
    setEditPhases([...phases])
    setIsEditing(true)
  }

  const handleSave = () => {
    onSave?.(editPhases.filter(p => p.title.trim() || p.content.trim()))
    setIsEditing(false)
  }

  if (isEditing && editable) {
    return (
      <div className="space-y-3">
        {editPhases.map((phase, i) => (
          <div key={i} className="bg-white/[0.02] rounded-lg p-3 border-l-2 border-purple-500/50 group relative">
            <button
              onClick={() => setEditPhases(editPhases.filter((_, idx) => idx !== i))}
              className="absolute top-2 right-2 p-1 text-gray-500 hover:text-red-400 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <input
              value={phase.title}
              onChange={(e) => {
                const newPhases = [...editPhases]
                newPhases[i] = { ...phase, title: e.target.value }
                setEditPhases(newPhases)
              }}
              placeholder="Phase title (e.g., 'Early Life')"
              className="w-full text-sm font-medium text-purple-400 bg-transparent border-none focus:outline-none placeholder:text-gray-600 mb-2"
            />
            <textarea
              value={phase.content}
              onChange={(e) => {
                const newPhases = [...editPhases]
                newPhases[i] = { ...phase, content: e.target.value }
                setEditPhases(newPhases)
              }}
              placeholder="Key events, bullet points, or prose for this life phase..."
              className="w-full text-sm text-gray-400 bg-transparent border-none focus:outline-none placeholder:text-gray-600 resize-none min-h-[80px]"
            />
          </div>
        ))}
        <button
          onClick={() => setEditPhases([...editPhases, { title: '', content: '' }])}
          className="w-full py-2 px-3 bg-white/[0.02] border border-white/[0.06] border-dashed rounded-lg text-sm text-gray-500 hover:text-purple-400 hover:border-purple-500/30 transition-colors"
        >
          <Plus className="w-4 h-4 inline mr-2" />
          Add Life Phase
        </button>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={() => { setIsEditing(false); setEditPhases([]) }} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white">
            Cancel
          </button>
          <button onClick={handleSave} className="px-3 py-1.5 text-xs bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30">
            Save
          </button>
        </div>
      </div>
    )
  }

  if (phases.length === 0) {
    return (
      <div className="flex items-center justify-between py-4 px-3 bg-white/[0.015] border border-dashed border-white/[0.08] rounded-xl">
        <div>
          <p className="text-sm text-gray-500">{emptyMessage}</p>
          <p className="text-xs text-gray-600 mt-1">Break the backstory into phases like "Early Life", "Student Years", etc.</p>
        </div>
        {editable && (
          <button onClick={handleStartEdit} className="p-2 text-gray-500 hover:text-purple-400">
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="group relative">
      {editable && (
        <button
          onClick={handleStartEdit}
          className="absolute top-0 right-0 p-2 text-gray-500 hover:text-purple-400 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10 active:text-purple-400"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      )}
      <div className="space-y-3">
        {phases.map((phase, i) => (
          <div key={i} className="bg-white/[0.02] rounded-lg p-3 border-l-2 border-purple-500/50">
            <h5 className="text-sm font-medium text-purple-400 mb-2">{phase.title}</h5>
            <div className="text-sm text-gray-400">
              {renderMarkdown(phase.content)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// NPC PREVIEW CARD (for display, matching import preview exactly)
// ============================================================================

interface NPCPreviewCardProps {
  npc: NPC
  onEdit?: () => void
  onDelete?: () => void
}

export function NPCPreviewCard({ npc, onEdit, onDelete }: NPCPreviewCardProps) {
  const relationshipColor = RELATIONSHIP_COLORS[npc.relationship_type] || RELATIONSHIP_COLORS.other

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3 hover:border-white/[0.1] transition-colors group">
      {/* Header row: Name, nickname, badges, actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Avatar thumbnail if available */}
        {npc.image_url && (
          <img
            src={npc.image_url}
            alt={npc.name}
            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
          />
        )}
        <span className="font-medium text-white/90">{npc.name}</span>
        {npc.nickname && (
          <span className="text-sm text-gray-500 italic">"{npc.nickname}"</span>
        )}
        <span className={`text-xs px-2 py-0.5 rounded-md capitalize border ${relationshipColor}`}>
          {npc.relationship_label || npc.relationship_type.replace(/_/g, ' ')}
        </span>
        {npc.relationship_status && npc.relationship_status !== 'active' && (
          <span className="text-xs px-2 py-0.5 bg-gray-500/15 text-gray-400 rounded capitalize">
            {npc.relationship_status}
          </span>
        )}
        {(onEdit || onDelete) && (
          <div className="ml-auto flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <button onClick={onEdit} className="p-1 text-gray-500 hover:text-purple-400">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}
            {onDelete && (
              <button onClick={onDelete} className="p-1 text-gray-500 hover:text-red-400">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Emoji fields - ALL VISIBLE (matching import preview exactly) */}
      {npc.occupation && (
        <p className="text-xs text-gray-500 mt-1">{DISPLAY_EMOJIS.occupation} {npc.occupation}</p>
      )}
      {npc.location && (
        <p className="text-xs text-gray-500 mt-1">{DISPLAY_EMOJIS.location} {npc.location}</p>
      )}
      {npc.faction_affiliations && npc.faction_affiliations.length > 0 && (
        <p className="text-xs text-gray-500 mt-1">{DISPLAY_EMOJIS.faction} {npc.faction_affiliations.join(', ')}</p>
      )}
      {npc.needs && (
        <p className="text-xs text-gray-500 mt-1">{DISPLAY_EMOJIS.need} Needs: {npc.needs}</p>
      )}
      {npc.can_provide && (
        <p className="text-xs text-gray-500 mt-1">{DISPLAY_EMOJIS.provide} Can provide: {npc.can_provide}</p>
      )}
      {npc.goals && (
        <p className="text-xs text-gray-500 mt-1">{DISPLAY_EMOJIS.goal} Goals: {npc.goals}</p>
      )}
      {npc.secrets && (
        <p className="text-xs text-amber-400/70 mt-1">{DISPLAY_EMOJIS.secret} Secrets: {npc.secrets}</p>
      )}

      {/* Personality traits as chips */}
      {npc.personality_traits && npc.personality_traits.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {npc.personality_traits.map((trait, i) => (
            <span key={i} className="text-xs px-2 py-0.5 bg-white/[0.04] text-gray-400 rounded-md">
              {trait}
            </span>
          ))}
        </div>
      )}

      {/* Full notes section */}
      {npc.full_notes && (
        <div className="mt-2 pt-2 border-t border-white/[0.06]">
          <p className="text-xs text-gray-500 mb-1">Full Notes:</p>
          <div className="text-xs text-gray-400">
            {renderMarkdown(npc.full_notes)}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// COMPANION PREVIEW CARD (matching import preview exactly)
// ============================================================================

interface CompanionPreviewCardProps {
  companion: Companion
  onEdit?: () => void
  onDelete?: () => void
}

export function CompanionPreviewCard({ companion, onEdit, onDelete }: CompanionPreviewCardProps) {
  const typeColor = COMPANION_TYPE_COLORS[companion.companion_type] || COMPANION_TYPE_COLORS.other

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3 hover:border-white/[0.1] transition-colors group">
      {/* Header row - matching import preview */}
      <div className="flex items-center gap-2">
        {/* Portrait thumbnail if available */}
        {companion.image_url ? (
          <img
            src={companion.image_url}
            alt={companion.name}
            className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
          />
        ) : (
          <Heart className="w-4 h-4 text-pink-400" />
        )}
        <span className="font-medium text-white/90">{companion.name}</span>
        <span className={`text-xs px-2 py-0.5 rounded-md capitalize border ${typeColor}`}>
          {companion.companion_type.replace(/_/g, ' ')}
        </span>
        {companion.companion_species && (
          <span className="text-xs text-gray-500">({companion.companion_species})</span>
        )}
        {(onEdit || onDelete) && (
          <div className="ml-auto flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <button onClick={onEdit} className="p-1 text-gray-500 hover:text-purple-400">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}
            {onDelete && (
              <button onClick={onDelete} className="p-1 text-gray-500 hover:text-red-400">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Description */}
      {companion.description && (
        <p className="text-xs text-gray-400 mt-2 whitespace-pre-wrap">{companion.description}</p>
      )}

      {/* Abilities with emoji (matching import preview) */}
      {companion.abilities && (
        <p className="text-xs text-purple-400/80 mt-1">✨ Abilities: {companion.abilities}</p>
      )}
    </div>
  )
}

// ============================================================================
// DM Q&A DISPLAY
// ============================================================================

interface DmQADisplayProps extends EditableProps {
  items: DmQA[]
  emptyMessage?: string
}

export function DmQADisplay({
  items,
  emptyMessage = 'No DM Q&A entries',
  editable = false,
  onSave,
}: DmQADisplayProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editItems, setEditItems] = useState<DmQA[]>([])

  const handleStartEdit = () => {
    setEditItems([...items])
    setIsEditing(true)
  }

  const handleSave = () => {
    onSave?.(editItems.filter(item => item.question.trim() || item.answer.trim()))
    setIsEditing(false)
  }

  if (isEditing && editable) {
    return (
      <div className="space-y-3">
        {editItems.map((item, i) => (
          <div key={i} className="bg-white/[0.02] rounded-lg p-3 group relative">
            <button
              onClick={() => setEditItems(editItems.filter((_, idx) => idx !== i))}
              className="absolute top-2 right-2 p-1 text-gray-500 hover:text-red-400 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <input
              value={item.question}
              onChange={(e) => {
                const newItems = [...editItems]
                newItems[i] = { ...item, question: e.target.value }
                setEditItems(newItems)
              }}
              placeholder="Question..."
              className="w-full text-sm font-medium text-purple-400 bg-transparent border-none focus:outline-none placeholder:text-gray-600 mb-2"
            />
            <textarea
              value={item.answer}
              onChange={(e) => {
                const newItems = [...editItems]
                newItems[i] = { ...item, answer: e.target.value }
                setEditItems(newItems)
              }}
              placeholder="Answer..."
              className="w-full text-sm text-gray-400 bg-transparent border-none focus:outline-none placeholder:text-gray-600 resize-none min-h-[60px]"
            />
          </div>
        ))}
        <button
          onClick={() => setEditItems([...editItems, { question: '', answer: '' }])}
          className="w-full py-2 px-3 bg-white/[0.02] border border-white/[0.06] border-dashed rounded-lg text-sm text-gray-500 hover:text-purple-400 hover:border-purple-500/30 transition-colors"
        >
          <Plus className="w-4 h-4 inline mr-2" />
          Add Q&A Entry
        </button>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={() => { setIsEditing(false); setEditItems([]) }} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white">
            Cancel
          </button>
          <button onClick={handleSave} className="px-3 py-1.5 text-xs bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30">
            Save
          </button>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-between py-2">
        <p className="text-sm text-gray-500 italic">{emptyMessage}</p>
        {editable && (
          <button onClick={handleStartEdit} className="p-1 text-gray-500 hover:text-purple-400">
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="group relative">
      {editable && (
        <button
          onClick={handleStartEdit}
          className="absolute top-0 right-0 p-1 text-gray-500 hover:text-purple-400 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
      )}
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="bg-white/[0.02] rounded-lg p-3">
            <p className="text-sm text-purple-400 font-medium mb-1">Q: {item.question}</p>
            <p className="text-sm text-gray-400">A: {item.answer}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// RUMORS DISPLAY
// ============================================================================

interface RumorsDisplayProps extends EditableProps {
  rumors: Rumor[]
  emptyMessage?: string
}

export function RumorsDisplay({
  rumors,
  emptyMessage = 'No rumors',
  editable = false,
  onSave,
}: RumorsDisplayProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editRumors, setEditRumors] = useState<Rumor[]>([])

  const handleStartEdit = () => {
    setEditRumors([...rumors])
    setIsEditing(true)
  }

  const handleSave = () => {
    onSave?.(editRumors.filter(r => r.statement.trim()))
    setIsEditing(false)
  }

  if (isEditing && editable) {
    return (
      <div className="space-y-2">
        {editRumors.map((rumor, i) => (
          <div key={i} className="flex items-center gap-2 group">
            <button
              onClick={() => {
                const newRumors = [...editRumors]
                newRumors[i] = { ...rumor, is_true: !rumor.is_true }
                setEditRumors(newRumors)
              }}
              className={cn(
                "flex-shrink-0 w-6 h-6 rounded flex items-center justify-center",
                rumor.is_true ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
              )}
            >
              {rumor.is_true ? '✓' : '✗'}
            </button>
            <input
              value={rumor.statement}
              onChange={(e) => {
                const newRumors = [...editRumors]
                newRumors[i] = { ...rumor, statement: e.target.value }
                setEditRumors(newRumors)
              }}
              className="flex-1 py-1.5 px-2 bg-white/[0.03] border border-white/[0.08] rounded text-sm text-white/90 focus:outline-none focus:border-purple-500/30"
            />
            <button
              onClick={() => setEditRumors(editRumors.filter((_, idx) => idx !== i))}
              className="p-1 text-gray-500 hover:text-red-400 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <button
          onClick={() => setEditRumors([...editRumors, { statement: '', is_true: false }])}
          className="w-full py-2 px-3 bg-white/[0.02] border border-white/[0.06] border-dashed rounded-lg text-sm text-gray-500 hover:text-purple-400 hover:border-purple-500/30 transition-colors"
        >
          <Plus className="w-4 h-4 inline mr-2" />
          Add Rumor
        </button>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={() => { setIsEditing(false); setEditRumors([]) }} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white">
            Cancel
          </button>
          <button onClick={handleSave} className="px-3 py-1.5 text-xs bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30">
            Save
          </button>
        </div>
      </div>
    )
  }

  if (rumors.length === 0) {
    return (
      <div className="flex items-center justify-between py-2">
        <p className="text-sm text-gray-500 italic">{emptyMessage}</p>
        {editable && (
          <button onClick={handleStartEdit} className="p-1 text-gray-500 hover:text-purple-400">
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="group relative">
      {editable && (
        <button
          onClick={handleStartEdit}
          className="absolute top-0 right-0 p-1 text-gray-500 hover:text-purple-400 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
      )}
      <ul className="space-y-1">
        {rumors.map((rumor, i) => (
          <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
            <span className={rumor.is_true ? 'text-green-400' : 'text-red-400'}>
              {rumor.is_true ? '✓' : '✗'}
            </span>
            <span>{rumor.statement}</span>
            <span className={`text-xs ${rumor.is_true ? 'text-green-400/60' : 'text-red-400/60'}`}>
              ({rumor.is_true ? 'true' : 'false'})
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ============================================================================
// SECTION HEADER
// ============================================================================

interface SectionHeaderProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  emoji?: string
  count?: number
}

export function SectionHeader({ icon: Icon, title, emoji, count }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <div className="p-2.5 bg-purple-500/10 rounded-lg border border-purple-500/20">
        <Icon className="w-5 h-5 text-purple-400" />
      </div>
      <h2 className="text-lg font-semibold text-white/90 uppercase tracking-wider">
        {emoji && <span className="mr-2">{emoji}</span>}
        {title}
        {count !== undefined && count > 0 && (
          <span className="ml-2 text-sm text-gray-500 font-normal">({count})</span>
        )}
      </h2>
      <div className="flex-1 h-px bg-gradient-to-r from-white/[0.06] to-transparent" />
    </div>
  )
}

// ============================================================================
// FIELD LABEL
// ============================================================================

interface FieldLabelProps {
  children: React.ReactNode
  emoji?: string
  count?: number
}

export function FieldLabel({ children, emoji, count }: FieldLabelProps) {
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

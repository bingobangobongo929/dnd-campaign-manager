'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import {
  MessageSquare,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  Users,
  User,
  Save,
  X,
  UserPlus,
} from 'lucide-react'
import { Modal } from '@/components/ui'
import { toast } from 'sonner'
import { cn, getInitials, formatRelativeDate } from '@/lib/utils'
import type { PlayerSessionNote, Character, NoteSource } from '@/types/database'

// Source display labels
const SOURCE_LABELS: Record<NoteSource, string> = {
  player_submitted: 'Submitted',
  dm_added: 'Added by DM',
  discord_import: 'from Discord',
  whatsapp_import: 'from WhatsApp',
  email_import: 'from Email',
  other_import: 'from External',
  manual: 'Added',
}

// Source options for DMs adding on behalf
const DM_SOURCE_OPTIONS: { value: NoteSource; label: string }[] = [
  { value: 'discord_import', label: 'Discord' },
  { value: 'whatsapp_import', label: 'WhatsApp' },
  { value: 'email_import', label: 'Email' },
  { value: 'other_import', label: 'Other Source' },
]

interface PlayerNotesProps {
  campaignId: string
  sessionId: string
  characters?: Character[]
  autoOpenAdd?: boolean
  onModalClose?: () => void
}

interface NoteWithRelations extends PlayerSessionNote {
  character?: {
    id: string
    name: string
    image_url: string | null
    status?: string
  } | null
  added_by_user?: {
    username: string | null
    avatar_url: string | null
  } | null
}

export function PlayerNotes({ campaignId, sessionId, characters = [], autoOpenAdd, onModalClose }: PlayerNotesProps) {
  const [notes, setNotes] = useState<NoteWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [isDm, setIsDm] = useState(false)
  const [canAddNotes, setCanAddNotes] = useState(false)
  const [userCharacterId, setUserCharacterId] = useState<string | null>(null)

  const [addModalOpen, setAddModalOpen] = useState(false)

  // Auto-open add modal when prop changes
  useEffect(() => {
    if (autoOpenAdd && canAddNotes && !loading) {
      setNoteContent('')
      setSelectedCharacterId(userCharacterId || '')
      setIsShared(true)
      setAddModalOpen(true)
    }
  }, [autoOpenAdd, canAddNotes, loading, userCharacterId])
  const [addOnBehalfModalOpen, setAddOnBehalfModalOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<NoteWithRelations | null>(null)
  const [noteContent, setNoteContent] = useState('')
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('')
  const [selectedSource, setSelectedSource] = useState<NoteSource>('discord_import')
  const [isShared, setIsShared] = useState(true)
  const [saving, setSaving] = useState(false)

  // Load notes
  useEffect(() => {
    loadNotes()
  }, [campaignId, sessionId])

  const loadNotes = async () => {
    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/sessions/${sessionId}/player-notes`
      )
      const data = await response.json()

      if (response.ok) {
        setNotes(data.notes || [])
        setIsDm(data.isDm || false)
        setCanAddNotes(data.canAddNotes || false)
        setUserCharacterId(data.userCharacterId || null)
      }
    } catch (error) {
      console.error('Failed to load notes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddNote = async (onBehalf = false) => {
    if (!noteContent.trim()) {
      toast.error('Please enter some notes')
      return
    }

    if (onBehalf && !selectedCharacterId) {
      toast.error('Please select a character')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/sessions/${sessionId}/player-notes`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notes: noteContent,
            characterId: selectedCharacterId || undefined,
            source: onBehalf ? selectedSource : 'player_submitted',
            isSharedWithParty: isShared,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to add note')
        return
      }

      toast.success(onBehalf ? 'Note added on behalf of player!' : 'Note added!')
      setNoteContent('')
      setSelectedCharacterId('')
      setSelectedSource('discord_import')
      setIsShared(true)
      setAddModalOpen(false)
      setAddOnBehalfModalOpen(false)
      loadNotes()
    } catch (error) {
      console.error('Failed to add note:', error)
      toast.error('Failed to add note')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateNote = async () => {
    if (!editingNote || !noteContent.trim()) return

    setSaving(true)
    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/sessions/${sessionId}/player-notes`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            noteId: editingNote.id,
            notes: noteContent,
            isSharedWithParty: isShared,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to update note')
        return
      }

      toast.success('Note updated!')
      setEditingNote(null)
      setNoteContent('')
      setIsShared(true)
      loadNotes()
    } catch (error) {
      console.error('Failed to update note:', error)
      toast.error('Failed to update note')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Delete this note?')) return

    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/sessions/${sessionId}/player-notes?noteId=${noteId}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        const data = await response.json()
        toast.error(data.error || 'Failed to delete note')
        return
      }

      toast.success('Note deleted')
      loadNotes()
    } catch (error) {
      console.error('Failed to delete note:', error)
      toast.error('Failed to delete note')
    }
  }

  const startEdit = (note: NoteWithRelations) => {
    setEditingNote(note)
    setNoteContent(note.notes || '')
    setIsShared(note.is_shared_with_party !== false)
  }

  // Filter characters to only active PCs for "add on behalf" (not deceased, not retired)
  const activeCharacters = characters.filter(c =>
    c.type === 'pc' &&
    (!c.status || c.status === 'alive' || c.status === 'active')
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-400" />
          <h3 className="font-medium text-white">Player Perspectives</h3>
          {notes.length > 0 && (
            <span className="text-xs text-gray-500">({notes.length})</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* DM: Add on behalf button */}
          {isDm && activeCharacters.length > 0 && (
            <button
              onClick={() => {
                setNoteContent('')
                setSelectedCharacterId('')
                setSelectedSource('discord_import')
                setIsShared(true)
                setAddOnBehalfModalOpen(true)
              }}
              className="btn btn-sm btn-secondary"
              title="Add notes on behalf of a player"
            >
              <UserPlus className="w-3 h-3 mr-1" />
              On Behalf Of
            </button>
          )}
          {/* Regular add notes button */}
          {canAddNotes && (
            <button
              onClick={() => {
                setNoteContent('')
                setSelectedCharacterId(userCharacterId || '')
                setIsShared(true)
                setAddModalOpen(true)
              }}
              className="btn btn-sm btn-primary"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Notes
            </button>
          )}
        </div>
      </div>

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="text-center py-8 bg-white/[0.02] rounded-lg border border-[--border]">
          <MessageSquare className="w-8 h-8 text-gray-600 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No player notes yet</p>
          {canAddNotes && (
            <p className="text-gray-600 text-xs mt-1">
              Add notes from your character&apos;s perspective
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              isDm={isDm}
              onEdit={() => startEdit(note)}
              onDelete={() => handleDeleteNote(note.id)}
            />
          ))}
        </div>
      )}

      {/* Add Note Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => {
          setAddModalOpen(false)
          onModalClose?.()
        }}
        title="Add Session Notes"
        description="Record your perspective on this session"
        size="md"
      >
        <NoteForm
          noteContent={noteContent}
          setNoteContent={setNoteContent}
          selectedCharacterId={selectedCharacterId}
          setSelectedCharacterId={setSelectedCharacterId}
          isShared={isShared}
          setIsShared={setIsShared}
          characters={characters}
          isDm={isDm}
          saving={saving}
          onSave={handleAddNote}
          onCancel={() => setAddModalOpen(false)}
        />
      </Modal>

      {/* Edit Note Modal */}
      <Modal
        isOpen={!!editingNote}
        onClose={() => setEditingNote(null)}
        title="Edit Notes"
        description="Update your session notes"
        size="md"
      >
        <NoteForm
          noteContent={noteContent}
          setNoteContent={setNoteContent}
          selectedCharacterId={editingNote?.character_id || ''}
          setSelectedCharacterId={() => {}} // Can't change character on edit
          isShared={isShared}
          setIsShared={setIsShared}
          characters={[]}
          isDm={isDm}
          saving={saving}
          onSave={handleUpdateNote}
          onCancel={() => setEditingNote(null)}
          isEdit
        />
      </Modal>

      {/* Add on Behalf Modal (DM only) */}
      <Modal
        isOpen={addOnBehalfModalOpen}
        onClose={() => setAddOnBehalfModalOpen(false)}
        title="Add Notes on Behalf of Player"
        description="Add session notes from a player who doesn't use the site"
        size="md"
      >
        <OnBehalfForm
          noteContent={noteContent}
          setNoteContent={setNoteContent}
          selectedCharacterId={selectedCharacterId}
          setSelectedCharacterId={setSelectedCharacterId}
          selectedSource={selectedSource}
          setSelectedSource={setSelectedSource}
          isShared={isShared}
          setIsShared={setIsShared}
          characters={activeCharacters}
          saving={saving}
          onSave={() => handleAddNote(true)}
          onCancel={() => setAddOnBehalfModalOpen(false)}
        />
      </Modal>
    </div>
  )
}

// Individual note card
interface NoteCardProps {
  note: NoteWithRelations
  isDm: boolean
  onEdit: () => void
  onDelete: () => void
}

function NoteCard({ note, isDm, onEdit, onDelete }: NoteCardProps) {
  const displayName = note.character?.name ||
    note.added_by_user?.username ||
    'Unknown'

  const avatarUrl = note.character?.image_url ||
    note.added_by_user?.avatar_url

  // Determine if this was added on behalf of someone
  const isOnBehalf = note.source && ['discord_import', 'whatsapp_import', 'email_import', 'other_import', 'dm_added'].includes(note.source)
  const sourceLabel = note.source ? SOURCE_LABELS[note.source as NoteSource] : null

  return (
    <div className={cn(
      "p-4 rounded-lg border",
      note.is_shared_with_party
        ? "bg-blue-500/5 border-blue-500/20"
        : "bg-gray-500/5 border-gray-500/20"
    )}>
      <div className="flex items-start gap-3">
        {/* Avatar */}
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={displayName}
            width={36}
            height={36}
            className="rounded-full object-cover"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 font-medium text-sm">
            {getInitials(displayName)}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-medium text-white text-sm">{displayName}</span>
            {/* Source indicator for notes added on behalf */}
            {isOnBehalf && sourceLabel && (
              <span className="text-xs text-amber-400/80">
                (Added by DM • {sourceLabel})
              </span>
            )}
            {note.is_shared_with_party ? (
              <span className="inline-flex items-center gap-1 text-xs text-blue-400">
                <Users className="w-3 h-3" />
                Shared
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <EyeOff className="w-3 h-3" />
                Private
              </span>
            )}
            <span className="text-xs text-gray-500">
              {formatRelativeDate(note.created_at || '')}
            </span>
          </div>
          <p className="text-sm text-gray-300 whitespace-pre-wrap">{note.notes}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="p-1.5 hover:bg-white/[0.05] rounded text-gray-400 hover:text-gray-300"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 hover:bg-white/[0.05] rounded text-red-400"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Form component used for both add and edit
interface NoteFormProps {
  noteContent: string
  setNoteContent: (value: string) => void
  selectedCharacterId: string
  setSelectedCharacterId: (value: string) => void
  isShared: boolean
  setIsShared: (value: boolean) => void
  characters: Character[]
  isDm: boolean
  saving: boolean
  onSave: () => void
  onCancel: () => void
  isEdit?: boolean
}

function NoteForm({
  noteContent,
  setNoteContent,
  selectedCharacterId,
  setSelectedCharacterId,
  isShared,
  setIsShared,
  characters,
  isDm,
  saving,
  onSave,
  onCancel,
  isEdit = false,
}: NoteFormProps) {
  const pcCharacters = characters.filter(c => c.type === 'pc')

  return (
    <div className="space-y-4">
      {/* Character selection (only for DMs adding on behalf) */}
      {isDm && !isEdit && pcCharacters.length > 0 && (
        <div className="form-group">
          <label className="form-label">
            From Character
            <span className="text-gray-500 text-xs ml-2">(optional)</span>
          </label>
          <select
            value={selectedCharacterId}
            onChange={(e) => setSelectedCharacterId(e.target.value)}
            className="form-input"
          >
            <option value="">No specific character</option>
            {pcCharacters.map(char => (
              <option key={char.id} value={char.id}>
                {char.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            As DM, you can add notes on behalf of players
          </p>
        </div>
      )}

      {/* Notes content */}
      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea
          value={noteContent}
          onChange={(e) => setNoteContent(e.target.value)}
          placeholder="What happened from your perspective? What did your character think or feel?"
          rows={6}
          className="form-input"
          autoFocus
        />
      </div>

      {/* Visibility toggle */}
      <div className="form-group">
        <label className="form-label flex items-center gap-2">
          <input
            type="checkbox"
            checked={isShared}
            onChange={(e) => setIsShared(e.target.checked)}
            className="form-checkbox"
          />
          <span>Share with party</span>
        </label>
        <p className="text-xs text-gray-500 mt-1 ml-6">
          {isShared
            ? "Other players can see these notes"
            : "Only you and the DM can see these notes"}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onCancel}
          disabled={saving}
          className="btn btn-secondary flex-1"
        >
          <X className="w-4 h-4 mr-1" />
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={saving || !noteContent.trim()}
          className="btn btn-primary flex-1"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Save className="w-4 h-4 mr-1" />
              {isEdit ? 'Update' : 'Save Notes'}
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// Form for DMs adding notes on behalf of players
interface OnBehalfFormProps {
  noteContent: string
  setNoteContent: (value: string) => void
  selectedCharacterId: string
  setSelectedCharacterId: (value: string) => void
  selectedSource: NoteSource
  setSelectedSource: (value: NoteSource) => void
  isShared: boolean
  setIsShared: (value: boolean) => void
  characters: Character[]
  saving: boolean
  onSave: () => void
  onCancel: () => void
}

function OnBehalfForm({
  noteContent,
  setNoteContent,
  selectedCharacterId,
  setSelectedCharacterId,
  selectedSource,
  setSelectedSource,
  isShared,
  setIsShared,
  characters,
  saving,
  onSave,
  onCancel,
}: OnBehalfFormProps) {
  return (
    <div className="space-y-4">
      {/* Character selection - required for on behalf */}
      <div className="form-group">
        <label className="form-label">
          Character <span className="text-red-400">*</span>
        </label>
        <select
          value={selectedCharacterId}
          onChange={(e) => setSelectedCharacterId(e.target.value)}
          className="form-input"
        >
          <option value="">Select a character...</option>
          {characters.map(char => (
            <option key={char.id} value={char.id}>
              {char.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Select whose perspective these notes are from
        </p>
      </div>

      {/* Source selection */}
      <div className="form-group">
        <label className="form-label">Source</label>
        <select
          value={selectedSource}
          onChange={(e) => setSelectedSource(e.target.value as NoteSource)}
          className="form-input"
        >
          {DM_SOURCE_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Where did these notes come from?
        </p>
      </div>

      {/* Notes content */}
      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea
          value={noteContent}
          onChange={(e) => setNoteContent(e.target.value)}
          placeholder="Paste or type the player's session notes here..."
          rows={8}
          className="form-input"
          autoFocus
        />
      </div>

      {/* Visibility toggle */}
      <div className="form-group">
        <label className="form-label flex items-center gap-2">
          <input
            type="checkbox"
            checked={isShared}
            onChange={(e) => setIsShared(e.target.checked)}
            className="form-checkbox"
          />
          <span>Share with party</span>
        </label>
        <p className="text-xs text-gray-500 mt-1 ml-6">
          {isShared
            ? "Other players can see these notes"
            : "Only visible to you and the character's player"}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onCancel}
          disabled={saving}
          className="btn btn-secondary flex-1"
        >
          <X className="w-4 h-4 mr-1" />
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={saving || !noteContent.trim() || !selectedCharacterId}
          className="btn btn-primary flex-1"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <UserPlus className="w-4 h-4 mr-1" />
              Add Notes
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// Compact view for dashboards
interface PlayerNotesPreviewProps {
  campaignId: string
  sessionId: string
  limit?: number
}

export function PlayerNotesPreview({ campaignId, sessionId, limit = 3 }: PlayerNotesPreviewProps) {
  const [notes, setNotes] = useState<NoteWithRelations[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(
          `/api/campaigns/${campaignId}/sessions/${sessionId}/player-notes`
        )
        const data = await response.json()
        if (response.ok) {
          setNotes((data.notes || []).slice(0, limit))
        }
      } catch (error) {
        console.error('Failed to load notes:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [campaignId, sessionId, limit])

  if (loading) return null
  if (notes.length === 0) return null

  return (
    <div className="space-y-2">
      {notes.map(note => (
        <div key={note.id} className="text-xs text-gray-400 flex items-start gap-2">
          <User className="w-3 h-3 text-blue-400 flex-shrink-0 mt-0.5" />
          <span className="line-clamp-2">
            <strong className="text-gray-300">{note.character?.name || 'Player'}:</strong>{' '}
            {note.notes?.slice(0, 100)}...
          </span>
        </div>
      ))}
    </div>
  )
}

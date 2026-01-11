'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Trash2, ImagePlus, Plus, User, Users } from 'lucide-react'
import { Input, Dropdown, Modal } from '@/components/ui'
import { Avatar, TagBadge } from '@/components/ui'
import { RichTextEditor } from '@/components/editor/rich-text-editor'
import { useSupabase } from '@/hooks'
import { useAutoSave } from '@/hooks'
import { cn, TAG_COLORS } from '@/lib/utils'
import type { Character, Tag, CharacterTag } from '@/types/database'

interface CharacterModalProps {
  character: Character
  tags: (CharacterTag & { tag: Tag; related_character?: Character | null })[]
  allCharacters: Character[]
  campaignId: string
  isDemo?: boolean
  onUpdate: (character: Character) => void
  onDelete: (id: string) => void
  onClose: () => void
  onTagsChange: () => void
}

export function CharacterModal({
  character,
  tags,
  allCharacters,
  campaignId,
  isDemo = false,
  onUpdate,
  onDelete,
  onClose,
  onTagsChange,
}: CharacterModalProps) {
  const supabase = useSupabase()
  const [formData, setFormData] = useState({
    name: character.name,
    summary: character.summary || '',
    notes: character.notes || '',
    type: character.type,
  })
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [isAddTagOpen, setIsAddTagOpen] = useState(false)
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [newTagForm, setNewTagForm] = useState({
    name: '',
    color: TAG_COLORS[0].value as string,
    related_character_id: null as string | null,
  })
  const [savingTag, setSavingTag] = useState(false)
  const [isCreatingNewTag, setIsCreatingNewTag] = useState(false)

  // Update form when character changes
  useEffect(() => {
    setFormData({
      name: character.name,
      summary: character.summary || '',
      notes: character.notes || '',
      type: character.type,
    })
  }, [character.id])

  // Load available tags for campaign
  useEffect(() => {
    if (!isDemo) {
      loadAvailableTags()
    }
  }, [campaignId, isDemo])

  const loadAvailableTags = async () => {
    const { data } = await supabase
      .from('tags')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('name')

    setAvailableTags(data || [])
  }

  // Auto-save functionality
  const saveCharacter = useCallback(async () => {
    if (isDemo) return

    const { data } = await supabase
      .from('characters')
      .update({
        name: formData.name,
        summary: formData.summary || null,
        notes: formData.notes || null,
        type: formData.type,
      })
      .eq('id', character.id)
      .select()
      .single()

    if (data) {
      onUpdate(data)
    }
  }, [formData, character.id, supabase, onUpdate, isDemo])

  const { status } = useAutoSave({
    data: formData,
    onSave: saveCharacter,
    delay: 1000,
  })

  const handleDelete = async () => {
    if (isDemo) {
      alert('Create your own campaign to delete characters!')
      return
    }

    await supabase
      .from('characters')
      .delete()
      .eq('id', character.id)

    onDelete(character.id)
    setIsDeleteConfirmOpen(false)
  }

  const handleAddExistingTag = async (tagId: string) => {
    if (isDemo) {
      alert('Create your own campaign to manage tags!')
      return
    }

    setSavingTag(true)
    await supabase
      .from('character_tags')
      .insert({
        character_id: character.id,
        tag_id: tagId,
        related_character_id: newTagForm.related_character_id,
      })

    setNewTagForm({ name: '', color: TAG_COLORS[0].value, related_character_id: null })
    setIsAddTagOpen(false)
    setSavingTag(false)
    onTagsChange()
  }

  const handleCreateAndAddTag = async () => {
    if (!newTagForm.name.trim()) return
    if (isDemo) {
      alert('Create your own campaign to manage tags!')
      return
    }

    setSavingTag(true)

    const { data: tag } = await supabase
      .from('tags')
      .insert({
        campaign_id: campaignId,
        name: newTagForm.name,
        color: newTagForm.color,
      })
      .select()
      .single()

    if (tag) {
      await supabase
        .from('character_tags')
        .insert({
          character_id: character.id,
          tag_id: tag.id,
          related_character_id: newTagForm.related_character_id,
        })

      setAvailableTags([...availableTags, tag])
    }

    setNewTagForm({ name: '', color: TAG_COLORS[0].value, related_character_id: null })
    setIsAddTagOpen(false)
    setIsCreatingNewTag(false)
    setSavingTag(false)
    onTagsChange()
  }

  const handleRemoveTag = async (characterTagId: string) => {
    if (isDemo) {
      alert('Create your own campaign to manage tags!')
      return
    }

    await supabase
      .from('character_tags')
      .delete()
      .eq('id', characterTagId)

    onTagsChange()
  }

  const otherCharacters = allCharacters.filter(c => c.id !== character.id)
  const unusedTags = availableTags.filter(t => !tags.some(ct => ct.tag_id === t.id))

  return (
    <>
      {/* Main Character Modal */}
      <div className="modal-backdrop" onClick={onClose}>
        <div
          className="character-modal"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="character-modal-header">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                character.type === 'pc'
                  ? "bg-[--arcane-purple]/20 text-[--arcane-purple]"
                  : "bg-[--arcane-gold]/20 text-[--arcane-gold]"
              )}>
                {character.type === 'pc' ? <User className="w-5 h-5" /> : <Users className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="modal-title">Edit Character</h2>
                <p className="text-xs text-[--text-tertiary]">
                  {isDemo ? 'Demo mode - changes not saved' : (
                    status === 'saving' ? 'Saving...' : status === 'saved' ? 'All changes saved' : ''
                  )}
                </p>
              </div>
            </div>
            <button className="btn-ghost btn-icon w-9 h-9" onClick={onClose}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="character-modal-body">
            {/* Top Section: Avatar + Basic Info */}
            <div className="character-modal-top">
              {/* Avatar */}
              <div className="relative group flex-shrink-0">
                <Avatar
                  src={character.image_url}
                  name={formData.name}
                  size="xl"
                  className="w-24 h-24"
                />
                <button
                  className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => {/* TODO: Image upload */}}
                >
                  <ImagePlus className="w-6 h-6 text-white" />
                </button>
              </div>

              {/* Name & Type */}
              <div className="flex-1 space-y-4">
                <div className="form-group">
                  <label className="form-label">Character Name</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter character name"
                    className="form-input text-lg font-semibold"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <Dropdown
                      options={[
                        { value: 'pc', label: 'Player Character (PC)' },
                        { value: 'npc', label: 'Non-Player Character' },
                      ]}
                      value={formData.type}
                      onChange={(value) => setFormData({ ...formData, type: value as 'pc' | 'npc' })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tags</label>
                    <button
                      className="btn btn-secondary w-full justify-start"
                      onClick={() => setIsAddTagOpen(true)}
                    >
                      <Plus className="w-4 h-4" />
                      Add Tag
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Tags Display */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pb-4 border-b border-[--border]">
                {tags.map((ct) => (
                  <TagBadge
                    key={ct.id}
                    name={ct.tag.name}
                    color={ct.tag.color}
                    relatedCharacter={ct.related_character?.name}
                    onRemove={() => handleRemoveTag(ct.id)}
                  />
                ))}
              </div>
            )}

            {/* Summary */}
            <div className="form-group">
              <label className="form-label">Summary</label>
              <textarea
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                placeholder="Brief description of this character - their role, personality, or key traits..."
                rows={2}
                className="form-textarea"
              />
            </div>

            {/* Notes - Rich Text Editor */}
            <div className="form-group flex-1 flex flex-col min-h-0">
              <label className="form-label">Notes</label>
              <div className="flex-1 min-h-[300px]">
                <RichTextEditor
                  content={formData.notes}
                  onChange={(content) => setFormData({ ...formData, notes: content })}
                  placeholder="Add detailed notes about this character - backstory, secrets, motivations, relationships..."
                  className="h-full"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="character-modal-footer">
            <button
              className="btn btn-ghost text-[--arcane-ember]"
              onClick={() => setIsDeleteConfirmOpen(true)}
            >
              <Trash2 className="w-4 h-4" />
              Delete Character
            </button>
            <button className="btn btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        title="Delete Character"
        description="Are you sure you want to delete this character? This action cannot be undone."
      >
        <div className="flex justify-end gap-3 pt-4">
          <button className="btn btn-secondary" onClick={() => setIsDeleteConfirmOpen(false)}>
            Cancel
          </button>
          <button className="btn bg-[--arcane-ember] hover:bg-[--arcane-ember]/80 text-white" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </Modal>

      {/* Add Tag Modal */}
      <Modal
        isOpen={isAddTagOpen}
        onClose={() => {
          setIsAddTagOpen(false)
          setIsCreatingNewTag(false)
          setNewTagForm({ name: '', color: TAG_COLORS[0].value, related_character_id: null })
        }}
        title="Add Tag"
      >
        <div className="space-y-4">
          {!isCreatingNewTag ? (
            <>
              {unusedTags.length > 0 && (
                <div className="space-y-2">
                  <label className="form-label">Existing Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {unusedTags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => handleAddExistingTag(tag.id)}
                        className="px-3 py-1.5 rounded-full text-sm font-medium transition-all hover:scale-105"
                        style={{
                          backgroundColor: `${tag.color}20`,
                          color: tag.color,
                          border: `1px solid ${tag.color}40`,
                        }}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                className="btn btn-secondary w-full"
                onClick={() => setIsCreatingNewTag(true)}
              >
                <Plus className="w-4 h-4" />
                Create New Tag
              </button>
            </>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">Tag Name</label>
                <Input
                  placeholder="e.g., Ally, Enemy, Quest Giver..."
                  value={newTagForm.name}
                  onChange={(e) => setNewTagForm({ ...newTagForm, name: e.target.value })}
                  autoFocus
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Color</label>
                <div className="flex flex-wrap gap-2">
                  {TAG_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setNewTagForm({ ...newTagForm, color: color.value })}
                      className={cn(
                        'w-8 h-8 rounded-full transition-all',
                        newTagForm.color === color.value && 'ring-2 ring-offset-2 ring-offset-[--bg-surface]'
                      )}
                      style={{ backgroundColor: color.value, '--tw-ring-color': color.value } as React.CSSProperties}
                    />
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Related Character (optional)</label>
                <Dropdown
                  options={[
                    { value: '', label: 'None' },
                    ...otherCharacters.map(c => ({ value: c.id, label: c.name }))
                  ]}
                  value={newTagForm.related_character_id || ''}
                  onChange={(value) => setNewTagForm({
                    ...newTagForm,
                    related_character_id: value || null
                  })}
                />
                <p className="text-xs text-[--text-tertiary] mt-1">
                  Link this tag to another character (e.g., "Friend of [Character]")
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button className="btn btn-secondary" onClick={() => setIsCreatingNewTag(false)}>
                  Back
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleCreateAndAddTag}
                  disabled={!newTagForm.name.trim() || savingTag}
                >
                  {savingTag ? 'Creating...' : 'Create & Add'}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  )
}

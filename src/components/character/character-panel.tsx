'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Trash2, ImagePlus, Wand2, ChevronDown, Plus } from 'lucide-react'
import { Button, Input, Textarea, Avatar, Badge, Modal, Dropdown } from '@/components/ui'
import { TagBadge } from '@/components/ui'
import { useSupabase } from '@/hooks'
import { useAutoSave } from '@/hooks'
import { cn, TAG_COLORS } from '@/lib/utils'
import type { Character, Tag, CharacterTag } from '@/types/database'

interface CharacterPanelProps {
  character: Character
  tags: (CharacterTag & { tag: Tag; related_character?: Character | null })[]
  allCharacters: Character[]
  campaignId: string
  onUpdate: (character: Character) => void
  onDelete: (id: string) => void
  onClose: () => void
  onTagsChange: () => void
}

export function CharacterPanel({
  character,
  tags,
  allCharacters,
  campaignId,
  onUpdate,
  onDelete,
  onClose,
  onTagsChange,
}: CharacterPanelProps) {
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
    color: TAG_COLORS[0],
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
    loadAvailableTags()
  }, [campaignId])

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
  }, [formData, character.id, supabase, onUpdate])

  const { saveStatus } = useAutoSave({
    data: formData,
    onSave: saveCharacter,
    delay: 1000,
  })

  const handleDelete = async () => {
    await supabase
      .from('characters')
      .delete()
      .eq('id', character.id)

    onDelete(character.id)
    setIsDeleteConfirmOpen(false)
  }

  const handleAddExistingTag = async (tagId: string) => {
    setSavingTag(true)
    await supabase
      .from('character_tags')
      .insert({
        character_id: character.id,
        tag_id: tagId,
        related_character_id: newTagForm.related_character_id,
      })

    setNewTagForm({ name: '', color: TAG_COLORS[0], related_character_id: null })
    setIsAddTagOpen(false)
    setSavingTag(false)
    onTagsChange()
  }

  const handleCreateAndAddTag = async () => {
    if (!newTagForm.name.trim()) return

    setSavingTag(true)

    // Create the tag
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
      // Add to character
      await supabase
        .from('character_tags')
        .insert({
          character_id: character.id,
          tag_id: tag.id,
          related_character_id: newTagForm.related_character_id,
        })

      setAvailableTags([...availableTags, tag])
    }

    setNewTagForm({ name: '', color: TAG_COLORS[0], related_character_id: null })
    setIsAddTagOpen(false)
    setIsCreatingNewTag(false)
    setSavingTag(false)
    onTagsChange()
  }

  const handleRemoveTag = async (characterTagId: string) => {
    await supabase
      .from('character_tags')
      .delete()
      .eq('id', characterTagId)

    onTagsChange()
  }

  const otherCharacters = allCharacters.filter(c => c.id !== character.id)
  const unusedTags = availableTags.filter(t => !tags.some(ct => ct.tag_id === t.id))

  return (
    <div className="w-96 border-l border-[--border] bg-[--bg-surface] flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[--border]">
        <h2 className="font-semibold text-[--text-primary]">Character Details</h2>
        <div className="flex items-center gap-1">
          <span className="text-xs text-[--text-tertiary] mr-2">
            {saveStatus === 'saving' && 'Saving...'}
            {saveStatus === 'saved' && 'Saved'}
          </span>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Avatar & Name */}
        <div className="flex items-start gap-4">
          <div className="relative group">
            <Avatar
              src={character.image_url}
              name={formData.name}
              size="xl"
            />
            <button
              className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => {/* TODO: Image upload/AI generation */}}
            >
              <ImagePlus className="h-6 w-6 text-white" />
            </button>
          </div>
          <div className="flex-1 space-y-2">
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="font-semibold"
              placeholder="Character name"
            />
            <Dropdown
              options={[
                { value: 'pc', label: 'Player Character' },
                { value: 'npc', label: 'NPC' },
              ]}
              value={formData.type}
              onChange={(value) => setFormData({ ...formData, type: value as 'pc' | 'npc' })}
            />
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-[--text-primary]">Summary</label>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {/* TODO: AI expand */}}
            >
              <Wand2 className="h-3 w-3 mr-1" />
              AI Expand
            </Button>
          </div>
          <Textarea
            value={formData.summary}
            onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
            placeholder="Brief description of this character..."
            rows={3}
          />
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-[--text-primary]">Tags</label>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setIsAddTagOpen(true)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Tag
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((ct) => (
              <TagBadge
                key={ct.id}
                name={ct.tag.name}
                color={ct.tag.color}
                relatedCharacter={ct.related_character?.name}
                onRemove={() => handleRemoveTag(ct.id)}
              />
            ))}
            {tags.length === 0 && (
              <p className="text-sm text-[--text-tertiary]">No tags yet</p>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-[--text-primary]">Notes</label>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {/* TODO: AI summarize */}}
            >
              <Wand2 className="h-3 w-3 mr-1" />
              AI Summarize
            </Button>
          </div>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Detailed notes about this character..."
            rows={8}
            className="font-mono text-sm"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[--border]">
        <Button
          variant="ghost"
          className="w-full text-[--accent-danger]"
          onClick={() => setIsDeleteConfirmOpen(true)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Character
        </Button>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        title="Delete Character"
        description="Are you sure you want to delete this character? This action cannot be undone."
      >
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="ghost" onClick={() => setIsDeleteConfirmOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </Modal>

      {/* Add Tag Modal */}
      <Modal
        isOpen={isAddTagOpen}
        onClose={() => {
          setIsAddTagOpen(false)
          setIsCreatingNewTag(false)
          setNewTagForm({ name: '', color: TAG_COLORS[0], related_character_id: null })
        }}
        title="Add Tag"
      >
        <div className="space-y-4">
          {!isCreatingNewTag ? (
            <>
              {/* Existing tags */}
              {unusedTags.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[--text-primary]">Existing Tags</label>
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

              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setIsCreatingNewTag(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Tag
              </Button>
            </>
          ) : (
            <>
              {/* Create new tag form */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[--text-primary]">Tag Name</label>
                <Input
                  placeholder="e.g., Ally, Enemy, Quest Giver..."
                  value={newTagForm.name}
                  onChange={(e) => setNewTagForm({ ...newTagForm, name: e.target.value })}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[--text-primary]">Color</label>
                <div className="flex flex-wrap gap-2">
                  {TAG_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewTagForm({ ...newTagForm, color })}
                      className={cn(
                        'w-8 h-8 rounded-full transition-all',
                        newTagForm.color === color && 'ring-2 ring-offset-2 ring-offset-[--bg-surface]'
                      )}
                      style={{ backgroundColor: color, ringColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Related character (optional) */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[--text-primary]">
                  Related Character (optional)
                </label>
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
                <p className="text-xs text-[--text-tertiary]">
                  Link this tag to another character (e.g., "Friend of [Character]")
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="ghost" onClick={() => setIsCreatingNewTag(false)}>
                  Back
                </Button>
                <Button
                  onClick={handleCreateAndAddTag}
                  loading={savingTag}
                  disabled={!newTagForm.name.trim()}
                >
                  Create & Add
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}

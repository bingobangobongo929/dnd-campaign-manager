'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Trash2, Plus, User, Users, Maximize2, Minimize2, Sparkles } from 'lucide-react'
import { Input, Dropdown, Modal } from '@/components/ui'
import { TagBadge } from '@/components/ui'
import { CharacterImageUpload } from './character-image-upload'
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
    image_url: character.image_url || null,
    detail_image_url: character.detail_image_url || null,
    image_generated_with_ai: character.image_generated_with_ai || false,
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
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Update form when character changes
  useEffect(() => {
    setFormData({
      name: character.name,
      summary: character.summary || '',
      notes: character.notes || '',
      type: character.type,
      image_url: character.image_url || null,
      detail_image_url: character.detail_image_url || null,
      image_generated_with_ai: character.image_generated_with_ai || false,
    })
  }, [character.id])

  // Load available tags for campaign
  useEffect(() => {
    loadAvailableTags()
  }, [campaignId])

  // Keyboard shortcuts for fullscreen toggle and close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Shift + F to toggle fullscreen
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'f') {
        e.preventDefault()
        setIsFullscreen(prev => !prev)
      }
      // ESC: exit fullscreen first, then close modal
      if (e.key === 'Escape') {
        if (isFullscreen) {
          e.preventDefault()
          setIsFullscreen(false)
        }
        // If not fullscreen, the backdrop click handler or default behavior will close
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen])

  const loadAvailableTags = async () => {
    const { data } = await supabase
      .from('tags')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('name')

    setAvailableTags(data || [])
  }

  // Handle image update from CharacterImageUpload
  const handleImageUpdate = useCallback((avatarUrl: string | null, detailUrl: string | null, aiGenerated: boolean) => {
    setFormData(prev => ({
      ...prev,
      image_url: avatarUrl,
      detail_image_url: detailUrl,
      image_generated_with_ai: aiGenerated,
    }))
  }, [])

  // Auto-save functionality
  const saveCharacter = useCallback(async () => {
    const { data } = await supabase
      .from('characters')
      .update({
        name: formData.name,
        summary: formData.summary || null,
        notes: formData.notes || null,
        type: formData.type,
        image_url: formData.image_url || null,
        detail_image_url: formData.detail_image_url || null,
        image_generated_with_ai: formData.image_generated_with_ai,
      })
      .eq('id', character.id)
      .select()
      .single()

    if (data) {
      onUpdate(data)
    }
  }, [formData, character.id, supabase, onUpdate])

  const { status } = useAutoSave({
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

    setNewTagForm({ name: '', color: TAG_COLORS[0].value, related_character_id: null })
    setIsAddTagOpen(false)
    setSavingTag(false)
    onTagsChange()
  }

  const handleCreateAndAddTag = async () => {
    if (!newTagForm.name.trim()) return

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
    await supabase
      .from('character_tags')
      .delete()
      .eq('id', characterTagId)

    onTagsChange()
  }

  const otherCharacters = allCharacters.filter(c => c.id !== character.id)
  const unusedTags = availableTags.filter(t => !tags.some(ct => ct.tag_id === t.id))

  // Handle backdrop click - don't close if in fullscreen
  const handleBackdropClick = useCallback(() => {
    if (isFullscreen) {
      setIsFullscreen(false)
    } else {
      onClose()
    }
  }, [isFullscreen, onClose])

  return (
    <>
      {/* Main Character Modal */}
      <div className="modal-backdrop" onClick={handleBackdropClick}>
        <div
          className={cn(
            'character-modal',
            isFullscreen && 'character-modal-fullscreen'
          )}
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
                <h2 className="modal-title">{formData.name || 'Edit Character'}</h2>
                <p className="text-xs text-[--text-tertiary]">
                  {status === 'saving' ? 'Saving...' : status === 'saved' ? 'All changes saved' : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                className="btn-ghost btn-icon w-9 h-9"
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen (Ctrl+Shift+F)'}
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
              <button className="btn-ghost btn-icon w-9 h-9" onClick={onClose}>
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className={cn(
            'character-modal-body',
            isFullscreen && 'character-modal-body-fullscreen'
          )}>
            {isFullscreen ? (
              /* Fullscreen 3-column layout */
              <>
                {/* Left Column: Character Info */}
                <div className="character-modal-left">
                  <CharacterImageUpload
                    characterId={character.id}
                    characterName={formData.name}
                    characterType={formData.type}
                    characterDescription={formData.notes}
                    characterSummary={formData.summary}
                    avatarUrl={formData.image_url}
                    detailUrl={formData.detail_image_url}
                    onUpdate={handleImageUpdate}
                    size="xl"
                  />

                  <div className="form-group">
                    <label className="form-label">Character Name</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter character name"
                      className="form-input"
                    />
                  </div>

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
                    <div className="flex flex-wrap gap-2 mb-2">
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
                    <button
                      className="btn btn-secondary w-full justify-start"
                      onClick={() => setIsAddTagOpen(true)}
                    >
                      <Plus className="w-4 h-4" />
                      Add Tag
                    </button>
                  </div>
                </div>

                {/* Center Column: Main Content */}
                <div className="character-modal-center">
                  <div className="form-group">
                    <label className="form-label">Summary</label>
                    <textarea
                      value={formData.summary}
                      onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                      placeholder="Brief description of this character..."
                      rows={3}
                      className="form-textarea"
                    />
                  </div>

                  <div className="form-group flex-1 flex flex-col min-h-0">
                    <label className="form-label">Notes</label>
                    <div className="flex-1">
                      <RichTextEditor
                        content={formData.notes}
                        onChange={(content) => setFormData({ ...formData, notes: content })}
                        placeholder="Add detailed notes about this character..."
                        className="h-full"
                        enableAI
                        aiContext={`Character: ${formData.name}, Type: ${formData.type}, Summary: ${formData.summary}`}
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column: AI & Relationships */}
                <div className="character-modal-right">
                  <div className="form-group">
                    <label className="form-label flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[--arcane-gold]" />
                      AI Features
                    </label>
                    <p className="text-xs text-[--text-tertiary] mb-3">
                      Use the Generate button below the avatar to create AI portraits.
                      The notes editor has AI expand tools in its toolbar.
                    </p>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Relationships</label>
                    <div className="space-y-2">
                      {tags.filter(t => t.related_character).map((ct) => (
                        <div
                          key={ct.id}
                          className="flex items-center gap-2 p-2 rounded-lg bg-[--bg-hover]"
                        >
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: ct.tag.color }}
                          />
                          <span className="text-sm text-[--text-secondary]">
                            {ct.tag.name} of
                          </span>
                          <span className="text-sm font-medium text-[--text-primary]">
                            {ct.related_character?.name}
                          </span>
                        </div>
                      ))}
                      {tags.filter(t => t.related_character).length === 0 && (
                        <p className="text-sm text-[--text-tertiary]">
                          No relationships yet. Add tags with related characters.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* Standard layout */
              <>
                {/* Top Section: Avatar + Basic Info */}
                <div className="character-modal-top">
                  <CharacterImageUpload
                    characterId={character.id}
                    characterName={formData.name}
                    characterType={formData.type}
                    characterDescription={formData.notes}
                    characterSummary={formData.summary}
                    avatarUrl={formData.image_url}
                    detailUrl={formData.detail_image_url}
                    onUpdate={handleImageUpdate}
                    size="xl"
                  />

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
                      enableAI
                      aiContext={`Character: ${formData.name}, Type: ${formData.type}, Summary: ${formData.summary}`}
                    />
                  </div>
                </div>
              </>
            )}
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

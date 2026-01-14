'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Trash2, Plus, User, Users, Maximize2, Minimize2, Sparkles, Eye, EyeOff, ChevronDown, Shield } from 'lucide-react'
import { Input, Dropdown, Modal } from '@/components/ui'
import { TagBadge } from '@/components/ui'
import { CharacterImageUpload } from './character-image-upload'
import { RichTextEditor } from '@/components/editor/rich-text-editor'
import { useSupabase } from '@/hooks'
import { useAutoSave } from '@/hooks'
import { cn, TAG_COLORS } from '@/lib/utils'
import type { Character, Tag, CharacterTag } from '@/types/database'

interface CharacterModalProps {
  character?: Character | null
  tags: (CharacterTag & { tag: Tag; related_character?: Character | null })[]
  allCharacters: Character[]
  campaignId: string
  onUpdate: (character: Character) => void
  onCreate?: (character: Character) => void
  onDelete: (id: string) => void
  onClose: () => void
  onTagsChange: () => void
}

// Status presets
const STATUS_OPTIONS = [
  { value: 'alive', label: 'Alive', color: '#10B981' },
  { value: 'dead', label: 'Dead', color: '#EF4444' },
  { value: 'missing', label: 'Missing', color: '#F59E0B' },
  { value: 'unknown', label: 'Unknown', color: '#6B7280' },
  { value: 'captured', label: 'Captured', color: '#F97316' },
  { value: 'turned', label: 'Turned', color: '#8B5CF6' },
]

export function CharacterModal({
  character,
  tags,
  allCharacters,
  campaignId,
  onUpdate,
  onCreate,
  onDelete,
  onClose,
  onTagsChange,
}: CharacterModalProps) {
  const supabase = useSupabase()
  const isCreateMode = !character
  const [createdCharacterId, setCreatedCharacterId] = useState<string | null>(null)

  // Form data with all new fields
  const [formData, setFormData] = useState({
    name: character?.name || '',
    summary: character?.summary || '',
    notes: character?.notes || '',
    type: character?.type || 'npc' as 'pc' | 'npc',
    image_url: character?.image_url || null,
    detail_image_url: character?.detail_image_url || null,
    image_generated_with_ai: character?.image_generated_with_ai || false,
    // Status
    status: character?.status || 'alive',
    status_color: character?.status_color || '#10B981',
    // PC fields
    race: character?.race || '',
    class: character?.class || '',
    age: character?.age || null as number | null,
    background: character?.background || '',
    appearance: character?.appearance || '',
    personality: character?.personality || '',
    goals: character?.goals || '',
    secrets: character?.secrets || '',
    // NPC fields
    role: character?.role || '',
    // List fields
    important_people: (character?.important_people as string[] | null) || [] as string[],
    story_hooks: (character?.story_hooks as string[] | null) || [] as string[],
    quotes: (character?.quotes as string[] | null) || [] as string[],
  })

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [isAddTagOpen, setIsAddTagOpen] = useState(false)
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [newTagForm, setNewTagForm] = useState({
    name: '',
    color: TAG_COLORS[0].value as string,
    related_character_id: null as string | null,
    category: 'general' as 'general' | 'faction' | 'relationship',
  })
  const [savingTag, setSavingTag] = useState(false)
  const [isCreatingNewTag, setIsCreatingNewTag] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showSecrets, setShowSecrets] = useState(false)
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)

  // New field input states
  const [newHook, setNewHook] = useState('')
  const [newQuote, setNewQuote] = useState('')
  const [newPerson, setNewPerson] = useState('')

  // Update form when character changes
  useEffect(() => {
    if (character) {
      setFormData({
        name: character.name,
        summary: character.summary || '',
        notes: character.notes || '',
        type: character.type,
        image_url: character.image_url || null,
        detail_image_url: character.detail_image_url || null,
        image_generated_with_ai: character.image_generated_with_ai || false,
        status: character.status || 'alive',
        status_color: character.status_color || '#10B981',
        race: character.race || '',
        class: character.class || '',
        age: character.age || null,
        background: character.background || '',
        appearance: character.appearance || '',
        personality: character.personality || '',
        goals: character.goals || '',
        secrets: character.secrets || '',
        role: character.role || '',
        important_people: (character.important_people as string[] | null) || [],
        story_hooks: (character.story_hooks as string[] | null) || [],
        quotes: (character.quotes as string[] | null) || [],
      })
    }
  }, [character?.id])

  // Load available tags for campaign
  useEffect(() => {
    loadAvailableTags()
  }, [campaignId])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'f') {
        e.preventDefault()
        setIsFullscreen(prev => !prev)
      }
      if (e.key === 'Escape') {
        if (isFullscreen) {
          e.preventDefault()
          setIsFullscreen(false)
        }
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
    if (isCreateMode && !createdCharacterId) {
      if (!formData.name.trim()) return

      const { data } = await supabase
        .from('characters')
        .insert({
          campaign_id: campaignId,
          name: formData.name,
          summary: formData.summary || null,
          notes: formData.notes || null,
          type: formData.type,
          image_url: formData.image_url || null,
          detail_image_url: formData.detail_image_url || null,
          image_generated_with_ai: formData.image_generated_with_ai,
          status: formData.status,
          status_color: formData.status_color,
          race: formData.race || null,
          class: formData.class || null,
          age: formData.age || null,
          background: formData.background || null,
          appearance: formData.appearance || null,
          personality: formData.personality || null,
          goals: formData.goals || null,
          secrets: formData.secrets || null,
          role: formData.role || null,
          important_people: formData.important_people.length > 0 ? formData.important_people : null,
          story_hooks: formData.story_hooks.length > 0 ? formData.story_hooks : null,
          quotes: formData.quotes.length > 0 ? formData.quotes : null,
          position_x: 100,
          position_y: 100,
        })
        .select()
        .single()

      if (data) {
        setCreatedCharacterId(data.id)
        onCreate?.(data)
      }
      return
    }

    const characterId = createdCharacterId || character?.id
    if (!characterId) return

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
        status: formData.status,
        status_color: formData.status_color,
        race: formData.race || null,
        class: formData.class || null,
        age: formData.age || null,
        background: formData.background || null,
        appearance: formData.appearance || null,
        personality: formData.personality || null,
        goals: formData.goals || null,
        secrets: formData.secrets || null,
        role: formData.role || null,
        important_people: formData.important_people.length > 0 ? formData.important_people : null,
        story_hooks: formData.story_hooks.length > 0 ? formData.story_hooks : null,
        quotes: formData.quotes.length > 0 ? formData.quotes : null,
      })
      .eq('id', characterId)
      .select()
      .single()

    if (data) {
      onUpdate(data)
    }
  }, [formData, character?.id, createdCharacterId, isCreateMode, campaignId, supabase, onUpdate, onCreate])

  const { status: saveStatus } = useAutoSave({
    data: formData,
    onSave: saveCharacter,
    delay: 1000,
  })

  const handleDelete = async () => {
    const characterId = createdCharacterId || character?.id
    if (!characterId) return
    await supabase.from('characters').delete().eq('id', characterId)
    onDelete(characterId)
    setIsDeleteConfirmOpen(false)
  }

  const handleAddExistingTag = async (tagId: string) => {
    const characterId = createdCharacterId || character?.id
    if (!characterId) return
    setSavingTag(true)
    await supabase.from('character_tags').insert({
      character_id: characterId,
      tag_id: tagId,
      related_character_id: newTagForm.related_character_id,
    })
    setNewTagForm({ name: '', color: TAG_COLORS[0].value, related_character_id: null, category: 'general' })
    setIsAddTagOpen(false)
    setSavingTag(false)
    onTagsChange()
  }

  const handleCreateAndAddTag = async () => {
    const characterId = createdCharacterId || character?.id
    if (!newTagForm.name.trim() || !characterId) return
    setSavingTag(true)

    const { data: tag } = await supabase
      .from('tags')
      .insert({
        campaign_id: campaignId,
        name: newTagForm.name,
        color: newTagForm.color,
        category: newTagForm.category,
      })
      .select()
      .single()

    if (tag) {
      await supabase.from('character_tags').insert({
        character_id: characterId,
        tag_id: tag.id,
        related_character_id: newTagForm.related_character_id,
      })
      setAvailableTags([...availableTags, tag])
    }

    setNewTagForm({ name: '', color: TAG_COLORS[0].value, related_character_id: null, category: 'general' })
    setIsAddTagOpen(false)
    setIsCreatingNewTag(false)
    setSavingTag(false)
    onTagsChange()
  }

  const handleRemoveTag = async (characterTagId: string) => {
    await supabase.from('character_tags').delete().eq('id', characterTagId)
    onTagsChange()
  }

  // List field handlers
  const addListItem = (field: 'story_hooks' | 'quotes' | 'important_people', value: string, setter: (v: string) => void) => {
    if (!value.trim()) return
    setFormData(prev => ({
      ...prev,
      [field]: [...(prev[field] || []), value.trim()]
    }))
    setter('')
  }

  const removeListItem = (field: 'story_hooks' | 'quotes' | 'important_people', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }))
  }

  const handleStatusChange = (statusValue: string) => {
    const statusOption = STATUS_OPTIONS.find(s => s.value === statusValue)
    setFormData(prev => ({
      ...prev,
      status: statusValue,
      status_color: statusOption?.color || '#6B7280'
    }))
    setStatusDropdownOpen(false)
  }

  const currentCharacterId = createdCharacterId || character?.id
  const otherCharacters = allCharacters.filter(c => c.id !== currentCharacterId)
  const unusedTags = availableTags.filter(t => !tags.some(ct => ct.tag_id === t.id))
  const factionTags = unusedTags.filter(t => (t as any).category === 'faction')
  const generalTags = unusedTags.filter(t => (t as any).category !== 'faction')

  const handleBackdropClick = useCallback(() => {
    if (isFullscreen) {
      setIsFullscreen(false)
    } else {
      onClose()
    }
  }, [isFullscreen, onClose])

  const currentStatus = STATUS_OPTIONS.find(s => s.value === formData.status) || STATUS_OPTIONS[0]

  // PC-specific form sections
  const renderPCFields = () => (
    <>
      {/* Identity Section */}
      <div className="space-y-4 p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
        <h3 className="text-sm font-semibold text-[--text-secondary] uppercase tracking-wider">Identity</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="form-group">
            <label className="form-label">Race</label>
            <Input
              value={formData.race}
              onChange={(e) => setFormData({ ...formData, race: e.target.value })}
              placeholder="e.g., Human, Elf, Tiefling..."
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Class</label>
            <Input
              value={formData.class}
              onChange={(e) => setFormData({ ...formData, class: e.target.value })}
              placeholder="e.g., Paladin, Warlock..."
              className="form-input"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="form-group">
            <label className="form-label">Age</label>
            <Input
              type="number"
              value={formData.age || ''}
              onChange={(e) => setFormData({ ...formData, age: e.target.value ? parseInt(e.target.value) : null })}
              placeholder="Age"
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Background</label>
            <Input
              value={formData.background}
              onChange={(e) => setFormData({ ...formData, background: e.target.value })}
              placeholder="e.g., Noble, Soldier..."
              className="form-input"
            />
          </div>
        </div>
      </div>

      {/* Appearance & Personality */}
      <div className="space-y-4 p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
        <h3 className="text-sm font-semibold text-[--text-secondary] uppercase tracking-wider">Character Details</h3>
        <div className="form-group">
          <label className="form-label">Appearance</label>
          <textarea
            value={formData.appearance}
            onChange={(e) => setFormData({ ...formData, appearance: e.target.value })}
            placeholder="Physical description, notable features, clothing..."
            rows={3}
            className="form-textarea"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Personality</label>
          <textarea
            value={formData.personality}
            onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
            placeholder="Traits, quirks, how they act around others..."
            rows={3}
            className="form-textarea"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Goals & Motivations</label>
          <textarea
            value={formData.goals}
            onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
            placeholder="What drives this character? What do they want?"
            rows={2}
            className="form-textarea"
          />
        </div>
      </div>

      {/* Important People */}
      <div className="space-y-4 p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
        <h3 className="text-sm font-semibold text-[--text-secondary] uppercase tracking-wider">Important People</h3>
        <div className="space-y-2">
          {formData.important_people.map((person, i) => (
            <div key={i} className="flex items-center gap-2 p-2 bg-white/[0.03] rounded-lg">
              <span className="flex-1 text-sm text-[--text-primary]">{person}</span>
              <button onClick={() => removeListItem('important_people', i)} className="text-[--text-tertiary] hover:text-[--arcane-ember]">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newPerson}
            onChange={(e) => setNewPerson(e.target.value)}
            placeholder="e.g., Darketh (mentor), Crystal (enemy)..."
            className="form-input flex-1"
            onKeyDown={(e) => e.key === 'Enter' && addListItem('important_people', newPerson, setNewPerson)}
          />
          <button className="btn btn-secondary" onClick={() => addListItem('important_people', newPerson, setNewPerson)}>
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Story Hooks */}
      <div className="space-y-4 p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
        <h3 className="text-sm font-semibold text-[--text-secondary] uppercase tracking-wider">Story Hooks</h3>
        <div className="space-y-2">
          {formData.story_hooks.map((hook, i) => (
            <div key={i} className="flex items-start gap-2 p-2 bg-white/[0.03] rounded-lg">
              <span className="flex-1 text-sm text-[--text-primary]">{hook}</span>
              <button onClick={() => removeListItem('story_hooks', i)} className="text-[--text-tertiary] hover:text-[--arcane-ember]">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newHook}
            onChange={(e) => setNewHook(e.target.value)}
            placeholder="Plot hooks the DM can use..."
            className="form-input flex-1"
            onKeyDown={(e) => e.key === 'Enter' && addListItem('story_hooks', newHook, setNewHook)}
          />
          <button className="btn btn-secondary" onClick={() => addListItem('story_hooks', newHook, setNewHook)}>
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quotes */}
      <div className="space-y-4 p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
        <h3 className="text-sm font-semibold text-[--text-secondary] uppercase tracking-wider">Quotes & Catchphrases</h3>
        <div className="space-y-2">
          {formData.quotes.map((quote, i) => (
            <div key={i} className="flex items-start gap-2 p-2 bg-white/[0.03] rounded-lg">
              <span className="flex-1 text-sm text-[--text-primary] italic">"{quote}"</span>
              <button onClick={() => removeListItem('quotes', i)} className="text-[--text-tertiary] hover:text-[--arcane-ember]">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newQuote}
            onChange={(e) => setNewQuote(e.target.value)}
            placeholder="Memorable quotes..."
            className="form-input flex-1"
            onKeyDown={(e) => e.key === 'Enter' && addListItem('quotes', newQuote, setNewQuote)}
          />
          <button className="btn btn-secondary" onClick={() => addListItem('quotes', newQuote, setNewQuote)}>
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  )

  // NPC-specific form sections
  const renderNPCFields = () => (
    <>
      {/* Quick Info */}
      <div className="space-y-4 p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
        <h3 className="text-sm font-semibold text-[--text-secondary] uppercase tracking-wider">Quick Info</h3>
        <div className="form-group">
          <label className="form-label">Role</label>
          <Input
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            placeholder="e.g., Teacher, Merchant, Villain..."
            className="form-input"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="form-group">
            <label className="form-label">Race</label>
            <Input
              value={formData.race}
              onChange={(e) => setFormData({ ...formData, race: e.target.value })}
              placeholder="e.g., Human, Goliath..."
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Class/Profession</label>
            <Input
              value={formData.class}
              onChange={(e) => setFormData({ ...formData, class: e.target.value })}
              placeholder="e.g., Wizard, Innkeeper..."
              className="form-input"
            />
          </div>
        </div>
      </div>

      {/* At a Glance */}
      <div className="space-y-4 p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
        <h3 className="text-sm font-semibold text-[--text-secondary] uppercase tracking-wider">At a Glance</h3>
        <div className="form-group">
          <label className="form-label">Appearance</label>
          <textarea
            value={formData.appearance}
            onChange={(e) => setFormData({ ...formData, appearance: e.target.value })}
            placeholder="Brief physical description..."
            rows={2}
            className="form-textarea"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Personality</label>
          <textarea
            value={formData.personality}
            onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
            placeholder="How do they act? Key traits..."
            rows={2}
            className="form-textarea"
          />
        </div>
      </div>
    </>
  )

  // Secrets section (shared but with toggle)
  const renderSecretsSection = () => (
    <div className="space-y-4 p-4 bg-[--arcane-ember]/5 rounded-xl border border-[--arcane-ember]/20">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[--arcane-ember] uppercase tracking-wider flex items-center gap-2">
          <EyeOff className="w-4 h-4" />
          Secrets (DM Only)
        </h3>
        <button
          onClick={() => setShowSecrets(!showSecrets)}
          className="flex items-center gap-1 text-xs text-[--text-tertiary] hover:text-[--text-secondary]"
        >
          {showSecrets ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {showSecrets ? 'Hide' : 'Show'}
        </button>
      </div>
      {showSecrets && (
        <textarea
          value={formData.secrets}
          onChange={(e) => setFormData({ ...formData, secrets: e.target.value })}
          placeholder="Hidden information players don't know yet..."
          rows={3}
          className="form-textarea"
        />
      )}
    </div>
  )

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
                formData.type === 'pc'
                  ? "bg-[--arcane-purple]/20 text-[--arcane-purple]"
                  : "bg-[--arcane-gold]/20 text-[--arcane-gold]"
              )}>
                {formData.type === 'pc' ? <User className="w-5 h-5" /> : <Users className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="modal-title">{formData.name || (isCreateMode ? 'New Character' : 'Edit Character')}</h2>
                <p className="text-xs text-[--text-tertiary]">
                  {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'All changes saved' : isCreateMode && !createdCharacterId ? 'Enter a name to start' : ''}
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
              /* Fullscreen layout */
              <>
                {/* Left Column: Image + Basic Info */}
                <div className="character-modal-left">
                  <CharacterImageUpload
                    characterId={currentCharacterId || 'new'}
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
                    <label className="form-label">Name</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Character name"
                      className="form-input"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="form-group">
                      <label className="form-label">Type</label>
                      <Dropdown
                        options={[
                          { value: 'pc', label: 'PC' },
                          { value: 'npc', label: 'NPC' },
                        ]}
                        value={formData.type}
                        onChange={(value) => setFormData({ ...formData, type: value as 'pc' | 'npc' })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Status</label>
                      <div className="relative">
                        <button
                          onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                          className="w-full flex items-center gap-2 px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm"
                        >
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: currentStatus.color }} />
                          <span className="flex-1 text-left">{currentStatus.label}</span>
                          <ChevronDown className="w-4 h-4 text-[--text-tertiary]" />
                        </button>
                        {statusDropdownOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-[--bg-surface] border border-white/[0.08] rounded-lg shadow-xl z-50 py-1">
                            {STATUS_OPTIONS.map(s => (
                              <button
                                key={s.value}
                                onClick={() => handleStatusChange(s.value)}
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/[0.05] text-sm"
                              >
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                                <span>{s.label}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
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
                          isFaction={(ct.tag as any).category === 'faction'}
                        />
                      ))}
                    </div>
                    <button className="btn btn-secondary w-full justify-start" onClick={() => setIsAddTagOpen(true)}>
                      <Plus className="w-4 h-4" />
                      Add Tag
                    </button>
                  </div>
                </div>

                {/* Center Column: Main Content */}
                <div className="character-modal-center space-y-4 overflow-y-auto">
                  <div className="form-group">
                    <label className="form-label">Summary</label>
                    <textarea
                      value={formData.summary}
                      onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                      placeholder="Brief description..."
                      rows={2}
                      className="form-textarea"
                    />
                  </div>

                  {/* Type-specific fields */}
                  {formData.type === 'pc' ? renderPCFields() : renderNPCFields()}

                  {/* Secrets section */}
                  {renderSecretsSection()}
                </div>

                {/* Right Column: Notes */}
                <div className="character-modal-right flex flex-col">
                  <div className="form-group flex-1 flex flex-col min-h-0">
                    <label className="form-label">Notes</label>
                    <div className="flex-1">
                      <RichTextEditor
                        content={formData.notes}
                        onChange={(content) => setFormData({ ...formData, notes: content })}
                        placeholder="Detailed notes, backstory, lore..."
                        className="h-full"
                        enableAI
                        aiContext={`Character: ${formData.name}, Type: ${formData.type}, Summary: ${formData.summary}`}
                      />
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
                    characterId={currentCharacterId || 'new'}
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
                    <div className="grid grid-cols-3 gap-3">
                      <div className="form-group">
                        <label className="form-label">Type</label>
                        <Dropdown
                          options={[
                            { value: 'pc', label: 'PC' },
                            { value: 'npc', label: 'NPC' },
                          ]}
                          value={formData.type}
                          onChange={(value) => setFormData({ ...formData, type: value as 'pc' | 'npc' })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Status</label>
                        <div className="relative">
                          <button
                            onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                            className="w-full flex items-center gap-2 px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm"
                          >
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: currentStatus.color }} />
                            <span className="flex-1 text-left truncate">{currentStatus.label}</span>
                            <ChevronDown className="w-4 h-4 text-[--text-tertiary]" />
                          </button>
                          {statusDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-[--bg-surface] border border-white/[0.08] rounded-lg shadow-xl z-50 py-1">
                              {STATUS_OPTIONS.map(s => (
                                <button
                                  key={s.value}
                                  onClick={() => handleStatusChange(s.value)}
                                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/[0.05] text-sm"
                                >
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                                  <span>{s.label}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Tags</label>
                        <button className="btn btn-secondary w-full justify-start" onClick={() => setIsAddTagOpen(true)}>
                          <Plus className="w-4 h-4" />
                          Add
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
                        isFaction={(ct.tag as any).category === 'faction'}
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
                    placeholder="Brief description of this character..."
                    rows={2}
                    className="form-textarea"
                  />
                </div>

                {/* Type-specific fields */}
                {formData.type === 'pc' ? renderPCFields() : renderNPCFields()}

                {/* Secrets */}
                {renderSecretsSection()}

                {/* Notes */}
                <div className="form-group flex-1 flex flex-col min-h-0">
                  <label className="form-label">Notes</label>
                  <div className="flex-1 min-h-[200px]">
                    <RichTextEditor
                      content={formData.notes}
                      onChange={(content) => setFormData({ ...formData, notes: content })}
                      placeholder="Add detailed notes..."
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
            {currentCharacterId ? (
              <button className="btn btn-ghost text-[--arcane-ember]" onClick={() => setIsDeleteConfirmOpen(true)}>
                <Trash2 className="w-4 h-4" />
                Delete Character
              </button>
            ) : (
              <div />
            )}
            <button className="btn btn-primary" onClick={onClose}>Done</button>
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
          <button className="btn btn-secondary" onClick={() => setIsDeleteConfirmOpen(false)}>Cancel</button>
          <button className="btn bg-[--arcane-ember] hover:bg-[--arcane-ember]/80 text-white" onClick={handleDelete}>Delete</button>
        </div>
      </Modal>

      {/* Add Tag Modal */}
      <Modal
        isOpen={isAddTagOpen}
        onClose={() => {
          setIsAddTagOpen(false)
          setIsCreatingNewTag(false)
          setNewTagForm({ name: '', color: TAG_COLORS[0].value, related_character_id: null, category: 'general' })
        }}
        title="Add Tag"
      >
        <div className="space-y-4">
          {!isCreatingNewTag ? (
            <>
              {/* Faction Tags */}
              {factionTags.length > 0 && (
                <div className="space-y-2">
                  <label className="form-label flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[--arcane-gold]" />
                    Factions
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {factionTags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => handleAddExistingTag(tag.id)}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-105 flex items-center gap-1.5"
                        style={{
                          backgroundColor: `${tag.color}20`,
                          color: tag.color,
                          border: `1px solid ${tag.color}40`,
                        }}
                      >
                        <Shield className="w-3 h-3" />
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* General Tags */}
              {generalTags.length > 0 && (
                <div className="space-y-2">
                  <label className="form-label">Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {generalTags.map((tag) => (
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

              <button className="btn btn-secondary w-full" onClick={() => setIsCreatingNewTag(true)}>
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
                <label className="form-label">Category</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setNewTagForm({ ...newTagForm, category: 'general' })}
                    className={cn(
                      'flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors',
                      newTagForm.category === 'general'
                        ? 'bg-[--arcane-purple]/20 border-[--arcane-purple] text-[--arcane-purple]'
                        : 'bg-white/[0.03] border-white/[0.08] text-[--text-secondary] hover:bg-white/[0.05]'
                    )}
                  >
                    General
                  </button>
                  <button
                    onClick={() => setNewTagForm({ ...newTagForm, category: 'faction' })}
                    className={cn(
                      'flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center justify-center gap-1.5',
                      newTagForm.category === 'faction'
                        ? 'bg-[--arcane-gold]/20 border-[--arcane-gold] text-[--arcane-gold]'
                        : 'bg-white/[0.03] border-white/[0.08] text-[--text-secondary] hover:bg-white/[0.05]'
                    )}
                  >
                    <Shield className="w-4 h-4" />
                    Faction
                  </button>
                </div>
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
                  onChange={(value) => setNewTagForm({ ...newTagForm, related_character_id: value || null })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button className="btn btn-secondary" onClick={() => setIsCreatingNewTag(false)}>Back</button>
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

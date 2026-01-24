'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Trash2, Plus, User, Users, Maximize2, Minimize2, Eye, EyeOff, ChevronDown } from 'lucide-react'
import { Input, Modal } from '@/components/ui'
import { CharacterImageUpload } from './character-image-upload'
import { RelationshipEditor } from './RelationshipEditor'
import { FactionMembershipEditor } from './FactionMembershipEditor'
import { LabelsEditor } from './LabelsEditor'
import { RichTextEditor } from '@/components/editor/rich-text-editor'
import { DmNotesSection, type VisibilityLevel } from '@/components/dm-notes'
import { CharacterClaiming } from '@/components/campaign'
import { useSupabase, useUser } from '@/hooks'
import { useAutoSave } from '@/hooks'
import { cn } from '@/lib/utils'
import type { Character, Tag, CharacterTag, Json, VaultCharacter } from '@/types/database'

// Helper to safely convert JSONB field to string array
// Handles: null, string[], object[] (converts to readable strings), or any other format
function toStringArray(value: Json | null | undefined): string[] {
  if (!value) return []
  if (!Array.isArray(value)) return []

  return value.map(item => {
    if (typeof item === 'string') return item
    if (typeof item === 'object' && item !== null) {
      // Handle important_people format: { name, relationship, notes }
      const obj = item as Record<string, unknown>
      if ('name' in obj && 'relationship' in obj) {
        const name = obj.name || ''
        const rel = obj.relationship || ''
        const notes = obj.notes ? ` - ${obj.notes}` : ''
        return `${name} (${rel})${notes}`
      }
      // Handle story_hook format: { hook, ... } or similar objects
      if ('hook' in obj) return String(obj.hook)
      // Fallback: stringify the object
      return JSON.stringify(item)
    }
    return String(item)
  }).filter(Boolean)
}

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
  const { user } = useUser()
  const isCreateMode = !character
  const [createdCharacterId, setCreatedCharacterId] = useState<string | null>(null)

  // Character claiming state
  const [userVaultCharacters, setUserVaultCharacters] = useState<Pick<VaultCharacter, 'id' | 'name' | 'image_url'>[]>([])
  const [characterClaimed, setCharacterClaimed] = useState(false)

  // Check if this character is designated for the current user
  const isDesignatedForUser = !!(
    character &&
    user &&
    (character.controlled_by_user_id === user.id ||
     (character.controlled_by_email && character.controlled_by_email.toLowerCase() === user.email?.toLowerCase()))
  )

  // Check if character is claimable (PC, not already claimed, designated for user)
  const isClaimable = !!(
    character &&
    character.type === 'pc' &&
    !character.vault_character_id &&
    !characterClaimed &&
    isDesignatedForUser
  )

  // Fetch user's vault characters for linking
  useEffect(() => {
    if (user && isDesignatedForUser && !character?.vault_character_id) {
      supabase
        .from('vault_characters')
        .select('id, name, image_url')
        .eq('user_id', user.id)
        .then(({ data }) => {
          setUserVaultCharacters(data || [])
        })
    }
  }, [user, isDesignatedForUser, character?.vault_character_id, supabase])

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
    // New fields: backstory and motivations (rich text)
    backstory: character?.backstory || '',
    motivations: character?.motivations || '',
    // NPC fields
    role: character?.role || '',
    // List fields - use safe converter for JSONB data
    important_people: toStringArray(character?.important_people),
    story_hooks: toStringArray(character?.story_hooks),
    quotes: toStringArray(character?.quotes),
    // DM Notes & Visibility
    dm_notes: character?.dm_notes || '',
    visibility: (character?.visibility || 'public') as VisibilityLevel,
  })

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
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
        backstory: character.backstory || '',
        motivations: character.motivations || '',
        role: character.role || '',
        important_people: toStringArray(character.important_people),
        story_hooks: toStringArray(character.story_hooks),
        quotes: toStringArray(character.quotes),
        dm_notes: character.dm_notes || '',
        visibility: (character.visibility || 'public') as VisibilityLevel,
      })
    }
  }, [character?.id])

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
          backstory: formData.backstory || null,
          motivations: formData.motivations || null,
          role: formData.role || null,
          important_people: formData.important_people.length > 0 ? formData.important_people : null,
          story_hooks: formData.story_hooks.length > 0 ? formData.story_hooks : null,
          quotes: formData.quotes.length > 0 ? formData.quotes : null,
          dm_notes: formData.dm_notes || null,
          visibility: formData.visibility,
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
        backstory: formData.backstory || null,
        motivations: formData.motivations || null,
        role: formData.role || null,
        important_people: formData.important_people.length > 0 ? formData.important_people : null,
        story_hooks: formData.story_hooks.length > 0 ? formData.story_hooks : null,
        quotes: formData.quotes.length > 0 ? formData.quotes : null,
        dm_notes: formData.dm_notes || null,
        visibility: formData.visibility,
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
    showToast: true,
    toastMessage: 'Character saved',
  })

  const handleDelete = async () => {
    const characterId = createdCharacterId || character?.id
    if (!characterId) return
    await supabase.from('characters').delete().eq('id', characterId)
    onDelete(characterId)
    setIsDeleteConfirmOpen(false)
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
          <label className="form-label">Goals</label>
          <textarea
            value={formData.goals}
            onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
            placeholder="What does this character want to achieve?"
            rows={2}
            className="form-textarea"
          />
        </div>
      </div>

      {/* Backstory & Motivations */}
      <div className="space-y-4 p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
        <h3 className="text-sm font-semibold text-[--text-secondary] uppercase tracking-wider">Backstory & Motivations</h3>
        <div className="form-group">
          <label className="form-label">Backstory</label>
          <p className="text-xs text-[--text-tertiary] mb-2">The character's history before the campaign began. This informs roleplay and feeds into Campaign Intelligence suggestions.</p>
          <RichTextEditor
            content={formData.backstory}
            onChange={(content) => setFormData({ ...formData, backstory: content })}
            placeholder="Write the character's backstory... Their origins, key life events, what shaped them into who they are today."
            minHeight={150}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Motivations</label>
          <p className="text-xs text-[--text-tertiary] mb-2">What drives this character? Their deepest desires, fears, and the "why" behind their actions.</p>
          <RichTextEditor
            content={formData.motivations}
            onChange={(content) => setFormData({ ...formData, motivations: content })}
            placeholder="What truly motivates this character? Their inner drives, unspoken desires, what they would sacrifice anything for..."
            minHeight={100}
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

  // DM Notes section with visibility controls
  const renderDmNotesSection = () => (
    <div className="space-y-4">
      {/* Secrets field (legacy, simpler) */}
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

      {/* DM Notes with full visibility controls */}
      <DmNotesSection
        dmNotes={formData.dm_notes}
        onDmNotesChange={(notes) => setFormData({ ...formData, dm_notes: notes })}
        visibility={formData.visibility}
        onVisibilityChange={(vis) => setFormData({ ...formData, visibility: vis })}
        showVisibilityToggle={true}
        collapsed={!formData.dm_notes}
      />
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

                  {/* PC / NPC Toggle - Prominent */}
                  <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                    <label className="form-label mb-2">Character Type</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setFormData({ ...formData, type: 'pc' })}
                        className={cn(
                          "flex-1 flex flex-col items-center gap-1 py-2 px-3 rounded-lg font-medium transition-all",
                          formData.type === 'pc'
                            ? "bg-purple-500/20 text-purple-300 border-2 border-purple-500/50"
                            : "bg-white/[0.02] text-gray-400 border border-white/[0.08] hover:bg-white/[0.05]"
                        )}
                      >
                        <User className="w-4 h-4" />
                        <span className="text-xs">PC</span>
                      </button>
                      <button
                        onClick={() => setFormData({ ...formData, type: 'npc' })}
                        className={cn(
                          "flex-1 flex flex-col items-center gap-1 py-2 px-3 rounded-lg font-medium transition-all",
                          formData.type === 'npc'
                            ? "bg-amber-500/20 text-amber-300 border-2 border-amber-500/50"
                            : "bg-white/[0.02] text-gray-400 border border-white/[0.08] hover:bg-white/[0.05]"
                        )}
                      >
                        <Users className="w-4 h-4" />
                        <span className="text-xs">NPC</span>
                      </button>
                    </div>
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
                          <div className="absolute top-full left-0 right-0 mt-1 bg-[#12121a] border border-white/[0.08] rounded-lg shadow-2xl z-50 py-1">
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

                  {/* Tags & Connections - All three editors */}
                  {!isCreateMode && character && (
                    <div className="space-y-4">
                      <LabelsEditor
                        character={character}
                        campaignId={campaignId}
                        onLabelsChange={onTagsChange}
                      />
                      <FactionMembershipEditor
                        character={character}
                        campaignId={campaignId}
                        allCharacters={allCharacters}
                        onMembershipsChange={onTagsChange}
                      />
                      <RelationshipEditor
                        character={character}
                        campaignId={campaignId}
                        allCharacters={allCharacters}
                        onRelationshipsChange={onTagsChange}
                      />
                    </div>
                  )}
                </div>

                {/* Center Column: Main Content */}
                <div className="character-modal-center space-y-4 overflow-y-auto">
                  {/* Character Claiming Banner */}
                  {isClaimable && character && (
                    <CharacterClaiming
                      campaignId={campaignId}
                      character={character}
                      isDesignatedForUser={isDesignatedForUser}
                      userVaultCharacters={userVaultCharacters}
                      onClaimed={(vaultCharacterId) => {
                        setCharacterClaimed(true)
                        // Update the character with the vault link
                        onUpdate({ ...character, vault_character_id: vaultCharacterId })
                      }}
                    />
                  )}

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
                  {renderDmNotesSection()}
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
                    {/* PC / NPC Toggle - Prominent */}
                  <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                    <label className="form-label mb-2">Character Type</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setFormData({ ...formData, type: 'pc' })}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all",
                          formData.type === 'pc'
                            ? "bg-purple-500/20 text-purple-300 border-2 border-purple-500/50 ring-2 ring-purple-500/20"
                            : "bg-white/[0.02] text-gray-400 border border-white/[0.08] hover:bg-white/[0.05] hover:text-gray-300"
                        )}
                      >
                        <User className="w-5 h-5" />
                        <div className="text-left">
                          <div className="text-sm font-semibold">Player Character</div>
                          <div className="text-[10px] opacity-70">A hero in the party</div>
                        </div>
                      </button>
                      <button
                        onClick={() => setFormData({ ...formData, type: 'npc' })}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all",
                          formData.type === 'npc'
                            ? "bg-amber-500/20 text-amber-300 border-2 border-amber-500/50 ring-2 ring-amber-500/20"
                            : "bg-white/[0.02] text-gray-400 border border-white/[0.08] hover:bg-white/[0.05] hover:text-gray-300"
                        )}
                      >
                        <Users className="w-5 h-5" />
                        <div className="text-left">
                          <div className="text-sm font-semibold">Non-Player Character</div>
                          <div className="text-[10px] opacity-70">NPC in your world</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
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
                            <div className="absolute top-full left-0 right-0 mt-1 bg-[#12121a] border border-white/[0.08] rounded-lg shadow-2xl z-50 py-1">
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
                  </div>
                </div>

                {/* Tags & Connections - All three editors - Non-fullscreen mode */}
                {!isCreateMode && character && (
                  <div className="pb-4 border-b border-[--border] space-y-4">
                    <LabelsEditor
                      character={character}
                      campaignId={campaignId}
                      onLabelsChange={onTagsChange}
                    />
                    <FactionMembershipEditor
                      character={character}
                      campaignId={campaignId}
                      allCharacters={allCharacters}
                      onMembershipsChange={onTagsChange}
                    />
                    <RelationshipEditor
                      character={character}
                      campaignId={campaignId}
                      allCharacters={allCharacters}
                      onRelationshipsChange={onTagsChange}
                    />
                  </div>
                )}

                {/* Character Claiming Banner - Non-fullscreen */}
                {isClaimable && character && (
                  <CharacterClaiming
                    campaignId={campaignId}
                    character={character}
                    isDesignatedForUser={isDesignatedForUser}
                    userVaultCharacters={userVaultCharacters}
                    onClaimed={(vaultCharacterId) => {
                      setCharacterClaimed(true)
                      onUpdate({ ...character, vault_character_id: vaultCharacterId })
                    }}
                  />
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
                {renderDmNotesSection()}

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
    </>
  )
}

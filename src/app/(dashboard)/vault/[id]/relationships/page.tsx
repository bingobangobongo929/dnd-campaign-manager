'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  Loader2,
  Plus,
  Users,
  Heart,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit3,
  User,
  PawPrint,
  GripVertical,
} from 'lucide-react'
import { toast } from 'sonner'
import { VaultLayout } from '@/components/layout/VaultLayout'
import { Button, Modal } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { RELATIONSHIP_COLORS, COMPANION_TYPE_COLORS, getInitials } from '@/lib/character-display'
import type { VaultCharacterRelationship } from '@/types/database'

const RELATIONSHIP_TYPES = [
  'family', 'mentor', 'friend', 'enemy', 'patron', 'contact',
  'ally', 'employer', 'love_interest', 'rival', 'acquaintance', 'party_member', 'other'
]

const COMPANION_TYPES = [
  'familiar', 'pet', 'mount', 'animal_companion', 'construct', 'other'
]

export default function CharacterRelationshipsPage() {
  const params = useParams()
  const supabase = createClient()
  const characterId = params.id as string

  const [activeTab, setActiveTab] = useState<'npcs' | 'companions'>('npcs')
  const [relationships, setRelationships] = useState<VaultCharacterRelationship[]>([])
  const [loading, setLoading] = useState(true)

  // Editor state
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingRelationship, setEditingRelationship] = useState<VaultCharacterRelationship | null>(null)
  const [saving, setSaving] = useState(false)
  const [editorType, setEditorType] = useState<'npc' | 'companion'>('npc')

  // Form state
  const [formData, setFormData] = useState({
    related_name: '',
    nickname: '',
    relationship_type: 'friend',
    relationship_label: '',
    relationship_status: 'active',
    description: '',
    full_notes: '',
    related_image_url: '',
    // NPC-specific
    occupation: '',
    location: '',
    faction_affiliations: '',
    needs: '',
    can_provide: '',
    goals: '',
    secrets: '',
    // Companion-specific
    companion_type: 'pet',
    companion_species: '',
    companion_abilities: '',
  })

  useEffect(() => {
    loadRelationships()
  }, [characterId])

  const loadRelationships = async () => {
    setLoading(true)

    const { data } = await supabase
      .from('vault_character_relationships')
      .select('*')
      .eq('character_id', characterId)
      .order('display_order', { ascending: true })

    if (data) {
      setRelationships(data)
    }

    setLoading(false)
  }

  const npcs = relationships.filter(r => !r.is_companion)
  const companions = relationships.filter(r => r.is_companion)

  const openEditor = (type: 'npc' | 'companion', relationship?: VaultCharacterRelationship) => {
    setEditorType(type)
    if (relationship) {
      setEditingRelationship(relationship)
      setFormData({
        related_name: relationship.related_name || '',
        nickname: relationship.nickname || '',
        relationship_type: relationship.relationship_type || 'friend',
        relationship_label: relationship.relationship_label || '',
        relationship_status: relationship.relationship_status || 'active',
        description: relationship.description || '',
        full_notes: relationship.full_notes || '',
        related_image_url: relationship.related_image_url || '',
        occupation: relationship.occupation || '',
        location: relationship.location || '',
        faction_affiliations: relationship.faction_affiliations?.join(', ') || '',
        needs: relationship.needs || '',
        can_provide: relationship.can_provide || '',
        goals: relationship.goals || '',
        secrets: relationship.secrets || '',
        companion_type: relationship.companion_type || 'pet',
        companion_species: relationship.companion_species || '',
        companion_abilities: relationship.companion_abilities || '',
      })
    } else {
      setEditingRelationship(null)
      setFormData({
        related_name: '',
        nickname: '',
        relationship_type: type === 'companion' ? 'companion' : 'friend',
        relationship_label: '',
        relationship_status: 'active',
        description: '',
        full_notes: '',
        related_image_url: '',
        occupation: '',
        location: '',
        faction_affiliations: '',
        needs: '',
        can_provide: '',
        goals: '',
        secrets: '',
        companion_type: 'pet',
        companion_species: '',
        companion_abilities: '',
      })
    }
    setIsEditorOpen(true)
  }

  const handleSave = async () => {
    if (!formData.related_name.trim()) {
      toast.error('Name is required')
      return
    }

    setSaving(true)

    const isCompanion = editorType === 'companion'
    const maxOrder = Math.max(0, ...relationships.filter(r => r.is_companion === isCompanion).map(r => r.display_order || 0))

    const payload = {
      character_id: characterId,
      is_companion: isCompanion,
      related_name: formData.related_name,
      nickname: formData.nickname || null,
      relationship_type: formData.relationship_type,
      relationship_label: formData.relationship_label || null,
      relationship_status: formData.relationship_status || null,
      description: formData.description || null,
      full_notes: formData.full_notes || null,
      related_image_url: formData.related_image_url || null,
      occupation: isCompanion ? null : (formData.occupation || null),
      location: formData.location || null,
      faction_affiliations: isCompanion ? null : (formData.faction_affiliations ? formData.faction_affiliations.split(',').map(s => s.trim()).filter(Boolean) : null),
      needs: isCompanion ? null : (formData.needs || null),
      can_provide: isCompanion ? null : (formData.can_provide || null),
      goals: isCompanion ? null : (formData.goals || null),
      secrets: isCompanion ? null : (formData.secrets || null),
      companion_type: isCompanion ? formData.companion_type : null,
      companion_species: isCompanion ? (formData.companion_species || null) : null,
      companion_abilities: isCompanion ? (formData.companion_abilities || null) : null,
      display_order: editingRelationship?.display_order ?? maxOrder + 1,
    }

    if (editingRelationship) {
      const { error } = await supabase
        .from('vault_character_relationships')
        .update(payload)
        .eq('id', editingRelationship.id)

      if (error) {
        toast.error('Failed to update')
      } else {
        toast.success('Updated successfully')
        setIsEditorOpen(false)
        loadRelationships()
      }
    } else {
      const { error } = await supabase
        .from('vault_character_relationships')
        .insert(payload)

      if (error) {
        toast.error('Failed to create')
      } else {
        toast.success('Created successfully')
        setIsEditorOpen(false)
        loadRelationships()
      }
    }

    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this relationship?')) return

    const { error } = await supabase
      .from('vault_character_relationships')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Failed to delete')
    } else {
      toast.success('Deleted successfully')
      loadRelationships()
    }
  }

  if (loading) {
    return (
      <VaultLayout characterId={characterId}>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[--arcane-purple]" />
        </div>
      </VaultLayout>
    )
  }

  return (
    <VaultLayout characterId={characterId}>
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[--text-primary]">Relationships</h1>
            <p className="text-sm text-[--text-secondary]">
              Manage NPCs and companions connected to your character
            </p>
          </div>
          <Button onClick={() => openEditor(activeTab === 'companions' ? 'companion' : 'npc')}>
            <Plus className="w-4 h-4 mr-2" />
            Add {activeTab === 'companions' ? 'Companion' : 'NPC'}
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('npcs')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'npcs'
                ? 'bg-[--arcane-purple] text-white'
                : 'bg-[--bg-elevated] text-[--text-secondary] hover:text-[--text-primary]'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            NPCs ({npcs.length})
          </button>
          <button
            onClick={() => setActiveTab('companions')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'companions'
                ? 'bg-[--arcane-purple] text-white'
                : 'bg-[--bg-elevated] text-[--text-secondary] hover:text-[--text-primary]'
            }`}
          >
            <PawPrint className="w-4 h-4 inline mr-2" />
            Companions ({companions.length})
          </button>
        </div>

        {/* Content */}
        {activeTab === 'npcs' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {npcs.length === 0 ? (
              <div className="col-span-full text-center py-16">
                <Users className="w-12 h-12 mx-auto mb-4 text-[--text-tertiary]" />
                <h3 className="text-lg font-medium text-[--text-primary] mb-2">No NPCs</h3>
                <p className="text-sm text-[--text-secondary] mb-6">
                  Add important NPCs your character knows
                </p>
                <Button onClick={() => openEditor('npc')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First NPC
                </Button>
              </div>
            ) : (
              npcs.map((npc) => {
                const colors = RELATIONSHIP_COLORS[npc.relationship_type || 'other'] || RELATIONSHIP_COLORS.other
                return (
                  <div
                    key={npc.id}
                    className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-xl bg-[--bg-elevated] flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {npc.related_image_url ? (
                          <img
                            src={npc.related_image_url}
                            alt={npc.related_name || 'NPC'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-lg font-bold text-[--text-tertiary]">
                            {getInitials(npc.related_name || '?')}
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-[--text-primary] truncate">
                            {npc.related_name}
                          </h3>
                          {npc.nickname && (
                            <span className="text-xs text-[--text-tertiary]">
                              "{npc.nickname}"
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${colors}`}>
                            {npc.relationship_label || npc.relationship_type?.replace('_', ' ')}
                          </span>
                          {npc.relationship_status && npc.relationship_status !== 'active' && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-gray-500/15 text-gray-400 border border-gray-500/20">
                              {npc.relationship_status}
                            </span>
                          )}
                        </div>
                        {npc.occupation && (
                          <p className="text-xs text-[--text-tertiary] mt-1 truncate">
                            {npc.occupation}
                          </p>
                        )}
                      </div>
                    </div>

                    {npc.description && (
                      <p className="text-sm text-[--text-secondary] mt-3 line-clamp-2">
                        {npc.description}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 mt-3 pt-3 border-t border-white/[0.06] opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditor('npc', npc)}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(npc.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {companions.length === 0 ? (
              <div className="col-span-full text-center py-16">
                <PawPrint className="w-12 h-12 mx-auto mb-4 text-[--text-tertiary]" />
                <h3 className="text-lg font-medium text-[--text-primary] mb-2">No Companions</h3>
                <p className="text-sm text-[--text-secondary] mb-6">
                  Add pets, familiars, mounts, or other companions
                </p>
                <Button onClick={() => openEditor('companion')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Companion
                </Button>
              </div>
            ) : (
              companions.map((companion) => {
                const colors = COMPANION_TYPE_COLORS[companion.companion_type || 'other'] || COMPANION_TYPE_COLORS.other
                return (
                  <div
                    key={companion.id}
                    className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-xl bg-[--bg-elevated] flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {companion.related_image_url ? (
                          <img
                            src={companion.related_image_url}
                            alt={companion.related_name || 'Companion'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <PawPrint className="w-6 h-6 text-[--text-tertiary]" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-[--text-primary] truncate">
                          {companion.related_name}
                        </h3>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${colors}`}>
                            {companion.companion_type?.replace('_', ' ')}
                          </span>
                          {companion.companion_species && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.05] text-[--text-secondary]">
                              {companion.companion_species}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {companion.description && (
                      <p className="text-sm text-[--text-secondary] mt-3 line-clamp-2">
                        {companion.description}
                      </p>
                    )}

                    {companion.companion_abilities && (
                      <p className="text-xs text-[--text-tertiary] mt-2 italic">
                        {companion.companion_abilities}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 mt-3 pt-3 border-t border-white/[0.06] opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditor('companion', companion)}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(companion.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Editor Modal */}
        <Modal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          title={editingRelationship
            ? `Edit ${editorType === 'companion' ? 'Companion' : 'NPC'}`
            : `Add ${editorType === 'companion' ? 'Companion' : 'NPC'}`
          }
          size="lg"
        >
          <div className="space-y-4">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[--text-secondary] mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.related_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, related_name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-[--bg-elevated] border border-[--border] text-[--text-primary] focus:outline-none focus:border-[--arcane-purple]"
                  placeholder="Name"
                />
              </div>
              {editorType === 'npc' && (
                <div>
                  <label className="block text-sm font-medium text-[--text-secondary] mb-1">
                    Nickname
                  </label>
                  <input
                    type="text"
                    value={formData.nickname}
                    onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-[--bg-elevated] border border-[--border] text-[--text-primary] focus:outline-none focus:border-[--arcane-purple]"
                    placeholder="Nickname or alias"
                  />
                </div>
              )}
              {editorType === 'companion' && (
                <div>
                  <label className="block text-sm font-medium text-[--text-secondary] mb-1">
                    Species
                  </label>
                  <input
                    type="text"
                    value={formData.companion_species}
                    onChange={(e) => setFormData(prev => ({ ...prev, companion_species: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-[--bg-elevated] border border-[--border] text-[--text-primary] focus:outline-none focus:border-[--arcane-purple]"
                    placeholder="e.g., Wolf, Owl, Warhorse"
                  />
                </div>
              )}
            </div>

            {/* Type row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[--text-secondary] mb-1">
                  {editorType === 'companion' ? 'Companion Type' : 'Relationship Type'}
                </label>
                <select
                  value={editorType === 'companion' ? formData.companion_type : formData.relationship_type}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    [editorType === 'companion' ? 'companion_type' : 'relationship_type']: e.target.value
                  }))}
                  className="w-full px-3 py-2 rounded-lg bg-[--bg-elevated] border border-[--border] text-[--text-primary] focus:outline-none focus:border-[--arcane-purple]"
                  style={{ colorScheme: 'dark' }}
                >
                  {(editorType === 'companion' ? COMPANION_TYPES : RELATIONSHIP_TYPES).map(type => (
                    <option key={type} value={type}>
                      {type.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
              {editorType === 'npc' && (
                <div>
                  <label className="block text-sm font-medium text-[--text-secondary] mb-1">
                    Custom Label
                  </label>
                  <input
                    type="text"
                    value={formData.relationship_label}
                    onChange={(e) => setFormData(prev => ({ ...prev, relationship_label: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-[--bg-elevated] border border-[--border] text-[--text-primary] focus:outline-none focus:border-[--arcane-purple]"
                    placeholder="e.g., Childhood Friend, Former Teacher"
                  />
                </div>
              )}
              {editorType === 'companion' && (
                <div>
                  <label className="block text-sm font-medium text-[--text-secondary] mb-1">
                    Abilities
                  </label>
                  <input
                    type="text"
                    value={formData.companion_abilities}
                    onChange={(e) => setFormData(prev => ({ ...prev, companion_abilities: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-[--bg-elevated] border border-[--border] text-[--text-primary] focus:outline-none focus:border-[--arcane-purple]"
                    placeholder="Special abilities or traits"
                  />
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-[--text-secondary] mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-[--bg-elevated] border border-[--border] text-[--text-primary] focus:outline-none focus:border-[--arcane-purple] resize-none"
                rows={3}
                placeholder="Brief description"
              />
            </div>

            {/* NPC-specific fields */}
            {editorType === 'npc' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[--text-secondary] mb-1">
                      Occupation
                    </label>
                    <input
                      type="text"
                      value={formData.occupation}
                      onChange={(e) => setFormData(prev => ({ ...prev, occupation: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-[--bg-elevated] border border-[--border] text-[--text-primary] focus:outline-none focus:border-[--arcane-purple]"
                      placeholder="Job or role"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[--text-secondary] mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-[--bg-elevated] border border-[--border] text-[--text-primary] focus:outline-none focus:border-[--arcane-purple]"
                      placeholder="Where they can be found"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[--text-secondary] mb-1">
                      What They Need
                    </label>
                    <input
                      type="text"
                      value={formData.needs}
                      onChange={(e) => setFormData(prev => ({ ...prev, needs: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-[--bg-elevated] border border-[--border] text-[--text-primary] focus:outline-none focus:border-[--arcane-purple]"
                      placeholder="Motivations or wants"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[--text-secondary] mb-1">
                      What They Can Provide
                    </label>
                    <input
                      type="text"
                      value={formData.can_provide}
                      onChange={(e) => setFormData(prev => ({ ...prev, can_provide: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-[--bg-elevated] border border-[--border] text-[--text-primary] focus:outline-none focus:border-[--arcane-purple]"
                      placeholder="Services, information, etc."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[--text-secondary] mb-1">
                    Secrets
                  </label>
                  <textarea
                    value={formData.secrets}
                    onChange={(e) => setFormData(prev => ({ ...prev, secrets: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-[--bg-elevated] border border-[--border] text-[--text-primary] focus:outline-none focus:border-[--arcane-purple] resize-none"
                    rows={2}
                    placeholder="Hidden information or secrets"
                  />
                </div>
              </>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-[--text-secondary] mb-1">
                Notes
              </label>
              <textarea
                value={formData.full_notes}
                onChange={(e) => setFormData(prev => ({ ...prev, full_notes: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-[--bg-elevated] border border-[--border] text-[--text-primary] focus:outline-none focus:border-[--arcane-purple] resize-none"
                rows={3}
                placeholder="Additional notes"
              />
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-sm font-medium text-[--text-secondary] mb-1">
                Image URL
              </label>
              <input
                type="text"
                value={formData.related_image_url}
                onChange={(e) => setFormData(prev => ({ ...prev, related_image_url: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-[--bg-elevated] border border-[--border] text-[--text-primary] focus:outline-none focus:border-[--arcane-purple]"
                placeholder="https://..."
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-[--border]">
              <Button variant="secondary" onClick={() => setIsEditorOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {editingRelationship ? 'Save Changes' : 'Create'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </VaultLayout>
  )
}

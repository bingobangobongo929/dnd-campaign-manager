'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Trash2, Users, Heart, Swords, Briefcase, Crown,
  ArrowRight, ArrowLeftRight, EyeOff, Link2, Pencil
} from 'lucide-react'
import Image from 'next/image'
import { useSupabase } from '@/hooks'
import { cn, getInitials } from '@/lib/utils'
import { getGroupIcon, Modal, Input } from '@/components/ui'
import { AddRelationshipModal } from './AddRelationshipModal'
import type {
  Character, CanvasRelationship, RelationshipTemplate,
  RelationshipCategory
} from '@/types/database'

interface RelationshipWithDetails extends CanvasRelationship {
  template?: RelationshipTemplate | null
  to_character: Character
}

interface RelationshipEditorProps {
  character: Character
  campaignId: string
  allCharacters: Character[]
  onRelationshipsChange?: () => void
}

const CATEGORY_ICONS: Record<RelationshipCategory, React.ReactNode> = {
  family: <Crown className="w-3.5 h-3.5" />,
  professional: <Briefcase className="w-3.5 h-3.5" />,
  romantic: <Heart className="w-3.5 h-3.5" />,
  conflict: <Swords className="w-3.5 h-3.5" />,
  social: <Users className="w-3.5 h-3.5" />,
  other: <Link2 className="w-3.5 h-3.5" />,
}

export function RelationshipEditor({
  character,
  campaignId,
  allCharacters,
  onRelationshipsChange,
}: RelationshipEditorProps) {
  const supabase = useSupabase()
  const [relationships, setRelationships] = useState<RelationshipWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  // Edit state
  const [editingRelationship, setEditingRelationship] = useState<RelationshipWithDetails | null>(null)
  const [editCustomLabel, setEditCustomLabel] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editIsKnown, setEditIsKnown] = useState(true)
  const [saving, setSaving] = useState(false)

  // Load relationships for this character
  const loadRelationships = useCallback(async () => {
    setLoading(true)

    const { data } = await supabase
      .from('canvas_relationships')
      .select(`
        *,
        template:relationship_templates(*),
        to_character:characters!canvas_relationships_to_character_id_fkey(*)
      `)
      .eq('from_character_id', character.id)
      .order('created_at', { ascending: false })

    setRelationships((data || []) as RelationshipWithDetails[])
    setLoading(false)
  }, [character.id, supabase])

  useEffect(() => {
    loadRelationships()
  }, [loadRelationships])

  const handleDeleteRelationship = async (relationship: RelationshipWithDetails) => {
    // If it has a pair_id, delete both relationships
    if (relationship.pair_id) {
      await supabase
        .from('canvas_relationships')
        .delete()
        .eq('pair_id', relationship.pair_id)
    } else {
      await supabase
        .from('canvas_relationships')
        .delete()
        .eq('id', relationship.id)
    }

    loadRelationships()
    onRelationshipsChange?.()
  }

  const handleRelationshipCreated = () => {
    loadRelationships()
    onRelationshipsChange?.()
  }

  const handleEditClick = (rel: RelationshipWithDetails) => {
    setEditingRelationship(rel)
    setEditCustomLabel(rel.custom_label || '')
    setEditDescription(rel.description || '')
    setEditIsKnown(rel.is_known_to_party)
  }

  const handleSaveEdit = async () => {
    if (!editingRelationship) return
    setSaving(true)

    const { error } = await supabase
      .from('canvas_relationships')
      .update({
        custom_label: editCustomLabel || null,
        description: editDescription || null,
        is_known_to_party: editIsKnown,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingRelationship.id)

    if (!error) {
      setEditingRelationship(null)
      loadRelationships()
      onRelationshipsChange?.()
    }

    setSaving(false)
  }

  const getRelationshipIcon = (relationship: RelationshipWithDetails) => {
    // Use template icon if available, otherwise fall back to category icons
    if (relationship.template?.icon) {
      const IconComponent = getGroupIcon(relationship.template.icon)
      return <IconComponent className="w-3.5 h-3.5" />
    }
    const category = relationship.template?.category || 'other'
    return CATEGORY_ICONS[category]
  }

  const getRelationshipColor = (relationship: RelationshipWithDetails) => {
    return relationship.template?.color || '#8B5CF6'
  }

  const getModeIcon = (relationship: RelationshipWithDetails) => {
    if (!relationship.template) return null
    const mode = relationship.template.relationship_mode
    if (mode === 'symmetric') return <ArrowLeftRight className="w-3 h-3 text-gray-500" />
    if (mode === 'asymmetric') return <span className="text-[10px] text-gray-500">↔</span>
    return <ArrowRight className="w-3 h-3 text-gray-500" />
  }

  // Group relationships by category
  const groupedRelationships = relationships.reduce((acc, rel) => {
    const category = rel.template?.category || 'other'
    if (!acc[category]) acc[category] = []
    acc[category].push(rel)
    return acc
  }, {} as Record<RelationshipCategory, RelationshipWithDetails[]>)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[--text-secondary] uppercase tracking-wider flex items-center gap-2">
          <Users className="w-4 h-4" />
          Relationships
        </h3>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="btn btn-secondary btn-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </div>

      {/* Relationships list */}
      {relationships.length === 0 ? (
        <div className="text-center py-6 bg-white/[0.02] rounded-xl border border-white/[0.06]">
          <Users className="w-8 h-8 text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No relationships yet</p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn btn-secondary btn-sm mt-3"
          >
            <Plus className="w-3.5 h-3.5" />
            Add First Relationship
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {(Object.entries(groupedRelationships) as [RelationshipCategory, RelationshipWithDetails[]][])
            .filter(([_, rels]) => rels.length > 0)
            .map(([category, categoryRelationships]) => (
              <div key={category} className="space-y-2">
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1.5 capitalize">
                  {CATEGORY_ICONS[category]}
                  {category}
                </h4>
                {categoryRelationships.map(rel => {
                  const avatarUrl = rel.to_character.image_url ||
                    `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(rel.to_character.name)}&backgroundColor=1a1a24`

                  return (
                    <div
                      key={rel.id}
                      className="group flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-all"
                    >
                      {/* Character Avatar */}
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-[--bg-elevated]">
                        <Image
                          src={avatarUrl}
                          alt={rel.to_character.name}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                        {/* Relationship type badge */}
                        <div
                          className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#12121a]"
                          style={{ backgroundColor: getRelationshipColor(rel) }}
                        >
                          <div className="text-white scale-75">
                            {getRelationshipIcon(rel)}
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white truncate">
                            {rel.to_character.name}
                          </span>
                          {rel.to_character.type === 'npc' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">NPC</span>
                          )}
                          {!rel.is_known_to_party && (
                            <span title="Hidden from party">
                              <EyeOff className="w-3 h-3 text-gray-500" />
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className="text-xs font-medium"
                            style={{ color: getRelationshipColor(rel) }}
                          >
                            {rel.custom_label || rel.template?.name || 'Related'}
                          </span>
                          {getModeIcon(rel)}
                        </div>
                        {rel.description && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                            {rel.description}
                          </p>
                        )}
                      </div>

                      {/* Action buttons - always visible */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleEditClick(rel)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                          title="Edit relationship"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRelationship(rel)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          title={rel.pair_id ? "Remove relationship (both directions)" : "Remove relationship"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
        </div>
      )}

      {/* Add Relationship Modal */}
      <AddRelationshipModal
        campaignId={campaignId}
        character={character}
        allCharacters={allCharacters}
        existingRelationships={relationships}
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onRelationshipCreated={handleRelationshipCreated}
      />

      {/* Edit Relationship Modal */}
      <Modal
        isOpen={!!editingRelationship}
        onClose={() => setEditingRelationship(null)}
        title={`Edit Relationship with ${editingRelationship?.to_character.name}`}
      >
        <div className="space-y-4">
          {/* Custom Label */}
          <div className="form-group">
            <label className="form-label">
              Custom Label
              <span className="text-gray-500 font-normal ml-1">
                (overrides "{editingRelationship?.template?.name || 'template'}")
              </span>
            </label>
            <Input
              value={editCustomLabel}
              onChange={(e) => setEditCustomLabel(e.target.value)}
              placeholder={editingRelationship?.template?.name || 'Enter custom label...'}
              className="form-input"
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Add details about this relationship..."
              rows={3}
              className="form-textarea"
            />
          </div>

          {/* Visibility toggle */}
          <div className="form-group">
            <label className="form-label">Visibility</label>
            <div className="flex gap-2">
              <button
                onClick={() => setEditIsKnown(true)}
                className={cn(
                  "flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors",
                  editIsKnown
                    ? "bg-green-500/20 border-green-500 text-green-400"
                    : "bg-white/[0.03] border-white/[0.08] text-[--text-secondary] hover:bg-white/[0.05]"
                )}
              >
                Known to Party
              </button>
              <button
                onClick={() => setEditIsKnown(false)}
                className={cn(
                  "flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center justify-center gap-1.5",
                  !editIsKnown
                    ? "bg-purple-500/20 border-purple-500 text-purple-400"
                    : "bg-white/[0.03] border-white/[0.08] text-[--text-secondary] hover:bg-white/[0.05]"
                )}
              >
                <EyeOff className="w-4 h-4" />
                Hidden
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              className="btn btn-secondary"
              onClick={() => setEditingRelationship(null)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSaveEdit}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

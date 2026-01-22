'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Trash2, Users, Heart, Swords, Briefcase, Crown,
  ArrowRight, ArrowLeftRight, EyeOff, Link2
} from 'lucide-react'
import Image from 'next/image'
import { useSupabase } from '@/hooks'
import { cn, getInitials } from '@/lib/utils'
import { getGroupIcon } from '@/components/ui'
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

                      {/* Delete button */}
                      <button
                        onClick={() => handleDeleteRelationship(rel)}
                        className="p-1.5 rounded-lg text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
                        title={rel.pair_id ? "Remove relationship (both directions)" : "Remove relationship"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
    </div>
  )
}

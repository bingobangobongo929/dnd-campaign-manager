'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  X, Search, Trash2, Users, Heart, Swords, Briefcase, Crown,
  ArrowRight, ArrowLeftRight, Link2, Filter
} from 'lucide-react'
import { useSupabase } from '@/hooks'
import { cn } from '@/lib/utils'
import type {
  Character, CanvasRelationship, RelationshipTemplate,
  RelationshipCategory
} from '@/types/database'

interface RelationshipWithDetails extends CanvasRelationship {
  template?: RelationshipTemplate | null
  from_character: Character
  to_character: Character
}

interface RelationshipManagerProps {
  campaignId: string
  isOpen: boolean
  onClose: () => void
}

const CATEGORY_ICONS: Record<RelationshipCategory, React.ReactNode> = {
  family: <Crown className="w-4 h-4" />,
  professional: <Briefcase className="w-4 h-4" />,
  romantic: <Heart className="w-4 h-4" />,
  conflict: <Swords className="w-4 h-4" />,
  social: <Users className="w-4 h-4" />,
  other: <Link2 className="w-4 h-4" />,
}

const CATEGORY_COLORS: Record<RelationshipCategory, string> = {
  family: '#3B82F6',
  professional: '#10B981',
  romantic: '#EC4899',
  conflict: '#EF4444',
  social: '#8B5CF6',
  other: '#6B7280',
}

export function RelationshipManager({ campaignId, isOpen, onClose }: RelationshipManagerProps) {
  const supabase = useSupabase()
  const [relationships, setRelationships] = useState<RelationshipWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<RelationshipCategory | 'all'>('all')

  const loadRelationships = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('canvas_relationships')
      .select(`
        *,
        template:relationship_templates(*),
        from_character:characters!canvas_relationships_from_character_id_fkey(*),
        to_character:characters!canvas_relationships_to_character_id_fkey(*)
      `)
      .eq('campaign_id', campaignId)
      .eq('is_primary', true)
      .order('created_at', { ascending: false })

    setRelationships((data || []) as RelationshipWithDetails[])
    setLoading(false)
  }, [campaignId, supabase])

  useEffect(() => {
    if (isOpen) {
      loadRelationships()
    }
  }, [isOpen, loadRelationships])

  const handleDelete = async (relationship: RelationshipWithDetails) => {
    if (!confirm(`Delete the relationship between ${relationship.from_character.name} and ${relationship.to_character.name}?`)) {
      return
    }

    // Delete both directions if pair_id exists
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
  }

  const getModeIcon = (relationship: RelationshipWithDetails) => {
    if (!relationship.template) return null
    const mode = relationship.template.relationship_mode
    if (mode === 'symmetric') return <ArrowLeftRight className="w-3.5 h-3.5" />
    return <ArrowRight className="w-3.5 h-3.5" />
  }

  // Filter relationships
  const filteredRelationships = relationships.filter(rel => {
    const matchesSearch = searchQuery === '' ||
      rel.from_character.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rel.to_character.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rel.custom_label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rel.template?.name.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = filterCategory === 'all' ||
      rel.template?.category === filterCategory

    return matchesSearch && matchesCategory
  })

  // Group by category
  const groupedRelationships = filteredRelationships.reduce((acc, rel) => {
    const category = rel.template?.category || 'other'
    if (!acc[category]) acc[category] = []
    acc[category].push(rel)
    return acc
  }, {} as Record<RelationshipCategory, RelationshipWithDetails[]>)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-[#12121a] border border-[--border] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[--border]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Relationships</h2>
              <p className="text-sm text-[--text-tertiary]">
                {relationships.length} relationship{relationships.length !== 1 ? 's' : ''} in campaign
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost btn-icon">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter */}
        <div className="p-4 border-b border-[--border] flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-tertiary]" />
            <input
              type="text"
              placeholder="Search relationships..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-white placeholder:text-[--text-tertiary] focus:outline-none focus:border-purple-500/50"
            />
          </div>
          <div className="relative">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as RelationshipCategory | 'all')}
              className="appearance-none pl-10 pr-8 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-purple-500/50 cursor-pointer"
            >
              <option value="all">All Categories</option>
              <option value="family">Family</option>
              <option value="professional">Professional</option>
              <option value="romantic">Romantic</option>
              <option value="conflict">Conflict</option>
              <option value="social">Social</option>
              <option value="other">Other</option>
            </select>
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-tertiary]" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredRelationships.length === 0 ? (
            <div className="text-center py-12">
              <Link2 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-[--text-secondary]">No relationships found</p>
              <p className="text-sm text-[--text-tertiary] mt-1">
                Add relationships from character edit modals
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {(Object.entries(groupedRelationships) as [RelationshipCategory, RelationshipWithDetails[]][])
                .filter(([_, rels]) => rels.length > 0)
                .map(([category, categoryRelationships]) => (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-3">
                      <span style={{ color: CATEGORY_COLORS[category] }}>
                        {CATEGORY_ICONS[category]}
                      </span>
                      <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: CATEGORY_COLORS[category] }}>
                        {category}
                      </h3>
                      <span className="text-xs text-[--text-tertiary]">
                        ({categoryRelationships.length})
                      </span>
                    </div>
                    <div className="space-y-2">
                      {categoryRelationships.map(rel => (
                        <div
                          key={rel.id}
                          className="group flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all"
                        >
                          {/* From Character */}
                          <div className="flex items-center gap-2 min-w-[140px]">
                            <div className="w-8 h-8 rounded-lg bg-[--bg-elevated] overflow-hidden">
                              {rel.from_character.image_url ? (
                                <img
                                  src={rel.from_character.image_url}
                                  alt={rel.from_character.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[--text-tertiary]">
                                  <Users className="w-4 h-4" />
                                </div>
                              )}
                            </div>
                            <span className="text-sm font-medium text-white truncate">
                              {rel.from_character.name}
                            </span>
                          </div>

                          {/* Relationship Type */}
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03]">
                            {getModeIcon(rel)}
                            <span
                              className="text-sm font-medium"
                              style={{ color: rel.template?.color || CATEGORY_COLORS[category] }}
                            >
                              {rel.custom_label || rel.template?.name || 'Related'}
                            </span>
                          </div>

                          {/* To Character */}
                          <div className="flex items-center gap-2 min-w-[140px]">
                            <div className="w-8 h-8 rounded-lg bg-[--bg-elevated] overflow-hidden">
                              {rel.to_character.image_url ? (
                                <img
                                  src={rel.to_character.image_url}
                                  alt={rel.to_character.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[--text-tertiary]">
                                  <Users className="w-4 h-4" />
                                </div>
                              )}
                            </div>
                            <span className="text-sm font-medium text-white truncate">
                              {rel.to_character.name}
                            </span>
                          </div>

                          {/* Spacer */}
                          <div className="flex-1" />

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(rel)}
                            className="p-2 rounded-lg text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            title="Delete relationship"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

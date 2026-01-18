'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  Loader2,
  Plus,
  Users,
  Trash2,
  Edit3,
  PawPrint,
  ExternalLink,
  Swords,
} from 'lucide-react'
import { toast } from 'sonner'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui'
import { BackToTopButton } from '@/components/ui/back-to-top'
import { createClient } from '@/lib/supabase/client'
import { RELATIONSHIP_COLORS, COMPANION_TYPE_COLORS, getInitials } from '@/lib/character-display'
import type { VaultCharacterRelationship } from '@/types/database'

export default function CharacterRelationshipsPage() {
  const params = useParams()
  const supabase = createClient()
  const characterId = params.id as string

  const [activeTab, setActiveTab] = useState<'party' | 'npcs' | 'companions'>('party')
  const [relationships, setRelationships] = useState<VaultCharacterRelationship[]>([])
  const [loading, setLoading] = useState(true)

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

  const partyMembers = relationships.filter(r => !r.is_companion && r.relationship_type === 'party_member')
  const npcs = relationships.filter(r => !r.is_companion && r.relationship_type !== 'party_member')
  const companions = relationships.filter(r => r.is_companion)

  // Navigate to Character Editor for adding/editing
  const goToEditor = () => {
    // Use window.location for full navigation to properly scroll to anchor
    window.location.href = `/vault/${characterId}#people`
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
      <AppLayout characterId={characterId}>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[--arcane-purple]" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout characterId={characterId}>
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[--text-primary]">Relationships</h1>
            <p className="text-sm text-[--text-secondary]">
              View party members, NPCs, and companions connected to your character
            </p>
          </div>
          <Button onClick={goToEditor}>
            <ExternalLink className="w-4 h-4 mr-2" />
            Edit in Character Editor
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('party')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'party'
                ? 'bg-[--arcane-purple] text-white'
                : 'bg-[--bg-elevated] text-[--text-secondary] hover:text-[--text-primary]'
            }`}
          >
            <Swords className="w-4 h-4 inline mr-2" />
            Party ({partyMembers.length})
          </button>
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
        {activeTab === 'party' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {partyMembers.length === 0 ? (
              <div className="col-span-full text-center py-16">
                <Swords className="w-12 h-12 mx-auto mb-4 text-[--text-tertiary]" />
                <h3 className="text-lg font-medium text-[--text-primary] mb-2">No Party Members</h3>
                <p className="text-sm text-[--text-secondary] mb-6">
                  Add fellow adventurers from your party
                </p>
                <Button onClick={goToEditor}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add in Editor
                </Button>
              </div>
            ) : (
              partyMembers.map((member) => {
                const colors = RELATIONSHIP_COLORS['party_member'] || RELATIONSHIP_COLORS.other
                return (
                  <div
                    key={member.id}
                    className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-[--bg-elevated] flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {member.related_image_url ? (
                          <img
                            src={member.related_image_url}
                            alt={member.related_name || 'Party Member'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-lg font-bold text-[--text-tertiary]">
                            {getInitials(member.related_name || '?')}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-[--text-primary] truncate">
                            {member.related_name}
                          </h3>
                          {member.nickname && (
                            <span className="text-xs text-[--text-tertiary]">
                              "{member.nickname}"
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${colors}`}>
                            {member.relationship_label || 'Party Member'}
                          </span>
                        </div>
                        {member.occupation && (
                          <p className="text-xs text-[--text-tertiary] mt-1 truncate">
                            {member.occupation}
                          </p>
                        )}
                      </div>
                    </div>
                    {member.description && (
                      <p className="text-sm text-[--text-secondary] mt-3 line-clamp-2">
                        {member.description}
                      </p>
                    )}
                    <div className="flex gap-2 mt-3 pt-3 border-t border-white/[0.06] opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" onClick={goToEditor}>
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(member.id)}
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
        ) : activeTab === 'npcs' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {npcs.length === 0 ? (
              <div className="col-span-full text-center py-16">
                <Users className="w-12 h-12 mx-auto mb-4 text-[--text-tertiary]" />
                <h3 className="text-lg font-medium text-[--text-primary] mb-2">No NPCs</h3>
                <p className="text-sm text-[--text-secondary] mb-6">
                  Add important NPCs your character knows
                </p>
                <Button onClick={goToEditor}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add in Editor
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
                    <div className="flex gap-2 mt-3 pt-3 border-t border-white/[0.06] opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" onClick={goToEditor}>
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
                <Button onClick={goToEditor}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add in Editor
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
                      <Button variant="ghost" size="sm" onClick={goToEditor}>
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

      </div>
      <BackToTopButton />
    </AppLayout>
  )
}

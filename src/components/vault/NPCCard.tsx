'use client'

import Image from 'next/image'
import {
  Sparkles,
  Edit2,
  Trash2,
} from 'lucide-react'
import type { VaultCharacterRelationship } from '@/types/database'
import { renderMarkdown } from '@/lib/character-display'

interface NPCCardProps {
  npc: VaultCharacterRelationship
  onEdit?: () => void
  onDelete?: () => void
}

// Relationship type colors
const RELATIONSHIP_COLORS: Record<string, string> = {
  family: 'bg-red-500/15 text-red-400 border-red-500/20',
  mentor: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  friend: 'bg-green-500/15 text-green-400 border-green-500/20',
  enemy: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  patron: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  contact: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  ally: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  employer: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  love_interest: 'bg-pink-500/15 text-pink-400 border-pink-500/20',
  rival: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  acquaintance: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
  party_member: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
  other: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
}

// Emoji constants for display (matching import preview exactly)
const EMOJIS = {
  occupation: '💼',
  location: '📍',
  faction: '🏛️',
  needs: '🎯',
  canProvide: '🎁',
  goals: '⭐',
  secrets: '🔒',
}

export function NPCCard({ npc, onEdit, onDelete }: NPCCardProps) {
  const relationshipColor = RELATIONSHIP_COLORS[npc.relationship_type] || RELATIONSHIP_COLORS.other

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3 hover:border-white/[0.1] transition-colors group">
      {/* Header row: Name, nickname, badges, actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Portrait thumbnail if available */}
        {npc.related_image_url && (
          <div className="relative group/avatar">
            <Image
              src={npc.related_image_url}
              alt={npc.related_name || 'NPC'}
              width={40}
              height={40}
              className="rounded-lg object-cover flex-shrink-0"
            />
            {/* Hover preview - larger image popup */}
            <div className="absolute bottom-full left-0 mb-2 opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200 z-50 pointer-events-none">
              <Image
                src={npc.related_image_url}
                alt={npc.related_name || 'NPC'}
                width={192}
                height={192}
                className="w-48 h-48 object-cover rounded-lg shadow-xl border border-white/10"
              />
            </div>
          </div>
        )}
        <span className="font-medium text-white/90">{npc.related_name}</span>
        {npc.nickname && (
          <span className="text-sm text-gray-500 italic">"{npc.nickname}"</span>
        )}
        <span className={`text-xs px-2 py-0.5 rounded-md capitalize border ${relationshipColor}`}>
          {npc.relationship_label || npc.relationship_type.replace(/_/g, ' ')}
        </span>
        {npc.relationship_status && npc.relationship_status !== 'active' && (
          <span className="text-xs px-2 py-0.5 bg-gray-500/15 text-gray-400 rounded capitalize">
            {npc.relationship_status}
          </span>
        )}
        {/* Actions */}
        {(onEdit || onDelete) && (
          <div className="ml-auto flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <button onClick={onEdit} className="p-1 text-gray-500 hover:text-purple-400">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}
            {onDelete && (
              <button onClick={onDelete} className="p-1 text-gray-500 hover:text-red-400">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Emoji fields - ALL VISIBLE (matching import preview exactly) */}
      {npc.occupation && (
        <p className="text-xs text-gray-500 mt-1">{EMOJIS.occupation} {npc.occupation}</p>
      )}
      {npc.location && (
        <p className="text-xs text-gray-500 mt-1">{EMOJIS.location} {npc.location}</p>
      )}
      {npc.faction_affiliations && npc.faction_affiliations.length > 0 && (
        <p className="text-xs text-gray-500 mt-1">{EMOJIS.faction} {npc.faction_affiliations.join(', ')}</p>
      )}
      {npc.needs && (
        <p className="text-xs text-gray-500 mt-1">{EMOJIS.needs} Needs: {npc.needs}</p>
      )}
      {npc.can_provide && (
        <p className="text-xs text-gray-500 mt-1">{EMOJIS.canProvide} Can provide: {npc.can_provide}</p>
      )}
      {npc.goals && (
        <p className="text-xs text-gray-500 mt-1">{EMOJIS.goals} Goals: {npc.goals}</p>
      )}
      {npc.secrets && (
        <p className="text-xs text-amber-400/70 mt-1">{EMOJIS.secrets} Secrets: {npc.secrets}</p>
      )}

      {/* Personality traits as chips */}
      {npc.personality_traits && npc.personality_traits.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {npc.personality_traits.map((trait, i) => (
            <span key={i} className="text-xs px-2 py-0.5 bg-white/[0.04] text-gray-400 rounded-md">
              {trait}
            </span>
          ))}
        </div>
      )}

      {/* Full notes - always visible */}
      {npc.full_notes && (
        <div className="mt-2 pt-2 border-t border-white/[0.06]">
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Full Notes:
          </p>
          <div className="text-xs text-gray-400">
            {renderMarkdown(npc.full_notes)}
          </div>
        </div>
      )}
    </div>
  )
}

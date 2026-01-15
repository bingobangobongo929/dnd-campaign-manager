'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  User,
  MapPin,
  Users,
  Target,
  Gift,
  Eye,
  ChevronDown,
  ChevronUp,
  Briefcase,
  Sparkles,
  Edit2,
  Trash2,
} from 'lucide-react'
import type { VaultCharacterRelationship } from '@/types/database'

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
  other: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
}

export function NPCCard({ npc, onEdit, onDelete }: NPCCardProps) {
  const [expanded, setExpanded] = useState(false)

  const relationshipColor = RELATIONSHIP_COLORS[npc.relationship_type] || RELATIONSHIP_COLORS.other
  const hasExpandableContent = npc.full_notes || npc.goals || npc.secrets || npc.needs || npc.can_provide

  // Parse full_notes into bullet points if it contains line breaks
  const renderNotes = (notes: string | null) => {
    if (!notes) return null

    const lines = notes.split('\n').filter(line => line.trim())

    if (lines.length > 1) {
      return (
        <ul className="space-y-1.5">
          {lines.map((line, i) => {
            const cleanLine = line.replace(/^[-•*]\s*/, '').trim()
            if (!cleanLine) return null
            return (
              <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                <span className="text-purple-400/70 mt-1 flex-shrink-0">•</span>
                <span>{cleanLine}</span>
              </li>
            )
          })}
        </ul>
      )
    }

    return <p className="text-sm text-gray-400">{notes}</p>
  }

  return (
    <div className="bg-[--bg-surface] rounded-xl border border-[--border] hover:border-[--arcane-purple]/30 transition-all duration-200 overflow-hidden">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Portrait */}
          {npc.related_image_url ? (
            <Image
              src={npc.related_image_url}
              alt={npc.related_name || 'NPC'}
              width={64}
              height={64}
              className="rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6 text-gray-500" />
            </div>
          )}

          {/* Name and badges */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-base font-semibold text-white/90">
                {npc.related_name}
              </h3>
              {npc.nickname && (
                <span className="text-sm text-gray-500 italic">"{npc.nickname}"</span>
              )}
            </div>

            {/* Relationship badge */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={`text-xs px-2 py-0.5 rounded-md capitalize border ${relationshipColor}`}>
                {npc.relationship_label || npc.relationship_type.replace(/_/g, ' ')}
              </span>
              {npc.relationship_status && npc.relationship_status !== 'active' && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-gray-500/15 text-gray-400 border border-gray-500/20 capitalize">
                  {npc.relationship_status}
                </span>
              )}
            </div>

            {/* Quick info row */}
            <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
              {npc.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>{npc.location}</span>
                </div>
              )}
              {npc.occupation && (
                <div className="flex items-center gap-1">
                  <Briefcase className="w-3 h-3" />
                  <span>{npc.occupation}</span>
                </div>
              )}
              {npc.faction_affiliations && npc.faction_affiliations.length > 0 && (
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>{npc.faction_affiliations.join(', ')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-1.5 text-gray-500 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-all"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Description / tagline */}
        {npc.description && (
          <p className="mt-3 text-sm text-gray-400 leading-relaxed">{npc.description}</p>
        )}
      </div>

      {/* Expandable details */}
      {hasExpandableContent && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full px-4 py-2 flex items-center justify-center gap-2 text-xs text-gray-500 hover:text-purple-400 bg-white/[0.02] hover:bg-white/[0.04] border-t border-[--border] transition-all"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Hide Details
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Show Details
              </>
            )}
          </button>

          {expanded && (
            <div className="px-4 pb-4 space-y-4 border-t border-[--border] bg-white/[0.01]">
              {/* Full Notes - the most important section */}
              {npc.full_notes && (
                <div className="pt-4">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Sparkles className="w-3 h-3" />
                    Notes & Details
                  </h4>
                  {renderNotes(npc.full_notes)}
                </div>
              )}

              {/* Needs */}
              {npc.needs && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Target className="w-3 h-3" />
                    What They Need
                  </h4>
                  <p className="text-sm text-gray-400">{npc.needs}</p>
                </div>
              )}

              {/* Can Provide */}
              {npc.can_provide && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Gift className="w-3 h-3" />
                    What They Can Provide
                  </h4>
                  <p className="text-sm text-gray-400">{npc.can_provide}</p>
                </div>
              )}

              {/* Goals */}
              {npc.goals && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Target className="w-3 h-3" />
                    Their Goals
                  </h4>
                  <p className="text-sm text-gray-400">{npc.goals}</p>
                </div>
              )}

              {/* Secrets */}
              {npc.secrets && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Eye className="w-3 h-3" />
                    Secrets
                  </h4>
                  <p className="text-sm text-gray-400">{npc.secrets}</p>
                </div>
              )}

              {/* Personality Traits */}
              {npc.personality_traits && npc.personality_traits.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                    Personality
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {npc.personality_traits.map((trait, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-1 bg-white/[0.04] text-gray-400 rounded-md"
                      >
                        {trait}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

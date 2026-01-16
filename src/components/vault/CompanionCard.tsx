'use client'

import Image from 'next/image'
import { Heart, Edit2, Trash2 } from 'lucide-react'
import type { VaultCharacterRelationship } from '@/types/database'

interface CompanionCardProps {
  companion: VaultCharacterRelationship
  onEdit?: () => void
  onDelete?: () => void
}

// Companion type colors (matching import preview)
const COMPANION_TYPE_COLORS: Record<string, string> = {
  familiar: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  pet: 'bg-pink-500/15 text-pink-400 border-pink-500/20',
  mount: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  animal_companion: 'bg-green-500/15 text-green-400 border-green-500/20',
  construct: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  other: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
}

export function CompanionCard({ companion, onEdit, onDelete }: CompanionCardProps) {
  const typeColor = COMPANION_TYPE_COLORS[companion.companion_type || 'pet'] || COMPANION_TYPE_COLORS.other

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3 hover:border-white/[0.1] transition-colors group">
      {/* Header row - matching import preview */}
      <div className="flex items-center gap-2">
        {/* Portrait thumbnail if available */}
        {companion.related_image_url ? (
          <Image
            src={companion.related_image_url}
            alt={companion.related_name || 'Companion'}
            width={32}
            height={32}
            className="rounded-lg object-cover flex-shrink-0"
          />
        ) : (
          <Heart className="w-4 h-4 text-pink-400" />
        )}
        <span className="font-medium text-white/90">{companion.related_name}</span>
        <span className={`text-xs px-2 py-0.5 rounded-md capitalize border ${typeColor}`}>
          {(companion.companion_type || 'pet').replace(/_/g, ' ')}
        </span>
        {companion.companion_species && (
          <span className="text-xs text-gray-500">({companion.companion_species})</span>
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

      {/* Description */}
      {companion.description && (
        <p className="text-xs text-gray-400 mt-2 whitespace-pre-wrap">{companion.description}</p>
      )}

      {/* Abilities with emoji (matching import preview) */}
      {companion.companion_abilities && (
        <p className="text-xs text-purple-400/80 mt-1">✨ Abilities: {companion.companion_abilities}</p>
      )}
    </div>
  )
}

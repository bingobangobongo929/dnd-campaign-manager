'use client'

import Image from 'next/image'
import { Heart, Sparkles, Edit2, Trash2 } from 'lucide-react'
import type { VaultCharacterRelationship } from '@/types/database'

interface CompanionCardProps {
  companion: VaultCharacterRelationship
  onEdit?: () => void
  onDelete?: () => void
}

// Companion type colors
const COMPANION_TYPE_COLORS: Record<string, string> = {
  familiar: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  pet: 'bg-pink-500/15 text-pink-400 border-pink-500/20',
  mount: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  animal_companion: 'bg-green-500/15 text-green-400 border-green-500/20',
}

export function CompanionCard({ companion, onEdit, onDelete }: CompanionCardProps) {
  const typeColor = COMPANION_TYPE_COLORS[companion.companion_type || 'pet'] || COMPANION_TYPE_COLORS.pet

  return (
    <div className="bg-[--bg-surface] rounded-xl border border-[--border] hover:border-[--arcane-purple]/30 transition-all duration-200 p-4">
      <div className="flex items-start gap-4">
        {/* Portrait */}
        {companion.related_image_url ? (
          <Image
            src={companion.related_image_url}
            alt={companion.related_name || 'Companion'}
            width={56}
            height={56}
            className="rounded-lg object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
            <Heart className="w-6 h-6 text-pink-400/50" />
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-base font-semibold text-white/90">
              {companion.related_name}
            </h3>
            {companion.companion_species && (
              <span className="text-sm text-gray-500">({companion.companion_species})</span>
            )}
          </div>

          {/* Type badge */}
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs px-2 py-0.5 rounded-md capitalize border ${typeColor}`}>
              {(companion.companion_type || 'pet').replace(/_/g, ' ')}
            </span>
          </div>

          {/* Description */}
          {companion.description && (
            <p className="text-sm text-gray-400 leading-relaxed">{companion.description}</p>
          )}

          {/* Abilities */}
          {companion.companion_abilities && (
            <div className="mt-2">
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                <Sparkles className="w-3 h-3" />
                <span>Abilities</span>
              </div>
              <p className="text-sm text-gray-400">{companion.companion_abilities}</p>
            </div>
          )}
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
    </div>
  )
}

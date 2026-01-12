'use client'

import { formatDistanceToNow } from 'date-fns'
import Image from 'next/image'
import { cn, getInitials } from '@/lib/utils'
import type { VaultCharacter } from '@/types/database'

interface CharacterCardProps {
  character: VaultCharacter
  onClick: () => void
  className?: string
}

export function CharacterCard({ character, onClick, className }: CharacterCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative w-full text-left rounded-xl overflow-hidden transition-all duration-200',
        'bg-[--bg-surface] border border-[--border]',
        'hover:border-[--arcane-purple]/50 hover:shadow-lg hover:shadow-[--arcane-purple]/10',
        'focus:outline-none focus:ring-2 focus:ring-[--arcane-purple] focus:ring-offset-2 focus:ring-offset-[--bg-base]',
        className
      )}
    >
      {/* Card layout: horizontal on larger cards */}
      <div className="flex">
        {/* Portrait */}
        <div className="relative w-24 h-24 flex-shrink-0 bg-[--bg-hover]">
          {character.image_url ? (
            <Image
              src={character.image_url}
              alt={character.name}
              fill
              className="object-cover"
              sizes="96px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-[--text-tertiary]">
                {getInitials(character.name)}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-3 min-w-0">
          {/* Header: Name + Type badge */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-sm font-semibold text-[--text-primary] truncate group-hover:text-[--arcane-purple] transition-colors">
              {character.name}
            </h3>
            <span
              className={cn(
                'flex-shrink-0 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded',
                character.type === 'pc'
                  ? 'bg-[--arcane-purple]/20 text-[--arcane-purple]'
                  : 'bg-[--arcane-gold]/20 text-[--arcane-gold]'
              )}
            >
              {character.type}
            </span>
          </div>

          {/* Summary */}
          <p className="text-xs text-[--text-secondary] line-clamp-2 leading-relaxed mb-2">
            {character.summary || 'No summary'}
          </p>

          {/* Date */}
          <p className="text-[10px] text-[--text-tertiary]">
            {formatDistanceToNow(new Date(character.updated_at), { addSuffix: true })}
          </p>
        </div>
      </div>
    </button>
  )
}

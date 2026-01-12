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
        'group relative w-full text-left rounded-2xl overflow-hidden transition-all duration-200',
        'bg-[#12121a] border border-[rgba(255,255,255,0.08)]',
        'hover:border-[rgba(139,92,246,0.4)] hover:shadow-[0_8px_32px_rgba(139,92,246,0.15)]',
        'focus:outline-none focus:ring-2 focus:ring-[--arcane-purple] focus:ring-offset-2 focus:ring-offset-[--bg-base]',
        className
      )}
    >
      {/* Portrait area */}
      <div className="relative w-full aspect-[4/3] bg-[#0a0a0f] overflow-hidden">
        {character.image_url ? (
          <Image
            src={character.image_url}
            alt={character.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1a1a24] to-[#0a0a0f]">
            <span className="text-5xl font-bold text-[#2a2a3a] select-none">
              {getInitials(character.name)}
            </span>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#12121a] via-transparent to-transparent opacity-60" />

        {/* Type badge */}
        <div
          className={cn(
            'absolute top-3 right-3 px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-lg',
            character.type === 'pc'
              ? 'bg-[rgba(139,92,246,0.9)] text-white'
              : 'bg-[rgba(212,168,67,0.9)] text-[#12121a]'
          )}
        >
          {character.type === 'pc' ? 'PC' : 'NPC'}
        </div>
      </div>

      {/* Content area */}
      <div className="p-5">
        {/* Name */}
        <h3 className="text-lg font-semibold text-[--text-primary] mb-2 line-clamp-1 group-hover:text-[--arcane-purple] transition-colors">
          {character.name}
        </h3>

        {/* Summary */}
        {character.summary ? (
          <p className="text-sm text-[--text-secondary] line-clamp-2 leading-relaxed mb-4">
            {character.summary}
          </p>
        ) : (
          <p className="text-sm text-[--text-tertiary] italic mb-4">
            No summary yet
          </p>
        )}

        {/* Footer with date */}
        <div className="flex items-center justify-between text-xs text-[--text-tertiary]">
          <span>
            Updated {formatDistanceToNow(new Date(character.updated_at), { addSuffix: true })}
          </span>
        </div>
      </div>
    </button>
  )
}

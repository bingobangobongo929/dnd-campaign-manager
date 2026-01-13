'use client'

import { useState } from 'react'
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
  const [imageError, setImageError] = useState(false)

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
      {/* Portrait - edge to edge */}
      <div className="relative w-full aspect-[16/9] bg-[--bg-hover]">
        {character.image_url && !imageError ? (
          <Image
            src={character.image_url}
            alt={character.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 33vw"
            onError={() => setImageError(true)}
            unoptimized={character.image_url.includes('.svg') || character.image_url.includes('dicebear')}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1a1a24] to-[#0a0a0f]">
            <span className="text-4xl font-bold text-[--text-tertiary] select-none">
              {getInitials(character.name)}
            </span>
          </div>
        )}
      </div>

      {/* Type badge - positioned relative to card (button has relative class) */}
      <span
        className={cn(
          'absolute px-4 py-2 text-base font-bold uppercase rounded-lg shadow-xl z-10',
          character.type === 'pc'
            ? 'bg-purple-600 text-white'
            : 'bg-gray-600 text-white'
        )}
        style={{ top: '16px', right: '16px' }}
      >
        {character.type}
      </span>

      {/* Content - WITH EXPLICIT 24px PADDING */}
      <div
        className="px-6 py-5"
        style={{ paddingLeft: '24px', paddingRight: '24px', paddingTop: '20px', paddingBottom: '20px' }}
      >
        {/* Name and status row */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-xl font-semibold text-[--text-primary] group-hover:text-[--arcane-purple] transition-colors">
            {character.name}
          </h3>
          {character.status && (
            <span
              className="flex-shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: `${character.status_color || '#8B5CF6'}20`,
                color: character.status_color || '#8B5CF6',
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: character.status_color || '#8B5CF6' }}
              />
              {character.status}
            </span>
          )}
        </div>

        {/* Race/Class info if available */}
        {(character.race || character.class) && (
          <p className="text-sm text-[--text-tertiary] mb-2">
            {[character.race, character.class].filter(Boolean).join(' • ')}
          </p>
        )}

        {/* Summary - fixed height for consistent cards */}
        <p className="text-base text-[--text-secondary] line-clamp-3 leading-snug min-h-[66px]">
          {character.summary || 'No summary yet'}
        </p>

        {/* Date - clear separation from summary */}
        <p className="text-xs text-[--text-muted] mt-5">
          Updated {formatDistanceToNow(new Date(character.updated_at), { addSuffix: true })}
        </p>
      </div>
    </button>
  )
}

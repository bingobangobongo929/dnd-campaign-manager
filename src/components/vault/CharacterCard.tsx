'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import Image from 'next/image'
import { Edit3, Share2, Star, MoreHorizontal } from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import type { VaultCharacter } from '@/types/database'

interface CharacterCardProps {
  character: VaultCharacter
  onClick: () => void
  onEdit?: () => void
  onShare?: () => void
  onPin?: () => void
  onContextMenu?: (e: React.MouseEvent) => void
  isPinned?: boolean
  className?: string
}

export function CharacterCard({
  character,
  onClick,
  onEdit,
  onShare,
  onPin,
  onContextMenu,
  isPinned,
  className
}: CharacterCardProps) {
  const [imageError, setImageError] = useState(false)

  return (
    <div
      className={cn(
        'group relative w-full text-left rounded-xl overflow-hidden transition-all duration-200',
        'bg-[--bg-surface] border border-[--border]',
        'hover:border-[--arcane-purple]/50 hover:shadow-lg hover:shadow-[--arcane-purple]/10',
        isPinned && 'ring-2 ring-amber-500/50',
        className
      )}
      onContextMenu={onContextMenu}
    >
      {/* Pinned indicator */}
      {isPinned && (
        <div className="absolute top-3 left-3 z-20">
          <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
        </div>
      )}

      {/* Hover action buttons */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onPin && (
          <button
            onClick={(e) => { e.stopPropagation(); onPin(); }}
            className={cn(
              'p-2 rounded-lg backdrop-blur-sm transition-colors',
              isPinned
                ? 'bg-amber-500/90 text-white hover:bg-amber-600'
                : 'bg-black/60 text-white/80 hover:bg-black/80 hover:text-white'
            )}
            title={isPinned ? 'Unpin' : 'Pin to top'}
          >
            <Star className={cn('w-4 h-4', isPinned && 'fill-current')} />
          </button>
        )}
        {onEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-2 rounded-lg bg-black/60 text-white/80 hover:bg-black/80 hover:text-white backdrop-blur-sm transition-colors"
            title="Edit"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        )}
        {onShare && (
          <button
            onClick={(e) => { e.stopPropagation(); onShare(); }}
            className="p-2 rounded-lg bg-black/60 text-white/80 hover:bg-black/80 hover:text-white backdrop-blur-sm transition-colors"
            title="Share"
          >
            <Share2 className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onContextMenu?.(e); }}
          className="p-2 rounded-lg bg-black/60 text-white/80 hover:bg-black/80 hover:text-white backdrop-blur-sm transition-colors"
          title="More options"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Main clickable area */}
      <button
        onClick={onClick}
        className="w-full text-left focus:outline-none focus:ring-2 focus:ring-[--arcane-purple] focus:ring-inset"
      >
        {/* Portrait - 2:3 aspect ratio for portrait orientation */}
        <div className="relative w-full aspect-[2/3] bg-[--bg-hover]">
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
              <span className="text-5xl font-bold text-[--text-tertiary] select-none">
                {getInitials(character.name)}
              </span>
            </div>
          )}

          {/* Gradient overlay at bottom for text readability */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

          {/* Type badge - bottom left of image */}
          <span
            className={cn(
              'absolute bottom-4 left-4 px-3 py-1.5 text-sm font-bold uppercase rounded-lg shadow-xl',
              character.type === 'pc'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-600 text-white'
            )}
          >
            {character.type}
          </span>

          {/* Status badge - bottom right of image */}
          {character.status && (
            <span
              className="absolute bottom-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shadow-xl backdrop-blur-sm"
              style={{
                backgroundColor: `${character.status_color || '#8B5CF6'}30`,
                color: character.status_color || '#8B5CF6',
                border: `1px solid ${character.status_color || '#8B5CF6'}50`,
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

        {/* Content */}
        <div className="p-5">
          {/* Name */}
          <h3 className="text-lg font-semibold text-[--text-primary] group-hover:text-[--arcane-purple] transition-colors mb-1">
            {character.name}
          </h3>

          {/* Race/Class info if available */}
          {(character.race || character.class) && (
            <p className="text-sm text-[--text-tertiary] mb-2">
              {[character.race, character.class].filter(Boolean).join(' • ')}
            </p>
          )}

          {/* Summary - fixed height for consistent cards */}
          <p className="text-sm text-[--text-secondary] line-clamp-2 leading-relaxed min-h-[40px]">
            {character.summary ? character.summary.replace(/<[^>]*>/g, '').substring(0, 100) : 'No summary yet'}
          </p>

          {/* Date */}
          <p className="text-xs text-[--text-muted] mt-3">
            Updated {formatDistanceToNow(new Date(character.updated_at), { addSuffix: true })}
          </p>
        </div>
      </button>
    </div>
  )
}

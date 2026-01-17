'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import Image from 'next/image'
import { Eye, Share2, Star, MoreHorizontal, BookOpen } from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import type { VaultCharacter } from '@/types/database'

interface CharacterCardProps {
  character: VaultCharacter
  onClick: () => void
  onView?: () => void
  onSessions?: () => void
  onShare?: () => void
  onPin?: () => void
  onContextMenu?: (e: React.MouseEvent) => void
  isPinned?: boolean
  className?: string
}

export function CharacterCard({
  character,
  onClick,
  onView,
  onSessions,
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
        'group relative w-full text-left rounded-xl overflow-hidden transition-all',
        'bg-gray-900/50 border border-white/[0.06]',
        'hover:border-purple-500/40',
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
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {onPin && (
          <button
            onClick={(e) => { e.stopPropagation(); onPin(); }}
            className={cn(
              'p-2 rounded-lg backdrop-blur-sm transition-colors',
              isPinned
                ? 'bg-amber-500 text-white hover:bg-amber-600'
                : 'bg-black/70 text-white hover:bg-purple-500'
            )}
            title={isPinned ? 'Unpin' : 'Pin to top'}
          >
            <Star className={cn('w-3.5 h-3.5', isPinned && 'fill-current')} />
          </button>
        )}
        {onView && (
          <button
            onClick={(e) => { e.stopPropagation(); onView(); }}
            className="p-2 rounded-lg bg-black/70 backdrop-blur-sm text-white hover:bg-purple-500 transition-colors"
            title="View"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        )}
        {onSessions && (
          <button
            onClick={(e) => { e.stopPropagation(); onSessions(); }}
            className="p-2 rounded-lg bg-black/70 backdrop-blur-sm text-white hover:bg-purple-500 transition-colors"
            title="Sessions"
          >
            <BookOpen className="w-3.5 h-3.5" />
          </button>
        )}
        {onShare && (
          <button
            onClick={(e) => { e.stopPropagation(); onShare(); }}
            className="p-2 rounded-lg bg-black/70 backdrop-blur-sm text-white hover:bg-purple-500 transition-colors"
            title="Share"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onContextMenu?.(e); }}
          className="p-2 rounded-lg bg-black/70 backdrop-blur-sm text-white hover:bg-purple-500 transition-colors"
          title="More options"
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main clickable area */}
      <button
        onClick={onClick}
        className="w-full text-left focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-inset"
      >
        {/* Portrait - 4:3 aspect ratio */}
        <div className="relative w-full aspect-[4/3]">
          {character.image_url && !imageError ? (
            <>
              <Image
                src={character.image_url}
                alt={character.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 33vw"
                onError={() => setImageError(true)}
                unoptimized={character.image_url.includes('.svg') || character.image_url.includes('dicebear')}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900/30 to-gray-900">
              <span className="text-5xl font-bold text-purple-400/30 select-none">
                {getInitials(character.name)}
              </span>
            </div>
          )}

          {/* Type badge - top left of image */}
          <div className="absolute top-3 left-3">
            <span
              className={cn(
                'px-2.5 py-1 text-xs font-semibold rounded-lg backdrop-blur-sm border',
                character.type === 'pc'
                  ? 'bg-black/60 text-purple-300 border-purple-500/30'
                  : 'bg-black/60 text-gray-300 border-gray-500/30'
              )}
            >
              {character.type === 'pc' ? 'Player Character' : 'NPC'}
            </span>
          </div>

          {/* Status badge - bottom right of image */}
          {character.status && (
            <div className="absolute bottom-3 right-3">
              <span
                className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium backdrop-blur-sm"
                style={{
                  backgroundColor: `${character.status_color || '#8B5CF6'}40`,
                  color: character.status_color || '#8B5CF6',
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: character.status_color || '#8B5CF6' }}
                />
                {character.status}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Name */}
          <h4 className="font-display font-semibold text-lg text-white truncate group-hover:text-purple-400 transition-colors">
            {character.name}
          </h4>

          {/* Race/Class info if available */}
          {(character.race || character.class) && (
            <p className="text-sm text-gray-400 mt-1">
              {[character.race, character.class].filter(Boolean).join(' • ')}
            </p>
          )}

          {/* Summary */}
          {character.summary && (
            <p className="text-sm text-gray-400 mt-2 line-clamp-2">
              {character.summary.replace(/<[^>]*>/g, '').substring(0, 100)}
            </p>
          )}

          {/* Date */}
          <p className="text-xs text-gray-500 mt-3">
            Updated {formatDistanceToNow(new Date(character.updated_at), { addSuffix: true })}
          </p>
        </div>
      </button>
    </div>
  )
}

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

  // Strip HTML and limit summary length
  const summaryText = character.summary
    ? character.summary.replace(/<[^>]*>/g, '').substring(0, 300)
    : null

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
      {/* Pinned ribbon - top left corner */}
      {isPinned && (
        <div className="absolute top-0 left-0 z-20">
          <div className="w-12 h-12 overflow-hidden">
            <div className="absolute top-[6px] left-[-20px] w-[60px] bg-amber-500 text-center transform -rotate-45 shadow-sm">
              <Star className="w-3 h-3 text-white fill-white mx-auto" />
            </div>
          </div>
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
              {/* Subtle vignette overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900/40 to-gray-900">
              <span className="text-6xl font-bold text-purple-400/40 select-none">
                {getInitials(character.name)}
              </span>
            </div>
          )}

          {/* Status badge - bottom right of image */}
          {character.status && (
            <div className="absolute bottom-3 right-3">
              <span
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium backdrop-blur-sm shadow-lg"
                style={{
                  backgroundColor: `${character.status_color || '#8B5CF6'}90`,
                  color: 'white',
                }}
              >
                <span
                  className="w-2 h-2 rounded-full bg-white/80"
                />
                {character.status}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Name and Race/Class */}
          <div className="mb-2">
            <h4 className="font-display font-semibold text-lg text-white group-hover:text-purple-400 transition-colors leading-tight">
              {character.name}
            </h4>
            {(character.race || character.class) && (
              <p className="text-xs text-purple-400/70 mt-0.5 font-medium">
                {[character.race, character.class].filter(Boolean).join(' • ')}
              </p>
            )}
          </div>

          {/* Summary - more room, 3 lines */}
          {summaryText && (
            <p className="text-sm text-gray-400 line-clamp-3 leading-relaxed">
              {summaryText}
            </p>
          )}

          {/* Date - more subtle */}
          <p className="text-[11px] text-gray-600 mt-3">
            Updated {formatDistanceToNow(new Date(character.updated_at), { addSuffix: true })}
          </p>
        </div>
      </button>
    </div>
  )
}

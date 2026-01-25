'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import Image from 'next/image'
import { Eye, Share2, Star, MoreHorizontal, BookOpen, Link, Clock, Download, Sparkles } from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import type { VaultCharacter } from '@/types/database'

type CharacterSourceType = 'original' | 'linked' | 'session_0' | 'export'

const SOURCE_TYPE_CONFIG: Record<CharacterSourceType, {
  icon: typeof Link
  label: string
  shortLabel: string
  color: string
  bgColor: string
}> = {
  original: {
    icon: Sparkles,
    label: 'Original',
    shortLabel: 'Original',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
  },
  linked: {
    icon: Link,
    label: 'In-Play',
    shortLabel: 'In-Play',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
  },
  session_0: {
    icon: Clock,
    label: 'Session 0',
    shortLabel: 'S0',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
  },
  export: {
    icon: Download,
    label: 'Export',
    shortLabel: 'Export',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
  },
}

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

  // Use detail_image_url (2:3) if available, fallback to image_url
  const imageUrl = (character as any).detail_image_url || character.image_url

  // Strip HTML - no char limit since we use line-clamp
  const summaryText = character.summary
    ? character.summary.replace(/<[^>]*>/g, '')
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

      {/* Action buttons - always visible on mobile, hover on desktop */}
      <div className="absolute top-2 right-2 z-20 flex items-center gap-1 md:gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        {onPin && (
          <button
            onClick={(e) => { e.stopPropagation(); onPin(); }}
            className={cn(
              'p-2.5 md:p-2 rounded-lg backdrop-blur-sm transition-colors min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center',
              isPinned
                ? 'bg-amber-500 text-white active:bg-amber-600 md:hover:bg-amber-600'
                : 'bg-black/70 text-white active:bg-purple-500 md:hover:bg-purple-500'
            )}
            title={isPinned ? 'Unpin' : 'Pin to top'}
          >
            <Star className={cn('w-4 h-4 md:w-3.5 md:h-3.5', isPinned && 'fill-current')} />
          </button>
        )}
        {onView && (
          <button
            onClick={(e) => { e.stopPropagation(); onView(); }}
            className="p-2.5 md:p-2 rounded-lg bg-black/70 backdrop-blur-sm text-white active:bg-purple-500 md:hover:bg-purple-500 transition-colors min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center"
            title="View"
          >
            <Eye className="w-4 h-4 md:w-3.5 md:h-3.5" />
          </button>
        )}
        {onSessions && (
          <button
            onClick={(e) => { e.stopPropagation(); onSessions(); }}
            className="p-2.5 md:p-2 rounded-lg bg-black/70 backdrop-blur-sm text-white active:bg-purple-500 md:hover:bg-purple-500 transition-colors min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center"
            title="Sessions"
          >
            <BookOpen className="w-4 h-4 md:w-3.5 md:h-3.5" />
          </button>
        )}
        {onShare && (
          <button
            onClick={(e) => { e.stopPropagation(); onShare(); }}
            className="p-2.5 md:p-2 rounded-lg bg-black/70 backdrop-blur-sm text-white active:bg-purple-500 md:hover:bg-purple-500 transition-colors min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center"
            title="Share"
          >
            <Share2 className="w-4 h-4 md:w-3.5 md:h-3.5" />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onContextMenu?.(e); }}
          className="p-2.5 md:p-2 rounded-lg bg-black/70 backdrop-blur-sm text-white active:bg-purple-500 md:hover:bg-purple-500 transition-colors min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center"
          title="More options"
        >
          <MoreHorizontal className="w-4 h-4 md:w-3.5 md:h-3.5" />
        </button>
      </div>

      {/* Main clickable area */}
      <button
        onClick={onClick}
        className="w-full text-left focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-inset"
      >
        {/* Portrait - 2:3 aspect ratio (800x1200) */}
        <div className="relative w-full aspect-[2/3] overflow-hidden">
          {imageUrl && !imageError ? (
            <>
              <Image
                src={imageUrl}
                alt={character.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 33vw"
                onError={() => setImageError(true)}
                unoptimized={imageUrl.includes('.svg') || imageUrl.includes('dicebear')}
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

          {/* Source type badge - top left of image (below pinned ribbon) */}
          {character.source_type && character.source_type !== 'original' && (
            <div className="absolute top-3 left-3 z-10">
              {(() => {
                const config = SOURCE_TYPE_CONFIG[character.source_type as CharacterSourceType]
                const Icon = config.icon
                return (
                  <span
                    className={cn(
                      'flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium backdrop-blur-sm shadow-lg',
                      config.bgColor,
                      config.color
                    )}
                    title={character.source_campaign_name ? `${config.label} • ${character.source_campaign_name}` : config.label}
                  >
                    <Icon className="w-3 h-3" />
                    {config.shortLabel}
                  </span>
                )
              })()}
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

          {/* Summary - 4 lines to fit full descriptions */}
          {summaryText && (
            <p className="text-sm text-gray-400 line-clamp-4 leading-relaxed">
              {summaryText}
            </p>
          )}

          {/* Campaign source info */}
          {character.source_campaign_name && character.source_type !== 'original' && (
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-gray-500">
              <span>From: {character.source_campaign_name}</span>
              {character.source_session_number != null && (
                <span className="text-gray-600">• Session {character.source_session_number}</span>
              )}
            </div>
          )}

          {/* Date - more subtle */}
          <p className="text-[11px] text-gray-600 mt-2">
            Updated {formatDistanceToNow(new Date(character.updated_at), { addSuffix: true })}
          </p>
        </div>
      </button>
    </div>
  )
}

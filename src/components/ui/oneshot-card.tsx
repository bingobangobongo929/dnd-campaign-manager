'use client'

import Image from 'next/image'
import { Clock, Users, Pencil, Trash2, Play, Scroll } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Oneshot, OneshotGenreTag, OneshotRun } from '@/types/database'

interface OneshotCardProps {
  oneshot: Oneshot
  genreTags: OneshotGenreTag[]
  runs?: OneshotRun[]
  onClick: () => void
  onEdit: () => void
  onDelete: () => void
  onRun?: () => void
  animationDelay?: number
}

export function OneshotCard({
  oneshot,
  genreTags,
  runs = [],
  onClick,
  onEdit,
  onDelete,
  onRun,
  animationDelay = 0,
}: OneshotCardProps) {
  // Get the genre tags for this oneshot
  const tags = genreTags.filter(tag => oneshot.genre_tag_ids?.includes(tag.id))

  return (
    <div
      className="oneshot-card group relative bg-[--bg-elevated] rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:translate-y-[-4px] hover:shadow-xl hover:shadow-purple-500/10 border border-white/[0.06] hover:border-purple-500/30"
      style={{
        animation: `slideInUp 0.5s ease-out ${animationDelay}ms both`,
      }}
      onClick={onClick}
    >
      {/* Movie Poster Style Image - Taller aspect ratio */}
      <div className="relative aspect-[2/3] bg-gradient-to-br from-[--bg-surface] to-[--bg-elevated] overflow-hidden">
        {oneshot.image_url ? (
          <Image
            src={oneshot.image_url}
            alt={oneshot.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, 250px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900/30 to-indigo-900/30">
            <Scroll className="w-16 h-16 text-purple-400/30" />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        {/* Run count badge */}
        {runs.length > 0 && (
          <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-md text-xs text-white/80 flex items-center gap-1">
            <Play className="w-3 h-3" />
            {runs.length} run{runs.length !== 1 ? 's' : ''}
          </div>
        )}

        {/* Bottom content overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          {/* Genre Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.slice(0, 3).map(tag => (
                <span
                  key={tag.id}
                  className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded"
                  style={{
                    backgroundColor: `${tag.color}25`,
                    color: tag.color,
                    border: `1px solid ${tag.color}40`,
                  }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <h3 className="font-display text-lg font-bold text-white leading-tight line-clamp-2 mb-2">
            {oneshot.title}
          </h3>

          {/* Tagline */}
          {oneshot.tagline && (
            <p className="text-xs text-white/60 line-clamp-2 mb-3">{oneshot.tagline}</p>
          )}

          {/* Meta info */}
          <div className="flex items-center gap-3 text-xs text-white/50">
            {oneshot.level && (
              <span className="flex items-center gap-1">
                Lvl {oneshot.level}
              </span>
            )}
            {(oneshot.player_count_min || oneshot.player_count_max) && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {oneshot.player_count_min}-{oneshot.player_count_max}
              </span>
            )}
            {oneshot.estimated_duration && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {oneshot.estimated_duration}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons - show on hover */}
      <div className="absolute top-3 left-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onEdit()
          }}
          className="p-2 bg-black/60 backdrop-blur-sm rounded-lg hover:bg-purple-500/80 transition-colors"
          title="Edit"
        >
          <Pencil className="w-4 h-4 text-white" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="p-2 bg-black/60 backdrop-blur-sm rounded-lg hover:bg-red-500/80 transition-colors"
          title="Delete"
        >
          <Trash2 className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Run button - bottom right on hover */}
      {onRun && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRun()
          }}
          className="absolute bottom-4 right-4 p-3 bg-purple-600 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-purple-500 hover:scale-110 shadow-lg"
          title="Start Run"
        >
          <Play className="w-5 h-5 text-white" fill="white" />
        </button>
      )}
    </div>
  )
}

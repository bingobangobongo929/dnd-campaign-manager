'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Play, AlertCircle, User, Swords, Scroll } from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'

interface TemplateCardProps {
  save: {
    id: string
    source_type: string
    source_name: string
    source_image_url: string | null
    saved_version: number
    update_available?: boolean
    latest_available_version?: number
    started_playing_at?: string | null
  }
  attributionName?: string
  onStartPlaying: () => void
  onUpdate?: () => void
  className?: string
}

export function TemplateCard({
  save,
  attributionName,
  onStartPlaying,
  onUpdate,
  className
}: TemplateCardProps) {
  const [imageError, setImageError] = useState(false)

  const getTypeIcon = () => {
    switch (save.source_type) {
      case 'campaign':
        return Swords
      case 'character':
        return User
      case 'oneshot':
        return Scroll
      default:
        return Swords
    }
  }

  const getTypeLabel = () => {
    switch (save.source_type) {
      case 'campaign':
        return 'Campaign'
      case 'character':
        return 'Character'
      case 'oneshot':
        return 'One-Shot'
      default:
        return 'Template'
    }
  }

  const TypeIcon = getTypeIcon()
  const hasStarted = !!save.started_playing_at

  return (
    <div
      className={cn(
        'group relative w-full text-left rounded-xl overflow-hidden transition-all',
        'bg-gray-900/50 border border-white/[0.06]',
        'hover:border-purple-500/40',
        className
      )}
    >
      {/* Update Available Badge */}
      {save.update_available && (
        <div className="absolute top-2 left-2 z-20">
          <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/90 text-white text-xs font-medium rounded-lg">
            <AlertCircle className="w-3 h-3" />
            Update
          </div>
        </div>
      )}

      {/* Start Playing Button - appears on hover */}
      {!hasStarted && (
        <div className="absolute top-2 right-2 z-20 flex items-center gap-1 md:gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onStartPlaying(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors"
            title="Start Playing"
          >
            <Play className="w-3.5 h-3.5" />
            Start
          </button>
        </div>
      )}

      {/* Card Content - Clickable Area */}
      <button
        onClick={onStartPlaying}
        className="w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded-xl"
      >
        {/* Image Section - 4:3 aspect */}
        <div className="relative aspect-[4/3] bg-gray-800/50 overflow-hidden">
          {save.source_image_url && !imageError ? (
            <Image
              src={save.source_image_url}
              alt={save.source_name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900/40 to-gray-900/60">
              <div className="text-3xl font-bold text-purple-400/60">
                {getInitials(save.source_name)}
              </div>
            </div>
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Type Badge */}
          <div className="absolute bottom-2 left-2">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg">
              <TypeIcon className="w-3 h-3 text-purple-400" />
              <span className="text-xs font-medium text-white/80">{getTypeLabel()}</span>
            </div>
          </div>

          {/* Version Badge */}
          <div className="absolute bottom-2 right-2">
            <div className="px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg">
              <span className="text-xs font-medium text-white/60">v{save.saved_version}</span>
            </div>
          </div>
        </div>

        {/* Text Content */}
        <div className="p-3">
          <h3 className="font-semibold text-white/90 truncate text-sm group-hover:text-purple-300 transition-colors">
            {save.source_name}
          </h3>

          {attributionName && (
            <p className="text-xs text-gray-500 mt-1 truncate">
              by {attributionName}
            </p>
          )}

          {/* Status */}
          {hasStarted && (
            <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
              <Play className="w-3 h-3" />
              In Progress
            </p>
          )}
        </div>
      </button>

      {/* Update Available Action */}
      {save.update_available && onUpdate && (
        <div className="px-3 pb-3">
          <button
            onClick={(e) => { e.stopPropagation(); onUpdate(); }}
            className="w-full py-2 text-xs font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg transition-colors"
          >
            Update to v{save.latest_available_version}
          </button>
        </div>
      )}
    </div>
  )
}

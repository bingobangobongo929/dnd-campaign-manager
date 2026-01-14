'use client'

import { Edit, Trash2, CheckCircle, Pause, Archive, Play } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Campaign } from '@/types/database'

interface CampaignCardProps {
  campaign: Campaign
  onClick: () => void
  onEdit: () => void
  onDelete: () => void
  animationDelay?: number
}

const STATUS_CONFIG = {
  active: { label: 'Active', icon: Play, color: 'bg-emerald-500/90', textColor: 'text-emerald-100' },
  completed: { label: 'Completed', icon: CheckCircle, color: 'bg-purple-500/90', textColor: 'text-purple-100' },
  hiatus: { label: 'On Hiatus', icon: Pause, color: 'bg-amber-500/90', textColor: 'text-amber-100' },
  archived: { label: 'Archived', icon: Archive, color: 'bg-gray-500/90', textColor: 'text-gray-100' },
} as const

export function CampaignCard({
  campaign,
  onClick,
  onEdit,
  onDelete,
  animationDelay = 0,
}: CampaignCardProps) {
  return (
    <div
      className="card card-campaign group animate-slide-in-up"
      style={{ animationDelay: `${animationDelay}ms` }}
      onClick={onClick}
    >
      {/* Image area with gradient */}
      <div className="card-campaign-image">
        {campaign.image_url ? (
          <img
            src={campaign.image_url}
            alt={campaign.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className="w-16 h-16 text-[--text-tertiary] opacity-30"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
        )}

        {/* Status badge - top right */}
        {campaign.status && campaign.status !== 'active' && (
          <div className="absolute top-3 right-3 z-10">
            {(() => {
              const config = STATUS_CONFIG[campaign.status]
              const Icon = config.icon
              return (
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${config.color} backdrop-blur-sm`}>
                  <Icon className={`w-3.5 h-3.5 ${config.textColor}`} />
                  <span className={`text-xs font-medium ${config.textColor}`}>{config.label}</span>
                </div>
              )
            })()}
          </div>
        )}

        {/* Hover action buttons - top left like oneshot cards */}
        <div
          className="absolute top-3 left-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onEdit}
            className="p-2 bg-black/60 backdrop-blur-sm rounded-lg hover:bg-purple-500/80 transition-colors"
            title="Edit"
          >
            <Edit className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 bg-black/60 backdrop-blur-sm rounded-lg hover:bg-red-500/80 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="card-campaign-content">
        <div className="flex-1 min-w-0">
          <span className="card-campaign-system">{campaign.game_system}</span>
          <h3 className="card-campaign-title truncate">{campaign.name}</h3>
          {campaign.description && (
            <p className="text-sm text-[--text-secondary] line-clamp-2 mt-1">
              {campaign.description}
            </p>
          )}
          <p className="card-campaign-meta mt-2">
            Updated {formatDate(campaign.updated_at)}
          </p>
        </div>
      </div>
    </div>
  )
}

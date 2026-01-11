'use client'

import { Edit, Trash2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Campaign } from '@/types/database'

interface CampaignCardProps {
  campaign: Campaign
  onClick: () => void
  onEdit: () => void
  onDelete: () => void
  animationDelay?: number
}

export function CampaignCard({
  campaign,
  onClick,
  onEdit,
  onDelete,
  animationDelay = 0,
}: CampaignCardProps) {
  return (
    <div
      className="card card-campaign animate-slide-in-up"
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
      </div>

      {/* Content area */}
      <div className="card-campaign-content">
        <div className="flex items-start justify-between">
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

          {/* Action buttons */}
          <div
            className="flex items-center gap-1 ml-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="btn-ghost btn-icon w-8 h-8"
              onClick={onEdit}
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              className="btn-ghost btn-icon w-8 h-8 text-[--arcane-ember]"
              onClick={onDelete}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

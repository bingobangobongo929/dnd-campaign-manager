'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Calendar, Users, Gamepad2, Share2, Pencil } from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import type { Campaign } from '@/types/database'

interface CampaignHeaderWidgetProps {
  campaign: Campaign
  sessionCount: number
  memberCount: number
  isDm: boolean
  onShare?: () => void
  className?: string
}

export function CampaignHeaderWidget({
  campaign,
  sessionCount,
  memberCount,
  isDm,
  onShare,
  className,
}: CampaignHeaderWidgetProps) {
  const startDate = new Date(campaign.created_at)
  const formattedDate = startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

  // Calculate campaign duration
  const now = new Date()
  const months = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
  const durationText = months < 1 ? 'New' : months === 1 ? '1 month' : `${months} months`

  return (
    <div className={cn("bg-[#0a0a0f] border border-white/[0.08] rounded-xl overflow-hidden", className)}>
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Campaign Image */}
          <div className="flex-shrink-0">
            {campaign.image_url ? (
              <Image
                src={campaign.image_url}
                alt={campaign.name}
                width={80}
                height={80}
                className="rounded-xl object-cover w-20 h-20"
              />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-purple-600/30 to-purple-800/30 flex items-center justify-center text-purple-300 font-bold text-xl">
                {getInitials(campaign.name)}
              </div>
            )}
          </div>

          {/* Campaign Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-white truncate">{campaign.name}</h2>
                <p className="text-sm text-gray-400 mt-0.5">
                  {campaign.game_system || 'TTRPG'}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isDm && (
                  <Link
                    href={`/campaigns/${campaign.id}/settings`}
                    className="p-2 text-gray-400 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
                    title="Edit Campaign"
                  >
                    <Pencil className="w-4 h-4" />
                  </Link>
                )}
                <button
                  onClick={onShare}
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
                  title="Share Campaign"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Description */}
            {campaign.description && (
              <p className="text-sm text-gray-300 mt-2 line-clamp-2">
                {campaign.description}
              </p>
            )}

            {/* Stats Row */}
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-400">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>Started {formattedDate}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Gamepad2 className="w-4 h-4" />
                <span>{sessionCount} {sessionCount === 1 ? 'Session' : 'Sessions'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                <span>{memberCount} {memberCount === 1 ? 'Player' : 'Players'}</span>
              </div>
              <span className="text-gray-600">•</span>
              <span>{durationText}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

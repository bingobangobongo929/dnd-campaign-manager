'use client'

import Link from 'next/link'
import Image from 'next/image'
import {
  User,
  ChevronRight,
  Eye,
  FileText,
  ExternalLink,
} from 'lucide-react'
import { DashboardWidget, WidgetEmptyState } from './DashboardWidget'
import { cn, getInitials } from '@/lib/utils'
import type { Character } from '@/types/database'

interface MyCharacterWidgetProps {
  campaignId: string
  character: Character | null
  vaultCharacterId?: string | null
  className?: string
}

export function MyCharacterWidget({
  campaignId,
  character,
  vaultCharacterId,
  className,
}: MyCharacterWidgetProps) {
  if (!character) {
    return (
      <DashboardWidget
        title="My Character"
        icon={User}
        className={className}
      >
        <WidgetEmptyState
          icon={User}
          title="No character assigned yet"
          description="Your DM will assign you a character, or you can link one from your Character Vault."
          action={{
            label: 'Browse Vault Characters',
            href: '/vault',
          }}
        />
      </DashboardWidget>
    )
  }

  return (
    <DashboardWidget
      title="My Character"
      icon={User}
      className={className}
    >
      <div className="bg-gradient-to-br from-purple-600/10 to-purple-600/5 border border-purple-500/20 rounded-xl p-4">
        <div className="flex items-start gap-4">
          {/* Character Image */}
          {character.image_url ? (
            <Image
              src={character.image_url}
              alt={character.name}
              width={80}
              height={80}
              className="rounded-xl object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-purple-600/30 flex items-center justify-center text-purple-300 font-bold text-2xl">
              {getInitials(character.name)}
            </div>
          )}

          {/* Character Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white truncate">
              {character.name}
            </h3>
            <p className="text-sm text-gray-400">
              {character.race && character.class
                ? `${character.race} ${character.class}`
                : character.role || 'Player Character'}
            </p>
            {character.summary && (
              <p className="text-sm text-gray-300 mt-2 line-clamp-2">
                {character.summary}
              </p>
            )}
            {character.status && (
              <span
                className="inline-block mt-2 px-2 py-0.5 text-xs rounded-full"
                style={{
                  backgroundColor: `${character.status_color || '#6B7280'}20`,
                  color: character.status_color || '#9CA3AF',
                }}
              >
                {character.status}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Link
            href={`/campaigns/${campaignId}/canvas`}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-300 bg-white/[0.05] hover:bg-white/[0.08] rounded-lg transition-colors"
          >
            <Eye className="w-4 h-4" />
            View on Canvas
          </Link>
          <Link
            href={`/campaigns/${campaignId}/sessions`}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-300 bg-white/[0.05] hover:bg-white/[0.08] rounded-lg transition-colors"
          >
            <FileText className="w-4 h-4" />
            Add Session Notes
          </Link>
          {vaultCharacterId && (
            <Link
              href={`/vault/${vaultCharacterId}`}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-300 bg-white/[0.05] hover:bg-white/[0.08] rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open in Vault
            </Link>
          )}
        </div>
      </div>
    </DashboardWidget>
  )
}

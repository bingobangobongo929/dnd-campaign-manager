'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  User,
  ChevronRight,
  Eye,
  FileText,
  ExternalLink,
  Sparkles,
  X,
} from 'lucide-react'
import { DashboardWidget, WidgetEmptyState } from './DashboardWidget'
import { CharacterClaiming } from '@/components/campaign/CharacterClaiming'
import { cn, getInitials } from '@/lib/utils'
import type { Character, VaultCharacter } from '@/types/database'

// Get localStorage key for dismissing claim banner
function getClaimDismissKey(characterId: string): string {
  return `claim-dismissed-${characterId}`
}

interface MyCharacterWidgetProps {
  campaignId: string
  character: Character | null
  vaultCharacterId?: string | null
  isDesignatedForUser?: boolean
  userVaultCharacters?: Pick<VaultCharacter, 'id' | 'name' | 'image_url'>[]
  onCharacterClaimed?: (vaultCharacterId: string) => void
  className?: string
}

export function MyCharacterWidget({
  campaignId,
  character,
  vaultCharacterId,
  isDesignatedForUser = false,
  userVaultCharacters = [],
  onCharacterClaimed,
  className,
}: MyCharacterWidgetProps) {
  const [claimedVaultId, setClaimedVaultId] = useState<string | null>(null)
  const [dismissedClaim, setDismissedClaim] = useState(true) // Start true to prevent flash

  // Load dismissed state from localStorage on mount
  useEffect(() => {
    if (character?.id) {
      const key = getClaimDismissKey(character.id)
      const dismissed = localStorage.getItem(key) === 'true'
      setDismissedClaim(dismissed)
    } else {
      setDismissedClaim(false)
    }
  }, [character?.id])

  // Persist dismiss to localStorage
  const handleDismiss = () => {
    if (character?.id) {
      localStorage.setItem(getClaimDismissKey(character.id), 'true')
    }
    setDismissedClaim(true)
  }

  // Use the claimed ID if we just claimed, otherwise use the passed prop
  const effectiveVaultId = claimedVaultId || vaultCharacterId

  // Show claim banner if: character exists, not linked to vault, designated for user, not dismissed
  const showClaimBanner = character &&
    !effectiveVaultId &&
    isDesignatedForUser &&
    !dismissedClaim

  const handleClaimed = (newVaultId: string) => {
    setClaimedVaultId(newVaultId)
    // Clear dismiss state since they claimed it
    if (character?.id) {
      localStorage.removeItem(getClaimDismissKey(character.id))
    }
    onCharacterClaimed?.(newVaultId)
  }

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
      <div className="space-y-4">
        {/* Claim Banner - shown when character can be claimed */}
        {showClaimBanner && (
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 relative">
            <button
              onClick={() => handleDismiss()}
              className="absolute top-2 right-2 p-1 text-gray-500 hover:text-gray-300 transition-colors"
              title="Dismiss for now"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-3 pr-6">
              <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-white">
                  Add {character.name} to your personal vault!
                </h4>
                <p className="text-sm text-gray-400 mt-1">
                  Your DM assigned this character to you. Add them to your vault to:
                </p>
                <ul className="text-sm text-gray-400 mt-2 space-y-1">
                  <li>• View and share your character anytime</li>
                  <li>• Keep them after the campaign ends</li>
                  <li>• Track your journey across games</li>
                </ul>
                <CharacterClaiming
                  campaignId={campaignId}
                  character={character}
                  isDesignatedForUser={true}
                  userVaultCharacters={userVaultCharacters}
                  onClaimed={handleClaimed}
                  renderTrigger={(onClick) => (
                    <div className="flex gap-2 mt-3">
                      <button onClick={onClick} className="btn btn-primary btn-sm">
                        <Sparkles className="w-4 h-4 mr-1.5" />
                        Add to Vault
                      </button>
                      <button
                        onClick={() => handleDismiss()}
                        className="btn btn-ghost btn-sm text-gray-400"
                      >
                        Maybe Later
                      </button>
                    </div>
                  )}
                />
              </div>
            </div>
          </div>
        )}

        {/* Character Card */}
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
            {effectiveVaultId && (
              <Link
                href={`/vault/${effectiveVaultId}`}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-300 bg-white/[0.05] hover:bg-white/[0.08] rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Open in Vault
              </Link>
            )}
          </div>
        </div>
      </div>
    </DashboardWidget>
  )
}

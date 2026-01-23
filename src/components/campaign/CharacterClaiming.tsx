'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  UserPlus,
  Link as LinkIcon,
  Loader2,
  Check,
  ArrowRight,
  BookOpen,
  Users,
  Sparkles,
} from 'lucide-react'
import { Modal } from '@/components/ui'
import { toast } from 'sonner'
import { cn, getInitials } from '@/lib/utils'
import type { Character, VaultCharacter } from '@/types/database'

interface CharacterClaimingProps {
  campaignId: string
  character: Character
  isDesignatedForUser: boolean
  userVaultCharacters?: VaultCharacter[]
  onClaimed?: (vaultCharacterId: string) => void
}

export function CharacterClaiming({
  campaignId,
  character,
  isDesignatedForUser,
  userVaultCharacters = [],
  onClaimed,
}: CharacterClaimingProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [claimMode, setClaimMode] = useState<'new' | 'link'>('new')
  const [selectedVaultCharacterId, setSelectedVaultCharacterId] = useState('')
  const [processing, setProcessing] = useState(false)

  // Don't show if already claimed
  if (character.vault_character_id) {
    return null
  }

  // Show claim prompt if designated for this user
  if (!isDesignatedForUser) {
    return null
  }

  const handleClaim = async () => {
    setProcessing(true)
    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/characters/${character.id}/claim`,
        { method: 'POST' }
      )

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to claim character')
        return
      }

      toast.success('Character claimed to your vault!')
      setModalOpen(false)
      onClaimed?.(data.vaultCharacterId)
    } catch (error) {
      console.error('Failed to claim character:', error)
      toast.error('Failed to claim character')
    } finally {
      setProcessing(false)
    }
  }

  const handleLink = async () => {
    if (!selectedVaultCharacterId) {
      toast.error('Please select a vault character')
      return
    }

    setProcessing(true)
    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/characters/${character.id}/link`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vaultCharacterId: selectedVaultCharacterId }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to link character')
        return
      }

      toast.success('Character linked to your vault!')
      setModalOpen(false)
      onClaimed?.(selectedVaultCharacterId)
    } catch (error) {
      console.error('Failed to link character:', error)
      toast.error('Failed to link character')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <>
      {/* Claim Banner */}
      <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center flex-shrink-0">
            <UserPlus className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-white">This character was created for you!</h3>
            <p className="text-sm text-gray-400 mt-1">
              Claim {character.name} to your vault to manage their story, add details, and track their journey across campaigns.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="btn btn-primary mt-3"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Claim Character
            </button>
          </div>
        </div>
      </div>

      {/* Claim Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Claim Character"
        description={`Add ${character.name} to your character vault`}
        size="md"
      >
        <div className="space-y-6">
          {/* Character Preview */}
          <div className="flex items-center gap-4 p-4 bg-white/[0.02] rounded-lg border border-[--border]">
            {character.image_url ? (
              <Image
                src={character.image_url}
                alt={character.name}
                width={64}
                height={64}
                className="rounded-lg object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-purple-600/20 flex items-center justify-center text-purple-400 font-bold text-xl">
                {getInitials(character.name)}
              </div>
            )}
            <div>
              <h4 className="font-medium text-white">{character.name}</h4>
              {character.short_description && (
                <p className="text-sm text-gray-400 mt-0.5">{character.short_description}</p>
              )}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <label className="form-label">How would you like to claim?</label>

            {/* Option 1: New vault character */}
            <button
              onClick={() => setClaimMode('new')}
              className={cn(
                "w-full p-4 rounded-lg border text-left transition-colors",
                claimMode === 'new'
                  ? "bg-purple-500/10 border-purple-500/30"
                  : "bg-white/[0.02] border-[--border] hover:border-purple-500/30"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  claimMode === 'new' ? "bg-purple-600/20" : "bg-white/[0.05]"
                )}>
                  <UserPlus className={cn(
                    "w-5 h-5",
                    claimMode === 'new' ? "text-purple-400" : "text-gray-400"
                  )} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white">Create new vault character</p>
                  <p className="text-sm text-gray-500">
                    Start fresh with a copy of this character in your vault
                  </p>
                </div>
                {claimMode === 'new' && <Check className="w-5 h-5 text-purple-400" />}
              </div>
            </button>

            {/* Option 2: Link existing */}
            {userVaultCharacters.length > 0 && (
              <button
                onClick={() => setClaimMode('link')}
                className={cn(
                  "w-full p-4 rounded-lg border text-left transition-colors",
                  claimMode === 'link'
                    ? "bg-blue-500/10 border-blue-500/30"
                    : "bg-white/[0.02] border-[--border] hover:border-blue-500/30"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    claimMode === 'link' ? "bg-blue-600/20" : "bg-white/[0.05]"
                  )}>
                    <LinkIcon className={cn(
                      "w-5 h-5",
                      claimMode === 'link' ? "text-blue-400" : "text-gray-400"
                    )} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">Link existing vault character</p>
                    <p className="text-sm text-gray-500">
                      Connect to a character already in your vault
                    </p>
                  </div>
                  {claimMode === 'link' && <Check className="w-5 h-5 text-blue-400" />}
                </div>
              </button>
            )}
          </div>

          {/* Vault character selector (for link mode) */}
          {claimMode === 'link' && userVaultCharacters.length > 0 && (
            <div className="form-group">
              <label className="form-label">Select vault character</label>
              <select
                value={selectedVaultCharacterId}
                onChange={(e) => setSelectedVaultCharacterId(e.target.value)}
                className="form-input"
              >
                <option value="">Choose a character...</option>
                {userVaultCharacters.map(vc => (
                  <option key={vc.id} value={vc.id}>
                    {vc.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Benefits info */}
          <div className="bg-white/[0.02] rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-gray-300">What you get:</p>
            <ul className="text-sm text-gray-400 space-y-1.5">
              <li className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-400" />
                Full character vault with detailed backstory, phases, and relationships
              </li>
              <li className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                Session 0 snapshot preserved for reference
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                AI-powered character intelligence and suggestions
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => setModalOpen(false)}
              disabled={processing}
              className="btn btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              onClick={claimMode === 'new' ? handleClaim : handleLink}
              disabled={processing || (claimMode === 'link' && !selectedVaultCharacterId)}
              className="btn btn-primary flex-1"
            >
              {processing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {claimMode === 'new' ? (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Claim to Vault
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-4 h-4 mr-2" />
                      Link Character
                    </>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}

// Compact indicator for campaign character cards
interface ClaimIndicatorProps {
  isDesignatedForUser: boolean
  isClaimed: boolean
  onClick?: () => void
}

export function ClaimIndicator({ isDesignatedForUser, isClaimed, onClick }: ClaimIndicatorProps) {
  if (isClaimed) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded">
        <LinkIcon className="w-3 h-3" />
        Linked
      </span>
    )
  }

  if (isDesignatedForUser) {
    return (
      <button
        onClick={onClick}
        className="inline-flex items-center gap-1 text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded hover:bg-purple-500/20 transition-colors"
      >
        <UserPlus className="w-3 h-3" />
        Claim
      </button>
    )
  }

  return null
}

// Banner shown on campaign dashboard for unclaimed characters
interface UnclaimedCharactersBannerProps {
  characters: Character[]
  campaignId: string
}

export function UnclaimedCharactersBanner({ characters, campaignId }: UnclaimedCharactersBannerProps) {
  const unclaimedCount = characters.filter(c =>
    c.type === 'pc' && !c.vault_character_id
  ).length

  if (unclaimedCount === 0) return null

  return (
    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
      <div className="flex items-center gap-3">
        <Users className="w-5 h-5 text-amber-400" />
        <div className="flex-1">
          <p className="text-sm text-amber-300">
            <strong>{unclaimedCount}</strong> player character{unclaimedCount > 1 ? 's' : ''} can be claimed
          </p>
        </div>
        <Link
          href={`/campaigns/${campaignId}/canvas`}
          className="text-sm text-amber-400 hover:text-amber-300 flex items-center gap-1"
        >
          View <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}

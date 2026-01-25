'use client'

import { useState, useEffect, ReactNode } from 'react'
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
  Clock,
  Play,
  Copy,
  CheckCircle,
} from 'lucide-react'
import { Modal } from '@/components/ui'
import { toast } from 'sonner'
import { cn, getInitials } from '@/lib/utils'
import type { Character, VaultCharacter } from '@/types/database'

interface CharacterClaimingProps {
  campaignId: string
  character: Character
  isDesignatedForUser: boolean
  userVaultCharacters?: Pick<VaultCharacter, 'id' | 'name' | 'image_url'>[]
  onClaimed?: (vaultCharacterId: string) => void
  // Optional render prop for custom trigger button
  renderTrigger?: (onClick: () => void) => ReactNode
}

export function CharacterClaiming({
  campaignId,
  character,
  isDesignatedForUser,
  userVaultCharacters = [],
  onClaimed,
  renderTrigger,
}: CharacterClaimingProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [successModalOpen, setSuccessModalOpen] = useState(false)
  const [claimMode, setClaimMode] = useState<'new' | 'link'>('new')
  const [selectedVaultCharacterId, setSelectedVaultCharacterId] = useState('')
  const [processing, setProcessing] = useState(false)
  // What to add to vault
  const [addInPlay, setAddInPlay] = useState(true)
  const [addSession0Copy, setAddSession0Copy] = useState(false)
  // Result tracking for success modal
  const [claimResult, setClaimResult] = useState<{
    vaultCharacterId: string
    inPlayAdded: boolean
    session0Added: boolean
  } | null>(null)

  // Don't render anything if already claimed
  if (character.vault_character_id) {
    return null
  }

  // Don't render if not designated for this user
  if (!isDesignatedForUser) {
    return null
  }

  const handleClaim = async () => {
    setProcessing(true)
    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/characters/${character.id}/claim`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            addInPlay,
            addSession0Copy,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to claim character')
        return
      }

      setClaimResult({
        vaultCharacterId: data.vaultCharacterId,
        inPlayAdded: addInPlay,
        session0Added: addSession0Copy,
      })
      setModalOpen(false)
      setSuccessModalOpen(true)
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

      setClaimResult({
        vaultCharacterId: selectedVaultCharacterId,
        inPlayAdded: true,
        session0Added: false,
      })
      setModalOpen(false)
      setSuccessModalOpen(true)
      onClaimed?.(selectedVaultCharacterId)
    } catch (error) {
      console.error('Failed to link character:', error)
      toast.error('Failed to link character')
    } finally {
      setProcessing(false)
    }
  }

  // If renderTrigger is provided, only render the modal (trigger is handled externally)
  if (renderTrigger) {
    return (
      <>
        {renderTrigger(() => setModalOpen(true))}
        <ClaimModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          character={character}
          claimMode={claimMode}
          setClaimMode={setClaimMode}
          userVaultCharacters={userVaultCharacters}
          selectedVaultCharacterId={selectedVaultCharacterId}
          setSelectedVaultCharacterId={setSelectedVaultCharacterId}
          addInPlay={addInPlay}
          setAddInPlay={setAddInPlay}
          addSession0Copy={addSession0Copy}
          setAddSession0Copy={setAddSession0Copy}
          processing={processing}
          onClaim={handleClaim}
          onLink={handleLink}
        />
        <SuccessModal
          isOpen={successModalOpen}
          onClose={() => setSuccessModalOpen(false)}
          character={character}
          result={claimResult}
          campaignId={campaignId}
        />
      </>
    )
  }

  // Default: render banner with modal
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

      <ClaimModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        character={character}
        claimMode={claimMode}
        setClaimMode={setClaimMode}
        userVaultCharacters={userVaultCharacters}
        selectedVaultCharacterId={selectedVaultCharacterId}
        setSelectedVaultCharacterId={setSelectedVaultCharacterId}
        addInPlay={addInPlay}
        setAddInPlay={setAddInPlay}
        addSession0Copy={addSession0Copy}
        setAddSession0Copy={setAddSession0Copy}
        processing={processing}
        onClaim={handleClaim}
        onLink={handleLink}
      />
      <SuccessModal
        isOpen={successModalOpen}
        onClose={() => setSuccessModalOpen(false)}
        character={character}
        result={claimResult}
        campaignId={campaignId}
      />
    </>
  )
}

// Claim Modal Component
interface ClaimModalProps {
  isOpen: boolean
  onClose: () => void
  character: Character
  claimMode: 'new' | 'link'
  setClaimMode: (mode: 'new' | 'link') => void
  userVaultCharacters: Pick<VaultCharacter, 'id' | 'name' | 'image_url'>[]
  selectedVaultCharacterId: string
  setSelectedVaultCharacterId: (id: string) => void
  addInPlay: boolean
  setAddInPlay: (v: boolean) => void
  addSession0Copy: boolean
  setAddSession0Copy: (v: boolean) => void
  processing: boolean
  onClaim: () => void
  onLink: () => void
}

function ClaimModal({
  isOpen,
  onClose,
  character,
  claimMode,
  setClaimMode,
  userVaultCharacters,
  selectedVaultCharacterId,
  setSelectedVaultCharacterId,
  addInPlay,
  setAddInPlay,
  addSession0Copy,
  setAddSession0Copy,
  processing,
  onClaim,
  onLink,
}: ClaimModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Add ${character.name} to Your Vault`}
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
            {character.summary && (
              <p className="text-sm text-gray-400 mt-0.5 line-clamp-2">{character.summary}</p>
            )}
          </div>
        </div>

        <div className="border-t border-[--border]" />

        {/* What to add */}
        <div className="space-y-4">
          <label className="form-label">What would you like to add to your vault?</label>

          {/* In-Play Version Option */}
          <label
            className={cn(
              "block p-4 rounded-lg border cursor-pointer transition-colors",
              addInPlay
                ? "bg-purple-500/10 border-purple-500/30"
                : "bg-white/[0.02] border-[--border] hover:border-purple-500/30"
            )}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={addInPlay}
                onChange={(e) => setAddInPlay(e.target.checked)}
                className="mt-1 accent-purple-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-purple-400" />
                  <span className="font-medium text-white">In-Play Version</span>
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  A synced copy connected to this campaign.
                </p>
                <ul className="text-xs text-gray-500 mt-2 space-y-1">
                  <li>• View your character anytime from your vault</li>
                  <li>• Automatically updates as the campaign progresses</li>
                  <li>• Most fields managed in campaign (view-only in vault)</li>
                  <li>• Private notes section that's just for you</li>
                </ul>
              </div>
            </div>
          </label>

          {/* Session 0 Copy Option */}
          <label
            className={cn(
              "block p-4 rounded-lg border cursor-pointer transition-colors",
              addSession0Copy
                ? "bg-blue-500/10 border-blue-500/30"
                : "bg-white/[0.02] border-[--border] hover:border-blue-500/30"
            )}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={addSession0Copy}
                onChange={(e) => setAddSession0Copy(e.target.checked)}
                className="mt-1 accent-blue-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span className="font-medium text-white">Session 0 Copy</span>
                  <span className="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded">Available</span>
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  A separate copy from before the campaign began.
                </p>
                <ul className="text-xs text-gray-500 mt-2 space-y-1">
                  <li>• Fully editable - entirely yours</li>
                  <li>• No connection to this campaign</li>
                  <li>• Use in other games or expand with more details</li>
                  <li>• Perfect for bringing to another campaign later</li>
                </ul>
              </div>
            </div>
          </label>

          {/* Tip */}
          <p className="text-xs text-gray-500 bg-white/[0.02] rounded-lg p-3">
            💡 You can select both! Many players keep an in-play version to track their journey AND a Session 0 copy for future adventures.
          </p>
        </div>

        {/* Link existing character option (if they have vault characters) */}
        {userVaultCharacters.length > 0 && (
          <>
            <div className="border-t border-[--border]" />
            <div className="space-y-3">
              <button
                onClick={() => setClaimMode(claimMode === 'link' ? 'new' : 'link')}
                className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2"
              >
                <LinkIcon className="w-4 h-4" />
                {claimMode === 'link' ? 'Create new instead' : 'Or link to existing vault character'}
              </button>

              {claimMode === 'link' && (
                <div className="form-group">
                  <label className="form-label">Select vault character to link</label>
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
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={processing}
            className="btn btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            onClick={claimMode === 'link' ? onLink : onClaim}
            disabled={processing || (!addInPlay && !addSession0Copy && claimMode === 'new') || (claimMode === 'link' && !selectedVaultCharacterId)}
            className="btn btn-primary flex-1"
          >
            {processing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Add to Vault
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// Success Modal Component
interface SuccessModalProps {
  isOpen: boolean
  onClose: () => void
  character: Character
  result: {
    vaultCharacterId: string
    inPlayAdded: boolean
    session0Added: boolean
  } | null
  campaignId: string
}

function SuccessModal({ isOpen, onClose, character, result, campaignId }: SuccessModalProps) {
  if (!result) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Added to Your Vault!"
      size="sm"
    >
      <div className="space-y-6 text-center">
        {/* Success Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <p className="text-gray-300">
          {character.name} has been added to your vault
        </p>

        {/* What was added */}
        <div className="bg-white/[0.02] rounded-lg p-4 text-left space-y-2">
          {result.inPlayAdded && (
            <div className="flex items-center gap-2 text-sm">
              <Check className="w-4 h-4 text-green-400" />
              <span className="text-gray-300">In-Play version added</span>
              <span className="text-xs text-gray-500 ml-auto">Vault → In-Play</span>
            </div>
          )}
          {result.session0Added && (
            <div className="flex items-center gap-2 text-sm">
              <Check className="w-4 h-4 text-green-400" />
              <span className="text-gray-300">Session 0 copy added</span>
              <span className="text-xs text-gray-500 ml-auto">Vault → My Characters</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="btn btn-secondary flex-1"
          >
            Stay in Campaign
          </button>
          <Link
            href={`/vault/${result.vaultCharacterId}`}
            className="btn btn-primary flex-1"
            onClick={onClose}
          >
            View in Vault
          </Link>
        </div>
      </div>
    </Modal>
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

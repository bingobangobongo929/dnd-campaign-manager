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
  Users,
  Sparkles,
  Clock,
  Play,
  CheckCircle,
  Download,
  AlertCircle,
  Info,
} from 'lucide-react'
import { Modal } from '@/components/ui'
import { toast } from 'sonner'
import { cn, getInitials } from '@/lib/utils'
import type { Character, VaultCharacter } from '@/types/database'

interface ExportStatus {
  session0Available: boolean
  session0Reason?: string
  currentSessionNumber: number
  existingExports: Array<{
    id: string
    name: string
    source_snapshot_date: string
    source_session_number: number | null
    source_type: 'session_0' | 'export'
  }>
  hasLinkedCharacter: boolean
  linkedVaultCharacterId: string | null
  campaignName?: string
}

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
  const [processing, setProcessing] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState(false)
  const [exportStatus, setExportStatus] = useState<ExportStatus | null>(null)

  // What to add to vault
  const [addLinked, setAddLinked] = useState(true)
  const [addSession0, setAddSession0] = useState(false)
  const [addCurrentExport, setAddCurrentExport] = useState(false)

  // Result tracking for success modal
  const [claimResult, setClaimResult] = useState<{
    vaultCharacterId: string
    linkedAdded: boolean
    session0Added: boolean
    currentExportAdded: boolean
  } | null>(null)

  // Link to existing character mode
  const [claimMode, setClaimMode] = useState<'new' | 'link'>('new')
  const [selectedVaultCharacterId, setSelectedVaultCharacterId] = useState('')

  // Fetch export status when modal opens
  useEffect(() => {
    if (modalOpen && !exportStatus) {
      fetchExportStatus()
    }
  }, [modalOpen])

  const fetchExportStatus = async () => {
    setLoadingStatus(true)
    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/characters/${character.id}/export`
      )
      if (response.ok) {
        const data = await response.json()
        setExportStatus(data)
        // If already has linked character, don't default to adding linked
        if (data.hasLinkedCharacter) {
          setAddLinked(false)
        }
      }
    } catch (error) {
      console.error('Failed to fetch export status:', error)
    } finally {
      setLoadingStatus(false)
    }
  }

  // Don't render anything if already claimed and has linked character
  if (character.vault_character_id && !renderTrigger) {
    return null
  }

  // Don't render if not designated for this user
  if (!isDesignatedForUser) {
    return null
  }

  const handleExport = async () => {
    setProcessing(true)
    const results: {
      vaultCharacterId: string | null
      linkedAdded: boolean
      session0Added: boolean
      currentExportAdded: boolean
    } = {
      vaultCharacterId: null,
      linkedAdded: false,
      session0Added: false,
      currentExportAdded: false,
    }

    try {
      // Create linked version
      if (addLinked && !exportStatus?.hasLinkedCharacter) {
        const response = await fetch(
          `/api/campaigns/${campaignId}/characters/${character.id}/export`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ exportType: 'linked' }),
          }
        )
        const data = await response.json()
        if (response.ok) {
          results.linkedAdded = true
          results.vaultCharacterId = data.vaultCharacterId
        } else {
          toast.error(data.error || 'Failed to create linked version')
        }
      }

      // Create Session 0 snapshot
      if (addSession0 && exportStatus?.session0Available) {
        const response = await fetch(
          `/api/campaigns/${campaignId}/characters/${character.id}/export`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ exportType: 'session_0' }),
          }
        )
        const data = await response.json()
        if (response.ok) {
          results.session0Added = true
          if (!results.vaultCharacterId) {
            results.vaultCharacterId = data.vaultCharacterId
          }
        } else {
          toast.error(data.error || 'Failed to create Session 0 snapshot')
        }
      }

      // Create current state export
      if (addCurrentExport) {
        const response = await fetch(
          `/api/campaigns/${campaignId}/characters/${character.id}/export`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ exportType: 'current' }),
          }
        )
        const data = await response.json()
        if (response.ok) {
          results.currentExportAdded = true
          if (!results.vaultCharacterId) {
            results.vaultCharacterId = data.vaultCharacterId
          }
        } else {
          toast.error(data.error || 'Failed to create export')
        }
      }

      if (results.vaultCharacterId) {
        setClaimResult({
          vaultCharacterId: results.vaultCharacterId,
          linkedAdded: results.linkedAdded,
          session0Added: results.session0Added,
          currentExportAdded: results.currentExportAdded,
        })
        setModalOpen(false)
        setSuccessModalOpen(true)
        onClaimed?.(results.vaultCharacterId)
      }
    } catch (error) {
      console.error('Failed to export character:', error)
      toast.error('Failed to add character to vault')
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
        linkedAdded: true,
        session0Added: false,
        currentExportAdded: false,
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

  const canSubmit = () => {
    if (claimMode === 'link') {
      return !!selectedVaultCharacterId
    }
    return addLinked || addSession0 || addCurrentExport
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
          exportStatus={exportStatus}
          loadingStatus={loadingStatus}
          claimMode={claimMode}
          setClaimMode={setClaimMode}
          userVaultCharacters={userVaultCharacters}
          selectedVaultCharacterId={selectedVaultCharacterId}
          setSelectedVaultCharacterId={setSelectedVaultCharacterId}
          addLinked={addLinked}
          setAddLinked={setAddLinked}
          addSession0={addSession0}
          setAddSession0={setAddSession0}
          addCurrentExport={addCurrentExport}
          setAddCurrentExport={setAddCurrentExport}
          processing={processing}
          canSubmit={canSubmit}
          onExport={handleExport}
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
              Add {character.name} to your vault to manage their story, add details, and track their journey across campaigns.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="btn btn-primary mt-3"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Add to Vault
            </button>
          </div>
        </div>
      </div>

      <ClaimModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        character={character}
        exportStatus={exportStatus}
        loadingStatus={loadingStatus}
        claimMode={claimMode}
        setClaimMode={setClaimMode}
        userVaultCharacters={userVaultCharacters}
        selectedVaultCharacterId={selectedVaultCharacterId}
        setSelectedVaultCharacterId={setSelectedVaultCharacterId}
        addLinked={addLinked}
        setAddLinked={setAddLinked}
        addSession0={addSession0}
        setAddSession0={setAddSession0}
        addCurrentExport={addCurrentExport}
        setAddCurrentExport={setAddCurrentExport}
        processing={processing}
        canSubmit={canSubmit}
        onExport={handleExport}
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
  exportStatus: ExportStatus | null
  loadingStatus: boolean
  claimMode: 'new' | 'link'
  setClaimMode: (mode: 'new' | 'link') => void
  userVaultCharacters: Pick<VaultCharacter, 'id' | 'name' | 'image_url'>[]
  selectedVaultCharacterId: string
  setSelectedVaultCharacterId: (id: string) => void
  addLinked: boolean
  setAddLinked: (v: boolean) => void
  addSession0: boolean
  setAddSession0: (v: boolean) => void
  addCurrentExport: boolean
  setAddCurrentExport: (v: boolean) => void
  processing: boolean
  canSubmit: () => boolean
  onExport: () => void
  onLink: () => void
}

function ClaimModal({
  isOpen,
  onClose,
  character,
  exportStatus,
  loadingStatus,
  claimMode,
  setClaimMode,
  userVaultCharacters,
  selectedVaultCharacterId,
  setSelectedVaultCharacterId,
  addLinked,
  setAddLinked,
  addSession0,
  setAddSession0,
  addCurrentExport,
  setAddCurrentExport,
  processing,
  canSubmit,
  onExport,
  onLink,
}: ClaimModalProps) {
  const session0Available = exportStatus?.session0Available ?? false
  const hasLinkedCharacter = exportStatus?.hasLinkedCharacter ?? false

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
            {exportStatus?.campaignName && (
              <p className="text-xs text-gray-500 mt-1">
                From: {exportStatus.campaignName}
                {exportStatus.currentSessionNumber > 0 && ` • Session ${exportStatus.currentSessionNumber}`}
              </p>
            )}
          </div>
        </div>

        {loadingStatus ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            <div className="border-t border-[--border]" />

            {/* What to add */}
            <div className="space-y-4">
              <label className="form-label">What would you like to add?</label>

              {/* In-Play Version (Linked) Option */}
              <label
                className={cn(
                  "block p-4 rounded-lg border cursor-pointer transition-colors",
                  hasLinkedCharacter
                    ? "bg-gray-500/5 border-gray-500/20 cursor-not-allowed"
                    : addLinked
                      ? "bg-purple-500/10 border-purple-500/30"
                      : "bg-white/[0.02] border-[--border] hover:border-purple-500/30"
                )}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={addLinked}
                    onChange={(e) => setAddLinked(e.target.checked)}
                    disabled={hasLinkedCharacter}
                    className="mt-1 accent-purple-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Play className="w-4 h-4 text-purple-400" />
                      <span className={cn("font-medium", hasLinkedCharacter ? "text-gray-500" : "text-white")}>
                        In-Play Version (Linked)
                      </span>
                      {hasLinkedCharacter && (
                        <span className="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded">
                          Already Added
                        </span>
                      )}
                    </div>
                    <p className={cn("text-sm mt-1", hasLinkedCharacter ? "text-gray-600" : "text-gray-400")}>
                      Synced with this campaign. Updates as the campaign progresses.
                    </p>
                    {!hasLinkedCharacter && (
                      <ul className="text-xs text-gray-500 mt-2 space-y-1">
                        <li>• View-only in vault (campaign controls it)</li>
                        <li>• See updates made by the DM</li>
                        <li>• Private notes section just for you</li>
                      </ul>
                    )}
                  </div>
                </div>
              </label>

              {/* Session 0 Snapshot Option */}
              <label
                className={cn(
                  "block p-4 rounded-lg border transition-colors",
                  !session0Available
                    ? "bg-gray-500/5 border-gray-500/20 cursor-not-allowed"
                    : addSession0
                      ? "bg-blue-500/10 border-blue-500/30 cursor-pointer"
                      : "bg-white/[0.02] border-[--border] hover:border-blue-500/30 cursor-pointer"
                )}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={addSession0}
                    onChange={(e) => setAddSession0(e.target.checked)}
                    disabled={!session0Available}
                    className="mt-1 accent-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <span className={cn("font-medium", !session0Available ? "text-gray-500" : "text-white")}>
                        Session 0 Snapshot
                      </span>
                      {session0Available ? (
                        <span className="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded">
                          Available
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500 bg-gray-500/10 px-2 py-0.5 rounded">
                          Not Available
                        </span>
                      )}
                    </div>
                    <p className={cn("text-sm mt-1", !session0Available ? "text-gray-600" : "text-gray-400")}>
                      Character state before campaign began.
                    </p>
                    {!session0Available && exportStatus?.session0Reason && (
                      <div className="flex items-start gap-2 mt-2 p-2 bg-amber-500/5 rounded text-xs text-amber-400">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{exportStatus.session0Reason}</span>
                      </div>
                    )}
                    {session0Available && (
                      <ul className="text-xs text-gray-500 mt-2 space-y-1">
                        <li>• Fully editable, not connected to campaign</li>
                        <li>• Use in other games or keep as backup</li>
                      </ul>
                    )}
                  </div>
                </div>
              </label>

              {/* Current State Export Option */}
              <label
                className={cn(
                  "block p-4 rounded-lg border cursor-pointer transition-colors",
                  addCurrentExport
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : "bg-white/[0.02] border-[--border] hover:border-emerald-500/30"
                )}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={addCurrentExport}
                    onChange={(e) => setAddCurrentExport(e.target.checked)}
                    className="mt-1 accent-emerald-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Download className="w-4 h-4 text-emerald-400" />
                      <span className="font-medium text-white">Current State Export</span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                      Snapshot of character as they are now.
                    </p>
                    <ul className="text-xs text-gray-500 mt-2 space-y-1">
                      <li>• Fully editable, not connected to campaign</li>
                      <li>• Take their journey to another game</li>
                    </ul>
                  </div>
                </div>
              </label>

              {/* Educational Tip */}
              <div className="flex items-start gap-2 p-3 bg-white/[0.02] rounded-lg text-xs text-gray-400">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-400" />
                <span>
                  You can take exports anytime - now, later, or when the campaign ends.
                  Many players wait until the end to capture their character's complete journey.
                </span>
              </div>
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
                onClick={claimMode === 'link' ? onLink : onExport}
                disabled={processing || !canSubmit()}
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
          </>
        )}
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
    linkedAdded: boolean
    session0Added: boolean
    currentExportAdded: boolean
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
          {result.linkedAdded && (
            <div className="flex items-center gap-2 text-sm">
              <Check className="w-4 h-4 text-green-400" />
              <span className="text-gray-300">In-Play version (linked)</span>
            </div>
          )}
          {result.session0Added && (
            <div className="flex items-center gap-2 text-sm">
              <Check className="w-4 h-4 text-green-400" />
              <span className="text-gray-300">Session 0 snapshot</span>
            </div>
          )}
          {result.currentExportAdded && (
            <div className="flex items-center gap-2 text-sm">
              <Check className="w-4 h-4 text-green-400" />
              <span className="text-gray-300">Current state export</span>
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

'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Users,
  Plus,
  FileUp,
  Loader2,
  Check,
  Info,
  BookOpen,
  Sparkles,
} from 'lucide-react'
import { Modal } from '@/components/ui'
import { cn, getInitials } from '@/lib/utils'
import type { VaultCharacter } from '@/types/database'

interface JoinWithCharacterModalProps {
  isOpen: boolean
  onClose: () => void
  campaignId: string
  campaignName: string
  onJoinComplete: () => void
}

export function JoinWithCharacterModal({
  isOpen,
  onClose,
  campaignId,
  campaignName,
  onJoinComplete,
}: JoinWithCharacterModalProps) {
  const [loading, setLoading] = useState(true)
  const [vaultCharacters, setVaultCharacters] = useState<VaultCharacter[]>([])
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load user's vault characters
  useEffect(() => {
    if (isOpen) {
      loadVaultCharacters()
    }
  }, [isOpen])

  const loadVaultCharacters = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/vault/characters')
      if (response.ok) {
        const data = await response.json()
        setVaultCharacters(data.characters || [])
      }
    } catch (err) {
      console.error('Failed to load vault characters:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    if (!selectedCharacterId) {
      setError('Please select a character')
      return
    }

    setJoining(true)
    setError(null)

    try {
      // Link the vault character to the campaign
      const response = await fetch(`/api/campaigns/${campaignId}/members/link-character`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vaultCharacterId: selectedCharacterId }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to join with character')
        return
      }

      onJoinComplete()
    } catch (err) {
      console.error('Failed to join with character:', err)
      setError('Failed to join with character')
    } finally {
      setJoining(false)
    }
  }

  const handleSkip = () => {
    // Join without a character - they can link one later
    onJoinComplete()
  }

  const selectedCharacter = vaultCharacters.find(c => c.id === selectedCharacterId)

  // Get campaign links count for each character
  const getCampaignCount = (character: VaultCharacter) => {
    const links = character.campaign_links as Array<{ campaign_id: string }> | null
    return links?.length || 0
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Join "${campaignName}" with Your Character`}
      size="lg"
    >
      <div className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        ) : (
          <>
            {/* Character Selection */}
            {vaultCharacters.length > 0 ? (
              <div className="space-y-4">
                <label className="form-label">Choose a character from your vault:</label>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto">
                  {vaultCharacters.map((character) => {
                    const campaignCount = getCampaignCount(character)
                    const isSelected = selectedCharacterId === character.id

                    return (
                      <button
                        key={character.id}
                        onClick={() => setSelectedCharacterId(character.id)}
                        className={cn(
                          "relative flex flex-col items-center p-4 rounded-xl border transition-all text-left",
                          isSelected
                            ? "bg-purple-500/10 border-purple-500/50 ring-2 ring-purple-500/30"
                            : "bg-white/[0.02] border-[--border] hover:border-purple-500/30"
                        )}
                      >
                        {/* Selection Indicator */}
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}

                        {/* Portrait */}
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

                        {/* Name & Info */}
                        <div className="mt-2 text-center w-full">
                          <p className="font-medium text-white truncate">{character.name}</p>
                          {(character.race || character.class) && (
                            <p className="text-xs text-gray-500 truncate">
                              {[character.race, character.class].filter(Boolean).join(' ')}
                            </p>
                          )}
                          {campaignCount > 0 ? (
                            <p className="text-xs text-purple-400 mt-1 flex items-center justify-center gap-1">
                              <BookOpen className="w-3 h-3" />
                              In {campaignCount} game{campaignCount > 1 ? 's' : ''}
                            </p>
                          ) : (
                            <p className="text-xs text-green-400 mt-1">Available</p>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 bg-white/[0.02] rounded-xl border border-[--border]">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-400" />
                </div>
                <p className="text-gray-400 mb-2">No characters in your vault yet</p>
                <p className="text-sm text-gray-500">Create one now or join without a character</p>
              </div>
            )}

            {/* Alternative Options */}
            <div className="flex flex-wrap gap-2 justify-center border-t border-[--border] pt-4">
              <Link
                href={`/vault/new?campaign=${campaignId}`}
                className="btn btn-ghost text-sm"
              >
                <Plus className="w-4 h-4" />
                Create New Character
              </Link>
              <Link
                href={`/vault/import?campaign=${campaignId}`}
                className="btn btn-ghost text-sm"
              >
                <FileUp className="w-4 h-4" />
                Import from PDF
              </Link>
            </div>

            {/* Info Box */}
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
              <h4 className="font-medium text-blue-300 flex items-center gap-2 mb-2">
                <Info className="w-4 h-4" />
                What happens when you join
              </h4>
              <ul className="text-sm text-gray-400 space-y-1.5">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  We create an "in-play copy" of your character for this campaign
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  Your original character stays in your vault, fully editable
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  The in-play copy syncs with the campaign as you play
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  A Session 0 snapshot preserves your character's starting state
                </li>
              </ul>
              <p className="text-xs text-gray-500 mt-3">
                Think of it like sending a version of your character on an adventure while the "real" one stays safe at home.
              </p>
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-400 text-center">{error}</p>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSkip}
                disabled={joining}
                className="btn btn-secondary flex-1"
              >
                Join Without Character
              </button>
              <button
                onClick={handleJoin}
                disabled={joining || !selectedCharacterId}
                className="btn btn-primary flex-1"
              >
                {joining ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Join with {selectedCharacter?.name || 'Character'}
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

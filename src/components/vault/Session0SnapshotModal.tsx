'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import {
  Clock,
  Loader2,
  User,
  X,
  Download,
  FileText,
} from 'lucide-react'
import { cn, getInitials, formatDate } from '@/lib/utils'
import { Modal } from '@/components/ui'
import type { VaultCharacter, CharacterSnapshot } from '@/types/database'

interface Session0SnapshotModalProps {
  isOpen: boolean
  onClose: () => void
  vaultCharacterId: string
  campaignId: string
  characterName: string
}

export function Session0SnapshotModal({
  isOpen,
  onClose,
  vaultCharacterId,
  campaignId,
  characterName,
}: Session0SnapshotModalProps) {
  const [loading, setLoading] = useState(true)
  const [snapshot, setSnapshot] = useState<CharacterSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadSnapshot()
    }
  }, [isOpen, vaultCharacterId, campaignId])

  const loadSnapshot = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        vaultCharacterId,
        campaignId,
        type: 'session_0',
      })

      const response = await fetch(`/api/vault/snapshot?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load snapshot')
      }

      setSnapshot(data.snapshot)
    } catch (err) {
      console.error('Snapshot load error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load snapshot')
    } finally {
      setLoading(false)
    }
  }

  const snapshotData = snapshot?.snapshot_data as VaultCharacter | null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Session 0 Snapshot"
      size="lg"
    >
      <div className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <X className="w-12 h-12 mx-auto mb-4 text-red-400/50" />
            <p className="text-red-400">{error}</p>
          </div>
        ) : !snapshot || !snapshotData ? (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 mx-auto mb-4 text-gray-400/50" />
            <h3 className="text-lg font-medium text-white mb-2">No Session 0 Snapshot</h3>
            <p className="text-gray-400 text-sm">
              No snapshot was created when this character joined the campaign.
              This may be because the character was created after the campaign started.
            </p>
          </div>
        ) : (
          <>
            {/* Info Banner */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-200">
                    This is {characterName} as they were before the campaign began.
                  </p>
                  <p className="text-xs text-amber-400/70 mt-1">
                    Captured {formatDate(snapshot.created_at)}
                  </p>
                </div>
              </div>
            </div>

            {/* Character Header */}
            <div className="flex gap-4">
              {/* Portrait */}
              <div className="flex-shrink-0">
                {snapshotData.image_url ? (
                  <Image
                    src={snapshotData.image_url}
                    alt={snapshotData.name}
                    width={80}
                    height={80}
                    className="rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-purple-600/20 flex items-center justify-center text-purple-400 font-bold text-2xl">
                    {getInitials(snapshotData.name)}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white">{snapshotData.name}</h3>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-400">
                  {snapshotData.race && <span>{snapshotData.race}</span>}
                  {snapshotData.class && (
                    <>
                      {snapshotData.race && <span>•</span>}
                      <span>{snapshotData.class}</span>
                    </>
                  )}
                  {snapshotData.level && (
                    <>
                      <span>•</span>
                      <span>Level {snapshotData.level}</span>
                    </>
                  )}
                </div>
                {snapshotData.status && (
                  <span
                    className="inline-block mt-2 px-2 py-0.5 text-xs font-medium rounded-full"
                    style={{
                      backgroundColor: `${snapshotData.status_color || '#8B5CF6'}20`,
                      color: snapshotData.status_color || '#8B5CF6',
                    }}
                  >
                    {snapshotData.status}
                  </span>
                )}
              </div>
            </div>

            {/* Character Details */}
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {/* Summary */}
              {snapshotData.summary && (
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Summary</h4>
                  <div
                    className="text-sm text-gray-300 prose prose-invert prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: snapshotData.summary }}
                  />
                </div>
              )}

              {/* Backstory */}
              {snapshotData.backstory && (
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Backstory</h4>
                  <div
                    className="text-sm text-gray-300 prose prose-invert prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: snapshotData.backstory }}
                  />
                </div>
              )}

              {/* Personality */}
              {snapshotData.personality && (
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Personality</h4>
                  <p className="text-sm text-gray-300 whitespace-pre-wrap">{snapshotData.personality}</p>
                </div>
              )}

              {/* Appearance */}
              {snapshotData.appearance && (
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Appearance</h4>
                  <p className="text-sm text-gray-300 whitespace-pre-wrap">{snapshotData.appearance}</p>
                </div>
              )}

              {/* Notes */}
              {snapshotData.notes && (
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Notes</h4>
                  <div
                    className="text-sm text-gray-300 prose prose-invert prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: snapshotData.notes }}
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t border-white/[0.06]">
              <button
                onClick={onClose}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

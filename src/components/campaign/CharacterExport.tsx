'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Download,
  Loader2,
  CheckCircle,
  Info,
  RefreshCw,
  Plus,
} from 'lucide-react'
import { Modal } from '@/components/ui'
import { toast } from 'sonner'
import { cn, getInitials } from '@/lib/utils'
import type { Character } from '@/types/database'

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

interface CharacterExportProps {
  campaignId: string
  character: Character
  onExported?: (vaultCharacterId: string) => void
}

export function CharacterExportButton({
  campaignId,
  character,
  onExported,
}: CharacterExportProps) {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="btn btn-secondary btn-sm"
        title="Export character snapshot to vault"
      >
        <Download className="w-4 h-4 mr-1" />
        Export
      </button>
      <CharacterExportModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        campaignId={campaignId}
        character={character}
        onExported={onExported}
      />
    </>
  )
}

interface CharacterExportModalProps {
  isOpen: boolean
  onClose: () => void
  campaignId: string
  character: Character
  onExported?: (vaultCharacterId: string) => void
}

export function CharacterExportModal({
  isOpen,
  onClose,
  campaignId,
  character,
  onExported,
}: CharacterExportModalProps) {
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [exportStatus, setExportStatus] = useState<ExportStatus | null>(null)
  const [exportMode, setExportMode] = useState<'new' | 'overwrite'>('new')
  const [selectedExportId, setSelectedExportId] = useState('')
  const [success, setSuccess] = useState(false)
  const [resultId, setResultId] = useState<string | null>(null)

  // Fetch export status when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchExportStatus()
      setSuccess(false)
      setResultId(null)
    }
  }, [isOpen])

  const fetchExportStatus = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/characters/${character.id}/export`
      )
      if (response.ok) {
        const data = await response.json()
        setExportStatus(data)
        // Default to overwrite if there are existing exports
        if (data.existingExports?.length > 0) {
          setExportMode('overwrite')
          setSelectedExportId(data.existingExports[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to fetch export status:', error)
      toast.error('Failed to load export options')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    setProcessing(true)
    try {
      const body: { exportType: string; overwriteVaultCharacterId?: string } = {
        exportType: 'current',
      }

      if (exportMode === 'overwrite' && selectedExportId) {
        body.overwriteVaultCharacterId = selectedExportId
      }

      const response = await fetch(
        `/api/campaigns/${campaignId}/characters/${character.id}/export`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to export character')
        return
      }

      setSuccess(true)
      setResultId(data.vaultCharacterId)
      onExported?.(data.vaultCharacterId)
    } catch (error) {
      console.error('Failed to export character:', error)
      toast.error('Failed to export character')
    } finally {
      setProcessing(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (success && resultId) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Export Complete!"
        size="sm"
      >
        <div className="space-y-6 text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div>
            <p className="text-gray-300 mb-2">
              {character.name} has been exported to your vault
            </p>
            {exportStatus?.currentSessionNumber && (
              <p className="text-sm text-gray-500">
                Captured at Session {exportStatus.currentSessionNumber}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="btn btn-secondary flex-1">
              Done
            </button>
            <Link
              href={`/vault/${resultId}`}
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Export ${character.name}`}
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
          <div className="flex-1">
            <h4 className="font-medium text-white">{character.name}</h4>
            {exportStatus?.campaignName && (
              <p className="text-sm text-gray-400 mt-0.5">
                {exportStatus.campaignName}
                {exportStatus.currentSessionNumber > 0 && (
                  <span className="text-gray-500"> • Session {exportStatus.currentSessionNumber}</span>
                )}
              </p>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-400">
              Take a snapshot of your character as they are right now.
              This creates a fully editable copy in your vault.
            </p>

            {/* Educational Tip */}
            <div className="flex items-start gap-2 p-3 bg-white/[0.02] rounded-lg text-xs text-gray-400">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-400" />
              <span>
                You can export anytime. Many players wait until the campaign ends
                to capture their character's complete journey - but it's up to you!
              </span>
            </div>

            {/* Existing Exports */}
            {exportStatus?.existingExports && exportStatus.existingExports.length > 0 && (
              <div className="space-y-3">
                <div className="p-3 bg-white/[0.02] rounded-lg border border-[--border]">
                  <p className="text-sm text-gray-400 mb-2">
                    You have previous exports from this campaign:
                  </p>
                  <div className="space-y-1">
                    {exportStatus.existingExports.map(exp => (
                      <div key={exp.id} className="text-sm text-gray-300 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>{exp.name}</span>
                        <span className="text-gray-500">-</span>
                        <span className="text-gray-500">{formatDate(exp.source_snapshot_date)}</span>
                        {exp.source_session_number != null && (
                          <span className="text-gray-600">(Session {exp.source_session_number})</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Export Mode Selection */}
                <div className="space-y-2">
                  <label
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      exportMode === 'new'
                        ? "bg-emerald-500/10 border-emerald-500/30"
                        : "bg-white/[0.02] border-[--border] hover:border-emerald-500/30"
                    )}
                  >
                    <input
                      type="radio"
                      name="exportMode"
                      value="new"
                      checked={exportMode === 'new'}
                      onChange={() => setExportMode('new')}
                      className="mt-1 accent-emerald-500"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <Plus className="w-4 h-4 text-emerald-400" />
                        <span className="font-medium text-white">Create new export</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Add another snapshot to your vault
                      </p>
                    </div>
                  </label>

                  <label
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      exportMode === 'overwrite'
                        ? "bg-amber-500/10 border-amber-500/30"
                        : "bg-white/[0.02] border-[--border] hover:border-amber-500/30"
                    )}
                  >
                    <input
                      type="radio"
                      name="exportMode"
                      value="overwrite"
                      checked={exportMode === 'overwrite'}
                      onChange={() => setExportMode('overwrite')}
                      className="mt-1 accent-amber-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-amber-400" />
                        <span className="font-medium text-white">Update existing export</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Replace a previous snapshot
                      </p>
                      {exportMode === 'overwrite' && (
                        <select
                          value={selectedExportId}
                          onChange={(e) => setSelectedExportId(e.target.value)}
                          className="form-input form-input-sm mt-2"
                        >
                          {exportStatus.existingExports.map(exp => (
                            <option key={exp.id} value={exp.id}>
                              {exp.name} - {formatDate(exp.source_snapshot_date)}
                              {exp.source_session_number != null && ` (Session ${exp.source_session_number})`}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </label>
                </div>
              </div>
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
                onClick={handleExport}
                disabled={processing || (exportMode === 'overwrite' && !selectedExportId)}
                className="btn btn-primary flex-1"
              >
                {processing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Export Character
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

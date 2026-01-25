'use client'

import { useState } from 'react'
import { EyeOff, Loader2, AlertTriangle } from 'lucide-react'
import { Modal } from '@/components/ui'

interface UnpublishTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  contentType: 'campaign' | 'character' | 'oneshot'
  contentId: string
  contentName: string
  saveCount?: number
  onUnpublished?: () => void
}

export function UnpublishTemplateModal({
  isOpen,
  onClose,
  contentType,
  contentId,
  contentName,
  saveCount = 0,
  onUnpublished,
}: UnpublishTemplateModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUnpublish = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/templates/unpublish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType,
          contentId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unpublish')
      }

      onUnpublished?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unpublish')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Unpublish Template?"
      size="md"
    >
      <div className="space-y-6">
        <p className="text-gray-300">
          Remove "{contentName}" from public discovery?
        </p>

        {/* What Happens */}
        <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl space-y-3">
          <p className="text-sm font-medium text-white">What happens when you unpublish:</p>
          <ul className="space-y-2 text-sm text-gray-400">
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              Removed from Discover (no new saves)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              Your template becomes private again
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              You can re-publish anytime
            </li>
          </ul>
        </div>

        {/* Warning if people have saved */}
        {saveCount > 0 && (
          <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-amber-200 font-medium">
                {saveCount} {saveCount === 1 ? 'person has' : 'people have'} already saved this template.
              </p>
              <p className="text-amber-200/70 mt-1">
                Their copies will NOT be removed - they keep what they saved.
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUnpublish}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
            Unpublish
          </button>
        </div>
      </div>
    </Modal>
  )
}

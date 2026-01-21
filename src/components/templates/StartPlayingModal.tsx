'use client'

import { useState } from 'react'
import { Play, Loader2, Info } from 'lucide-react'
import { Modal, Input } from '@/components/ui'
import { useRouter } from 'next/navigation'

interface StartPlayingModalProps {
  isOpen: boolean
  onClose: () => void
  saveId: string
  templateName: string
  contentType: 'campaign' | 'character' | 'oneshot'
  creatorName?: string | null
  version?: number
}

export function StartPlayingModal({
  isOpen,
  onClose,
  saveId,
  templateName,
  contentType,
  creatorName,
  version,
}: StartPlayingModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customName, setCustomName] = useState('')

  const handleStartPlaying = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/templates/start-playing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saveId,
          customName: customName.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create copy')
      }

      // Navigate to the new content
      const { instanceId, contentType: type } = data
      let path = '/'
      switch (type) {
        case 'campaign':
          path = `/campaigns/${instanceId}/canvas`
          break
        case 'character':
          path = `/vault/${instanceId}`
          break
        case 'oneshot':
          path = `/oneshots/${instanceId}`
          break
      }

      router.push(path)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start playing')
    } finally {
      setLoading(false)
    }
  }

  const getContentTypeLabel = () => {
    switch (contentType) {
      case 'campaign': return 'campaign'
      case 'character': return 'character'
      case 'oneshot': return 'one-shot'
    }
  }

  const getDefaultName = () => {
    return templateName
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Start Playing"
      size="md"
    >
      <div className="space-y-6">
        {/* Info Banner */}
        <div className="flex items-start gap-3 p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
          <Play className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
          <div className="text-sm text-gray-300">
            This will create your own copy of "{templateName}" that you can edit and play however you like.
            {creatorName && (
              <span className="block mt-1 text-gray-400">
                Template by {creatorName}
                {version && <span className="text-gray-500"> (v{version})</span>}
              </span>
            )}
          </div>
        </div>

        {/* Custom Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">
            Name your {getContentTypeLabel()}
          </label>
          <Input
            placeholder={getDefaultName()}
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
          />
          <p className="text-xs text-gray-500">
            Leave blank to use the original name
          </p>
        </div>

        {/* What Gets Copied Info */}
        <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-300">What's included</span>
          </div>
          <ul className="text-xs text-gray-400 space-y-1 ml-6">
            {contentType === 'campaign' && (
              <>
                <li>All characters (PCs and NPCs)</li>
                <li>Tags and character relationships</li>
                <li>Canvas groups and world maps</li>
                <li>Campaign lore and media</li>
              </>
            )}
            {contentType === 'character' && (
              <>
                <li>All character details and backstory</li>
                <li>Images and relationships</li>
                <li>Spells and writings</li>
              </>
            )}
            {contentType === 'oneshot' && (
              <>
                <li>All one-shot content</li>
                <li>Session plan and NPCs</li>
                <li>Handouts and twists</li>
              </>
            )}
          </ul>
          <p className="text-xs text-gray-500 mt-2 ml-6">
            Your copy will show attribution to the original creator.
          </p>
        </div>

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
            onClick={handleStartPlaying}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Start Playing
          </button>
        </div>
      </div>
    </Modal>
  )
}

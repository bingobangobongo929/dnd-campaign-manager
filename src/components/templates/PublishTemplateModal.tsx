'use client'

import { useState } from 'react'
import { Sparkles, Loader2, Info } from 'lucide-react'
import { Modal, Input, Textarea, Toggle } from '@/components/ui'

interface PublishTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  contentType: 'campaign' | 'character' | 'oneshot'
  contentId: string
  contentName: string
  isUpdate?: boolean
  currentVersion?: number
  onPublished?: (version: number) => void
}

export function PublishTemplateModal({
  isOpen,
  onClose,
  contentType,
  contentId,
  contentName,
  isUpdate = false,
  currentVersion = 0,
  onPublished,
}: PublishTemplateModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    allowSave: true,
    attributionName: '',
    templateDescription: '',
    versionName: '',
    versionNotes: '',
  })

  const handlePublish = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/templates/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType,
          contentId,
          allowSave: formData.allowSave,
          attributionName: formData.attributionName || null,
          templateDescription: formData.templateDescription || null,
          versionName: formData.versionName || null,
          versionNotes: formData.versionNotes || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to publish')
      }

      onPublished?.(data.snapshot.version)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish')
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

  const newVersion = currentVersion + 1

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isUpdate ? 'Publish Update' : 'Publish as Template'}
      size="lg"
    >
      <div className="space-y-6">
        {/* Info Banner */}
        <div className="flex items-start gap-3 p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl">
          <Sparkles className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
          <div className="text-sm text-gray-300">
            {isUpdate ? (
              <>
                Publishing an update creates version {newVersion} of your template.
                Users who have saved previous versions will be notified of the update.
              </>
            ) : (
              <>
                Publishing "{contentName}" as a template creates a Session 0 ready version
                that others can save and use for their own games.
              </>
            )}
          </div>
        </div>

        {/* Version Info (for updates) */}
        {isUpdate && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">Current version:</span>
            <span className="px-2 py-0.5 bg-gray-800 text-gray-300 rounded text-sm">
              v{currentVersion}
            </span>
            <span className="text-gray-500">→</span>
            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-sm">
              v{newVersion}
            </span>
          </div>
        )}

        {/* Version Name (optional) */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">
            Version Name (optional)
          </label>
          <Input
            placeholder='e.g., "v1.0", "Holiday Update"'
            value={formData.versionName}
            onChange={(e) => setFormData({ ...formData, versionName: e.target.value })}
          />
        </div>

        {/* Version Notes (for updates) */}
        {isUpdate && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              What's Changed (optional)
            </label>
            <Textarea
              placeholder="Describe what's new in this version..."
              value={formData.versionNotes}
              onChange={(e) => setFormData({ ...formData, versionNotes: e.target.value })}
              rows={3}
            />
          </div>
        )}

        {/* Template Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">
            Template Description
          </label>
          <Textarea
            placeholder={`Describe this ${getContentTypeLabel()} template for others...`}
            value={formData.templateDescription}
            onChange={(e) => setFormData({ ...formData, templateDescription: e.target.value })}
            rows={3}
          />
          <p className="text-xs text-gray-500">
            This description will be shown when others view the template.
          </p>
        </div>

        {/* Attribution Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">
            Attribution Name
          </label>
          <Input
            placeholder="Your display name or username"
            value={formData.attributionName}
            onChange={(e) => setFormData({ ...formData, attributionName: e.target.value })}
          />
          <p className="text-xs text-gray-500">
            This is how you'll be credited when others use your template.
          </p>
        </div>

        {/* Allow Save Toggle */}
        <div className="flex items-start justify-between gap-4 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
          <div className="space-y-1">
            <p className="text-sm font-medium text-white">Allow Save to Collection</p>
            <p className="text-xs text-gray-400">
              Let viewers save this template to their collection and use it for their own games.
            </p>
          </div>
          <Toggle
            checked={formData.allowSave}
            onChange={(checked) => setFormData({ ...formData, allowSave: checked })}
          />
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
            onClick={handlePublish}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {isUpdate ? `Publish v${newVersion}` : 'Publish Template'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

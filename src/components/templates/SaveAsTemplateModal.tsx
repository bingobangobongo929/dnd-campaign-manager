'use client'

import { useState } from 'react'
import { Archive, Loader2, Globe, Lock, Tag, X } from 'lucide-react'
import { Modal, Input, Textarea } from '@/components/ui'
import { cn } from '@/lib/utils'

interface SaveAsTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  contentType: 'campaign' | 'character' | 'oneshot'
  contentId: string
  contentName: string
  onSaved?: (isPublic: boolean) => void
}

export function SaveAsTemplateModal({
  isOpen,
  onClose,
  contentType,
  contentId,
  contentName,
  onSaved,
}: SaveAsTemplateModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')

  const [formData, setFormData] = useState({
    templateName: contentName,
    templateDescription: '',
    tags: [] as string[],
    publishToCommunity: false,
    attributionName: '',
  })

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !formData.tags.includes(tag) && formData.tags.length < 10) {
      setFormData({ ...formData, tags: [...formData.tags, tag] })
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) })
  }

  const handleSave = async () => {
    setLoading(true)
    setError(null)

    try {
      // Use the existing publish endpoint which supports both public and private templates
      const response = await fetch('/api/templates/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType,
          contentId,
          versionName: formData.templateName || contentName,
          templateDescription: formData.templateDescription || null,
          templateTags: formData.tags,
          isPublic: formData.publishToCommunity,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save as template')
      }

      onSaved?.(formData.publishToCommunity)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save as template')
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Save as Template"
      size="lg"
    >
      <div className="space-y-6">
        {/* Info Banner */}
        <div className="flex items-start gap-3 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
          <Archive className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="text-sm text-gray-300">
            Mark "{contentName}" as a finished template ready to play or share.
            Templates preserve your content as a reusable starting point.
          </div>
        </div>

        {/* Template Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">
            Template Name
          </label>
          <Input
            placeholder={`${contentName} - Template`}
            value={formData.templateName}
            onChange={(e) => setFormData({ ...formData, templateName: e.target.value })}
          />
        </div>

        {/* Template Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">
            Description
          </label>
          <Textarea
            placeholder={`Describe this ${getContentTypeLabel()} template...`}
            value={formData.templateDescription}
            onChange={(e) => setFormData({ ...formData, templateDescription: e.target.value })}
            rows={3}
          />
          <p className="text-xs text-gray-500">
            Help others understand what this template offers.
          </p>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">
            Tags
          </label>
          <div className="flex gap-2">
            <Input
              placeholder="Add a tag (e.g., gothic, horror)"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              className="flex-1"
            />
            <button
              type="button"
              onClick={handleAddTag}
              disabled={!tagInput.trim()}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Tag className="w-4 h-4" />
            </button>
          </div>
          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-800 text-gray-300 text-sm rounded-lg"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="p-0.5 hover:bg-gray-700 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-white/[0.06] pt-6" />

        {/* Publish to Community Toggle */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
            <div className="flex items-start gap-3">
              {formData.publishToCommunity ? (
                <Globe className="w-5 h-5 text-green-400 mt-0.5" />
              ) : (
                <Lock className="w-5 h-5 text-gray-400 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="text-sm font-medium text-white">Publish to Community</p>
                <p className="text-xs text-gray-400">
                  {formData.publishToCommunity
                    ? 'Others can discover and use this template'
                    : 'Keep this template private to your account'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, publishToCommunity: !formData.publishToCommunity })}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900",
                formData.publishToCommunity ? "bg-green-600" : "bg-gray-700"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                  formData.publishToCommunity ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>

          {/* Attribution Name - Only show when publishing */}
          {formData.publishToCommunity && (
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
                How you'll be credited when others use your template.
              </p>
            </div>
          )}
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
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Archive className="w-4 h-4" />
            )}
            Save as Template
          </button>
        </div>
      </div>
    </Modal>
  )
}

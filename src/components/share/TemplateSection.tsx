'use client'

import { useState, useCallback } from 'react'
import {
  Package,
  Loader2,
  Trash2,
  Copy,
  Check,
  Link2,
  RefreshCw,
  Globe,
  BookmarkPlus,
  Eye,
  Clock,
} from 'lucide-react'
import { Input } from '@/components/ui'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store'

export type ContentType = 'campaign' | 'character' | 'oneshot'

interface TemplateSnapshot {
  id: string
  version: number
  version_name?: string
  is_public: boolean
  published_at: string
  save_count: number
  view_count?: number
}

interface ShareLink {
  id: string
  share_code: string
  note?: string | null
  created_at: string
  view_count: number
  share_type?: string
}

interface TemplateSectionProps {
  contentType: ContentType
  contentId: string
  contentName: string
  existingSnapshots: TemplateSnapshot[]
  existingShares: ShareLink[]
  onTemplateCreated: () => void
  onTemplateDeleted: () => void
  onTemplateUpdated: () => void
  onShareCreated: (share: ShareLink) => void
  onShareRevoked: (code: string) => void
}

export function TemplateSection({
  contentType,
  contentId,
  contentName,
  existingSnapshots,
  existingShares,
  onTemplateCreated,
  onTemplateDeleted,
  onTemplateUpdated,
  onShareCreated,
  onShareRevoked,
}: TemplateSectionProps) {
  const { settings } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [showUpdateForm, setShowUpdateForm] = useState(false)
  const [versionName, setVersionName] = useState('')

  // Get template shares only
  const templateShares = existingShares.filter(s => s.share_type === 'template')

  // Get latest snapshot
  const latestSnapshot = existingSnapshots.length > 0
    ? existingSnapshots.reduce((latest, curr) => curr.version > latest.version ? curr : latest)
    : null

  const hasTemplate = !!latestSnapshot

  const getShareApiPath = () => {
    switch (contentType) {
      case 'campaign': return '/api/campaigns/share'
      case 'character': return '/api/vault/share'
      case 'oneshot': return '/api/oneshots/share'
    }
  }

  const getShareUrlPath = () => {
    switch (contentType) {
      case 'campaign': return '/share/campaign'
      case 'character': return '/share/c'
      case 'oneshot': return '/share/oneshot'
    }
  }

  const createTemplate = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/templates/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType,
          contentId,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create template')
      }

      onTemplateCreated()
    } catch (err) {
      console.error('Template creation error:', err)
      setError(err instanceof Error ? err.message : 'Failed to create template')
    }

    setLoading(false)
  }

  const updateTemplate = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/templates/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType,
          contentId,
          versionName: versionName.trim() || undefined,
          isPublic: false, // Keep private by default
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update template')
      }

      onTemplateUpdated()
      setShowUpdateForm(false)
      setVersionName('')
    } catch (err) {
      console.error('Template update error:', err)
      setError(err instanceof Error ? err.message : 'Failed to update template')
    }

    setLoading(false)
  }

  const deleteTemplate = async () => {
    if (!confirm('Are you sure you want to delete this template? This cannot be undone.')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/templates/unpublish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType,
          contentId,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete template')
      }

      onTemplateDeleted()
    } catch (err) {
      console.error('Template deletion error:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete template')
    }

    setLoading(false)
  }

  const createTemplateShare = async () => {
    setLoading(true)
    setError(null)

    try {
      // Default to including all sections
      const defaultSections = {
        // Campaign sections
        description: true,
        setting: true,
        sessions: true,
        characters: true,
        lore: true,
        // Character sections
        backstory: true,
        personality: true,
        appearance: true,
        stats: true,
        abilities: true,
        inventory: true,
        notes: true,
        relationships: true,
        // Oneshot sections
        tagline: true,
        introduction: true,
        settingNotes: true,
        characterCreation: true,
        handouts: true,
        sessionPlan: true,
        twists: true,
        keyNpcs: true,
      }

      const body: Record<string, unknown> = {
        includedSections: defaultSections,
        shareType: 'template',
        snapshotVersion: latestSnapshot?.version,
      }

      if (contentType === 'campaign') body.campaignId = contentId
      else if (contentType === 'character') body.characterId = contentId
      else if (contentType === 'oneshot') body.oneshotId = contentId

      const res = await fetch(getShareApiPath(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error('Failed to create share link')

      const data = await res.json()
      const newShare: ShareLink = {
        id: data.shareId,
        share_code: data.shareCode,
        created_at: new Date().toISOString(),
        view_count: 0,
        share_type: 'template',
      }

      onShareCreated(newShare)
    } catch (err) {
      console.error('Share creation error:', err)
      setError('Failed to create share link')
    }

    setLoading(false)
  }

  const revokeShareLink = async (code: string) => {
    setLoading(true)
    try {
      await fetch(`${getShareApiPath()}?code=${code}`, { method: 'DELETE' })
      onShareRevoked(code)
    } catch (err) {
      console.error('Revoke error:', err)
    }
    setLoading(false)
  }

  const copyToClipboard = useCallback(async (code: string) => {
    const url = `${window.location.origin}${getShareUrlPath()}/${code}`
    await navigator.clipboard.writeText(url)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }, [contentType])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // No template exists - show create prompt
  if (!hasTemplate) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-gray-400">
          Create a Session 0 ready package that others can save and use. Your active content stays unchanged.
        </p>

        <div className="p-8 bg-white/[0.02] border border-dashed border-white/[0.12] rounded-xl text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-500/10 flex items-center justify-center">
            <Package className="w-8 h-8 text-purple-400" />
          </div>

          <div className="space-y-2">
            <h4 className="text-lg font-medium text-white">Create a Template</h4>
            <p className="text-sm text-gray-400 max-w-sm mx-auto">
              Create a frozen snapshot of your current content. Others can save it to their collection and start their own version.
            </p>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            onClick={createTemplate}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Package className="w-4 h-4" />
                Create Template
              </>
            )}
          </button>
        </div>
      </div>
    )
  }

  // Template exists - show management UI
  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-400">
        Your template is ready to share. Others can save it to their collection and start their own version.
      </p>

      {/* Template Card */}
      <div className="p-5 bg-white/[0.02] border border-purple-500/20 rounded-xl space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
            <Package className="w-6 h-6 text-purple-400" />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-white truncate">
              {contentName} - Template
            </h4>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                v{latestSnapshot.version}
                {latestSnapshot.version_name && ` "${latestSnapshot.version_name}"`}
              </span>
              <span className="flex items-center gap-1">
                <BookmarkPlus className="w-3 h-3" />
                {latestSnapshot.save_count} saves
              </span>
              {latestSnapshot.view_count !== undefined && (
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {latestSnapshot.view_count} views
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Created {formatDate(latestSnapshot.published_at)}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-white/[0.06]">
          <button
            onClick={createTemplateShare}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600/80 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            <Link2 className="w-4 h-4" />
            Share Template
          </button>

          <button
            onClick={() => setShowUpdateForm(true)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" />
            Update Version
          </button>

          <button
            onClick={deleteTemplate}
            disabled={loading || latestSnapshot.save_count > 0}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50",
              latestSnapshot.save_count > 0
                ? "text-gray-500 cursor-not-allowed"
                : "text-red-400 hover:bg-red-500/10"
            )}
            title={latestSnapshot.save_count > 0 ? "Can't delete - other users have saved this template" : "Delete template"}
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>

        {/* Update form */}
        {showUpdateForm && (
          <div className="pt-3 border-t border-white/[0.06] space-y-3">
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Version name (optional)</label>
              <Input
                value={versionName}
                onChange={(e) => setVersionName(e.target.value)}
                placeholder='e.g., "v2.0" or "Holiday Update"'
                className="bg-white/[0.03] border-white/[0.08]"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={updateTemplate}
                disabled={loading}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save New Version'}
              </button>
              <button
                onClick={() => setShowUpdateForm(false)}
                className="px-4 py-2 text-gray-400 hover:text-white text-sm rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Template Share Links */}
      {templateShares.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Share Links for Template
          </h4>
          {templateShares.map((share) => (
            <div
              key={share.id}
              className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl"
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{formatDate(share.created_at)}</span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {share.view_count} views
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(share.share_code)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    title="Copy link"
                  >
                    {copiedCode === share.share_code ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => revokeShareLink(share.share_code)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Revoke link"
                    disabled={loading}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-black/30 rounded-lg text-xs font-mono text-gray-400 truncate">
                <Link2 className="w-3 h-3 flex-shrink-0" />
                {`${typeof window !== 'undefined' ? window.location.origin : ''}${getShareUrlPath()}/${share.share_code}`}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {/* Publish to Community - Coming Soon */}
      <div className="pt-4 border-t border-white/[0.06]">
        <div className="p-4 bg-white/[0.01] border border-white/[0.04] rounded-xl opacity-60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
              <Globe className="w-5 h-5 text-purple-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                Publish to Community
                <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-300 rounded-full">
                  Coming Soon
                </span>
              </h4>
              <p className="text-xs text-gray-500 mt-0.5">
                Make your template discoverable to all Multiloop users.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

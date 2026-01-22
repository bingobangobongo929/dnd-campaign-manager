'use client'

import { useState, useEffect, useCallback } from 'react'
import { Modal, Input } from '@/components/ui'
import { LimitWarning } from '@/components/membership'
import {
  Link2,
  Package,
  Globe,
  Loader2,
  Copy,
  Check,
  Trash2,
  Lock,
  Eye,
  BookmarkPlus,
  RefreshCw,
  FileEdit,
} from 'lucide-react'
import { useSupabase, useMembership } from '@/hooks'
import { cn } from '@/lib/utils'

type ContentType = 'campaign' | 'character' | 'oneshot'

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
  password_hash?: string | null
  share_type?: string
}

interface UnifiedShareModalProps {
  isOpen: boolean
  onClose: () => void
  contentType: ContentType
  contentId: string
  contentName: string
  contentMode: 'active' | 'template' | 'inactive'
  onTemplateCreated?: () => void
  onShareCreated?: () => void
}

export function UnifiedShareModal({
  isOpen,
  onClose,
  contentType,
  contentId,
  contentName,
  contentMode,
  onTemplateCreated,
  onShareCreated,
}: UnifiedShareModalProps) {
  const supabase = useSupabase()
  const { canCreateShareLink, limits, usage } = useMembership()

  // State
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existingShares, setExistingShares] = useState<ShareLink[]>([])
  const [existingSnapshots, setExistingSnapshots] = useState<TemplateSnapshot[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  // Share link form state
  const [usePassword, setUsePassword] = useState(false)
  const [password, setPassword] = useState('')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Determine template state
  const isTemplate = contentMode === 'template'
  const hasPublishedVersions = existingSnapshots.length > 0
  const latestSnapshot = hasPublishedVersions
    ? existingSnapshots.reduce((latest, curr) => curr.version > latest.version ? curr : latest)
    : null

  // Load existing data when modal opens
  useEffect(() => {
    if (isOpen && contentId) {
      loadExistingData()
    }
  }, [isOpen, contentId])

  const getShareTable = () => {
    switch (contentType) {
      case 'campaign': return 'campaign_shares'
      case 'character': return 'character_shares'
      case 'oneshot': return 'oneshot_shares'
    }
  }

  const getContentIdField = () => {
    switch (contentType) {
      case 'campaign': return 'campaign_id'
      case 'character': return 'character_id'
      case 'oneshot': return 'oneshot_id'
    }
  }

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

  const loadExistingData = async () => {
    setDataLoading(true)

    try {
      // Load existing shares
      const shareTable = getShareTable()
      const { data: shares } = await supabase
        .from(shareTable)
        .select('*')
        .eq(getContentIdField(), contentId)
        .order('created_at', { ascending: false })

      if (shares) {
        setExistingShares(shares as ShareLink[])
      }

      // Load existing template snapshots
      const { data: snapshots } = await supabase
        .from('template_snapshots')
        .select('id, version, version_name, is_public, published_at, save_count, view_count')
        .eq('content_type', contentType)
        .eq('content_id', contentId)
        .order('version', { ascending: false })

      if (snapshots) {
        setExistingSnapshots(snapshots as TemplateSnapshot[])
      }
    } catch (err) {
      console.error('Error loading share data:', err)
    }

    setDataLoading(false)
  }

  const createShareLink = async (shareType: 'party' | 'template' = 'party') => {
    // Check share link limit before creating
    const limitCheck = canCreateShareLink()
    if (!limitCheck.allowed) {
      setError(`Share link limit reached (${limitCheck.current}/${limitCheck.limit}). Revoke an existing link to create a new one.`)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const body: Record<string, unknown> = {
        includedSections: {},
        shareType,
      }

      if (contentType === 'campaign') body.campaignId = contentId
      else if (contentType === 'character') body.characterId = contentId
      else if (contentType === 'oneshot') body.oneshotId = contentId

      if (usePassword && password.trim()) {
        body.password = password.trim()
      }

      if (shareType === 'template' && latestSnapshot) {
        body.snapshotVersion = latestSnapshot.version
      }

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
        share_type: shareType,
        password_hash: data.hasPassword ? 'set' : null,
      }

      setExistingShares(prev => [newShare, ...prev])
      setPassword('')
      setUsePassword(false)
      onShareCreated?.()
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
      setExistingShares(prev => prev.filter(s => s.share_code !== code))
    } catch (err) {
      console.error('Revoke error:', err)
    }
    setLoading(false)
  }

  const saveAsTemplate = async () => {
    setLoading(true)
    setError(null)

    try {
      // This will create a copy as a template draft
      const res = await fetch('/api/content/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType,
          contentId,
          asTemplate: true, // New flag to create as template draft
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create template')
      }

      const data = await res.json()
      onTemplateCreated?.()
      onClose()

      // Redirect to edit the new template with onboarding flag
      if (data.newId) {
        const editPath = contentType === 'campaign'
          ? `/campaigns/${data.newId}?newTemplate=1`
          : contentType === 'character'
            ? `/vault/${data.newId}?newTemplate=1`
            : `/oneshots/${data.newId}?newTemplate=1`
        window.location.href = editPath
      }
    } catch (err) {
      console.error('Template creation error:', err)
      setError(err instanceof Error ? err.message : 'Failed to create template')
    }

    setLoading(false)
  }

  const publishVersion = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/templates/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType,
          contentId,
          isPublic: false,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to publish version')
      }

      await loadExistingData()
    } catch (err) {
      console.error('Publish error:', err)
      setError(err instanceof Error ? err.message : 'Failed to publish version')
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

  // Filter shares by type
  const partyShares = existingShares.filter(s => s.share_type !== 'template')
  const templateShares = existingShares.filter(s => s.share_type === 'template')

  // Determine modal title
  const modalTitle = isTemplate
    ? hasPublishedVersions
      ? `Share "${contentName}" (Template)`
      : `Share "${contentName}" (Template Draft)`
    : `Share "${contentName}"`

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      size="lg"
    >
      {dataLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* ============================================ */}
          {/* ACTIVE CONTENT - Not a template yet */}
          {/* ============================================ */}
          {!isTemplate && (
            <>
              {/* Share with Link Section */}
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Link2 className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Share with Link</h3>
                    <p className="text-sm text-gray-400">
                      Share a live view with your party. They can view but not save it.
                    </p>
                  </div>
                </div>

                {/* Existing party shares */}
                {partyShares.length > 0 && (
                  <div className="space-y-2">
                    {partyShares.map((share) => (
                      <ShareLinkCard
                        key={share.id}
                        share={share}
                        shareUrlPath={getShareUrlPath()}
                        copiedCode={copiedCode}
                        onCopy={copyToClipboard}
                        onRevoke={revokeShareLink}
                        loading={loading}
                        formatDate={formatDate}
                      />
                    ))}
                  </div>
                )}

                {/* Create new share link */}
                <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={usePassword}
                      onChange={(e) => setUsePassword(e.target.checked)}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500/50"
                    />
                    <Lock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-300">Password protect</span>
                  </label>

                  {usePassword && (
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="bg-white/[0.03] border-white/[0.08]"
                    />
                  )}

                  {/* Share link limit warning */}
                  <LimitWarning
                    limitType="shareLinks"
                    current={usage.shareLinks}
                    limit={limits.shareLinks}
                  />

                  <button
                    onClick={() => createShareLink('party')}
                    disabled={loading || (usePassword && !password.trim()) || (limits.shareLinks !== -1 && usage.shareLinks >= limits.shareLinks)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Link2 className="w-4 h-4" />
                        Create Share Link
                      </>
                    )}
                  </button>
                </div>
              </section>

              {/* Divider */}
              <div className="border-t border-white/[0.06]" />

              {/* Save to my Templates Section */}
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <Package className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Save to my Templates</h3>
                    <p className="text-sm text-gray-400">
                      Creates an editable copy in your Templates. Edit it for Session 0, then share when ready.
                    </p>
                  </div>
                </div>

                <button
                  onClick={saveAsTemplate}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg border border-white/[0.08] transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Package className="w-4 h-4" />
                      Save to my Templates
                    </>
                  )}
                </button>
              </section>
            </>
          )}

          {/* ============================================ */}
          {/* TEMPLATE DRAFT - No published versions yet */}
          {/* ============================================ */}
          {isTemplate && !hasPublishedVersions && (
            <>
              {/* Draft Notice */}
              <section className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <FileEdit className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-amber-200">Draft - Not Yet Shareable</h3>
                    <p className="text-sm text-amber-200/70">
                      Edit this template to make it Session 0 ready. When you're happy with it, publish a version to start sharing.
                    </p>
                  </div>
                </div>

                <button
                  onClick={publishVersion}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Package className="w-4 h-4" />
                      Publish Version 1
                    </>
                  )}
                </button>
              </section>

              {/* Disabled Share Sections */}
              <section className="space-y-4 opacity-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Link2 className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-400">Share with Link</h3>
                    <p className="text-sm text-gray-500">Publish a version first to enable sharing</p>
                  </div>
                </div>
              </section>

              <div className="border-t border-white/[0.06]" />

              <section className="space-y-4 opacity-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Globe className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-400">Share to Community</h3>
                    <p className="text-sm text-gray-500">Publish a version first to enable sharing</p>
                  </div>
                </div>
              </section>
            </>
          )}

          {/* ============================================ */}
          {/* PUBLISHED TEMPLATE - Has versions */}
          {/* ============================================ */}
          {isTemplate && hasPublishedVersions && (
            <>
              {/* Share with Link Section */}
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Link2 className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Share with Link</h3>
                    <p className="text-sm text-gray-400">
                      Share Version {latestSnapshot?.version}. Others can save it to their collection.
                    </p>
                  </div>
                </div>

                {/* Existing template shares */}
                {templateShares.length > 0 && (
                  <div className="space-y-2">
                    {templateShares.map((share) => (
                      <ShareLinkCard
                        key={share.id}
                        share={share}
                        shareUrlPath={getShareUrlPath()}
                        copiedCode={copiedCode}
                        onCopy={copyToClipboard}
                        onRevoke={revokeShareLink}
                        loading={loading}
                        formatDate={formatDate}
                      />
                    ))}
                  </div>
                )}

                {/* Create new share link */}
                <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={usePassword}
                      onChange={(e) => setUsePassword(e.target.checked)}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500/50"
                    />
                    <Lock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-300">Password protect</span>
                  </label>

                  {usePassword && (
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="bg-white/[0.03] border-white/[0.08]"
                    />
                  )}

                  <button
                    onClick={() => createShareLink('template')}
                    disabled={loading || (usePassword && !password.trim())}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Link2 className="w-4 h-4" />
                        Create Share Link
                      </>
                    )}
                  </button>
                </div>
              </section>

              {/* Divider */}
              <div className="border-t border-white/[0.06]" />

              {/* Update Template Section */}
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <RefreshCw className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Update Template</h3>
                    <p className="text-sm text-gray-400">
                      Current: Version {latestSnapshot?.version}
                      {latestSnapshot?.save_count ? ` • ${latestSnapshot.save_count} saves` : ''}
                    </p>
                  </div>
                </div>

                <button
                  onClick={publishVersion}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg border border-white/[0.08] transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Publish Version {(latestSnapshot?.version || 0) + 1}
                    </>
                  )}
                </button>
              </section>

              {/* Divider */}
              <div className="border-t border-white/[0.06]" />

              {/* Share to Community - Coming Soon */}
              <section className="space-y-4 opacity-60">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Globe className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-300 flex items-center gap-2">
                      Share to Community
                      <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-300 rounded-full">
                        Coming Soon
                      </span>
                    </h3>
                    <p className="text-sm text-gray-500">
                      Make this template discoverable to all Multiloop users.
                    </p>
                  </div>
                </div>

                <button
                  disabled
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 text-gray-500 font-medium rounded-lg border border-white/[0.04] cursor-not-allowed"
                >
                  <Globe className="w-4 h-4" />
                  Publish to Community
                </button>
              </section>
            </>
          )}

          {/* Error Display */}
          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}
        </div>
      )}
    </Modal>
  )
}

// Extracted share link card component
function ShareLinkCard({
  share,
  shareUrlPath,
  copiedCode,
  onCopy,
  onRevoke,
  loading,
  formatDate,
}: {
  share: ShareLink
  shareUrlPath: string
  copiedCode: string | null
  onCopy: (code: string) => void
  onRevoke: (code: string) => void
  loading: boolean
  formatDate: (date: string) => string
}) {
  return (
    <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-lg">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>{formatDate(share.created_at)}</span>
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {share.view_count} views
          </span>
          {share.password_hash && (
            <span className="flex items-center gap-1 text-amber-400">
              <Lock className="w-3 h-3" />
              Protected
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onCopy(share.share_code)}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
            title="Copy link"
          >
            {copiedCode === share.share_code ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => onRevoke(share.share_code)}
            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
            title="Revoke link"
            disabled={loading}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 px-2.5 py-1.5 bg-black/30 rounded text-xs font-mono text-gray-400 truncate">
        <Link2 className="w-3 h-3 flex-shrink-0" />
        {`${typeof window !== 'undefined' ? window.location.origin : ''}${shareUrlPath}/${share.share_code}`}
      </div>
    </div>
  )
}

// Re-export type for backward compatibility
export type { ContentType }

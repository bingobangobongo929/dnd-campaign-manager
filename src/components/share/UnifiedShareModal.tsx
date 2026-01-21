'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui'
import {
  Check,
  Copy,
  Link2,
  Trash2,
  Loader2,
  ExternalLink,
  Lock,
  Globe,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Users,
  BookmarkPlus,
  Copy as CopyIcon,
  Package,
  Eye,
  AlertCircle,
} from 'lucide-react'
import { useSupabase, useUser } from '@/hooks'
import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'

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

interface UnifiedShareModalProps {
  isOpen: boolean
  onClose: () => void
  contentType: ContentType
  contentId: string
  contentName: string
  isPublished?: boolean
  onPublished?: () => void
  onDuplicated?: (newId: string) => void
}

type ModalSection = 'share' | 'publish' | 'duplicate'

const SECTION_LABELS: Record<ModalSection, { title: string; icon: typeof Users }> = {
  share: { title: 'Share with Party', icon: Users },
  publish: { title: 'Publish to My Templates', icon: BookmarkPlus },
  duplicate: { title: 'Duplicate', icon: CopyIcon },
}

export function UnifiedShareModal({
  isOpen,
  onClose,
  contentType,
  contentId,
  contentName,
  isPublished = false,
  onPublished,
  onDuplicated,
}: UnifiedShareModalProps) {
  const supabase = useSupabase()
  const { user } = useUser()
  const { settings } = useAppStore()

  // State
  const [loading, setLoading] = useState(false)
  const [activeSection, setActiveSection] = useState<ModalSection | null>(null)
  const [existingSnapshots, setExistingSnapshots] = useState<TemplateSnapshot[]>([])
  const [loadingSnapshots, setLoadingSnapshots] = useState(true)

  // Share state
  const [existingShares, setExistingShares] = useState<any[]>([])
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [shareCode, setShareCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [shareNote, setShareNote] = useState('')

  // Publish state
  const [publishVisibility, setPublishVisibility] = useState<'private' | 'public'>('private')
  const [versionName, setVersionName] = useState('')
  const [versionNotes, setVersionNotes] = useState('')

  // Duplicate state
  const [duplicateName, setDuplicateName] = useState('')
  const [duplicating, setDuplicating] = useState(false)

  // Error state
  const [error, setError] = useState<string | null>(null)

  // Load existing data when modal opens
  useEffect(() => {
    if (isOpen && contentId) {
      loadExistingData()
      setDuplicateName(`${contentName} (Copy)`)
    }
  }, [isOpen, contentId])

  const loadExistingData = async () => {
    setLoadingSnapshots(true)
    setError(null)

    try {
      // Load existing shares
      const shareTable = getShareTable()
      const { data: shares } = await supabase
        .from(shareTable)
        .select('*')
        .eq(getContentIdField(), contentId)
        .order('created_at', { ascending: false })

      if (shares) {
        setExistingShares(shares)
      }

      // Load existing template snapshots
      const { data: snapshots } = await supabase
        .from('template_snapshots')
        .select('id, version, version_name, is_public, published_at, save_count, view_count')
        .eq('content_type', contentType)
        .eq('content_id', contentId)
        .order('version', { ascending: false })

      if (snapshots) {
        setExistingSnapshots(snapshots)
      }
    } catch (err) {
      console.error('Error loading share data:', err)
    }

    setLoadingSnapshots(false)
  }

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

  // Create share link
  const createShareLink = async () => {
    setLoading(true)
    setError(null)

    try {
      const body: Record<string, any> = {
        includedSections: {}, // Default - include everything
        note: shareNote.trim() || null,
      }

      // Set the correct ID field
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
      const newShare = {
        id: data.shareId,
        share_code: data.shareCode,
        note: shareNote.trim() || null,
        created_at: new Date().toISOString(),
        view_count: 0,
      }

      setShareCode(data.shareCode)
      setShareUrl(`${window.location.origin}${data.shareUrl}`)
      setExistingShares(prev => [newShare, ...prev])
    } catch (err) {
      console.error('Share creation error:', err)
      setError('Failed to create share link')
    }

    setLoading(false)
  }

  // Revoke share link
  const revokeShareLink = async (code: string) => {
    setLoading(true)
    try {
      await fetch(`${getShareApiPath()}?code=${code}`, { method: 'DELETE' })
      setExistingShares(prev => prev.filter(s => s.share_code !== code))
      if (shareCode === code) {
        setShareUrl(null)
        setShareCode(null)
      }
    } catch (err) {
      console.error('Revoke error:', err)
    }
    setLoading(false)
  }

  // Publish as template
  const publishTemplate = async () => {
    setLoading(true)
    setError(null)

    // Check if public and no username
    if (publishVisibility === 'public' && !settings?.username) {
      setError('You must set a username before publishing public templates. Go to Settings to set one.')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/templates/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType,
          contentId,
          versionName: versionName.trim() || undefined,
          versionNotes: versionNotes.trim() || undefined,
          isPublic: publishVisibility === 'public',
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.code === 'USERNAME_REQUIRED') {
          setError('You must set a username before publishing public templates. Go to Settings to set one.')
        } else {
          setError(data.error || 'Failed to publish template')
        }
        setLoading(false)
        return
      }

      // Refresh snapshots
      await loadExistingData()

      // Notify parent
      onPublished?.()

      // Reset form
      setVersionName('')
      setVersionNotes('')
      setActiveSection(null)
    } catch (err) {
      console.error('Publish error:', err)
      setError('Failed to publish template')
    }

    setLoading(false)
  }

  // Toggle template visibility
  const toggleVisibility = async (snapshotId: string, newIsPublic: boolean) => {
    setLoading(true)
    setError(null)

    // Check if making public and no username
    if (newIsPublic && !settings?.username) {
      setError('You must set a username before making templates public. Go to Settings to set one.')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/templates/toggle-visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snapshotId,
          isPublic: newIsPublic,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to update visibility')
        setLoading(false)
        return
      }

      // Update local state
      setExistingSnapshots(prev =>
        prev.map(s => s.id === snapshotId ? { ...s, is_public: newIsPublic } : s)
      )
    } catch (err) {
      console.error('Toggle visibility error:', err)
      setError('Failed to update visibility')
    }

    setLoading(false)
  }

  // Unpublish template
  const unpublishTemplate = async () => {
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
        setError(data.error || 'Failed to unpublish')
        setLoading(false)
        return
      }

      // Refresh snapshots
      await loadExistingData()
      onPublished?.()
    } catch (err) {
      console.error('Unpublish error:', err)
      setError('Failed to unpublish template')
    }

    setLoading(false)
  }

  // Duplicate content
  const duplicateContent = async () => {
    setDuplicating(true)
    setError(null)

    try {
      const res = await fetch('/api/content/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType,
          contentId,
          newName: duplicateName.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to duplicate')
        setDuplicating(false)
        return
      }

      onDuplicated?.(data.newId)
      onClose()
    } catch (err) {
      console.error('Duplicate error:', err)
      setError('Failed to duplicate content')
    }

    setDuplicating(false)
  }

  const copyToClipboard = async (url: string) => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const selectShare = (share: any) => {
    setShareCode(share.share_code)
    setShareUrl(`${window.location.origin}${getShareUrlPath()}/${share.share_code}`)
    setShareNote(share.note || '')
  }

  const renderSectionHeader = (section: ModalSection, isExpanded: boolean) => {
    const config = SECTION_LABELS[section]
    const Icon = config.icon

    return (
      <button
        onClick={() => setActiveSection(isExpanded ? null : section)}
        className="w-full flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors rounded-xl"
      >
        <div className="p-2 bg-purple-500/10 rounded-lg">
          <Icon className="w-4 h-4 text-purple-400" />
        </div>
        <span className="flex-1 text-left font-medium text-white">{config.title}</span>
        {section === 'publish' && existingSnapshots.length > 0 && (
          <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
            v{existingSnapshots[0].version}
          </span>
        )}
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500" />
        )}
      </button>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Share & Manage "${contentName}"`}
      size="lg"
    >
      {loadingSnapshots ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
        </div>
      ) : (
        <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
          {/* Error display */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Section 1: Share with Party */}
          <div className="border border-white/[0.08] rounded-xl overflow-hidden">
            {renderSectionHeader('share', activeSection === 'share')}

            {activeSection === 'share' && (
              <div className="p-4 pt-0 space-y-4">
                <p className="text-sm text-gray-400">
                  Create a view-only link to share with your party or others.
                </p>

                {/* Existing shares */}
                {existingShares.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500">Existing Links</label>
                    {existingShares.map((share) => (
                      <div
                        key={share.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                          shareCode === share.share_code
                            ? "border-purple-500/50 bg-purple-500/5"
                            : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04]"
                        )}
                      >
                        <button
                          onClick={() => selectShare(share)}
                          className="flex-1 text-left"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono text-purple-400">
                              {getShareUrlPath()}/{share.share_code}
                            </span>
                            {share.view_count > 0 && (
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                {share.view_count}
                              </span>
                            )}
                          </div>
                          {share.note && (
                            <p className="text-xs text-gray-500 mt-1">{share.note}</p>
                          )}
                        </button>
                        <button
                          onClick={() => revokeShareLink(share.share_code)}
                          className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                          title="Revoke link"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Create new share */}
                {!shareUrl && (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={shareNote}
                      onChange={(e) => setShareNote(e.target.value)}
                      placeholder="Note (e.g., For my DM, Discord group...)"
                      className="w-full py-2.5 px-4 bg-white/[0.02] border border-white/[0.08] rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 text-sm"
                    />
                    <button
                      onClick={createShareLink}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
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
                )}

                {/* Show created share URL */}
                {shareUrl && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-3 bg-white/[0.02] border border-white/[0.08] rounded-lg">
                      <Link2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      <input
                        type="text"
                        value={shareUrl}
                        readOnly
                        className="flex-1 bg-transparent text-sm text-gray-300 outline-none truncate"
                      />
                      <button
                        onClick={() => copyToClipboard(shareUrl)}
                        className="flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium text-purple-400 bg-purple-500/10 rounded-md hover:bg-purple-500/20 transition-colors"
                      >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <a
                      href={shareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-purple-400 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Preview link
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Publish to My Templates */}
          <div className="border border-white/[0.08] rounded-xl overflow-hidden">
            {renderSectionHeader('publish', activeSection === 'publish')}

            {activeSection === 'publish' && (
              <div className="p-4 pt-0 space-y-4">
                {/* Existing snapshots */}
                {existingSnapshots.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-400">
                      This content has been published as a template.
                    </p>

                    {existingSnapshots.map((snapshot) => (
                      <div
                        key={snapshot.id}
                        className="p-4 bg-white/[0.02] border border-white/[0.08] rounded-xl space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-purple-400" />
                            <span className="font-medium text-white">
                              Version {snapshot.version}
                              {snapshot.version_name && ` - ${snapshot.version_name}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {snapshot.is_public ? (
                              <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                <Globe className="w-3 h-3" />
                                Public
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-gray-400 bg-white/[0.05] px-2 py-0.5 rounded-full">
                                <Lock className="w-3 h-3" />
                                Private
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Published {new Date(snapshot.published_at).toLocaleDateString()}</span>
                          {snapshot.save_count > 0 && (
                            <span className="flex items-center gap-1">
                              <BookmarkPlus className="w-3 h-3" />
                              {snapshot.save_count} saves
                            </span>
                          )}
                        </div>

                        {/* Visibility toggle */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleVisibility(snapshot.id, !snapshot.is_public)}
                            disabled={loading}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors",
                              snapshot.is_public
                                ? "bg-white/[0.05] text-gray-400 hover:bg-white/[0.08]"
                                : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                            )}
                          >
                            {snapshot.is_public ? (
                              <>
                                <Lock className="w-3.5 h-3.5" />
                                Make Private
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5" />
                                Make Public
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Publish new version */}
                    <div className="pt-3 border-t border-white/[0.06]">
                      <p className="text-xs text-gray-500 mb-3">
                        Create a new snapshot of the current state:
                      </p>
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={versionName}
                          onChange={(e) => setVersionName(e.target.value)}
                          placeholder="Version name (optional, e.g., 'Holiday Update')"
                          className="w-full py-2 px-3 bg-white/[0.02] border border-white/[0.08] rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 text-sm"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setPublishVisibility('private')
                              publishTemplate()
                            }}
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-white/[0.05] hover:bg-white/[0.08] text-gray-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            Publish Private
                          </button>
                          <button
                            onClick={() => {
                              setPublishVisibility('public')
                              publishTemplate()
                            }}
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            Publish Public
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Unpublish option */}
                    {existingSnapshots.every(s => s.save_count === 0) && (
                      <button
                        onClick={unpublishTemplate}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 py-2 text-sm text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Unpublish Template
                      </button>
                    )}
                  </div>
                ) : (
                  // No existing snapshots - show publish form
                  <div className="space-y-4">
                    <p className="text-sm text-gray-400">
                      Publish this content as a reusable template. The content stays in your Active tab - only a snapshot goes to My Templates.
                    </p>

                    <div className="space-y-3">
                      <input
                        type="text"
                        value={versionName}
                        onChange={(e) => setVersionName(e.target.value)}
                        placeholder="Version name (optional, e.g., 'v1.0')"
                        className="w-full py-2.5 px-4 bg-white/[0.02] border border-white/[0.08] rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 text-sm"
                      />
                      <textarea
                        value={versionNotes}
                        onChange={(e) => setVersionNotes(e.target.value)}
                        placeholder="Release notes (optional)"
                        rows={2}
                        className="w-full py-2.5 px-4 bg-white/[0.02] border border-white/[0.08] rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 text-sm resize-none"
                      />
                    </div>

                    {/* Visibility selection */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-500">Visibility</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setPublishVisibility('private')}
                          className={cn(
                            "flex items-center gap-2 p-3 rounded-lg border transition-colors",
                            publishVisibility === 'private'
                              ? "border-purple-500/50 bg-purple-500/10"
                              : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04]"
                          )}
                        >
                          <Lock className="w-4 h-4 text-gray-400" />
                          <div className="text-left">
                            <p className="text-sm font-medium text-white">Private</p>
                            <p className="text-xs text-gray-500">Link-only access</p>
                          </div>
                        </button>
                        <button
                          onClick={() => setPublishVisibility('public')}
                          className={cn(
                            "flex items-center gap-2 p-3 rounded-lg border transition-colors",
                            publishVisibility === 'public'
                              ? "border-emerald-500/50 bg-emerald-500/10"
                              : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04]"
                          )}
                        >
                          <Sparkles className="w-4 h-4 text-emerald-400" />
                          <div className="text-left">
                            <p className="text-sm font-medium text-white">Public</p>
                            <p className="text-xs text-gray-500">Discoverable by all</p>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Username warning for public */}
                    {publishVisibility === 'public' && !settings?.username && (
                      <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-400">
                          You need to set a username before publishing public templates. Go to Settings to set one.
                        </p>
                      </div>
                    )}

                    <button
                      onClick={publishTemplate}
                      disabled={loading || (publishVisibility === 'public' && !settings?.username)}
                      className={cn(
                        "w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors disabled:opacity-50",
                        publishVisibility === 'public'
                          ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                          : "bg-purple-600 hover:bg-purple-500 text-white"
                      )}
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : publishVisibility === 'public' ? (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Publish Public Template
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          Publish Private Template
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 3: Duplicate */}
          <div className="border border-white/[0.08] rounded-xl overflow-hidden">
            {renderSectionHeader('duplicate', activeSection === 'duplicate')}

            {activeSection === 'duplicate' && (
              <div className="p-4 pt-0 space-y-4">
                <p className="text-sm text-gray-400">
                  Create a copy of this content in your account. The copy is independent and unlinked.
                </p>

                <div className="space-y-3">
                  <input
                    type="text"
                    value={duplicateName}
                    onChange={(e) => setDuplicateName(e.target.value)}
                    placeholder="Name for the copy"
                    className="w-full py-2.5 px-4 bg-white/[0.02] border border-white/[0.08] rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 text-sm"
                  />

                  <button
                    onClick={duplicateContent}
                    disabled={duplicating || !duplicateName.trim()}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-white/[0.05] hover:bg-white/[0.08] text-gray-300 font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {duplicating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CopyIcon className="w-4 h-4" />
                        Duplicate
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Close button */}
          <div className="flex justify-end pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

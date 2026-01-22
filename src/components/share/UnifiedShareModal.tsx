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
  ArrowLeft,
  RefreshCw,
  FileEdit,
  ChevronRight,
} from 'lucide-react'
import { useSupabase, useMembership } from '@/hooks'
import { cn } from '@/lib/utils'

type ContentType = 'campaign' | 'character' | 'oneshot'
type ModalView = 'initial' | 'share' | 'template-manage'

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

// Section definitions per content type
const CAMPAIGN_SECTIONS = [
  { key: 'campaignInfo', label: 'Campaign Info', description: 'Name, description, setting', default: true },
  { key: 'partySummary', label: 'Party Summary', description: 'Overview of the party', default: true },
  { key: 'pcBasics', label: 'PC Basics', description: 'Player character names, classes, races', default: true },
  { key: 'pcDetails', label: 'PC Details', description: 'Backstories, goals, personality', default: true },
  { key: 'pcSecrets', label: 'PC Secrets', description: 'Hidden info, DM notes on PCs', default: false, dmOnly: true },
  { key: 'npcBasics', label: 'NPC Basics', description: 'NPC names and roles', default: true },
  { key: 'npcDetails', label: 'NPC Details', description: 'NPC backstories, motivations', default: true },
  { key: 'npcSecrets', label: 'NPC Secrets', description: 'Hidden NPC info', default: false, dmOnly: true },
  { key: 'sessionRecaps', label: 'Session Recaps', description: 'Player-facing session summaries', default: true },
  { key: 'sessionNotes', label: 'Session Notes', description: 'DM session planning notes', default: false, dmOnly: true },
  { key: 'locations', label: 'Locations', description: 'Places in your world', default: true },
  { key: 'factions', label: 'Factions', description: 'Groups and organizations', default: true },
  { key: 'lore', label: 'Lore', description: 'World history and lore', default: true },
  { key: 'worldMaps', label: 'World Maps', description: 'Map images', default: true },
]

const CHARACTER_SECTIONS = [
  { key: 'summary', label: 'Summary', description: 'Quick overview', default: true },
  { key: 'tldr', label: 'TL;DR', description: 'At-a-glance summary', default: true },
  { key: 'backstory', label: 'Backstory', description: 'Character history', default: true },
  { key: 'lifePhases', label: 'Life Phases', description: 'Timeline of life events', default: true },
  { key: 'appearance', label: 'Appearance', description: 'Physical description', default: true },
  { key: 'personality', label: 'Personality', description: 'Traits, ideals, bonds, flaws', default: true },
  { key: 'goals', label: 'Goals', description: 'Character motivations', default: true },
  { key: 'fears', label: 'Fears & Weaknesses', description: 'Character vulnerabilities', default: true },
  { key: 'secrets', label: 'Secrets', description: 'Hidden character info', default: false, dmOnly: true },
  { key: 'partyMembers', label: 'Party Members', description: 'Relationships with party', default: true },
  { key: 'npcs', label: 'NPCs', description: 'NPC relationships', default: true },
  { key: 'writings', label: 'Writings', description: 'Journal entries, letters', default: true },
  { key: 'rumors', label: 'Rumors', description: 'What others say', default: false, dmOnly: true },
  { key: 'dmQa', label: 'DM Q&A', description: 'DM notes and questions', default: false, dmOnly: true },
]

const ONESHOT_SECTIONS = [
  { key: 'tagline', label: 'Tagline', description: 'Hook line', default: true },
  { key: 'introduction', label: 'Introduction', description: 'Adventure overview', default: true },
  { key: 'settingNotes', label: 'Setting Notes', description: 'World context', default: true },
  { key: 'characterCreation', label: 'Character Creation', description: 'Guidelines for players', default: true },
  { key: 'handouts', label: 'Handouts', description: 'Player handouts', default: true },
  { key: 'sessionPlan', label: 'Session Plan', description: 'DM session outline', default: false, dmOnly: true },
  { key: 'twists', label: 'Twists & Secrets', description: 'Plot twists', default: false, dmOnly: true },
  { key: 'keyNpcs', label: 'Key NPCs', description: 'Important NPCs', default: false, dmOnly: true },
]

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

  // View state
  const [view, setView] = useState<ModalView>('initial')

  // Data state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existingShares, setExistingShares] = useState<ShareLink[]>([])
  const [existingSnapshots, setExistingSnapshots] = useState<TemplateSnapshot[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  // Share link form state
  const [usePassword, setUsePassword] = useState(false)
  const [password, setPassword] = useState('')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Section selection state
  const [selectedSections, setSelectedSections] = useState<Record<string, boolean>>({})

  // Determine template state
  const isTemplate = contentMode === 'template'
  const hasPublishedVersions = existingSnapshots.length > 0
  const latestSnapshot = hasPublishedVersions
    ? existingSnapshots.reduce((latest, curr) => curr.version > latest.version ? curr : latest)
    : null

  // Get sections for current content type
  const getSections = () => {
    switch (contentType) {
      case 'campaign': return CAMPAIGN_SECTIONS
      case 'character': return CHARACTER_SECTIONS
      case 'oneshot': return ONESHOT_SECTIONS
    }
  }

  // Initialize section defaults when modal opens
  useEffect(() => {
    if (isOpen) {
      const sections = getSections()
      const defaults: Record<string, boolean> = {}
      sections.forEach(s => {
        defaults[s.key] = s.default
      })
      setSelectedSections(defaults)
      setView(isTemplate && hasPublishedVersions ? 'template-manage' : 'initial')
    }
  }, [isOpen, contentType, isTemplate, hasPublishedVersions])

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
        includedSections: selectedSections,
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
      const res = await fetch('/api/content/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType,
          contentId,
          asTemplate: true,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create template')
      }

      const data = await res.json()
      onTemplateCreated?.()
      onClose()

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

  const toggleSection = (key: string) => {
    setSelectedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const selectAllSections = () => {
    const sections = getSections()
    const all: Record<string, boolean> = {}
    sections.forEach(s => { all[s.key] = true })
    setSelectedSections(all)
  }

  const selectPlayerSections = () => {
    const sections = getSections()
    const playerOnly: Record<string, boolean> = {}
    sections.forEach(s => { playerOnly[s.key] = !s.dmOnly })
    setSelectedSections(playerOnly)
  }

  // Filter shares by type
  const partyShares = existingShares.filter(s => s.share_type !== 'template')
  const templateShares = existingShares.filter(s => s.share_type === 'template')

  const handleClose = () => {
    setView('initial')
    setError(null)
    onClose()
  }

  // Modal title based on view
  const getModalTitle = () => {
    if (view === 'share') return 'Share with Link'
    if (view === 'template-manage') return `Manage Template`
    return `Share "${contentName}"`
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={getModalTitle()}
      size="lg"
    >
      {dataLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* ============================================ */}
          {/* INITIAL VIEW - Two main options */}
          {/* ============================================ */}
          {view === 'initial' && !isTemplate && (
            <>
              {/* Share with Link Button */}
              <button
                onClick={() => setView('share')}
                className="w-full p-5 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.08] hover:border-purple-500/30 rounded-xl text-left transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors">
                    <Link2 className="w-6 h-6 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white text-lg flex items-center gap-2">
                      Share with Link
                      <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-purple-400 transition-colors" />
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                      Share a live view with your party. They can view but not save it.
                    </p>
                  </div>
                </div>
                {partyShares.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/[0.06] text-xs text-gray-500">
                    {partyShares.length} active share link{partyShares.length !== 1 ? 's' : ''}
                  </div>
                )}
              </button>

              {/* Save to Templates Button */}
              <button
                onClick={saveAsTemplate}
                disabled={loading}
                className="w-full p-5 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.08] hover:border-amber-500/30 rounded-xl text-left transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-amber-500/10 rounded-lg group-hover:bg-amber-500/20 transition-colors">
                    {loading ? (
                      <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                    ) : (
                      <Package className="w-6 h-6 text-amber-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white text-lg">Save to my Templates</h3>
                    <p className="text-sm text-gray-400 mt-1">
                      Creates an editable copy in your Templates. Edit it for Session 0, then share when ready.
                    </p>
                  </div>
                </div>
              </button>

              {error && (
                <p className="text-sm text-red-400 text-center">{error}</p>
              )}
            </>
          )}

          {/* ============================================ */}
          {/* SHARE VIEW - Section selection + share options */}
          {/* ============================================ */}
          {view === 'share' && (
            <>
              {/* Back button */}
              <button
                onClick={() => setView('initial')}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors -mt-2 mb-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to options
              </button>

              {/* Section Selection */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-white">Choose what to share</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={selectPlayerSections}
                      className="text-xs px-2 py-1 text-purple-400 hover:bg-purple-500/10 rounded transition-colors"
                    >
                      Player-safe
                    </button>
                    <button
                      onClick={selectAllSections}
                      className="text-xs px-2 py-1 text-gray-400 hover:bg-white/10 rounded transition-colors"
                    >
                      All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto p-1">
                  {getSections().map((section) => (
                    <label
                      key={section.key}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                        selectedSections[section.key]
                          ? "bg-purple-500/10 border-purple-500/30"
                          : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSections[section.key] || false}
                        onChange={() => toggleSection(section.key)}
                        className="mt-0.5 w-4 h-4 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500/50"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">{section.label}</span>
                          {section.dmOnly && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">DM</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{section.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </section>

              {/* Divider */}
              <div className="border-t border-white/[0.06]" />

              {/* Existing shares */}
              {partyShares.length > 0 && (
                <section className="space-y-3">
                  <h3 className="font-medium text-white text-sm">Active Share Links</h3>
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
                </section>
              )}

              {/* Create new share */}
              <section className="space-y-4">
                <h3 className="font-medium text-white text-sm">Create New Link</h3>

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
              </section>

              {error && (
                <p className="text-sm text-red-400 text-center">{error}</p>
              )}
            </>
          )}

          {/* ============================================ */}
          {/* TEMPLATE DRAFT - No published versions yet */}
          {/* ============================================ */}
          {isTemplate && !hasPublishedVersions && view === 'initial' && (
            <>
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

              {error && (
                <p className="text-sm text-red-400 text-center">{error}</p>
              )}
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

              {error && (
                <p className="text-sm text-red-400 text-center">{error}</p>
              )}
            </>
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

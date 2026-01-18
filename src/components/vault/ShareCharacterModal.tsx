'use client'

import { useState, useEffect, useMemo } from 'react'
import { Modal } from '@/components/ui'
import { Check, Copy, Link2, Trash2, Loader2, ExternalLink, AlertCircle } from 'lucide-react'
import { useSupabase, useUser } from '@/hooks'
import { createClient } from '@/lib/supabase/client'
import { logActivity } from '@/lib/activity-log'
import type { VaultCharacter, VaultCharacterRelationship } from '@/types/database'

interface ShareCharacterModalProps {
  isOpen: boolean
  onClose: () => void
  characterId: string
  characterName: string
}

interface SectionToggle {
  key: string
  label: string
  group: string
  defaultOn: boolean
  warning?: string
}

const SECTION_TOGGLES: SectionToggle[] = [
  // Backstory
  { key: 'summary', label: 'Summary', group: 'BACKSTORY', defaultOn: true },
  { key: 'tldr', label: 'Quick Summary (TL;DR)', group: 'BACKSTORY', defaultOn: true },
  { key: 'backstory', label: 'Full Backstory', group: 'BACKSTORY', defaultOn: true },
  { key: 'lifePhases', label: 'Life Phases', group: 'BACKSTORY', defaultOn: true },
  { key: 'plotHooks', label: 'Plot Hooks', group: 'BACKSTORY', defaultOn: true },
  { key: 'quotes', label: 'Memorable Quotes', group: 'BACKSTORY', defaultOn: true },
  // Details
  { key: 'appearance', label: 'Appearance', group: 'DETAILS', defaultOn: true },
  { key: 'physicalDetails', label: 'Physical Details', group: 'DETAILS', defaultOn: true },
  { key: 'personality', label: 'Personality', group: 'DETAILS', defaultOn: true },
  { key: 'goals', label: 'Goals & Motivations', group: 'DETAILS', defaultOn: true },
  { key: 'secrets', label: 'Secrets', group: 'DETAILS', defaultOn: false, warning: 'careful!' },
  { key: 'fears', label: 'Fears', group: 'DETAILS', defaultOn: true },
  // People
  { key: 'partyMembers', label: 'Party Members', group: 'PEOPLE', defaultOn: true },
  { key: 'npcs', label: 'NPCs & Contacts', group: 'PEOPLE', defaultOn: true },
  { key: 'companions', label: 'Companions', group: 'PEOPLE', defaultOn: true },
  // Writings
  { key: 'writings', label: 'Letters, Stories & Poems', group: 'WRITINGS', defaultOn: true },
  { key: 'rumors', label: 'Rumors', group: 'WRITINGS', defaultOn: false },
  { key: 'dmQa', label: 'DM Q&A', group: 'WRITINGS', defaultOn: false },
  { key: 'openQuestions', label: 'Open Questions', group: 'WRITINGS', defaultOn: false },
  // Sessions
  { key: 'sessions', label: 'Session Notes', group: 'SESSIONS', defaultOn: false },
  // Gallery
  { key: 'gallery', label: 'Gallery Images', group: 'GALLERY', defaultOn: true },
]

const EXPIRATION_OPTIONS = [
  { value: null, label: 'Never' },
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
]

export function ShareCharacterModal({
  isOpen,
  onClose,
  characterId,
  characterName,
}: ShareCharacterModalProps) {
  const supabase = useSupabase()
  const { user } = useUser()
  const [sections, setSections] = useState<Record<string, boolean>>({})
  const [expiresInDays, setExpiresInDays] = useState<number | null>(null)
  const [note, setNote] = useState<string>('')
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [shareCode, setShareCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [existingShares, setExistingShares] = useState<any[]>([])
  const [selectedShareId, setSelectedShareId] = useState<string | null>(null)
  const [checkingExisting, setCheckingExisting] = useState(true)
  const [showNewLinkForm, setShowNewLinkForm] = useState(false)

  // Track which sections have content
  const [sectionContent, setSectionContent] = useState<Record<string, boolean>>({})
  const [loadingContent, setLoadingContent] = useState(true)

  // Initialize with defaults
  useEffect(() => {
    const defaults: Record<string, boolean> = {}
    SECTION_TOGGLES.forEach((t) => {
      defaults[t.key] = t.defaultOn
    })
    setSections(defaults)
  }, [])

  // Check for existing share and load content availability when modal opens
  useEffect(() => {
    if (isOpen && characterId) {
      checkExistingShare()
      loadSectionContent()
    }
  }, [isOpen, characterId])

  const checkExistingShare = async () => {
    setCheckingExisting(true)
    try {
      const { data } = await supabase
        .from('character_shares')
        .select('*')
        .eq('character_id', characterId)
        .order('created_at', { ascending: false })

      if (data && data.length > 0) {
        setExistingShares(data)
        // Don't auto-select, let user choose or create new
      }
    } catch {
      // No existing shares
    }
    setCheckingExisting(false)
  }

  const selectShare = (share: any) => {
    setSelectedShareId(share.id)
    setShareCode(share.share_code)
    setShareUrl(`${window.location.origin}/share/c/${share.share_code}`)
    // Merge with defaults so missing keys default to true
    const defaults: Record<string, boolean> = {}
    SECTION_TOGGLES.forEach((t) => {
      defaults[t.key] = t.defaultOn
    })
    setSections({ ...defaults, ...(share.included_sections || {}) })
    setNote(share.note || '')
    setShowNewLinkForm(false)
  }

  const startNewLink = () => {
    setSelectedShareId(null)
    setShareCode(null)
    setShareUrl(null)
    setShowNewLinkForm(true)
    // Reset to defaults
    const defaults: Record<string, boolean> = {}
    SECTION_TOGGLES.forEach((t) => {
      defaults[t.key] = t.defaultOn
    })
    setSections(defaults)
    setNote('')
  }

  const loadSectionContent = async () => {
    setLoadingContent(true)
    const client = createClient()

    try {
      // Load character data
      const { data: character } = await client
        .from('vault_characters')
        .select('*')
        .eq('id', characterId)
        .single()

      // Load relationships
      const { data: relationships } = await client
        .from('vault_character_relationships')
        .select('*')
        .eq('character_id', characterId)

      // Load writings
      const { data: writings } = await client
        .from('vault_character_writings')
        .select('id')
        .eq('character_id', characterId)

      // Load gallery
      const { data: images } = await client
        .from('vault_character_images')
        .select('id')
        .eq('character_id', characterId)

      // Load sessions
      const { data: sessions } = await client
        .from('play_journal')
        .select('id')
        .eq('character_id', characterId)

      if (character) {
        const rels = relationships || []
        const partyMembers = rels.filter(r => r.is_party_member && !r.is_companion)
        const npcs = rels.filter(r => !r.is_companion && !r.is_party_member)
        const companions = rels.filter(r => r.is_companion)

        const tldr = (character.tldr as string[]) || []
        const quotes = (character.quotes as string[]) || []
        const plotHooks = (character.plot_hooks as string[]) || []
        const fears = ((character as any).fears as string[]) || []
        const backstoryPhases = ((character as any).backstory_phases as any[]) || []
        const dmQa = (character.dm_qa as any[]) || []
        const rumors = (character.rumors as any[]) || []
        const openQuestions = ((character as any).open_questions as string[]) || []

        setSectionContent({
          summary: !!character.summary,
          tldr: tldr.length > 0,
          backstory: !!character.notes,
          lifePhases: backstoryPhases.length > 0,
          plotHooks: plotHooks.length > 0,
          quotes: quotes.length > 0,
          appearance: !!character.appearance,
          physicalDetails: !!(character as any).height || !!(character as any).weight || !!(character as any).hair || !!(character as any).eyes,
          personality: !!character.personality,
          goals: !!character.goals,
          secrets: !!character.secrets,
          fears: fears.length > 0,
          partyMembers: partyMembers.length > 0,
          npcs: npcs.length > 0,
          companions: companions.length > 0,
          writings: (writings?.length || 0) > 0,
          rumors: rumors.length > 0,
          dmQa: dmQa.length > 0,
          openQuestions: openQuestions.length > 0,
          sessions: (sessions?.length || 0) > 0,
          gallery: (images?.length || 0) > 0,
        })
      }
    } catch (err) {
      console.error('Error loading section content:', err)
    }
    setLoadingContent(false)
  }

  const toggleSection = (key: string) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const createShare = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/vault/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId,
          includedSections: sections,
          expiresInDays,
          note: note.trim() || null,
        }),
      })

      if (!res.ok) throw new Error('Failed to create share')

      const data = await res.json()
      const newShare = {
        id: data.shareId || Date.now().toString(),
        share_code: data.shareCode,
        included_sections: sections,
        note: note.trim() || null,
        created_at: new Date().toISOString(),
        view_count: 0,
      }
      setShareCode(data.shareCode)
      setShareUrl(`${window.location.origin}${data.shareUrl}`)
      setSelectedShareId(newShare.id)
      setExistingShares(prev => [newShare, ...prev])
      setShowNewLinkForm(false)

      // Log activity
      if (user) {
        await logActivity(supabase, user.id, {
          action: 'share.create',
          entity_type: 'share',
          entity_id: data.shareId,
          entity_name: characterName,
          metadata: {
            share_type: 'character',
            share_code: data.shareCode,
            sections_included: Object.keys(sections).filter(k => sections[k]),
            expires_in_days: expiresInDays,
            note: note.trim() || null,
          },
        })
      }
    } catch (err) {
      console.error('Share creation error:', err)
    }
    setLoading(false)
  }

  const updateShare = async () => {
    if (!shareCode) return
    setLoading(true)
    try {
      await supabase
        .from('character_shares')
        .update({
          included_sections: sections,
          note: note.trim() || null,
        })
        .eq('share_code', shareCode)
    } catch (err) {
      console.error('Update error:', err)
    }
    setLoading(false)
  }

  const revokeShare = async () => {
    if (!shareCode) return
    const revokedCode = shareCode // Capture before clearing
    setLoading(true)
    try {
      await fetch(`/api/vault/share?code=${shareCode}`, { method: 'DELETE' })
      setExistingShares(prev => prev.filter(s => s.share_code !== shareCode))
      setShareUrl(null)
      setShareCode(null)
      setSelectedShareId(null)
      // If there are other shares, don't show new link form
      // If no shares left, show new link form
      if (existingShares.length <= 1) {
        setShowNewLinkForm(true)
      }

      // Log activity
      if (user) {
        await logActivity(supabase, user.id, {
          action: 'share.revoke',
          entity_type: 'share',
          entity_name: characterName,
          metadata: {
            share_type: 'character',
            share_code: revokedCode,
          },
        })
      }
    } catch (err) {
      console.error('Revoke error:', err)
    }
    setLoading(false)
  }

  const copyToClipboard = async () => {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Group sections
  const groups = ['BACKSTORY', 'DETAILS', 'PEOPLE', 'WRITINGS', 'SESSIONS', 'GALLERY']

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Share "${characterName}"`}
      description="Create a shareable link with selective visibility"
      size="lg"
    >
      {checkingExisting || loadingContent ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
        </div>
      ) : (
        <div className="space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto">
          {/* Existing Shares List */}
          {existingShares.length > 0 && !selectedShareId && !showNewLinkForm && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-400">
                  Existing share links ({existingShares.length}):
                </label>
                <button
                  onClick={startNewLink}
                  className="flex items-center gap-1.5 text-sm text-purple-400 hover:text-purple-300 transition-colors"
                >
                  <Link2 className="w-4 h-4" />
                  Create New Link
                </button>
              </div>
              <div className="space-y-2">
                {existingShares.map((share) => (
                  <button
                    key={share.id}
                    onClick={() => selectShare(share)}
                    className="w-full p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-left transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono text-purple-400 truncate">
                            /share/c/{share.share_code}
                          </span>
                          {share.view_count > 0 && (
                            <span className="text-xs text-gray-500">{share.view_count} views</span>
                          )}
                        </div>
                        {share.note && (
                          <p className="text-xs text-gray-500 mt-1 truncate">{share.note}</p>
                        )}
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-500 flex-shrink-0 ml-2" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Show form when creating new or editing existing */}
          {(showNewLinkForm || selectedShareId || existingShares.length === 0) && (
            <>
              {/* Back button when editing */}
              {existingShares.length > 0 && (selectedShareId || showNewLinkForm) && (
                <button
                  onClick={() => {
                    setSelectedShareId(null)
                    setShareUrl(null)
                    setShareCode(null)
                    setShowNewLinkForm(false)
                  }}
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors mb-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to all links
                </button>
              )}

              {/* Section Toggles */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-3">
                  Select what to include:
                </label>
                <div className="border border-white/10 rounded-xl overflow-hidden divide-y divide-white/10">
                  {groups.map((group) => {
                    const groupToggles = SECTION_TOGGLES.filter((t) => t.group === group)
                    const hasAnyContent = groupToggles.some(t => sectionContent[t.key])

                    return (
                      <div key={group} className="p-4">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                          {group}
                          {!hasAnyContent && (
                            <span className="text-xs font-normal normal-case text-gray-600">(no content)</span>
                          )}
                        </h4>
                        <div className="space-y-2">
                          {groupToggles.map((toggle) => {
                            const hasContent = sectionContent[toggle.key]
                            const isEnabled = sections[toggle.key]

                            return (
                              <label
                                key={toggle.key}
                                className={`flex items-center gap-3 cursor-pointer group ${!hasContent ? 'opacity-50' : ''}`}
                              >
                                <button
                                  type="button"
                                  onClick={() => toggleSection(toggle.key)}
                                  disabled={!hasContent}
                                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                    isEnabled && hasContent
                                      ? 'bg-purple-600 border-purple-600'
                                      : 'border-white/20 hover:border-white/40'
                                  } ${!hasContent ? 'cursor-not-allowed' : ''}`}
                                >
                                  {isEnabled && hasContent && <Check className="w-3 h-3 text-white" />}
                                </button>
                                <span className={`text-sm transition-colors ${
                                  hasContent ? 'text-gray-300 group-hover:text-white' : 'text-gray-600'
                                }`}>
                                  {toggle.label}
                                </span>
                                {toggle.warning && hasContent && (
                                  <span className="text-xs text-amber-500">({toggle.warning})</span>
                                )}
                                {!hasContent && (
                                  <span className="text-xs text-gray-600 italic">empty</span>
                                )}
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Expiration - only for new links */}
              {showNewLinkForm && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Link expires:
                  </label>
                  <div className="relative">
                    <select
                      value={expiresInDays === null ? '' : expiresInDays}
                      onChange={(e) =>
                        setExpiresInDays(e.target.value === '' ? null : parseInt(e.target.value))
                      }
                      className="w-full py-3 px-4 bg-[#1a1a24] border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 appearance-none cursor-pointer"
                      style={{ colorScheme: 'dark' }}
                    >
                      {EXPIRATION_OPTIONS.map((opt) => (
                        <option
                          key={opt.label}
                          value={opt.value === null ? '' : opt.value}
                          className="bg-[#1a1a24] text-white"
                        >
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}

              {/* Note for remembering who/why */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Note (optional):
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g., For my DM, Discord group, Reddit post..."
                  className="w-full py-3 px-4 bg-[#1a1a24] border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Helps you remember who this link was shared with
                </p>
              </div>

              {/* Share URL Display for selected share */}
              {shareUrl ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-4 bg-white/5 border border-white/10 rounded-xl">
                    <Link2 className="w-5 h-5 text-purple-400 flex-shrink-0" />
                    <input
                      type="text"
                      value={shareUrl}
                      readOnly
                      className="flex-1 bg-transparent text-sm text-gray-300 outline-none truncate"
                    />
                    <button
                      onClick={copyToClipboard}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-purple-400 bg-purple-500/10 rounded-lg hover:bg-purple-500/20 transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <a
                      href={shareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-gray-400 hover:text-purple-400 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Preview link
                    </a>
                  </div>

                  {/* Update button for existing shares */}
                  <button
                    onClick={updateShare}
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Update Share Settings'
                    )}
                  </button>
                </div>
              ) : (
                <button
                  onClick={createShare}
                  disabled={loading}
                  className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4" />
                      Create Share Link
                    </>
                  )}
                </button>
              )}

              {/* Actions */}
              <div className="flex justify-between pt-4 border-t border-white/10">
                {shareUrl ? (
                  <button
                    onClick={revokeShare}
                    disabled={loading}
                    className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Revoke Link
                  </button>
                ) : (
                  <div />
                )}
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                >
                  Done
                </button>
              </div>
            </>
          )}

          {/* Done button when viewing list */}
          {existingShares.length > 0 && !selectedShareId && !showNewLinkForm && (
            <div className="flex justify-end pt-4 border-t border-white/10">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

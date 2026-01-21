'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui'
import { Check, Copy, Link2, Trash2, Loader2, ExternalLink, Bookmark, Info } from 'lucide-react'
import { useSupabase } from '@/hooks'
import type { ContentMode } from '@/types/database'

interface ShareOneshotModalProps {
  isOpen: boolean
  onClose: () => void
  oneshotId: string
  oneshotTitle: string
  contentMode?: ContentMode
}

interface SectionToggle {
  key: string
  label: string
  group: string
  defaultOn: boolean
  warning?: string
}

const SECTION_TOGGLES: SectionToggle[] = [
  // Overview
  { key: 'introduction', label: 'Introduction', group: 'OVERVIEW', defaultOn: true },
  { key: 'tagline', label: 'Tagline', group: 'OVERVIEW', defaultOn: true },
  { key: 'settingNotes', label: 'Setting Notes', group: 'OVERVIEW', defaultOn: true },
  // Player Info
  { key: 'characterCreation', label: 'Character Creation Rules', group: 'PLAYER INFO', defaultOn: true },
  { key: 'handouts', label: 'Handouts', group: 'PLAYER INFO', defaultOn: true },
  // DM Only
  { key: 'sessionPlan', label: 'Session Plan', group: 'DM ONLY', defaultOn: false, warning: 'spoilers' },
  { key: 'twists', label: 'Twists & Secrets', group: 'DM ONLY', defaultOn: false, warning: 'spoilers' },
  { key: 'keyNpcs', label: 'Key NPCs', group: 'DM ONLY', defaultOn: false },
]

const EXPIRATION_OPTIONS = [
  { value: null, label: 'Never' },
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
]

export function ShareOneshotModal({
  isOpen,
  onClose,
  oneshotId,
  oneshotTitle,
  contentMode = 'active',
}: ShareOneshotModalProps) {
  const supabase = useSupabase()
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
  const [allowSave, setAllowSave] = useState(false)

  const isTemplate = contentMode === 'template'

  // Initialize with defaults
  useEffect(() => {
    const defaults: Record<string, boolean> = {}
    SECTION_TOGGLES.forEach((t) => {
      defaults[t.key] = t.defaultOn
    })
    setSections(defaults)
  }, [])

  // Check for existing share when modal opens
  useEffect(() => {
    if (isOpen && oneshotId) {
      checkExistingShare()
    }
  }, [isOpen, oneshotId])

  const checkExistingShare = async () => {
    setCheckingExisting(true)
    try {
      const { data } = await supabase
        .from('oneshot_shares')
        .select('*')
        .eq('oneshot_id', oneshotId)
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
    setShareUrl(`${window.location.origin}/share/oneshot/${share.share_code}`)
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

  const toggleSection = (key: string) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const createShare = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/oneshots/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oneshotId,
          includedSections: sections,
          expiresInDays,
          note: note.trim() || null,
          allowSave: isTemplate ? allowSave : false,
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
        .from('oneshot_shares')
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
    setLoading(true)
    try {
      await fetch(`/api/oneshots/share?code=${shareCode}`, { method: 'DELETE' })
      setExistingShares(prev => prev.filter(s => s.share_code !== shareCode))
      setShareUrl(null)
      setShareCode(null)
      setSelectedShareId(null)
      // If no shares left, show new link form
      if (existingShares.length <= 1) {
        setShowNewLinkForm(true)
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
  const groups = ['OVERVIEW', 'PLAYER INFO', 'DM ONLY']

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Share "${oneshotTitle}"`}
      description="Create a shareable link with selective visibility"
      size="lg"
    >
      {checkingExisting ? (
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
                            /share/oneshot/{share.share_code}
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
                  {groups.map((group) => (
                    <div key={group} className="p-4">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        {group}
                      </h4>
                      <div className="space-y-2">
                        {SECTION_TOGGLES.filter((t) => t.group === group).map((toggle) => (
                          <label
                            key={toggle.key}
                            className="flex items-center gap-3 cursor-pointer group"
                          >
                            <button
                              type="button"
                              onClick={() => toggleSection(toggle.key)}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                sections[toggle.key]
                                  ? 'bg-purple-600 border-purple-600'
                                  : 'border-white/20 hover:border-white/40'
                              }`}
                            >
                              {sections[toggle.key] && <Check className="w-3 h-3 text-white" />}
                            </button>
                            <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                              {toggle.label}
                            </span>
                            {toggle.warning && (
                              <span className="text-xs text-amber-500">({toggle.warning})</span>
                            )}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Template Settings - only for templates */}
              {isTemplate ? (
                <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                  <div className="flex items-start gap-3 mb-3">
                    <Bookmark className="w-5 h-5 text-amber-400 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-white">Template Settings</h4>
                      <p className="text-xs text-gray-400 mt-1">
                        Control how others can interact with this template
                      </p>
                    </div>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-white/[0.02]">
                    <button
                      type="button"
                      onClick={() => setAllowSave(!allowSave)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                        allowSave
                          ? 'bg-amber-600 border-amber-600'
                          : 'border-white/20 hover:border-white/40'
                      }`}
                    >
                      {allowSave && <Check className="w-3 h-3 text-white" />}
                    </button>
                    <div>
                      <span className="text-sm text-gray-300">Allow viewers to save to their collection</span>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Others can save this template to run their own one-shot
                      </p>
                    </div>
                  </label>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                  <Info className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-300">
                      Active content is view-only
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Viewers cannot save this to their collection. To enable saving, publish this as a template first.
                    </p>
                  </div>
                </div>
              )}

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
                  placeholder="e.g., For my players, Discord group..."
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

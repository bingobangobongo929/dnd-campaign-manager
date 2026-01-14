'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui'
import { Check, Copy, Link2, Trash2, Loader2, ExternalLink } from 'lucide-react'
import { useSupabase } from '@/hooks'

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
  { key: 'backstory', label: 'Full Backstory', group: 'BACKSTORY', defaultOn: true },
  { key: 'summary', label: 'Summary / TLDR', group: 'BACKSTORY', defaultOn: true },
  { key: 'plotHooks', label: 'Plot Hooks', group: 'BACKSTORY', defaultOn: true },
  { key: 'quotes', label: 'Quotes', group: 'BACKSTORY', defaultOn: true },
  // Details
  { key: 'appearance', label: 'Appearance', group: 'DETAILS', defaultOn: true },
  { key: 'personality', label: 'Personality', group: 'DETAILS', defaultOn: true },
  { key: 'goals', label: 'Goals & Motivations', group: 'DETAILS', defaultOn: false },
  { key: 'secrets', label: 'Secrets', group: 'DETAILS', defaultOn: false, warning: 'careful!' },
  // People
  { key: 'storyCharacters', label: 'Story Characters (NPCs)', group: 'PEOPLE', defaultOn: true },
  { key: 'learnedFacts', label: "What I've Learned", group: 'PEOPLE', defaultOn: false },
  // Other
  { key: 'journal', label: 'Play Journal', group: 'OTHER', defaultOn: false },
  { key: 'quickStats', label: 'Quick Stats', group: 'OTHER', defaultOn: true },
  { key: 'links', label: 'Links', group: 'OTHER', defaultOn: true },
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
  const [sections, setSections] = useState<Record<string, boolean>>({})
  const [expiresInDays, setExpiresInDays] = useState<number | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [shareCode, setShareCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [existingShare, setExistingShare] = useState<any>(null)
  const [checkingExisting, setCheckingExisting] = useState(true)

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
    if (isOpen && characterId) {
      checkExistingShare()
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
        .limit(1)
        .single()

      if (data) {
        setExistingShare(data)
        setShareCode(data.share_code)
        setShareUrl(`${window.location.origin}/share/c/${data.share_code}`)
        setSections(data.included_sections || {})
      }
    } catch {
      // No existing share
    }
    setCheckingExisting(false)
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
        }),
      })

      if (!res.ok) throw new Error('Failed to create share')

      const data = await res.json()
      setShareCode(data.shareCode)
      setShareUrl(`${window.location.origin}${data.shareUrl}`)
      setExistingShare({ share_code: data.shareCode })
    } catch (err) {
      console.error('Share creation error:', err)
    }
    setLoading(false)
  }

  const revokeShare = async () => {
    if (!shareCode) return
    setLoading(true)
    try {
      await fetch(`/api/vault/share?code=${shareCode}`, { method: 'DELETE' })
      setShareUrl(null)
      setShareCode(null)
      setExistingShare(null)
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
  const groups = ['BACKSTORY', 'DETAILS', 'PEOPLE', 'OTHER']

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Share "${characterName}"`}
      description="Create a shareable link with selective visibility"
      size="lg"
    >
      {checkingExisting ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
        </div>
      ) : (
        <div className="space-y-6">
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

          {/* Expiration */}
          {!existingShare && (
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

          {/* Share URL Display */}
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
                {existingShare && (
                  <span className="text-xs text-gray-500">
                    {existingShare.view_count || 0} views
                  </span>
                )}
              </div>
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
        </div>
      )}
    </Modal>
  )
}

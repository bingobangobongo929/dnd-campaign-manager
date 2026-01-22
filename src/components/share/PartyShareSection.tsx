'use client'

import { useState, useCallback } from 'react'
import {
  Link2,
  Copy,
  Check,
  Trash2,
  Loader2,
  Lock,
  LockOpen,
  Eye,
  KeyRound,
} from 'lucide-react'
import { Input } from '@/components/ui'
import { cn } from '@/lib/utils'

export type ContentType = 'campaign' | 'character' | 'oneshot'

interface ShareLink {
  id: string
  share_code: string
  note?: string | null
  created_at: string
  view_count: number
  password_hash?: string | null
  share_type?: string
}

interface PartyShareSectionProps {
  contentType: ContentType
  contentId: string
  existingShares: ShareLink[]
  onShareCreated: (share: ShareLink) => void
  onShareRevoked: (code: string) => void
  onPasswordUpdated?: (code: string, hasPassword: boolean) => void
}

export function PartyShareSection({
  contentType,
  contentId,
  existingShares,
  onShareCreated,
  onShareRevoked,
  onPasswordUpdated,
}: PartyShareSectionProps) {
  const [loading, setLoading] = useState(false)
  const [shareNote, setShareNote] = useState('')
  const [usePassword, setUsePassword] = useState(false)
  const [password, setPassword] = useState('')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [changingPasswordFor, setChangingPasswordFor] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')

  // Filter to only party shares (not template shares)
  const partyShares = existingShares.filter(s => !s.share_type || s.share_type === 'party')

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

  const createShareLink = async () => {
    if (usePassword && !password.trim()) {
      setError('Please enter a password or uncheck password protection')
      return
    }

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
        note: shareNote.trim() || null,
        shareType: 'party',
        password: usePassword ? password : undefined,
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
        note: shareNote.trim() || null,
        created_at: new Date().toISOString(),
        view_count: 0,
        password_hash: usePassword ? 'set' : null, // Just indicate presence
        share_type: 'party',
      }

      onShareCreated(newShare)

      // Reset form
      setShareNote('')
      setPassword('')
      setUsePassword(false)
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

  const updatePassword = async (code: string) => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/shares/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareCode: code,
          newPassword: newPassword.trim() || null,
        }),
      })

      if (!res.ok) throw new Error('Failed to update password')

      onPasswordUpdated?.(code, !!newPassword.trim())
      setChangingPasswordFor(null)
      setNewPassword('')
    } catch (err) {
      console.error('Update password error:', err)
      setError('Failed to update password')
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

  return (
    <div className="space-y-6">
      {/* Description */}
      <p className="text-sm text-gray-400">
        Share a live view with your party members. They'll see your content as you update it.
      </p>

      {/* Existing Shares */}
      {partyShares.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Active Share Links
          </h4>
          {partyShares.map((share) => (
            <div
              key={share.id}
              className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {share.note && (
                    <p className="text-sm text-gray-300 truncate mb-1">{share.note}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{formatDate(share.created_at)}</span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {share.view_count} views
                    </span>
                    {share.password_hash && (
                      <span className="flex items-center gap-1 text-amber-500">
                        <Lock className="w-3 h-3" />
                        Password
                      </span>
                    )}
                  </div>
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
                    onClick={() => {
                      setChangingPasswordFor(share.share_code)
                      setNewPassword('')
                    }}
                    className="p-2 text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                    title={share.password_hash ? 'Change password' : 'Add password'}
                  >
                    <KeyRound className="w-4 h-4" />
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

              {/* Password change form */}
              {changingPasswordFor === share.share_code && (
                <div className="pt-3 border-t border-white/[0.06] space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={share.password_hash ? 'New password (leave empty to remove)' : 'Set a password'}
                      className="flex-1 bg-white/[0.03] border-white/[0.08]"
                    />
                    <button
                      onClick={() => updatePassword(share.share_code)}
                      disabled={loading}
                      className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                    </button>
                    <button
                      onClick={() => setChangingPasswordFor(null)}
                      className="px-3 py-2 text-gray-400 hover:text-white text-sm rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    {share.password_hash
                      ? 'Change the password if a player leaves your group. Leave empty to remove protection.'
                      : 'Add a password to restrict access to your share link.'}
                  </p>
                </div>
              )}

              {/* Share URL */}
              <div className="flex items-center gap-2 px-3 py-2 bg-black/30 rounded-lg text-xs font-mono text-gray-400 truncate">
                <Link2 className="w-3 h-3 flex-shrink-0" />
                {`${typeof window !== 'undefined' ? window.location.origin : ''}${getShareUrlPath()}/${share.share_code}`}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create New Share */}
      <div className="space-y-4 pt-4 border-t border-white/[0.06]">
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          Create New Link
        </h4>

        {/* Note */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400">Note (optional)</label>
          <Input
            value={shareNote}
            onChange={(e) => setShareNote(e.target.value)}
            placeholder="e.g., For my Tuesday group"
            className="bg-white/[0.03] border-white/[0.08]"
          />
        </div>

        {/* Password protection */}
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className={cn(
              "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
              usePassword
                ? "bg-amber-600 border-amber-600"
                : "border-white/20 group-hover:border-white/40"
            )}>
              {usePassword && <Check className="w-3 h-3 text-white" />}
            </div>
            <span className="text-sm text-gray-300 flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-500" />
              Password protect
            </span>
          </label>

          <input
            type="checkbox"
            checked={usePassword}
            onChange={(e) => setUsePassword(e.target.checked)}
            className="sr-only"
          />

          {usePassword && (
            <div className="space-y-2 ml-8">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a password"
                className="bg-white/[0.03] border-white/[0.08]"
              />
              <p className="text-xs text-gray-500">
                Change this if a player leaves your group
              </p>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        {/* Create button */}
        <button
          onClick={createShareLink}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
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
    </div>
  )
}

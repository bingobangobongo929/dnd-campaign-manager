'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import {
  Plus,
  Copy,
  Trash2,
  Check,
  X,
  Calendar,
  Hash,
  Users,
  Ticket,
  RefreshCw,
  Send,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { useSupabase } from '@/hooks'
import { cn } from '@/lib/utils'

interface InviteCode {
  id: string
  code: string
  created_by: string
  used_by: string | null
  used_at: string | null
  expires_at: string | null
  max_uses: number
  current_uses: number
  note: string | null
  is_active: boolean
  created_at: string
  creator_email?: string
  user_email?: string
}

export default function InvitesPage() {
  const supabase = useSupabase()
  const [invites, setInvites] = useState<InviteCode[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [error, setError] = useState('')

  // Form state
  const [newInvite, setNewInvite] = useState({
    maxUses: 1,
    expiresIn: '7', // days, '' for never
    note: '',
    sendEmail: false,
    recipientEmail: ''
  })

  // Stats
  const stats = {
    total: invites.length,
    active: invites.filter(i => i.is_active && (i.max_uses === 0 || i.current_uses < i.max_uses)).length,
    used: invites.filter(i => i.current_uses > 0).length,
    expired: invites.filter(i => i.expires_at && new Date(i.expires_at) < new Date()).length
  }

  useEffect(() => {
    loadInvites()
  }, [])

  const loadInvites = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('invite_codes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Enrich with user emails if needed
      setInvites(data || [])
    } catch (err) {
      console.error('Failed to load invites:', err)
    } finally {
      setLoading(false)
    }
  }

  const createInvite = async () => {
    setCreating(true)
    setError('')
    try {
      const response = await fetch('/api/admin/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxUses: newInvite.maxUses,
          expiresInDays: newInvite.expiresIn ? parseInt(newInvite.expiresIn) : null,
          note: newInvite.note || null,
          sendEmail: newInvite.sendEmail,
          recipientEmail: newInvite.sendEmail ? newInvite.recipientEmail : null
        })
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to create invite')
        return
      }

      await loadInvites()
      setShowCreateModal(false)
      setNewInvite({
        maxUses: 1,
        expiresIn: '7',
        note: '',
        sendEmail: false,
        recipientEmail: ''
      })
    } catch (err) {
      setError('Failed to create invite')
    } finally {
      setCreating(false)
    }
  }

  const toggleInvite = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('invite_codes')
        .update({ is_active: !isActive, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
      await loadInvites()
    } catch (err) {
      console.error('Failed to toggle invite:', err)
    }
  }

  const deleteInvite = async (id: string) => {
    if (!confirm('Are you sure you want to delete this invite code?')) return

    try {
      const { error } = await supabase
        .from('invite_codes')
        .delete()
        .eq('id', id)

      if (error) throw error
      await loadInvites()
    } catch (err) {
      console.error('Failed to delete invite:', err)
    }
  }

  const copyCode = async (code: string, id: string) => {
    await navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const copyInviteLink = async (code: string, id: string) => {
    const link = `https://multiloop.app/login?invite=${code}`
    await navigator.clipboard.writeText(link)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const getStatusBadge = (invite: InviteCode) => {
    const isExpired = invite.expires_at && new Date(invite.expires_at) < new Date()
    const isUsedUp = invite.max_uses > 0 && invite.current_uses >= invite.max_uses

    if (!invite.is_active) {
      return <span className="px-2 py-0.5 text-xs rounded-full bg-gray-500/20 text-gray-400">Disabled</span>
    }
    if (isExpired) {
      return <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400">Expired</span>
    }
    if (isUsedUp) {
      return <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-500/20 text-yellow-400">Used</span>
    }
    return <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400">Active</span>
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Ticket className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-sm text-gray-400">Total Codes</p>
            </div>
          </div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Check className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.active}</p>
              <p className="text-sm text-gray-400">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.used}</p>
              <p className="text-sm text-gray-400">Used</p>
            </div>
          </div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <Calendar className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.expired}</p>
              <p className="text-sm text-gray-400">Expired</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Invite Codes</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={loadInvites}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors"
          >
            <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Invite
          </button>
        </div>
      </div>

      {/* Invites Table */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
          </div>
        ) : invites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Ticket className="w-12 h-12 mb-3 opacity-50" />
            <p className="font-medium">No invite codes yet</p>
            <p className="text-sm mt-1">Create your first invite code to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Code</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Status</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Uses</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Expires</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Note</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Created</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((invite) => (
                  <tr key={invite.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-1 bg-white/[0.04] rounded font-mono text-sm text-purple-400">
                          {invite.code}
                        </code>
                        <button
                          onClick={() => copyCode(invite.code, invite.id)}
                          className="p-1 text-gray-500 hover:text-white transition-colors"
                          title="Copy code"
                        >
                          {copiedId === invite.id ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(invite)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {invite.current_uses} / {invite.max_uses || '∞'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {invite.expires_at
                        ? format(new Date(invite.expires_at), 'MMM d, yyyy')
                        : 'Never'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400 max-w-[200px] truncate">
                      {invite.note || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {format(new Date(invite.created_at), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => copyInviteLink(invite.code, invite.id + '-link')}
                          className="p-2 text-gray-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors"
                          title="Copy invite link"
                        >
                          {copiedId === invite.id + '-link' ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => toggleInvite(invite.id, invite.is_active)}
                          className={cn(
                            "p-2 rounded-lg transition-colors",
                            invite.is_active
                              ? "text-green-400 hover:text-green-300 hover:bg-green-500/10"
                              : "text-gray-400 hover:text-white hover:bg-white/[0.06]"
                          )}
                          title={invite.is_active ? "Disable" : "Enable"}
                        >
                          {invite.is_active ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => deleteInvite(invite.id)}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="relative bg-[#1a1a24] border border-white/[0.08] rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-white/[0.06]">
              <h3 className="text-lg font-semibold text-white">Create Invite Code</h3>
              <p className="text-sm text-gray-400 mt-1">Generate a new invite code for users</p>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Max Uses */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Maximum Uses
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newInvite.maxUses}
                    onChange={(e) => setNewInvite({ ...newInvite, maxUses: parseInt(e.target.value) || 1 })}
                    className="flex-1 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-purple-500/50"
                  />
                  <span className="text-sm text-gray-400">uses</span>
                </div>
              </div>

              {/* Expiration */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Expires In
                </label>
                <select
                  value={newInvite.expiresIn}
                  onChange={(e) => setNewInvite({ ...newInvite, expiresIn: e.target.value })}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-purple-500/50"
                >
                  <option value="1">1 day</option>
                  <option value="7">7 days</option>
                  <option value="14">14 days</option>
                  <option value="30">30 days</option>
                  <option value="90">90 days</option>
                  <option value="">Never</option>
                </select>
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Note (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., For John's campaign group"
                  value={newInvite.note}
                  onChange={(e) => setNewInvite({ ...newInvite, note: e.target.value })}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50"
                />
              </div>

              {/* Send Email */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newInvite.sendEmail}
                    onChange={(e) => setNewInvite({ ...newInvite, sendEmail: e.target.checked })}
                    className="w-4 h-4 rounded bg-white/[0.04] border-white/[0.08] text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-300">Send invite via email</span>
                </label>

                {newInvite.sendEmail && (
                  <input
                    type="email"
                    placeholder="recipient@example.com"
                    value={newInvite.recipientEmail}
                    onChange={(e) => setNewInvite({ ...newInvite, recipientEmail: e.target.value })}
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50"
                  />
                )}
              </div>
            </div>

            <div className="p-6 border-t border-white/[0.06] flex items-center justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createInvite}
                disabled={creating || (newInvite.sendEmail && !newInvite.recipientEmail)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Code
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import {
  Clock,
  Check,
  Trash2,
  RefreshCw,
  Loader2,
  Mail,
  MailCheck,
  Users,
  Search,
  Download,
  Send,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react'
import { useSupabase } from '@/hooks'
import { cn } from '@/lib/utils'

interface WaitlistEntry {
  id: string
  email: string
  created_at: string
  invited_at: string | null
  notes: string | null
  verified: boolean
  verification_sent_at: string | null
  token_expires_at: string | null
}

export default function WaitlistPage() {
  const supabase = useSupabase()
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [sendingInvite, setSendingInvite] = useState<string | null>(null)
  const [bulkSending, setBulkSending] = useState(false)

  // Stats
  const stats = {
    total: entries.length,
    verified: entries.filter(e => e.verified).length,
    unverified: entries.filter(e => !e.verified).length,
    pending: entries.filter(e => e.verified && !e.invited_at).length,
    invited: entries.filter(e => e.invited_at).length,
  }

  // Filtered entries
  const filteredEntries = entries.filter(e =>
    e.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.notes && e.notes.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  useEffect(() => {
    loadWaitlist()
  }, [])

  const loadWaitlist = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/waitlist')
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to load waitlist')
      }
      const { entries: data } = await res.json()
      setEntries(data || [])
    } catch (err) {
      console.error('Failed to load waitlist:', err)
    } finally {
      setLoading(false)
    }
  }

  const sendInviteToEmail = async (entry: WaitlistEntry) => {
    setSendingInvite(entry.id)
    try {
      // Create an invite code and send it via email
      const response = await fetch('/api/admin/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxUses: 1,
          expiresInDays: 14,
          note: `Waitlist invite for ${entry.email}`,
          sendEmail: true,
          recipientEmail: entry.email
        })
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to send invite')
      }

      // Mark as invited
      await supabase
        .from('waitlist')
        .update({ invited_at: new Date().toISOString() })
        .eq('id', entry.id)

      await loadWaitlist()
    } catch (err) {
      console.error('Failed to send invite:', err)
      alert(err instanceof Error ? err.message : 'Failed to send invite')
    } finally {
      setSendingInvite(null)
    }
  }

  const sendBulkInvites = async () => {
    // Only invite verified users who haven't been invited yet
    const pendingSelected = filteredEntries.filter(
      e => selectedIds.has(e.id) && e.verified && !e.invited_at
    )

    if (pendingSelected.length === 0) {
      alert('No verified pending entries selected. Users must verify their email first.')
      return
    }

    if (!confirm(`Send invites to ${pendingSelected.length} verified email(s)?`)) return

    setBulkSending(true)
    let successCount = 0
    let failCount = 0

    for (const entry of pendingSelected) {
      try {
        const response = await fetch('/api/admin/invites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            maxUses: 1,
            expiresInDays: 14,
            note: `Waitlist invite for ${entry.email}`,
            sendEmail: true,
            recipientEmail: entry.email
          })
        })

        if (response.ok) {
          await supabase
            .from('waitlist')
            .update({ invited_at: new Date().toISOString() })
            .eq('id', entry.id)
          successCount++
        } else {
          failCount++
        }
      } catch {
        failCount++
      }
    }

    setBulkSending(false)
    setSelectedIds(new Set())
    await loadWaitlist()
    alert(`Sent ${successCount} invite(s)${failCount > 0 ? `, ${failCount} failed` : ''}`)
  }

  const deleteEntry = async (id: string) => {
    if (!confirm('Remove this email from the waitlist?')) return

    try {
      const res = await fetch(`/api/waitlist?id=${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete entry')
      }

      await loadWaitlist()
    } catch (err) {
      console.error('Failed to delete entry:', err)
      alert(err instanceof Error ? err.message : 'Failed to delete entry')
    }
  }

  const exportToCsv = () => {
    const csvContent = [
      ['Email', 'Verified', 'Signed Up', 'Invited', 'Notes'].join(','),
      ...entries.map(e => [
        e.email,
        e.verified ? 'Yes' : 'No',
        format(new Date(e.created_at), 'yyyy-MM-dd HH:mm'),
        e.invited_at ? format(new Date(e.invited_at), 'yyyy-MM-dd HH:mm') : '',
        e.notes || ''
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `waitlist-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const toggleAll = () => {
    if (selectedIds.size === filteredEntries.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredEntries.map(e => e.id)))
    }
  }

  const toggleOne = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-sm text-gray-400">Total</p>
            </div>
          </div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.verified}</p>
              <p className="text-sm text-gray-400">Verified</p>
            </div>
          </div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.pending}</p>
              <p className="text-sm text-gray-400">Pending Invite</p>
            </div>
          </div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <MailCheck className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.invited}</p>
              <p className="text-sm text-gray-400">Invited</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search by email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadWaitlist}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
          </button>
          <button
            onClick={exportToCsv}
            className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors"
            title="Export CSV"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm hidden sm:inline">Export</span>
          </button>
          {selectedIds.size > 0 && (
            <button
              onClick={sendBulkInvites}
              disabled={bulkSending}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {bulkSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Invite Selected ({selectedIds.size})
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Mail className="w-12 h-12 mb-3 opacity-50" />
            <p className="font-medium">No waitlist signups yet</p>
            <p className="text-sm mt-1">Share your landing page to start collecting emails</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredEntries.length && filteredEntries.length > 0}
                      onChange={toggleAll}
                      className="w-4 h-4 rounded bg-white/[0.04] border-white/[0.08] text-purple-600 focus:ring-purple-500"
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Email</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Verified</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Invite Status</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Signed Up</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => {
                  // Check if token is expired
                  const isExpired = entry.token_expires_at && new Date(entry.token_expires_at) < new Date()
                  const canInvite = entry.verified && !entry.invited_at

                  return (
                    <tr key={entry.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(entry.id)}
                          onChange={() => toggleOne(entry.id)}
                          className="w-4 h-4 rounded bg-white/[0.04] border-white/[0.08] text-purple-600 focus:ring-purple-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-white">{entry.email}</span>
                      </td>
                      <td className="px-4 py-3">
                        {entry.verified ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400">
                            <CheckCircle className="w-3 h-3" />
                            Verified
                          </span>
                        ) : isExpired ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400">
                            <AlertCircle className="w-3 h-3" />
                            Expired
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-400">
                            <Clock className="w-3 h-3" />
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {entry.invited_at ? (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-400">
                            Invited
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-gray-500/20 text-gray-400">
                            Not invited
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {format(new Date(entry.created_at), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {!entry.invited_at && (
                            <button
                              onClick={() => sendInviteToEmail(entry)}
                              disabled={sendingInvite === entry.id || !canInvite}
                              className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors",
                                canInvite
                                  ? "text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                                  : "text-gray-600 cursor-not-allowed"
                              )}
                              title={canInvite ? "Send invite" : "Must verify email first"}
                            >
                              {sendingInvite === entry.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                              Invite
                            </button>
                          )}
                          {entry.invited_at && (
                            <span className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-400">
                              <Check className="w-4 h-4" />
                              Sent
                            </span>
                          )}
                          <button
                            onClick={() => deleteEntry(entry.id)}
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Remove"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filteredEntries.length > 0 && filteredEntries.length !== entries.length && (
        <p className="text-sm text-gray-500 text-center">
          Showing {filteredEntries.length} of {entries.length} entries
        </p>
      )}
    </div>
  )
}

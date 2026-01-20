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
} from 'lucide-react'
import { useSupabase } from '@/hooks'
import { cn } from '@/lib/utils'

interface WaitlistEntry {
  id: string
  email: string
  created_at: string
  invited_at: string | null
  notes: string | null
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
    pending: entries.filter(e => !e.invited_at).length,
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
      const { data, error } = await supabase
        .from('waitlist')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
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
    const pendingSelected = filteredEntries.filter(
      e => selectedIds.has(e.id) && !e.invited_at
    )

    if (pendingSelected.length === 0) {
      alert('No pending entries selected')
      return
    }

    if (!confirm(`Send invites to ${pendingSelected.length} email(s)?`)) return

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
      const { error } = await supabase
        .from('waitlist')
        .delete()
        .eq('id', id)

      if (error) throw error
      await loadWaitlist()
    } catch (err) {
      console.error('Failed to delete entry:', err)
    }
  }

  const exportToCsv = () => {
    const csvContent = [
      ['Email', 'Signed Up', 'Invited', 'Notes'].join(','),
      ...entries.map(e => [
        e.email,
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
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-sm text-gray-400">Total Signups</p>
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
              <p className="text-sm text-gray-400">Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <MailCheck className="w-5 h-5 text-green-400" />
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
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Status</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Signed Up</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Invited</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
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
                      {entry.invited_at ? (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400">
                          Invited
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-400">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {format(new Date(entry.created_at), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {entry.invited_at
                        ? format(new Date(entry.invited_at), 'MMM d, yyyy')
                        : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {!entry.invited_at && (
                          <button
                            onClick={() => sendInviteToEmail(entry)}
                            disabled={sendingInvite === entry.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg transition-colors disabled:opacity-50"
                            title="Send invite"
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
                          <span className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-green-400">
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
                ))}
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

'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Loader2, Star, Calendar } from 'lucide-react'
import { useSupabase, useUser } from '@/hooks'
import { Modal, Button } from '@/components/ui'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import type { Changelog } from '@/types/database'

export default function AdminChangelogPage() {
  const supabase = useSupabase()
  const { user } = useUser()
  const [entries, setEntries] = useState<Changelog[]>([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingEntry, setEditingEntry] = useState<Changelog | null>(null)
  const [formData, setFormData] = useState({
    version: '',
    title: '',
    content: '',
    is_major: false,
  })
  const [saving, setSaving] = useState(false)

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchEntries()
  }, [])

  const fetchEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('changelog')
        .select('*')
        .order('published_at', { ascending: false })

      if (error) throw error
      setEntries(data || [])
    } catch (error) {
      console.error('Failed to fetch changelog:', error)
      toast.error('Failed to load changelog entries')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (entry?: Changelog) => {
    if (entry) {
      setEditingEntry(entry)
      setFormData({
        version: entry.version,
        title: entry.title,
        content: entry.content,
        is_major: entry.is_major,
      })
    } else {
      setEditingEntry(null)
      setFormData({
        version: '',
        title: '',
        content: '',
        is_major: false,
      })
    }
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formData.version.trim() || !formData.title.trim() || !formData.content.trim()) {
      toast.error('Please fill in all required fields')
      return
    }

    setSaving(true)
    try {
      if (editingEntry) {
        // Update existing entry
        const { error } = await supabase
          .from('changelog')
          .update({
            version: formData.version,
            title: formData.title,
            content: formData.content,
            is_major: formData.is_major,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingEntry.id)

        if (error) throw error
        toast.success('Changelog entry updated')
      } else {
        // Create new entry
        const { error } = await supabase
          .from('changelog')
          .insert({
            version: formData.version,
            title: formData.title,
            content: formData.content,
            is_major: formData.is_major,
            created_by: user?.id,
            published_at: new Date().toISOString(),
          })

        if (error) throw error
        toast.success('Changelog entry created')
      }

      setShowModal(false)
      fetchEntries()
    } catch (error) {
      console.error('Failed to save changelog:', error)
      toast.error('Failed to save changelog entry')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return

    setDeleting(true)
    try {
      const { error } = await supabase
        .from('changelog')
        .delete()
        .eq('id', deleteId)

      if (error) throw error
      toast.success('Changelog entry deleted')
      setDeleteId(null)
      fetchEntries()
    } catch (error) {
      console.error('Failed to delete changelog:', error)
      toast.error('Failed to delete changelog entry')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-gray-400">
          Manage public changelog entries. Users can view these at /changelog.
        </p>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4 mr-2" />
          New Entry
        </Button>
      </div>

      {/* Entries */}
      {entries.length === 0 ? (
        <div className="text-center py-16 bg-[#1a1a24] rounded-xl border border-white/[0.06]">
          <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No changelog entries</h3>
          <p className="text-gray-400 mb-6">Create your first changelog entry to keep users informed.</p>
          <Button onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4 mr-2" />
            Create First Entry
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="bg-[#1a1a24] rounded-xl border border-white/[0.06] p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-2 py-1 rounded text-xs font-mono font-medium bg-purple-500/20 text-purple-400">
                      v{entry.version}
                    </span>
                    {entry.is_major && (
                      <span className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-amber-500/20 text-amber-400">
                        <Star className="w-3 h-3" />
                        Major
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      {formatDate(entry.published_at)}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{entry.title}</h3>
                  <p className="text-sm text-gray-400 line-clamp-3 whitespace-pre-wrap">
                    {entry.content}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenModal(entry)}
                    className="p-2 rounded-lg hover:bg-white/[0.04] text-gray-400 hover:text-white transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteId(entry.id)}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingEntry ? 'Edit Changelog Entry' : 'New Changelog Entry'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Version *</label>
              <input
                type="text"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                placeholder="1.0.0"
                className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50"
              />
            </div>
            <div className="space-y-2 flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_major}
                  onChange={(e) => setFormData({ ...formData, is_major: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-600 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-300">Major release</span>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="What's new in this version"
              className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Content *</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Describe the changes in this release..."
              rows={8}
              className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50 resize-none"
            />
            <p className="text-xs text-gray-500">Supports basic markdown formatting</p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setShowModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingEntry ? 'Update' : 'Create')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Changelog Entry"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-400">
            Are you sure you want to delete this changelog entry? This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setDeleteId(null)}
              className="flex-1"
            >
              Cancel
            </Button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 py-2.5 rounded-xl bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 font-medium transition-colors"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

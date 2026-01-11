'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Plus,
  Search,
  Calendar,
  FileText,
  Trash2,
  Edit,
} from 'lucide-react'
import { Input, Modal, Textarea } from '@/components/ui'
import { AppLayout } from '@/components/layout/app-layout'
import { useSupabase, useUser } from '@/hooks'
import { formatDate } from '@/lib/utils'
import type { Campaign, Session } from '@/types/database'

export default function SessionsPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = useSupabase()
  const { user } = useUser()

  const campaignId = params.id as string

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    summary: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user && campaignId) {
      loadData()
    }
  }, [user, campaignId])

  const loadData = async () => {
    setLoading(true)

    const { data: campaignData } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (!campaignData) {
      router.push('/campaigns')
      return
    }
    setCampaign(campaignData)

    const { data: sessionsData } = await supabase
      .from('sessions')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('date', { ascending: false })

    setSessions(sessionsData || [])
    setLoading(false)
  }

  const filteredSessions = sessions.filter((session) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      session.title?.toLowerCase().includes(query) ||
      session.summary?.toLowerCase().includes(query) ||
      session.notes?.toLowerCase().includes(query)
    )
  })

  const handleCreate = async () => {
    if (!formData.title.trim()) return

    setSaving(true)
    const { data } = await supabase
      .from('sessions')
      .insert({
        campaign_id: campaignId,
        title: formData.title,
        date: formData.date,
        summary: formData.summary || null,
        session_number: sessions.length + 1,
      })
      .select()
      .single()

    if (data) {
      setSessions([data, ...sessions])
      setIsCreateModalOpen(false)
      setFormData({
        title: '',
        date: new Date().toISOString().split('T')[0],
        summary: '',
      })
      router.push(`/campaigns/${campaignId}/sessions/${data.id}`)
    }
    setSaving(false)
  }

  const handleUpdate = async () => {
    if (!formData.title.trim() || !editingSession) return

    setSaving(true)
    const { data } = await supabase
      .from('sessions')
      .update({
        title: formData.title,
        date: formData.date,
        summary: formData.summary || null,
      })
      .eq('id', editingSession.id)
      .select()
      .single()

    if (data) {
      setSessions(sessions.map((s) => (s.id === data.id ? data : s)))
      setEditingSession(null)
      setFormData({
        title: '',
        date: new Date().toISOString().split('T')[0],
        summary: '',
      })
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this session? This cannot be undone.')) return

    await supabase.from('sessions').delete().eq('id', id)
    setSessions(sessions.filter((s) => s.id !== id))
  }

  const openEditModal = (session: Session) => {
    setFormData({
      title: session.title || '',
      date: session.date,
      summary: session.summary || '',
    })
    setEditingSession(session)
  }

  if (loading) {
    return (
      <AppLayout campaignId={campaignId}>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-10 h-10 border-2 border-[--arcane-purple] border-t-transparent rounded-full spinner" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout campaignId={campaignId}>
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="page-header flex items-center justify-between">
          <div>
            <h1 className="page-title">Session Notes</h1>
            <p className="page-subtitle">Record your campaign adventures</p>
          </div>
          <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4" />
            New Session
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[--text-tertiary]" />
          <input
            type="text"
            className="form-input pl-12"
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Sessions List */}
        {filteredSessions.length === 0 ? (
          <div className="empty-state">
            <FileText className="empty-state-icon" />
            <h2 className="empty-state-title">
              {searchQuery ? 'No matching sessions' : 'No sessions yet'}
            </h2>
            <p className="empty-state-description">
              {searchQuery
                ? 'Try a different search term'
                : 'Create your first session to start taking notes'}
            </p>
            {!searchQuery && (
              <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="w-5 h-5" />
                Create Session
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSessions.map((session, index) => (
              <div
                key={session.id}
                className="card p-4 cursor-pointer animate-slide-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => router.push(`/campaigns/${campaignId}/sessions/${session.id}`)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="card-campaign-system">
                        Session {session.session_number}
                      </span>
                      <span className="text-xs text-[--text-tertiary] flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(session.date)}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-[--text-primary] truncate">
                      {session.title}
                    </h3>
                    {session.summary && (
                      <p className="text-sm text-[--text-secondary] line-clamp-2 mt-1">
                        {session.summary}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn-ghost btn-icon w-8 h-8"
                      onClick={() => openEditModal(session)}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      className="btn-ghost btn-icon w-8 h-8 text-[--arcane-ember]"
                      onClick={() => handleDelete(session.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* FAB for mobile */}
        {filteredSessions.length > 0 && (
          <button
            className="fab"
            onClick={() => setIsCreateModalOpen(true)}
            aria-label="Create new session"
          >
            <Plus className="fab-icon" />
          </button>
        )}

        {/* Create Modal */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false)
            setFormData({
              title: '',
              date: new Date().toISOString().split('T')[0],
              summary: '',
            })
          }}
          title="New Session"
          description="Create a new session to record your adventures"
        >
          <div className="space-y-4">
            <div className="form-group">
              <label className="form-label">Session Title</label>
              <Input
                className="form-input"
                placeholder="e.g., The Journey Begins"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <Input
                className="form-input"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Summary (optional)</label>
              <Textarea
                className="form-textarea"
                placeholder="Brief summary of what happened..."
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button className="btn btn-secondary" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreate}
                disabled={!formData.title.trim() || saving}
              >
                {saving ? 'Creating...' : 'Create Session'}
              </button>
            </div>
          </div>
        </Modal>

        {/* Edit Modal */}
        <Modal
          isOpen={!!editingSession}
          onClose={() => {
            setEditingSession(null)
            setFormData({
              title: '',
              date: new Date().toISOString().split('T')[0],
              summary: '',
            })
          }}
          title="Edit Session"
        >
          <div className="space-y-4">
            <div className="form-group">
              <label className="form-label">Session Title</label>
              <Input
                className="form-input"
                placeholder="e.g., The Journey Begins"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <Input
                className="form-input"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Summary (optional)</label>
              <Textarea
                className="form-textarea"
                placeholder="Brief summary of what happened..."
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button className="btn btn-secondary" onClick={() => setEditingSession(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleUpdate}
                disabled={!formData.title.trim() || saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  )
}

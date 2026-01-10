'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Plus,
  Search,
  Calendar,
  FileText,
  ArrowLeft,
  MoreHorizontal,
  Trash2,
  Edit,
} from 'lucide-react'
import { Button, Input, Card, CardContent, Modal, Textarea, EmptyState } from '@/components/ui'
import { DashboardLayout } from '@/components/layout'
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

    // Load campaign
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

    // Load sessions
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
    const { data, error } = await supabase
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
      // Navigate to the session editor
      router.push(`/campaigns/${campaignId}/sessions/${data.id}`)
    }
    setSaving(false)
  }

  const handleUpdate = async () => {
    if (!formData.title.trim() || !editingSession) return

    setSaving(true)
    const { data, error } = await supabase
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
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="w-8 h-8 border-2 border-[--accent-primary] border-t-transparent rounded-full spinner" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/campaigns/${campaignId}/canvas`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-[--text-primary]">Session Notes</h1>
            <p className="text-[--text-secondary]">{campaign?.name}</p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Session
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[--text-tertiary]" />
          <Input
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Sessions List */}
        {filteredSessions.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-12 w-12" />}
            title={searchQuery ? 'No matching sessions' : 'No sessions yet'}
            description={
              searchQuery
                ? 'Try a different search term'
                : 'Create your first session to start taking notes'
            }
            action={
              !searchQuery && (
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Session
                </Button>
              )
            }
          />
        ) : (
          <div className="space-y-3">
            {filteredSessions.map((session) => (
              <Card
                key={session.id}
                hover
                onClick={() => router.push(`/campaigns/${campaignId}/sessions/${session.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-xs font-medium text-[--accent-primary] bg-[--accent-primary]/10 px-2 py-0.5 rounded">
                          Session {session.session_number}
                        </span>
                        <span className="text-xs text-[--text-tertiary] flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(session.date)}
                        </span>
                      </div>
                      <h3 className="font-semibold text-[--text-primary] truncate">
                        {session.title}
                      </h3>
                      {session.summary && (
                        <p className="text-sm text-[--text-secondary] line-clamp-2 mt-1">
                          {session.summary}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditModal(session)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-[--accent-danger]"
                        onClick={() => handleDelete(session.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
            <div className="space-y-2">
              <label className="text-sm font-medium text-[--text-primary]">Session Title</label>
              <Input
                placeholder="e.g., The Journey Begins"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[--text-primary]">Date</label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[--text-primary]">Summary (optional)</label>
              <Textarea
                placeholder="Brief summary of what happened..."
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} loading={saving} disabled={!formData.title.trim()}>
                Create Session
              </Button>
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
            <div className="space-y-2">
              <label className="text-sm font-medium text-[--text-primary]">Session Title</label>
              <Input
                placeholder="e.g., The Journey Begins"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[--text-primary]">Date</label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[--text-primary]">Summary (optional)</label>
              <Textarea
                placeholder="Brief summary of what happened..."
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="ghost" onClick={() => setEditingSession(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} loading={saving} disabled={!formData.title.trim()}>
                Save Changes
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  )
}

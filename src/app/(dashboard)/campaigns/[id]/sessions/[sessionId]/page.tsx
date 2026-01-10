'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, Wand2, Save } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { RichTextEditor } from '@/components/editor'
import { DashboardLayout } from '@/components/layout'
import { useSupabase, useUser, useAutoSave } from '@/hooks'
import { formatDate } from '@/lib/utils'
import type { Session, Campaign } from '@/types/database'

export default function SessionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = useSupabase()
  const { user } = useUser()

  const campaignId = params.id as string
  const sessionId = params.sessionId as string

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    title: '',
    notes: '',
    summary: '',
  })

  useEffect(() => {
    if (user && campaignId && sessionId) {
      loadData()
    }
  }, [user, campaignId, sessionId])

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

    // Load session
    const { data: sessionData } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (!sessionData) {
      router.push(`/campaigns/${campaignId}/sessions`)
      return
    }

    setSession(sessionData)
    setFormData({
      title: sessionData.title,
      notes: sessionData.notes || '',
      summary: sessionData.summary || '',
    })
    setLoading(false)
  }

  // Auto-save functionality
  const saveSession = useCallback(async () => {
    if (!session) return

    await supabase
      .from('sessions')
      .update({
        title: formData.title,
        notes: formData.notes || null,
        summary: formData.summary || null,
      })
      .eq('id', session.id)
  }, [formData, session, supabase])

  const { status } = useAutoSave({
    data: formData,
    onSave: saveSession,
    delay: 2000, // Longer delay for rich text
  })

  if (loading || !session) {
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
      <div className="h-full flex flex-col">
        {/* Header */}
        <header className="border-b border-[--border] bg-[--bg-surface] px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push(`/campaigns/${campaignId}/sessions`)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[--accent-primary] bg-[--accent-primary]/10 px-2 py-0.5 rounded">
                    Session {session.session_number}
                  </span>
                  <span className="text-xs text-[--text-tertiary] flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(session.session_date)}
                  </span>
                </div>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="text-xl font-bold mt-1 border-none bg-transparent p-0 h-auto focus:ring-0"
                  placeholder="Session title..."
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-[--text-tertiary]">
                {status === 'saving' && 'Saving...'}
                {status === 'saved' && 'Saved'}
                {status === 'idle' && 'All changes saved'}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  // TODO: AI summarize
                }}
              >
                <Wand2 className="h-4 w-4 mr-2" />
                AI Summarize
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Summary Section */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[--text-primary]">
                Summary
                <span className="ml-2 text-[--text-tertiary] font-normal">
                  (Brief overview for the timeline)
                </span>
              </label>
              <textarea
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                placeholder="What happened in this session..."
                rows={3}
                className="w-full px-4 py-3 bg-[--bg-surface] border border-[--border] rounded-lg text-[--text-primary] placeholder:text-[--text-tertiary] focus:outline-none focus:ring-2 focus:ring-[--accent-primary]/50 resize-none"
              />
            </div>

            {/* Notes Section with Rich Text Editor */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[--text-primary]">
                Detailed Notes
              </label>
              <RichTextEditor
                content={formData.notes}
                onChange={(content) => setFormData({ ...formData, notes: content })}
                placeholder="Write your detailed session notes here..."
              />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

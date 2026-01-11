'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, Sparkles, Loader2, Users, Check } from 'lucide-react'
import { Input } from '@/components/ui'
import { RichTextEditor } from '@/components/editor'
import { AppLayout } from '@/components/layout/app-layout'
import { useSupabase, useUser, useAutoSave } from '@/hooks'
import { formatDate, cn, getInitials } from '@/lib/utils'
import Image from 'next/image'
import type { Session, Campaign, Character, SessionCharacter } from '@/types/database'

export default function SessionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = useSupabase()
  const { user } = useUser()

  const campaignId = params.id as string
  const sessionId = params.sessionId as string

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [characters, setCharacters] = useState<Character[]>([])
  const [attendees, setAttendees] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [summarizing, setSummarizing] = useState(false)
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
      title: sessionData.title || '',
      notes: sessionData.notes || '',
      summary: sessionData.summary || '',
    })

    // Load characters for attendance
    const { data: charactersData } = await supabase
      .from('characters')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('type', 'pc')
      .order('name')

    setCharacters(charactersData || [])

    // Load session attendees
    const { data: attendeesData } = await supabase
      .from('session_characters')
      .select('character_id')
      .eq('session_id', sessionId)

    setAttendees(attendeesData?.map(a => a.character_id) || [])
    setLoading(false)
  }

  // Toggle character attendance
  const toggleAttendee = async (characterId: string) => {
    const isAttending = attendees.includes(characterId)

    if (isAttending) {
      await supabase
        .from('session_characters')
        .delete()
        .eq('session_id', sessionId)
        .eq('character_id', characterId)
      setAttendees(attendees.filter(id => id !== characterId))
    } else {
      await supabase
        .from('session_characters')
        .insert({ session_id: sessionId, character_id: characterId })
      setAttendees([...attendees, characterId])
    }
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
    delay: 1500,
  })

  // AI Summarize
  const handleSummarize = async () => {
    if (!formData.notes || summarizing) return

    setSummarizing(true)
    try {
      const response = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: formData.notes,
          sessionTitle: formData.title,
        }),
      })

      if (!response.ok) throw new Error('Failed to summarize')

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader')

      let summary = ''
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        summary += decoder.decode(value)
        setFormData(prev => ({ ...prev, summary }))
      }
    } catch (error) {
      console.error('Summarize error:', error)
    } finally {
      setSummarizing(false)
    }
  }

  if (loading || !session) {
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
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push(`/campaigns/${campaignId}/sessions`)}
            className="btn btn-ghost mb-4 -ml-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sessions
          </button>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 text-sm font-semibold rounded-lg bg-[--arcane-purple]/10 text-[--arcane-purple]">
                  Session {session.session_number}
                </span>
                <span className="text-sm text-[--text-tertiary] flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {formatDate(session.date)}
                </span>
              </div>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="text-2xl font-display font-semibold border-none bg-transparent px-0 h-auto focus:ring-0 placeholder:text-[--text-tertiary]"
                placeholder="Session title..."
              />
            </div>
            <div className="flex items-center gap-3">
              <span className={cn(
                "text-sm transition-opacity",
                status === 'saving' ? 'text-[--text-tertiary]' : 'text-[--text-tertiary] opacity-60'
              )}>
                {status === 'saving' && 'Saving...'}
                {status === 'saved' && 'Saved'}
                {status === 'idle' && 'All changes saved'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr,280px] gap-6">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Summary Section */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <label className="form-label mb-0">
                  Summary
                  <span className="ml-2 text-[--text-tertiary] font-normal text-xs">
                    Brief overview for the timeline
                  </span>
                </label>
                <button
                  onClick={handleSummarize}
                  disabled={!formData.notes || summarizing}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    "bg-[--arcane-gold]/10 border border-[--arcane-gold]/30 text-[--arcane-gold]",
                    "hover:bg-[--arcane-gold]/20 hover:border-[--arcane-gold]/50",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {summarizing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Summarizing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      AI Summarize
                    </>
                  )}
                </button>
              </div>
              <textarea
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                placeholder="What happened in this session..."
                rows={3}
                className="form-textarea"
              />
            </div>

            {/* Notes Section */}
            <div className="card p-5">
              <label className="form-label">Detailed Notes</label>
              <RichTextEditor
                content={formData.notes}
                onChange={(content) => setFormData({ ...formData, notes: content })}
                placeholder="Write your detailed session notes here..."
                className="min-h-[400px]"
                enableAI
                aiContext={`Session ${session.session_number}: ${formData.title}`}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Attendance */}
            {characters.length > 0 && (
              <div className="card p-5">
                <label className="form-label flex items-center gap-2">
                  <Users className="w-4 h-4 text-[--text-tertiary]" />
                  Attendance
                </label>
                <p className="text-xs text-[--text-tertiary] mb-3">
                  Who was at this session?
                </p>
                <div className="space-y-2">
                  {characters.map((char) => {
                    const isAttending = attendees.includes(char.id)
                    return (
                      <button
                        key={char.id}
                        onClick={() => toggleAttendee(char.id)}
                        className={cn(
                          'w-full flex items-center gap-3 p-2 rounded-lg transition-all text-left',
                          isAttending
                            ? 'bg-[--arcane-purple]/10 border border-[--arcane-purple]/30'
                            : 'bg-[--bg-elevated] border border-transparent hover:border-[--border]'
                        )}
                      >
                        <div className="relative w-8 h-8 rounded-full overflow-hidden bg-[--bg-surface] flex-shrink-0">
                          {char.image_url ? (
                            <Image
                              src={char.image_url}
                              alt={char.name}
                              fill
                              className="object-cover"
                              sizes="32px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-medium text-[--text-secondary]">
                              {getInitials(char.name)}
                            </div>
                          )}
                        </div>
                        <span className={cn(
                          'flex-1 text-sm font-medium truncate',
                          isAttending ? 'text-[--text-primary]' : 'text-[--text-secondary]'
                        )}>
                          {char.name}
                        </span>
                        {isAttending && (
                          <Check className="w-4 h-4 text-[--arcane-purple]" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="card p-5">
              <label className="form-label">Session Info</label>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-[--text-tertiary]">Session #</span>
                  <span className="text-[--text-primary] font-medium">{session.session_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[--text-tertiary]">Date</span>
                  <span className="text-[--text-primary]">{formatDate(session.date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[--text-tertiary]">Attendees</span>
                  <span className="text-[--text-primary]">{attendees.length} / {characters.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

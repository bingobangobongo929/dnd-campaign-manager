'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, Sparkles, Loader2, Users, Check, X, Pencil } from 'lucide-react'
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
    date: '',
    notes: '',
    summary: '',
  })

  // AI Summary suggestion state
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [showAiSuggestion, setShowAiSuggestion] = useState(false)

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
      date: sessionData.date || '',
      notes: sessionData.notes || '',
      summary: sessionData.summary || '',
    })

    // Load all characters for attendance (both PCs and NPCs)
    const { data: charactersData } = await supabase
      .from('characters')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('type', { ascending: true }) // PCs first
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
        date: formData.date,
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

  // AI Summarize - now with accept/edit/decline flow
  const handleSummarize = async () => {
    if (!formData.notes || summarizing) return

    setSummarizing(true)
    setAiSummary('')
    setShowAiSuggestion(true)

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
        setAiSummary(summary)
      }
    } catch (error) {
      console.error('Summarize error:', error)
      setShowAiSuggestion(false)
      setAiSummary(null)
    } finally {
      setSummarizing(false)
    }
  }

  const acceptSummary = () => {
    if (aiSummary) {
      setFormData(prev => ({ ...prev, summary: aiSummary }))
    }
    setShowAiSuggestion(false)
    setAiSummary(null)
  }

  const editSummary = () => {
    // Accept but keep in edit mode
    if (aiSummary) {
      setFormData(prev => ({ ...prev, summary: aiSummary }))
    }
    setShowAiSuggestion(false)
    setAiSummary(null)
  }

  const declineSummary = () => {
    setShowAiSuggestion(false)
    setAiSummary(null)
  }

  // Group characters by type
  const pcCharacters = characters.filter(c => c.type === 'pc')
  const npcCharacters = characters.filter(c => c.type === 'npc')

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
      <div className="max-w-4xl mx-auto">
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
                {/* Editable Date */}
                <div className="flex items-center gap-1.5 text-sm text-[--text-tertiary]">
                  <Calendar className="w-4 h-4" />
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="h-7 px-2 py-0 text-sm border-none bg-transparent hover:bg-[--bg-elevated] focus:bg-[--bg-elevated] rounded cursor-pointer"
                  />
                </div>
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

        {/* Attendance Section - Prominent placement */}
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[--arcane-purple]" />
              <label className="form-label mb-0 text-lg">
                Attendance
              </label>
              <span className="text-sm text-[--text-tertiary]">
                ({attendees.length} selected)
              </span>
            </div>
          </div>

          {/* PC Characters */}
          {pcCharacters.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-[--text-tertiary] uppercase tracking-wide mb-2">
                Player Characters
              </h4>
              <div className="flex flex-wrap gap-2">
                {pcCharacters.map((char) => {
                  const isAttending = attendees.includes(char.id)
                  return (
                    <button
                      key={char.id}
                      onClick={() => toggleAttendee(char.id)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-xl transition-all',
                        isAttending
                          ? 'bg-[--arcane-purple] text-white shadow-lg shadow-[--arcane-purple]/25'
                          : 'bg-[--bg-elevated] border border-[--border] hover:border-[--arcane-purple]/50 text-[--text-secondary] hover:text-[--text-primary]'
                      )}
                    >
                      <div className={cn(
                        "relative w-7 h-7 rounded-full overflow-hidden flex-shrink-0",
                        isAttending ? 'ring-2 ring-white/30' : 'bg-[--bg-surface]'
                      )}>
                        {char.image_url ? (
                          <Image
                            src={char.image_url}
                            alt={char.name}
                            fill
                            className="object-cover"
                            sizes="28px"
                          />
                        ) : (
                          <div className={cn(
                            "w-full h-full flex items-center justify-center text-xs font-medium",
                            isAttending ? 'bg-white/20 text-white' : 'text-[--text-secondary]'
                          )}>
                            {getInitials(char.name)}
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-medium">
                        {char.name}
                      </span>
                      {isAttending && (
                        <Check className="w-4 h-4 ml-1" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* NPC Characters */}
          {npcCharacters.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-[--text-tertiary] uppercase tracking-wide mb-2">
                Non-Player Characters
              </h4>
              <div className="flex flex-wrap gap-2">
                {npcCharacters.map((char) => {
                  const isAttending = attendees.includes(char.id)
                  return (
                    <button
                      key={char.id}
                      onClick={() => toggleAttendee(char.id)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-xl transition-all',
                        isAttending
                          ? 'bg-[--arcane-gold] text-[--bg-base] shadow-lg shadow-[--arcane-gold]/25'
                          : 'bg-[--bg-elevated] border border-[--border] hover:border-[--arcane-gold]/50 text-[--text-secondary] hover:text-[--text-primary]'
                      )}
                    >
                      <div className={cn(
                        "relative w-7 h-7 rounded-full overflow-hidden flex-shrink-0",
                        isAttending ? 'ring-2 ring-black/20' : 'bg-[--bg-surface]'
                      )}>
                        {char.image_url ? (
                          <Image
                            src={char.image_url}
                            alt={char.name}
                            fill
                            className="object-cover"
                            sizes="28px"
                          />
                        ) : (
                          <div className={cn(
                            "w-full h-full flex items-center justify-center text-xs font-medium",
                            isAttending ? 'bg-black/20 text-[--bg-base]' : 'text-[--text-secondary]'
                          )}>
                            {getInitials(char.name)}
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-medium">
                        {char.name}
                      </span>
                      {isAttending && (
                        <Check className="w-4 h-4 ml-1" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {characters.length === 0 && (
            <p className="text-sm text-[--text-tertiary] text-center py-4">
              No characters in this campaign yet. Add characters on the Canvas to track attendance.
            </p>
          )}
        </div>

        {/* Summary Section */}
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="form-label mb-0">
              Summary
              <span className="ml-2 text-[--text-tertiary] font-normal text-xs">
                Brief overview for the timeline
              </span>
            </label>
            {!showAiSuggestion && (
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
                <Sparkles className="w-3.5 h-3.5" />
                AI Summarize
              </button>
            )}
          </div>

          {/* AI Suggestion Panel */}
          {showAiSuggestion && (
            <div className="mb-4 p-4 rounded-xl bg-[--arcane-gold]/5 border border-[--arcane-gold]/30">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-[--arcane-gold]" />
                <span className="text-sm font-medium text-[--arcane-gold]">
                  {summarizing ? 'Generating summary...' : 'AI Generated Summary'}
                </span>
                {summarizing && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[--arcane-gold]" />
                )}
              </div>
              <p className="text-sm text-[--text-secondary] mb-4 whitespace-pre-wrap min-h-[3rem]">
                {aiSummary || 'Analyzing your notes...'}
              </p>
              {!summarizing && aiSummary && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={acceptSummary}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Accept
                  </button>
                  <button
                    onClick={editSummary}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[--arcane-purple]/10 border border-[--arcane-purple]/30 text-[--arcane-purple] hover:bg-[--arcane-purple]/20 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Accept & Edit
                  </button>
                  <button
                    onClick={declineSummary}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[--arcane-ember]/10 border border-[--arcane-ember]/30 text-[--arcane-ember] hover:bg-[--arcane-ember]/20 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    Decline
                  </button>
                </div>
              )}
            </div>
          )}

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
    </AppLayout>
  )
}

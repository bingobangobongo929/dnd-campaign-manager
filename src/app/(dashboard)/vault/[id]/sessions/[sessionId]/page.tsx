'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Calendar,
  Sparkles,
  Loader2,
  Check,
  X,
  Pencil,
  Brain,
  ChevronDown,
  ChevronUp,
  Wand2,
} from 'lucide-react'
import { toast } from 'sonner'
import { AppLayout } from '@/components/layout/app-layout'
import { Button, Input } from '@/components/ui'
import { RichTextEditor } from '@/components/editor'
import { createClient } from '@/lib/supabase/client'
import { useAutoSave } from '@/hooks'
import { cn } from '@/lib/utils'
import type { PlayJournal, VaultCharacter } from '@/types/database'

export default function VaultSessionEditorPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()

  const characterId = params.id as string
  const sessionId = params.sessionId as string
  const isNew = sessionId === 'new'

  const [character, setCharacter] = useState<VaultCharacter | null>(null)
  const [session, setSession] = useState<PlayJournal | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)

  const [formData, setFormData] = useState({
    session_number: '',
    session_date: '',
    title: '',
    campaign_name: '',
    summary: '',
    notes: '',
    thoughts_for_next: '',
  })

  // AI Expand Notes state
  const [expanding, setExpanding] = useState(false)
  const [expandedNotes, setExpandedNotes] = useState<string | null>(null)
  const [showExpandedPreview, setShowExpandedPreview] = useState(false)
  const [aiReasoning, setAiReasoning] = useState<string>('')
  const [detailedNotesCollapsed, setDetailedNotesCollapsed] = useState(true)

  useEffect(() => {
    loadData()
  }, [characterId, sessionId])

  const loadData = async () => {
    if (!hasLoadedOnce) {
      setLoading(true)
    }

    // Load character
    const { data: charData } = await supabase
      .from('vault_characters')
      .select('*')
      .eq('id', characterId)
      .single()

    if (!charData) {
      router.push('/vault')
      return
    }
    setCharacter(charData)

    // Load session if not new
    if (!isNew) {
      const { data: sessionData } = await supabase
        .from('play_journal')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (!sessionData) {
        router.push(`/vault/${characterId}/sessions`)
        return
      }

      setSession(sessionData)
      setFormData({
        session_number: sessionData.session_number?.toString() || '',
        session_date: sessionData.session_date || '',
        title: sessionData.title || '',
        campaign_name: sessionData.campaign_name || '',
        summary: sessionData.summary || '',
        notes: sessionData.notes || '',
        thoughts_for_next: sessionData.thoughts_for_next || '',
      })

      // If there's existing detailed notes, show them
      if (sessionData.detailed_notes) {
        setExpandedNotes(sessionData.detailed_notes)
        setDetailedNotesCollapsed(false)
      }
    } else {
      // Get next session number for new entries
      const { data: entries } = await supabase
        .from('play_journal')
        .select('session_number')
        .eq('character_id', characterId)
        .order('session_number', { ascending: false })
        .limit(1)

      const nextNumber = entries && entries.length > 0 && entries[0].session_number
        ? entries[0].session_number + 1
        : 1

      setFormData({
        session_number: nextNumber.toString(),
        session_date: new Date().toISOString().split('T')[0],
        title: '',
        campaign_name: '',
        summary: '',
        notes: '',
        thoughts_for_next: '',
      })
    }

    setLoading(false)
    setHasLoadedOnce(true)
  }

  // Auto-save functionality
  const saveSession = useCallback(async () => {
    if (isNew) return // Don't auto-save new entries

    const payload = {
      session_number: formData.session_number ? parseInt(formData.session_number) : null,
      session_date: formData.session_date || null,
      title: formData.title || null,
      campaign_name: formData.campaign_name || null,
      summary: formData.summary || null,
      notes: formData.notes || null,
      thoughts_for_next: formData.thoughts_for_next || null,
      detailed_notes: expandedNotes || null,
    }

    await supabase
      .from('play_journal')
      .update(payload)
      .eq('id', sessionId)
  }, [formData, expandedNotes, sessionId, isNew, supabase])

  const { status } = useAutoSave({
    data: { ...formData, expandedNotes },
    onSave: saveSession,
    delay: 1500,
    showToast: !isNew,
    toastMessage: 'Session saved',
  })

  // Create new session
  const handleCreate = async () => {
    if (!formData.summary.trim()) {
      toast.error('Summary is required')
      return
    }

    const payload = {
      character_id: characterId,
      session_number: formData.session_number ? parseInt(formData.session_number) : null,
      session_date: formData.session_date || null,
      title: formData.title || null,
      campaign_name: formData.campaign_name || null,
      summary: formData.summary || null,
      notes: formData.notes || null,
      thoughts_for_next: formData.thoughts_for_next || null,
      detailed_notes: expandedNotes || null,
    }

    const { data, error } = await supabase
      .from('play_journal')
      .insert(payload)
      .select()
      .single()

    if (error) {
      toast.error('Failed to create session')
    } else {
      toast.success('Session created')
      router.push(`/vault/${characterId}/sessions/${data.id}`)
    }
  }

  // AI Expand Notes - takes bullet summary and creates detailed notes
  const handleExpandNotes = async () => {
    if (!formData.summary.trim() || expanding) return

    setExpanding(true)
    setExpandedNotes('')
    setAiReasoning('')
    setShowExpandedPreview(true)
    setDetailedNotesCollapsed(false)

    try {
      const response = await fetch('/api/ai/expand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: formData.summary,
          characterId: characterId,
          sessionTitle: formData.title,
          campaignName: formData.campaign_name,
        }),
      })

      if (!response.ok) throw new Error('Failed to expand notes')

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader')

      let notes = ''
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)

        // Check if chunk contains reasoning marker
        if (chunk.includes('---REASONING---')) {
          const parts = chunk.split('---REASONING---')
          notes += parts[0]
          setAiReasoning(parts[1] || '')
        } else if (aiReasoning) {
          setAiReasoning(prev => prev + chunk)
        } else {
          notes += chunk
        }
        setExpandedNotes(notes)
      }
    } catch (error) {
      console.error('Expand error:', error)
      toast.error('Failed to expand notes')
      setShowExpandedPreview(false)
      setExpandedNotes(null)
    } finally {
      setExpanding(false)
    }
  }

  const acceptExpanded = () => {
    setShowExpandedPreview(false)
    // Notes are already in expandedNotes state
  }

  const editExpanded = () => {
    setShowExpandedPreview(false)
    // Notes are already in expandedNotes state, user can edit
  }

  const declineExpanded = () => {
    setShowExpandedPreview(false)
    setExpandedNotes(null)
    setAiReasoning('')
  }

  if (loading) {
    return (
      <AppLayout characterId={characterId}>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-10 h-10 animate-spin text-[--arcane-purple]" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout characterId={characterId}>
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-10">
          <button
            onClick={() => router.push(`/vault/${characterId}/sessions`)}
            className="btn btn-ghost mb-6 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Sessions
          </button>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 text-sm font-semibold rounded-lg bg-[--arcane-purple]/10 text-[--arcane-purple]">
                  Session {formData.session_number || '?'}
                </span>
                {/* Editable Date */}
                <div className="flex items-center gap-1.5 text-sm text-[--text-tertiary]">
                  <Calendar className="w-4 h-4" />
                  <Input
                    type="date"
                    value={formData.session_date}
                    onChange={(e) => setFormData({ ...formData, session_date: e.target.value })}
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
              <Input
                value={formData.campaign_name}
                onChange={(e) => setFormData({ ...formData, campaign_name: e.target.value })}
                className="text-sm text-[--text-secondary] border-none bg-transparent px-0 h-auto focus:ring-0 placeholder:text-[--text-tertiary] mt-1"
                placeholder="Campaign name..."
              />
            </div>
            <div className="flex items-center gap-3">
              {!isNew && (
                <span className={cn(
                  "text-sm transition-opacity",
                  status === 'saving' ? 'text-[--text-tertiary]' : 'text-[--text-tertiary] opacity-60'
                )}>
                  {status === 'saving' && 'Saving...'}
                  {status === 'saved' && 'Saved'}
                  {status === 'idle' && 'All changes saved'}
                </span>
              )}
              {isNew && (
                <Button onClick={handleCreate}>
                  Create Session
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Summary Section - PRIMARY FOCUS */}
        <div className="card p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <label className="text-xl font-semibold text-[--text-primary] block mb-1">
                Summary
              </label>
              <span className="text-sm text-[--text-tertiary]">
                Write bullet points of what happened - AI will expand into detailed notes
              </span>
            </div>
            {!showExpandedPreview && (
              <Button
                onClick={handleExpandNotes}
                disabled={!formData.summary.trim() || expanding}
                variant="secondary"
                className="bg-[--arcane-gold]/10 border-[--arcane-gold]/30 text-[--arcane-gold] hover:bg-[--arcane-gold]/20"
              >
                <Wand2 className="w-4 h-4 mr-2" />
                Expand Notes
              </Button>
            )}
          </div>
          <textarea
            value={formData.summary}
            onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
            placeholder={`Write your session summary in bullet points:

* Met with the herbalist about the missing supplies
* Tracked the thieves to an abandoned warehouse
* Fought off three bandits, captured their leader
* Discovered a map leading to a hidden temple`}
            rows={10}
            className="form-textarea min-h-[250px] font-mono text-sm"
          />
        </div>

        {/* AI Expanded Notes Section */}
        {(expandedNotes || showExpandedPreview) && (
          <div className="card p-6 mb-8">
            <button
              onClick={() => setDetailedNotesCollapsed(!detailedNotesCollapsed)}
              className="w-full flex items-center justify-between mb-4"
            >
              <div className="flex items-center gap-3">
                <Brain className="w-6 h-6 text-[--arcane-purple]" />
                <div className="text-left">
                  <label className="text-xl font-semibold text-[--text-primary] block">
                    Detailed Notes
                  </label>
                  <span className="text-sm text-[--text-tertiary]">
                    AI-expanded session narrative
                  </span>
                </div>
              </div>
              {detailedNotesCollapsed ? (
                <ChevronDown className="w-5 h-5 text-[--text-tertiary]" />
              ) : (
                <ChevronUp className="w-5 h-5 text-[--text-tertiary]" />
              )}
            </button>

            {!detailedNotesCollapsed && (
              <>
                {/* AI Preview Panel */}
                {showExpandedPreview && (
                  <div className="mb-4 p-4 rounded-xl bg-[--arcane-purple]/5 border border-[--arcane-purple]/30">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-[--arcane-purple]" />
                      <span className="text-sm font-medium text-[--arcane-purple]">
                        {expanding ? 'Expanding notes...' : 'AI Expanded Notes'}
                      </span>
                      {expanding && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[--arcane-purple]" />
                      )}
                    </div>

                    {/* AI Reasoning */}
                    {aiReasoning && (
                      <div className="mb-4 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                        <p className="text-xs text-[--text-tertiary] mb-1">AI Context Used:</p>
                        <p className="text-sm text-[--text-secondary] whitespace-pre-wrap">{aiReasoning}</p>
                      </div>
                    )}

                    {!expanding && expandedNotes && (
                      <div className="flex items-center gap-2 mt-4">
                        <button
                          onClick={acceptExpanded}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Accept
                        </button>
                        <button
                          onClick={editExpanded}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[--arcane-purple]/10 border border-[--arcane-purple]/30 text-[--arcane-purple] hover:bg-[--arcane-purple]/20 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Accept & Edit
                        </button>
                        <button
                          onClick={declineExpanded}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[--arcane-ember]/10 border border-[--arcane-ember]/30 text-[--arcane-ember] hover:bg-[--arcane-ember]/20 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Detailed Notes Editor */}
                <RichTextEditor
                  content={expandedNotes || ''}
                  onChange={(content) => setExpandedNotes(content)}
                  placeholder="AI-expanded detailed notes will appear here..."
                  className="min-h-[300px]"
                />
              </>
            )}
          </div>
        )}

        {/* Thoughts for Next Section */}
        <div className="card p-6">
          <label className="text-xl font-semibold text-[--text-primary] block mb-4">
            Thoughts for Next Session
          </label>
          <textarea
            value={formData.thoughts_for_next}
            onChange={(e) => setFormData({ ...formData, thoughts_for_next: e.target.value })}
            placeholder="Ideas, plans, or questions to remember for next time..."
            rows={4}
            className="form-textarea"
          />
        </div>

        {/* Create button for new sessions at bottom */}
        {isNew && (
          <div className="mt-8 flex justify-end">
            <Button onClick={handleCreate} size="lg">
              Create Session
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

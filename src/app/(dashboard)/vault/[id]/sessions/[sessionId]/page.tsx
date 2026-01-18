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
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { AppLayout } from '@/components/layout/app-layout'
import { Button, Input, sanitizeHtml } from '@/components/ui'
import { RichTextEditor } from '@/components/editor'
import { createClient } from '@/lib/supabase/client'
import { useVersionedAutoSave } from '@/hooks/useAutoSave'
import { logActivity, diffChanges } from '@/lib/activity-log'
import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'
import type { PlayJournal, VaultCharacter } from '@/types/database'

export default function VaultSessionEditorPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const { aiProvider } = useAppStore()

  const characterId = params.id as string
  const sessionId = params.sessionId as string
  const isNew = sessionId === 'new'

  const [character, setCharacter] = useState<VaultCharacter | null>(null)
  const [session, setSession] = useState<PlayJournal | null>(null)
  const [sessionVersion, setSessionVersion] = useState(1)
  const [originalData, setOriginalData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)

  const [formData, setFormData] = useState({
    session_number: '',
    session_date: '',
    title: '',
    campaign_name: '',
    summary: '',
    notes: '',
  })

  // AI Expand Notes state
  const [expanding, setExpanding] = useState(false)
  const [pendingNotes, setPendingNotes] = useState<string | null>(null)
  const [pendingSummary, setPendingSummary] = useState<string | null>(null)
  const [pendingTitle, setPendingTitle] = useState<string | null>(null)
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
      setSessionVersion((sessionData as any).version || 1)
      setOriginalData(sessionData)
      setFormData({
        session_number: sessionData.session_number?.toString() || '',
        session_date: sessionData.session_date || '',
        title: sessionData.title || '',
        campaign_name: sessionData.campaign_name || '',
        summary: sessionData.summary || '',
        notes: sessionData.notes || '',
      })

      // If there's existing detailed notes, show them expanded
      if (sessionData.notes && sessionData.notes.trim()) {
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

      const nextNumber = entries && entries.length > 0 && entries[0].session_number !== null
        ? entries[0].session_number + 1
        : 0

      setFormData({
        session_number: nextNumber.toString(),
        session_date: new Date().toISOString().split('T')[0],
        title: '',
        campaign_name: '',
        summary: '',
        notes: '',
      })
    }

    setLoading(false)
    setHasLoadedOnce(true)
  }

  // Auto-save functionality with version checking
  const saveSession = useCallback(async (data: typeof formData, expectedVersion: number): Promise<{ success: boolean; conflict?: boolean; newVersion?: number; error?: string }> => {
    if (isNew) return { success: false, error: 'Cannot auto-save new entries' }

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return { success: false, error: 'Not authenticated' }

    // Check version before update
    const { data: current } = await supabase
      .from('play_journal')
      .select('version')
      .eq('id', sessionId)
      .single()

    if (current && current.version !== expectedVersion) {
      return {
        success: false,
        conflict: true,
        newVersion: current.version,
        error: `This session was edited elsewhere. Your version: ${expectedVersion}, Server version: ${current.version}`,
      }
    }

    const newVersion = expectedVersion + 1
    const payload = {
      session_number: data.session_number ? parseInt(data.session_number) : null,
      session_date: data.session_date || null,
      title: data.title || null,
      campaign_name: data.campaign_name || null,
      summary: data.summary || null,
      notes: data.notes || '',
      version: newVersion,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('play_journal')
      .update(payload)
      .eq('id', sessionId)
      .eq('version', expectedVersion)

    if (error) {
      return { success: false, error: error.message }
    }

    // Log activity only if there are actual changes from original
    const changes = diffChanges(originalData, payload, ['title', 'summary', 'notes'])
    if (changes && Object.keys(changes).length > 0) {
      logActivity(supabase, userData.user.id, {
        action: 'session.edit',
        entity_type: 'session',
        entity_id: sessionId,
        entity_name: data.title || `Session ${data.session_number}`,
        changes,
      })
      // Update originalData so we don't log the same changes again
      setOriginalData({ ...originalData, ...payload })
    }

    setSessionVersion(newVersion)
    return { success: true, newVersion }
  }, [formData, sessionId, isNew, supabase, originalData])

  const { status, hasConflict } = useVersionedAutoSave({
    data: formData,
    version: sessionVersion,
    onSave: saveSession,
    delay: 1500,
    enabled: !isNew,
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
      notes: formData.notes || '',
    }

    const { data, error } = await supabase
      .from('play_journal')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('Create error:', error)
      toast.error('Failed to create session')
    } else {
      toast.success('Session created')
      router.push(`/vault/${characterId}/sessions/${data.id}`)
    }
  }

  // AI Expand Notes - cleans summary and generates detailed notes with vault linking
  const handleExpandNotes = async () => {
    if (!formData.summary.trim() || expanding) return

    setExpanding(true)
    setPendingNotes('')
    setPendingSummary('')
    setAiReasoning('')
    setShowExpandedPreview(true)
    setDetailedNotesCollapsed(false)

    try {
      // Fetch the main character
      const { data: charContext } = await supabase
        .from('vault_characters')
        .select('name, summary')
        .eq('id', characterId)
        .single()

      // Fetch all NPCs/relationships for this character from vault
      const { data: relationships } = await supabase
        .from('vault_character_relationships')
        .select('related_name, relationship_type, relationship_label, occupation, location')
        .eq('character_id', characterId)

      // Build a list of known entities for the AI to link
      const knownEntities: string[] = []
      if (relationships) {
        relationships.forEach(r => {
          if (r.related_name) {
            knownEntities.push(r.related_name)
          }
          // Also add locations if they're named
          if (r.location) {
            knownEntities.push(r.location)
          }
        })
      }

      // Add the player character's name
      if (charContext?.name) {
        knownEntities.push(charContext.name)
      }

      // Build context for the AI
      const contextParts = []
      if (charContext?.name) contextParts.push(`Player Character: ${charContext.name}`)
      if (formData.campaign_name) contextParts.push(`Campaign: ${formData.campaign_name}`)
      if (formData.title) contextParts.push(`Session Title: ${formData.title}`)

      // Add known entities list
      if (knownEntities.length > 0) {
        contextParts.push(`\nKnown NPCs/Characters (highlight these names with <strong> tags):\n- ${knownEntities.join('\n- ')}`)
      }

      const context = contextParts.join('\n')

      const response = await fetch('/api/ai/expand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: formData.summary,
          context: context,
          provider: aiProvider,
          mode: 'session',
          knownEntities: knownEntities, // Pass list for AI to reference
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error:', errorText)
        throw new Error('Failed to expand notes')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader')

      let fullText = ''
      const decoder = new TextDecoder()

      // Stream the response and collect full text
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        fullText += chunk

        // Parse sections from the accumulated text for real-time updates
        const summaryMatch = fullText.match(/---CLEANED_SUMMARY---\n?([\s\S]*?)(?=---DETAILED_NOTES---|$)/)
        const notesMatch = fullText.match(/---DETAILED_NOTES---\n?([\s\S]*?)(?=---TITLE---|---REASONING---|$)/)
        const titleMatch = fullText.match(/---TITLE---\n?([\s\S]*?)(?=---REASONING---|$)/)
        const reasoningMatch = fullText.match(/---REASONING---\n?([\s\S]*)$/)

        if (summaryMatch) {
          setPendingSummary(summaryMatch[1].trim())
        }
        if (notesMatch) {
          setPendingNotes(notesMatch[1].trim())
        }
        if (titleMatch) {
          setPendingTitle(titleMatch[1].trim())
        }
        if (reasoningMatch) {
          setAiReasoning(reasoningMatch[1].trim())
        }
      }

      // If we didn't get sectioned output, treat the whole response as notes
      const summaryMatch = fullText.match(/---CLEANED_SUMMARY---\n?([\s\S]*?)(?=---DETAILED_NOTES---|$)/)
      const notesMatch = fullText.match(/---DETAILED_NOTES---\n?([\s\S]*?)(?=---TITLE---|---REASONING---|$)/)

      if (!summaryMatch && !notesMatch) {
        setPendingNotes(fullText.trim())
      }
    } catch (error) {
      console.error('Expand error:', error)
      toast.error('Failed to expand notes')
      setShowExpandedPreview(false)
      setPendingNotes(null)
      setPendingSummary(null)
      setPendingTitle(null)
    } finally {
      setExpanding(false)
    }
  }

  // Convert text to HTML bullet list (or pass through if already HTML)
  const formatSummaryAsHtml = (text: string): string => {
    // If already contains HTML list tags, pass through
    if (text.includes('<ul>') || text.includes('<li>')) {
      return text
    }

    // Split into lines and clean up
    const lines = text.split('\n').filter(line => line.trim())

    // If we have multiple lines, treat each as a bullet point
    if (lines.length > 1) {
      const listItems = lines.map(line => {
        // Remove any existing bullet characters
        const cleanLine = line.replace(/^[\s]*[•\-\*]\s*/, '').trim()
        // TipTap expects <p> inside <li> for proper parsing
        return cleanLine ? `<li><p>${cleanLine}</p></li>` : ''
      }).filter(Boolean).join('')
      return `<ul>${listItems}</ul>`
    }

    // Single line - return as-is
    return text
  }

  const acceptExpanded = () => {
    // Apply cleaned summary if available
    if (pendingSummary) {
      setFormData(prev => ({ ...prev, summary: formatSummaryAsHtml(pendingSummary) }))
    }
    // Apply detailed notes
    if (pendingNotes) {
      setFormData(prev => ({ ...prev, notes: pendingNotes }))
    }
    // Apply AI-generated title if no title exists
    if (pendingTitle && !formData.title.trim()) {
      setFormData(prev => ({ ...prev, title: pendingTitle }))
    }
    setShowExpandedPreview(false)
    setPendingNotes(null)
    setPendingSummary(null)
    setPendingTitle(null)
    setAiReasoning('')
  }

  const editExpanded = () => {
    // Apply both but keep editing open
    if (pendingSummary) {
      setFormData(prev => ({ ...prev, summary: formatSummaryAsHtml(pendingSummary) }))
    }
    if (pendingNotes) {
      setFormData(prev => ({ ...prev, notes: pendingNotes }))
    }
    if (pendingTitle && !formData.title.trim()) {
      setFormData(prev => ({ ...prev, title: pendingTitle }))
    }
    setShowExpandedPreview(false)
    setPendingNotes(null)
    setPendingSummary(null)
    setPendingTitle(null)
    setAiReasoning('')
  }

  const declineExpanded = () => {
    setShowExpandedPreview(false)
    setPendingNotes(null)
    setPendingSummary(null)
    setPendingTitle(null)
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
      {/* Conflict Warning Banner */}
      {hasConflict && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <div>
              <p className="text-sm font-medium text-amber-400">This session was modified elsewhere</p>
              <p className="text-xs text-amber-400/70">Your changes may conflict with the latest version. Reload to see updates.</p>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reload
          </button>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-10">
          <button
            onClick={() => router.push(`/vault/${characterId}/sessions`)}
            className="btn btn-ghost mb-4 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Sessions
          </button>

          {/* Character Context */}
          {character && (
            <p className="text-xs text-[--text-tertiary] mb-4">
              <span className="text-[--arcane-purple]">{character.name}</span>
              <span className="mx-2">/</span>
              <span>Play Journal</span>
            </p>
          )}

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
                placeholder="Session title (AI will suggest one)..."
              />
            </div>
            <div className="flex items-center gap-3">
              {!isNew && (
                <span className={cn(
                  "text-sm transition-opacity",
                  status === 'conflict' ? 'text-amber-400' : status === 'saving' ? 'text-[--text-tertiary]' : 'text-[--text-tertiary] opacity-60'
                )}>
                  {status === 'conflict' && 'Conflict detected'}
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
                Write bullet points of what happened - AI will clean up and expand into detailed notes
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
                {expanding ? 'Expanding...' : 'Expand Notes'}
              </Button>
            )}
          </div>
          <RichTextEditor
            content={formData.summary}
            onChange={(content) => setFormData({ ...formData, summary: content })}
            placeholder="Write your session summary in bullet points..."
            className="min-h-[250px]"
          />
        </div>

        {/* AI Preview Panel - shows when expanding */}
        {showExpandedPreview && (
          <div className="card p-6 mb-8 bg-[--arcane-purple]/5 border-[--arcane-purple]/30">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-[--arcane-purple]" />
              <span className="text-lg font-semibold text-[--arcane-purple]">
                {expanding ? 'Processing...' : 'AI Expansion Preview'}
              </span>
              {expanding && (
                <Loader2 className="w-4 h-4 animate-spin text-[--arcane-purple]" />
              )}
            </div>

            {/* Cleaned Summary Preview */}
            {pendingSummary && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-[--text-secondary] mb-2">Cleaned Summary:</h4>
                <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                  <div
                    className="prose prose-invert prose-sm max-w-none [&>ul]:mt-1 [&>ul]:mb-2 [&>li]:my-0.5 text-[--text-secondary]"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(formatSummaryAsHtml(pendingSummary)) }}
                  />
                </div>
              </div>
            )}

            {/* AI-Generated Title Preview */}
            {pendingTitle && !formData.title.trim() && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-[--text-secondary] mb-2">Suggested Title:</h4>
                <div className="p-3 rounded-lg bg-[--arcane-gold]/5 border border-[--arcane-gold]/20">
                  <p className="text-base font-medium text-[--arcane-gold]">{pendingTitle}</p>
                </div>
              </div>
            )}

            {/* Detailed Notes Preview */}
            {pendingNotes && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-[--text-secondary] mb-2">Detailed Notes:</h4>
                <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                  <div
                    className="prose prose-invert prose-sm max-w-none [&>h3]:mt-6 [&>h3:first-child]:mt-0 [&>h3]:mb-2 [&>h3]:text-base [&>h3]:font-semibold [&>ul]:mt-1 [&>ul]:mb-4 [&>p]:mb-4"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(pendingNotes) }}
                  />
                </div>
              </div>
            )}

            {/* AI Reasoning */}
            {aiReasoning && (
              <div className="mb-6 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                <p className="text-xs text-[--text-tertiary] mb-1">AI Context Used:</p>
                <p className="text-sm text-[--text-secondary] whitespace-pre-wrap">{aiReasoning}</p>
              </div>
            )}

            {!expanding && (pendingNotes || pendingSummary) && (
              <div className="flex items-center gap-2">
                <button
                  onClick={acceptExpanded}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Accept
                </button>
                <button
                  onClick={editExpanded}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[--arcane-purple]/10 border border-[--arcane-purple]/30 text-[--arcane-purple] hover:bg-[--arcane-purple]/20 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  Accept & Edit
                </button>
                <button
                  onClick={declineExpanded}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[--arcane-ember]/10 border border-[--arcane-ember]/30 text-[--arcane-ember] hover:bg-[--arcane-ember]/20 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Decline
                </button>
              </div>
            )}
          </div>
        )}

        {/* Detailed Notes Section - Shows when notes exist */}
        {formData.notes && !showExpandedPreview && (
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
                    Expanded session narrative
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
              <RichTextEditor
                content={formData.notes}
                onChange={(content) => setFormData({ ...formData, notes: content })}
                placeholder="Detailed session notes..."
                className="min-h-[300px]"
              />
            )}
          </div>
        )}

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

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Calendar,
  Sparkles,
  Loader2,
  Users,
  Check,
  X,
  Pencil,
  Wand2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ScrollText,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { Input, Button, sanitizeHtml } from '@/components/ui'
import { RichTextEditor } from '@/components/editor'
import { AppLayout } from '@/components/layout/app-layout'
import { useSupabase, useUser, useIsMobile } from '@/hooks'
import { SessionDetailMobile } from './page.mobile'
import { useVersionedAutoSave } from '@/hooks/useAutoSave'
import { logActivity, diffChanges } from '@/lib/activity-log'
import { useAppStore } from '@/store'
import { cn, getInitials } from '@/lib/utils'
import Image from 'next/image'
import type { Session, Campaign, Character } from '@/types/database'

export default function SessionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = useSupabase()
  const { user } = useUser()
  const isMobile = useIsMobile()
  const { aiProvider } = useAppStore()

  const campaignId = params.id as string
  const sessionId = params.sessionId as string
  const isNew = sessionId === 'new'

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [sessionVersion, setSessionVersion] = useState(1)
  const [originalData, setOriginalData] = useState<any>(null)
  const [characters, setCharacters] = useState<Character[]>([])
  const [attendees, setAttendees] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)

  const [formData, setFormData] = useState({
    session_number: '',
    title: '',
    date: '',
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
    if (user && campaignId && sessionId) {
      loadData()
    }
  }, [user, campaignId, sessionId])

  const loadData = async () => {
    if (!hasLoadedOnce) {
      setLoading(true)
    }

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

    // Load all characters for attendance
    const { data: charactersData } = await supabase
      .from('characters')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('type', { ascending: true })
      .order('name')

    setCharacters(charactersData || [])

    if (isNew) {
      // Get next session number
      const { data: sessions } = await supabase
        .from('sessions')
        .select('session_number')
        .eq('campaign_id', campaignId)
        .order('session_number', { ascending: false })
        .limit(1)

      const nextNumber = sessions && sessions.length > 0 && sessions[0].session_number !== null
        ? sessions[0].session_number + 1
        : 0

      setFormData({
        session_number: nextNumber.toString(),
        title: '',
        date: new Date().toISOString().split('T')[0],
        summary: '',
        notes: '',
      })
      setLoading(false)
      setHasLoadedOnce(true)
      return
    }

    // Load existing session
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
    setSessionVersion((sessionData as any).version || 1)
    setOriginalData(sessionData)
    setFormData({
      session_number: sessionData.session_number?.toString() || '',
      title: sessionData.title || '',
      date: sessionData.date || '',
      summary: sessionData.summary || '',
      notes: sessionData.notes || '',
    })

    // Load session attendees
    const { data: attendeesData } = await supabase
      .from('session_characters')
      .select('character_id')
      .eq('session_id', sessionId)

    setAttendees(attendeesData?.map(a => a.character_id) || [])

    // If there's existing notes, show them expanded
    if (sessionData.notes && sessionData.notes.trim()) {
      setDetailedNotesCollapsed(false)
    }

    setLoading(false)
    setHasLoadedOnce(true)
  }

  // Toggle character attendance
  const toggleAttendee = async (characterId: string) => {
    if (isNew) {
      // For new sessions, just track locally
      setAttendees(prev =>
        prev.includes(characterId)
          ? prev.filter(id => id !== characterId)
          : [...prev, characterId]
      )
      return
    }

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

  // Auto-save functionality with version checking
  const saveSession = useCallback(async (data: typeof formData, expectedVersion: number): Promise<{ success: boolean; conflict?: boolean; newVersion?: number; error?: string }> => {
    if (isNew || !session) return { success: false, error: 'Cannot auto-save new entries' }

    // Check version before update
    const { data: current } = await supabase
      .from('sessions')
      .select('version')
      .eq('id', session.id)
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
      title: data.title || null,
      date: data.date || null,
      summary: data.summary || null,
      notes: data.notes || '',
      version: newVersion,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('sessions')
      .update(payload)
      .eq('id', session.id)
      .eq('version', expectedVersion)

    if (error) {
      return { success: false, error: error.message }
    }

    // Log activity only if there are actual changes from original
    if (user) {
      const changes = diffChanges(originalData, payload, ['title', 'summary', 'notes'])
      if (changes && Object.keys(changes).length > 0) {
        logActivity(supabase, user.id, {
          action: 'session.edit',
          entity_type: 'session',
          entity_id: session.id,
          entity_name: data.title || `Session ${data.session_number}`,
          changes,
        })
        // Update originalData so we don't log the same changes again
        setOriginalData({ ...originalData, ...payload })
      }
    }

    setSessionVersion(newVersion)
    return { success: true, newVersion }
  }, [formData, session, supabase, isNew, originalData, user])

  const { status, hasConflict } = useVersionedAutoSave({
    data: formData,
    version: sessionVersion,
    onSave: saveSession,
    delay: 1500,
    enabled: !isNew && !!session,
    showToast: false,
  })

  // Create new session
  const handleCreate = async () => {
    if (!formData.summary.trim()) {
      toast.error('Please add a summary first')
      return
    }

    const { data: newSession, error } = await supabase
      .from('sessions')
      .insert({
        campaign_id: campaignId,
        session_number: formData.session_number ? parseInt(formData.session_number) : 0,
        title: formData.title || null,
        date: formData.date || null,
        summary: formData.summary || null,
        notes: formData.notes || '',
      })
      .select()
      .single()

    if (error || !newSession) {
      toast.error('Failed to create session')
      return
    }

    // Save attendees
    if (attendees.length > 0) {
      await supabase
        .from('session_characters')
        .insert(attendees.map(charId => ({
          session_id: newSession.id,
          character_id: charId,
        })))
    }

    toast.success('Session created')
    router.replace(`/campaigns/${campaignId}/sessions/${newSession.id}`)
  }

  // AI Expand Notes
  const handleExpandNotes = async () => {
    if (!formData.summary.trim() || expanding) return

    setExpanding(true)
    setPendingNotes('')
    setPendingSummary('')
    setPendingTitle(null)
    setAiReasoning('')
    setShowExpandedPreview(true)

    try {
      // Build known entities from campaign characters
      const knownEntities: string[] = []
      characters.forEach(char => {
        if (char.name) knownEntities.push(char.name)
      })

      // Build context
      const contextParts = []
      if (campaign?.name) contextParts.push(`Campaign: ${campaign.name}`)
      if (formData.title) contextParts.push(`Session Title: ${formData.title}`)
      contextParts.push(`Session Number: ${formData.session_number}`)

      const response = await fetch('/api/ai/expand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: formData.summary,
          context: contextParts.join('\n'),
          provider: aiProvider,
          mode: 'session',
          knownEntities,
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

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        fullText += chunk

        // Parse sections from accumulated text
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

      // Fallback if no sections found
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
    setDetailedNotesCollapsed(false)
  }

  const editExpanded = () => {
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
    setDetailedNotesCollapsed(false)
  }

  const declineExpanded = () => {
    setShowExpandedPreview(false)
    setPendingNotes(null)
    setPendingSummary(null)
    setPendingTitle(null)
    setAiReasoning('')
  }

  // Group characters by type
  const pcCharacters = characters.filter(c => c.type === 'pc')
  const npcCharacters = characters.filter(c => c.type === 'npc')

  // Mobile Layout
  if (isMobile) {
    return (
      <SessionDetailMobile
        campaignId={campaignId}
        isNew={isNew}
        loading={loading}
        formData={formData}
        setFormData={setFormData}
        status={status}
        hasConflict={hasConflict}
        attendees={attendees}
        toggleAttendee={toggleAttendee}
        characters={characters}
        pcCharacters={pcCharacters}
        npcCharacters={npcCharacters}
        showExpandedPreview={showExpandedPreview}
        expanding={expanding}
        pendingSummary={pendingSummary}
        pendingTitle={pendingTitle}
        pendingNotes={pendingNotes}
        detailedNotesCollapsed={detailedNotesCollapsed}
        setDetailedNotesCollapsed={setDetailedNotesCollapsed}
        handleCreate={handleCreate}
        handleExpandNotes={handleExpandNotes}
        acceptExpanded={acceptExpanded}
        editExpanded={editExpanded}
        declineExpanded={declineExpanded}
        formatSummaryAsHtml={formatSummaryAsHtml}
      />
    )
  }

  // Desktop Layout
  if (loading) {
    return (
      <AppLayout campaignId={campaignId}>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-10 h-10 animate-spin text-[--arcane-purple]" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout campaignId={campaignId}>
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
        <div className="mb-8">
          <button
            onClick={() => router.push(`/campaigns/${campaignId}/sessions`)}
            className="flex items-center gap-2 text-sm text-[--text-secondary] hover:text-[--text-primary] transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sessions
          </button>

          {/* Campaign Context */}
          {campaign && (
            <p className="text-xs text-[--text-tertiary] mb-4">
              <span className="text-[--arcane-purple]">{campaign.name}</span>
              <span className="mx-2">/</span>
              <span>Session Log</span>
            </p>
          )}

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-bold text-[--arcane-purple] bg-[--arcane-purple]/10 px-2 py-0.5 rounded">
                  Session {formData.session_number || '?'}
                </span>
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

        {/* Attendance Section */}
        <div className="card p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5 text-[--arcane-purple]" />
            <label className="text-lg font-semibold text-[--text-primary]">
              Attendance
            </label>
            <span className="text-sm text-[--text-tertiary]">
              ({attendees.length} present)
            </span>
          </div>

          {/* PC Characters */}
          {pcCharacters.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-[--text-tertiary] uppercase tracking-wide mb-3">
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
                        'flex items-center gap-2 px-3 py-2 rounded-lg transition-all border-2',
                        isAttending
                          ? 'bg-[--arcane-purple]/20 border-[--arcane-purple] text-white'
                          : 'bg-transparent border-white/10 text-[--text-secondary] hover:border-white/20 opacity-50 hover:opacity-75'
                      )}
                    >
                      <div className="relative w-6 h-6 rounded-full overflow-hidden flex-shrink-0 bg-[--bg-surface]">
                        {char.image_url ? (
                          <Image
                            src={char.image_url}
                            alt={char.name}
                            fill
                            className="object-cover"
                            sizes="24px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-medium">
                            {getInitials(char.name)}
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-medium">{char.name}</span>
                      {isAttending && (
                        <CheckCircle2 className="w-4 h-4 text-[--arcane-purple]" />
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
              <h4 className="text-xs font-semibold text-[--text-tertiary] uppercase tracking-wide mb-3">
                NPCs Present
              </h4>
              <div className="flex flex-wrap gap-2">
                {npcCharacters.map((char) => {
                  const isAttending = attendees.includes(char.id)
                  return (
                    <button
                      key={char.id}
                      onClick={() => toggleAttendee(char.id)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg transition-all border-2',
                        isAttending
                          ? 'bg-[--arcane-gold]/20 border-[--arcane-gold] text-white'
                          : 'bg-transparent border-white/10 text-[--text-secondary] hover:border-white/20 opacity-50 hover:opacity-75'
                      )}
                    >
                      <div className="relative w-6 h-6 rounded-full overflow-hidden flex-shrink-0 bg-[--bg-surface]">
                        {char.image_url ? (
                          <Image
                            src={char.image_url}
                            alt={char.name}
                            fill
                            className="object-cover"
                            sizes="24px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-medium">
                            {getInitials(char.name)}
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-medium">{char.name}</span>
                      {isAttending && (
                        <CheckCircle2 className="w-4 h-4 text-[--arcane-gold]" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {characters.length === 0 && (
            <p className="text-sm text-[--text-tertiary] text-center py-4">
              No characters in this campaign yet.
            </p>
          )}
        </div>

        {/* Summary Section - PRIMARY FOCUS */}
        <div className="card p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <label className="text-lg font-semibold text-[--text-primary] block">
                Summary
              </label>
              <span className="text-sm text-[--text-tertiary]">
                Write bullet points of what happened, then expand with AI
              </span>
            </div>
            {!showExpandedPreview && (
              <button
                onClick={handleExpandNotes}
                disabled={!formData.summary.trim() || expanding}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  "bg-[--arcane-purple]/10 border border-[--arcane-purple]/30 text-[--arcane-purple]",
                  "hover:bg-[--arcane-purple]/20 hover:border-[--arcane-purple]/50",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {expanding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                Expand Notes
              </button>
            )}
          </div>

          <RichTextEditor
            content={formData.summary}
            onChange={(content) => setFormData({ ...formData, summary: content })}
            placeholder="Write your session notes as bullet points..."
            className="min-h-[200px]"
          />
        </div>

        {/* AI Expansion Preview */}
        {showExpandedPreview && (
          <div className="card p-6 mb-8 border-[--arcane-purple]/30 bg-[--arcane-purple]/5">
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
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Decline
                </button>
              </div>
            )}
          </div>
        )}

        {/* Detailed Notes Section */}
        {(formData.notes || !detailedNotesCollapsed) && (
          <div className="card p-6 mb-8">
            <button
              onClick={() => setDetailedNotesCollapsed(!detailedNotesCollapsed)}
              className="w-full flex items-center justify-between mb-4"
            >
              <div className="flex items-center gap-3">
                <ScrollText className="w-5 h-5 text-[--arcane-purple]" />
                <div className="text-left">
                  <label className="text-lg font-semibold text-[--text-primary] block">
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
          <div className="flex justify-end">
            <Button onClick={handleCreate} size="lg">
              Create Session
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

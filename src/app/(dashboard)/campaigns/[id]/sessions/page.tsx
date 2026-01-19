'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Plus,
  Search,
  Calendar,
  FileText,
  Trash2,
  Users,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Input, Modal, Textarea, Tooltip, sanitizeHtml } from '@/components/ui'
import { AppLayout } from '@/components/layout/app-layout'
import { BackToTopButton } from '@/components/ui/back-to-top'
import { SessionsPageMobile } from './page.mobile'
import { CharacterViewModal } from '@/components/character'
import { useSupabase, useUser, useIsMobile } from '@/hooks'
import { formatDate, cn, getInitials } from '@/lib/utils'
import { logActivity } from '@/lib/activity-log'
import Image from 'next/image'
import type { Campaign, Session, Character, Tag, CharacterTag } from '@/types/database'

// Convert basic markdown to HTML for display (or pass through if already HTML)
function markdownToHtml(text: string): string {
  // If already contains HTML list tags, pass through (it's already formatted)
  let html = text
  if (!text.includes('<ul>') && !text.includes('<li>') && !text.includes('<p>')) {
    html = text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br/>')
  }
  return sanitizeHtml(html)
}

interface SessionWithAttendees extends Session {
  attendees: Character[]
}

export default function SessionsPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = useSupabase()
  const { user } = useUser()
  const isMobile = useIsMobile()

  const campaignId = params.id as string

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [sessions, setSessions] = useState<SessionWithAttendees[]>([])
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    summary: '',
  })
  const [saving, setSaving] = useState(false)

  // Character preview modal state
  const [viewingCharacter, setViewingCharacter] = useState<Character | null>(null)
  const [characterTags, setCharacterTags] = useState<(CharacterTag & { tag: Tag; related_character?: Character | null })[]>([])

  // Expanded session notes state
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const toggleExpanded = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  useEffect(() => {
    if (user && campaignId) {
      loadData()
    }
  }, [user, campaignId])

  const loadData = async () => {
    // Only show loading spinner on initial load, not refetches
    if (!hasLoadedOnce) {
      setLoading(true)
    }

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

    // Load all characters for the campaign
    const { data: charactersData } = await supabase
      .from('characters')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('name')

    setCharacters(charactersData || [])

    // Load sessions
    const { data: sessionsData } = await supabase
      .from('sessions')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('date', { ascending: false })

    if (sessionsData && sessionsData.length > 0) {
      // Load all session_characters for this campaign's sessions
      const sessionIds = sessionsData.map(s => s.id)
      const { data: sessionCharacters } = await supabase
        .from('session_characters')
        .select('session_id, character_id')
        .in('session_id', sessionIds)

      // Map attendees to each session
      const sessionsWithAttendees = sessionsData.map(session => ({
        ...session,
        attendees: sessionCharacters
          ?.filter(sc => sc.session_id === session.id)
          .map(sc => charactersData?.find(c => c.id === sc.character_id))
          .filter(Boolean) as Character[] || []
      }))

      setSessions(sessionsWithAttendees)
    } else {
      setSessions([])
    }

    setLoading(false)
    setHasLoadedOnce(true)
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
    if (!formData.title.trim() || !user) return

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
      // Log activity
      await logActivity(supabase, user.id, {
        action: 'session.create',
        entity_type: 'session',
        entity_id: data.id,
        entity_name: `Session ${data.session_number}: ${data.title}`,
        metadata: {
          campaign_id: campaignId,
          campaign_name: campaign?.name,
          session_number: data.session_number,
        },
      })

      setIsCreateModalOpen(false)
      setFormData({
        title: '',
        date: new Date().toISOString().split('T')[0],
        summary: '',
      })
      // Navigate to the full-page editor for the new session
      router.push(`/campaigns/${campaignId}/sessions/${data.id}`)
    }
    setSaving(false)
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this session? This cannot be undone.')) return

    const sessionToDelete = sessions.find(s => s.id === id)
    await supabase.from('sessions').delete().eq('id', id)
    setSessions(sessions.filter((s) => s.id !== id))

    // Log activity
    if (user && sessionToDelete) {
      await logActivity(supabase, user.id, {
        action: 'session.delete',
        entity_type: 'session',
        entity_id: id,
        entity_name: `Session ${sessionToDelete.session_number}: ${sessionToDelete.title || 'Untitled'}`,
        metadata: {
          campaign_id: campaignId,
          campaign_name: campaign?.name,
          session_number: sessionToDelete.session_number,
        },
      })
    }
  }

  const handleSessionClick = (session: SessionWithAttendees) => {
    router.push(`/campaigns/${campaignId}/sessions/${session.id}`)
  }

  const handleCharacterClick = async (character: Character) => {
    // Load character tags for the view modal
    const { data: tagsData } = await supabase
      .from('character_tags')
      .select(`
        *,
        tag:tags(*),
        related_character:characters!character_tags_related_character_id_fkey(*)
      `)
      .eq('character_id', character.id)

    setCharacterTags(tagsData || [])
    setViewingCharacter(character)
  }

  // Mobile Layout
  if (isMobile) {
    return (
      <SessionsPageMobile
        campaignId={campaignId}
        loading={loading}
        sessions={sessions}
        filteredSessions={filteredSessions}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isCreateModalOpen={isCreateModalOpen}
        setIsCreateModalOpen={setIsCreateModalOpen}
        formData={formData}
        setFormData={setFormData}
        saving={saving}
        expandedIds={expandedIds}
        toggleExpanded={toggleExpanded}
        viewingCharacter={viewingCharacter}
        setViewingCharacter={setViewingCharacter}
        characterTags={characterTags}
        handleSessionClick={handleSessionClick}
        handleCharacterClick={handleCharacterClick}
        handleDelete={handleDelete}
        handleCreate={handleCreate}
      />
    )
  }

  // Desktop Layout
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
        <div className="relative mb-6" style={{ marginBottom: '40px' }}>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[--text-tertiary]" />
          <input
            type="text"
            className="form-input pl-12"
            style={{ paddingLeft: '48px' }}
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Sessions List */}
        {filteredSessions.length === 0 ? (
          <div className="empty-state">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-purple-500/10 flex items-center justify-center">
              <FileText className="w-8 h-8 text-purple-400" />
            </div>
            <h2 className="empty-state-title">
              {searchQuery ? 'No matching sessions' : 'Record Your Adventures'}
            </h2>
            <p className="empty-state-description">
              {searchQuery
                ? 'Try a different search term'
                : 'Document each session to track your campaign story. Add summaries, attendees, and detailed notes.'}
            </p>
            {!searchQuery && (
              <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="w-5 h-5" />
                Create First Session
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {filteredSessions.map((session, index) => (
              <div
                key={session.id}
                className="rounded-xl cursor-pointer animate-slide-in-up transition-all duration-200"
                style={{
                  animationDelay: `${index * 50}ms`,
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  marginBottom: '32px',
                }}
                onClick={() => handleSessionClick(session)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.5)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4)'
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)'
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'
                }}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <span
                          className="px-3 py-1.5 text-xs font-bold rounded-lg uppercase tracking-wide"
                          style={{
                            backgroundColor: 'rgba(139, 92, 246, 0.15)',
                            color: '#a78bfa'
                          }}
                        >
                          Session {session.session_number}
                        </span>
                        <span className="text-sm text-[--text-tertiary] flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          {formatDate(session.date)}
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold text-[--text-primary] mb-3">
                        {session.title || 'Untitled Session'}
                      </h3>

                      {/* Full Summary - no line clamp */}
                      {session.summary && (
                        <div
                          className="prose prose-invert prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-5 [&>ul]:mt-1 [&>ul]:mb-2 [&_li]:my-0.5 [&>p]:mb-2 text-[--text-secondary] mb-4"
                          dangerouslySetInnerHTML={{ __html: markdownToHtml(session.summary) }}
                        />
                      )}

                      {/* Detailed Notes Toggle */}
                      {session.notes && (
                        <button
                          onClick={(e) => toggleExpanded(session.id, e)}
                          className="flex items-center gap-2 mb-4 text-sm text-[--arcane-purple] hover:text-[--arcane-purple]/80 transition-colors"
                        >
                          {expandedIds.has(session.id) ? (
                            <>
                              <ChevronUp className="w-4 h-4" />
                              Hide Detailed Notes
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4" />
                              Show Detailed Notes
                            </>
                          )}
                        </button>
                      )}

                      {/* Expanded Detailed Notes */}
                      {expandedIds.has(session.id) && session.notes && (
                        <div className="mb-4 p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                          <div
                            className="prose prose-invert prose-sm max-w-none [&>h3]:mt-6 [&>h3:first-child]:mt-0 [&>h3]:mb-2 [&>h3]:text-base [&>h3]:font-semibold [&>ul]:mt-1 [&>ul]:mb-4 [&>p]:mb-4"
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(session.notes) }}
                          />
                        </div>
                      )}

                      {/* Attendees Avatars */}
                      {session.attendees.length > 0 && (
                        <div className="flex items-center gap-3 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                          <Users className="w-4 h-4 text-[--text-tertiary]" />
                          <div className="flex -space-x-2">
                            {session.attendees.slice(0, 5).map((char) => (
                              <Tooltip key={char.id} content={char.name} side="top" delay={200}>
                                <div
                                  className="relative w-8 h-8 rounded-full overflow-hidden hover:z-10 hover:scale-110 transition-transform cursor-pointer"
                                  style={{
                                    border: '2px solid #12121a',
                                    backgroundColor: '#1a1a24',
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleCharacterClick(char)
                                  }}
                                >
                                  {char.image_url ? (
                                    <Image
                                      src={char.image_url}
                                      alt={char.name}
                                      fill
                                      className="object-cover"
                                      sizes="32px"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-[--text-tertiary]">
                                      {getInitials(char.name)}
                                    </div>
                                  )}
                                </div>
                              </Tooltip>
                            ))}
                            {session.attendees.length > 5 && (
                              <Tooltip content={`${session.attendees.length - 5} more attendees`} side="top">
                                <div
                                  className="relative w-8 h-8 rounded-full flex items-center justify-center"
                                  style={{
                                    border: '2px solid #12121a',
                                    backgroundColor: '#1a1a24',
                                  }}
                                >
                                  <span className="text-[10px] font-bold text-[--text-tertiary]">
                                    +{session.attendees.length - 5}
                                  </span>
                                </div>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-[--arcane-ember] hover:bg-[--arcane-ember]/10 transition-colors"
                        onClick={(e) => handleDelete(session.id, e)}
                        title="Delete session"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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

        {/* Character View Modal */}
        {viewingCharacter && (
          <CharacterViewModal
            character={viewingCharacter}
            tags={characterTags}
            onEdit={() => {
              // Could navigate to character editor if needed
              setViewingCharacter(null)
            }}
            onClose={() => setViewingCharacter(null)}
          />
        )}
      </div>
      <BackToTopButton />
    </AppLayout>
  )
}

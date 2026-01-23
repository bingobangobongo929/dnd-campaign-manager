'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Loader2,
  Plus,
  ScrollText,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit3,
} from 'lucide-react'
import { toast } from 'sonner'
import { AppLayout } from '@/components/layout/app-layout'
import { useIsMobile } from '@/hooks'
import { Button, SafeHtml } from '@/components/ui'
import { CharacterSessionsPageMobile } from './page.mobile'
import { BackToTopButton } from '@/components/ui/back-to-top'
import { PartyMemberAvatarStack } from '@/components/sessions'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/character-display'
import type { PlayJournal } from '@/types/database'

interface SessionAttendee {
  id: string
  name: string
  image_url?: string | null
}

interface SessionWithAttendees extends PlayJournal {
  attendees?: SessionAttendee[]
}

export default function CharacterSessionsPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const characterId = params.id as string
  const isMobile = useIsMobile()

  const [entries, setEntries] = useState<SessionWithAttendees[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadData()
  }, [characterId])

  const loadData = async () => {
    setLoading(true)

    // Load all sessions
    const { data: sessionsData } = await supabase
      .from('play_journal')
      .select('*')
      .eq('character_id', characterId)
      .order('session_number', { ascending: false, nullsFirst: false })

    if (!sessionsData) {
      setLoading(false)
      return
    }

    // Load all attendees for these sessions with relationship details
    const sessionIds = sessionsData.map(s => s.id)
    const { data: attendeesData } = await supabase
      .from('play_journal_attendees')
      .select(`
        play_journal_id,
        relationship:vault_character_relationships (
          id,
          related_name,
          related_image_url
        )
      `)
      .in('play_journal_id', sessionIds)

    // Group attendees by session
    const attendeesBySession: Record<string, SessionAttendee[]> = {}
    if (attendeesData) {
      attendeesData.forEach((a: any) => {
        if (!attendeesBySession[a.play_journal_id]) {
          attendeesBySession[a.play_journal_id] = []
        }
        if (a.relationship) {
          attendeesBySession[a.play_journal_id].push({
            id: a.relationship.id,
            name: a.relationship.related_name || 'Unknown',
            image_url: a.relationship.related_image_url,
          })
        }
      })
    }

    // Combine sessions with attendees
    const sessionsWithAttendees: SessionWithAttendees[] = sessionsData.map(session => ({
      ...session,
      attendees: attendeesBySession[session.id] || [],
    }))

    setEntries(sessionsWithAttendees)
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this session entry?')) return

    const { error } = await supabase
      .from('play_journal')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Failed to delete entry')
    } else {
      toast.success('Entry deleted')
      loadData()
    }
  }

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ============ MOBILE LAYOUT ============
  if (isMobile) {
    return (
      <CharacterSessionsPageMobile
        characterId={characterId}
        entries={entries}
        loading={loading}
        expandedIds={expandedIds}
        toggleExpanded={toggleExpanded}
        handleDelete={handleDelete}
        onNavigate={(path) => router.push(path)}
      />
    )
  }

  // ============ DESKTOP LAYOUT ============
  if (loading) {
    return (
      <AppLayout characterId={characterId}>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[--arcane-purple]" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout characterId={characterId}>
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-[--text-primary]">Sessions</h1>
          <Button onClick={() => router.push(`/vault/${characterId}/sessions/new`)}>
            <Plus className="w-4 h-4 mr-2" />
            New Entry
          </Button>
        </div>

        {/* Session List */}
        <div className="space-y-4">
          {entries.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                <ScrollText className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-[--text-primary] mb-3">Chronicle Your Journey</h3>
              <p className="text-sm text-[--text-secondary] mb-4 max-w-sm mx-auto">
                Record each session as your character's story unfolds. Track adventures, encounters, and memorable moments.
              </p>
              <p className="text-xs text-purple-400/80 mb-6 max-w-sm mx-auto italic">
                Your session notes power Character Intelligence - helping track your character's growth and story arc.
              </p>
              <Button onClick={() => router.push(`/vault/${characterId}/sessions/new`)}>
                <Plus className="w-4 h-4 mr-2" />
                Record First Session
              </Button>
            </div>
          ) : (
            entries.map((entry) => {
              const isExpanded = expandedIds.has(entry.id)
              return (
                <div
                  key={entry.id}
                  className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden"
                >
                  {/* Session Header */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-[--arcane-purple] bg-[--arcane-purple]/10 px-2 py-0.5 rounded">
                          Session {entry.session_number ?? '?'}
                        </span>
                        {entry.session_date && (
                          <span className="text-xs text-[--text-tertiary]">
                            {formatDate(entry.session_date)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/vault/${characterId}/sessions/${entry.id}`)}
                          className="text-[--text-tertiary] hover:text-white"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(entry.id)}
                          className="text-[--text-tertiary] hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <h3 className="font-medium text-[--text-primary] mb-3">
                      {entry.title || `Session ${entry.session_number}`}
                    </h3>

                    {/* Party Members Present */}
                    {entry.attendees && entry.attendees.length > 0 && (
                      <div className="mb-3">
                        <PartyMemberAvatarStack
                          members={entry.attendees}
                          max={6}
                          size="sm"
                        />
                      </div>
                    )}

                    {/* Full Summary - no line clamp */}
                    {entry.summary && (
                      <SafeHtml
                        html={entry.summary}
                        className="prose prose-invert prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-5 [&>ul]:mt-1 [&>ul]:mb-2 [&_li]:my-0.5 [&>p]:mb-2 text-[--text-secondary]"
                      />
                    )}

                    {/* Detailed Notes Toggle */}
                    {entry.notes && (
                      <button
                        onClick={() => toggleExpanded(entry.id)}
                        className="flex items-center gap-2 mt-4 text-sm text-[--arcane-purple] hover:text-[--arcane-purple]/80 transition-colors"
                      >
                        {isExpanded ? (
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
                  </div>

                  {/* Expanded Detailed Notes */}
                  {isExpanded && entry.notes && (
                    <div className="px-4 pb-4 pt-2 border-t border-white/[0.06]">
                      <SafeHtml
                        html={entry.notes}
                        className="prose prose-invert prose-sm max-w-none [&>h3]:mt-6 [&>h3:first-child]:mt-0 [&>h3]:mb-2 [&>h3]:text-base [&>h3]:font-semibold [&>ul]:mt-1 [&>ul]:mb-4 [&>p]:mb-4"
                      />
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
      <BackToTopButton />
    </AppLayout>
  )
}

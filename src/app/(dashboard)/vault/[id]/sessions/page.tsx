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
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/character-display'
import type { PlayJournal } from '@/types/database'

export default function CharacterSessionsPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const characterId = params.id as string
  const isMobile = useIsMobile()

  const [entries, setEntries] = useState<PlayJournal[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadData()
  }, [characterId])

  const loadData = async () => {
    setLoading(true)

    const { data } = await supabase
      .from('play_journal')
      .select('*')
      .eq('character_id', characterId)
      .order('session_number', { ascending: false, nullsFirst: false })

    if (data) {
      setEntries(data)
    }

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
              <ScrollText className="w-12 h-12 mx-auto mb-4 text-[--text-tertiary]" />
              <h3 className="text-lg font-medium text-[--text-primary] mb-2">No Sessions Yet</h3>
              <p className="text-sm text-[--text-secondary] mb-6">
                Record your character's adventures
              </p>
              <Button onClick={() => router.push(`/vault/${characterId}/sessions/new`)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Entry
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

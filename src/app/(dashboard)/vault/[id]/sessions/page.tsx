'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Loader2,
  Plus,
  ScrollText,
  Calendar,
  Swords,
  Package,
  MapPin,
  Users,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit3,
  Lightbulb,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/character-display'
import type { PlayJournal, Session, Campaign } from '@/types/database'

interface CampaignSession extends Session {
  campaign?: Campaign
}

export default function CharacterSessionsPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const characterId = params.id as string

  const [activeTab, setActiveTab] = useState<'journal' | 'campaigns'>('journal')
  const [journalEntries, setJournalEntries] = useState<PlayJournal[]>([])
  const [campaignSessions, setCampaignSessions] = useState<CampaignSession[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadData()
  }, [characterId])

  const loadData = async () => {
    setLoading(true)

    // Load journal entries
    const { data: journalData } = await supabase
      .from('play_journal')
      .select('*')
      .eq('character_id', characterId)
      .order('session_date', { ascending: false, nullsFirst: false })
      .order('session_number', { ascending: false, nullsFirst: false })

    if (journalData) {
      setJournalEntries(journalData)
    }

    // Load campaign sessions where this character appeared
    // First, we need to check if this vault character is linked to any campaign characters
    const { data: vaultChar } = await supabase
      .from('vault_characters')
      .select('id, name')
      .eq('id', characterId)
      .single()

    if (vaultChar) {
      // Find campaign characters with matching name (linked characters)
      const { data: campaignChars } = await supabase
        .from('characters')
        .select('id, campaign_id')
        .ilike('name', vaultChar.name)

      if (campaignChars && campaignChars.length > 0) {
        const charIds = campaignChars.map(c => c.id)

        // Get sessions where these characters appeared
        const { data: sessionChars } = await supabase
          .from('session_characters')
          .select('session_id')
          .in('character_id', charIds)

        if (sessionChars && sessionChars.length > 0) {
          const sessionIds = [...new Set(sessionChars.map(sc => sc.session_id))]

          const { data: sessions } = await supabase
            .from('sessions')
            .select('*, campaigns(*)')
            .in('id', sessionIds)
            .order('session_date', { ascending: false })

          if (sessions) {
            setCampaignSessions(sessions.map(s => ({
              ...s,
              campaign: s.campaigns as Campaign
            })))
          }
        }
      }
    }

    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this journal entry?')) return

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
          <div>
            <h1 className="text-2xl font-bold text-[--text-primary]">Sessions</h1>
            <p className="text-sm text-[--text-secondary]">
              Track your character's adventures and campaign appearances
            </p>
          </div>
          {activeTab === 'journal' && (
            <Button onClick={() => router.push(`/vault/${characterId}/sessions/new`)}>
              <Plus className="w-4 h-4 mr-2" />
              New Entry
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('journal')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'journal'
                ? 'bg-[--arcane-purple] text-white'
                : 'bg-[--bg-elevated] text-[--text-secondary] hover:text-[--text-primary]'
            }`}
          >
            <ScrollText className="w-4 h-4 inline mr-2" />
            Personal Journal ({journalEntries.length})
          </button>
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'campaigns'
                ? 'bg-[--arcane-purple] text-white'
                : 'bg-[--bg-elevated] text-[--text-secondary] hover:text-[--text-primary]'
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-2" />
            Campaign Sessions ({campaignSessions.length})
          </button>
        </div>

        {/* Content */}
        {activeTab === 'journal' ? (
          <div className="space-y-4">
            {journalEntries.length === 0 ? (
              <div className="text-center py-16">
                <ScrollText className="w-12 h-12 mx-auto mb-4 text-[--text-tertiary]" />
                <h3 className="text-lg font-medium text-[--text-primary] mb-2">No Journal Entries</h3>
                <p className="text-sm text-[--text-secondary] mb-6">
                  Start recording your character's adventures and experiences
                </p>
                <Button onClick={() => router.push(`/vault/${characterId}/sessions/new`)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Entry
                </Button>
              </div>
            ) : (
              journalEntries.map((entry) => {
                const isExpanded = expandedIds.has(entry.id)
                return (
                  <div
                    key={entry.id}
                    className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden"
                  >
                    <button
                      onClick={() => toggleExpanded(entry.id)}
                      className="w-full p-4 flex items-start justify-between text-left hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xs font-bold text-[--arcane-purple] bg-[--arcane-purple]/10 px-2 py-0.5 rounded">
                            Session {entry.session_number || '?'}
                          </span>
                          {entry.session_date && (
                            <span className="text-xs text-[--text-tertiary]">
                              {formatDate(entry.session_date)}
                            </span>
                          )}
                          {entry.campaign_name && (
                            <span className="text-xs text-[--text-tertiary]">
                              {entry.campaign_name}
                            </span>
                          )}
                        </div>
                        <h3 className="font-medium text-[--text-primary]">
                          {entry.title || `Session ${entry.session_number}`}
                        </h3>
                        {entry.summary && (
                          <p className="text-sm text-[--text-secondary] mt-1 line-clamp-2">
                            {entry.summary}
                          </p>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-[--text-tertiary] flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-[--text-tertiary] flex-shrink-0" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-white/[0.06]">
                        {/* Stats row */}
                        <div className="flex flex-wrap gap-4 py-4 border-b border-white/[0.06]">
                          {entry.kill_count !== null && entry.kill_count > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                              <Swords className="w-4 h-4 text-red-400" />
                              <span className="text-[--text-secondary]">Kills: {entry.kill_count}</span>
                            </div>
                          )}
                          {entry.loot && (
                            <div className="flex items-center gap-2 text-sm">
                              <Package className="w-4 h-4 text-yellow-400" />
                              <span className="text-[--text-secondary]">Loot: {entry.loot}</span>
                            </div>
                          )}
                          {entry.npcs_met && entry.npcs_met.length > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                              <Users className="w-4 h-4 text-blue-400" />
                              <span className="text-[--text-secondary]">NPCs: {entry.npcs_met.join(', ')}</span>
                            </div>
                          )}
                          {entry.locations_visited && entry.locations_visited.length > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="w-4 h-4 text-green-400" />
                              <span className="text-[--text-secondary]">{entry.locations_visited.join(', ')}</span>
                            </div>
                          )}
                        </div>

                        {/* Notes */}
                        <div className="py-4">
                          <div
                            className="prose prose-invert prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: entry.notes }}
                          />
                        </div>

                        {/* Thoughts for next */}
                        {entry.thoughts_for_next && (
                          <div className="py-4 border-t border-white/[0.06]">
                            <div className="flex items-center gap-2 text-sm font-medium text-[--text-primary] mb-2">
                              <Lightbulb className="w-4 h-4 text-yellow-400" />
                              Thoughts for Next Session
                            </div>
                            <p className="text-sm text-[--text-secondary]">{entry.thoughts_for_next}</p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-4 border-t border-white/[0.06]">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => router.push(`/vault/${characterId}/sessions/${entry.id}`)}
                          >
                            <Edit3 className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(entry.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {campaignSessions.length === 0 ? (
              <div className="text-center py-16">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-[--text-tertiary]" />
                <h3 className="text-lg font-medium text-[--text-primary] mb-2">No Campaign Sessions</h3>
                <p className="text-sm text-[--text-secondary]">
                  This character hasn't appeared in any campaign sessions yet
                </p>
              </div>
            ) : (
              campaignSessions.map((session) => (
                <div
                  key={session.id}
                  className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                          Session {session.session_number}
                        </span>
                        {session.date && (
                          <span className="text-xs text-[--text-tertiary]">
                            {formatDate(session.date)}
                          </span>
                        )}
                        {session.campaign && (
                          <span className="text-xs text-[--text-tertiary]">
                            {session.campaign.name}
                          </span>
                        )}
                      </div>
                      <h3 className="font-medium text-[--text-primary]">
                        {session.title || `Session ${session.session_number}`}
                      </h3>
                      {session.summary && (
                        <p className="text-sm text-[--text-secondary] mt-1 line-clamp-2">
                          {session.summary}
                        </p>
                      )}
                    </div>
                    {session.campaign && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/campaigns/${session.campaign_id}/sessions/${session.id}`)}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </AppLayout>
  )
}

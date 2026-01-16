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
import { VaultLayout } from '@/components/layout/VaultLayout'
import { Button, Modal } from '@/components/ui'
import { RichTextEditor } from '@/components/editor/rich-text-editor'
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

  // Journal editor state
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<PlayJournal | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    session_number: '',
    session_date: '',
    title: '',
    campaign_name: '',
    summary: '',
    notes: '',
    kill_count: '',
    loot: '',
    thoughts_for_next: '',
    npcs_met: '',
    locations_visited: '',
  })

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

  const openEditor = (entry?: PlayJournal) => {
    if (entry) {
      setEditingEntry(entry)
      setFormData({
        session_number: entry.session_number?.toString() || '',
        session_date: entry.session_date || '',
        title: entry.title || '',
        campaign_name: entry.campaign_name || '',
        summary: entry.summary || '',
        notes: entry.notes || '',
        kill_count: entry.kill_count?.toString() || '',
        loot: entry.loot || '',
        thoughts_for_next: entry.thoughts_for_next || '',
        npcs_met: entry.npcs_met?.join(', ') || '',
        locations_visited: entry.locations_visited?.join(', ') || '',
      })
    } else {
      setEditingEntry(null)
      // Set defaults for new entry
      const nextNumber = journalEntries.length > 0
        ? Math.max(...journalEntries.map(e => e.session_number || 0)) + 1
        : 1
      setFormData({
        session_number: nextNumber.toString(),
        session_date: new Date().toISOString().split('T')[0],
        title: '',
        campaign_name: journalEntries[0]?.campaign_name || '',
        summary: '',
        notes: '',
        kill_count: '',
        loot: '',
        thoughts_for_next: '',
        npcs_met: '',
        locations_visited: '',
      })
    }
    setIsEditorOpen(true)
  }

  const handleSave = async () => {
    if (!formData.notes.trim()) {
      toast.error('Notes are required')
      return
    }

    setSaving(true)

    const payload = {
      character_id: characterId,
      session_number: formData.session_number ? parseInt(formData.session_number) : null,
      session_date: formData.session_date || null,
      title: formData.title || null,
      campaign_name: formData.campaign_name || null,
      summary: formData.summary || null,
      notes: formData.notes,
      kill_count: formData.kill_count ? parseInt(formData.kill_count) : null,
      loot: formData.loot || null,
      thoughts_for_next: formData.thoughts_for_next || null,
      npcs_met: formData.npcs_met ? formData.npcs_met.split(',').map(s => s.trim()).filter(Boolean) : null,
      locations_visited: formData.locations_visited ? formData.locations_visited.split(',').map(s => s.trim()).filter(Boolean) : null,
    }

    if (editingEntry) {
      const { error } = await supabase
        .from('play_journal')
        .update(payload)
        .eq('id', editingEntry.id)

      if (error) {
        toast.error('Failed to update entry')
      } else {
        toast.success('Entry updated')
        setIsEditorOpen(false)
        loadData()
      }
    } else {
      const { error } = await supabase
        .from('play_journal')
        .insert(payload)

      if (error) {
        toast.error('Failed to create entry')
      } else {
        toast.success('Entry created')
        setIsEditorOpen(false)
        loadData()
      }
    }

    setSaving(false)
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
      <VaultLayout characterId={characterId}>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[--arcane-purple]" />
        </div>
      </VaultLayout>
    )
  }

  return (
    <VaultLayout characterId={characterId}>
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
            <Button onClick={() => openEditor()}>
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
                <Button onClick={() => openEditor()}>
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
                            onClick={() => openEditor(entry)}
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

        {/* Journal Editor Modal */}
        <Modal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          title={editingEntry ? 'Edit Journal Entry' : 'New Journal Entry'}
          size="lg"
        >
          <div className="space-y-4">
            {/* Basic info row */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[--text-secondary] mb-1">
                  Session #
                </label>
                <input
                  type="number"
                  value={formData.session_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, session_number: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-[--bg-elevated] border border-[--border] text-[--text-primary] focus:outline-none focus:border-[--arcane-purple]"
                  placeholder="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[--text-secondary] mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={formData.session_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, session_date: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-[--bg-elevated] border border-[--border] text-[--text-primary] focus:outline-none focus:border-[--arcane-purple]"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[--text-secondary] mb-1">
                  Campaign
                </label>
                <input
                  type="text"
                  value={formData.campaign_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, campaign_name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-[--bg-elevated] border border-[--border] text-[--text-primary] focus:outline-none focus:border-[--arcane-purple]"
                  placeholder="Campaign name"
                />
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-[--text-secondary] mb-1">
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-[--bg-elevated] border border-[--border] text-[--text-primary] focus:outline-none focus:border-[--arcane-purple]"
                placeholder="Session title"
              />
            </div>

            {/* Summary */}
            <div>
              <label className="block text-sm font-medium text-[--text-secondary] mb-1">
                Summary
              </label>
              <textarea
                value={formData.summary}
                onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-[--bg-elevated] border border-[--border] text-[--text-primary] focus:outline-none focus:border-[--arcane-purple] resize-none"
                rows={2}
                placeholder="Brief summary of the session"
              />
            </div>

            {/* Notes (Rich Text) */}
            <div>
              <label className="block text-sm font-medium text-[--text-secondary] mb-1">
                Notes *
              </label>
              <RichTextEditor
                content={formData.notes}
                onChange={(content) => setFormData(prev => ({ ...prev, notes: content }))}
                placeholder="Detailed session notes..."
              />
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[--text-secondary] mb-1">
                  Kill Count
                </label>
                <input
                  type="number"
                  value={formData.kill_count}
                  onChange={(e) => setFormData(prev => ({ ...prev, kill_count: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-[--bg-elevated] border border-[--border] text-[--text-primary] focus:outline-none focus:border-[--arcane-purple]"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[--text-secondary] mb-1">
                  Loot
                </label>
                <input
                  type="text"
                  value={formData.loot}
                  onChange={(e) => setFormData(prev => ({ ...prev, loot: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-[--bg-elevated] border border-[--border] text-[--text-primary] focus:outline-none focus:border-[--arcane-purple]"
                  placeholder="Gold, items, etc."
                />
              </div>
            </div>

            {/* NPCs and Locations */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[--text-secondary] mb-1">
                  NPCs Met
                </label>
                <input
                  type="text"
                  value={formData.npcs_met}
                  onChange={(e) => setFormData(prev => ({ ...prev, npcs_met: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-[--bg-elevated] border border-[--border] text-[--text-primary] focus:outline-none focus:border-[--arcane-purple]"
                  placeholder="Comma-separated names"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[--text-secondary] mb-1">
                  Locations Visited
                </label>
                <input
                  type="text"
                  value={formData.locations_visited}
                  onChange={(e) => setFormData(prev => ({ ...prev, locations_visited: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-[--bg-elevated] border border-[--border] text-[--text-primary] focus:outline-none focus:border-[--arcane-purple]"
                  placeholder="Comma-separated locations"
                />
              </div>
            </div>

            {/* Thoughts for next */}
            <div>
              <label className="block text-sm font-medium text-[--text-secondary] mb-1">
                Thoughts for Next Session
              </label>
              <textarea
                value={formData.thoughts_for_next}
                onChange={(e) => setFormData(prev => ({ ...prev, thoughts_for_next: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-[--bg-elevated] border border-[--border] text-[--text-primary] focus:outline-none focus:border-[--arcane-purple] resize-none"
                rows={2}
                placeholder="Ideas, plans, or questions for next time"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-[--border]">
              <Button variant="secondary" onClick={() => setIsEditorOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {editingEntry ? 'Save Changes' : 'Create Entry'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </VaultLayout>
  )
}

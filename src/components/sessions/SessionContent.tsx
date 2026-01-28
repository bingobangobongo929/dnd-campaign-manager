'use client'

import { useState, useEffect } from 'react'
import {
  Target,
  Swords,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Scroll,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui'
import { useSupabase } from '@/hooks'

interface Quest {
  id: string
  name: string
  type: string
  status: string
}

interface Encounter {
  id: string
  name: string
  type: string
  status: string
  difficulty: string | null
}

interface SessionQuest {
  id: string
  session_id: string
  quest_id: string
  progress_type: 'mentioned' | 'started' | 'progressed' | 'completed' | 'failed'
  quest?: Quest
}

interface SessionEncounter {
  id: string
  session_id: string
  encounter_id: string
  status_in_session: 'planned' | 'used' | 'skipped'
  encounter?: Encounter
}

interface SessionContentProps {
  sessionId: string
  campaignId: string
  canEdit: boolean
}

const QUEST_PROGRESS_OPTIONS = [
  { value: 'mentioned', label: 'Mentioned', color: '#6B7280' },
  { value: 'started', label: 'Started', color: '#3B82F6' },
  { value: 'progressed', label: 'Progressed', color: '#8B5CF6' },
  { value: 'completed', label: 'Completed', color: '#10B981' },
  { value: 'failed', label: 'Failed', color: '#EF4444' },
]

const ENCOUNTER_STATUS_OPTIONS = [
  { value: 'planned', label: 'Planned', color: '#F59E0B' },
  { value: 'used', label: 'Used', color: '#10B981' },
  { value: 'skipped', label: 'Skipped', color: '#6B7280' },
]

export function SessionContent({ sessionId, campaignId, canEdit }: SessionContentProps) {
  const supabase = useSupabase()
  const [loading, setLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)

  // Quests
  const [sessionQuests, setSessionQuests] = useState<SessionQuest[]>([])
  const [allQuests, setAllQuests] = useState<Quest[]>([])
  const [showAddQuest, setShowAddQuest] = useState(false)
  const [selectedQuestId, setSelectedQuestId] = useState('')
  const [selectedQuestProgress, setSelectedQuestProgress] = useState('progressed')

  // Encounters
  const [sessionEncounters, setSessionEncounters] = useState<SessionEncounter[]>([])
  const [allEncounters, setAllEncounters] = useState<Encounter[]>([])
  const [showAddEncounter, setShowAddEncounter] = useState(false)
  const [selectedEncounterId, setSelectedEncounterId] = useState('')
  const [selectedEncounterStatus, setSelectedEncounterStatus] = useState('used')

  const [adding, setAdding] = useState(false)

  useEffect(() => {
    loadData()
  }, [sessionId, campaignId])

  // Auto-expand if there's content
  useEffect(() => {
    if (!loading && (sessionQuests.length > 0 || sessionEncounters.length > 0)) {
      setIsExpanded(true)
    }
  }, [loading, sessionQuests.length, sessionEncounters.length])

  const loadData = async () => {
    setLoading(true)

    // Load session quests with quest details
    const { data: sqData } = await supabase
      .from('session_quests')
      .select(`
        id, session_id, quest_id, progress_type, created_at,
        quest:quests(id, name, type, status)
      `)
      .eq('session_id', sessionId)
      .order('created_at')

    // Load session encounters with encounter details
    const { data: seData } = await supabase
      .from('session_encounters')
      .select(`
        id, session_id, encounter_id, status_in_session, created_at,
        encounter:encounters(id, name, type, status, difficulty)
      `)
      .eq('session_id', sessionId)
      .order('created_at')

    // Load all quests for dropdown
    const { data: questsData } = await supabase
      .from('quests')
      .select('id, name, type, status')
      .eq('campaign_id', campaignId)
      .order('name')

    // Load all encounters for dropdown
    const { data: encountersData } = await supabase
      .from('encounters')
      .select('id, name, type, status, difficulty')
      .eq('campaign_id', campaignId)
      .order('name')

    setSessionQuests(sqData?.map(sq => ({
      ...sq,
      quest: Array.isArray(sq.quest) ? sq.quest[0] : sq.quest
    })) || [])

    setSessionEncounters(seData?.map(se => ({
      ...se,
      encounter: Array.isArray(se.encounter) ? se.encounter[0] : se.encounter
    })) || [])

    setAllQuests(questsData || [])
    setAllEncounters(encountersData || [])
    setLoading(false)
  }

  const availableQuests = allQuests.filter(
    q => !sessionQuests.some(sq => sq.quest_id === q.id)
  )

  const availableEncounters = allEncounters.filter(
    e => !sessionEncounters.some(se => se.encounter_id === e.id)
  )

  const handleAddQuest = async () => {
    if (!selectedQuestId) return
    setAdding(true)

    const { error } = await supabase
      .from('session_quests')
      .insert({
        session_id: sessionId,
        quest_id: selectedQuestId,
        progress_type: selectedQuestProgress,
      })

    if (error) {
      toast.error('Failed to link quest')
    } else {
      toast.success('Quest linked')
      setSelectedQuestId('')
      setShowAddQuest(false)
      loadData()
    }
    setAdding(false)
  }

  const handleAddEncounter = async () => {
    if (!selectedEncounterId) return
    setAdding(true)

    const { error } = await supabase
      .from('session_encounters')
      .insert({
        session_id: sessionId,
        encounter_id: selectedEncounterId,
        status_in_session: selectedEncounterStatus,
      })

    if (error) {
      toast.error('Failed to link encounter')
    } else {
      toast.success('Encounter linked')
      setSelectedEncounterId('')
      setShowAddEncounter(false)
      loadData()
    }
    setAdding(false)
  }

  const handleRemoveQuest = async (id: string) => {
    const { error } = await supabase
      .from('session_quests')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Failed to remove')
    } else {
      loadData()
    }
  }

  const handleRemoveEncounter = async (id: string) => {
    const { error } = await supabase
      .from('session_encounters')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Failed to remove')
    } else {
      loadData()
    }
  }

  const handleUpdateQuestProgress = async (id: string, progress: string) => {
    await supabase
      .from('session_quests')
      .update({ progress_type: progress })
      .eq('id', id)
    loadData()
  }

  const handleUpdateEncounterStatus = async (id: string, status: string) => {
    await supabase
      .from('session_encounters')
      .update({ status_in_session: status })
      .eq('id', id)
    loadData()
  }

  const totalCount = sessionQuests.length + sessionEncounters.length
  const hasContent = totalCount > 0

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-[--text-tertiary]" />
      </div>
    )
  }

  // If no content and user can't edit, don't show anything
  if (!hasContent && !canEdit) {
    return null
  }

  return (
    <div className="card overflow-hidden">
      {/* Header - always visible, clickable to expand */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <Scroll className="w-5 h-5 text-[--arcane-purple]" />
          <div className="text-left">
            <h3 className="text-base font-semibold text-[--text-primary]">
              Session Content
            </h3>
            <p className="text-sm text-[--text-tertiary]">
              {hasContent
                ? `${sessionQuests.length} quest${sessionQuests.length !== 1 ? 's' : ''}, ${sessionEncounters.length} encounter${sessionEncounters.length !== 1 ? 's' : ''}`
                : 'Link quests and encounters from this session'
              }
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-[--text-tertiary]" />
        ) : (
          <ChevronDown className="w-5 h-5 text-[--text-tertiary]" />
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-white/[0.06] p-4 space-y-6">
          {/* Quests Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium text-[--text-secondary]">Quests</span>
                {sessionQuests.length > 0 && (
                  <span className="text-xs text-[--text-tertiary]">({sessionQuests.length})</span>
                )}
              </div>
              {canEdit && (
                <button
                  onClick={() => setShowAddQuest(!showAddQuest)}
                  className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              )}
            </div>

            {/* Add Quest Form */}
            {showAddQuest && canEdit && (
              <div className="mb-3 p-3 bg-white/[0.02] rounded-lg flex flex-col sm:flex-row gap-2">
                <select
                  value={selectedQuestId}
                  onChange={(e) => setSelectedQuestId(e.target.value)}
                  className="form-input flex-1 text-sm"
                >
                  <option value="">Select quest...</option>
                  {availableQuests.map(q => (
                    <option key={q.id} value={q.id}>{q.name}</option>
                  ))}
                </select>
                <select
                  value={selectedQuestProgress}
                  onChange={(e) => setSelectedQuestProgress(e.target.value)}
                  className="form-input w-full sm:w-32 text-sm"
                >
                  {QUEST_PROGRESS_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <button
                  onClick={handleAddQuest}
                  disabled={!selectedQuestId || adding}
                  className="px-3 py-2 bg-purple-500 text-white rounded text-sm font-medium hover:bg-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
                </button>
              </div>
            )}

            {/* Quest List */}
            {sessionQuests.length > 0 ? (
              <div className="space-y-1">
                {sessionQuests.map(sq => (
                  <div
                    key={sq.id}
                    className="flex items-center gap-2 p-2 bg-white/[0.02] rounded group"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-[--text-secondary] truncate block">
                        {sq.quest?.name || 'Unknown'}
                      </span>
                    </div>
                    {canEdit ? (
                      <select
                        value={sq.progress_type}
                        onChange={(e) => handleUpdateQuestProgress(sq.id, e.target.value)}
                        className="text-xs px-2 py-1 rounded bg-[--bg-elevated] border border-white/[0.08] cursor-pointer focus:outline-none focus:border-[--arcane-purple]"
                        style={{ color: QUEST_PROGRESS_OPTIONS.find(o => o.value === sq.progress_type)?.color }}
                      >
                        {QUEST_PROGRESS_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    ) : (
                      <Badge size="sm" color={QUEST_PROGRESS_OPTIONS.find(o => o.value === sq.progress_type)?.color}>
                        {QUEST_PROGRESS_OPTIONS.find(o => o.value === sq.progress_type)?.label}
                      </Badge>
                    )}
                    {canEdit && (
                      <button
                        onClick={() => handleRemoveQuest(sq.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/[0.05] rounded text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[--text-tertiary]">No quests linked</p>
            )}
          </div>

          {/* Encounters Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Swords className="w-4 h-4 text-red-400" />
                <span className="text-sm font-medium text-[--text-secondary]">Encounters</span>
                {sessionEncounters.length > 0 && (
                  <span className="text-xs text-[--text-tertiary]">({sessionEncounters.length})</span>
                )}
              </div>
              {canEdit && (
                <button
                  onClick={() => setShowAddEncounter(!showAddEncounter)}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              )}
            </div>

            {/* Add Encounter Form */}
            {showAddEncounter && canEdit && (
              <div className="mb-3 p-3 bg-white/[0.02] rounded-lg flex flex-col sm:flex-row gap-2">
                <select
                  value={selectedEncounterId}
                  onChange={(e) => setSelectedEncounterId(e.target.value)}
                  className="form-input flex-1 text-sm"
                >
                  <option value="">Select encounter...</option>
                  {availableEncounters.map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
                <select
                  value={selectedEncounterStatus}
                  onChange={(e) => setSelectedEncounterStatus(e.target.value)}
                  className="form-input w-full sm:w-32 text-sm"
                >
                  {ENCOUNTER_STATUS_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <button
                  onClick={handleAddEncounter}
                  disabled={!selectedEncounterId || adding}
                  className="px-3 py-2 bg-red-500 text-white rounded text-sm font-medium hover:bg-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
                </button>
              </div>
            )}

            {/* Encounter List */}
            {sessionEncounters.length > 0 ? (
              <div className="space-y-1">
                {sessionEncounters.map(se => (
                  <div
                    key={se.id}
                    className="flex items-center gap-2 p-2 bg-white/[0.02] rounded group"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-[--text-secondary] truncate block">
                        {se.encounter?.name || 'Unknown'}
                      </span>
                    </div>
                    {canEdit ? (
                      <select
                        value={se.status_in_session}
                        onChange={(e) => handleUpdateEncounterStatus(se.id, e.target.value)}
                        className="text-xs px-2 py-1 rounded bg-[--bg-elevated] border border-white/[0.08] cursor-pointer focus:outline-none focus:border-[--arcane-purple]"
                        style={{ color: ENCOUNTER_STATUS_OPTIONS.find(o => o.value === se.status_in_session)?.color }}
                      >
                        {ENCOUNTER_STATUS_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    ) : (
                      <Badge size="sm" color={ENCOUNTER_STATUS_OPTIONS.find(o => o.value === se.status_in_session)?.color}>
                        {ENCOUNTER_STATUS_OPTIONS.find(o => o.value === se.status_in_session)?.label}
                      </Badge>
                    )}
                    {canEdit && (
                      <button
                        onClick={() => handleRemoveEncounter(se.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/[0.05] rounded text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[--text-tertiary]">No encounters linked</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

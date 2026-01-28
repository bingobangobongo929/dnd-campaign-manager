'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd'
import {
  Target,
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  X,
  MoreHorizontal,
  Trash2,
  Edit3,
  Columns,
  SlidersHorizontal,
  CheckCircle2,
  Circle,
  User,
  MapPin,
  Gift,
  Clock,
  Skull,
  Crown,
  Users,
  Sparkles,
  AlertCircle,
  Shuffle,
  GripVertical,
  Check,
  Coins,
  Swords,
  Calendar,
  Loader2,
} from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Button, Modal, EmptyState, Badge, Tooltip, AccessDeniedPage } from '@/components/ui'
import { GuidanceTip } from '@/components/guidance/GuidanceTip'
import { BackToTopButton } from '@/components/ui/back-to-top'
import { IntelligenceHint } from '@/components/intelligence/IntelligenceHint'
import { RollReveal } from '@/components/roll-reveal'
import { useSupabase, useUser, usePermissions } from '@/hooks'
import { cn } from '@/lib/utils'
import type { Campaign } from '@/types/database'

// Quest type icons
const QUEST_TYPE_ICONS: Record<string, any> = {
  main_quest: Crown,
  side_quest: Target,
  personal: User,
  faction: Users,
  plot_thread: Sparkles,
  rumor: AlertCircle,
}

// Quest type colors
const QUEST_TYPE_COLORS: Record<string, string> = {
  main_quest: '#EF4444',    // Red - important
  side_quest: '#8B5CF6',    // Purple
  personal: '#3B82F6',      // Blue
  faction: '#F59E0B',       // Amber
  plot_thread: '#EC4899',   // Pink
  rumor: '#6B7280',         // Gray
}

// Quest status colors
const QUEST_STATUS_COLORS: Record<string, string> = {
  available: '#6B7280',     // Gray
  active: '#8B5CF6',        // Purple
  completed: '#10B981',     // Green
  failed: '#EF4444',        // Red
  abandoned: '#F59E0B',     // Amber
}

const QUEST_TYPES = [
  { value: 'main_quest', label: 'Main Quest' },
  { value: 'side_quest', label: 'Side Quest' },
  { value: 'personal', label: 'Personal Quest' },
  { value: 'faction', label: 'Faction Quest' },
  { value: 'plot_thread', label: 'Plot Thread' },
  { value: 'rumor', label: 'Rumor' },
]

const QUEST_STATUSES = [
  { value: 'available', label: 'Available' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'abandoned', label: 'Abandoned' },
]

const QUEST_PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

// Helper functions to get formatted labels
const getQuestTypeLabel = (type: string) =>
  QUEST_TYPES.find(t => t.value === type)?.label || type.replace('_', ' ')

const getQuestStatusLabel = (status: string) =>
  QUEST_STATUSES.find(s => s.value === status)?.label || status

// Board settings types
type DetailLevel = 'compact' | 'standard' | 'detailed'
type ColumnKey = 'available' | 'active' | 'completed' | 'failed' | 'abandoned'

interface BoardSettings {
  visibleColumns: ColumnKey[]
  detailLevel: DetailLevel
}

const COLUMN_OPTIONS: { key: ColumnKey; label: string; color: string }[] = [
  { key: 'available', label: 'Available', color: QUEST_STATUS_COLORS.available },
  { key: 'active', label: 'Active', color: QUEST_STATUS_COLORS.active },
  { key: 'completed', label: 'Completed', color: QUEST_STATUS_COLORS.completed },
  { key: 'failed', label: 'Failed', color: QUEST_STATUS_COLORS.failed },
  { key: 'abandoned', label: 'Abandoned', color: QUEST_STATUS_COLORS.abandoned },
]

const DETAIL_OPTIONS: { value: DetailLevel; label: string; description: string }[] = [
  { value: 'compact', label: 'Compact', description: 'Name and type only' },
  { value: 'standard', label: 'Standard', description: 'Summary and quest giver' },
  { value: 'detailed', label: 'Detailed', description: 'Full info with objectives' },
]

const BOARD_PRESETS: { name: string; columns: ColumnKey[]; detail: DetailLevel }[] = [
  { name: 'Focus Mode', columns: ['available', 'active'], detail: 'compact' },
  { name: 'Full Overview', columns: ['available', 'active', 'completed', 'failed', 'abandoned'], detail: 'standard' },
  { name: 'DM Prep', columns: ['available', 'active', 'completed'], detail: 'detailed' },
  { name: 'Clean Slate', columns: ['available'], detail: 'standard' },
]

const DEFAULT_BOARD_SETTINGS: BoardSettings = {
  visibleColumns: ['available', 'active', 'completed'],
  detailLevel: 'standard',
}

interface Quest {
  id: string
  campaign_id: string | null
  oneshot_id: string | null
  name: string
  type: string
  description: string | null
  summary: string | null
  status: string
  priority: string
  quest_giver_id: string | null
  quest_giver_location_id: string | null
  objective_location_id: string | null
  rewards_description: string | null
  rewards_xp: number | null
  rewards_gold: number | null
  success_outcome: string | null
  failure_outcome: string | null
  time_limit: string | null
  discovered_session: number | null
  started_session: number | null
  completed_session: number | null
  visibility: string
  dm_notes: string | null
  secrets: string | null
  created_at: string
  updated_at: string
}

interface QuestObjective {
  id: string
  quest_id: string
  description: string
  is_optional: boolean
  is_completed: boolean
  display_order: number
  location_id: string | null
  target_character_id: string | null
  completed_at: string | null
}

interface Character {
  id: string
  name: string
  role: string | null
}

interface Location {
  id: string
  name: string
  type: string
}

interface Encounter {
  id: string
  name: string
  type: string
  status: string
  difficulty: string | null
  quest_id: string | null
}

interface SessionQuestHistory {
  id: string
  quest_id: string
  progress_type: string
  session: {
    id: string
    session_number: number
    date: string | null
    title: string | null
  }
}

// Trello-style board card (draggable)
function BoardCard({
  quest,
  objectives,
  questGiver,
  location,
  onClick,
  isDragging,
  detailLevel,
}: {
  quest: Quest
  objectives: QuestObjective[]
  questGiver?: Character
  location?: Location
  onClick: () => void
  isDragging: boolean
  detailLevel: DetailLevel
}) {
  const typeColor = QUEST_TYPE_COLORS[quest.type] || '#6B7280'
  const completedObjectives = objectives.filter(o => o.is_completed).length
  const totalObjectives = objectives.length
  const showSummary = detailLevel !== 'compact'
  const showDetails = detailLevel === 'detailed'

  return (
    <div
      className={cn(
        'p-3 rounded-lg cursor-pointer transition-all duration-150',
        'bg-[#1e1e2a] hover:bg-[#252532]',
        isDragging && 'shadow-xl shadow-black/50 rotate-2 scale-105'
      )}
      onClick={onClick}
    >
      {/* Type indicator bar */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className="h-1 w-8 rounded-full"
          style={{ backgroundColor: typeColor }}
        />
        <Badge size="sm" color={typeColor}>
          {getQuestTypeLabel(quest.type)}
        </Badge>
        {(quest.priority === 'urgent' || quest.priority === 'high') && (
          <Badge size="sm" color={quest.priority === 'urgent' ? '#EF4444' : '#F59E0B'}>
            {quest.priority === 'urgent' ? 'Urgent' : 'High'}
          </Badge>
        )}
      </div>

      {/* Title */}
      <p className="font-medium text-sm text-white mb-1">{quest.name}</p>

      {/* Summary preview (standard & detailed) */}
      {showSummary && quest.summary && (
        <p className="text-xs text-gray-400 line-clamp-2 mb-2">
          {quest.summary}
        </p>
      )}

      {/* Quest giver and location (standard & detailed) */}
      {showSummary && (questGiver || location) && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-2">
          {questGiver && (
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span className="truncate max-w-[100px]">{questGiver.name}</span>
            </span>
          )}
          {location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span className="truncate max-w-[100px]">{location.name}</span>
            </span>
          )}
        </div>
      )}

      {/* Objectives (detailed only) */}
      {showDetails && totalObjectives > 0 && (
        <div className="border-t border-white/10 pt-2 mt-2 space-y-1">
          {objectives.slice(0, 3).map(obj => (
            <div key={obj.id} className="flex items-start gap-1.5 text-xs">
              {obj.is_completed ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <Circle className="w-3 h-3 text-gray-500 flex-shrink-0 mt-0.5" />
              )}
              <span className={cn(
                'line-clamp-1',
                obj.is_completed ? 'text-gray-500 line-through' : 'text-gray-400'
              )}>
                {obj.description}
              </span>
            </div>
          ))}
          {totalObjectives > 3 && (
            <p className="text-xs text-gray-500">+{totalObjectives - 3} more</p>
          )}
        </div>
      )}

      {/* Rewards (detailed only) */}
      {showDetails && (quest.rewards_gold || quest.rewards_xp) && (
        <div className="flex items-center gap-3 text-xs text-gray-500 mt-2 pt-2 border-t border-white/10">
          {quest.rewards_gold && (
            <span className="flex items-center gap-1">
              <Coins className="w-3 h-3 text-amber-400" />
              {quest.rewards_gold} gold
            </span>
          )}
          {quest.rewards_xp && (
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-400" />
              {quest.rewards_xp} XP
            </span>
          )}
        </div>
      )}

      {/* Compact footer (objectives count only in compact/standard) */}
      {!showDetails && totalObjectives > 0 && (
        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {completedObjectives}/{totalObjectives}
          </span>
        </div>
      )}
    </div>
  )
}

// Trello-style board column with drag and drop
function BoardColumn({
  title,
  status,
  quests,
  objectives,
  characters,
  locations,
  onSelect,
  color,
  detailLevel,
}: {
  title: string
  status: string
  quests: Quest[]
  objectives: Record<string, QuestObjective[]>
  characters: Character[]
  locations: Location[]
  onSelect: (quest: Quest) => void
  color: string
  detailLevel: DetailLevel
}) {
  return (
    <div className="flex-1 min-w-[220px] max-w-[400px] flex flex-col bg-[#12121a] rounded-xl">
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/[0.05]">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: color }}
        />
        <h3 className="font-medium text-sm text-white flex-1">{title}</h3>
        <span className="text-xs text-gray-500 bg-white/[0.05] px-1.5 py-0.5 rounded-full">
          {quests.length}
        </span>
      </div>

      {/* Droppable area - no internal scroll, content expands naturally */}
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              'p-2 space-y-2 min-h-[80px]',
              snapshot.isDraggingOver && 'bg-[--arcane-purple]/5'
            )}
          >
            {quests.map((quest, index) => {
              const questGiver = characters.find(c => c.id === quest.quest_giver_id)
              const location = locations.find(l => l.id === quest.objective_location_id)
              return (
                <Draggable key={quest.id} draggableId={quest.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                    >
                      <BoardCard
                        quest={quest}
                        objectives={objectives[quest.id] || []}
                        questGiver={questGiver}
                        location={location}
                        onClick={() => onSelect(quest)}
                        isDragging={snapshot.isDragging}
                        detailLevel={detailLevel}
                      />
                    </div>
                  )}
                </Draggable>
              )
            })}
            {provided.placeholder}
            {quests.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Target className="w-5 h-5 text-gray-600 mb-2" />
                <span className="text-xs text-gray-600">Drop quests here</span>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  )
}

// Trello-style Quest View Modal
function QuestViewModal({
  quest,
  objectives,
  characters,
  locations,
  encounters,
  sessionHistory,
  onClose,
  onEdit,
  onDelete,
  onToggleObjective,
  canEdit,
}: {
  quest: Quest
  objectives: QuestObjective[]
  characters: Character[]
  locations: Location[]
  encounters: Encounter[]
  sessionHistory: SessionQuestHistory[]
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onToggleObjective: (objectiveId: string, completed: boolean) => void
  canEdit: boolean
}) {
  const Icon = QUEST_TYPE_ICONS[quest.type] || Target
  const typeColor = QUEST_TYPE_COLORS[quest.type] || '#6B7280'
  const statusColor = QUEST_STATUS_COLORS[quest.status] || '#6B7280'

  const questGiver = characters.find(c => c.id === quest.quest_giver_id)
  const questGiverLocation = locations.find(l => l.id === quest.quest_giver_location_id)
  const objectiveLocation = locations.find(l => l.id === quest.objective_location_id)

  // Find encounters for this quest
  const questEncounters = encounters.filter(e => e.quest_id === quest.id)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70" />

      {/* Modal - centered with max height */}
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#1a1a24] rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Color bar at top */}
        <div
          className="h-2 rounded-t-xl"
          style={{ backgroundColor: typeColor }}
        />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-start gap-4 pr-10">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${typeColor}20` }}
            >
              <Icon className="w-6 h-6" style={{ color: typeColor }} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-white mb-2">{quest.name}</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge size="sm" color={typeColor}>
                  {getQuestTypeLabel(quest.type)}
                </Badge>
                <Badge size="sm" color={statusColor}>
                  {getQuestStatusLabel(quest.status)}
                </Badge>
                {quest.priority === 'urgent' && (
                  <Badge size="sm" color="#EF4444">Urgent</Badge>
                )}
                {quest.priority === 'high' && (
                  <Badge size="sm" color="#F59E0B">High Priority</Badge>
                )}
              </div>
            </div>
          </div>

          {quest.summary && (
            <p className="mt-4 text-gray-400">{quest.summary}</p>
          )}
        </div>

        {/* Content */}
        <div className="px-6 pb-6 space-y-6">
          {/* Description */}
          {quest.description && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Description
              </h4>
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap bg-white/[0.02] rounded-lg p-3">
                {quest.description}
              </p>
            </div>
          )}

          {/* Two column layout for meta info */}
          <div className="grid grid-cols-2 gap-4">
            {/* Quest Giver */}
            {questGiver && (
              <div className="bg-white/[0.02] rounded-lg p-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Quest Giver
                </h4>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-300">{questGiver.name}</span>
                </div>
                {questGiverLocation && (
                  <p className="text-xs text-gray-500 mt-1 ml-6">
                    at {questGiverLocation.name}
                  </p>
                )}
              </div>
            )}

            {/* Location */}
            {objectiveLocation && (
              <div className="bg-white/[0.02] rounded-lg p-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Location
                </h4>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-300">{objectiveLocation.name}</span>
                </div>
              </div>
            )}
          </div>

          {/* Objectives */}
          {objectives.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Objectives ({objectives.filter(o => o.is_completed).length}/{objectives.length})
              </h4>
              <div className="bg-white/[0.02] rounded-lg p-1">
                {objectives.map(objective => (
                  <button
                    key={objective.id}
                    onClick={() => canEdit && onToggleObjective(objective.id, !objective.is_completed)}
                    disabled={!canEdit}
                    className={cn(
                      'w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors',
                      canEdit ? 'hover:bg-white/5 cursor-pointer' : 'cursor-default',
                      objective.is_completed ? 'opacity-60' : ''
                    )}
                  >
                    {objective.is_completed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                    )}
                    <span className={cn(
                      'text-sm',
                      objective.is_completed ? 'text-gray-500 line-through' : 'text-gray-300'
                    )}>
                      {objective.description}
                      {objective.is_optional && (
                        <span className="ml-2 text-xs text-gray-600">(Optional)</span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Rewards */}
          {(quest.rewards_description || quest.rewards_xp || quest.rewards_gold) && (
            <div className="bg-amber-500/10 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Gift className="w-4 h-4" />
                Rewards
              </h4>
              {quest.rewards_description && (
                <p className="text-sm text-amber-300/80 mb-2">{quest.rewards_description}</p>
              )}
              <div className="flex gap-4 text-sm">
                {quest.rewards_xp && (
                  <span className="text-amber-400 font-medium">{quest.rewards_xp} XP</span>
                )}
                {quest.rewards_gold && (
                  <span className="text-yellow-400 font-medium">{quest.rewards_gold} gold</span>
                )}
              </div>
            </div>
          )}

          {/* Time Limit */}
          {quest.time_limit && (
            <div className="bg-red-500/10 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Time Limit
              </h4>
              <p className="text-sm text-red-300/80">{quest.time_limit}</p>
            </div>
          )}

          {/* Outcomes */}
          {(quest.success_outcome || quest.failure_outcome) && (
            <div className="grid grid-cols-2 gap-3">
              {quest.success_outcome && (
                <div className="bg-emerald-500/10 rounded-lg p-3">
                  <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
                    On Success
                  </h4>
                  <p className="text-sm text-emerald-300/80">{quest.success_outcome}</p>
                </div>
              )}
              {quest.failure_outcome && (
                <div className="bg-red-500/10 rounded-lg p-3">
                  <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1">
                    On Failure
                  </h4>
                  <p className="text-sm text-red-300/80">{quest.failure_outcome}</p>
                </div>
              )}
            </div>
          )}

          {/* Encounters for this Quest */}
          {questEncounters.length > 0 && (
            <div className="bg-red-500/10 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Swords className="w-4 h-4" />
                Encounters ({questEncounters.length})
              </h4>
              <div className="space-y-2">
                {questEncounters.map(encounter => (
                  <div
                    key={encounter.id}
                    className="flex items-center gap-2 p-2 bg-white/[0.02] rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-gray-300 truncate block">{encounter.name}</span>
                      <span className="text-xs text-gray-500">
                        {encounter.type.replace('_', ' ')}
                        {encounter.difficulty && ` • ${encounter.difficulty}`}
                      </span>
                    </div>
                    <Badge size="sm" color={encounter.status === 'prepared' ? '#EF4444' : '#6B7280'}>
                      {encounter.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Session History */}
          {sessionHistory.length > 0 && (
            <div className="bg-[--arcane-purple]/10 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-[--arcane-purple] uppercase tracking-wider mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Session History ({sessionHistory.length})
              </h4>
              <div className="space-y-2">
                {sessionHistory.map(sq => {
                  const progressColors: Record<string, string> = {
                    mentioned: '#6B7280',
                    started: '#3B82F6',
                    progressed: '#8B5CF6',
                    completed: '#10B981',
                    failed: '#EF4444',
                  }
                  return (
                    <div
                      key={sq.id}
                      className="flex items-center gap-2 p-2 bg-white/[0.02] rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-gray-300 truncate block">
                          Session {sq.session.session_number}
                          {sq.session.title && `: ${sq.session.title}`}
                        </span>
                        {sq.session.date && (
                          <span className="text-xs text-gray-500">
                            {new Date(sq.session.date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <Badge size="sm" color={progressColors[sq.progress_type] || '#6B7280'}>
                        {sq.progress_type}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* DM Notes */}
          {quest.dm_notes && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                DM Notes
              </h4>
              <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap bg-white/[0.02] rounded-lg p-3">
                {quest.dm_notes}
              </p>
            </div>
          )}

          {/* Secrets */}
          {quest.secrets && (
            <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
              <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Skull className="w-4 h-4" />
                Secrets (DM Only)
              </h4>
              <p className="text-sm text-red-300/80 leading-relaxed whitespace-pre-wrap">
                {quest.secrets}
              </p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {canEdit && (
          <div className="px-6 py-4 border-t border-white/[0.05] flex justify-between">
            <Button
              variant="ghost"
              onClick={onDelete}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
            <Button onClick={onEdit}>
              <Edit3 className="w-4 h-4 mr-2" />
              Edit Quest
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// Expandable section component for the quest form
function FormSection({
  title,
  isOpen,
  onToggle,
  children,
  preview,
  icon: Icon,
}: {
  title: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
  preview?: string
  icon?: any
}) {
  return (
    <div className="border border-white/[0.06] rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        {Icon && <Icon className="w-4 h-4 text-gray-500" />}
        <span className="flex-1 text-sm font-medium text-gray-300">{title}</span>
        {!isOpen && preview && (
          <span className="text-xs text-gray-500 truncate max-w-[150px]">{preview}</span>
        )}
        <ChevronDown className={cn(
          "w-4 h-4 text-gray-500 transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-1 border-t border-white/[0.06]">
          {children}
        </div>
      )}
    </div>
  )
}

// Add/Edit quest modal with progressive disclosure
function QuestFormModal({
  isOpen,
  onClose,
  onSave,
  quest,
  objectives: existingObjectives,
  characters,
  locations,
  saving,
  initialName,
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<Quest>, objectives: Partial<QuestObjective>[]) => void
  quest?: Quest | null
  objectives?: QuestObjective[]
  characters: Character[]
  locations: Location[]
  saving: boolean
  initialName?: string | null
}) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'side_quest',
    status: 'available',
    priority: 'normal',
    summary: '',
    description: '',
    quest_giver_id: '',
    quest_giver_location_id: '',
    objective_location_id: '',
    rewards_description: '',
    rewards_xp: '',
    rewards_gold: '',
    time_limit: '',
    success_outcome: '',
    failure_outcome: '',
    dm_notes: '',
    secrets: '',
  })

  const [objectives, setObjectives] = useState<{ description: string; is_optional: boolean }[]>([])

  // Track which sections are open
  const [openSections, setOpenSections] = useState<Set<string>>(new Set())

  const toggleSection = (section: string) => {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }

  useEffect(() => {
    if (quest) {
      setFormData({
        name: quest.name,
        type: quest.type,
        status: quest.status,
        priority: quest.priority,
        summary: quest.summary || '',
        description: quest.description || '',
        quest_giver_id: quest.quest_giver_id || '',
        quest_giver_location_id: quest.quest_giver_location_id || '',
        objective_location_id: quest.objective_location_id || '',
        rewards_description: quest.rewards_description || '',
        rewards_xp: quest.rewards_xp?.toString() || '',
        rewards_gold: quest.rewards_gold?.toString() || '',
        time_limit: quest.time_limit || '',
        success_outcome: quest.success_outcome || '',
        failure_outcome: quest.failure_outcome || '',
        dm_notes: quest.dm_notes || '',
        secrets: quest.secrets || '',
      })
      setObjectives(existingObjectives?.map(o => ({
        description: o.description,
        is_optional: o.is_optional,
      })) || [])
      // When editing, open sections that have content
      const sectionsWithContent = new Set<string>()
      if (quest.description) sectionsWithContent.add('description')
      if (quest.quest_giver_id || quest.objective_location_id) sectionsWithContent.add('people')
      if (existingObjectives?.length) sectionsWithContent.add('objectives')
      if (quest.rewards_description || quest.rewards_xp || quest.rewards_gold) sectionsWithContent.add('rewards')
      if (quest.time_limit || quest.success_outcome || quest.failure_outcome) sectionsWithContent.add('outcomes')
      if (quest.dm_notes || quest.secrets) sectionsWithContent.add('notes')
      setOpenSections(sectionsWithContent)
    } else {
      setFormData({
        name: initialName || '',
        type: 'side_quest',
        status: 'available',
        priority: 'normal',
        summary: '',
        description: '',
        quest_giver_id: '',
        quest_giver_location_id: '',
        objective_location_id: '',
        rewards_description: '',
        rewards_xp: '',
        rewards_gold: '',
        time_limit: '',
        success_outcome: '',
        failure_outcome: '',
        dm_notes: '',
        secrets: '',
      })
      setObjectives([])
      setOpenSections(new Set())
    }
  }, [quest, existingObjectives, isOpen, initialName])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(
      {
        name: formData.name,
        type: formData.type,
        status: formData.status,
        priority: formData.priority,
        summary: formData.summary || null,
        description: formData.description || null,
        quest_giver_id: formData.quest_giver_id || null,
        quest_giver_location_id: formData.quest_giver_location_id || null,
        objective_location_id: formData.objective_location_id || null,
        rewards_description: formData.rewards_description || null,
        rewards_xp: formData.rewards_xp ? parseInt(formData.rewards_xp) : null,
        rewards_gold: formData.rewards_gold ? parseInt(formData.rewards_gold) : null,
        time_limit: formData.time_limit || null,
        success_outcome: formData.success_outcome || null,
        failure_outcome: formData.failure_outcome || null,
        dm_notes: formData.dm_notes || null,
        secrets: formData.secrets || null,
      },
      objectives.filter(o => o.description.trim()).map((o, idx) => ({
        description: o.description,
        is_optional: o.is_optional,
        display_order: idx,
      }))
    )
  }

  const addObjective = () => {
    setObjectives([...objectives, { description: '', is_optional: false }])
  }

  const removeObjective = (index: number) => {
    setObjectives(objectives.filter((_, i) => i !== index))
  }

  const updateObjective = (index: number, field: string, value: any) => {
    setObjectives(objectives.map((o, i) => i === index ? { ...o, [field]: value } : o))
  }

  // All NPCs (characters that aren't PCs)
  const npcs = characters.filter(c => !c.role || c.role !== 'pc')

  // Generate preview text for sections
  const getQuestGiverPreview = () => {
    const giver = characters.find(c => c.id === formData.quest_giver_id)
    const loc = locations.find(l => l.id === formData.objective_location_id)
    if (giver && loc) return `${giver.name} → ${loc.name}`
    if (giver) return giver.name
    if (loc) return `→ ${loc.name}`
    return ''
  }

  const getObjectivesPreview = () => {
    if (objectives.length === 0) return ''
    return `${objectives.length} objective${objectives.length === 1 ? '' : 's'}`
  }

  const getRewardsPreview = () => {
    const parts = []
    if (formData.rewards_xp) parts.push(`${formData.rewards_xp} XP`)
    if (formData.rewards_gold) parts.push(`${formData.rewards_gold} gold`)
    return parts.join(', ')
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={quest ? 'Edit Quest' : 'Add Quest'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-4" style={{ maxHeight: 'calc(70vh - 120px)' }}>
          {/* Essential fields - always visible */}
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Quest Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="form-input"
                placeholder='e.g., "Stop the Cult", "Find the Lost Sword"'
                required
                autoFocus
              />
            </div>

            {/* Type and Status row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="form-input"
                >
                  {QUEST_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="form-input"
                >
                  {QUEST_STATUSES.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Summary - simple one-liner */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Summary <span className="text-xs text-gray-500 font-normal">(shown in lists)</span>
              </label>
              <input
                type="text"
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                className="form-input"
                placeholder='e.g., "The mayor needs someone to clear out the old mine"'
              />
            </div>
          </div>

          {/* Expandable sections */}
          <div className="space-y-2 pt-2">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium px-1">
              Additional Details (click to expand)
            </p>

            {/* Description */}
            <FormSection
              title="Full Description"
              isOpen={openSections.has('description')}
              onToggle={() => toggleSection('description')}
              preview={formData.description ? 'Has content' : ''}
            >
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="form-input min-h-[100px] mt-2"
                placeholder="The full backstory and details about this quest. What happened? What does the party need to know?"
              />
            </FormSection>

            {/* Quest Giver & Location */}
            <FormSection
              title="Quest Giver & Location"
              icon={User}
              isOpen={openSections.has('people')}
              onToggle={() => toggleSection('people')}
              preview={getQuestGiverPreview()}
            >
              <div className="space-y-3 mt-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Who gives this quest?</label>
                  <select
                    value={formData.quest_giver_id}
                    onChange={(e) => setFormData({ ...formData, quest_giver_id: e.target.value })}
                    className="form-input"
                  >
                    <option value="">No specific NPC</option>
                    {npcs.map(npc => (
                      <option key={npc.id} value={npc.id}>
                        {npc.name}
                      </option>
                    ))}
                  </select>
                  {npcs.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1 italic">
                      No NPCs in this campaign yet. Add characters on the Canvas page.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Where does the quest take place?</label>
                  <select
                    value={formData.objective_location_id}
                    onChange={(e) => setFormData({ ...formData, objective_location_id: e.target.value })}
                    className="form-input"
                  >
                    <option value="">No specific location</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.type})
                      </option>
                    ))}
                  </select>
                  {locations.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1 italic">
                      No locations yet. Add them on the Locations page.
                    </p>
                  )}
                </div>
              </div>
            </FormSection>

            {/* Objectives */}
            <FormSection
              title="Objectives"
              icon={CheckCircle2}
              isOpen={openSections.has('objectives')}
              onToggle={() => toggleSection('objectives')}
              preview={getObjectivesPreview()}
            >
              <div className="space-y-2 mt-2">
                {objectives.map((obj, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={obj.description}
                      onChange={(e) => updateObjective(idx, 'description', e.target.value)}
                      className="form-input flex-1 text-sm"
                      placeholder="e.g., Find the hidden entrance"
                    />
                    <label className="flex items-center gap-1 text-xs text-gray-400 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={obj.is_optional}
                        onChange={(e) => updateObjective(idx, 'is_optional', e.target.checked)}
                        className="form-checkbox"
                      />
                      Optional
                    </label>
                    <button
                      type="button"
                      onClick={() => removeObjective(idx)}
                      className="p-1 text-gray-500 hover:text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addObjective}
                  className="text-sm text-[--arcane-purple] hover:text-[--arcane-purple-light] flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add Objective
                </button>
              </div>
            </FormSection>

            {/* Rewards */}
            <FormSection
              title="Rewards"
              icon={Gift}
              isOpen={openSections.has('rewards')}
              onToggle={() => toggleSection('rewards')}
              preview={getRewardsPreview()}
            >
              <div className="space-y-3 mt-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">XP</label>
                    <input
                      type="number"
                      value={formData.rewards_xp}
                      onChange={(e) => setFormData({ ...formData, rewards_xp: e.target.value })}
                      className="form-input"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Gold</label>
                    <input
                      type="number"
                      value={formData.rewards_gold}
                      onChange={(e) => setFormData({ ...formData, rewards_gold: e.target.value })}
                      className="form-input"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Other rewards</label>
                  <input
                    type="text"
                    value={formData.rewards_description}
                    onChange={(e) => setFormData({ ...formData, rewards_description: e.target.value })}
                    className="form-input"
                    placeholder="e.g., Magic sword, alliance with the guild"
                  />
                </div>
              </div>
            </FormSection>

            {/* Time & Outcomes */}
            <FormSection
              title="Time Limit & Outcomes"
              icon={Clock}
              isOpen={openSections.has('outcomes')}
              onToggle={() => toggleSection('outcomes')}
              preview={formData.time_limit || ''}
            >
              <div className="space-y-3 mt-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Time limit</label>
                  <input
                    type="text"
                    value={formData.time_limit}
                    onChange={(e) => setFormData({ ...formData, time_limit: e.target.value })}
                    className="form-input"
                    placeholder="e.g., Before the full moon, 3 days"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-emerald-400 mb-1">On success</label>
                    <textarea
                      value={formData.success_outcome}
                      onChange={(e) => setFormData({ ...formData, success_outcome: e.target.value })}
                      className="form-input min-h-[60px] text-sm"
                      placeholder="What happens if they succeed?"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-red-400 mb-1">On failure</label>
                    <textarea
                      value={formData.failure_outcome}
                      onChange={(e) => setFormData({ ...formData, failure_outcome: e.target.value })}
                      className="form-input min-h-[60px] text-sm"
                      placeholder="What if they fail or ignore it?"
                    />
                  </div>
                </div>
              </div>
            </FormSection>

            {/* DM Notes & Secrets */}
            <FormSection
              title="DM Notes & Secrets"
              icon={Skull}
              isOpen={openSections.has('notes')}
              onToggle={() => toggleSection('notes')}
              preview={formData.secrets ? 'Has secrets' : formData.dm_notes ? 'Has notes' : ''}
            >
              <div className="space-y-3 mt-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">DM Notes</label>
                  <textarea
                    value={formData.dm_notes}
                    onChange={(e) => setFormData({ ...formData, dm_notes: e.target.value })}
                    className="form-input min-h-[60px] text-sm"
                    placeholder="Reminders for running this quest..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-red-400 mb-1 flex items-center gap-1">
                    <Skull className="w-3 h-3" />
                    Secrets (players won't see this)
                  </label>
                  <textarea
                    value={formData.secrets}
                    onChange={(e) => setFormData({ ...formData, secrets: e.target.value })}
                    className="form-input min-h-[60px] text-sm border-red-500/20 focus:border-red-500/40"
                    placeholder="The real truth, hidden twists, villain's true motives..."
                  />
                </div>
              </div>
            </FormSection>
          </div>
        </div>

        {/* Fixed footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-[--border] bg-[--bg-surface]">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" loading={saving} disabled={!formData.name.trim()}>
            {quest ? 'Save Changes' : 'Add Quest'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function QuestsPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = useSupabase()
  const { user } = useUser()

  const campaignId = params.id as string

  // Permissions
  const { can, loading: permissionsLoading, isMember, isOwner, isDm } = usePermissions(campaignId)

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [quests, setQuests] = useState<Quest[]>([])
  const [objectives, setObjectives] = useState<Record<string, QuestObjective[]>>({})
  const [characters, setCharacters] = useState<Character[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [encounters, setEncounters] = useState<Encounter[]>([])
  const [questSessions, setQuestSessions] = useState<SessionQuestHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Board settings (columns and detail level)
  const [boardSettings, setBoardSettings] = useState<BoardSettings>(() => {
    // Try to load from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`quest-board-settings-${campaignId}`)
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch {
          return DEFAULT_BOARD_SETTINGS
        }
      }
    }
    return DEFAULT_BOARD_SETTINGS
  })
  const [showColumnsDropdown, setShowColumnsDropdown] = useState(false)
  const [showDetailDropdown, setShowDetailDropdown] = useState(false)
  const columnsDropdownRef = useRef<HTMLDivElement>(null)
  const detailDropdownRef = useRef<HTMLDivElement>(null)

  // Save board settings when they change
  useEffect(() => {
    if (typeof window !== 'undefined' && campaignId) {
      localStorage.setItem(`quest-board-settings-${campaignId}`, JSON.stringify(boardSettings))
    }
  }, [boardSettings, campaignId])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (columnsDropdownRef.current && !columnsDropdownRef.current.contains(target)) {
        setShowColumnsDropdown(false)
      }
      if (detailDropdownRef.current && !detailDropdownRef.current.contains(target)) {
        setShowDetailDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Selection and modals
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null)
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showRollReveal, setShowRollReveal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Handle create from URL params (e.g., from Random Tables)
  const searchParams = useSearchParams()
  const [initialQuestName, setInitialQuestName] = useState<string | null>(null)

  useEffect(() => {
    const shouldCreate = searchParams.get('create') === 'true'
    const name = searchParams.get('name')
    if (shouldCreate) {
      setInitialQuestName(name)
      setShowAddModal(true)
      // Clear the URL params without navigation
      router.replace(`/campaigns/${campaignId}/quests`, { scroll: false })
    }
  }, [searchParams, campaignId, router])

  useEffect(() => {
    if (user && campaignId) {
      loadData()
    }
  }, [user, campaignId])

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

    // Load quests
    const { data: questsData } = await supabase
      .from('quests')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })

    setQuests(questsData || [])

    // Load all objectives
    if (questsData && questsData.length > 0) {
      const { data: objectivesData } = await supabase
        .from('quest_objectives')
        .select('*')
        .in('quest_id', questsData.map(q => q.id))
        .order('display_order')

      // Group by quest_id
      const grouped: Record<string, QuestObjective[]> = {}
      objectivesData?.forEach(obj => {
        if (!grouped[obj.quest_id]) {
          grouped[obj.quest_id] = []
        }
        grouped[obj.quest_id].push(obj)
      })
      setObjectives(grouped)
    }

    // Load characters (for quest giver dropdown)
    const { data: charactersData } = await supabase
      .from('characters')
      .select('id, name, role')
      .eq('campaign_id', campaignId)
      .order('name')

    setCharacters(charactersData || [])

    // Load locations
    const { data: locationsData } = await supabase
      .from('locations')
      .select('id, name, type')
      .eq('campaign_id', campaignId)
      .order('name')

    setLocations(locationsData || [])

    // Load encounters (for "Encounters for this Quest" display)
    const { data: encountersData } = await supabase
      .from('encounters')
      .select('id, name, type, status, difficulty, quest_id')
      .eq('campaign_id', campaignId)
      .not('quest_id', 'is', null)
      .order('name')

    setEncounters(encountersData || [])

    // Load session quests for Session History
    const { data: sessionQuestsData } = await supabase
      .from('session_quests')
      .select(`
        id,
        quest_id,
        progress_type,
        session:sessions(id, session_number, date, title)
      `)
      .in('quest_id', quests?.map(q => q.id) || [])
      .order('created_at', { ascending: false })

    // Flatten the session relationship
    setQuestSessions(sessionQuestsData?.map(sq => ({
      ...sq,
      session: Array.isArray(sq.session) ? sq.session[0] : sq.session
    })).filter(sq => sq.session) as SessionQuestHistory[] || [])

    setLoading(false)
    setHasLoadedOnce(true)
  }

  // Filter quests
  const filteredQuests = quests.filter(quest => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        quest.name.toLowerCase().includes(query) ||
        quest.description?.toLowerCase().includes(query) ||
        quest.summary?.toLowerCase().includes(query)
      if (!matchesSearch) return false
    }

    if (typeFilter !== 'all' && quest.type !== typeFilter) {
      return false
    }

    if (statusFilter !== 'all' && quest.status !== statusFilter) {
      return false
    }

    return true
  })

  // Group quests by status for board view
  const questsByStatus = {
    available: filteredQuests.filter(q => q.status === 'available'),
    active: filteredQuests.filter(q => q.status === 'active'),
    completed: filteredQuests.filter(q => q.status === 'completed'),
    failed: filteredQuests.filter(q => q.status === 'failed'),
    abandoned: filteredQuests.filter(q => q.status === 'abandoned'),
  }

  // Roll random quest
  const handleRollRandom = () => {
    const availableQuests = quests.filter(q => q.status === 'available')
    if (availableQuests.length === 0) {
      alert('No available quests to roll from!')
      return
    }
    setShowRollReveal(true)
  }

  // Handle roll result acceptance
  const handleRollResult = (quest: Quest) => {
    setShowRollReveal(false)
    setSelectedQuest(quest)
  }

  // Save quest
  const handleSave = async (data: Partial<Quest>, newObjectives: Partial<QuestObjective>[]) => {
    setSaving(true)
    const wasEditing = editingQuest
    const editedQuestId = editingQuest?.id

    try {
      if (editingQuest) {
        // Update quest
        const { error } = await supabase
          .from('quests')
          .update(data)
          .eq('id', editingQuest.id)

        if (error) throw error

        // Delete old objectives and insert new ones
        await supabase
          .from('quest_objectives')
          .delete()
          .eq('quest_id', editingQuest.id)

        if (newObjectives.length > 0) {
          await supabase
            .from('quest_objectives')
            .insert(newObjectives.map(o => ({ ...o, quest_id: editingQuest.id })))
        }
      } else {
        // Insert quest
        const { data: newQuest, error } = await supabase
          .from('quests')
          .insert({
            ...data,
            campaign_id: campaignId,
          })
          .select('id')
          .single()

        if (error) throw error

        // Insert objectives
        if (newObjectives.length > 0 && newQuest) {
          await supabase
            .from('quest_objectives')
            .insert(newObjectives.map(o => ({ ...o, quest_id: newQuest.id })))
        }
      }

      await loadData()

      // If we were editing, refresh the selected quest with updated data
      if (wasEditing && editedQuestId) {
        const { data: updatedQuest } = await supabase
          .from('quests')
          .select('*')
          .eq('id', editedQuestId)
          .single()

        if (updatedQuest) {
          setSelectedQuest(updatedQuest)
        }
      }

      setShowAddModal(false)
      setEditingQuest(null)
    } catch (err) {
      console.error('Failed to save quest:', err)
    } finally {
      setSaving(false)
    }
  }

  // Delete quest
  const handleDelete = async () => {
    if (!selectedQuest) return
    setDeleting(true)
    try {
      const { error } = await supabase
        .from('quests')
        .delete()
        .eq('id', selectedQuest.id)

      if (error) throw error

      await loadData()
      setSelectedQuest(null)
      setShowDeleteModal(false)
    } catch (err) {
      console.error('Failed to delete quest:', err)
    } finally {
      setDeleting(false)
    }
  }

  // Toggle objective completion
  const handleToggleObjective = async (objectiveId: string, completed: boolean) => {
    try {
      await supabase
        .from('quest_objectives')
        .update({
          is_completed: completed,
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq('id', objectiveId)

      await loadData()
    } catch (err) {
      console.error('Failed to toggle objective:', err)
    }
  }

  // Handle drag end - update quest status
  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result

    // Dropped outside a droppable
    if (!destination) return

    // Dropped in same position
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return
    }

    // Get the new status from the destination droppable
    const newStatus = destination.droppableId

    // Optimistically update local state
    setQuests(prevQuests =>
      prevQuests.map(q =>
        q.id === draggableId ? { ...q, status: newStatus } : q
      )
    )

    // Update in database
    try {
      const { error } = await supabase
        .from('quests')
        .update({ status: newStatus })
        .eq('id', draggableId)

      if (error) {
        console.error('Failed to update quest status:', error)
        // Revert on error
        await loadData()
      }
    } catch (err) {
      console.error('Failed to update quest status:', err)
      await loadData()
    }
  }

  // Page actions for top bar
  const pageActions = (
    <div className="flex items-center gap-2">
      {quests.filter(q => q.status === 'available').length > 0 && (
        <Tooltip content="Roll random available quest">
          <Button
            variant="ghost"
            onClick={handleRollRandom}
            className="flex items-center gap-2"
          >
            <Shuffle className="w-4 h-4" />
            <span className="hidden sm:inline">Roll</span>
          </Button>
        </Tooltip>
      )}
      <Button
        onClick={() => setShowAddModal(true)}
        className="flex items-center gap-2"
      >
        <Plus className="w-4 h-4" />
        <span className="hidden sm:inline">Add Quest</span>
      </Button>
    </div>
  )

  // Loading state
  if (loading || permissionsLoading) {
    return (
      <AppLayout campaignId={campaignId}>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-10 h-10 animate-spin text-[--arcane-purple]" />
        </div>
      </AppLayout>
    )
  }

  // Permission check
  if (!isMember) {
    return (
      <AppLayout campaignId={campaignId}>
        <AccessDeniedPage
          campaignId={campaignId}
          message="You don't have permission to view quests for this campaign."
        />
      </AppLayout>
    )
  }

  return (
    <AppLayout campaignId={campaignId} topBarActions={pageActions}>
      <div className="flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-[--border] space-y-4">
            <GuidanceTip
              tipId="quests_intro"
              title="Track Your Story"
              description="Quests help you organize plot threads, objectives, and what the party is pursuing. Use the board view to see status at a glance."
              variant="banner"
              showOnce
            />

            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search toggle */}
              <div className="flex-1 min-w-[140px] max-w-xs">
                {isSearchOpen ? (
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="text"
                        placeholder="Search quests..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                        className="w-full pl-9 pr-3 py-2 bg-[--bg-surface] border border-[--border] rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[--arcane-purple]/50"
                      />
                    </div>
                    <button
                      onClick={() => {
                        setIsSearchOpen(false)
                        setSearchQuery('')
                      }}
                      className="p-2 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsSearchOpen(true)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors rounded-lg hover:bg-white/[0.03]"
                  >
                    <Search className="w-4 h-4" />
                    <span>Search</span>
                  </button>
                )}
              </div>

              {/* Type filter - compact */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="form-input w-full sm:w-28"
              >
                <option value="all">All Types</option>
                {QUEST_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>

              {/* Columns dropdown */}
              <div className="relative" ref={columnsDropdownRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowColumnsDropdown(!showColumnsDropdown)
                    setShowDetailDropdown(false)
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[--border] text-sm text-gray-300 hover:bg-white/5 transition-colors"
                >
                  <Columns className="w-4 h-4" />
                  <span className="hidden sm:inline">Columns</span>
                  <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded">
                    {boardSettings.visibleColumns.length}
                  </span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {showColumnsDropdown && (
                  <div
                    className="absolute right-0 top-full mt-1 w-56 bg-[#1a1a24] border border-white/10 rounded-xl shadow-xl z-50 py-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-3 py-1 text-xs text-gray-500 uppercase tracking-wider">
                      Visible Columns
                    </div>
                    {COLUMN_OPTIONS.map(col => {
                      const isVisible = boardSettings.visibleColumns.includes(col.key)
                      return (
                        <button
                          key={col.key}
                          onClick={() => {
                            const newColumns = isVisible
                              ? boardSettings.visibleColumns.filter(c => c !== col.key)
                              : [...boardSettings.visibleColumns, col.key]
                            if (newColumns.length > 0) {
                              setBoardSettings(prev => ({ ...prev, visibleColumns: newColumns }))
                            }
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-white/5 transition-colors"
                        >
                          <div className={cn(
                            'w-4 h-4 rounded border flex items-center justify-center',
                            isVisible ? 'bg-[--arcane-purple] border-[--arcane-purple]' : 'border-gray-600'
                          )}>
                            {isVisible && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                          <span className="text-gray-300">{col.label}</span>
                        </button>
                      )
                    })}
                    <div className="border-t border-white/10 mt-2 pt-2">
                      <div className="px-3 py-1 text-xs text-gray-500 uppercase tracking-wider">
                        Quick Presets
                      </div>
                      {BOARD_PRESETS.map(preset => (
                        <button
                          key={preset.name}
                          onClick={() => {
                            setBoardSettings({ visibleColumns: preset.columns, detailLevel: preset.detail })
                            setShowColumnsDropdown(false)
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <span>{preset.name}</span>
                          <span className="text-xs text-gray-600">({preset.columns.length} cols, {preset.detail})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Detail dropdown */}
              <div className="relative" ref={detailDropdownRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowDetailDropdown(!showDetailDropdown)
                    setShowColumnsDropdown(false)
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[--border] text-sm text-gray-300 hover:bg-white/5 transition-colors"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span className="hidden sm:inline">Detail</span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {showDetailDropdown && (
                  <div
                    className="absolute right-0 top-full mt-1 w-52 bg-[#1a1a24] border border-white/10 rounded-xl shadow-xl z-50 py-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-3 py-1 text-xs text-gray-500 uppercase tracking-wider">
                      Card Detail Level
                    </div>
                    {DETAIL_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setBoardSettings(prev => ({ ...prev, detailLevel: opt.value }))
                          setShowDetailDropdown(false)
                        }}
                        className={cn(
                          'w-full flex flex-col items-start px-3 py-2 text-sm text-left hover:bg-white/5 transition-colors',
                          boardSettings.detailLevel === opt.value && 'bg-[--arcane-purple]/10'
                        )}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <div className={cn(
                            'w-4 h-4 rounded-full border flex items-center justify-center',
                            boardSettings.detailLevel === opt.value
                              ? 'bg-[--arcane-purple] border-[--arcane-purple]'
                              : 'border-gray-600'
                          )}>
                            {boardSettings.detailLevel === opt.value && (
                              <div className="w-1.5 h-1.5 bg-white rounded-full" />
                            )}
                          </div>
                          <span className="text-gray-300">{opt.label}</span>
                        </div>
                        <p className="text-xs text-gray-500 ml-6">{opt.description}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

        {/* Quest list/board */}
        <div className="p-4">
          {quests.length === 0 ? (
            <EmptyState
              icon={<Target className="w-12 h-12" />}
              title="No quests yet"
              description="Add quests manually, or let Campaign Intelligence detect quest hooks from your session notes."
              tip="Quests can be main storylines, side missions, personal character goals, or just rumors to explore."
              action={
                <Button onClick={() => setShowAddModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Quest
                </Button>
              }
            />
          ) : filteredQuests.length === 0 ? (
            <EmptyState
              icon={<Target className="w-12 h-12" />}
              title="No matching quests"
              description="Try adjusting your search or filters"
            />
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="flex gap-3 overflow-x-auto pb-4">
                {COLUMN_OPTIONS
                  .filter(col => boardSettings.visibleColumns.includes(col.key))
                  .map(col => (
                    <BoardColumn
                      key={col.key}
                      title={col.label}
                      status={col.key}
                      quests={questsByStatus[col.key]}
                      objectives={objectives}
                      characters={characters}
                      locations={locations}
                      onSelect={setSelectedQuest}
                      color={col.color}
                      detailLevel={boardSettings.detailLevel}
                    />
                  ))}
              </div>
            </DragDropContext>
          )}

          {/* Intelligence Hint */}
          {quests.length > 0 && (
            <IntelligenceHint
              contentType="campaigns"
              itemType="quests"
              contentId={campaignId}
              isDm={isDm}
            />
          )}
        </div>
      </div>

      {/* Quest View Modal (Trello-style) */}
      {selectedQuest && (
        <QuestViewModal
          quest={selectedQuest}
          objectives={objectives[selectedQuest.id] || []}
          characters={characters}
          locations={locations}
          encounters={encounters}
          sessionHistory={questSessions.filter(sq => sq.quest_id === selectedQuest.id)}
          onClose={() => setSelectedQuest(null)}
          onEdit={() => {
            setEditingQuest(selectedQuest)
            setShowAddModal(true)
          }}
          onDelete={() => setShowDeleteModal(true)}
          onToggleObjective={handleToggleObjective}
          canEdit={isDm || isOwner}
        />
      )}

      <BackToTopButton />

      {/* Add/Edit Modal */}
      <QuestFormModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false)
          setEditingQuest(null)
          setInitialQuestName(null)
        }}
        onSave={handleSave}
        quest={editingQuest}
        objectives={editingQuest ? objectives[editingQuest.id] : undefined}
        characters={characters}
        locations={locations}
        saving={saving}
        initialName={initialQuestName}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Quest"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-300">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-white">{selectedQuest?.name}</span>?
          </p>
          <p className="text-sm text-gray-500">
            This will also delete all objectives for this quest.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Roll Reveal Animation */}
      <RollReveal
        items={quests.filter(q => q.status === 'available')}
        isOpen={showRollReveal}
        onClose={() => setShowRollReveal(false)}
        onAccept={handleRollResult}
        allowReroll
        title="Rolling Quest..."
        renderResult={(quest) => (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div
                className="h-1 w-12 rounded-full"
                style={{ backgroundColor: QUEST_TYPE_COLORS[quest.type] || '#6B7280' }}
              />
              <Badge size="sm" color={QUEST_TYPE_COLORS[quest.type] || '#6B7280'}>
                {getQuestTypeLabel(quest.type)}
              </Badge>
            </div>
            <h3 className="text-2xl font-bold text-white">{quest.name}</h3>
            {quest.summary && (
              <p className="text-gray-400 max-w-md mx-auto">{quest.summary}</p>
            )}
            {(quest.rewards_xp || quest.rewards_gold) && (
              <div className="flex items-center justify-center gap-4 text-sm">
                {quest.rewards_xp && (
                  <span className="flex items-center gap-1 text-purple-400">
                    <Sparkles className="w-4 h-4" />
                    {quest.rewards_xp} XP
                  </span>
                )}
                {quest.rewards_gold && (
                  <span className="flex items-center gap-1 text-amber-400">
                    <Coins className="w-4 h-4" />
                    {quest.rewards_gold} gold
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      />
    </AppLayout>
  )
}

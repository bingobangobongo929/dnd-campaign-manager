'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd'
import {
  Swords,
  Plus,
  Search,
  ChevronDown,
  X,
  Trash2,
  Edit3,
  MessageSquare,
  Compass,
  AlertTriangle,
  Dices,
  Puzzle,
  Layers,
  MapPin,
  Target,
  Users,
  Shield,
  Heart,
  Scroll,
  Gift,
  Skull,
  Check,
  Columns,
  SlidersHorizontal,
  Calendar,
  Shuffle,
} from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Button, Modal, EmptyState, Badge, Tooltip, AccessDeniedPage } from '@/components/ui'
import { GuidanceTip } from '@/components/guidance/GuidanceTip'
import { BackToTopButton } from '@/components/ui/back-to-top'
import { RollReveal } from '@/components/roll-reveal'
import { IntelligenceHint } from '@/components/intelligence/IntelligenceHint'
import { useSupabase, useUser, usePermissions } from '@/hooks'
import { cn } from '@/lib/utils'
import type { Campaign } from '@/types/database'

// Encounter type icons
const ENCOUNTER_TYPE_ICONS: Record<string, any> = {
  combat: Swords,
  social: MessageSquare,
  exploration: Compass,
  trap: AlertTriangle,
  skill_challenge: Dices,
  puzzle: Puzzle,
  mixed: Layers,
}

// Encounter type colors
const ENCOUNTER_TYPE_COLORS: Record<string, string> = {
  combat: '#EF4444',
  social: '#3B82F6',
  exploration: '#10B981',
  trap: '#F59E0B',
  skill_challenge: '#8B5CF6',
  puzzle: '#EC4899',
  mixed: '#6B7280',
}

// Encounter status colors
const ENCOUNTER_STATUS_COLORS: Record<string, string> = {
  prepared: '#8B5CF6',
  used: '#10B981',
  skipped: '#6B7280',
}

// Difficulty colors
const DIFFICULTY_COLORS: Record<string, string> = {
  trivial: '#6B7280',
  easy: '#10B981',
  medium: '#F59E0B',
  hard: '#EF4444',
  deadly: '#7C2D12',
}

const ENCOUNTER_TYPES = [
  { value: 'combat', label: 'Combat' },
  { value: 'social', label: 'Social' },
  { value: 'exploration', label: 'Exploration' },
  { value: 'trap', label: 'Trap/Hazard' },
  { value: 'skill_challenge', label: 'Skill Challenge' },
  { value: 'puzzle', label: 'Puzzle' },
  { value: 'mixed', label: 'Mixed' },
]

const ENCOUNTER_STATUSES = [
  { value: 'prepared', label: 'Prepared' },
  { value: 'used', label: 'Used' },
  { value: 'skipped', label: 'Skipped' },
]

const DIFFICULTIES = [
  { value: 'trivial', label: 'Trivial' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
  { value: 'deadly', label: 'Deadly' },
]

// Helper functions
const getEncounterTypeLabel = (type: string) =>
  ENCOUNTER_TYPES.find(t => t.value === type)?.label || type

const getEncounterStatusLabel = (status: string) =>
  ENCOUNTER_STATUSES.find(s => s.value === status)?.label || status

const getDifficultyLabel = (difficulty: string) =>
  DIFFICULTIES.find(d => d.value === difficulty)?.label || difficulty

// Board settings types
type DetailLevel = 'compact' | 'standard' | 'detailed'
type ColumnKey = 'prepared' | 'used' | 'skipped'

interface BoardSettings {
  visibleColumns: ColumnKey[]
  detailLevel: DetailLevel
}

const COLUMN_OPTIONS: { key: ColumnKey; label: string; color: string }[] = [
  { key: 'prepared', label: 'Prepared', color: ENCOUNTER_STATUS_COLORS.prepared },
  { key: 'used', label: 'Used', color: ENCOUNTER_STATUS_COLORS.used },
  { key: 'skipped', label: 'Skipped', color: ENCOUNTER_STATUS_COLORS.skipped },
]

const DETAIL_OPTIONS: { value: DetailLevel; label: string; description: string }[] = [
  { value: 'compact', label: 'Compact', description: 'Name and type only' },
  { value: 'standard', label: 'Standard', description: 'Summary, difficulty, location' },
  { value: 'detailed', label: 'Detailed', description: 'Full info with enemies and rewards' },
]

const BOARD_PRESETS: { name: string; columns: ColumnKey[]; detail: DetailLevel }[] = [
  { name: 'Prep Mode', columns: ['prepared'], detail: 'detailed' },
  { name: 'Session Review', columns: ['used'], detail: 'detailed' },
  { name: 'Full Overview', columns: ['prepared', 'used', 'skipped'], detail: 'standard' },
  { name: 'Clean Slate', columns: ['prepared'], detail: 'compact' },
]

const DEFAULT_BOARD_SETTINGS: BoardSettings = {
  visibleColumns: ['prepared', 'used'],
  detailLevel: 'standard',
}

interface Encounter {
  id: string
  campaign_id: string | null
  oneshot_id: string | null
  name: string
  type: string
  description: string | null
  summary: string | null
  difficulty: string | null
  party_level: number | null
  enemies: any[] | null
  tactics: string | null
  terrain: string | null
  stakes: string | null
  npc_goals: string | null
  rewards: string | null
  xp_reward: number | null
  location_id: string | null
  map_id: string | null
  quest_id: string | null
  planned_session: number | null
  played_session: number | null
  status: string
  outcome: string | null
  player_notes: string | null
  lessons_learned: string | null
  boxed_text: string | null
  visibility: string
  dm_notes: string | null
  secrets: string | null
  created_at: string
  updated_at: string
}

interface Location {
  id: string
  name: string
  type: string
}

interface Quest {
  id: string
  name: string
  type: string
}

interface SessionEncounterHistory {
  id: string
  encounter_id: string
  status_in_session: string
  session: {
    id: string
    session_number: number
    date: string | null
    title: string | null
  }
}

// Board Card component
function BoardCard({
  encounter,
  location,
  quest,
  onClick,
  isDragging,
  detailLevel,
}: {
  encounter: Encounter
  location?: Location
  quest?: Quest
  onClick: () => void
  isDragging: boolean
  detailLevel: DetailLevel
}) {
  const typeColor = ENCOUNTER_TYPE_COLORS[encounter.type] || '#6B7280'
  const difficultyColor = encounter.difficulty ? DIFFICULTY_COLORS[encounter.difficulty] : null
  const Icon = ENCOUNTER_TYPE_ICONS[encounter.type] || Swords
  const enemyCount = encounter.enemies?.reduce((sum, e) => sum + (e.count || 1), 0) || 0

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
      {/* Type indicator bar and badges */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className="h-1 w-8 rounded-full"
          style={{ backgroundColor: typeColor }}
        />
        <Badge size="sm" color={typeColor}>
          {getEncounterTypeLabel(encounter.type)}
        </Badge>
        {encounter.difficulty && (
          <Badge size="sm" color={difficultyColor || '#6B7280'}>
            {getDifficultyLabel(encounter.difficulty)}
          </Badge>
        )}
      </div>

      {/* Title */}
      <p className="font-medium text-sm text-white mb-1">{encounter.name}</p>

      {/* Summary (standard & detailed) */}
      {showSummary && encounter.summary && (
        <p className="text-xs text-gray-400 line-clamp-2 mb-2">
          {encounter.summary}
        </p>
      )}

      {/* Location (standard & detailed) */}
      {showSummary && location && (
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{location.name}</span>
        </div>
      )}

      {/* Enemies count (detailed only) */}
      {showDetails && enemyCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
          <Users className="w-3 h-3" />
          <span>{enemyCount} {enemyCount === 1 ? 'enemy' : 'enemies'}</span>
        </div>
      )}

      {/* Session tracking (detailed only) */}
      {showDetails && (encounter.planned_session || encounter.played_session) && (
        <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
          {encounter.planned_session && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Planned: S{encounter.planned_session}
            </span>
          )}
          {encounter.played_session && (
            <span className="flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-400" />
              Played: S{encounter.played_session}
            </span>
          )}
        </div>
      )}

      {/* Rewards (detailed only) */}
      {showDetails && encounter.xp_reward && (
        <div className="flex items-center gap-2 text-xs text-gray-500 pt-2 border-t border-white/10">
          <Gift className="w-3 h-3 text-amber-400" />
          <span>{encounter.xp_reward} XP</span>
        </div>
      )}

      {/* Quest link (detailed only) */}
      {showDetails && quest && (
        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
          <Target className="w-3 h-3" />
          <span className="truncate">{quest.name}</span>
        </div>
      )}
    </div>
  )
}

// Board Column component
function BoardColumn({
  title,
  status,
  encounters,
  locations,
  quests,
  onSelect,
  color,
  detailLevel,
}: {
  title: string
  status: string
  encounters: Encounter[]
  locations: Location[]
  quests: Quest[]
  onSelect: (encounter: Encounter) => void
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
          {encounters.length}
        </span>
      </div>

      {/* Droppable area */}
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
            {encounters.map((encounter, index) => {
              const location = locations.find(l => l.id === encounter.location_id)
              const quest = quests.find(q => q.id === encounter.quest_id)
              return (
                <Draggable key={encounter.id} draggableId={encounter.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                    >
                      <BoardCard
                        encounter={encounter}
                        location={location}
                        quest={quest}
                        onClick={() => onSelect(encounter)}
                        isDragging={snapshot.isDragging}
                        detailLevel={detailLevel}
                      />
                    </div>
                  )}
                </Draggable>
              )
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  )
}

// Encounter View Modal (Trello-style)
function EncounterViewModal({
  encounter,
  location,
  quest,
  sessionHistory,
  onClose,
  onEdit,
  onDelete,
  canEdit,
}: {
  encounter: Encounter
  location?: Location
  quest?: Quest
  sessionHistory: SessionEncounterHistory[]
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  canEdit: boolean
}) {
  const Icon = ENCOUNTER_TYPE_ICONS[encounter.type] || Swords
  const typeColor = ENCOUNTER_TYPE_COLORS[encounter.type] || '#6B7280'
  const difficultyColor = encounter.difficulty ? DIFFICULTY_COLORS[encounter.difficulty] : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div className="fixed inset-0 bg-black/70" />
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#1a1a24] rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-2 rounded-t-xl" style={{ backgroundColor: typeColor }} />
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 pb-4">
          <div className="flex items-start gap-4 pr-10">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${typeColor}20` }}
            >
              <Icon className="w-6 h-6" style={{ color: typeColor }} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-white mb-2">{encounter.name}</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge size="sm" color={typeColor}>
                  {getEncounterTypeLabel(encounter.type)}
                </Badge>
                {encounter.difficulty && (
                  <Badge size="sm" color={difficultyColor || '#6B7280'}>
                    {getDifficultyLabel(encounter.difficulty)}
                  </Badge>
                )}
                <Badge size="sm" color={ENCOUNTER_STATUS_COLORS[encounter.status] || '#6B7280'}>
                  {getEncounterStatusLabel(encounter.status)}
                </Badge>
              </div>
            </div>
          </div>
          {encounter.summary && (
            <p className="mt-4 text-gray-400">{encounter.summary}</p>
          )}
        </div>

        <div className="px-6 pb-6 space-y-6">
          {encounter.boxed_text && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Scroll className="w-4 h-4" />
                Read Aloud
              </h4>
              <p className="text-sm text-amber-200/80 italic leading-relaxed whitespace-pre-wrap">
                {encounter.boxed_text}
              </p>
            </div>
          )}

          {encounter.description && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Description</h4>
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap bg-white/[0.02] rounded-lg p-3">
                {encounter.description}
              </p>
            </div>
          )}

          {encounter.enemies && encounter.enemies.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Enemies
              </h4>
              <div className="bg-white/[0.02] rounded-lg p-3 space-y-2">
                {encounter.enemies.map((enemy, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">
                      {enemy.name} {enemy.count > 1 && `× ${enemy.count}`}
                    </span>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {enemy.hp && (
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3 text-red-400" />
                          {enemy.hp}
                        </span>
                      )}
                      {enemy.ac && (
                        <span className="flex items-center gap-1">
                          <Shield className="w-3 h-3 text-blue-400" />
                          {enemy.ac}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(encounter.tactics || encounter.terrain) && (
            <div className="grid grid-cols-2 gap-4">
              {encounter.tactics && (
                <div className="bg-white/[0.02] rounded-lg p-3">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tactics</h4>
                  <p className="text-sm text-gray-300 whitespace-pre-wrap">{encounter.tactics}</p>
                </div>
              )}
              {encounter.terrain && (
                <div className="bg-white/[0.02] rounded-lg p-3">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Terrain</h4>
                  <p className="text-sm text-gray-300 whitespace-pre-wrap">{encounter.terrain}</p>
                </div>
              )}
            </div>
          )}

          {(encounter.stakes || encounter.npc_goals) && (
            <div className="grid grid-cols-2 gap-4">
              {encounter.stakes && (
                <div className="bg-white/[0.02] rounded-lg p-3">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Stakes</h4>
                  <p className="text-sm text-gray-300">{encounter.stakes}</p>
                </div>
              )}
              {encounter.npc_goals && (
                <div className="bg-white/[0.02] rounded-lg p-3">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">NPC Goals</h4>
                  <p className="text-sm text-gray-300">{encounter.npc_goals}</p>
                </div>
              )}
            </div>
          )}

          {(location || quest) && (
            <div className="grid grid-cols-2 gap-4">
              {location && (
                <div className="bg-white/[0.02] rounded-lg p-3">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Location</h4>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-300">{location.name}</span>
                  </div>
                </div>
              )}
              {quest && (
                <div className="bg-white/[0.02] rounded-lg p-3">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Quest</h4>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-300">{quest.name}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {(encounter.planned_session || encounter.played_session) && (
            <div className="grid grid-cols-2 gap-4">
              {encounter.planned_session && (
                <div className="bg-white/[0.02] rounded-lg p-3">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Planned Session</h4>
                  <span className="text-sm text-gray-300">Session {encounter.planned_session}</span>
                </div>
              )}
              {encounter.played_session && (
                <div className="bg-white/[0.02] rounded-lg p-3">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Played Session</h4>
                  <span className="text-sm text-gray-300">Session {encounter.played_session}</span>
                </div>
              )}
            </div>
          )}

          {(encounter.rewards || encounter.xp_reward) && (
            <div className="bg-amber-500/10 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Gift className="w-4 h-4" />
                Rewards
              </h4>
              {encounter.rewards && <p className="text-sm text-amber-300/80 mb-2">{encounter.rewards}</p>}
              {encounter.xp_reward && <span className="text-amber-400 font-medium">{encounter.xp_reward} XP</span>}
            </div>
          )}

          {encounter.outcome && (
            <div className="bg-emerald-500/10 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">Outcome</h4>
              <p className="text-sm text-emerald-300/80">{encounter.outcome}</p>
            </div>
          )}

          {encounter.player_notes && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Player Notes</h4>
              <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap bg-white/[0.02] rounded-lg p-3">
                {encounter.player_notes}
              </p>
            </div>
          )}

          {encounter.dm_notes && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">DM Notes</h4>
              <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap bg-white/[0.02] rounded-lg p-3">
                {encounter.dm_notes}
              </p>
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
                {sessionHistory.map(se => {
                  const statusColors: Record<string, string> = {
                    planned: '#F59E0B',
                    used: '#10B981',
                    skipped: '#6B7280',
                  }
                  return (
                    <div
                      key={se.id}
                      className="flex items-center gap-2 p-2 bg-white/[0.02] rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-gray-300 truncate block">
                          Session {se.session.session_number}
                          {se.session.title && `: ${se.session.title}`}
                        </span>
                        {se.session.date && (
                          <span className="text-xs text-gray-500">
                            {new Date(se.session.date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <Badge size="sm" color={statusColors[se.status_in_session] || '#6B7280'}>
                        {se.status_in_session}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {encounter.secrets && (
            <div className="bg-red-500/10 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Skull className="w-4 h-4" />
                Secrets (DM Only)
              </h4>
              <p className="text-sm text-red-300/80 leading-relaxed whitespace-pre-wrap">{encounter.secrets}</p>
            </div>
          )}
        </div>

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
              Edit Encounter
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// Expandable form section
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
        <ChevronDown className={cn("w-4 h-4 text-gray-500 transition-transform", isOpen && "rotate-180")} />
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-1 border-t border-white/[0.06]">
          {children}
        </div>
      )}
    </div>
  )
}

// Add/Edit Encounter Modal
function EncounterFormModal({
  isOpen,
  onClose,
  onSave,
  encounter,
  locations,
  quests,
  saving,
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<Encounter>) => void
  encounter?: Encounter | null
  locations: Location[]
  quests: Quest[]
  saving: boolean
}) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'combat',
    status: 'prepared',
    summary: '',
    description: '',
    difficulty: '',
    party_level: '',
    enemies: [] as { name: string; count: number; hp: string; ac: string; notes: string }[],
    tactics: '',
    terrain: '',
    stakes: '',
    npc_goals: '',
    rewards: '',
    xp_reward: '',
    location_id: '',
    quest_id: '',
    planned_session: '',
    played_session: '',
    outcome: '',
    player_notes: '',
    boxed_text: '',
    dm_notes: '',
    secrets: '',
  })

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
    if (encounter) {
      setFormData({
        name: encounter.name,
        type: encounter.type,
        status: encounter.status,
        summary: encounter.summary || '',
        description: encounter.description || '',
        difficulty: encounter.difficulty || '',
        party_level: encounter.party_level?.toString() || '',
        enemies: encounter.enemies || [],
        tactics: encounter.tactics || '',
        terrain: encounter.terrain || '',
        stakes: encounter.stakes || '',
        npc_goals: encounter.npc_goals || '',
        rewards: encounter.rewards || '',
        xp_reward: encounter.xp_reward?.toString() || '',
        location_id: encounter.location_id || '',
        quest_id: encounter.quest_id || '',
        planned_session: encounter.planned_session?.toString() || '',
        played_session: encounter.played_session?.toString() || '',
        outcome: encounter.outcome || '',
        player_notes: encounter.player_notes || '',
        boxed_text: encounter.boxed_text || '',
        dm_notes: encounter.dm_notes || '',
        secrets: encounter.secrets || '',
      })
      const sectionsWithContent = new Set<string>()
      if (encounter.description || encounter.boxed_text) sectionsWithContent.add('description')
      if (encounter.difficulty || encounter.enemies?.length || encounter.tactics || encounter.terrain) sectionsWithContent.add('combat')
      if (encounter.stakes || encounter.npc_goals) sectionsWithContent.add('social')
      if (encounter.location_id || encounter.quest_id) sectionsWithContent.add('location')
      if (encounter.rewards || encounter.xp_reward) sectionsWithContent.add('rewards')
      if (encounter.planned_session || encounter.played_session) sectionsWithContent.add('session')
      if (encounter.outcome || encounter.player_notes) sectionsWithContent.add('outcome')
      if (encounter.dm_notes || encounter.secrets) sectionsWithContent.add('notes')
      setOpenSections(sectionsWithContent)
    } else {
      setFormData({
        name: '',
        type: 'combat',
        status: 'prepared',
        summary: '',
        description: '',
        difficulty: '',
        party_level: '',
        enemies: [],
        tactics: '',
        terrain: '',
        stakes: '',
        npc_goals: '',
        rewards: '',
        xp_reward: '',
        location_id: '',
        quest_id: '',
        planned_session: '',
        played_session: '',
        outcome: '',
        player_notes: '',
        boxed_text: '',
        dm_notes: '',
        secrets: '',
      })
      setOpenSections(new Set())
    }
  }, [encounter, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      name: formData.name,
      type: formData.type,
      status: formData.status,
      summary: formData.summary || null,
      description: formData.description || null,
      difficulty: formData.difficulty || null,
      party_level: formData.party_level ? parseInt(formData.party_level) : null,
      enemies: formData.enemies.length > 0 ? formData.enemies : null,
      tactics: formData.tactics || null,
      terrain: formData.terrain || null,
      stakes: formData.stakes || null,
      npc_goals: formData.npc_goals || null,
      rewards: formData.rewards || null,
      xp_reward: formData.xp_reward ? parseInt(formData.xp_reward) : null,
      location_id: formData.location_id || null,
      quest_id: formData.quest_id || null,
      planned_session: formData.planned_session ? parseInt(formData.planned_session) : null,
      played_session: formData.played_session ? parseInt(formData.played_session) : null,
      outcome: formData.outcome || null,
      player_notes: formData.player_notes || null,
      boxed_text: formData.boxed_text || null,
      dm_notes: formData.dm_notes || null,
      secrets: formData.secrets || null,
    })
  }

  const addEnemy = () => {
    setFormData({
      ...formData,
      enemies: [...formData.enemies, { name: '', count: 1, hp: '', ac: '', notes: '' }],
    })
  }

  const removeEnemy = (index: number) => {
    setFormData({
      ...formData,
      enemies: formData.enemies.filter((_, i) => i !== index),
    })
  }

  const updateEnemy = (index: number, field: string, value: any) => {
    setFormData({
      ...formData,
      enemies: formData.enemies.map((e, i) => i === index ? { ...e, [field]: value } : e),
    })
  }

  const isCombat = formData.type === 'combat' || formData.type === 'mixed'
  const isSocial = formData.type === 'social'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={encounter ? 'Edit Encounter' : 'Add Encounter'} size="md">
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto space-y-4 pb-4" style={{ maxHeight: 'calc(70vh - 120px)' }}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Encounter Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="form-input"
                placeholder='e.g., "Goblin Ambush"'
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="form-input"
                >
                  {ENCOUNTER_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="form-input"
                >
                  {ENCOUNTER_STATUSES.map(status => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Summary <span className="text-xs text-gray-500 font-normal">(shown in cards)</span>
              </label>
              <input
                type="text"
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                className="form-input"
                placeholder='e.g., "Goblins attack on the forest road"'
              />
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium px-1">Additional Details</p>

            <FormSection
              title="Description & Read-Aloud"
              icon={Scroll}
              isOpen={openSections.has('description')}
              onToggle={() => toggleSection('description')}
              preview={formData.boxed_text ? 'Has read-aloud' : formData.description ? 'Has description' : ''}
            >
              <div className="space-y-3 mt-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="form-input min-h-[80px]"
                    placeholder="Setup, context..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-amber-400 mb-1">Boxed Text (Read Aloud)</label>
                  <textarea
                    value={formData.boxed_text}
                    onChange={(e) => setFormData({ ...formData, boxed_text: e.target.value })}
                    className="form-input min-h-[80px] border-amber-500/20 focus:border-amber-500/40"
                    placeholder="Text to read to players..."
                  />
                </div>
              </div>
            </FormSection>

            {isCombat && (
              <FormSection
                title="Combat Details"
                icon={Swords}
                isOpen={openSections.has('combat')}
                onToggle={() => toggleSection('combat')}
                preview={formData.enemies.length > 0 ? `${formData.enemies.length} enemies` : formData.difficulty || ''}
              >
                <div className="space-y-3 mt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Difficulty</label>
                      <select
                        value={formData.difficulty}
                        onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                        className="form-input"
                      >
                        <option value="">Not set</option>
                        {DIFFICULTIES.map(d => (
                          <option key={d.value} value={d.value}>{d.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Party Level</label>
                      <input
                        type="number"
                        value={formData.party_level}
                        onChange={(e) => setFormData({ ...formData, party_level: e.target.value })}
                        className="form-input"
                        placeholder="e.g., 5"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Enemies</label>
                    <div className="space-y-2">
                      {formData.enemies.map((enemy, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={enemy.name}
                            onChange={(e) => updateEnemy(idx, 'name', e.target.value)}
                            className="form-input flex-1 text-sm"
                            placeholder="Name"
                          />
                          <input
                            type="number"
                            value={enemy.count}
                            onChange={(e) => updateEnemy(idx, 'count', parseInt(e.target.value) || 1)}
                            className="form-input w-16 text-sm"
                            placeholder="#"
                            min="1"
                          />
                          <input
                            type="text"
                            value={enemy.hp}
                            onChange={(e) => updateEnemy(idx, 'hp', e.target.value)}
                            className="form-input w-16 text-sm"
                            placeholder="HP"
                          />
                          <input
                            type="text"
                            value={enemy.ac}
                            onChange={(e) => updateEnemy(idx, 'ac', e.target.value)}
                            className="form-input w-16 text-sm"
                            placeholder="AC"
                          />
                          <button type="button" onClick={() => removeEnemy(idx)} className="p-1 text-gray-500 hover:text-red-400">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addEnemy}
                        className="text-sm text-[--arcane-purple] hover:text-[--arcane-purple-light] flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Add Enemy
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Tactics</label>
                    <textarea
                      value={formData.tactics}
                      onChange={(e) => setFormData({ ...formData, tactics: e.target.value })}
                      className="form-input min-h-[60px] text-sm"
                      placeholder="How do enemies fight?"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Terrain</label>
                    <textarea
                      value={formData.terrain}
                      onChange={(e) => setFormData({ ...formData, terrain: e.target.value })}
                      className="form-input min-h-[60px] text-sm"
                      placeholder="Environmental features, cover..."
                    />
                  </div>
                </div>
              </FormSection>
            )}

            {isSocial && (
              <FormSection
                title="Social Details"
                icon={MessageSquare}
                isOpen={openSections.has('social')}
                onToggle={() => toggleSection('social')}
                preview={formData.stakes || ''}
              >
                <div className="space-y-3 mt-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Stakes</label>
                    <textarea
                      value={formData.stakes}
                      onChange={(e) => setFormData({ ...formData, stakes: e.target.value })}
                      className="form-input min-h-[60px] text-sm"
                      placeholder="What's at risk?"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">NPC Goals</label>
                    <textarea
                      value={formData.npc_goals}
                      onChange={(e) => setFormData({ ...formData, npc_goals: e.target.value })}
                      className="form-input min-h-[60px] text-sm"
                      placeholder="What does the NPC want?"
                    />
                  </div>
                </div>
              </FormSection>
            )}

            <FormSection
              title="Location & Quest"
              icon={MapPin}
              isOpen={openSections.has('location')}
              onToggle={() => toggleSection('location')}
              preview={locations.find(l => l.id === formData.location_id)?.name || quests.find(q => q.id === formData.quest_id)?.name || ''}
            >
              <div className="space-y-3 mt-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Location</label>
                  <select
                    value={formData.location_id}
                    onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                    className="form-input"
                  >
                    <option value="">No specific location</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name} ({loc.type})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Related Quest</label>
                  <select
                    value={formData.quest_id}
                    onChange={(e) => setFormData({ ...formData, quest_id: e.target.value })}
                    className="form-input"
                  >
                    <option value="">No related quest</option>
                    {quests.map(quest => (
                      <option key={quest.id} value={quest.id}>{quest.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </FormSection>

            <FormSection
              title="Rewards"
              icon={Gift}
              isOpen={openSections.has('rewards')}
              onToggle={() => toggleSection('rewards')}
              preview={formData.xp_reward ? `${formData.xp_reward} XP` : ''}
            >
              <div className="space-y-3 mt-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">XP Reward</label>
                  <input
                    type="number"
                    value={formData.xp_reward}
                    onChange={(e) => setFormData({ ...formData, xp_reward: e.target.value })}
                    className="form-input"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Other Rewards</label>
                  <textarea
                    value={formData.rewards}
                    onChange={(e) => setFormData({ ...formData, rewards: e.target.value })}
                    className="form-input min-h-[60px] text-sm"
                    placeholder="Treasure, items..."
                  />
                </div>
              </div>
            </FormSection>

            <FormSection
              title="Session Tracking"
              icon={Calendar}
              isOpen={openSections.has('session')}
              onToggle={() => toggleSection('session')}
              preview={formData.played_session ? `Played: S${formData.played_session}` : formData.planned_session ? `Planned: S${formData.planned_session}` : ''}
            >
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Planned for Session</label>
                  <input
                    type="number"
                    value={formData.planned_session}
                    onChange={(e) => setFormData({ ...formData, planned_session: e.target.value })}
                    className="form-input"
                    placeholder="e.g., 15"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Played in Session</label>
                  <input
                    type="number"
                    value={formData.played_session}
                    onChange={(e) => setFormData({ ...formData, played_session: e.target.value })}
                    className="form-input"
                    placeholder="e.g., 15"
                  />
                </div>
              </div>
            </FormSection>

            <FormSection
              title="Outcome & Notes"
              icon={Check}
              isOpen={openSections.has('outcome')}
              onToggle={() => toggleSection('outcome')}
              preview={formData.outcome ? 'Has outcome' : ''}
            >
              <div className="space-y-3 mt-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Outcome</label>
                  <textarea
                    value={formData.outcome}
                    onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                    className="form-input min-h-[60px] text-sm"
                    placeholder="How did it resolve?"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Player Notes</label>
                  <textarea
                    value={formData.player_notes}
                    onChange={(e) => setFormData({ ...formData, player_notes: e.target.value })}
                    className="form-input min-h-[60px] text-sm"
                    placeholder="Memorable moments..."
                  />
                </div>
              </div>
            </FormSection>

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
                    placeholder="Reminders..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-red-400 mb-1 flex items-center gap-1">
                    <Skull className="w-3 h-3" />
                    Secrets
                  </label>
                  <textarea
                    value={formData.secrets}
                    onChange={(e) => setFormData({ ...formData, secrets: e.target.value })}
                    className="form-input min-h-[60px] text-sm border-red-500/20 focus:border-red-500/40"
                    placeholder="Hidden truths..."
                  />
                </div>
              </div>
            </FormSection>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[--border] bg-[--bg-surface]">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" loading={saving} disabled={!formData.name.trim()}>
            {encounter ? 'Save Changes' : 'Add Encounter'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// Main Page
export default function EncountersPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = useSupabase()
  const { user } = useUser()
  const campaignId = params.id as string
  const { loading: permissionsLoading, isMember, isOwner, isDm } = usePermissions(campaignId)

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [encounters, setEncounters] = useState<Encounter[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [quests, setQuests] = useState<Quest[]>([])
  const [encounterSessions, setEncounterSessions] = useState<SessionEncounterHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  // Board settings
  const [boardSettings, setBoardSettings] = useState<BoardSettings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`encounter-board-settings-${campaignId}`)
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

  // Save board settings
  useEffect(() => {
    if (typeof window !== 'undefined' && campaignId) {
      localStorage.setItem(`encounter-board-settings-${campaignId}`, JSON.stringify(boardSettings))
    }
  }, [boardSettings, campaignId])

  // Close dropdowns on click outside
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

  // Modals
  const [selectedEncounter, setSelectedEncounter] = useState<Encounter | null>(null)
  const [editingEncounter, setEditingEncounter] = useState<Encounter | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (user && campaignId) {
      loadData()
    }
  }, [user, campaignId])

  const loadData = async () => {
    if (!hasLoadedOnce) setLoading(true)

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

    const { data: encountersData } = await supabase
      .from('encounters')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })

    setEncounters(encountersData || [])

    const { data: locationsData } = await supabase
      .from('locations')
      .select('id, name, type')
      .eq('campaign_id', campaignId)
      .order('name')

    setLocations(locationsData || [])

    const { data: questsData } = await supabase
      .from('quests')
      .select('id, name, type')
      .eq('campaign_id', campaignId)
      .order('name')

    setQuests(questsData || [])

    // Load session encounters for Session History
    const { data: sessionEncountersData } = await supabase
      .from('session_encounters')
      .select(`
        id,
        encounter_id,
        status_in_session,
        session:sessions(id, session_number, date, title)
      `)
      .in('encounter_id', encountersData?.map(e => e.id) || [])
      .order('created_at', { ascending: false })

    setEncounterSessions(sessionEncountersData?.map(se => ({
      ...se,
      session: Array.isArray(se.session) ? se.session[0] : se.session
    })).filter(se => se.session) as SessionEncounterHistory[] || [])

    setLoading(false)
    setHasLoadedOnce(true)
  }

  // Filter encounters
  const filteredEncounters = encounters.filter(encounter => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        encounter.name.toLowerCase().includes(query) ||
        encounter.description?.toLowerCase().includes(query) ||
        encounter.summary?.toLowerCase().includes(query)
      if (!matchesSearch) return false
    }
    if (typeFilter !== 'all' && encounter.type !== typeFilter) return false
    return true
  })

  // Group by status for board
  const getEncountersByStatus = (status: string) =>
    filteredEncounters.filter(e => e.status === status)

  // Handle drag end
  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const newStatus = destination.droppableId

    // Optimistic update
    setEncounters(prev =>
      prev.map(e => e.id === draggableId ? { ...e, status: newStatus } : e)
    )

    // Update in database
    const { error } = await supabase
      .from('encounters')
      .update({ status: newStatus })
      .eq('id', draggableId)

    if (error) {
      console.error('Failed to update encounter status:', error)
      loadData()
    }
  }

  // Roll reveal modal state
  const [showRollReveal, setShowRollReveal] = useState(false)

  // Roll random prepared encounter
  const handleRollRandom = () => {
    const preparedEncounters = encounters.filter(e => e.status === 'prepared')
    if (preparedEncounters.length === 0) {
      alert('No prepared encounters to roll from!')
      return
    }
    setShowRollReveal(true)
  }

  // Handle roll result
  const handleRollResult = (encounter: Encounter) => {
    setSelectedEncounter(encounter)
  }

  // Save encounter
  const handleSave = async (data: Partial<Encounter>) => {
    setSaving(true)
    const wasEditing = editingEncounter
    const editedId = editingEncounter?.id

    try {
      if (editingEncounter) {
        const { error } = await supabase
          .from('encounters')
          .update(data)
          .eq('id', editingEncounter.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('encounters')
          .insert({ ...data, campaign_id: campaignId })
        if (error) throw error
      }

      await loadData()

      if (wasEditing && editedId) {
        const { data: updated } = await supabase
          .from('encounters')
          .select('*')
          .eq('id', editedId)
          .single()
        if (updated) setSelectedEncounter(updated)
      }

      setShowAddModal(false)
      setEditingEncounter(null)
    } catch (err) {
      console.error('Failed to save encounter:', err)
    } finally {
      setSaving(false)
    }
  }

  // Delete encounter
  const handleDelete = async () => {
    if (!selectedEncounter) return
    setDeleting(true)
    try {
      const { error } = await supabase
        .from('encounters')
        .delete()
        .eq('id', selectedEncounter.id)
      if (error) throw error
      await loadData()
      setSelectedEncounter(null)
      setShowDeleteModal(false)
    } catch (err) {
      console.error('Failed to delete encounter:', err)
    } finally {
      setDeleting(false)
    }
  }

  // Page actions for top bar
  const pageActions = (
    <div className="flex items-center gap-2">
      {encounters.filter(e => e.status === 'prepared').length > 0 && (
        <Tooltip content="Roll random prepared encounter">
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
      <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
        <Plus className="w-4 h-4" />
        <span className="hidden sm:inline">Add Encounter</span>
      </Button>
    </div>
  )

  if (loading || permissionsLoading) {
    return (
      <AppLayout campaignId={campaignId}>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-10 h-10 border-2 border-[--arcane-purple] border-t-transparent rounded-full spinner" />
        </div>
      </AppLayout>
    )
  }

  if (!isMember) {
    return (
      <AppLayout campaignId={campaignId}>
        <AccessDeniedPage campaignId={campaignId} message="You don't have permission to view encounters." />
      </AppLayout>
    )
  }

  return (
    <AppLayout campaignId={campaignId} topBarActions={pageActions}>
      <div className="flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-[--border] space-y-4">
          <GuidanceTip
            tipId="encounters_intro"
            title="Plan Your Moments"
            description="Drag encounters between columns to change their status. Use the dropdowns to customize what you see."
            variant="banner"
            showOnce
          />

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-[2] min-w-[200px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none z-10" />
              <input
                type="text"
                placeholder="Search encounters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input w-full"
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>

            {/* Type filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="form-input w-full sm:w-32"
            >
              <option value="all">All Types</option>
              {ENCOUNTER_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
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
                <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded">{boardSettings.visibleColumns.length}</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {showColumnsDropdown && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-[#1a1a24] border border-white/10 rounded-xl shadow-xl z-50 py-2" onClick={(e) => e.stopPropagation()}>
                  <div className="px-3 py-1 text-xs text-gray-500 uppercase tracking-wider">Visible Columns</div>
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
                    <div className="px-3 py-1 text-xs text-gray-500 uppercase tracking-wider">Quick Presets</div>
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
                <div className="absolute right-0 top-full mt-1 w-52 bg-[#1a1a24] border border-white/10 rounded-xl shadow-xl z-50 py-2" onClick={(e) => e.stopPropagation()}>
                  <div className="px-3 py-1 text-xs text-gray-500 uppercase tracking-wider">Card Detail Level</div>
                  {DETAIL_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setBoardSettings(prev => ({ ...prev, detailLevel: opt.value }))
                        setShowDetailDropdown(false)
                      }}
                      className={cn(
                        'w-full flex flex-col px-3 py-2 text-sm text-left transition-colors',
                        boardSettings.detailLevel === opt.value ? 'bg-[--arcane-purple]/20 text-[--arcane-purple]' : 'text-gray-300 hover:bg-white/5'
                      )}
                    >
                      <span className="font-medium">{opt.label}</span>
                      <span className="text-xs text-gray-500">{opt.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Board */}
        <div className="p-4">
          {encounters.length === 0 ? (
            <EmptyState
              icon={<Swords className="w-12 h-12" />}
              title="No encounters yet"
              description="Add encounters manually, or let Campaign Intelligence detect them from your session notes."
              tip="Start by creating a few prepared encounters for your next session."
              action={
                <Button onClick={() => setShowAddModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Encounter
                </Button>
              }
            />
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="flex gap-3 overflow-x-auto pb-4">
                {boardSettings.visibleColumns.map(status => {
                  const col = COLUMN_OPTIONS.find(c => c.key === status)!
                  return (
                    <BoardColumn
                      key={status}
                      title={col.label}
                      status={status}
                      encounters={getEncountersByStatus(status)}
                      locations={locations}
                      quests={quests}
                      onSelect={setSelectedEncounter}
                      color={col.color}
                      detailLevel={boardSettings.detailLevel}
                    />
                  )
                })}
              </div>
            </DragDropContext>
          )}

          {/* Intelligence Hint */}
          {encounters.length > 0 && (
            <IntelligenceHint
              contentType="campaigns"
              itemType="encounters"
              contentId={campaignId}
              isDm={isDm}
            />
          )}
        </div>
      </div>

      {selectedEncounter && (
        <EncounterViewModal
          encounter={selectedEncounter}
          location={locations.find(l => l.id === selectedEncounter.location_id)}
          quest={quests.find(q => q.id === selectedEncounter.quest_id)}
          sessionHistory={encounterSessions.filter(se => se.encounter_id === selectedEncounter.id)}
          onClose={() => setSelectedEncounter(null)}
          onEdit={() => {
            setEditingEncounter(selectedEncounter)
            setShowAddModal(true)
          }}
          onDelete={() => setShowDeleteModal(true)}
          canEdit={isDm || isOwner}
        />
      )}

      <BackToTopButton />

      <EncounterFormModal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setEditingEncounter(null) }}
        onSave={handleSave}
        encounter={editingEncounter}
        locations={locations}
        quests={quests}
        saving={saving}
      />

      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Encounter" size="sm">
        <div className="space-y-4">
          <p className="text-gray-300">
            Are you sure you want to delete <span className="font-semibold text-white">{selectedEncounter?.name}</span>?
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>Delete</Button>
          </div>
        </div>
      </Modal>

      {/* Roll Reveal Modal */}
      <RollReveal
        items={encounters.filter(e => e.status === 'prepared')}
        isOpen={showRollReveal}
        onClose={() => setShowRollReveal(false)}
        onAccept={handleRollResult}
        title="Summoning an Encounter..."
        renderResult={(encounter) => (
          <div className="p-2">
            <div className="flex items-center gap-3 mb-3">
              {(() => {
                const Icon = ENCOUNTER_TYPE_ICONS[encounter.type] || Swords
                const color = ENCOUNTER_TYPE_COLORS[encounter.type] || '#8B5CF6'
                return (
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${color}20` }}
                  >
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                )
              })()}
              <div>
                <h3 className="text-lg font-bold text-white">{encounter.name}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400 capitalize">{encounter.type}</span>
                  {encounter.difficulty && (
                    <span
                      className="text-xs px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: `${DIFFICULTY_COLORS[encounter.difficulty]}20`,
                        color: DIFFICULTY_COLORS[encounter.difficulty],
                      }}
                    >
                      {encounter.difficulty}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {encounter.summary && (
              <p className="text-sm text-gray-300 line-clamp-3">{encounter.summary}</p>
            )}
            {encounter.description && !encounter.summary && (
              <p className="text-sm text-gray-300 line-clamp-3">{encounter.description}</p>
            )}
          </div>
        )}
      />
    </AppLayout>
  )
}

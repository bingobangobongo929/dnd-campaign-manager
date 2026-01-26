'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Swords,
  Plus,
  Search,
  ChevronRight,
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
  Filter,
} from 'lucide-react'
import { AppLayout, CampaignPageHeader } from '@/components/layout'
import { Button, Modal, EmptyState, Badge, Tooltip, AccessDeniedPage } from '@/components/ui'
import { GuidanceTip } from '@/components/guidance/GuidanceTip'
import {
  PartyModal,
  TagManager,
  FactionManager,
  RelationshipManager,
} from '@/components/campaign'
import { ResizeToolbar } from '@/components/canvas'
import { UnifiedShareModal } from '@/components/share/UnifiedShareModal'
import { BackToTopButton } from '@/components/ui/back-to-top'
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
  combat: '#EF4444',      // Red
  social: '#3B82F6',      // Blue
  exploration: '#10B981', // Green
  trap: '#F59E0B',        // Amber
  skill_challenge: '#8B5CF6', // Purple
  puzzle: '#EC4899',      // Pink
  mixed: '#6B7280',       // Gray
}

// Difficulty colors
const DIFFICULTY_COLORS: Record<string, string> = {
  trivial: '#6B7280',   // Gray
  easy: '#10B981',      // Green
  medium: '#F59E0B',    // Amber
  hard: '#EF4444',      // Red
  deadly: '#7C2D12',    // Dark red
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

// Encounter Card component
function EncounterCard({
  encounter,
  location,
  quest,
  onClick,
}: {
  encounter: Encounter
  location?: Location
  quest?: Quest
  onClick: () => void
}) {
  const typeColor = ENCOUNTER_TYPE_COLORS[encounter.type] || '#6B7280'
  const difficultyColor = encounter.difficulty ? DIFFICULTY_COLORS[encounter.difficulty] : null
  const Icon = ENCOUNTER_TYPE_ICONS[encounter.type] || Swords
  const enemyCount = encounter.enemies?.reduce((sum, e) => sum + (e.count || 1), 0) || 0

  return (
    <div
      className="p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] cursor-pointer transition-all"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Type icon */}
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${typeColor}20` }}
        >
          <Icon className="w-5 h-5" style={{ color: typeColor }} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center gap-2 mb-1">
            <Badge size="sm" color={typeColor}>
              {getEncounterTypeLabel(encounter.type)}
            </Badge>
            {encounter.difficulty && (
              <Badge size="sm" color={difficultyColor || '#6B7280'}>
                {getDifficultyLabel(encounter.difficulty)}
              </Badge>
            )}
            {encounter.status === 'used' && (
              <Badge size="sm" color="#10B981">Used</Badge>
            )}
            {encounter.status === 'skipped' && (
              <Badge size="sm" color="#6B7280">Skipped</Badge>
            )}
          </div>

          {/* Name */}
          <h3 className="font-medium text-white mb-1">{encounter.name}</h3>

          {/* Summary */}
          {encounter.summary && (
            <p className="text-sm text-gray-400 line-clamp-2 mb-2">
              {encounter.summary}
            </p>
          )}

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
            {location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {location.name}
              </span>
            )}
            {quest && (
              <span className="flex items-center gap-1">
                <Target className="w-3 h-3" />
                {quest.name}
              </span>
            )}
            {enemyCount > 0 && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {enemyCount} {enemyCount === 1 ? 'enemy' : 'enemies'}
              </span>
            )}
            {encounter.xp_reward && (
              <span className="flex items-center gap-1">
                <Gift className="w-3 h-3" />
                {encounter.xp_reward} XP
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Encounter View Modal (Trello-style)
function EncounterViewModal({
  encounter,
  location,
  quest,
  onClose,
  onEdit,
  onDelete,
  canEdit,
}: {
  encounter: Encounter
  location?: Location
  quest?: Quest
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
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70" />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#1a1a24] rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Color bar */}
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
                <Badge size="sm" color={
                  encounter.status === 'used' ? '#10B981' :
                  encounter.status === 'skipped' ? '#6B7280' : '#8B5CF6'
                }>
                  {getEncounterStatusLabel(encounter.status)}
                </Badge>
              </div>
            </div>
          </div>

          {encounter.summary && (
            <p className="mt-4 text-gray-400">{encounter.summary}</p>
          )}
        </div>

        {/* Content */}
        <div className="px-6 pb-6 space-y-6">
          {/* Boxed Text (Read-aloud) */}
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

          {/* Description */}
          {encounter.description && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Description
              </h4>
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap bg-white/[0.02] rounded-lg p-3">
                {encounter.description}
              </p>
            </div>
          )}

          {/* Enemies */}
          {encounter.enemies && encounter.enemies.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Enemies
              </h4>
              <div className="bg-white/[0.02] rounded-lg p-3 space-y-2">
                {encounter.enemies.map((enemy, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-300">
                        {enemy.name} {enemy.count > 1 && `× ${enemy.count}`}
                      </span>
                    </div>
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

          {/* Two column layout */}
          <div className="grid grid-cols-2 gap-4">
            {/* Tactics */}
            {encounter.tactics && (
              <div className="bg-white/[0.02] rounded-lg p-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Tactics
                </h4>
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{encounter.tactics}</p>
              </div>
            )}

            {/* Terrain */}
            {encounter.terrain && (
              <div className="bg-white/[0.02] rounded-lg p-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Terrain
                </h4>
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{encounter.terrain}</p>
              </div>
            )}
          </div>

          {/* Social encounter fields */}
          {(encounter.stakes || encounter.npc_goals) && (
            <div className="grid grid-cols-2 gap-4">
              {encounter.stakes && (
                <div className="bg-white/[0.02] rounded-lg p-3">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Stakes
                  </h4>
                  <p className="text-sm text-gray-300">{encounter.stakes}</p>
                </div>
              )}
              {encounter.npc_goals && (
                <div className="bg-white/[0.02] rounded-lg p-3">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    NPC Goals
                  </h4>
                  <p className="text-sm text-gray-300">{encounter.npc_goals}</p>
                </div>
              )}
            </div>
          )}

          {/* Location & Quest */}
          {(location || quest) && (
            <div className="grid grid-cols-2 gap-4">
              {location && (
                <div className="bg-white/[0.02] rounded-lg p-3">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Location
                  </h4>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-300">{location.name}</span>
                  </div>
                </div>
              )}
              {quest && (
                <div className="bg-white/[0.02] rounded-lg p-3">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Quest
                  </h4>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-300">{quest.name}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Rewards */}
          {(encounter.rewards || encounter.xp_reward) && (
            <div className="bg-amber-500/10 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Gift className="w-4 h-4" />
                Rewards
              </h4>
              {encounter.rewards && (
                <p className="text-sm text-amber-300/80 mb-2">{encounter.rewards}</p>
              )}
              {encounter.xp_reward && (
                <span className="text-amber-400 font-medium">{encounter.xp_reward} XP</span>
              )}
            </div>
          )}

          {/* Outcome (for used encounters) */}
          {encounter.outcome && (
            <div className="bg-emerald-500/10 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">
                Outcome
              </h4>
              <p className="text-sm text-emerald-300/80">{encounter.outcome}</p>
            </div>
          )}

          {/* Player Notes */}
          {encounter.player_notes && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Player Notes
              </h4>
              <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap bg-white/[0.02] rounded-lg p-3">
                {encounter.player_notes}
              </p>
            </div>
          )}

          {/* DM Notes */}
          {encounter.dm_notes && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                DM Notes
              </h4>
              <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap bg-white/[0.02] rounded-lg p-3">
                {encounter.dm_notes}
              </p>
            </div>
          )}

          {/* Secrets */}
          {encounter.secrets && (
            <div className="bg-red-500/10 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Skull className="w-4 h-4" />
                Secrets (DM Only)
              </h4>
              <p className="text-sm text-red-300/80 leading-relaxed whitespace-pre-wrap">
                {encounter.secrets}
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
      // Auto-expand sections with content
      const sectionsWithContent = new Set<string>()
      if (encounter.description || encounter.boxed_text) sectionsWithContent.add('description')
      if (encounter.difficulty || encounter.enemies?.length || encounter.tactics || encounter.terrain) sectionsWithContent.add('combat')
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={encounter ? 'Edit Encounter' : 'Add Encounter'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto space-y-4 pb-4" style={{ maxHeight: 'calc(70vh - 120px)' }}>
          {/* Essential fields */}
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Encounter Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="form-input"
                placeholder='e.g., "Goblin Ambush", "Audience with the Baron"'
                required
                autoFocus
              />
            </div>

            {/* Type and Status */}
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
                  {ENCOUNTER_TYPES.map(type => (
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
                  {ENCOUNTER_STATUSES.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Summary */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Summary <span className="text-xs text-gray-500 font-normal">(shown in lists)</span>
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

          {/* Collapsible sections */}
          <div className="space-y-2 pt-2">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium px-1">
              Additional Details (click to expand)
            </p>

            {/* Description & Boxed Text */}
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
                    placeholder="Setup, context, and what the DM needs to know..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-amber-400 mb-1">Boxed Text (Read Aloud)</label>
                  <textarea
                    value={formData.boxed_text}
                    onChange={(e) => setFormData({ ...formData, boxed_text: e.target.value })}
                    className="form-input min-h-[80px] border-amber-500/20 focus:border-amber-500/40"
                    placeholder="The text you'll read to players to set the scene..."
                  />
                </div>
              </div>
            </FormSection>

            {/* Combat Details */}
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

                  {/* Enemies */}
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
                          <button
                            type="button"
                            onClick={() => removeEnemy(idx)}
                            className="p-1 text-gray-500 hover:text-red-400"
                          >
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
                      placeholder="How do the enemies fight? What's their strategy?"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Terrain</label>
                    <textarea
                      value={formData.terrain}
                      onChange={(e) => setFormData({ ...formData, terrain: e.target.value })}
                      className="form-input min-h-[60px] text-sm"
                      placeholder="Environmental features, cover, hazards..."
                    />
                  </div>
                </div>
              </FormSection>
            )}

            {/* Social Details */}
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
                      placeholder="What's at risk in this negotiation/conversation?"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">NPC Goals</label>
                    <textarea
                      value={formData.npc_goals}
                      onChange={(e) => setFormData({ ...formData, npc_goals: e.target.value })}
                      className="form-input min-h-[60px] text-sm"
                      placeholder="What does the NPC want from this interaction?"
                    />
                  </div>
                </div>
              </FormSection>
            )}

            {/* Location & Quest */}
            <FormSection
              title="Location & Quest"
              icon={MapPin}
              isOpen={openSections.has('location')}
              onToggle={() => toggleSection('location')}
              preview={
                locations.find(l => l.id === formData.location_id)?.name ||
                quests.find(q => q.id === formData.quest_id)?.name || ''
              }
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
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.type})
                      </option>
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
                      <option key={quest.id} value={quest.id}>
                        {quest.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </FormSection>

            {/* Rewards */}
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
                    placeholder="Treasure, items, information gained..."
                  />
                </div>
              </div>
            </FormSection>

            {/* Session Tracking */}
            <FormSection
              title="Session Tracking"
              icon={Scroll}
              isOpen={openSections.has('session')}
              onToggle={() => toggleSection('session')}
              preview={
                formData.played_session ? `Played: Session ${formData.played_session}` :
                formData.planned_session ? `Planned: Session ${formData.planned_session}` : ''
              }
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

            {/* Outcome (for used encounters) */}
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
                    placeholder="How did it resolve? Victory, defeat, negotiation?"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Player Notes</label>
                  <textarea
                    value={formData.player_notes}
                    onChange={(e) => setFormData({ ...formData, player_notes: e.target.value })}
                    className="form-input min-h-[60px] text-sm"
                    placeholder="Memorable moments, quotes, surprises..."
                  />
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
                    placeholder="Reminders for running this encounter..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-red-400 mb-1 flex items-center gap-1">
                    <Skull className="w-3 h-3" />
                    Secrets (players won't see)
                  </label>
                  <textarea
                    value={formData.secrets}
                    onChange={(e) => setFormData({ ...formData, secrets: e.target.value })}
                    className="form-input min-h-[60px] text-sm border-red-500/20 focus:border-red-500/40"
                    placeholder="Hidden truths, twists, what's really going on..."
                  />
                </div>
              </div>
            </FormSection>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-[--border] bg-[--bg-surface]">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
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

  const { can, loading: permissionsLoading, isMember, isOwner, isDm } = usePermissions(campaignId)

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [encounters, setEncounters] = useState<Encounter[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [quests, setQuests] = useState<Quest[]>([])
  const [loading, setLoading] = useState(true)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Modals
  const [selectedEncounter, setSelectedEncounter] = useState<Encounter | null>(null)
  const [editingEncounter, setEditingEncounter] = useState<Encounter | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Campaign header modals
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [showLabelsModal, setShowLabelsModal] = useState(false)
  const [showFactionsModal, setShowFactionsModal] = useState(false)
  const [showRelationshipsModal, setShowRelationshipsModal] = useState(false)
  const [showResizeModal, setShowResizeModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)

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

    // Load encounters
    const { data: encountersData } = await supabase
      .from('encounters')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })

    setEncounters(encountersData || [])

    // Load locations
    const { data: locationsData } = await supabase
      .from('locations')
      .select('id, name, type')
      .eq('campaign_id', campaignId)
      .order('name')

    setLocations(locationsData || [])

    // Load quests
    const { data: questsData } = await supabase
      .from('quests')
      .select('id, name, type')
      .eq('campaign_id', campaignId)
      .order('name')

    setQuests(questsData || [])

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

    if (typeFilter !== 'all' && encounter.type !== typeFilter) {
      return false
    }

    if (statusFilter !== 'all' && encounter.status !== statusFilter) {
      return false
    }

    return true
  })

  // Group by status
  const preparedEncounters = filteredEncounters.filter(e => e.status === 'prepared')
  const usedEncounters = filteredEncounters.filter(e => e.status === 'used')
  const skippedEncounters = filteredEncounters.filter(e => e.status === 'skipped')

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
          .insert({
            ...data,
            campaign_id: campaignId,
          })

        if (error) throw error
      }

      await loadData()

      if (wasEditing && editedId) {
        const { data: updated } = await supabase
          .from('encounters')
          .select('*')
          .eq('id', editedId)
          .single()

        if (updated) {
          setSelectedEncounter(updated)
        }
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

  // Loading state
  if (loading || permissionsLoading) {
    return (
      <AppLayout campaignId={campaignId}>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-10 h-10 border-2 border-[--arcane-purple] border-t-transparent rounded-full spinner" />
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
          message="You don't have permission to view encounters for this campaign."
        />
      </AppLayout>
    )
  }

  return (
    <AppLayout campaignId={campaignId} hideHeader>
      {/* Page Header */}
      <CampaignPageHeader
        campaign={campaign}
        campaignId={campaignId}
        title="Encounters"
        icon={Swords}
        iconColor="#EF4444"
        isOwner={isOwner}
        isDm={isDm}
        onOpenMembers={() => setShowMembersModal(true)}
        onOpenLabels={() => setShowLabelsModal(true)}
        onOpenFactions={() => setShowFactionsModal(true)}
        onOpenRelationships={() => setShowRelationshipsModal(true)}
        onOpenResize={() => setShowResizeModal(true)}
        onOpenShare={() => setShowShareModal(true)}
        actions={(
          <Button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Encounter</span>
          </Button>
        )}
      />

      <div className="flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-[--border] space-y-4">
          <GuidanceTip
            tipId="encounters_intro"
            title="Plan Your Moments"
            description="Encounters are the exciting moments of your sessions - battles, negotiations, puzzles, and traps. Prepare them ahead of time and track what the party has faced."
            variant="banner"
            showOnce
          />

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none z-10" />
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
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-input w-full sm:w-32"
            >
              <option value="all">All Status</option>
              {ENCOUNTER_STATUSES.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Encounter List */}
        <div className="p-4">
          {encounters.length === 0 ? (
            <EmptyState
              icon={<Swords className="w-12 h-12" />}
              title="No encounters yet"
              description="Plan combat, social, and exploration encounters. Link them to locations and quests, then track what the party has faced."
              tip="Start by creating a few prepared encounters for your next session."
              action={
                <Button onClick={() => setShowAddModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Encounter
                </Button>
              }
            />
          ) : filteredEncounters.length === 0 ? (
            <EmptyState
              icon={<Swords className="w-12 h-12" />}
              title="No matching encounters"
              description="Try adjusting your search or filters"
            />
          ) : (
            <div className="space-y-6">
              {/* Prepared section */}
              {preparedEncounters.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[--arcane-purple]" />
                    Prepared ({preparedEncounters.length})
                  </h2>
                  <div className="space-y-2">
                    {preparedEncounters.map(encounter => (
                      <EncounterCard
                        key={encounter.id}
                        encounter={encounter}
                        location={locations.find(l => l.id === encounter.location_id)}
                        quest={quests.find(q => q.id === encounter.quest_id)}
                        onClick={() => setSelectedEncounter(encounter)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Used section */}
              {usedEncounters.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    Used ({usedEncounters.length})
                  </h2>
                  <div className="space-y-2">
                    {usedEncounters.map(encounter => (
                      <EncounterCard
                        key={encounter.id}
                        encounter={encounter}
                        location={locations.find(l => l.id === encounter.location_id)}
                        quest={quests.find(q => q.id === encounter.quest_id)}
                        onClick={() => setSelectedEncounter(encounter)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Skipped section */}
              {skippedEncounters.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-500" />
                    Skipped ({skippedEncounters.length})
                  </h2>
                  <div className="space-y-2">
                    {skippedEncounters.map(encounter => (
                      <EncounterCard
                        key={encounter.id}
                        encounter={encounter}
                        location={locations.find(l => l.id === encounter.location_id)}
                        quest={quests.find(q => q.id === encounter.quest_id)}
                        onClick={() => setSelectedEncounter(encounter)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* View Modal */}
      {selectedEncounter && (
        <EncounterViewModal
          encounter={selectedEncounter}
          location={locations.find(l => l.id === selectedEncounter.location_id)}
          quest={quests.find(q => q.id === selectedEncounter.quest_id)}
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

      {/* Add/Edit Modal */}
      <EncounterFormModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false)
          setEditingEncounter(null)
        }}
        onSave={handleSave}
        encounter={editingEncounter}
        locations={locations}
        quests={quests}
        saving={saving}
      />

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Encounter"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-300">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-white">{selectedEncounter?.name}</span>?
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

      {/* Campaign header modals */}
      <PartyModal
        campaignId={campaignId}
        characters={[]}
        isOpen={showMembersModal}
        onClose={() => setShowMembersModal(false)}
      />

      {showLabelsModal && (
        <TagManager
          campaignId={campaignId}
          isOpen={showLabelsModal}
          onClose={() => setShowLabelsModal(false)}
        />
      )}

      {showFactionsModal && (
        <FactionManager
          campaignId={campaignId}
          characters={[]}
          isOpen={showFactionsModal}
          onClose={() => setShowFactionsModal(false)}
        />
      )}

      {showRelationshipsModal && (
        <RelationshipManager
          campaignId={campaignId}
          isOpen={showRelationshipsModal}
          onClose={() => setShowRelationshipsModal(false)}
        />
      )}

      {showResizeModal && (
        <ResizeToolbar
          onClose={() => setShowResizeModal(false)}
          characters={[]}
          onResize={async () => {}}
        />
      )}

      {campaign && (
        <UnifiedShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          contentType="campaign"
          contentId={campaignId}
          contentName={campaign.name}
          contentMode="active"
        />
      )}
    </AppLayout>
  )
}

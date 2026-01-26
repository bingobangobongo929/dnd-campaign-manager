'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  MapPin,
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  Building2,
  Mountain,
  Castle,
  Tent,
  Trees,
  Church,
  Store,
  Home as HomeIcon,
  Skull,
  Compass,
  X,
  Eye,
  EyeOff,
  MoreHorizontal,
  Trash2,
  Edit3,
  GitBranch,
  List,
  Target,
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

// Location type icons mapping
const LOCATION_TYPE_ICONS: Record<string, any> = {
  city: Building2,
  town: Building2,
  village: HomeIcon,
  building: Store,
  dungeon: Skull,
  region: Mountain,
  wilderness: Trees,
  landmark: Castle,
  temple: Church,
  tavern: Store,
  camp: Tent,
  other: Compass,
}

// Location type colors
const LOCATION_TYPE_COLORS: Record<string, string> = {
  city: '#8B5CF6',      // Purple
  town: '#6366F1',      // Indigo
  village: '#10B981',   // Emerald
  building: '#F59E0B',  // Amber
  dungeon: '#EF4444',   // Red
  region: '#3B82F6',    // Blue
  wilderness: '#22C55E', // Green
  landmark: '#D4A843',  // Gold
  temple: '#EC4899',    // Pink
  tavern: '#F97316',    // Orange
  camp: '#84CC16',      // Lime
  other: '#6B7280',     // Gray
}

const LOCATION_TYPES = [
  { value: 'region', label: 'Region' },
  { value: 'city', label: 'City' },
  { value: 'town', label: 'Town' },
  { value: 'village', label: 'Village' },
  { value: 'building', label: 'Building' },
  { value: 'tavern', label: 'Tavern' },
  { value: 'temple', label: 'Temple' },
  { value: 'dungeon', label: 'Dungeon' },
  { value: 'wilderness', label: 'Wilderness' },
  { value: 'landmark', label: 'Landmark' },
  { value: 'camp', label: 'Camp' },
  { value: 'other', label: 'Other' },
]

interface Location {
  id: string
  campaign_id: string | null
  oneshot_id: string | null
  name: string
  description: string | null
  location_type: string
  parent_id: string | null
  map_id: string | null
  map_coordinates: { x: number; y: number } | null
  is_visited: boolean
  is_known: boolean
  current_characters: string[] | null
  tags: string[] | null
  secrets: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // Computed in frontend
  children?: Location[]
  depth?: number
}

interface QuestAtLocation {
  id: string
  name: string
  type: string
  status: string
  quest_giver_location_id: string | null
  objective_location_id: string | null
}

// Tree node component for hierarchical view
function LocationTreeNode({
  location,
  allLocations,
  depth = 0,
  expandedIds,
  toggleExpanded,
  onSelect,
  selectedId,
}: {
  location: Location
  allLocations: Location[]
  depth?: number
  expandedIds: Set<string>
  toggleExpanded: (id: string) => void
  onSelect: (location: Location) => void
  selectedId: string | null
}) {
  const children = allLocations.filter(l => l.parent_id === location.id)
  const hasChildren = children.length > 0
  const isExpanded = expandedIds.has(location.id)
  const isSelected = selectedId === location.id

  const Icon = LOCATION_TYPE_ICONS[location.location_type] || Compass
  const color = LOCATION_TYPE_COLORS[location.location_type] || '#6B7280'

  return (
    <div className="select-none">
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 group',
          isSelected
            ? 'bg-[--arcane-purple]/20 border border-[--arcane-purple]/40'
            : 'hover:bg-white/[0.04] border border-transparent'
        )}
        style={{ paddingLeft: `${depth * 20 + 12}px` }}
        onClick={() => onSelect(location)}
      >
        {/* Expand/collapse button */}
        <button
          className={cn(
            'w-5 h-5 flex items-center justify-center rounded transition-colors',
            hasChildren ? 'hover:bg-white/10' : 'opacity-0'
          )}
          onClick={(e) => {
            e.stopPropagation()
            if (hasChildren) toggleExpanded(location.id)
          }}
        >
          {hasChildren && (
            isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )
          )}
        </button>

        {/* Icon */}
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>

        {/* Name and type */}
        <div className="flex-1 min-w-0">
          <p className={cn(
            'font-medium truncate',
            isSelected ? 'text-white' : 'text-gray-200'
          )}>
            {location.name}
          </p>
        </div>

        {/* Status indicators */}
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {location.is_visited && (
            <Tooltip content="Visited">
              <div className="w-5 h-5 rounded flex items-center justify-center bg-emerald-500/20">
                <Eye className="w-3 h-3 text-emerald-400" />
              </div>
            </Tooltip>
          )}
          {!location.is_known && (
            <Tooltip content="Hidden from players">
              <div className="w-5 h-5 rounded flex items-center justify-center bg-amber-500/20">
                <EyeOff className="w-3 h-3 text-amber-400" />
              </div>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="relative">
          {/* Connecting line */}
          <div
            className="absolute left-0 top-0 bottom-0 w-px bg-white/10"
            style={{ marginLeft: `${depth * 20 + 24}px` }}
          />
          {children.map(child => (
            <LocationTreeNode
              key={child.id}
              location={child}
              allLocations={allLocations}
              depth={depth + 1}
              expandedIds={expandedIds}
              toggleExpanded={toggleExpanded}
              onSelect={onSelect}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Location card for list view
function LocationCard({
  location,
  parentName,
  onSelect,
  isSelected,
}: {
  location: Location
  parentName?: string
  onSelect: (location: Location) => void
  isSelected: boolean
}) {
  const Icon = LOCATION_TYPE_ICONS[location.location_type] || Compass
  const color = LOCATION_TYPE_COLORS[location.location_type] || '#6B7280'

  return (
    <div
      className={cn(
        'p-4 rounded-xl cursor-pointer transition-all duration-200 group',
        isSelected
          ? 'bg-[--arcane-purple]/15 border border-[--arcane-purple]/40 shadow-lg shadow-purple-500/10'
          : 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.1]'
      )}
      onClick={() => onSelect(location)}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
          style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-white truncate">{location.name}</h3>
            <Badge size="sm" color={color}>
              {location.location_type}
            </Badge>
          </div>

          {parentName && (
            <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              in {parentName}
            </p>
          )}

          {location.description && (
            <p className="text-sm text-gray-400 line-clamp-2">
              {location.description}
            </p>
          )}

          {/* Tags */}
          {location.tags && location.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {location.tags.slice(0, 3).map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 text-xs rounded-full bg-white/5 text-gray-400"
                >
                  {tag}
                </span>
              ))}
              {location.tags.length > 3 && (
                <span className="px-2 py-0.5 text-xs text-gray-500">
                  +{location.tags.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Status indicators */}
        <div className="flex flex-col gap-1">
          {location.is_visited && (
            <Tooltip content="Visited">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-emerald-500/20">
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
              </div>
            </Tooltip>
          )}
          {!location.is_known && (
            <Tooltip content="Hidden from players">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-amber-500/20">
                <EyeOff className="w-3.5 h-3.5 text-amber-400" />
              </div>
            </Tooltip>
          )}
          {location.secrets && (
            <Tooltip content="Has secrets">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-red-500/20">
                <Skull className="w-3.5 h-3.5 text-red-400" />
              </div>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  )
}

// Detail panel component
function LocationDetailPanel({
  location,
  locations,
  quests,
  onClose,
  onEdit,
  onDelete,
  canEdit,
}: {
  location: Location
  locations: Location[]
  quests: QuestAtLocation[]
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  canEdit: boolean
}) {
  const Icon = LOCATION_TYPE_ICONS[location.location_type] || Compass
  const color = LOCATION_TYPE_COLORS[location.location_type] || '#6B7280'
  const parent = locations.find(l => l.id === location.parent_id)
  const children = locations.filter(l => l.parent_id === location.id)

  // Find quests at this location (either as quest giver location or objective location)
  const questsAtLocation = quests.filter(
    q => q.quest_giver_location_id === location.id || q.objective_location_id === location.id
  )

  return (
    <div className="h-full flex flex-col bg-[--bg-surface] border-l border-[--border]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[--border]">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${color}20` }}
          >
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          <div>
            <h2 className="font-semibold text-white">{location.name}</h2>
            <p className="text-xs text-gray-500 capitalize">{location.location_type}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {canEdit && (
            <>
              <button
                onClick={onEdit}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={onDelete}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Status badges */}
        <div className="flex flex-wrap gap-2">
          <div
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm',
              location.is_visited
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-gray-500/20 text-gray-400'
            )}
          >
            <Eye className="w-4 h-4" />
            {location.is_visited ? 'Visited' : 'Not Visited'}
          </div>
          <div
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm',
              location.is_known
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-amber-500/20 text-amber-400'
            )}
          >
            {location.is_known ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {location.is_known ? 'Known to Players' : 'Hidden'}
          </div>
        </div>

        {/* Parent location */}
        {parent && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Located In
            </h4>
            <div className="flex items-center gap-2 p-2 bg-white/[0.02] rounded-lg">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-300">{parent.name}</span>
              <Badge size="sm" color={LOCATION_TYPE_COLORS[parent.location_type]}>
                {parent.location_type}
              </Badge>
            </div>
          </div>
        )}

        {/* Description */}
        {location.description && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Description
            </h4>
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
              {location.description}
            </p>
          </div>
        )}

        {/* Child locations */}
        {children.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Contains ({children.length})
            </h4>
            <div className="space-y-1">
              {children.map(child => {
                const ChildIcon = LOCATION_TYPE_ICONS[child.location_type] || Compass
                const childColor = LOCATION_TYPE_COLORS[child.location_type] || '#6B7280'
                return (
                  <div
                    key={child.id}
                    className="flex items-center gap-2 p-2 bg-white/[0.02] rounded-lg"
                  >
                    <ChildIcon className="w-4 h-4" style={{ color: childColor }} />
                    <span className="text-sm text-gray-300">{child.name}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Tags */}
        {location.tags && location.tags.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Tags
            </h4>
            <div className="flex flex-wrap gap-2">
              {location.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 text-sm rounded-full bg-white/5 text-gray-300 border border-white/10"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {location.notes && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Notes
            </h4>
            <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap">
              {location.notes}
            </p>
          </div>
        )}

        {/* Quests at this location */}
        {questsAtLocation.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Quests Here ({questsAtLocation.length})
            </h4>
            <div className="space-y-2">
              {questsAtLocation.map(quest => (
                <div
                  key={quest.id}
                  className="flex items-center gap-2 p-2 bg-purple-500/5 border border-purple-500/20 rounded-lg"
                >
                  <Target className="w-4 h-4 text-purple-400" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-300 truncate block">{quest.name}</span>
                    <span className="text-xs text-gray-500">
                      {quest.quest_giver_location_id === location.id && quest.objective_location_id === location.id
                        ? 'Quest giver & Objective'
                        : quest.quest_giver_location_id === location.id
                        ? 'Quest giver here'
                        : 'Objective here'}
                    </span>
                  </div>
                  <Badge size="sm" color={quest.status === 'active' ? '#8B5CF6' : '#6B7280'}>
                    {quest.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Secrets - DM only section */}
        {location.secrets && (
          <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
            <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Skull className="w-4 h-4" />
              Secrets (DM Only)
            </h4>
            <p className="text-sm text-red-300/80 leading-relaxed whitespace-pre-wrap">
              {location.secrets}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// Add/Edit location modal
function LocationFormModal({
  isOpen,
  onClose,
  onSave,
  location,
  locations,
  saving,
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<Location>) => void
  location?: Location | null
  locations: Location[]
  saving: boolean
}) {
  const [formData, setFormData] = useState({
    name: '',
    location_type: 'building',
    parent_id: '',
    description: '',
    is_visited: false,
    is_known: true,
    tags: '',
    notes: '',
    secrets: '',
  })

  useEffect(() => {
    if (location) {
      setFormData({
        name: location.name,
        location_type: location.location_type,
        parent_id: location.parent_id || '',
        description: location.description || '',
        is_visited: location.is_visited,
        is_known: location.is_known,
        tags: location.tags?.join(', ') || '',
        notes: location.notes || '',
        secrets: location.secrets || '',
      })
    } else {
      setFormData({
        name: '',
        location_type: 'building',
        parent_id: '',
        description: '',
        is_visited: false,
        is_known: true,
        tags: '',
        notes: '',
        secrets: '',
      })
    }
  }, [location, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      name: formData.name,
      location_type: formData.location_type,
      parent_id: formData.parent_id || null,
      description: formData.description || null,
      is_visited: formData.is_visited,
      is_known: formData.is_known,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : null,
      notes: formData.notes || null,
      secrets: formData.secrets || null,
    })
  }

  // Filter out current location and its descendants for parent selection
  const getDescendantIds = (id: string): string[] => {
    const children = locations.filter(l => l.parent_id === id)
    return [id, ...children.flatMap(c => getDescendantIds(c.id))]
  }
  const excludeIds = location ? getDescendantIds(location.id) : []
  const availableParents = locations.filter(l => !excludeIds.includes(l.id))

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={location ? 'Edit Location' : 'Add Location'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name and Type row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="form-input"
              placeholder="The Rusty Nail"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Type <span className="text-red-400">*</span>
            </label>
            <select
              value={formData.location_type}
              onChange={(e) => setFormData({ ...formData, location_type: e.target.value })}
              className="form-input"
            >
              {LOCATION_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Parent location */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Located In
          </label>
          <select
            value={formData.parent_id}
            onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
            className="form-input"
          >
            <option value="">None (Top Level)</option>
            {availableParents.map(loc => (
              <option key={loc.id} value={loc.id}>
                {loc.name} ({loc.location_type})
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="form-input min-h-[100px]"
            placeholder="A weathered tavern at the crossroads, known for its hearty stew and questionable clientele..."
          />
        </div>

        {/* Status toggles */}
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_visited}
              onChange={(e) => setFormData({ ...formData, is_visited: e.target.checked })}
              className="form-checkbox"
            />
            <span className="text-sm text-gray-300">Party has visited</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_known}
              onChange={(e) => setFormData({ ...formData, is_known: e.target.checked })}
              className="form-checkbox"
            />
            <span className="text-sm text-gray-300">Known to players</span>
          </label>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Tags
          </label>
          <input
            type="text"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            className="form-input"
            placeholder="safe haven, merchant district, quest location"
          />
          <p className="text-xs text-gray-500 mt-1">Separate tags with commas</p>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="form-input min-h-[80px]"
            placeholder="General notes about this location..."
          />
        </div>

        {/* Secrets */}
        <div>
          <label className="block text-sm font-medium text-red-400 mb-1.5 flex items-center gap-2">
            <Skull className="w-4 h-4" />
            Secrets (DM Only)
          </label>
          <textarea
            value={formData.secrets}
            onChange={(e) => setFormData({ ...formData, secrets: e.target.value })}
            className="form-input min-h-[80px] border-red-500/30 focus:border-red-500/50"
            placeholder="Hidden information that players don't know yet..."
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-[--border]">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {location ? 'Save Changes' : 'Add Location'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function LocationsPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = useSupabase()
  const { user } = useUser()

  const campaignId = params.id as string

  // Permissions
  const { can, loading: permissionsLoading, isMember, isOwner, isDm } = usePermissions(campaignId)

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [quests, setQuests] = useState<QuestAtLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('list')

  // Selection and modals
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Tree view state
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

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
    // Only show loading spinner on initial load, not refetches
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

    // Load locations
    const { data: locationsData } = await supabase
      .from('locations')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('name')

    setLocations(locationsData || [])

    // Load quests (for "Quests at this location" display)
    const { data: questsData } = await supabase
      .from('quests')
      .select('id, name, type, status, quest_giver_location_id, objective_location_id')
      .eq('campaign_id', campaignId)
      .in('status', ['available', 'active'])
      .order('name')

    setQuests(questsData || [])

    // Expand root nodes by default (only on first load)
    if (locationsData && !hasLoadedOnce) {
      const rootIds = locationsData
        .filter(l => !l.parent_id)
        .map(l => l.id)
      setExpandedIds(new Set(rootIds))
    }

    setLoading(false)
    setHasLoadedOnce(true)
  }

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Filter locations
  const filteredLocations = locations.filter(location => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        location.name.toLowerCase().includes(query) ||
        location.description?.toLowerCase().includes(query) ||
        location.tags?.some(t => t.toLowerCase().includes(query))
      if (!matchesSearch) return false
    }

    // Type filter
    if (typeFilter !== 'all' && location.location_type !== typeFilter) {
      return false
    }

    return true
  })

  // Get root locations for tree view
  const rootLocations = filteredLocations.filter(l => !l.parent_id)

  // Get parent name helper
  const getParentName = (parentId: string | null) => {
    if (!parentId) return undefined
    return locations.find(l => l.id === parentId)?.name
  }

  // Save location
  const handleSave = async (data: Partial<Location>) => {
    setSaving(true)
    try {
      if (editingLocation) {
        // Update
        const { error } = await supabase
          .from('locations')
          .update(data)
          .eq('id', editingLocation.id)

        if (error) throw error
      } else {
        // Insert
        const { error } = await supabase
          .from('locations')
          .insert({
            ...data,
            campaign_id: campaignId,
          })

        if (error) throw error
      }

      await loadData()
      setShowAddModal(false)
      setEditingLocation(null)
    } catch (err) {
      console.error('Failed to save location:', err)
    } finally {
      setSaving(false)
    }
  }

  // Delete location
  const handleDelete = async () => {
    if (!selectedLocation) return
    setDeleting(true)
    try {
      const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', selectedLocation.id)

      if (error) throw error

      await loadData()
      setSelectedLocation(null)
      setShowDeleteModal(false)
    } catch (err) {
      console.error('Failed to delete location:', err)
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
          message="You don't have permission to view locations for this campaign."
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
        title="Locations"
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
            <span className="hidden sm:inline">Add Location</span>
          </Button>
        )}
      />

      <div className="flex h-[calc(100vh-56px)]">
        {/* Main content */}
        <div className={cn(
          'flex-1 overflow-hidden flex flex-col',
          selectedLocation ? 'hidden md:flex' : ''
        )}>
          {/* Toolbar */}
          <div className="p-4 border-b border-[--border] space-y-4">
            <GuidanceTip
              tipId="locations_intro"
              title="Track Your World"
              description="Locations form the geography of your campaign. Create a hierarchy from regions to individual buildings, and track which places your party has visited."
              variant="banner"
              showOnce
            />

            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search locations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input pl-10 w-full"
                />
              </div>

              {/* Type filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="form-input w-full sm:w-40"
              >
                <option value="all">All Types</option>
                {LOCATION_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>

              {/* View toggle */}
              <div className="flex rounded-lg border border-[--border] overflow-hidden">
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 text-sm transition-colors',
                    viewMode === 'list'
                      ? 'bg-[--arcane-purple]/20 text-[--arcane-purple]'
                      : 'text-gray-400 hover:bg-white/5'
                  )}
                >
                  <List className="w-4 h-4" />
                  List
                </button>
                <button
                  onClick={() => setViewMode('tree')}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 text-sm transition-colors border-l border-[--border]',
                    viewMode === 'tree'
                      ? 'bg-[--arcane-purple]/20 text-[--arcane-purple]'
                      : 'text-gray-400 hover:bg-white/5'
                  )}
                >
                  <GitBranch className="w-4 h-4" />
                  Tree
                </button>
              </div>
            </div>
          </div>

          {/* Location list/tree */}
          <div className="flex-1 overflow-y-auto p-4">
            {filteredLocations.length === 0 ? (
              <EmptyState
                icon={<MapPin className="w-12 h-12" />}
                title={searchQuery || typeFilter !== 'all' ? 'No matching locations' : 'No locations yet'}
                description={
                  searchQuery || typeFilter !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Start building your world by adding locations. Create regions, cities, dungeons, and more.'
                }
                tip="Locations can be organized hierarchically - put a tavern inside a city, inside a kingdom."
                action={
                  !searchQuery && typeFilter === 'all' && (
                    <Button onClick={() => setShowAddModal(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Location
                    </Button>
                  )
                }
              />
            ) : viewMode === 'tree' ? (
              <div className="space-y-1">
                {rootLocations.map(location => (
                  <LocationTreeNode
                    key={location.id}
                    location={location}
                    allLocations={filteredLocations}
                    expandedIds={expandedIds}
                    toggleExpanded={toggleExpanded}
                    onSelect={setSelectedLocation}
                    selectedId={selectedLocation?.id || null}
                  />
                ))}
                {/* Show orphaned locations (parent filtered out) */}
                {filteredLocations
                  .filter(l => l.parent_id && !filteredLocations.find(p => p.id === l.parent_id))
                  .map(location => (
                    <LocationTreeNode
                      key={location.id}
                      location={location}
                      allLocations={filteredLocations}
                      expandedIds={expandedIds}
                      toggleExpanded={toggleExpanded}
                      onSelect={setSelectedLocation}
                      selectedId={selectedLocation?.id || null}
                    />
                  ))
                }
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredLocations.map(location => (
                  <LocationCard
                    key={location.id}
                    location={location}
                    parentName={getParentName(location.parent_id)}
                    onSelect={setSelectedLocation}
                    isSelected={selectedLocation?.id === location.id}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detail panel */}
        {selectedLocation && (
          <div className="w-full md:w-96 flex-shrink-0">
            <LocationDetailPanel
              location={selectedLocation}
              locations={locations}
              quests={quests}
              onClose={() => setSelectedLocation(null)}
              onEdit={() => {
                setEditingLocation(selectedLocation)
                setShowAddModal(true)
              }}
              onDelete={() => setShowDeleteModal(true)}
              canEdit={isDm || isOwner}
            />
          </div>
        )}
      </div>

      <BackToTopButton />

      {/* Add/Edit Modal */}
      <LocationFormModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false)
          setEditingLocation(null)
        }}
        onSave={handleSave}
        location={editingLocation}
        locations={locations}
        saving={saving}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Location"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-300">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-white">{selectedLocation?.name}</span>?
          </p>
          {locations.filter(l => l.parent_id === selectedLocation?.id).length > 0 && (
            <p className="text-amber-400 text-sm">
              This location has child locations. They will become top-level locations.
            </p>
          )}
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

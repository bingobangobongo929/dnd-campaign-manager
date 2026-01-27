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
  Swords,
} from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Button, Modal, EmptyState, Badge, Tooltip, AccessDeniedPage } from '@/components/ui'
import { GuidanceTip } from '@/components/guidance/GuidanceTip'
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
  type: string
  description: string | null
  summary: string | null
  parent_location_id: string | null
  map_id: string | null
  map_pin_x: number | null
  map_pin_y: number | null
  status: string
  visibility: string
  discovered_session: number | null
  dm_notes: string | null
  secrets: string | null
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

interface EncounterAtLocation {
  id: string
  name: string
  type: string
  status: string
  difficulty: string | null
  location_id: string | null
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
  const children = allLocations.filter(l => l.parent_location_id === location.id)
  const hasChildren = children.length > 0
  const isExpanded = expandedIds.has(location.id)
  const isSelected = selectedId === location.id

  const Icon = LOCATION_TYPE_ICONS[location.type] || Compass
  const color = LOCATION_TYPE_COLORS[location.type] || '#6B7280'

  return (
    <div className="select-none">
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 group',
          isSelected
            ? 'bg-[--arcane-purple]/15 ring-1 ring-[--arcane-purple]/40'
            : 'hover:bg-white/[0.04]'
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
          {location.visibility === 'dm_only' && (
            <Tooltip content="DM Only">
              <div className="w-5 h-5 rounded flex items-center justify-center bg-amber-500/20">
                <EyeOff className="w-3 h-3 text-amber-400" />
              </div>
            </Tooltip>
          )}
          {location.secrets && (
            <Tooltip content="Has secrets">
              <div className="w-5 h-5 rounded flex items-center justify-center bg-red-500/20">
                <Skull className="w-3 h-3 text-red-400" />
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
  const Icon = LOCATION_TYPE_ICONS[location.type] || Compass
  const color = LOCATION_TYPE_COLORS[location.type] || '#6B7280'

  return (
    <div
      className={cn(
        'p-4 rounded-xl cursor-pointer transition-all duration-200 group',
        isSelected
          ? 'bg-[--arcane-purple]/15 ring-1 ring-[--arcane-purple]/40 shadow-lg shadow-purple-500/10'
          : 'bg-white/[0.03] hover:bg-white/[0.05]'
      )}
      onClick={() => onSelect(location)}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-white truncate">{location.name}</h3>
            <Badge size="sm" color={color}>
              {location.type}
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
        </div>

        {/* Status indicators */}
        <div className="flex flex-col gap-1">
          {location.visibility === 'dm_only' && (
            <Tooltip content="DM Only">
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

// Location View Modal (replaces sidebar panel)
function LocationViewModal({
  location,
  locations,
  quests,
  encounters,
  onClose,
  onEdit,
  onDelete,
  canEdit,
}: {
  location: Location
  locations: Location[]
  quests: QuestAtLocation[]
  encounters: EncounterAtLocation[]
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  canEdit: boolean
}) {
  const Icon = LOCATION_TYPE_ICONS[location.type] || Compass
  const color = LOCATION_TYPE_COLORS[location.type] || '#6B7280'
  const parent = locations.find(l => l.id === location.parent_location_id)
  const children = locations.filter(l => l.parent_location_id === location.id)

  // Find quests at this location (either as quest giver location or objective location)
  const questsAtLocation = quests.filter(
    q => q.quest_giver_location_id === location.id || q.objective_location_id === location.id
  )

  // Find encounters at this location
  const encountersAtLocation = encounters.filter(e => e.location_id === location.id)

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
          style={{ backgroundColor: color }}
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
              style={{ backgroundColor: `${color}20` }}
            >
              <Icon className="w-6 h-6" style={{ color }} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-white mb-2">{location.name}</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge size="sm" color={color}>
                  {location.type}
                </Badge>
                {location.visibility === 'dm_only' && (
                  <Badge size="sm" color="#F59E0B">DM only</Badge>
                )}
                {location.visibility === 'party' && (
                  <Badge size="sm" color="#10B981">visible to party</Badge>
                )}
                {location.secrets && (
                  <Badge size="sm" color="#EF4444">has secrets</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Parent location */}
          {parent && (
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-400">
              <MapPin className="w-4 h-4" />
              <span>Located in</span>
              <span className="text-gray-300">{parent.name}</span>
              <Badge size="sm" color={LOCATION_TYPE_COLORS[parent.type]}>
                {parent.type}
              </Badge>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-6 pb-6 space-y-6">
          {/* Description */}
          {location.description && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Description
              </h4>
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap bg-white/[0.02] rounded-lg p-3">
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
              <div className="grid grid-cols-2 gap-2">
                {children.map(child => {
                  const ChildIcon = LOCATION_TYPE_ICONS[child.type] || Compass
                  const childColor = LOCATION_TYPE_COLORS[child.type] || '#6B7280'
                  return (
                    <div
                      key={child.id}
                      className="flex items-center gap-2 p-2 bg-white/[0.02] rounded-lg"
                    >
                      <ChildIcon className="w-4 h-4" style={{ color: childColor }} />
                      <span className="text-sm text-gray-300 truncate">{child.name}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* DM Notes */}
          {location.dm_notes && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                DM Notes
              </h4>
              <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap bg-white/[0.02] rounded-lg p-3">
                {location.dm_notes}
              </p>
            </div>
          )}

          {/* Quests at this location */}
          {questsAtLocation.length > 0 && (
            <div className="bg-purple-500/10 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Quests Here ({questsAtLocation.length})
              </h4>
              <div className="space-y-2">
                {questsAtLocation.map(quest => (
                  <div
                    key={quest.id}
                    className="flex items-center gap-2 p-2 bg-white/[0.02] rounded-lg"
                  >
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

          {/* Encounters at this location */}
          {encountersAtLocation.length > 0 && (
            <div className="bg-red-500/10 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Swords className="w-4 h-4" />
                Encounters Here ({encountersAtLocation.length})
              </h4>
              <div className="space-y-2">
                {encountersAtLocation.map(encounter => (
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

          {/* Secrets - DM only section */}
          {location.secrets && (
            <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
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
              Edit Location
            </Button>
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
    type: 'building',
    parent_location_id: '',
    description: '',
    dm_notes: '',
    secrets: '',
    visibility: 'dm_only',
  })

  useEffect(() => {
    if (location) {
      setFormData({
        name: location.name,
        type: location.type || 'building',
        parent_location_id: location.parent_location_id || '',
        description: location.description || '',
        dm_notes: location.dm_notes || '',
        secrets: location.secrets || '',
        visibility: location.visibility || 'dm_only',
      })
    } else {
      setFormData({
        name: '',
        type: 'building',
        parent_location_id: '',
        description: '',
        dm_notes: '',
        secrets: '',
        visibility: 'dm_only',
      })
    }
  }, [location, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      name: formData.name,
      type: formData.type,
      parent_location_id: formData.parent_location_id || null,
      description: formData.description || null,
      dm_notes: formData.dm_notes || null,
      secrets: formData.secrets || null,
      visibility: formData.visibility,
    } as Partial<Location>)
  }

  // Filter out current location and its descendants for parent selection
  const getDescendantIds = (id: string): string[] => {
    const children = locations.filter(l => l.parent_location_id === id)
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
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
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
            value={formData.parent_location_id}
            onChange={(e) => setFormData({ ...formData, parent_location_id: e.target.value })}
            className="form-input"
          >
            <option value="">None (Top Level)</option>
            {availableParents.map(loc => (
              <option key={loc.id} value={loc.id}>
                {loc.name} ({loc.type})
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

        {/* Visibility */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Visibility
          </label>
          <select
            value={formData.visibility}
            onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
            className="form-input"
          >
            <option value="dm_only">DM Only</option>
            <option value="party">Visible to Party</option>
            <option value="public">Public</option>
          </select>
        </div>

        {/* DM Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            DM Notes
          </label>
          <textarea
            value={formData.dm_notes}
            onChange={(e) => setFormData({ ...formData, dm_notes: e.target.value })}
            className="form-input min-h-[80px]"
            placeholder="Notes for running this location..."
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
  const [encounters, setEncounters] = useState<EncounterAtLocation[]>([])
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

    // Load encounters (for "Encounters at this location" display)
    const { data: encountersData } = await supabase
      .from('encounters')
      .select('id, name, type, status, difficulty, location_id')
      .eq('campaign_id', campaignId)
      .not('location_id', 'is', null)
      .order('name')

    setEncounters(encountersData || [])

    // Expand root nodes by default (only on first load)
    if (locationsData && !hasLoadedOnce) {
      const rootIds = locationsData
        .filter(l => !l.parent_location_id)
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
        location.dm_notes?.toLowerCase().includes(query)
      if (!matchesSearch) return false
    }

    // Type filter
    if (typeFilter !== 'all' && location.type !== typeFilter) {
      return false
    }

    return true
  })

  // Get root locations for tree view
  const rootLocations = filteredLocations.filter(l => !l.parent_location_id)

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

  // Page actions for top bar
  const pageActions = (
    <Button
      onClick={() => setShowAddModal(true)}
      className="flex items-center gap-2"
    >
      <Plus className="w-4 h-4" />
      <span className="hidden sm:inline">Add Location</span>
    </Button>
  )

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
    <AppLayout campaignId={campaignId} topBarActions={pageActions}>
      <div className="flex flex-col">
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
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none z-10" />
                <input
                  type="text"
                  placeholder="Search locations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input w-full"
                  style={{ paddingLeft: '2.5rem' }}
                />
              </div>

              {/* Type filter - compact */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="form-input w-full sm:w-28"
              >
                <option value="all">All Types</option>
                {LOCATION_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>

              {/* View toggle */}
              <div className="flex rounded-lg border border-[--border] overflow-hidden flex-shrink-0">
                <Tooltip content="Card list view">
                  <button
                    onClick={() => setViewMode('list')}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 text-sm transition-colors whitespace-nowrap',
                      viewMode === 'list'
                        ? 'bg-[--arcane-purple]/20 text-[--arcane-purple]'
                        : 'text-gray-400 hover:bg-white/5'
                    )}
                  >
                    <List className="w-4 h-4" />
                    <span className="hidden sm:inline">List</span>
                  </button>
                </Tooltip>
                <Tooltip content="Hierarchical tree view">
                  <button
                    onClick={() => setViewMode('tree')}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 text-sm transition-colors border-l border-[--border] whitespace-nowrap',
                      viewMode === 'tree'
                        ? 'bg-[--arcane-purple]/20 text-[--arcane-purple]'
                        : 'text-gray-400 hover:bg-white/5'
                    )}
                  >
                    <GitBranch className="w-4 h-4" />
                    <span className="hidden sm:inline">Tree</span>
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>

          {/* Location list/tree */}
          <div className="p-4">
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
                  .filter(l => l.parent_location_id && !filteredLocations.find(p => p.id === l.parent_location_id))
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
                    parentName={getParentName(location.parent_location_id)}
                    onSelect={setSelectedLocation}
                    isSelected={selectedLocation?.id === location.id}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

      {/* Location View Modal */}
      {selectedLocation && (
        <LocationViewModal
          location={selectedLocation}
          locations={locations}
          quests={quests}
          encounters={encounters}
          onClose={() => setSelectedLocation(null)}
          onEdit={() => {
            setEditingLocation(selectedLocation)
            setShowAddModal(true)
            setSelectedLocation(null)
          }}
          onDelete={() => setShowDeleteModal(true)}
          canEdit={isDm || isOwner}
        />
      )}

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
          {locations.filter(l => l.parent_location_id === selectedLocation?.id).length > 0 && (
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
    </AppLayout>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  EyeOff,
  Trash2,
  Edit3,
  GitBranch,
  List,
  Target,
  Swords,
  Map as MapIcon,
  Clock,
  Users as UsersIcon,
} from 'lucide-react'
import { Button, Modal, Badge, Tooltip } from '@/components/ui'
import { EmptyWorldState } from './EmptyWorldState'
import { useSupabase } from '@/hooks'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'

// Location type icons mapping
export const LOCATION_TYPE_ICONS: Record<string, any> = {
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
export const LOCATION_TYPE_COLORS: Record<string, string> = {
  city: '#8B5CF6',
  town: '#6366F1',
  village: '#10B981',
  building: '#F59E0B',
  dungeon: '#EF4444',
  region: '#3B82F6',
  wilderness: '#22C55E',
  landmark: '#D4A843',
  temple: '#EC4899',
  tavern: '#F97316',
  camp: '#84CC16',
  other: '#6B7280',
}

export const LOCATION_TYPES = [
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

export interface Location {
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

interface TimelineEventAtLocation {
  id: string
  title: string
  event_date: string | null
  session_number: number | null
}

interface CharacterAtLocation {
  id: string
  name: string
  type: string
  image_url: string | null
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

        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>

        <div className="flex-1 min-w-0">
          <p className={cn(
            'font-medium truncate',
            isSelected ? 'text-white' : 'text-gray-200'
          )}>
            {location.name}
          </p>
        </div>

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

      {hasChildren && isExpanded && (
        <div className="relative">
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
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </div>

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

// Location View Modal
function LocationViewModal({
  location,
  locations,
  quests,
  encounters,
  timelineEvents,
  npcsPresent,
  campaignId,
  onClose,
  onEdit,
  onDelete,
  canEdit,
  isDm,
}: {
  location: Location
  locations: Location[]
  quests: QuestAtLocation[]
  encounters: EncounterAtLocation[]
  timelineEvents: TimelineEventAtLocation[]
  npcsPresent: CharacterAtLocation[]
  campaignId: string
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  canEdit: boolean
  isDm: boolean
}) {
  const router = useRouter()
  const Icon = LOCATION_TYPE_ICONS[location.type] || Compass
  const color = LOCATION_TYPE_COLORS[location.type] || '#6B7280'
  const parent = locations.find(l => l.id === location.parent_location_id)
  const children = locations.filter(l => l.parent_location_id === location.id)

  const questsAtLocation = quests.filter(
    q => q.quest_giver_location_id === location.id || q.objective_location_id === location.id
  )
  const encountersAtLocation = encounters.filter(e => e.location_id === location.id)

  const handleViewOnMap = () => {
    if (location.map_id) {
      router.push(`/campaigns/${campaignId}/map?mapId=${location.map_id}&locationId=${location.id}`)
    }
  }

  const handleViewTimeline = () => {
    router.push(`/campaigns/${campaignId}/timeline?locationId=${location.id}`)
  }

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
        <div
          className="h-2 rounded-t-xl"
          style={{ backgroundColor: color }}
        />

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
                {isDm && location.visibility === 'dm_only' && (
                  <Badge size="sm" color="#F59E0B">DM only</Badge>
                )}
                {location.visibility === 'party' && (
                  <Badge size="sm" color="#10B981">visible to party</Badge>
                )}
                {isDm && location.secrets && (
                  <Badge size="sm" color="#EF4444">has secrets</Badge>
                )}
              </div>
            </div>
          </div>

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

          {/* Cross-link buttons */}
          <div className="mt-4 flex flex-wrap gap-2">
            {location.map_id && (
              <Button variant="secondary" size="sm" onClick={handleViewOnMap}>
                <MapIcon className="w-4 h-4 mr-1.5" />
                View on Map
              </Button>
            )}
            {timelineEvents.length > 0 && (
              <Button variant="secondary" size="sm" onClick={handleViewTimeline}>
                <Clock className="w-4 h-4 mr-1.5" />
                Events ({timelineEvents.length})
              </Button>
            )}
          </div>
        </div>

        <div className="px-6 pb-6 space-y-6">
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

          {/* NPCs Present */}
          {npcsPresent.length > 0 && (
            <div className="bg-blue-500/10 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <UsersIcon className="w-4 h-4" />
                NPCs Present ({npcsPresent.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {npcsPresent.map(npc => (
                  <span
                    key={npc.id}
                    className="px-2 py-1 bg-white/[0.02] rounded-lg text-sm text-gray-300"
                  >
                    {npc.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {isDm && location.dm_notes && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                DM Notes
              </h4>
              <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap bg-white/[0.02] rounded-lg p-3">
                {location.dm_notes}
              </p>
            </div>
          )}

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

          {/* Timeline Events */}
          {timelineEvents.length > 0 && (
            <div className="bg-amber-500/10 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Events Here ({timelineEvents.length})
              </h4>
              <div className="space-y-2">
                {timelineEvents.slice(0, 5).map(event => (
                  <div
                    key={event.id}
                    className="flex items-center gap-2 p-2 bg-white/[0.02] rounded-lg"
                  >
                    <span className="text-sm text-gray-300 truncate">{event.title}</span>
                    {event.session_number && (
                      <span className="text-xs text-gray-500">Session {event.session_number}</span>
                    )}
                  </div>
                ))}
                {timelineEvents.length > 5 && (
                  <Button variant="ghost" size="sm" onClick={handleViewTimeline} className="w-full">
                    View all {timelineEvents.length} events
                  </Button>
                )}
              </div>
            </div>
          )}

          {isDm && location.secrets && (
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

interface LocationsTabProps {
  campaignId: string
  isDm: boolean
  isOwner: boolean
}

export function LocationsTab({ campaignId, isDm, isOwner }: LocationsTabProps) {
  const supabase = useSupabase()
  const searchParams = useSearchParams()

  const [locations, setLocations] = useState<Location[]>([])
  const [quests, setQuests] = useState<QuestAtLocation[]>([])
  const [encounters, setEncounters] = useState<EncounterAtLocation[]>([])
  const [timelineEvents, setTimelineEvents] = useState<TimelineEventAtLocation[]>([])
  const [npcsAtLocations, setNpcsAtLocations] = useState<Map<string, CharacterAtLocation[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('tree')

  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Listen for add location event from parent
  useEffect(() => {
    const handleAddEvent = () => {
      const trigger = localStorage.getItem('world-add-location-trigger')
      if (trigger === 'true') {
        localStorage.removeItem('world-add-location-trigger')
        setShowAddModal(true)
      }
    }

    // Check on mount
    handleAddEvent()

    // Listen for events
    window.addEventListener('world-add-location', handleAddEvent)
    return () => window.removeEventListener('world-add-location', handleAddEvent)
  }, [])

  // Handle locationId query parameter (from Maps page)
  useEffect(() => {
    const locationId = searchParams.get('locationId')
    if (locationId && locations.length > 0) {
      const location = locations.find(l => l.id === locationId)
      if (location) {
        setSelectedLocation(location)
        // Clear the selected location from localStorage
        localStorage.removeItem('world-selected-location')
      }
    }
  }, [searchParams, locations])

  const loadData = useCallback(async () => {
    if (!hasLoadedOnce) {
      setLoading(true)
    }

    // Load locations - filter by visibility for non-DMs
    let locationsQuery = supabase
      .from('locations')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('name')

    if (!isDm) {
      locationsQuery = locationsQuery.in('visibility', ['party', 'public'])
    }

    const { data: locationsData } = await locationsQuery
    setLocations(locationsData || [])

    // Load quests
    const { data: questsData } = await supabase
      .from('quests')
      .select('id, name, type, status, quest_giver_location_id, objective_location_id')
      .eq('campaign_id', campaignId)
      .in('status', ['available', 'active'])
      .order('name')

    setQuests(questsData || [])

    // Load encounters
    const { data: encountersData } = await supabase
      .from('encounters')
      .select('id, name, type, status, difficulty, location_id')
      .eq('campaign_id', campaignId)
      .not('location_id', 'is', null)
      .order('name')

    setEncounters(encountersData || [])

    // Load timeline events at locations
    const { data: eventsData } = await supabase
      .from('timeline_events')
      .select('id, title, event_date, session_number, location_id')
      .eq('campaign_id', campaignId)
      .not('location_id', 'is', null)
      .order('event_date', { ascending: false })

    setTimelineEvents(eventsData || [])

    // Load NPCs with current_location set
    const { data: npcsData } = await supabase
      .from('characters')
      .select('id, name, type, image_url, current_location_id')
      .eq('campaign_id', campaignId)
      .not('current_location_id', 'is', null)

    if (npcsData) {
      const npcMap = new Map<string, CharacterAtLocation[]>()
      for (const npc of npcsData) {
        if (npc.current_location_id) {
          const existing = npcMap.get(npc.current_location_id) || []
          existing.push(npc)
          npcMap.set(npc.current_location_id, existing)
        }
      }
      setNpcsAtLocations(npcMap)
    }

    // Expand root nodes by default
    if (locationsData && !hasLoadedOnce) {
      const rootIds = locationsData
        .filter(l => !l.parent_location_id)
        .map(l => l.id)
      setExpandedIds(new Set(rootIds))
    }

    setLoading(false)
    setHasLoadedOnce(true)
  }, [campaignId, isDm, hasLoadedOnce, supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

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

  const filteredLocations = locations.filter(location => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        location.name.toLowerCase().includes(query) ||
        location.description?.toLowerCase().includes(query) ||
        (isDm && location.dm_notes?.toLowerCase().includes(query))
      if (!matchesSearch) return false
    }

    if (typeFilter !== 'all' && location.type !== typeFilter) {
      return false
    }

    return true
  })

  const rootLocations = filteredLocations.filter(l => !l.parent_location_id)

  const getParentName = (parentId: string | null) => {
    if (!parentId) return undefined
    return locations.find(l => l.id === parentId)?.name
  }

  const handleSave = async (data: Partial<Location>) => {
    setSaving(true)
    try {
      if (editingLocation) {
        const { error } = await supabase
          .from('locations')
          .update(data)
          .eq('id', editingLocation.id)

        if (error) throw error
      } else {
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

  const getTimelineEventsForLocation = (locationId: string) => {
    return timelineEvents.filter(e => (e as any).location_id === locationId)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[--arcane-purple] border-t-transparent rounded-full spinner" />
      </div>
    )
  }

  if (locations.length === 0 && !searchQuery && typeFilter === 'all') {
    return (
      <>
        <EmptyWorldState
          type="locations"
          onAddLocation={isDm ? () => setShowAddModal(true) : undefined}
          isPlayer={!isDm}
        />
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
      </>
    )
  }

  return (
    <>
      {/* Toolbar */}
      <div className="space-y-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
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

          {isDm && (
            <Button onClick={() => setShowAddModal(true)} className="flex-shrink-0">
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          )}
        </div>
      </div>

      {/* Campaign Intelligence callout */}
      {isDm && locations.length > 0 && locations.length < 5 && (
        <div className="mb-6 p-4 rounded-lg bg-blue-500/5 border border-blue-500/10">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-blue-300/90">
                <strong className="text-blue-300">Campaign Intelligence</strong> detects locations mentioned in your session notes and suggests adding them here.
              </p>
              <Link
                href={`/campaigns/${campaignId}/intelligence`}
                className="inline-flex items-center gap-1 mt-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                Open Campaign Intelligence
                <span className="text-xs">→</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Location list/tree */}
      {filteredLocations.length === 0 ? (
        <div className="text-center py-12">
          <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400">No matching locations</p>
          <p className="text-sm text-gray-600">Try adjusting your search or filters</p>
        </div>
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

      {/* Location View Modal */}
      {selectedLocation && (
        <LocationViewModal
          location={selectedLocation}
          locations={locations}
          quests={quests}
          encounters={encounters}
          timelineEvents={getTimelineEventsForLocation(selectedLocation.id)}
          npcsPresent={npcsAtLocations.get(selectedLocation.id) || []}
          campaignId={campaignId}
          onClose={() => setSelectedLocation(null)}
          onEdit={() => {
            setEditingLocation(selectedLocation)
            setShowAddModal(true)
            setSelectedLocation(null)
          }}
          onDelete={() => setShowDeleteModal(true)}
          canEdit={isDm || isOwner}
          isDm={isDm}
        />
      )}

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
    </>
  )
}

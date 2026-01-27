'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import {
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  Maximize2,
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Users,
  Loader2,
  X,
  Check,
  Layers,
  Link2,
  ExternalLink,
  Settings,
} from 'lucide-react'
import { Modal, Input } from '@/components/ui'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { MapPin as MapPinType, WorldMap as WorldMapBase } from '@/types/database'

// Extended WorldMap type with custom type fields (added in migration 090)
interface WorldMap extends WorldMapBase {
  custom_type?: string | null
  custom_emoji?: string | null
}

// Simple location interface for pin linking
interface Location {
  id: string
  name: string
}

// Pin icons configuration
const PIN_ICONS = [
  { value: 'location', label: 'Location', icon: '📍' },
  { value: 'city', label: 'City', icon: '🏰' },
  { value: 'building', label: 'Building', icon: '🏠' },
  { value: 'npc', label: 'NPC', icon: '👤' },
  { value: 'quest', label: 'Quest', icon: '📜' },
  { value: 'danger', label: 'Danger', icon: '⚠️' },
  { value: 'treasure', label: 'Treasure', icon: '💎' },
  { value: 'camp', label: 'Camp', icon: '⛺' },
  { value: 'portal', label: 'Portal', icon: '🌀' },
  { value: 'custom', label: 'Custom', icon: '⭐' },
]

const PIN_COLORS = [
  { value: '#9333ea', label: 'Purple' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#22c55e', label: 'Green' },
  { value: '#eab308', label: 'Gold' },
  { value: '#ef4444', label: 'Red' },
  { value: '#f97316', label: 'Orange' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#6b7280', label: 'Gray' },
  { value: '#ffffff', label: 'White' },
]

interface MapViewerProps {
  campaignId: string
  map: WorldMap
  maps: WorldMap[]
  isDm: boolean
  canEditPins: boolean
  canDelete: boolean
  onBack: () => void
  onNavigateToMap: (mapId: string) => void
  onDelete: () => void
  onUpdate: (updates: Partial<WorldMap>) => void
}

export function MapViewer({
  campaignId,
  map,
  maps,
  isDm,
  canEditPins,
  canDelete,
  onBack,
  onNavigateToMap,
  onDelete,
  onUpdate,
}: MapViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Map state
  const [pins, setPins] = useState<MapPinType[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Pin editing state
  const [isPlacingPin, setIsPlacingPin] = useState(false)
  const [selectedPin, setSelectedPin] = useState<MapPinType | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [pendingPinPosition, setPendingPinPosition] = useState<{ x: number; y: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [pinForm, setPinForm] = useState({
    label: '',
    description: '',
    icon: 'location',
    color: '#9333ea',
    visibility: 'public' as 'public' | 'party' | 'dm_only',
    linked_entity_id: '' as string,
    linked_map_id: '' as string,
  })

  // Settings modal
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Load pins and locations
  useEffect(() => {
    loadData()
  }, [map.id])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load pins
      const pinsResponse = await fetch(`/api/campaigns/${campaignId}/maps/${map.id}/pins`)
      const pinsData = await pinsResponse.json()
      if (pinsResponse.ok) {
        setPins(pinsData.pins || [])
      }

      // Load locations for linking
      const locationsResponse = await fetch(`/api/campaigns/${campaignId}/locations`)
      const locationsData = await locationsResponse.json()
      if (locationsResponse.ok) {
        setLocations(locationsData.locations || [])
      }
    } catch (error) {
      console.error('Failed to load map data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Mouse handlers for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isPlacingPin) return
    setIsDragging(true)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || isPlacingPin) return
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Zoom handlers
  const handleZoomIn = () => setZoom(z => Math.min(z + 0.25, 4))
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.25, 0.25))
  const handleResetZoom = () => {
    setZoom(1)
    setPosition({ x: 0, y: 0 })
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setZoom(z => Math.min(Math.max(z + delta, 0.25), 4))
  }

  // Place pin
  const handleMapClick = (e: React.MouseEvent) => {
    if (!isPlacingPin || !isDm) return

    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = ((e.clientX - rect.left - position.x) / zoom) / rect.width * 100
    const y = ((e.clientY - rect.top - position.y) / zoom) / rect.height * 100

    setPendingPinPosition({ x, y })
    setEditModalOpen(true)
    setIsPlacingPin(false)
  }

  // Handle pin click
  const handlePinClick = (pin: MapPinType, e: React.MouseEvent) => {
    e.stopPropagation()

    // If pin links to another map, navigate
    if (pin.linked_map_id) {
      onNavigateToMap(pin.linked_map_id)
      return
    }

    // If pin links to a location, could navigate there (future)
    // For now, show a toast or do nothing
    if (pin.linked_entity_id && pin.linked_entity_type === 'location') {
      toast.info(`Location: ${pin.label}`)
    }
  }

  // Save pin
  const handleSavePin = async () => {
    if (!pinForm.label.trim()) {
      toast.error('Pin name is required')
      return
    }

    setSaving(true)
    try {
      const isEditing = !!selectedPin

      const response = await fetch(`/api/campaigns/${campaignId}/maps/${map.id}/pins`, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEditing ? {
          pinId: selectedPin.id,
          label: pinForm.label,
          description: pinForm.description,
          icon: pinForm.icon,
          color: pinForm.color,
          visibility: pinForm.visibility,
          linked_entity_type: pinForm.linked_entity_id ? 'location' : null,
          linked_entity_id: pinForm.linked_entity_id || null,
          linked_map_id: pinForm.linked_map_id || null,
        } : {
          x: pendingPinPosition?.x || 50,
          y: pendingPinPosition?.y || 50,
          label: pinForm.label,
          description: pinForm.description,
          icon: pinForm.icon,
          color: pinForm.color,
          visibility: pinForm.visibility,
          linked_entity_type: pinForm.linked_entity_id ? 'location' : null,
          linked_entity_id: pinForm.linked_entity_id || null,
          linked_map_id: pinForm.linked_map_id || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to save pin')
        return
      }

      toast.success(isEditing ? 'Pin updated' : 'Pin added')
      closeEditModal()
      loadData()
    } catch (error) {
      console.error('Failed to save pin:', error)
      toast.error('Failed to save pin')
    } finally {
      setSaving(false)
    }
  }

  // Delete pin
  const handleDeletePin = async (pinId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this pin?')) return

    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/maps/${map.id}/pins?pinId=${pinId}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        const data = await response.json()
        toast.error(data.error || 'Failed to delete pin')
        return
      }

      toast.success('Pin deleted')
      loadData()
    } catch (error) {
      console.error('Failed to delete pin:', error)
      toast.error('Failed to delete pin')
    }
  }

  const openEditModal = (pin: MapPinType, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedPin(pin)
    setPinForm({
      label: pin.label,
      description: pin.description || '',
      icon: pin.icon || 'location',
      color: pin.color || '#9333ea',
      visibility: (pin.visibility as 'public' | 'party' | 'dm_only') || 'public',
      linked_entity_id: (pin.linked_entity_type === 'location' ? pin.linked_entity_id : '') || '',
      linked_map_id: pin.linked_map_id || '',
    })
    setEditModalOpen(true)
  }

  const closeEditModal = () => {
    setEditModalOpen(false)
    setSelectedPin(null)
    setPendingPinPosition(null)
    setPinForm({
      label: '',
      description: '',
      icon: 'location',
      color: '#9333ea',
      visibility: 'public',
      linked_entity_id: '',
      linked_map_id: '',
    })
  }

  const getVisibilityInfo = (visibility: string) => {
    switch (visibility) {
      case 'public': return { icon: Eye, label: 'Public' }
      case 'party': return { icon: Users, label: 'Party only' }
      case 'dm_only': return { icon: Lock, label: 'DM only' }
      default: return { icon: Eye, label: 'Public' }
    }
  }

  const getPinIcon = (iconValue: string) => {
    const found = PIN_ICONS.find(i => i.value === iconValue)
    return found?.icon || '📍'
  }

  // Filter pins based on visibility for players
  const visiblePins = isDm
    ? pins
    : pins.filter(p => p.visibility === 'public' || p.visibility === 'party')

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[--bg-base]">
        <Loader2 className="w-8 h-8 animate-spin text-[--arcane-purple]" />
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-[--bg-base]">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[--border] bg-[--bg-surface]">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[--text-secondary] hover:text-[--text-primary] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Back to Maps</span>
          </button>

          <div className="w-px h-6 bg-[--border]" />

          <h1 className="text-lg font-semibold text-[--text-primary]">
            {map.name || 'Untitled Map'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* DM View indicator */}
          {isDm && (
            <span className="px-2 py-1 text-xs rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              DM View
            </span>
          )}

          {/* Add Pin button (DM only) */}
          {isDm && canEditPins && (
            <button
              onClick={() => setIsPlacingPin(!isPlacingPin)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors",
                isPlacingPin
                  ? "bg-[--arcane-purple] text-white"
                  : "bg-[--bg-elevated] text-[--text-secondary] hover:text-[--text-primary] border border-[--border]"
              )}
            >
              {isPlacingPin ? (
                <>
                  <X className="w-4 h-4" />
                  Cancel
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Pin
                </>
              )}
            </button>
          )}

          {/* Settings button (DM only) */}
          {isDm && canEditPins && (
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-lg bg-[--bg-elevated] text-[--text-secondary] hover:text-[--text-primary] border border-[--border]"
              title="Map settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          {/* Delete button */}
          {canDelete && (
            <button
              onClick={onDelete}
              className="p-2 rounded-lg bg-[--bg-elevated] text-[--arcane-ember] hover:bg-[--arcane-ember]/10 border border-[--border]"
              title="Delete map"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative overflow-hidden">
        {/* Zoom Controls */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-1 bg-[--bg-surface]/95 border border-[--border] rounded-lg p-1 backdrop-blur-sm">
          <button
            onClick={handleZoomOut}
            className="p-2 hover:bg-[--bg-elevated] rounded text-[--text-secondary] hover:text-[--text-primary]"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-[--text-tertiary] px-2 min-w-[50px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-2 hover:bg-[--bg-elevated] rounded text-[--text-secondary] hover:text-[--text-primary]"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-[--border]" />
          <button
            onClick={handleResetZoom}
            className="p-2 hover:bg-[--bg-elevated] rounded text-[--text-secondary] hover:text-[--text-primary]"
            title="Reset view"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Placing pin indicator */}
        {isPlacingPin && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 bg-[--arcane-purple] text-white rounded-lg shadow-lg text-sm">
            Click on the map to place a pin
          </div>
        )}

        {/* Map */}
        <div
          ref={containerRef}
          className={cn(
            "w-full h-full",
            isPlacingPin && "cursor-crosshair",
            isDragging && !isPlacingPin && "cursor-grabbing",
            !isDragging && !isPlacingPin && "cursor-grab"
          )}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onClick={handleMapClick}
        >
          <div
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
              transformOrigin: 'top left',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            }}
            className="relative inline-block"
          >
            {map.image_url && (
              <Image
                src={map.image_url}
                alt={map.name || 'Map'}
                width={1200}
                height={900}
                className="max-w-none pointer-events-none select-none"
                draggable={false}
                priority
              />
            )}

            {/* Pins */}
            {visiblePins.map(pin => {
              const visInfo = getVisibilityInfo(pin.visibility || 'public')
              const VisIcon = visInfo.icon
              const hasLinkedMap = !!pin.linked_map_id
              const hasLinkedLocation = pin.linked_entity_type === 'location' && !!pin.linked_entity_id
              const isHidden = pin.visibility === 'dm_only' || pin.visibility === 'party'

              return (
                <div
                  key={pin.id}
                  className={cn(
                    "absolute group",
                    isDm && isHidden && "opacity-60"
                  )}
                  style={{
                    left: `${pin.x}%`,
                    top: `${pin.y}%`,
                    transform: 'translate(-50%, -100%)',
                  }}
                >
                  {/* Pin marker */}
                  <button
                    onClick={(e) => handlePinClick(pin, e)}
                    className={cn(
                      "relative transition-transform hover:scale-110",
                      (hasLinkedMap || hasLinkedLocation) && "cursor-pointer"
                    )}
                  >
                    <div
                      className="text-3xl drop-shadow-lg"
                      style={{ filter: `drop-shadow(0 2px 4px ${pin.color || '#9333ea'}40)` }}
                    >
                      {getPinIcon(pin.icon || 'location')}
                    </div>

                    {/* Linked map indicator */}
                    {hasLinkedMap && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center ring-2 ring-[--bg-surface]">
                        <Layers className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}

                    {/* Linked location indicator */}
                    {hasLinkedLocation && !hasLinkedMap && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center ring-2 ring-[--bg-surface]">
                        <Link2 className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}

                    {/* Visibility indicator (DM only) */}
                    {isDm && isHidden && (
                      <div className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-black/80 flex items-center justify-center">
                        <VisIcon className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </button>

                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    <div className="bg-[--bg-surface] border border-[--border] rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                      <p className="font-medium text-[--text-primary] text-sm">{pin.label}</p>
                      {pin.description && (
                        <p className="text-xs text-[--text-secondary] mt-0.5 max-w-[200px] truncate">
                          {pin.description}
                        </p>
                      )}
                      {hasLinkedMap && (
                        <p className="text-xs text-blue-400 mt-1 flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          Click to open map
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Edit/Delete buttons (DM only) */}
                  {isDm && canEditPins && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                      <button
                        onClick={(e) => openEditModal(pin, e)}
                        className="p-1.5 bg-[--bg-surface] border border-[--border] rounded-lg hover:bg-[--bg-elevated] transition-colors"
                        title="Edit pin"
                      >
                        <Edit2 className="w-3 h-3 text-[--text-secondary]" />
                      </button>
                      <button
                        onClick={(e) => handleDeletePin(pin.id, e)}
                        className="p-1.5 bg-[--bg-surface] border border-[--border] rounded-lg hover:bg-[--bg-elevated] transition-colors"
                        title="Delete pin"
                      >
                        <Trash2 className="w-3 h-3 text-[--arcane-ember]" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Edit/Create Pin Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={closeEditModal}
        title={selectedPin ? 'Edit Pin' : 'Add Pin'}
        size="md"
      >
        <div className="space-y-4">
          <div className="form-group">
            <label className="form-label">Name *</label>
            <Input
              value={pinForm.label}
              onChange={(e) => setPinForm({ ...pinForm, label: e.target.value })}
              placeholder="e.g., Waterdeep"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              value={pinForm.description}
              onChange={(e) => setPinForm({ ...pinForm, description: e.target.value })}
              placeholder="Optional description..."
              rows={2}
              className="form-input"
            />
          </div>

          {/* Icon Selection */}
          <div className="form-group">
            <label className="form-label">Icon</label>
            <div className="flex flex-wrap gap-2">
              {PIN_ICONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setPinForm({ ...pinForm, icon: opt.value })}
                  className={cn(
                    "w-10 h-10 rounded-lg border-2 flex items-center justify-center text-xl transition-all",
                    pinForm.icon === opt.value
                      ? "border-[--arcane-purple] bg-[--arcane-purple]/10"
                      : "border-[--border] hover:border-[--text-tertiary]"
                  )}
                  title={opt.label}
                >
                  {opt.icon}
                </button>
              ))}
            </div>
          </div>

          {/* Color Selection */}
          <div className="form-group">
            <label className="form-label">Color</label>
            <div className="flex flex-wrap gap-2">
              {PIN_COLORS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setPinForm({ ...pinForm, color: opt.value })}
                  className={cn(
                    "w-8 h-8 rounded-full border-2 transition-transform",
                    pinForm.color === opt.value
                      ? "border-white scale-110 ring-2 ring-[--arcane-purple]"
                      : "border-transparent hover:scale-105"
                  )}
                  style={{ backgroundColor: opt.value }}
                  title={opt.label}
                />
              ))}
            </div>
          </div>

          <div className="border-t border-[--border] pt-4 space-y-4">
            {/* Link to Location */}
            <div className="form-group">
              <label className="form-label flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Link to Location
              </label>
              <select
                value={pinForm.linked_entity_id}
                onChange={(e) => setPinForm({ ...pinForm, linked_entity_id: e.target.value })}
                className="form-input"
              >
                <option value="">None</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
              <p className="text-xs text-[--text-tertiary] mt-1">
                Link this pin to a location in your campaign
              </p>
            </div>

            {/* Link to Map (drill-down) */}
            <div className="form-group">
              <label className="form-label flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Link to Map (drill-down)
              </label>
              <select
                value={pinForm.linked_map_id}
                onChange={(e) => setPinForm({ ...pinForm, linked_map_id: e.target.value })}
                className="form-input"
              >
                <option value="">None</option>
                {maps.filter(m => m.id !== map.id).map(m => (
                  <option key={m.id} value={m.id}>{m.name || 'Untitled'}</option>
                ))}
              </select>
              <p className="text-xs text-[--text-tertiary] mt-1">
                Clicking this pin will open the linked map
              </p>
            </div>
          </div>

          {/* Visibility */}
          <div className="form-group">
            <label className="form-label">Visibility</label>
            <select
              value={pinForm.visibility}
              onChange={(e) => setPinForm({ ...pinForm, visibility: e.target.value as 'public' | 'party' | 'dm_only' })}
              className="form-input"
            >
              <option value="public">Discovered - Players can see</option>
              <option value="party">Party only - Shared with party</option>
              <option value="dm_only">Hidden - DM only until revealed</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={closeEditModal}
              disabled={saving}
              className="btn btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              onClick={handleSavePin}
              disabled={saving || !pinForm.label.trim()}
              className="btn btn-primary flex-1"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {selectedPin ? 'Update' : 'Add Pin'}
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Map Settings Modal */}
      <Modal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Map Settings"
        size="md"
      >
        <div className="space-y-4">
          <div className="form-group">
            <label className="form-label">Map Name</label>
            <Input
              value={map.name || ''}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="Enter map name"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              value={map.description || ''}
              onChange={(e) => onUpdate({ description: e.target.value })}
              placeholder="Optional description..."
              rows={3}
              className="form-input"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setSettingsOpen(false)}
              className="btn btn-secondary"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

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
  GripVertical,
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
  const imageRef = useRef<HTMLImageElement>(null)

  // Map state
  const [pins, setPins] = useState<MapPinType[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 })
  const [zoom, setZoom] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Pin editing state
  const [isPlacingPin, setIsPlacingPin] = useState(false)
  const [selectedPin, setSelectedPin] = useState<MapPinType | null>(null)
  const [popupPin, setPopupPin] = useState<MapPinType | null>(null)
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 })
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

  // Pin dragging state
  const [draggingPin, setDraggingPin] = useState<MapPinType | null>(null)
  const [dragPinStart, setDragPinStart] = useState({ x: 0, y: 0 })

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

  // Center the map when image loads
  useEffect(() => {
    if (imageLoaded && imageDimensions.width > 0 && containerRef.current) {
      const container = containerRef.current.getBoundingClientRect()
      const x = (container.width - imageDimensions.width) / 2
      const y = (container.height - imageDimensions.height) / 2
      setPosition({ x: Math.max(0, x), y: Math.max(0, y) })
    }
  }, [imageLoaded, imageDimensions])

  // Mouse handlers for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isPlacingPin || draggingPin) return
    // Only start drag on left mouse button and not on pins
    if (e.button !== 0) return
    setIsDragging(true)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingPin && imageRef.current) {
      // Dragging a pin
      const rect = imageRef.current.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      // Clamp to 0-100
      const clampedX = Math.max(0, Math.min(100, x))
      const clampedY = Math.max(0, Math.min(100, y))
      setPins(prev => prev.map(p =>
        p.id === draggingPin.id ? { ...p, x: clampedX, y: clampedY } : p
      ))
      return
    }

    if (!isDragging || isPlacingPin) return
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }

  const handleMouseUp = async () => {
    if (draggingPin) {
      // Save the new pin position
      const updatedPin = pins.find(p => p.id === draggingPin.id)
      if (updatedPin) {
        try {
          await fetch(`/api/campaigns/${campaignId}/maps/${map.id}/pins`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pinId: draggingPin.id,
              x: updatedPin.x,
              y: updatedPin.y,
            }),
          })
        } catch (error) {
          console.error('Failed to save pin position:', error)
          loadData() // Reload to restore original position
        }
      }
      setDraggingPin(null)
    }
    setIsDragging(false)
  }

  // Zoom handlers
  const handleZoomIn = () => setZoom(z => Math.min(z + 0.25, 4))
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.25, 0.25))
  const handleResetZoom = () => {
    setZoom(1)
    if (containerRef.current && imageDimensions.width > 0) {
      const container = containerRef.current.getBoundingClientRect()
      const x = (container.width - imageDimensions.width) / 2
      const y = (container.height - imageDimensions.height) / 2
      setPosition({ x: Math.max(0, x), y: Math.max(0, y) })
    }
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setZoom(z => Math.min(Math.max(z + delta, 0.25), 4))
  }

  // Place pin - calculate position relative to the IMAGE, not container
  const handleMapClick = (e: React.MouseEvent) => {
    // Close popup if clicking elsewhere
    if (popupPin && !(e.target as HTMLElement).closest('.pin-popup')) {
      setPopupPin(null)
    }

    if (!isPlacingPin || !isDm || !imageRef.current) return

    const rect = imageRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    // Clamp to 0-100
    const clampedX = Math.max(0, Math.min(100, x))
    const clampedY = Math.max(0, Math.min(100, y))

    setPendingPinPosition({ x: clampedX, y: clampedY })
    setEditModalOpen(true)
    setIsPlacingPin(false)
  }

  // Handle pin click - show popup
  const handlePinClick = (pin: MapPinType, e: React.MouseEvent) => {
    e.stopPropagation()

    // If already showing this pin's popup, close it
    if (popupPin?.id === pin.id) {
      setPopupPin(null)
      return
    }

    // Position popup near the click
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    setPopupPosition({
      x: rect.left + rect.width / 2,
      y: rect.top
    })
    setPopupPin(pin)
  }

  // Start dragging a pin
  const handlePinDragStart = (pin: MapPinType, e: React.MouseEvent) => {
    if (!isDm || !canEditPins) return
    e.stopPropagation()
    e.preventDefault()
    setDraggingPin(pin)
    setPopupPin(null)
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
  const handleDeletePin = async (pinId: string) => {
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
      setPopupPin(null)
      loadData()
    } catch (error) {
      console.error('Failed to delete pin:', error)
      toast.error('Failed to delete pin')
    }
  }

  const openEditModal = (pin: MapPinType) => {
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
    setPopupPin(null)
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
      case 'public': return { icon: Eye, label: 'Discovered', color: 'text-green-400' }
      case 'party': return { icon: Users, label: 'Party only', color: 'text-blue-400' }
      case 'dm_only': return { icon: Lock, label: 'Hidden', color: 'text-amber-400' }
      default: return { icon: Eye, label: 'Discovered', color: 'text-green-400' }
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

  // Get linked map name
  const getLinkedMapName = (mapId: string) => {
    const linkedMap = maps.find(m => m.id === mapId)
    return linkedMap?.name || 'Untitled Map'
  }

  // Get linked location name
  const getLinkedLocationName = (locationId: string) => {
    const loc = locations.find(l => l.id === locationId)
    return loc?.name || 'Unknown Location'
  }

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
                  : "bg-[--bg-elevated] text-[--text-secondary] hover:text-[--text-primary]"
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
              className="p-2 rounded-lg bg-[--bg-elevated] text-[--text-secondary] hover:text-[--text-primary]"
              title="Map settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          {/* Delete button */}
          {canDelete && (
            <button
              onClick={onDelete}
              className="p-2 rounded-lg bg-[--bg-elevated] text-[--arcane-ember] hover:bg-[--arcane-ember]/10"
              title="Delete map"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative overflow-hidden bg-black/20">
        {/* Zoom Controls */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-1 bg-[--bg-surface]/95 rounded-lg p-1 backdrop-blur-sm shadow-lg">
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
            "w-full h-full flex items-center justify-center",
            isPlacingPin && "cursor-crosshair",
            draggingPin && "cursor-grabbing",
            isDragging && !isPlacingPin && !draggingPin && "cursor-grabbing",
            !isDragging && !isPlacingPin && !draggingPin && "cursor-grab"
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
              transformOrigin: 'center center',
              transition: isDragging || draggingPin ? 'none' : 'transform 0.1s ease-out',
            }}
            className="relative"
          >
            {map.image_url && (
              <img
                ref={imageRef}
                src={map.image_url}
                alt={map.name || 'Map'}
                className="max-w-none pointer-events-none select-none"
                draggable={false}
                onLoad={(e) => {
                  const img = e.target as HTMLImageElement
                  setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight })
                  setImageLoaded(true)
                }}
                style={{ maxHeight: '80vh', width: 'auto' }}
              />
            )}

            {/* Pins */}
            {imageLoaded && visiblePins.map(pin => {
              const visInfo = getVisibilityInfo(pin.visibility || 'public')
              const VisIcon = visInfo.icon
              const hasLinkedMap = !!pin.linked_map_id
              const hasLinkedLocation = pin.linked_entity_type === 'location' && !!pin.linked_entity_id
              const isHidden = pin.visibility === 'dm_only' || pin.visibility === 'party'
              const isBeingDragged = draggingPin?.id === pin.id

              return (
                <div
                  key={pin.id}
                  className={cn(
                    "absolute group",
                    isDm && isHidden && "opacity-60",
                    isBeingDragged && "z-50"
                  )}
                  style={{
                    left: `${pin.x}%`,
                    top: `${pin.y}%`,
                    transform: 'translate(-50%, -100%)',
                  }}
                >
                  {/* Pin marker */}
                  <div className="relative">
                    <button
                      onClick={(e) => handlePinClick(pin, e)}
                      onMouseDown={(e) => isDm && canEditPins && e.button === 0 && handlePinDragStart(pin, e)}
                      className={cn(
                        "relative transition-transform hover:scale-110 pointer-events-auto",
                        (hasLinkedMap || hasLinkedLocation) && "cursor-pointer",
                        isDm && canEditPins && "cursor-grab",
                        isBeingDragged && "cursor-grabbing scale-125"
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
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center ring-2 ring-[--bg-base]">
                          <Layers className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}

                      {/* Linked location indicator */}
                      {hasLinkedLocation && !hasLinkedMap && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center ring-2 ring-[--bg-base]">
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
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Pin Popup */}
        {popupPin && (
          <div
            className="pin-popup fixed z-50 w-72"
            style={{
              left: `${Math.min(popupPosition.x, window.innerWidth - 300)}px`,
              top: `${Math.max(popupPosition.y - 10, 10)}px`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="bg-[--bg-surface] rounded-xl shadow-2xl border border-[--border] overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-[--border]">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{getPinIcon(popupPin.icon || 'location')}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[--text-primary] truncate">{popupPin.label}</h3>
                    {popupPin.description && (
                      <p className="text-sm text-[--text-secondary] mt-1 line-clamp-2">
                        {popupPin.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setPopupPin(null)}
                    className="p-1 hover:bg-[--bg-elevated] rounded text-[--text-tertiary]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="p-2 space-y-1">
                {/* View Location link */}
                {popupPin.linked_entity_type === 'location' && popupPin.linked_entity_id && (
                  <button
                    onClick={() => {
                      toast.info(`Navigate to: ${getLinkedLocationName(popupPin.linked_entity_id!)}`)
                      setPopupPin(null)
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[--bg-elevated] text-left transition-colors"
                  >
                    <Link2 className="w-4 h-4 text-green-400" />
                    <span className="flex-1 text-sm text-[--text-primary]">View Location</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[--text-tertiary]" />
                  </button>
                )}

                {/* Open linked map */}
                {popupPin.linked_map_id && (
                  <button
                    onClick={() => {
                      onNavigateToMap(popupPin.linked_map_id!)
                      setPopupPin(null)
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[--bg-elevated] text-left transition-colors"
                  >
                    <Layers className="w-4 h-4 text-blue-400" />
                    <span className="flex-1 text-sm text-[--text-primary]">
                      Open {getLinkedMapName(popupPin.linked_map_id)}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-[--text-tertiary]" />
                  </button>
                )}
              </div>

              {/* Footer - DM controls */}
              {isDm && (
                <div className="px-4 py-3 border-t border-[--border] flex items-center justify-between bg-[--bg-elevated]/50">
                  <div className={cn("flex items-center gap-1.5 text-xs", getVisibilityInfo(popupPin.visibility || 'public').color)}>
                    {(() => {
                      const info = getVisibilityInfo(popupPin.visibility || 'public')
                      const Icon = info.icon
                      return (
                        <>
                          <Icon className="w-3.5 h-3.5" />
                          <span>{info.label}</span>
                        </>
                      )
                    })()}
                  </div>
                  <div className="flex items-center gap-1">
                    {canEditPins && (
                      <>
                        <button
                          onClick={() => openEditModal(popupPin)}
                          className="p-1.5 hover:bg-[--bg-surface] rounded text-[--text-secondary] hover:text-[--text-primary]"
                          title="Edit pin"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePin(popupPin.id)}
                          className="p-1.5 hover:bg-[--bg-surface] rounded text-[--arcane-ember]"
                          title="Delete pin"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
            {/* Arrow pointing to pin */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full">
              <div className="w-3 h-3 bg-[--bg-surface] border-r border-b border-[--border] transform rotate-45 -translate-y-1.5" />
            </div>
          </div>
        )}
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
                    "w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all",
                    pinForm.icon === opt.value
                      ? "bg-[--arcane-purple]/20 ring-2 ring-[--arcane-purple]"
                      : "bg-[--bg-elevated] hover:bg-[--bg-surface]"
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
                    "w-8 h-8 rounded-full transition-transform",
                    pinForm.color === opt.value
                      ? "scale-110 ring-2 ring-[--arcane-purple] ring-offset-2 ring-offset-[--bg-surface]"
                      : "hover:scale-105"
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

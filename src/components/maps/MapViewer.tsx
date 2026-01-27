'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
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
  Lock,
  Users,
  Loader2,
  X,
  Check,
  Layers,
  Link2,
  ExternalLink,
  Settings,
  Move,
} from 'lucide-react'
import { Modal, Input } from '@/components/ui'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { MapPin as MapPinType, WorldMap as WorldMapBase } from '@/types/database'

interface WorldMap extends WorldMapBase {
  custom_type?: string | null
  custom_emoji?: string | null
}

interface Location {
  id: string
  name: string
}

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
  onBack,
  onNavigateToMap,
  onDelete,
  onUpdate,
  canDelete,
}: MapViewerProps) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  const [pins, setPins] = useState<MapPinType[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

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

  // Pin dragging - requires hold + movement threshold
  const [pinDragState, setPinDragState] = useState<{
    pin: MapPinType | null
    startX: number
    startY: number
    isDragging: boolean
  }>({ pin: null, startX: 0, startY: 0, isDragging: false })

  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    loadData()
  }, [map.id])

  const loadData = async () => {
    setLoading(true)
    try {
      const pinsResponse = await fetch(`/api/campaigns/${campaignId}/maps/${map.id}/pins`)
      const pinsData = await pinsResponse.json()
      if (pinsResponse.ok) {
        setPins(pinsData.pins || [])
      }

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

  // Mouse handlers for panning the map
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isPlacingPin || pinDragState.pin) return
    if (e.button !== 0) return
    setIsDragging(true)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    // Handle pin dragging with movement threshold
    if (pinDragState.pin && !pinDragState.isDragging) {
      const dx = Math.abs(e.clientX - pinDragState.startX)
      const dy = Math.abs(e.clientY - pinDragState.startY)
      // Only start dragging after 8px of movement
      if (dx > 8 || dy > 8) {
        setPinDragState(prev => ({ ...prev, isDragging: true }))
        setPopupPin(null)
      }
    }

    // Actually move the pin if dragging
    if (pinDragState.isDragging && pinDragState.pin && imageRef.current) {
      const rect = imageRef.current.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      const clampedX = Math.max(0, Math.min(100, x))
      const clampedY = Math.max(0, Math.min(100, y))
      setPins(prev => prev.map(p =>
        p.id === pinDragState.pin!.id ? { ...p, x: clampedX, y: clampedY } : p
      ))
      return
    }

    // Handle map panning
    if (!isDragging || isPlacingPin) return
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }

  const handleMouseUp = async (e: React.MouseEvent) => {
    // If we were dragging a pin, save its position
    if (pinDragState.isDragging && pinDragState.pin) {
      const updatedPin = pins.find(p => p.id === pinDragState.pin!.id)
      if (updatedPin) {
        try {
          await fetch(`/api/campaigns/${campaignId}/maps/${map.id}/pins`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pinId: pinDragState.pin.id,
              x: updatedPin.x,
              y: updatedPin.y,
            }),
          })
          toast.success('Pin moved')
        } catch (error) {
          console.error('Failed to save pin position:', error)
          loadData()
        }
      }
    }

    setPinDragState({ pin: null, startX: 0, startY: 0, isDragging: false })
    setIsDragging(false)
  }

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

  const handleMapClick = (e: React.MouseEvent) => {
    // Close popup if clicking elsewhere
    if (popupPin && !(e.target as HTMLElement).closest('.pin-popup')) {
      setPopupPin(null)
    }

    if (!isPlacingPin || !isDm || !imageRef.current) return

    const rect = imageRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    const clampedX = Math.max(0, Math.min(100, x))
    const clampedY = Math.max(0, Math.min(100, y))

    setPendingPinPosition({ x: clampedX, y: clampedY })
    setEditModalOpen(true)
    setIsPlacingPin(false)
  }

  // Pin click - show popup (only if we didn't drag)
  const handlePinClick = (pin: MapPinType, e: React.MouseEvent) => {
    e.stopPropagation()

    // If we just finished dragging, don't show popup
    if (pinDragState.isDragging) return

    if (popupPin?.id === pin.id) {
      setPopupPin(null)
      return
    }

    const rect = (e.target as HTMLElement).getBoundingClientRect()
    setPopupPosition({
      x: rect.left + rect.width / 2,
      y: rect.top
    })
    setPopupPin(pin)
  }

  // Start potential pin drag (but don't actually drag until threshold)
  const handlePinMouseDown = (pin: MapPinType, e: React.MouseEvent) => {
    if (!isDm || !canEditPins || e.button !== 0) return
    e.stopPropagation()
    setPinDragState({
      pin,
      startX: e.clientX,
      startY: e.clientY,
      isDragging: false
    })
  }

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

  const visiblePins = isDm
    ? pins
    : pins.filter(p => p.visibility === 'public' || p.visibility === 'party')

  const getLinkedMapName = (mapId: string) => {
    const linkedMap = maps.find(m => m.id === mapId)
    return linkedMap?.name || 'Untitled Map'
  }

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
          {isDm && (
            <span className="px-2 py-1 text-xs rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              DM View
            </span>
          )}
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
              {isPlacingPin ? <><X className="w-4 h-4" />Cancel</> : <><Plus className="w-4 h-4" />Add Pin</>}
            </button>
          )}
          {isDm && canEditPins && (
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-lg bg-[--bg-elevated] text-[--text-secondary] hover:text-[--text-primary]"
              title="Map settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
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
      <div className="flex-1 relative overflow-hidden bg-black/40">
        {/* Zoom Controls */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-1 bg-[--bg-surface]/95 rounded-lg p-1 backdrop-blur-sm shadow-lg">
          <button onClick={handleZoomOut} className="p-2 hover:bg-[--bg-elevated] rounded text-[--text-secondary] hover:text-[--text-primary]" title="Zoom out">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-[--text-tertiary] px-2 min-w-[50px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button onClick={handleZoomIn} className="p-2 hover:bg-[--bg-elevated] rounded text-[--text-secondary] hover:text-[--text-primary]" title="Zoom in">
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-[--border]" />
          <button onClick={handleResetZoom} className="p-2 hover:bg-[--bg-elevated] rounded text-[--text-secondary] hover:text-[--text-primary]" title="Reset view">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {isPlacingPin && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 bg-[--arcane-purple] text-white rounded-lg shadow-lg text-sm">
            Click on the map to place a pin
          </div>
        )}

        {/* Map - use CSS centering, no position offset for initial state */}
        <div
          ref={containerRef}
          className={cn(
            "w-full h-full flex items-center justify-center overflow-hidden",
            isPlacingPin && "cursor-crosshair",
            pinDragState.isDragging && "cursor-grabbing",
            isDragging && "cursor-grabbing",
            !isDragging && !isPlacingPin && !pinDragState.isDragging && "cursor-grab"
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
              transition: isDragging || pinDragState.isDragging ? 'none' : 'transform 0.1s ease-out',
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
                onLoad={() => setImageLoaded(true)}
                style={{ maxHeight: '85vh', maxWidth: '90vw', width: 'auto', height: 'auto' }}
              />
            )}

            {/* Pins */}
            {imageLoaded && visiblePins.map(pin => {
              const visInfo = getVisibilityInfo(pin.visibility || 'public')
              const VisIcon = visInfo.icon
              const hasLinkedMap = !!pin.linked_map_id
              const hasLinkedLocation = pin.linked_entity_type === 'location' && !!pin.linked_entity_id
              const isHidden = pin.visibility === 'dm_only' || pin.visibility === 'party'
              const isBeingDragged = pinDragState.isDragging && pinDragState.pin?.id === pin.id

              return (
                <div
                  key={pin.id}
                  className={cn(
                    "absolute",
                    isBeingDragged && "z-50"
                  )}
                  style={{
                    left: `${pin.x}%`,
                    top: `${pin.y}%`,
                    transform: 'translate(-50%, -100%)',
                  }}
                >
                  <button
                    onClick={(e) => handlePinClick(pin, e)}
                    onMouseDown={(e) => handlePinMouseDown(pin, e)}
                    className={cn(
                      "relative transition-transform hover:scale-110 pointer-events-auto",
                      isDm && canEditPins && !isPlacingPin && "cursor-grab",
                      isBeingDragged && "cursor-grabbing scale-125"
                    )}
                  >
                    <div
                      className={cn(
                        "text-3xl drop-shadow-lg transition-opacity",
                        isDm && isHidden && "opacity-50"
                      )}
                      style={{ filter: `drop-shadow(0 2px 4px ${pin.color || '#9333ea'}40)` }}
                    >
                      {getPinIcon(pin.icon || 'location')}
                    </div>

                    {hasLinkedMap && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center ring-2 ring-black/50">
                        <Layers className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                    {hasLinkedLocation && !hasLinkedMap && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center ring-2 ring-black/50">
                        <Link2 className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                    {isDm && isHidden && (
                      <div className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-black/80 flex items-center justify-center">
                        <VisIcon className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Pin Popup */}
        {popupPin && !pinDragState.isDragging && (
          <div
            className="pin-popup fixed z-50"
            style={{
              left: `${Math.min(Math.max(popupPosition.x, 160), window.innerWidth - 160)}px`,
              top: `${Math.max(popupPosition.y - 16, 80)}px`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div
              className="w-72 rounded-xl shadow-2xl overflow-hidden border border-gray-700"
              style={{ backgroundColor: '#0d0d14' }}
            >
              {/* Header */}
              <div
                className="p-4"
                style={{ background: 'linear-gradient(to right, rgba(147, 51, 234, 0.25), transparent)' }}
              >
                <div className="flex items-start gap-3">
                  <div className="text-3xl">{getPinIcon(popupPin.icon || 'location')}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white text-lg">{popupPin.label}</h3>
                    {popupPin.description && (
                      <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                        {popupPin.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setPopupPin(null)}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Actions */}
              {(popupPin.linked_map_id || (popupPin.linked_entity_type === 'location' && popupPin.linked_entity_id)) && (
                <div className="px-3 py-2 space-y-1">
                  {popupPin.linked_entity_type === 'location' && popupPin.linked_entity_id && (
                    <button
                      onClick={() => {
                        // Navigate to World page with location selected
                        localStorage.setItem('world-active-tab', 'locations')
                        localStorage.setItem('world-selected-location', popupPin.linked_entity_id!)
                        router.push(`/campaigns/${campaignId}/lore?locationId=${popupPin.linked_entity_id}`)
                        setPopupPin(null)
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
                      style={{ backgroundColor: '#1a1a24' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#22222e'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = '#1a1a24'}
                    >
                      <Link2 className="w-4 h-4 text-green-400" />
                      <span className="flex-1 text-sm font-medium text-white">View Location</span>
                      <ExternalLink className="w-4 h-4 text-gray-500" />
                    </button>
                  )}
                  {popupPin.linked_map_id && (
                    <button
                      onClick={() => {
                        onNavigateToMap(popupPin.linked_map_id!)
                        setPopupPin(null)
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
                      style={{ backgroundColor: '#1a1a24' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#22222e'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = '#1a1a24'}
                    >
                      <Layers className="w-4 h-4 text-blue-400" />
                      <span className="flex-1 text-sm font-medium text-white">
                        Open {getLinkedMapName(popupPin.linked_map_id)}
                      </span>
                      <ExternalLink className="w-4 h-4 text-gray-500" />
                    </button>
                  )}
                </div>
              )}

              {/* Footer - DM controls */}
              {isDm && (
                <div
                  className="px-4 py-3 flex items-center justify-between"
                  style={{ backgroundColor: '#1a1a24' }}
                >
                  <div className={cn("flex items-center gap-1.5 text-xs font-medium", getVisibilityInfo(popupPin.visibility || 'public').color)}>
                    {(() => {
                      const info = getVisibilityInfo(popupPin.visibility || 'public')
                      const Icon = info.icon
                      return <><Icon className="w-3.5 h-3.5" /><span>{info.label}</span></>
                    })()}
                  </div>
                  <div className="flex items-center gap-1">
                    {canEditPins && (
                      <>
                        <button
                          onClick={() => openEditModal(popupPin)}
                          className="p-2 hover:bg-black/30 rounded-lg text-gray-400 hover:text-white transition-colors"
                          title="Edit pin"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePin(popupPin.id)}
                          className="p-2 hover:bg-black/30 rounded-lg text-red-400 transition-colors"
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
            {/* Arrow */}
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-2">
              <div
                className="w-4 h-4 transform rotate-45 border-r border-b border-gray-700"
                style={{ backgroundColor: '#0d0d14' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Edit/Create Pin Modal */}
      <Modal isOpen={editModalOpen} onClose={closeEditModal} title={selectedPin ? 'Edit Pin' : 'Add Pin'} size="md">
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

          <div className="form-group">
            <label className="form-label">Icon</label>
            <div className="flex flex-wrap gap-2">
              {PIN_ICONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setPinForm({ ...pinForm, icon: opt.value })}
                  className="w-11 h-11 rounded-lg flex items-center justify-center text-xl transition-all"
                  style={{
                    backgroundColor: pinForm.icon === opt.value ? 'rgba(147, 51, 234, 0.3)' : '#1a1a24',
                    boxShadow: pinForm.icon === opt.value ? '0 0 0 2px #9333ea, inset 0 0 0 1px rgba(147, 51, 234, 0.5)' : 'none',
                  }}
                  title={opt.label}
                >
                  {opt.icon}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Color</label>
            <div className="flex flex-wrap gap-3">
              {PIN_COLORS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setPinForm({ ...pinForm, color: opt.value })}
                  className="w-9 h-9 rounded-full transition-all"
                  style={{
                    backgroundColor: opt.value,
                    transform: pinForm.color === opt.value ? 'scale(1.2)' : 'scale(1)',
                    boxShadow: pinForm.color === opt.value
                      ? `0 0 0 3px #0d0d14, 0 0 0 5px #9333ea`
                      : 'none',
                  }}
                  title={opt.label}
                />
              ))}
            </div>
          </div>

          <div className="border-t border-[--border] pt-4 space-y-4">
            <div className="form-group">
              <label className="form-label flex items-center gap-2">
                <Link2 className="w-4 h-4" />Link to Location
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
            </div>

            <div className="form-group">
              <label className="form-label flex items-center gap-2">
                <Layers className="w-4 h-4" />Link to Map (drill-down)
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
            </div>
          </div>

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
            <button onClick={closeEditModal} disabled={saving} className="btn btn-secondary flex-1">Cancel</button>
            <button onClick={handleSavePin} disabled={saving || !pinForm.label.trim()} className="btn btn-primary flex-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" />{selectedPin ? 'Update' : 'Add Pin'}</>}
            </button>
          </div>
        </div>
      </Modal>

      {/* Map Settings Modal */}
      <Modal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} title="Map Settings" size="md">
        <div className="space-y-4">
          <div className="form-group">
            <label className="form-label">Map Name</label>
            <Input value={map.name || ''} onChange={(e) => onUpdate({ name: e.target.value })} placeholder="Enter map name" />
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
            <button onClick={() => setSettingsOpen(false)} className="btn btn-secondary">Close</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

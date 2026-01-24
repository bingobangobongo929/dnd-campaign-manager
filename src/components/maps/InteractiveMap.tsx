'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Users,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Loader2,
  X,
  Check,
  Move,
  Cloud,
  CircleDot,
  ExternalLink,
  Layers,
} from 'lucide-react'
import { Modal, Input } from '@/components/ui'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { MapPin as MapPinType } from '@/types/database'

export interface FogRegion {
  id: string
  x: number
  y: number
  radius: number
  revealed: boolean
}

interface InteractiveMapProps {
  campaignId: string
  mapId: string
  imageUrl: string
  isDm: boolean
  onPinClick?: (pin: MapPinType) => void
  className?: string
  fogOfWar?: FogRegion[]
  onFogChange?: (fog: FogRegion[]) => void
  fogEnabled?: boolean
}

export function InteractiveMap({
  campaignId,
  mapId,
  imageUrl,
  isDm,
  onPinClick,
  className,
  fogOfWar = [],
  onFogChange,
  fogEnabled = false,
}: InteractiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const fogCanvasRef = useRef<HTMLCanvasElement>(null)
  const [pins, setPins] = useState<MapPinType[]>([])
  const [loading, setLoading] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isPlacingPin, setIsPlacingPin] = useState(false)
  const [selectedPin, setSelectedPin] = useState<MapPinType | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [pinForm, setPinForm] = useState({
    label: '',
    description: '',
    icon: 'MapPin',
    color: '#9333ea',
    visibility: 'public' as 'public' | 'party' | 'dm_only',
  })
  const [saving, setSaving] = useState(false)
  const [pendingPinPosition, setPendingPinPosition] = useState<{ x: number; y: number } | null>(null)

  // Fog of war state
  const [isFogMode, setIsFogMode] = useState(false)
  const [fogBrushSize, setFogBrushSize] = useState(50)
  const [isRevealMode, setIsRevealMode] = useState(true) // true = reveal, false = hide

  // Load pins
  useEffect(() => {
    loadPins()
  }, [campaignId, mapId])

  const loadPins = async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/maps/${mapId}/pins`)
      const data = await response.json()

      if (response.ok) {
        setPins(data.pins || [])
      }
    } catch (error) {
      console.error('Failed to load pins:', error)
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

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setZoom(z => Math.min(Math.max(z + delta, 0.25), 4))
  }

  // Place pin
  const handleMapClick = (e: React.MouseEvent) => {
    // Handle fog click first
    if (isFogMode && isDm && onFogChange) {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return

      const x = ((e.clientX - rect.left - position.x) / zoom) / rect.width * 100
      const y = ((e.clientY - rect.top - position.y) / zoom) / rect.height * 100

      // Add or toggle a fog region
      const newRegion: FogRegion = {
        id: `fog-${Date.now()}`,
        x,
        y,
        radius: fogBrushSize,
        revealed: isRevealMode,
      }

      const updatedFog = [...fogOfWar, newRegion]
      onFogChange(updatedFog)
      toast.success(isRevealMode ? 'Area revealed' : 'Area hidden')
      return
    }

    if (!isPlacingPin || !isDm) return

    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    // Calculate relative position on the map
    const x = ((e.clientX - rect.left - position.x) / zoom) / rect.width * 100
    const y = ((e.clientY - rect.top - position.y) / zoom) / rect.height * 100

    setPendingPinPosition({ x, y })
    setEditModalOpen(true)
    setIsPlacingPin(false)
  }

  // Clear all fog
  const handleClearFog = () => {
    if (onFogChange) {
      onFogChange([])
      toast.success('Fog cleared')
    }
  }

  // Reveal all fog
  const handleRevealAll = () => {
    if (onFogChange) {
      // Set entire map as revealed by creating one large region
      onFogChange([{
        id: 'reveal-all',
        x: 50,
        y: 50,
        radius: 200,
        revealed: true,
      }])
      toast.success('All areas revealed')
    }
  }

  // Save pin
  const handleSavePin = async () => {
    if (!pinForm.label.trim()) {
      toast.error('Pin label is required')
      return
    }

    setSaving(true)
    try {
      const isEditing = !!selectedPin

      const response = await fetch(`/api/campaigns/${campaignId}/maps/${mapId}/pins`, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEditing ? {
          pinId: selectedPin.id,
          ...pinForm,
        } : {
          x: pendingPinPosition?.x || 50,
          y: pendingPinPosition?.y || 50,
          ...pinForm,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to save pin')
        return
      }

      toast.success(isEditing ? 'Pin updated!' : 'Pin added!')
      setEditModalOpen(false)
      setSelectedPin(null)
      setPendingPinPosition(null)
      setPinForm({
        label: '',
        description: '',
        icon: 'MapPin',
        color: '#9333ea',
        visibility: 'public',
      })
      loadPins()
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
        `/api/campaigns/${campaignId}/maps/${mapId}/pins?pinId=${pinId}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        const data = await response.json()
        toast.error(data.error || 'Failed to delete pin')
        return
      }

      toast.success('Pin deleted')
      loadPins()
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
      icon: pin.icon || 'MapPin',
      color: pin.color || '#9333ea',
      visibility: (pin.visibility as 'public' | 'party' | 'dm_only') || 'public',
    })
    setEditModalOpen(true)
  }

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public': return Eye
      case 'party': return Users
      case 'dm_only': return Lock
      default: return Eye
    }
  }

  const iconOptions = [
    { value: 'MapPin', label: 'Pin' },
    { value: 'Building', label: 'Building' },
    { value: 'Mountain', label: 'Mountain' },
    { value: 'Trees', label: 'Forest' },
    { value: 'Waves', label: 'Water' },
    { value: 'Castle', label: 'Castle' },
    { value: 'Skull', label: 'Danger' },
    { value: 'Star', label: 'Point of Interest' },
    { value: 'Flag', label: 'Flag' },
    { value: 'Home', label: 'Home' },
  ]

  const colorOptions = [
    { value: '#9333ea', label: 'Purple' },
    { value: '#ef4444', label: 'Red' },
    { value: '#f97316', label: 'Orange' },
    { value: '#eab308', label: 'Yellow' },
    { value: '#22c55e', label: 'Green' },
    { value: '#3b82f6', label: 'Blue' },
    { value: '#8b5cf6', label: 'Violet' },
    { value: '#ec4899', label: 'Pink' },
    { value: '#6b7280', label: 'Gray' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-black/20 rounded-lg">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    )
  }

  return (
    <div className={cn("relative", className)}>
      {/* Toolbar */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-[#12121a]/90 border border-[--border] rounded-lg p-1">
        <button
          onClick={handleZoomIn}
          className="p-2 hover:bg-white/[0.05] rounded text-gray-400 hover:text-white"
          title="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <span className="text-xs text-gray-400 px-2">{Math.round(zoom * 100)}%</span>
        <button
          onClick={handleZoomOut}
          className="p-2 hover:bg-white/[0.05] rounded text-gray-400 hover:text-white"
          title="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-[--border]" />
        <button
          onClick={handleResetZoom}
          className="p-2 hover:bg-white/[0.05] rounded text-gray-400 hover:text-white"
          title="Reset view"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* DM Toolbar */}
      {isDm && (
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
          {/* Fog of War Controls */}
          {fogEnabled && onFogChange && (
            <div className="flex items-center gap-1 bg-[#12121a]/90 border border-[--border] rounded-lg p-1">
              <button
                onClick={() => {
                  setIsFogMode(!isFogMode)
                  if (!isFogMode) setIsPlacingPin(false)
                }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded text-sm transition-colors",
                  isFogMode
                    ? "bg-amber-600 text-white"
                    : "hover:bg-white/[0.05] text-gray-400 hover:text-white"
                )}
                title="Toggle fog editing mode"
              >
                <Cloud className="w-4 h-4" />
                {isFogMode ? 'Exit Fog' : 'Fog'}
              </button>

              {isFogMode && (
                <>
                  <div className="w-px h-6 bg-[--border]" />
                  <button
                    onClick={() => setIsRevealMode(true)}
                    className={cn(
                      "flex items-center gap-1 px-2 py-2 rounded text-xs transition-colors",
                      isRevealMode
                        ? "bg-green-600/80 text-white"
                        : "hover:bg-white/[0.05] text-gray-400 hover:text-white"
                    )}
                    title="Reveal mode"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setIsRevealMode(false)}
                    className={cn(
                      "flex items-center gap-1 px-2 py-2 rounded text-xs transition-colors",
                      !isRevealMode
                        ? "bg-red-600/80 text-white"
                        : "hover:bg-white/[0.05] text-gray-400 hover:text-white"
                    )}
                    title="Hide mode"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-px h-6 bg-[--border]" />
                  <select
                    value={fogBrushSize}
                    onChange={(e) => setFogBrushSize(Number(e.target.value))}
                    className="bg-transparent text-xs text-gray-300 px-1 py-1 rounded"
                    title="Brush size"
                  >
                    <option value="25">S</option>
                    <option value="50">M</option>
                    <option value="100">L</option>
                    <option value="200">XL</option>
                  </select>
                  <div className="w-px h-6 bg-[--border]" />
                  <button
                    onClick={handleRevealAll}
                    className="px-2 py-2 rounded text-xs text-green-400 hover:bg-white/[0.05]"
                    title="Reveal entire map"
                  >
                    All
                  </button>
                  <button
                    onClick={handleClearFog}
                    className="px-2 py-2 rounded text-xs text-red-400 hover:bg-white/[0.05]"
                    title="Hide entire map"
                  >
                    Reset
                  </button>
                </>
              )}
            </div>
          )}

          {/* Pin Controls */}
          <div className="flex items-center gap-1 bg-[#12121a]/90 border border-[--border] rounded-lg p-1">
            <button
              onClick={() => {
                setIsPlacingPin(!isPlacingPin)
                if (!isPlacingPin) setIsFogMode(false)
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded text-sm transition-colors",
                isPlacingPin
                  ? "bg-purple-600 text-white"
                  : "hover:bg-white/[0.05] text-gray-400 hover:text-white"
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
          </div>
        </div>
      )}

      {/* Map Container */}
      <div
        ref={containerRef}
        className={cn(
          "relative overflow-hidden rounded-lg bg-black/20 border border-[--border]",
          isPlacingPin && "cursor-crosshair",
          isDragging && !isPlacingPin && "cursor-grabbing"
        )}
        style={{ height: '500px' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleMapClick}
      >
        {/* Map Image */}
        <div
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
            transformOrigin: 'top left',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
          className="relative"
        >
          <Image
            src={imageUrl}
            alt="Map"
            width={1000}
            height={750}
            className="pointer-events-none select-none"
            draggable={false}
          />

          {/* Pins */}
          {pins.map(pin => {
            const VisIcon = getVisibilityIcon(pin.visibility || 'public')
            const hasLinkedMap = !!pin.linked_map_id
            return (
              <div
                key={pin.id}
                className="absolute group"
                style={{
                  left: `${pin.x}%`,
                  top: `${pin.y}%`,
                  transform: 'translate(-50%, -100%)',
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  onPinClick?.(pin)
                }}
              >
                {/* Pin marker */}
                <div
                  className={cn(
                    "relative cursor-pointer transition-transform",
                    hasLinkedMap && "hover:scale-110"
                  )}
                  style={{ color: pin.color || '#9333ea' }}
                >
                  <MapPin
                    className="w-8 h-8 drop-shadow-lg"
                    fill="currentColor"
                    strokeWidth={1}
                    stroke="#000"
                  />

                  {/* Linked map indicator */}
                  {hasLinkedMap && (
                    <div className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center ring-2 ring-white/50">
                      <Layers className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}

                  {/* Visibility indicator */}
                  {isDm && pin.visibility !== 'public' && (
                    <div className={cn(
                      "absolute w-4 h-4 rounded-full bg-black/80 flex items-center justify-center",
                      hasLinkedMap ? "-top-1 -right-1" : "-top-1 -right-1"
                    )}>
                      <VisIcon className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </div>

                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  <div className="bg-[#12121a] border border-[--border] rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                    <p className="font-medium text-white text-sm">{pin.label}</p>
                    {pin.description && (
                      <p className="text-xs text-gray-400 mt-0.5 max-w-[200px] truncate">
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
                {isDm && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openEditModal(pin)
                      }}
                      className="p-1 bg-[#12121a] border border-[--border] rounded hover:bg-white/[0.1]"
                    >
                      <Edit2 className="w-3 h-3 text-gray-400" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeletePin(pin.id)
                      }}
                      className="p-1 bg-[#12121a] border border-[--border] rounded hover:bg-white/[0.1]"
                    >
                      <Trash2 className="w-3 h-3 text-red-400" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}

          {/* Fog of War Overlay */}
          {fogEnabled && fogOfWar.length > 0 && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ mixBlendMode: isDm ? 'normal' : 'normal' }}
            >
              <defs>
                <mask id="fog-mask">
                  {/* Start with fog covering everything (white) */}
                  <rect x="0" y="0" width="100%" height="100%" fill="white" />
                  {/* Cut out revealed areas (black) */}
                  {fogOfWar.filter(r => r.revealed).map(region => (
                    <circle
                      key={region.id}
                      cx={`${region.x}%`}
                      cy={`${region.y}%`}
                      r={`${region.radius}px`}
                      fill="black"
                    />
                  ))}
                  {/* Add hidden areas back (white) */}
                  {fogOfWar.filter(r => !r.revealed).map(region => (
                    <circle
                      key={region.id}
                      cx={`${region.x}%`}
                      cy={`${region.y}%`}
                      r={`${region.radius}px`}
                      fill="white"
                    />
                  ))}
                </mask>
              </defs>
              {/* Fog layer - only show to players */}
              {!isDm && (
                <rect
                  x="0"
                  y="0"
                  width="100%"
                  height="100%"
                  fill="rgba(0, 0, 0, 0.85)"
                  mask="url(#fog-mask)"
                />
              )}
              {/* DM preview of fog (semi-transparent) */}
              {isDm && (
                <rect
                  x="0"
                  y="0"
                  width="100%"
                  height="100%"
                  fill="rgba(255, 200, 50, 0.15)"
                  mask="url(#fog-mask)"
                />
              )}
            </svg>
          )}

          {/* Fog region markers (DM only) */}
          {isDm && fogEnabled && isFogMode && fogOfWar.map(region => (
            <div
              key={region.id}
              className="absolute pointer-events-none"
              style={{
                left: `${region.x}%`,
                top: `${region.y}%`,
                width: `${region.radius * 2}px`,
                height: `${region.radius * 2}px`,
                transform: 'translate(-50%, -50%)',
                border: `2px dashed ${region.revealed ? '#22c55e' : '#ef4444'}`,
                borderRadius: '50%',
                opacity: 0.5,
              }}
            />
          ))}
        </div>

        {/* Placing pin indicator */}
        {isPlacingPin && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-purple-600/90 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
              Click on the map to place a pin
            </div>
          </div>
        )}

        {/* Fog mode indicator */}
        {isFogMode && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={cn(
              "px-4 py-2 rounded-lg shadow-lg text-sm",
              isRevealMode
                ? "bg-green-600/90 text-white"
                : "bg-red-600/90 text-white"
            )}>
              Click on the map to {isRevealMode ? 'reveal' : 'hide'} an area
            </div>
          </div>
        )}
      </div>

      {/* Edit/Create Pin Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false)
          setSelectedPin(null)
          setPendingPinPosition(null)
          setPinForm({
            label: '',
            description: '',
            icon: 'MapPin',
            color: '#9333ea',
            visibility: 'public',
          })
        }}
        title={selectedPin ? 'Edit Pin' : 'Add Pin'}
        description={selectedPin ? 'Update this map pin' : 'Add a new pin to the map'}
        size="md"
      >
        <div className="space-y-4">
          <div className="form-group">
            <label className="form-label">Label</label>
            <Input
              value={pinForm.label}
              onChange={(e) => setPinForm({ ...pinForm, label: e.target.value })}
              placeholder="e.g., City of Thornhold"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              value={pinForm.description}
              onChange={(e) => setPinForm({ ...pinForm, description: e.target.value })}
              placeholder="Optional description..."
              rows={3}
              className="form-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Icon</label>
              <select
                value={pinForm.icon}
                onChange={(e) => setPinForm({ ...pinForm, icon: e.target.value })}
                className="form-input"
              >
                {iconOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Color</label>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setPinForm({ ...pinForm, color: opt.value })}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 transition-transform",
                      pinForm.color === opt.value
                        ? "border-white scale-110"
                        : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: opt.value }}
                    title={opt.label}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Visibility</label>
            <select
              value={pinForm.visibility}
              onChange={(e) => setPinForm({ ...pinForm, visibility: e.target.value as 'public' | 'party' | 'dm_only' })}
              className="form-input"
            >
              <option value="public">Public (visible to all)</option>
              <option value="party">Party (visible to players)</option>
              <option value="dm_only">DM Only (hidden from players)</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                setEditModalOpen(false)
                setSelectedPin(null)
                setPendingPinPosition(null)
              }}
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
                  <Check className="w-4 h-4 mr-1" />
                  {selectedPin ? 'Update' : 'Add Pin'}
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// Simple map preview for cards/lists
interface MapPreviewProps {
  imageUrl: string
  pinCount?: number
  onClick?: () => void
  className?: string
}

export function MapPreview({ imageUrl, pinCount, onClick, className }: MapPreviewProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-lg border border-[--border] group",
        className
      )}
    >
      <Image
        src={imageUrl}
        alt="Map preview"
        width={300}
        height={200}
        className="object-cover w-full h-full transition-transform group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      {pinCount !== undefined && pinCount > 0 && (
        <div className="absolute bottom-2 left-2 flex items-center gap-1 text-xs text-white/90">
          <MapPin className="w-3 h-3" />
          {pinCount} pin{pinCount !== 1 ? 's' : ''}
        </div>
      )}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
        <span className="text-white text-sm font-medium">Open Map</span>
      </div>
    </button>
  )
}

'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
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
  Cloud,
  MousePointer,
  Pencil,
  Square,
  Circle,
  Type,
  ArrowRight,
  Minus,
  Undo2,
  Redo2,
  Layers,
  Grid3X3,
  ChevronLeft,
  ExternalLink,
  Stamp,
  Paintbrush,
  Move,
  Eraser,
} from 'lucide-react'
import { Modal, Input } from '@/components/ui'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { MapPin as MapPinType, MapDrawing, WorldMap, Json } from '@/types/database'

// Tool types for the editor
export type MapTool =
  | 'select'
  | 'pan'
  | 'pin'
  | 'freehand'
  | 'line'
  | 'rectangle'
  | 'circle'
  | 'arrow'
  | 'text'
  | 'stamp'
  | 'terrain'
  | 'fog'
  | 'eraser'

// Drawing point for paths
interface Point {
  x: number
  y: number
}

// Drawing in progress
interface ActiveDrawing {
  type: MapTool
  points: Point[]
  startPoint?: Point
  endPoint?: Point
  text?: string
}

// Fog region
export interface FogRegion {
  id: string
  x: number
  y: number
  radius: number
  revealed: boolean
}

// Stamp placement
interface StampPlacement {
  id: string
  assetId: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  imageUrl: string
}

interface MapEditorProps {
  campaignId: string
  map: WorldMap
  isDm: boolean
  onPinClick?: (pin: MapPinType) => void
  onMapLinkClick?: (linkedMapId: string) => void
  onSave?: (updates: Partial<WorldMap>) => void
  className?: string
}

export function MapEditor({
  campaignId,
  map,
  isDm,
  onPinClick,
  onMapLinkClick,
  onSave,
  className,
}: MapEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  // Map state
  const [pins, setPins] = useState<MapPinType[]>([])
  const [drawings, setDrawings] = useState<MapDrawing[]>([])
  const [loading, setLoading] = useState(true)

  // View state
  const [zoom, setZoom] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Tool state
  const [activeTool, setActiveTool] = useState<MapTool>('select')
  const [toolColor, setToolColor] = useState('#ffffff')
  const [toolSize, setToolSize] = useState(3)
  const [fillEnabled, setFillEnabled] = useState(false)
  const [fillColor, setFillColor] = useState('#ffffff')
  const [fillOpacity, setFillOpacity] = useState(0.3)

  // Drawing state
  const [activeDrawing, setActiveDrawing] = useState<ActiveDrawing | null>(null)
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null)

  // Pin state
  const [selectedPin, setSelectedPin] = useState<MapPinType | null>(null)
  const [editPinModalOpen, setEditPinModalOpen] = useState(false)
  const [pendingPinPosition, setPendingPinPosition] = useState<Point | null>(null)
  const [pinForm, setPinForm] = useState({
    label: '',
    description: '',
    icon: 'MapPin',
    color: '#9333ea',
    visibility: 'public' as 'public' | 'party' | 'dm_only',
    linkedMapId: '',
  })
  const [saving, setSaving] = useState(false)

  // Fog state
  const [fogRegions, setFogRegions] = useState<FogRegion[]>([])
  const [fogBrushSize, setFogBrushSize] = useState(50)
  const [isRevealMode, setIsRevealMode] = useState(true)

  // Grid state
  const [showGrid, setShowGrid] = useState(map.grid_enabled || false)
  const [gridSize, setGridSize] = useState(map.grid_size || 50)

  // Layers visibility
  const [showLayers, setShowLayers] = useState(false)
  const [layerVisibility, setLayerVisibility] = useState({
    pins: true,
    drawings: true,
    fog: true,
    grid: showGrid,
  })

  // History for undo/redo
  const [history, setHistory] = useState<MapDrawing[][]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  // Text input state
  const [textInput, setTextInput] = useState('')
  const [textInputPosition, setTextInputPosition] = useState<Point | null>(null)

  // Load pins and drawings
  useEffect(() => {
    loadMapData()
  }, [campaignId, map.id])

  // Parse fog from map data
  useEffect(() => {
    if (map.fog_of_war && typeof map.fog_of_war === 'object') {
      const fogData = map.fog_of_war as { regions?: FogRegion[] }
      if (fogData.regions) {
        setFogRegions(fogData.regions)
      }
    }
  }, [map.fog_of_war])

  const loadMapData = async () => {
    try {
      // Load pins
      const pinsResponse = await fetch(`/api/campaigns/${campaignId}/maps/${map.id}/pins`)
      if (pinsResponse.ok) {
        const pinsData = await pinsResponse.json()
        setPins(pinsData.pins || [])
      }

      // Load drawings
      const drawingsResponse = await fetch(`/api/campaigns/${campaignId}/maps/${map.id}/drawings`)
      if (drawingsResponse.ok) {
        const drawingsData = await drawingsResponse.json()
        setDrawings(drawingsData.drawings || [])
        setHistory([drawingsData.drawings || []])
        setHistoryIndex(0)
      }
    } catch (error) {
      console.error('Failed to load map data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Convert client coordinates to map coordinates (percentages)
  const clientToMapCoords = useCallback((clientX: number, clientY: number): Point => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }

    const x = ((clientX - rect.left - position.x) / zoom) / rect.width * 100
    const y = ((clientY - rect.top - position.y) / zoom) / rect.height * 100

    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }
  }, [position, zoom])

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return // Only left click

    const point = clientToMapCoords(e.clientX, e.clientY)

    switch (activeTool) {
      case 'select':
        // Check if clicking on a drawing to select it
        // For now, start panning
        if (!selectedDrawingId) {
          setIsDragging(true)
          setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
        }
        break

      case 'pan':
        setIsDragging(true)
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
        break

      case 'pin':
        if (isDm) {
          setPendingPinPosition(point)
          setPinForm({
            label: '',
            description: '',
            icon: 'MapPin',
            color: '#9333ea',
            visibility: 'public',
            linkedMapId: '',
          })
          setEditPinModalOpen(true)
        }
        break

      case 'freehand':
        setActiveDrawing({
          type: 'freehand',
          points: [point],
        })
        break

      case 'line':
      case 'arrow':
        setActiveDrawing({
          type: activeTool,
          points: [],
          startPoint: point,
        })
        break

      case 'rectangle':
      case 'circle':
        setActiveDrawing({
          type: activeTool,
          points: [],
          startPoint: point,
        })
        break

      case 'text':
        setTextInputPosition(point)
        setTextInput('')
        break

      case 'fog':
        if (isDm) {
          handleFogClick(point)
        }
        break

      case 'eraser':
        handleEraserClick(point)
        break
    }
  }, [activeTool, clientToMapCoords, isDm, position, selectedDrawingId])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const point = clientToMapCoords(e.clientX, e.clientY)

    if (isDragging && (activeTool === 'pan' || activeTool === 'select')) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
      return
    }

    if (activeDrawing) {
      switch (activeDrawing.type) {
        case 'freehand':
          setActiveDrawing({
            ...activeDrawing,
            points: [...activeDrawing.points, point],
          })
          break

        case 'line':
        case 'arrow':
        case 'rectangle':
        case 'circle':
          setActiveDrawing({
            ...activeDrawing,
            endPoint: point,
          })
          break
      }
    }
  }, [activeTool, activeDrawing, clientToMapCoords, dragStart, isDragging])

  const handleMouseUp = useCallback(async () => {
    setIsDragging(false)

    if (activeDrawing && isDm) {
      await saveDrawing(activeDrawing)
      setActiveDrawing(null)
    }
  }, [activeDrawing, isDm])

  // Save drawing to database
  const saveDrawing = async (drawing: ActiveDrawing) => {
    if (!isDm) return

    try {
      const drawingData: Partial<MapDrawing> = {
        map_id: map.id,
        drawing_type: drawing.type as MapDrawing['drawing_type'],
        stroke_color: toolColor,
        stroke_width: toolSize,
        fill_color: fillEnabled ? fillColor : null,
        fill_opacity: fillOpacity,
        visibility: 'public',
      }

      if (drawing.type === 'freehand') {
        drawingData.points = drawing.points as unknown as MapDrawing['points']
      } else if (drawing.startPoint && drawing.endPoint) {
        if (drawing.type === 'line' || drawing.type === 'arrow') {
          drawingData.points = [drawing.startPoint, drawing.endPoint] as unknown as MapDrawing['points']
        } else if (drawing.type === 'rectangle') {
          drawingData.x = Math.min(drawing.startPoint.x, drawing.endPoint.x)
          drawingData.y = Math.min(drawing.startPoint.y, drawing.endPoint.y)
          drawingData.width = Math.abs(drawing.endPoint.x - drawing.startPoint.x)
          drawingData.height = Math.abs(drawing.endPoint.y - drawing.startPoint.y)
        } else if (drawing.type === 'circle') {
          drawingData.x = drawing.startPoint.x
          drawingData.y = drawing.startPoint.y
          const dx = drawing.endPoint.x - drawing.startPoint.x
          const dy = drawing.endPoint.y - drawing.startPoint.y
          drawingData.radius = Math.sqrt(dx * dx + dy * dy)
        }
      }

      const response = await fetch(`/api/campaigns/${campaignId}/maps/${map.id}/drawings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(drawingData),
      })

      if (response.ok) {
        const { drawing: newDrawing } = await response.json()
        const newDrawings = [...drawings, newDrawing]
        setDrawings(newDrawings)
        addToHistory(newDrawings)
      }
    } catch (error) {
      console.error('Failed to save drawing:', error)
      toast.error('Failed to save drawing')
    }
  }

  // History management
  const addToHistory = (newDrawings: MapDrawing[]) => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newDrawings)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      setDrawings(history[historyIndex - 1])
    }
  }, [history, historyIndex])

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      setDrawings(history[historyIndex + 1])
    }
  }, [history, historyIndex])

  // Fog of war
  const handleFogClick = (point: Point) => {
    const newRegion: FogRegion = {
      id: `fog-${Date.now()}`,
      x: point.x,
      y: point.y,
      radius: fogBrushSize,
      revealed: isRevealMode,
    }

    const updatedRegions = [...fogRegions, newRegion]
    setFogRegions(updatedRegions)

    // Save to map - cast to JSON compatible type
    if (onSave) {
      onSave({ fog_of_war: { regions: updatedRegions } as unknown as Json })
    }

    toast.success(isRevealMode ? 'Area revealed' : 'Area hidden')
  }

  // Eraser
  const handleEraserClick = async (point: Point) => {
    // Find drawing near click point and delete it
    const threshold = 5 // percentage
    const drawingToDelete = drawings.find(d => {
      if (d.drawing_type === 'freehand') {
        const points = d.points as unknown as Point[]
        return points.some(p =>
          Math.abs(p.x - point.x) < threshold && Math.abs(p.y - point.y) < threshold
        )
      }
      if (d.x !== null && d.y !== null) {
        return Math.abs(d.x - point.x) < threshold && Math.abs(d.y - point.y) < threshold
      }
      return false
    })

    if (drawingToDelete) {
      try {
        await fetch(`/api/campaigns/${campaignId}/maps/${map.id}/drawings?id=${drawingToDelete.id}`, {
          method: 'DELETE',
        })
        const newDrawings = drawings.filter(d => d.id !== drawingToDelete.id)
        setDrawings(newDrawings)
        addToHistory(newDrawings)
        toast.success('Drawing deleted')
      } catch (error) {
        toast.error('Failed to delete drawing')
      }
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

      const response = await fetch(`/api/campaigns/${campaignId}/maps/${map.id}/pins`, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEditing ? {
          pinId: selectedPin.id,
          ...pinForm,
          linked_map_id: pinForm.linkedMapId || null,
        } : {
          x: pendingPinPosition?.x || 50,
          y: pendingPinPosition?.y || 50,
          ...pinForm,
          linked_map_id: pinForm.linkedMapId || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        toast.error(data.error || 'Failed to save pin')
        return
      }

      toast.success(isEditing ? 'Pin updated!' : 'Pin added!')
      setEditPinModalOpen(false)
      setSelectedPin(null)
      setPendingPinPosition(null)
      loadMapData()
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
        toast.error('Failed to delete pin')
        return
      }

      toast.success('Pin deleted')
      loadMapData()
    } catch (error) {
      toast.error('Failed to delete pin')
    }
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

  // Save text annotation
  const handleSaveText = async () => {
    if (!textInput.trim() || !textInputPosition) return

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/maps/${map.id}/drawings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          map_id: map.id,
          drawing_type: 'text',
          x: textInputPosition.x,
          y: textInputPosition.y,
          text_content: textInput,
          font_size: toolSize * 5,
          stroke_color: toolColor,
          visibility: 'public',
        }),
      })

      if (response.ok) {
        const { drawing: newDrawing } = await response.json()
        const newDrawings = [...drawings, newDrawing]
        setDrawings(newDrawings)
        addToHistory(newDrawings)
        toast.success('Text added')
      }
    } catch (error) {
      toast.error('Failed to add text')
    }

    setTextInputPosition(null)
    setTextInput('')
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        if (e.shiftKey) {
          redo()
        } else {
          undo()
        }
        e.preventDefault()
      }

      if (e.key === 'Escape') {
        setActiveTool('select')
        setActiveDrawing(null)
        setTextInputPosition(null)
      }

      // Tool shortcuts
      if (e.key === 'v') setActiveTool('select')
      if (e.key === 'h') setActiveTool('pan')
      if (e.key === 'p') setActiveTool('pin')
      if (e.key === 'd') setActiveTool('freehand')
      if (e.key === 'l') setActiveTool('line')
      if (e.key === 'r') setActiveTool('rectangle')
      if (e.key === 'c') setActiveTool('circle')
      if (e.key === 't') setActiveTool('text')
      if (e.key === 'f') setActiveTool('fog')
      if (e.key === 'e') setActiveTool('eraser')
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  // Render SVG path from points
  const pointsToPath = (points: Point[]): string => {
    if (points.length === 0) return ''
    return `M ${points[0].x} ${points[0].y} ${points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')}`
  }

  // Icon options
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

  // Color options
  const colorOptions = [
    { value: '#ffffff', label: 'White' },
    { value: '#9333ea', label: 'Purple' },
    { value: '#ef4444', label: 'Red' },
    { value: '#f97316', label: 'Orange' },
    { value: '#eab308', label: 'Yellow' },
    { value: '#22c55e', label: 'Green' },
    { value: '#3b82f6', label: 'Blue' },
    { value: '#ec4899', label: 'Pink' },
    { value: '#6b7280', label: 'Gray' },
    { value: '#000000', label: 'Black' },
  ]

  // Tool definitions
  const tools: { id: MapTool; icon: React.ComponentType<{ className?: string }>; label: string; dmOnly?: boolean }[] = [
    { id: 'select', icon: MousePointer, label: 'Select (V)' },
    { id: 'pan', icon: Move, label: 'Pan (H)' },
    { id: 'pin', icon: MapPin, label: 'Pin (P)', dmOnly: true },
    { id: 'freehand', icon: Pencil, label: 'Draw (D)', dmOnly: true },
    { id: 'line', icon: Minus, label: 'Line (L)', dmOnly: true },
    { id: 'rectangle', icon: Square, label: 'Rectangle (R)', dmOnly: true },
    { id: 'circle', icon: Circle, label: 'Circle (C)', dmOnly: true },
    { id: 'arrow', icon: ArrowRight, label: 'Arrow', dmOnly: true },
    { id: 'text', icon: Type, label: 'Text (T)', dmOnly: true },
    { id: 'fog', icon: Cloud, label: 'Fog (F)', dmOnly: true },
    { id: 'eraser', icon: Eraser, label: 'Eraser (E)', dmOnly: true },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-black/20 rounded-lg">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    )
  }

  return (
    <div className={cn("relative flex flex-col h-full", className)}>
      {/* Main Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#12121a]/95 border-b border-white/10">
        {/* Left: Tool selection */}
        <div className="flex items-center gap-1">
          {tools.filter(t => !t.dmOnly || isDm).map(tool => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                activeTool === tool.id
                  ? "bg-purple-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/[0.05]"
              )}
              title={tool.label}
            >
              <tool.icon className="w-4 h-4" />
            </button>
          ))}

          <div className="w-px h-6 bg-white/10 mx-2" />

          {/* Undo/Redo */}
          {isDm && (
            <>
              <button
                onClick={undo}
                disabled={historyIndex <= 0}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.05] disabled:opacity-30"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.05] disabled:opacity-30"
                title="Redo (Ctrl+Shift+Z)"
              >
                <Redo2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Center: Tool options */}
        <div className="flex items-center gap-3">
          {/* Color picker */}
          {['freehand', 'line', 'rectangle', 'circle', 'arrow', 'text'].includes(activeTool) && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Color:</span>
              <div className="flex gap-1">
                {colorOptions.slice(0, 6).map(c => (
                  <button
                    key={c.value}
                    onClick={() => setToolColor(c.value)}
                    className={cn(
                      "w-5 h-5 rounded-full border-2 transition-transform",
                      toolColor === c.value ? "border-white scale-110" : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Size slider */}
          {['freehand', 'line', 'rectangle', 'circle', 'arrow'].includes(activeTool) && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Size:</span>
              <input
                type="range"
                min="1"
                max="10"
                value={toolSize}
                onChange={(e) => setToolSize(Number(e.target.value))}
                className="w-20 h-1 accent-purple-500"
              />
            </div>
          )}

          {/* Fill toggle */}
          {['rectangle', 'circle'].includes(activeTool) && (
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={fillEnabled}
                onChange={(e) => setFillEnabled(e.target.checked)}
                className="accent-purple-500"
              />
              Fill
            </label>
          )}

          {/* Fog controls */}
          {activeTool === 'fog' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsRevealMode(true)}
                className={cn(
                  "px-2 py-1 rounded text-xs transition-colors",
                  isRevealMode ? "bg-green-600 text-white" : "text-gray-400 hover:text-white"
                )}
              >
                Reveal
              </button>
              <button
                onClick={() => setIsRevealMode(false)}
                className={cn(
                  "px-2 py-1 rounded text-xs transition-colors",
                  !isRevealMode ? "bg-red-600 text-white" : "text-gray-400 hover:text-white"
                )}
              >
                Hide
              </button>
              <select
                value={fogBrushSize}
                onChange={(e) => setFogBrushSize(Number(e.target.value))}
                className="bg-transparent text-xs text-gray-300 px-1 py-1 rounded border border-white/10"
              >
                <option value="25">Small</option>
                <option value="50">Medium</option>
                <option value="100">Large</option>
                <option value="200">X-Large</option>
              </select>
            </div>
          )}
        </div>

        {/* Right: View controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={cn(
              "p-2 rounded-lg transition-colors",
              showGrid ? "bg-purple-600/50 text-white" : "text-gray-400 hover:text-white hover:bg-white/[0.05]"
            )}
            title="Toggle grid"
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowLayers(!showLayers)}
            className={cn(
              "p-2 rounded-lg transition-colors",
              showLayers ? "bg-purple-600/50 text-white" : "text-gray-400 hover:text-white hover:bg-white/[0.05]"
            )}
            title="Layers"
          >
            <Layers className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-white/10 mx-2" />

          <button onClick={handleZoomOut} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.05]" title="Zoom out">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-400 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={handleZoomIn} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.05]" title="Zoom in">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={handleResetZoom} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.05]" title="Reset view">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Layers panel */}
      {showLayers && (
        <div className="absolute top-14 right-3 z-30 w-48 bg-[#12121a]/95 border border-white/10 rounded-lg shadow-xl">
          <div className="p-3 border-b border-white/10">
            <h3 className="text-sm font-medium text-white">Layers</h3>
          </div>
          <div className="p-2 space-y-1">
            {Object.entries(layerVisibility).map(([layer, visible]) => (
              <label key={layer} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/[0.05] cursor-pointer">
                <input
                  type="checkbox"
                  checked={visible}
                  onChange={(e) => setLayerVisibility({ ...layerVisibility, [layer]: e.target.checked })}
                  className="accent-purple-500"
                />
                <span className="text-sm text-gray-300 capitalize">{layer}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Map Canvas */}
      <div
        ref={containerRef}
        className={cn(
          "flex-1 overflow-hidden bg-[#0a0a0f] relative",
          activeTool === 'pan' && "cursor-grab",
          activeTool === 'pan' && isDragging && "cursor-grabbing",
          activeTool === 'pin' && "cursor-crosshair",
          ['freehand', 'line', 'rectangle', 'circle', 'arrow'].includes(activeTool) && "cursor-crosshair",
          activeTool === 'text' && "cursor-text",
          activeTool === 'eraser' && "cursor-not-allowed",
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* Map image and content */}
        <div
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
            transformOrigin: 'top left',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
          className="relative"
        >
          {/* Base map image */}
          {map.image_url ? (
            <Image
              src={map.image_url}
              alt={map.name || 'Map'}
              width={1000}
              height={750}
              className="pointer-events-none select-none"
              draggable={false}
            />
          ) : (
            <div
              className="w-[1000px] h-[750px] bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1a]"
              style={{ backgroundColor: '#1a1a2e' }}
            />
          )}

          {/* Grid overlay */}
          {showGrid && layerVisibility.grid && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <defs>
                <pattern id="grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
                  <path
                    d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
                    fill="none"
                    stroke={map.grid_color || 'rgba(255,255,255,0.1)'}
                    strokeWidth="0.5"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          )}

          {/* SVG Drawing Layer */}
          <svg
            ref={svgRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {/* Existing drawings */}
            {layerVisibility.drawings && drawings.map(d => {
              if (d.drawing_type === 'freehand') {
                const points = d.points as unknown as Point[]
                return (
                  <path
                    key={d.id}
                    d={pointsToPath(points)}
                    fill="none"
                    stroke={d.stroke_color}
                    strokeWidth={d.stroke_width / 10}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={cn(selectedDrawingId === d.id && "filter drop-shadow-lg")}
                  />
                )
              }
              if (d.drawing_type === 'line') {
                const points = d.points as unknown as Point[]
                if (points.length >= 2) {
                  return (
                    <line
                      key={d.id}
                      x1={points[0].x}
                      y1={points[0].y}
                      x2={points[1].x}
                      y2={points[1].y}
                      stroke={d.stroke_color}
                      strokeWidth={d.stroke_width / 10}
                      strokeLinecap="round"
                    />
                  )
                }
              }
              if (d.drawing_type === 'arrow') {
                const points = d.points as unknown as Point[]
                if (points.length >= 2) {
                  const [start, end] = points
                  const angle = Math.atan2(end.y - start.y, end.x - start.x)
                  const arrowSize = 2
                  return (
                    <g key={d.id}>
                      <line
                        x1={start.x}
                        y1={start.y}
                        x2={end.x}
                        y2={end.y}
                        stroke={d.stroke_color}
                        strokeWidth={d.stroke_width / 10}
                        strokeLinecap="round"
                      />
                      <path
                        d={`M ${end.x} ${end.y} L ${end.x - arrowSize * Math.cos(angle - Math.PI / 6)} ${end.y - arrowSize * Math.sin(angle - Math.PI / 6)} L ${end.x - arrowSize * Math.cos(angle + Math.PI / 6)} ${end.y - arrowSize * Math.sin(angle + Math.PI / 6)} Z`}
                        fill={d.stroke_color}
                      />
                    </g>
                  )
                }
              }
              if (d.drawing_type === 'rectangle' && d.x !== null && d.y !== null && d.width && d.height) {
                return (
                  <rect
                    key={d.id}
                    x={d.x}
                    y={d.y}
                    width={d.width}
                    height={d.height}
                    fill={d.fill_color || 'none'}
                    fillOpacity={d.fill_opacity}
                    stroke={d.stroke_color}
                    strokeWidth={d.stroke_width / 10}
                  />
                )
              }
              if (d.drawing_type === 'circle' && d.x !== null && d.y !== null && d.radius) {
                return (
                  <circle
                    key={d.id}
                    cx={d.x}
                    cy={d.y}
                    r={d.radius}
                    fill={d.fill_color || 'none'}
                    fillOpacity={d.fill_opacity}
                    stroke={d.stroke_color}
                    strokeWidth={d.stroke_width / 10}
                  />
                )
              }
              if (d.drawing_type === 'text' && d.x !== null && d.y !== null && d.text_content) {
                return (
                  <text
                    key={d.id}
                    x={d.x}
                    y={d.y}
                    fill={d.stroke_color}
                    fontSize={d.font_size / 5}
                    fontFamily={d.font_family}
                    className="select-none"
                  >
                    {d.text_content}
                  </text>
                )
              }
              return null
            })}

            {/* Active drawing preview */}
            {activeDrawing && (
              <>
                {activeDrawing.type === 'freehand' && (
                  <path
                    d={pointsToPath(activeDrawing.points)}
                    fill="none"
                    stroke={toolColor}
                    strokeWidth={toolSize / 10}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
                {activeDrawing.type === 'line' && activeDrawing.startPoint && activeDrawing.endPoint && (
                  <line
                    x1={activeDrawing.startPoint.x}
                    y1={activeDrawing.startPoint.y}
                    x2={activeDrawing.endPoint.x}
                    y2={activeDrawing.endPoint.y}
                    stroke={toolColor}
                    strokeWidth={toolSize / 10}
                    strokeLinecap="round"
                    strokeDasharray="2 2"
                  />
                )}
                {activeDrawing.type === 'arrow' && activeDrawing.startPoint && activeDrawing.endPoint && (
                  <line
                    x1={activeDrawing.startPoint.x}
                    y1={activeDrawing.startPoint.y}
                    x2={activeDrawing.endPoint.x}
                    y2={activeDrawing.endPoint.y}
                    stroke={toolColor}
                    strokeWidth={toolSize / 10}
                    strokeLinecap="round"
                    strokeDasharray="2 2"
                  />
                )}
                {activeDrawing.type === 'rectangle' && activeDrawing.startPoint && activeDrawing.endPoint && (
                  <rect
                    x={Math.min(activeDrawing.startPoint.x, activeDrawing.endPoint.x)}
                    y={Math.min(activeDrawing.startPoint.y, activeDrawing.endPoint.y)}
                    width={Math.abs(activeDrawing.endPoint.x - activeDrawing.startPoint.x)}
                    height={Math.abs(activeDrawing.endPoint.y - activeDrawing.startPoint.y)}
                    fill={fillEnabled ? fillColor : 'none'}
                    fillOpacity={fillOpacity}
                    stroke={toolColor}
                    strokeWidth={toolSize / 10}
                    strokeDasharray="2 2"
                  />
                )}
                {activeDrawing.type === 'circle' && activeDrawing.startPoint && activeDrawing.endPoint && (
                  <circle
                    cx={activeDrawing.startPoint.x}
                    cy={activeDrawing.startPoint.y}
                    r={Math.sqrt(
                      Math.pow(activeDrawing.endPoint.x - activeDrawing.startPoint.x, 2) +
                      Math.pow(activeDrawing.endPoint.y - activeDrawing.startPoint.y, 2)
                    )}
                    fill={fillEnabled ? fillColor : 'none'}
                    fillOpacity={fillOpacity}
                    stroke={toolColor}
                    strokeWidth={toolSize / 10}
                    strokeDasharray="2 2"
                  />
                )}
              </>
            )}
          </svg>

          {/* Pins */}
          {layerVisibility.pins && pins.map(pin => (
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
                if (pin.linked_map_id && onMapLinkClick) {
                  onMapLinkClick(pin.linked_map_id)
                } else {
                  onPinClick?.(pin)
                }
              }}
            >
              {/* Pin marker */}
              <div
                className="relative cursor-pointer"
                style={{ color: pin.color || '#9333ea' }}
              >
                <MapPin
                  className="w-8 h-8 drop-shadow-lg"
                  fill="currentColor"
                  strokeWidth={1}
                  stroke="#000"
                />

                {/* Link indicator */}
                {pin.linked_map_id && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                    <ExternalLink className="w-2.5 h-2.5 text-white" />
                  </div>
                )}

                {/* Visibility indicator */}
                {isDm && pin.visibility !== 'public' && (
                  <div className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-black/80 flex items-center justify-center">
                    {pin.visibility === 'dm_only' ? (
                      <Lock className="w-2.5 h-2.5 text-white" />
                    ) : (
                      <Users className="w-2.5 h-2.5 text-white" />
                    )}
                  </div>
                )}
              </div>

              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                <div className="bg-[#12121a] border border-white/10 rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                  <p className="font-medium text-white text-sm">{pin.label}</p>
                  {pin.description && (
                    <p className="text-xs text-gray-400 mt-0.5 max-w-[200px] truncate">
                      {pin.description}
                    </p>
                  )}
                  {pin.linked_map_id && (
                    <p className="text-xs text-blue-400 mt-1">Click to open linked map</p>
                  )}
                </div>
              </div>

              {/* Edit/Delete buttons (DM only) */}
              {isDm && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedPin(pin)
                      setPinForm({
                        label: pin.label,
                        description: pin.description || '',
                        icon: pin.icon || 'MapPin',
                        color: pin.color || '#9333ea',
                        visibility: (pin.visibility as 'public' | 'party' | 'dm_only') || 'public',
                        linkedMapId: pin.linked_map_id || '',
                      })
                      setEditPinModalOpen(true)
                    }}
                    className="p-1 bg-[#12121a] border border-white/10 rounded hover:bg-white/[0.1]"
                  >
                    <Edit2 className="w-3 h-3 text-gray-400" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeletePin(pin.id)
                    }}
                    className="p-1 bg-[#12121a] border border-white/10 rounded hover:bg-white/[0.1]"
                  >
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Fog of War Overlay */}
          {layerVisibility.fog && fogRegions.length > 0 && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
            >
              <defs>
                <mask id="fog-mask">
                  <rect x="0" y="0" width="100%" height="100%" fill="white" />
                  {fogRegions.filter(r => r.revealed).map(region => (
                    <circle
                      key={region.id}
                      cx={`${region.x}%`}
                      cy={`${region.y}%`}
                      r={`${region.radius}px`}
                      fill="black"
                    />
                  ))}
                  {fogRegions.filter(r => !r.revealed).map(region => (
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
        </div>

        {/* Text input overlay */}
        {textInputPosition && (
          <div
            className="absolute z-40"
            style={{
              left: `${textInputPosition.x}%`,
              top: `${textInputPosition.y}%`,
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
            }}
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveText()
                if (e.key === 'Escape') setTextInputPosition(null)
              }}
              autoFocus
              placeholder="Type text..."
              className="px-2 py-1 text-sm bg-white text-black rounded border-2 border-purple-500 focus:outline-none"
              style={{ color: toolColor, minWidth: '100px' }}
            />
          </div>
        )}

        {/* Tool indicator */}
        {activeTool !== 'select' && activeTool !== 'pan' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-purple-600/90 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
            {activeTool === 'pin' && 'Click to place a pin'}
            {activeTool === 'freehand' && 'Click and drag to draw'}
            {activeTool === 'line' && 'Click and drag to draw a line'}
            {activeTool === 'rectangle' && 'Click and drag to draw a rectangle'}
            {activeTool === 'circle' && 'Click and drag to draw a circle'}
            {activeTool === 'arrow' && 'Click and drag to draw an arrow'}
            {activeTool === 'text' && 'Click to add text'}
            {activeTool === 'fog' && `Click to ${isRevealMode ? 'reveal' : 'hide'} an area`}
            {activeTool === 'eraser' && 'Click on drawings to delete'}
          </div>
        )}
      </div>

      {/* Edit Pin Modal */}
      <Modal
        isOpen={editPinModalOpen}
        onClose={() => {
          setEditPinModalOpen(false)
          setSelectedPin(null)
          setPendingPinPosition(null)
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
                {colorOptions.slice(1, 9).map(opt => (
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

          <div className="form-group">
            <label className="form-label">Link to Map (optional)</label>
            <Input
              value={pinForm.linkedMapId}
              onChange={(e) => setPinForm({ ...pinForm, linkedMapId: e.target.value })}
              placeholder="Map ID to link to (for drill-down)"
            />
            <p className="text-xs text-gray-500 mt-1">
              When set, clicking this pin will navigate to the linked map
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                setEditPinModalOpen(false)
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

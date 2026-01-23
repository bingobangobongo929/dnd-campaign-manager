'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import {
  Network,
  Users,
  Heart,
  Swords,
  HelpCircle,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import type { Character, CharacterRelationship } from '@/types/database'

interface RelationshipDiagramProps {
  characters: Character[]
  relationships: CharacterRelationship[]
  className?: string
}

interface Node {
  id: string
  character: Character
  x: number
  y: number
  vx: number
  vy: number
}

interface Edge {
  source: string
  target: string
  relationship: CharacterRelationship
}

const RELATIONSHIP_COLORS: Record<string, string> = {
  family: '#ec4899',
  romantic: '#f43f5e',
  friend: '#22c55e',
  ally: '#3b82f6',
  rival: '#f97316',
  enemy: '#ef4444',
  acquaintance: '#6b7280',
  mentor: '#8b5cf6',
  student: '#a855f7',
  business: '#eab308',
}

const RELATIONSHIP_ICONS: Record<string, typeof Heart> = {
  family: Heart,
  romantic: Heart,
  friend: Users,
  ally: Users,
  rival: Swords,
  enemy: Swords,
  acquaintance: HelpCircle,
  mentor: Users,
  student: Users,
  business: Users,
}

export function RelationshipDiagram({
  characters,
  relationships,
  className,
}: RelationshipDiagramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const animationRef = useRef<number>()

  // Initialize nodes and edges
  useEffect(() => {
    if (characters.length === 0) return

    const width = containerRef.current?.clientWidth || 800
    const height = containerRef.current?.clientHeight || 600
    const centerX = width / 2
    const centerY = height / 2

    // Create nodes from characters
    const initialNodes: Node[] = characters.map((char, i) => {
      const angle = (2 * Math.PI * i) / characters.length
      const radius = Math.min(width, height) * 0.3
      return {
        id: char.id,
        character: char,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        vx: 0,
        vy: 0,
      }
    })

    // Create edges from relationships
    const initialEdges: Edge[] = relationships
      .filter(rel => {
        const sourceExists = characters.some(c => c.id === rel.character_id)
        const targetExists = characters.some(c => c.id === rel.related_character_id)
        return sourceExists && targetExists
      })
      .map(rel => ({
        source: rel.character_id,
        target: rel.related_character_id!,
        relationship: rel,
      }))

    setNodes(initialNodes)
    setEdges(initialEdges)
  }, [characters, relationships])

  // Force-directed layout simulation
  const simulate = useCallback(() => {
    if (nodes.length === 0) return

    const width = containerRef.current?.clientWidth || 800
    const height = containerRef.current?.clientHeight || 600

    setNodes(prevNodes => {
      const newNodes = [...prevNodes]

      // Apply forces
      for (let i = 0; i < newNodes.length; i++) {
        const node = newNodes[i]

        // Repulsion from other nodes
        for (let j = 0; j < newNodes.length; j++) {
          if (i === j) continue
          const other = newNodes[j]
          const dx = node.x - other.x
          const dy = node.y - other.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const force = 5000 / (dist * dist)
          node.vx += (dx / dist) * force
          node.vy += (dy / dist) * force
        }

        // Attraction along edges
        edges.forEach(edge => {
          if (edge.source === node.id || edge.target === node.id) {
            const otherId = edge.source === node.id ? edge.target : edge.source
            const other = newNodes.find(n => n.id === otherId)
            if (other) {
              const dx = other.x - node.x
              const dy = other.y - node.y
              const dist = Math.sqrt(dx * dx + dy * dy) || 1
              const force = dist * 0.01
              node.vx += (dx / dist) * force
              node.vy += (dy / dist) * force
            }
          }
        })

        // Center gravity
        const dx = width / 2 - node.x
        const dy = height / 2 - node.y
        node.vx += dx * 0.001
        node.vy += dy * 0.001

        // Apply velocity with damping
        node.x += node.vx * 0.1
        node.y += node.vy * 0.1
        node.vx *= 0.9
        node.vy *= 0.9

        // Keep within bounds
        const padding = 50
        node.x = Math.max(padding, Math.min(width - padding, node.x))
        node.y = Math.max(padding, Math.min(height - padding, node.y))
      }

      return newNodes
    })
  }, [nodes.length, edges])

  // Run simulation
  useEffect(() => {
    if (!isSimulating) return

    let frameCount = 0
    const maxFrames = 200

    const tick = () => {
      simulate()
      frameCount++
      if (frameCount < maxFrames) {
        animationRef.current = requestAnimationFrame(tick)
      } else {
        setIsSimulating(false)
      }
    }

    animationRef.current = requestAnimationFrame(tick)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isSimulating, simulate])

  // Draw on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // Clear
    ctx.clearRect(0, 0, width, height)

    // Apply transform
    ctx.save()
    ctx.translate(offset.x, offset.y)
    ctx.scale(zoom, zoom)

    // Draw edges
    edges.forEach(edge => {
      const source = nodes.find(n => n.id === edge.source)
      const target = nodes.find(n => n.id === edge.target)
      if (!source || !target) return

      const relType = edge.relationship.type || 'acquaintance'
      const color = RELATIONSHIP_COLORS[relType] || RELATIONSHIP_COLORS.acquaintance

      ctx.beginPath()
      ctx.moveTo(source.x, source.y)
      ctx.lineTo(target.x, target.y)
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.stroke()

      // Draw relationship label at midpoint
      const midX = (source.x + target.x) / 2
      const midY = (source.y + target.y) / 2

      ctx.fillStyle = '#1a1a24'
      ctx.fillRect(midX - 30, midY - 10, 60, 20)
      ctx.fillStyle = color
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(relType, midX, midY)
    })

    // Draw nodes
    nodes.forEach(node => {
      const isSelected = selectedNode === node.id
      const isHovered = hoveredNode === node.id

      // Node circle
      ctx.beginPath()
      ctx.arc(node.x, node.y, 30, 0, 2 * Math.PI)
      ctx.fillStyle = isSelected || isHovered ? '#3b3b5c' : '#1a1a24'
      ctx.fill()
      ctx.strokeStyle = isSelected ? '#9333ea' : isHovered ? '#6b7280' : '#3b3b5c'
      ctx.lineWidth = isSelected ? 3 : 2
      ctx.stroke()

      // Character initials
      ctx.fillStyle = '#9333ea'
      ctx.font = 'bold 14px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(getInitials(node.character.name), node.x, node.y)

      // Name label
      ctx.fillStyle = '#ffffff'
      ctx.font = '12px sans-serif'
      ctx.fillText(node.character.name, node.x, node.y + 45)
    })

    ctx.restore()
  }, [nodes, edges, zoom, offset, selectedNode, hoveredNode])

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = (e.clientX - rect.left - offset.x) / zoom
    const y = (e.clientY - rect.top - offset.y) / zoom

    // Check if clicking on a node
    const clickedNode = nodes.find(node => {
      const dx = node.x - x
      const dy = node.y - y
      return Math.sqrt(dx * dx + dy * dy) < 30
    })

    if (clickedNode) {
      setSelectedNode(clickedNode.id)
    } else {
      setSelectedNode(null)
      setIsDragging(true)
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = (e.clientX - rect.left - offset.x) / zoom
    const y = (e.clientY - rect.top - offset.y) / zoom

    // Check if hovering over a node
    const hoveredNodeFound = nodes.find(node => {
      const dx = node.x - x
      const dy = node.y - y
      return Math.sqrt(dx * dx + dy * dy) < 30
    })

    setHoveredNode(hoveredNodeFound?.id || null)

    // Panning
    if (isDragging) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setZoom(z => Math.min(Math.max(z + delta, 0.5), 3))
  }

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.2, 3))
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.2, 0.5))
  const handleReset = () => {
    setZoom(1)
    setOffset({ x: 0, y: 0 })
  }

  const handleExport = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const link = document.createElement('a')
    link.download = 'relationship-diagram.png'
    link.href = canvas.toDataURL()
    link.click()
  }

  // Get selected character info
  const selectedCharacter = selectedNode
    ? nodes.find(n => n.id === selectedNode)?.character
    : null

  const selectedRelationships = selectedNode
    ? edges.filter(e => e.source === selectedNode || e.target === selectedNode)
    : []

  if (characters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <Network className="w-12 h-12 mb-3 opacity-50" />
        <p>No characters to visualize</p>
        <p className="text-sm text-gray-600">Add characters with relationships to see the diagram</p>
      </div>
    )
  }

  return (
    <div className={cn("relative", className)}>
      {/* Toolbar */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-[#12121a]/90 border border-[--border] rounded-lg p-1">
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
          onClick={handleReset}
          className="p-2 hover:bg-white/[0.05] rounded text-gray-400 hover:text-white"
          title="Reset view"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => setIsSimulating(true)}
          disabled={isSimulating}
          className="p-2 hover:bg-white/[0.05] rounded text-gray-400 hover:text-white disabled:opacity-50"
          title="Re-layout"
        >
          {isSimulating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </button>
        <div className="w-px h-6 bg-[--border]" />
        <button
          onClick={handleExport}
          className="p-2 hover:bg-white/[0.05] rounded text-gray-400 hover:text-white"
          title="Export as image"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute top-3 right-3 z-10 bg-[#12121a]/90 border border-[--border] rounded-lg p-3">
        <p className="text-xs font-medium text-gray-400 mb-2">Relationship Types</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {Object.entries(RELATIONSHIP_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2">
              <div
                className="w-3 h-0.5"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-gray-500 capitalize">{type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-lg bg-[#0a0a0f] border border-[--border]"
        style={{ height: '500px' }}
      >
        <canvas
          ref={canvasRef}
          width={800}
          height={500}
          className={cn(
            "w-full h-full",
            isDragging ? "cursor-grabbing" : hoveredNode ? "cursor-pointer" : "cursor-grab"
          )}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        />
      </div>

      {/* Selected Character Info */}
      {selectedCharacter && (
        <div className="absolute bottom-3 left-3 z-10 bg-[#12121a]/95 border border-[--border] rounded-lg p-4 max-w-xs">
          <div className="flex items-center gap-3 mb-3">
            {selectedCharacter.image_url ? (
              <Image
                src={selectedCharacter.image_url}
                alt={selectedCharacter.name}
                width={40}
                height={40}
                className="rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-400 font-medium">
                {getInitials(selectedCharacter.name)}
              </div>
            )}
            <div>
              <p className="font-medium text-white">{selectedCharacter.name}</p>
              <p className="text-xs text-gray-500">{selectedCharacter.type || 'Character'}</p>
            </div>
          </div>

          {selectedRelationships.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-2">Relationships:</p>
              <div className="space-y-1">
                {selectedRelationships.map((edge, i) => {
                  const otherId = edge.source === selectedNode ? edge.target : edge.source
                  const other = nodes.find(n => n.id === otherId)
                  if (!other) return null
                  const relType = edge.relationship.type || 'acquaintance'
                  const color = RELATIONSHIP_COLORS[relType] || RELATIONSHIP_COLORS.acquaintance
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span style={{ color }}>{relType}</span>
                      <span className="text-gray-500">with</span>
                      <span className="text-white">{other.character.name}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

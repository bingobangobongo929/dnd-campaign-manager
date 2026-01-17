'use client'

import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import Image from 'next/image'
import { getInitials } from '@/lib/utils'

interface RelationshipGraphProps {
  characters: any[]
  relationships: any[]
}

interface GraphNode {
  id: string
  name: string
  image_url?: string | null
  is_pc: boolean
  x: number
  y: number
  vx: number
  vy: number
}

interface GraphEdge {
  source: string
  target: string
  type: string
  label?: string
  isKnown: boolean
}

const RELATIONSHIP_COLORS: Record<string, string> = {
  ally: '#22c55e',
  enemy: '#ef4444',
  family: '#a855f7',
  friend: '#3b82f6',
  rival: '#f59e0b',
  mentor: '#06b6d4',
  romantic: '#ec4899',
  neutral: '#6b7280',
}

export function RelationshipGraph({ characters, relationships }: RelationshipGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 })
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const animationRef = useRef<number | null>(null)
  const isDragging = useRef(false)
  const dragNode = useRef<string | null>(null)

  // Build graph data
  const edges = useMemo<GraphEdge[]>(() => {
    return relationships.map(rel => ({
      source: rel.character_id,
      target: rel.related_character_id,
      type: rel.relationship_type || 'neutral',
      label: rel.relationship_label,
      isKnown: rel.is_known_to_party,
    }))
  }, [relationships])

  // Initialize nodes with positions
  useEffect(() => {
    if (!containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    setDimensions({ width: rect.width, height: rect.height })

    // Position nodes in a circle initially
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const radius = Math.min(rect.width, rect.height) * 0.35

    const initialNodes = characters.map((char, i) => {
      const angle = (2 * Math.PI * i) / characters.length
      return {
        id: char.id,
        name: char.name,
        image_url: char.image_url,
        is_pc: char.is_pc,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        vx: 0,
        vy: 0,
      }
    })

    setNodes(initialNodes)
  }, [characters])

  // Simple force-directed layout simulation
  useEffect(() => {
    if (nodes.length === 0) return

    const simulate = () => {
      const nodeMap = new Map(nodes.map(n => [n.id, { ...n }]))

      // Apply forces
      for (const [id, node] of nodeMap) {
        // Reset velocity
        node.vx = 0
        node.vy = 0

        // Repulsion from other nodes
        for (const [otherId, other] of nodeMap) {
          if (id === otherId) continue

          const dx = node.x - other.x
          const dy = node.y - other.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const minDist = 120

          if (dist < minDist) {
            const force = ((minDist - dist) / dist) * 2
            node.vx += dx * force
            node.vy += dy * force
          }
        }

        // Attraction along edges
        for (const edge of edges) {
          let other: typeof node | undefined
          if (edge.source === id) {
            other = nodeMap.get(edge.target)
          } else if (edge.target === id) {
            other = nodeMap.get(edge.source)
          }

          if (other) {
            const dx = other.x - node.x
            const dy = other.y - node.y
            const dist = Math.sqrt(dx * dx + dy * dy) || 1
            const idealDist = 180
            const force = ((dist - idealDist) / dist) * 0.1

            node.vx += dx * force
            node.vy += dy * force
          }
        }

        // Center gravity
        const centerX = dimensions.width / 2
        const centerY = dimensions.height / 2
        node.vx += (centerX - node.x) * 0.01
        node.vy += (centerY - node.y) * 0.01

        // Damping
        node.vx *= 0.8
        node.vy *= 0.8
      }

      // Apply velocities (skip dragged node)
      const updatedNodes = Array.from(nodeMap.values()).map(node => {
        if (dragNode.current === node.id) return node

        const newX = Math.max(40, Math.min(dimensions.width - 40, node.x + node.vx))
        const newY = Math.max(40, Math.min(dimensions.height - 40, node.y + node.vy))

        return { ...node, x: newX, y: newY }
      })

      setNodes(updatedNodes)

      // Continue animation if there's significant movement
      const maxVelocity = Math.max(...updatedNodes.map(n => Math.abs(n.vx) + Math.abs(n.vy)))
      if (maxVelocity > 0.5 && !isDragging.current) {
        animationRef.current = requestAnimationFrame(simulate)
      }
    }

    // Run simulation
    animationRef.current = requestAnimationFrame(simulate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [nodes.length, edges, dimensions])

  // Mouse handlers for dragging
  const handleMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.preventDefault()
    isDragging.current = true
    dragNode.current = nodeId
    setSelectedNode(nodeId)
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !dragNode.current || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setNodes(prev => prev.map(node =>
      node.id === dragNode.current
        ? { ...node, x: Math.max(40, Math.min(dimensions.width - 40, x)), y: Math.max(40, Math.min(dimensions.height - 40, y)) }
        : node
    ))
  }, [dimensions])

  const handleMouseUp = useCallback(() => {
    isDragging.current = false
    dragNode.current = null
  }, [])

  // Get edges connected to a node
  const getConnectedEdges = useCallback((nodeId: string | null) => {
    if (!nodeId) return new Set<string>()
    const connected = new Set<string>()
    edges.forEach(e => {
      if (e.source === nodeId || e.target === nodeId) {
        connected.add(e.source)
        connected.add(e.target)
      }
    })
    return connected
  }, [edges])

  const highlightedNodes = useMemo(() => {
    return getConnectedEdges(hoveredNode || selectedNode)
  }, [hoveredNode, selectedNode, getConnectedEdges])

  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes])

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <svg className="absolute inset-0 w-full h-full">
        {/* Edges */}
        {edges.map((edge, i) => {
          const source = nodeMap.get(edge.source)
          const target = nodeMap.get(edge.target)
          if (!source || !target) return null

          const isHighlighted = highlightedNodes.has(edge.source) && highlightedNodes.has(edge.target)
          const color = RELATIONSHIP_COLORS[edge.type] || RELATIONSHIP_COLORS.neutral

          // Calculate midpoint for label
          const midX = (source.x + target.x) / 2
          const midY = (source.y + target.y) / 2

          return (
            <g key={i}>
              <line
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke={color}
                strokeWidth={isHighlighted ? 3 : 2}
                strokeOpacity={hoveredNode || selectedNode ? (isHighlighted ? 0.8 : 0.15) : 0.5}
                strokeDasharray={edge.isKnown ? undefined : '5,5'}
              />
              {edge.label && isHighlighted && (
                <g transform={`translate(${midX}, ${midY})`}>
                  <rect
                    x={-edge.label.length * 3.5}
                    y={-10}
                    width={edge.label.length * 7}
                    height={20}
                    rx={4}
                    fill="#1a1a24"
                    stroke={color}
                    strokeWidth={1}
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={color}
                    fontSize={10}
                    fontWeight={500}
                  >
                    {edge.label}
                  </text>
                </g>
              )}
            </g>
          )
        })}
      </svg>

      {/* Nodes */}
      {nodes.map(node => {
        const isHighlighted = !hoveredNode && !selectedNode || highlightedNodes.has(node.id)
        const isActive = hoveredNode === node.id || selectedNode === node.id

        return (
          <div
            key={node.id}
            className={`absolute cursor-grab active:cursor-grabbing transition-all duration-150 ${
              isActive ? 'z-20 scale-110' : isHighlighted ? 'z-10' : 'z-0 opacity-30'
            }`}
            style={{
              left: node.x - 30,
              top: node.y - 30,
              width: 60,
              height: 60,
            }}
            onMouseDown={(e) => handleMouseDown(e, node.id)}
            onMouseEnter={() => setHoveredNode(node.id)}
            onMouseLeave={() => setHoveredNode(null)}
          >
            <div
              className={`w-full h-full rounded-full overflow-hidden border-2 transition-colors ${
                isActive
                  ? 'border-purple-500 shadow-lg shadow-purple-500/30'
                  : node.is_pc
                    ? 'border-purple-500/50'
                    : 'border-gray-500/50'
              }`}
            >
              {node.image_url ? (
                <Image
                  src={node.image_url}
                  alt={node.name}
                  fill
                  className="object-cover"
                  sizes="60px"
                  draggable={false}
                />
              ) : (
                <div className={`w-full h-full flex items-center justify-center ${
                  node.is_pc ? 'bg-purple-500/20' : 'bg-gray-500/20'
                }`}>
                  <span className="text-sm font-bold text-gray-400">
                    {getInitials(node.name)}
                  </span>
                </div>
              )}
            </div>

            {/* Name label */}
            {(isActive || isHighlighted) && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 whitespace-nowrap">
                <span className="px-2 py-0.5 bg-[#1a1a24] rounded text-xs text-white font-medium border border-white/10">
                  {node.name}
                </span>
              </div>
            )}
          </div>
        )
      })}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 p-3 bg-[#1a1a24]/90 rounded-lg border border-white/10">
        <p className="text-xs text-gray-500 mb-2">Relationship Types</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(RELATIONSHIP_COLORS).slice(0, 5).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 rounded" style={{ backgroundColor: color }} />
              <span className="text-[10px] text-gray-400 capitalize">{type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute top-4 right-4 text-xs text-gray-500">
        Drag to move nodes
      </div>
    </div>
  )
}

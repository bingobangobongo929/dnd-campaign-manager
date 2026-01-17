'use client'

import { useMemo, useCallback } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  ReactFlowProvider,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import Image from 'next/image'
import { getInitials } from '@/lib/utils'

interface ReadOnlyCanvasProps {
  characters: any[]
  characterTags: Record<string, any[]>
  groups: any[]
}

const DEFAULT_CARD_WIDTH = 200
const DEFAULT_CARD_HEIGHT = 280

// Read-only character node component
function ReadOnlyCharacterNode({ data }: { data: any }) {
  const character = data.character
  const tags = data.tags || []

  // Get status tag if exists
  const statusTag = tags.find((t: any) => t.tag?.category === 'status')

  return (
    <div
      className="rounded-xl overflow-hidden bg-[#1a1a24] border border-white/[0.08] shadow-lg"
      style={{ width: '100%', height: '100%' }}
    >
      {/* Image */}
      <div className="relative h-[65%] overflow-hidden">
        {character.image_url ? (
          <Image
            src={character.image_url}
            alt={character.name}
            fill
            className="object-cover"
            sizes="200px"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-500/10 to-transparent flex items-center justify-center">
            <span className="text-4xl font-semibold text-gray-600">
              {getInitials(character.name)}
            </span>
          </div>
        )}

        {/* Status overlay */}
        {statusTag && (
          <div
            className="absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-medium"
            style={{
              backgroundColor: `${statusTag.tag.color}20`,
              color: statusTag.tag.color,
            }}
          >
            {statusTag.tag.name}
          </div>
        )}

        {/* PC/NPC badge */}
        <div className={`absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-medium ${
          character.is_pc ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-500/20 text-gray-400'
        }`}>
          {character.is_pc ? 'PC' : 'NPC'}
        </div>
      </div>

      {/* Info */}
      <div className="p-3 h-[35%] flex flex-col">
        <h3 className="text-sm font-semibold text-white truncate">{character.name}</h3>
        {(character.race || character.class) && (
          <p className="text-xs text-gray-500 truncate mt-0.5">
            {character.race} {character.class}
          </p>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-auto pt-2">
            {tags.filter((t: any) => t.tag?.category !== 'status').slice(0, 3).map((t: any) => (
              <span
                key={t.id}
                className="px-1.5 py-0.5 rounded text-[10px]"
                style={{
                  backgroundColor: `${t.tag?.color || '#888'}15`,
                  color: t.tag?.color || '#888',
                }}
              >
                {t.tag?.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Read-only group node component
function ReadOnlyGroupNode({ data }: { data: any }) {
  const group = data.group

  return (
    <div
      className="rounded-xl border-2 border-dashed"
      style={{
        backgroundColor: `${group.color}08`,
        borderColor: `${group.color}30`,
        width: '100%',
        height: '100%',
      }}
    >
      <div className="px-3 py-2">
        <h4
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: group.color }}
        >
          {group.name}
        </h4>
      </div>
    </div>
  )
}

const nodeTypes = {
  character: ReadOnlyCharacterNode,
  group: ReadOnlyGroupNode,
}

function ReadOnlyCanvasInner({ characters, characterTags, groups }: ReadOnlyCanvasProps) {
  // Create nodes from characters and groups
  const nodes = useMemo(() => {
    const characterNodes = characters.map((char) => ({
      id: char.id,
      type: 'character' as const,
      position: { x: char.position_x || 0, y: char.position_y || 0 },
      style: {
        width: char.canvas_width || DEFAULT_CARD_WIDTH,
        height: char.canvas_height || DEFAULT_CARD_HEIGHT,
      },
      data: {
        character: char,
        tags: characterTags[char.id] || [],
      },
      draggable: false,
      selectable: false,
    }))

    const groupNodes = groups.map((group) => ({
      id: `group-${group.id}`,
      type: 'group' as const,
      position: { x: group.position_x, y: group.position_y },
      style: { width: group.width, height: group.height },
      zIndex: -1,
      data: { group },
      draggable: false,
      selectable: false,
    }))

    return [...groupNodes, ...characterNodes] as Node[]
  }, [characters, characterTags, groups])

  // Calculate initial viewport to fit all nodes
  const initialViewport = useMemo(() => {
    if (nodes.length === 0) return { x: 0, y: 0, zoom: 1 }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

    for (const node of nodes) {
      const width = (node.style?.width as number) || DEFAULT_CARD_WIDTH
      const height = (node.style?.height as number) || DEFAULT_CARD_HEIGHT
      minX = Math.min(minX, node.position.x)
      minY = Math.min(minY, node.position.y)
      maxX = Math.max(maxX, node.position.x + width)
      maxY = Math.max(maxY, node.position.y + height)
    }

    const contentWidth = maxX - minX
    const contentHeight = maxY - minY
    const padding = 100

    // Center the content
    const centerX = minX + contentWidth / 2
    const centerY = minY + contentHeight / 2

    return {
      x: -centerX + 400, // Adjust based on container width
      y: -centerY + 300, // Adjust based on container height
      zoom: 0.8,
    }
  }, [nodes])

  return (
    <ReactFlow
      nodes={nodes}
      edges={[]}
      nodeTypes={nodeTypes}
      defaultViewport={initialViewport}
      minZoom={0.1}
      maxZoom={2}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      panOnScroll
      zoomOnScroll
      panOnDrag
      proOptions={{ hideAttribution: true }}
    >
      <Background color="#333" gap={20} size={1} />
      <Controls showInteractive={false} />
      <MiniMap
        nodeColor={(node) => {
          if (node.type === 'group') return (node.data as any).group?.color || '#444'
          return (node.data as any).character?.is_pc ? '#8b5cf6' : '#6b7280'
        }}
        maskColor="rgba(0, 0, 0, 0.8)"
        style={{ backgroundColor: '#1a1a24' }}
      />
    </ReactFlow>
  )
}

export function ReadOnlyCanvas(props: ReadOnlyCanvasProps) {
  return (
    <ReactFlowProvider>
      <ReadOnlyCanvasInner {...props} />
    </ReactFlowProvider>
  )
}

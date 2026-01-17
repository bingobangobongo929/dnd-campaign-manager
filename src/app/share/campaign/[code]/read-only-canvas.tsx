'use client'

import { useMemo, useState } from 'react'
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
import { getInitials, cn } from '@/lib/utils'
import { Users, Swords, Heart, Star, Shield, Crown, Flag, Skull, HelpCircle } from 'lucide-react'

interface ReadOnlyCanvasProps {
  characters: any[]
  characterTags: Record<string, any[]>
  groups: any[]
}

// Match the real canvas card dimensions
const DEFAULT_CARD_WIDTH = 320
const DEFAULT_CARD_HEIGHT = 280

// Tag badge component for the canvas - matches real canvas styling
function TagBadge({ tag }: { tag: any }) {
  if (!tag?.tag) return null

  const { name, color, category } = tag.tag
  const relatedCharacter = tag.related_character?.name

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded uppercase tracking-wider",
        category === 'faction' && "border"
      )}
      style={{
        backgroundColor: `${color}20`,
        color: color,
        borderColor: category === 'faction' ? `${color}40` : undefined,
      }}
    >
      {name}
      {relatedCharacter && (
        <span className="opacity-70">→ {relatedCharacter}</span>
      )}
    </span>
  )
}

// Read-only character node component - matches the real canvas style
function ReadOnlyCharacterNode({ data }: { data: any }) {
  const character = data.character
  const tags = data.tags || []
  const [isHovered, setIsHovered] = useState(false)

  const isPC = character.is_pc || character.type === 'pc'

  // Get DiceBear fallback image - same as real canvas
  const imageUrl = character.image_url ||
    `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(character.name)}&backgroundColor=1a1a24`

  // Split tags by category - same logic as real canvas
  const factionTags = tags.filter((t: any) => t.tag?.category === 'faction')
  const statusTag = tags.find((t: any) => t.tag?.category === 'status')
  const relationshipTags = tags.filter((t: any) => t.tag?.category !== 'faction' && t.tag?.category !== 'status')

  return (
    <div
      className={cn(
        "h-full rounded-xl overflow-hidden border-2 transition-all duration-200",
        "bg-[#1a1a24]",
        isPC
          ? "border-purple-500/50 shadow-lg shadow-purple-500/10"
          : "border-gray-500/30 shadow-lg shadow-black/20",
        isHovered && "border-purple-500 shadow-purple-500/20"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main content area - horizontal layout matching real canvas */}
      <div className="flex p-3 gap-3 h-[calc(100%-60px)]">
        {/* LEFT COLUMN: Image + Badge */}
        <div className="flex flex-col items-center gap-2 flex-shrink-0">
          {/* Portrait */}
          <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-white/10">
            <Image
              src={imageUrl}
              alt={character.name}
              fill
              className="object-cover"
              sizes="80px"
            />
            {/* Status badge on image */}
            {statusTag && (
              <div
                className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                style={{
                  backgroundColor: `${statusTag.tag.color}90`,
                  color: '#fff',
                }}
              >
                {statusTag.tag.name}
              </div>
            )}
          </div>

          {/* Type badge below image */}
          <span className={cn(
            "px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded",
            isPC
              ? "bg-purple-500/20 text-purple-400"
              : "bg-gray-500/20 text-gray-400"
          )}>
            {isPC ? 'PC' : 'NPC'}
          </span>
        </div>

        {/* RIGHT COLUMN: Name + Description */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Name */}
          <h3 className="text-sm font-semibold text-white truncate mb-1">{character.name}</h3>

          {/* Role/Class */}
          {(character.role || character.class || character.race) && (
            <p className="text-[11px] text-gray-500 truncate mb-1">
              {character.role || `${character.race || ''} ${character.class || ''}`.trim()}
            </p>
          )}

          {/* Description - fills remaining space */}
          {character.summary && (
            <div className="flex-1 overflow-hidden relative">
              <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-4">
                {character.summary}
              </p>
              <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-[#1a1a24] to-transparent" />
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM: Tags spanning full width - matches real canvas */}
      {tags.length > 0 && (
        <div className="px-3 pb-3 space-y-1.5 max-h-[60px] overflow-hidden">
          {/* Factions Section */}
          {factionTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {factionTags.map((ct: any) => (
                <TagBadge key={ct.id} tag={ct} />
              ))}
            </div>
          )}

          {/* Relationship Tags Section */}
          {relationshipTags.length > 0 && (
            <div className={cn(
              "flex flex-wrap gap-1",
              factionTags.length > 0 && "pt-1 border-t border-white/10"
            )}>
              {relationshipTags.slice(0, 5).map((ct: any) => (
                <TagBadge key={ct.id} tag={ct} />
              ))}
              {relationshipTags.length > 5 && (
                <span className="text-[10px] text-gray-500">+{relationshipTags.length - 5}</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Read-only group node component - matches real canvas
function ReadOnlyGroupNode({ data }: { data: any }) {
  const group = data.group

  // Icon mapping - same as real canvas
  const iconMap: Record<string, any> = {
    users: Users,
    swords: Swords,
    heart: Heart,
    star: Star,
    shield: Shield,
    crown: Crown,
    flag: Flag,
    skull: Skull,
  }

  const IconComponent = iconMap[group.icon] || HelpCircle

  return (
    <div
      className="h-full rounded-xl border-2 border-dashed"
      style={{
        backgroundColor: `${group.color}08`,
        borderColor: `${group.color}40`,
      }}
    >
      <div className="px-3 py-2 flex items-center gap-2">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center"
          style={{ backgroundColor: `${group.color}20` }}
        >
          <IconComponent className="w-3.5 h-3.5" style={{ color: group.color }} />
        </div>
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

  return (
    <ReactFlow
      nodes={nodes}
      edges={[]}
      nodeTypes={nodeTypes}
      minZoom={0.1}
      maxZoom={2}
      fitView
      fitViewOptions={{ padding: 0.3 }}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      panOnScroll
      zoomOnScroll
      zoomOnPinch
      panOnDrag
      selectionOnDrag={false}
      proOptions={{ hideAttribution: true }}
    >
      <Background color="#333" gap={20} size={1} />
      <Controls
        showInteractive={false}
        position="bottom-left"
      />
      <MiniMap
        nodeColor={(node) => {
          if (node.type === 'group') return (node.data as any).group?.color || '#444'
          const char = (node.data as any).character
          return char?.is_pc || char?.type === 'pc' ? '#8b5cf6' : '#6b7280'
        }}
        maskColor="rgba(0, 0, 0, 0.8)"
        style={{ backgroundColor: '#1a1a24' }}
        position="bottom-right"
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

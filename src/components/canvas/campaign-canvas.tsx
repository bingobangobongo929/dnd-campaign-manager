'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  OnNodesChange,
  NodeChange,
  applyNodeChanges,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { CharacterNode, CharacterNodeData, DEFAULT_CARD_WIDTH, DEFAULT_CARD_HEIGHT } from './character-node'
import { GroupNode, GroupNodeData } from './group-node'
import { useAppStore } from '@/store'
import { useSupabase } from '@/hooks'
import { useDebouncedCallback } from 'use-debounce'
import type { Character, Tag, CharacterTag, CanvasGroup } from '@/types/database'

const SNAP_THRESHOLD = 10 // pixels
const SNAP_GRID = 20

interface CampaignCanvasProps {
  campaignId: string
  characters: Character[]
  characterTags: Map<string, (CharacterTag & { tag: Tag; related_character?: Character | null })[]>
  groups: CanvasGroup[]
  initialCharacterSizes?: Record<string, { width?: number; height?: number }>
  // External size overrides from resize toolbar - highest priority
  characterSizeOverrides?: Map<string, { width: number; height: number }>
  onCharacterPreview: (id: string) => void
  onCharacterEdit: (id: string) => void
  onCharacterPositionChange: (id: string, x: number, y: number) => void
  onCharacterSizeChange?: (id: string, width: number, height: number) => void
  onGroupUpdate: (id: string, updates: Partial<CanvasGroup>) => void
  onGroupDelete: (id: string) => void
  onGroupPositionChange: (id: string, x: number, y: number) => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes: any = {
  character: CharacterNode,
  group: GroupNode,
}

function CampaignCanvasInner({
  campaignId,
  characters,
  characterTags,
  groups,
  initialCharacterSizes,
  characterSizeOverrides,
  onCharacterPreview,
  onCharacterEdit,
  onCharacterPositionChange,
  onCharacterSizeChange,
  onGroupUpdate,
  onGroupDelete,
  onGroupPositionChange,
}: CampaignCanvasProps) {
  const { selectedCharacterId, setCanvasViewport } = useAppStore()
  const { getViewport } = useReactFlow()
  const [snapLines, setSnapLines] = useState<{ x?: number; y?: number }>({})

  // Track if this is the first mount
  const isFirstMount = useRef(true)
  const initialSizesApplied = useRef(false)

  // Store node sizes separately to preserve them across data updates
  const nodeSizesRef = useRef<Map<string, { width: number; height: number }>>(new Map())

  // Apply initial sizes from props (from localStorage) on first render
  if (!initialSizesApplied.current && initialCharacterSizes) {
    Object.entries(initialCharacterSizes).forEach(([id, size]) => {
      if (size.width && size.height) {
        nodeSizesRef.current.set(id, { width: size.width, height: size.height })
      }
    })
    initialSizesApplied.current = true
  }

  // Create nodes from data
  const createNodes = useCallback(() => {
    const characterNodes = characters.map((char) => {
      // Priority: toolbar override > ref cache > database value > default
      const overrideSize = characterSizeOverrides?.get(char.id)
      const savedSize = nodeSizesRef.current.get(char.id)
      const width = overrideSize?.width || savedSize?.width || char.canvas_width || DEFAULT_CARD_WIDTH
      const height = overrideSize?.height || savedSize?.height || char.canvas_height || DEFAULT_CARD_HEIGHT

      return {
        id: char.id,
        type: 'character' as const,
        position: { x: char.position_x, y: char.position_y },
        style: { width, height },
        data: {
          character: char,
          tags: characterTags.get(char.id) || [],
          isSelected: char.id === selectedCharacterId,
          onPreview: onCharacterPreview,
          onEdit: onCharacterEdit,
          onResize: onCharacterSizeChange,
        } as CharacterNodeData,
      }
    })

    const groupNodes = groups.map((group) => ({
      id: `group-${group.id}`,
      type: 'group' as const,
      position: { x: group.position_x, y: group.position_y },
      style: { width: group.width, height: group.height },
      zIndex: -1,
      data: {
        group,
        onUpdate: onGroupUpdate,
        onDelete: onGroupDelete,
      } as GroupNodeData,
    }))

    // Groups should render behind characters
    return [...groupNodes, ...characterNodes] as unknown as Node[]
  }, [characters, characterTags, groups, selectedCharacterId, characterSizeOverrides, onCharacterPreview, onCharacterEdit, onCharacterSizeChange, onGroupUpdate, onGroupDelete])

  // Initialize nodes
  const [nodes, setNodes] = useNodesState(createNodes())
  const [edges, setEdges] = useEdgesState([])

  // Update nodes when data changes
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false
      return
    }

    // Simply recreate nodes from data - createNodes() handles all priority logic
    // The key is that createNodes uses: overrideSize > savedSize > char.canvas_width > default
    // When size is saved to DB and state updates, char.canvas_width will have the new value
    // We need to update nodeSizesRef to match the data so it stays in sync
    characters.forEach((char) => {
      if (char.canvas_width && char.canvas_height) {
        nodeSizesRef.current.set(char.id, {
          width: char.canvas_width,
          height: char.canvas_height,
        })
      }
    })

    setNodes(createNodes())
  }, [characters, characterTags, groups, selectedCharacterId, characterSizeOverrides, createNodes, setNodes])

  // Smart snap - find alignment guides
  const findSnapPositions = useCallback((movingNodeId: string, position: { x: number; y: number }, width: number, height: number) => {
    const otherNodes = nodes.filter((n) => n.id !== movingNodeId && n.type === 'character')
    let snapX: number | undefined
    let snapY: number | undefined
    let newX = position.x
    let newY = position.y

    const movingLeft = position.x
    const movingRight = position.x + width
    const movingTop = position.y
    const movingBottom = position.y + height
    const movingCenterX = position.x + width / 2
    const movingCenterY = position.y + height / 2

    for (const node of otherNodes) {
      const nodeWidth = (node.style?.width as number) || DEFAULT_CARD_WIDTH
      const nodeHeight = (node.style?.height as number) || DEFAULT_CARD_HEIGHT
      const nodeLeft = node.position.x
      const nodeRight = node.position.x + nodeWidth
      const nodeTop = node.position.y
      const nodeBottom = node.position.y + nodeHeight
      const nodeCenterX = node.position.x + nodeWidth / 2
      const nodeCenterY = node.position.y + nodeHeight / 2

      // Horizontal alignment (X snapping)
      if (Math.abs(movingLeft - nodeLeft) < SNAP_THRESHOLD) {
        newX = nodeLeft
        snapX = nodeLeft
      } else if (Math.abs(movingRight - nodeRight) < SNAP_THRESHOLD) {
        newX = nodeRight - width
        snapX = nodeRight
      } else if (Math.abs(movingCenterX - nodeCenterX) < SNAP_THRESHOLD) {
        newX = nodeCenterX - width / 2
        snapX = nodeCenterX
      } else if (Math.abs(movingLeft - nodeRight) < SNAP_THRESHOLD) {
        newX = nodeRight
        snapX = nodeRight
      } else if (Math.abs(movingRight - nodeLeft) < SNAP_THRESHOLD) {
        newX = nodeLeft - width
        snapX = nodeLeft
      }

      // Vertical alignment (Y snapping)
      if (Math.abs(movingTop - nodeTop) < SNAP_THRESHOLD) {
        newY = nodeTop
        snapY = nodeTop
      } else if (Math.abs(movingBottom - nodeBottom) < SNAP_THRESHOLD) {
        newY = nodeBottom - height
        snapY = nodeBottom
      } else if (Math.abs(movingCenterY - nodeCenterY) < SNAP_THRESHOLD) {
        newY = nodeCenterY - height / 2
        snapY = nodeCenterY
      } else if (Math.abs(movingTop - nodeBottom) < SNAP_THRESHOLD) {
        newY = nodeBottom
        snapY = nodeBottom
      } else if (Math.abs(movingBottom - nodeTop) < SNAP_THRESHOLD) {
        newY = nodeTop - height
        snapY = nodeTop
      }
    }

    return { newX, newY, snapX, snapY }
  }, [nodes])

  // Debounced position save
  const debouncedSavePosition = useDebouncedCallback(
    (id: string, x: number, y: number, isGroup: boolean) => {
      console.log(`Saving position for ${id}: ${x}, ${y}`)
      if (isGroup) {
        onGroupPositionChange(id.replace('group-', ''), x, y)
      } else {
        onCharacterPositionChange(id, x, y)
      }
    },
    500 // 500ms debounce
  )

  const onNodesChange: OnNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Handle position changes with smart snap
      const processedChanges = changes.map((change) => {
        if (change.type === 'position' && change.position && change.dragging) {
          const node = nodes.find((n) => n.id === change.id)
          if (node && node.type === 'character') {
            const nodeWidth = (node.style?.width as number) || DEFAULT_CARD_WIDTH
            const nodeHeight = (node.style?.height as number) || DEFAULT_CARD_HEIGHT
            const { newX, newY, snapX, snapY } = findSnapPositions(
              change.id,
              change.position,
              nodeWidth,
              nodeHeight
            )
            setSnapLines({ x: snapX, y: snapY })
            return {
              ...change,
              position: { x: newX, y: newY },
            }
          }
        }
        return change
      })

      setNodes((nds) => applyNodeChanges(processedChanges, nds))

      // Save position changes when drag ends
      for (const change of changes) {
        if (change.type === 'position' && !change.dragging && change.position) {
          const isGroup = change.id.startsWith('group-')
          debouncedSavePosition(change.id, change.position.x, change.position.y, isGroup)
        }
      }

      // Clear snap lines when not dragging
      const isDragging = changes.some((c) => c.type === 'position' && c.dragging)
      if (!isDragging) {
        setSnapLines({})
      }
    },
    [nodes, findSnapPositions, setNodes, debouncedSavePosition]
  )

  const onMoveEnd = useCallback(() => {
    const viewport = getViewport()
    setCanvasViewport(viewport)
  }, [getViewport, setCanvasViewport])

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        nodeTypes={nodeTypes}
        onMoveEnd={onMoveEnd}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        snapToGrid
        snapGrid={[SNAP_GRID, SNAP_GRID]}
        zoomOnScroll
        zoomOnPinch
        panOnDrag={[0, 1, 2]} // Left, middle, or right mouse to pan
        selectionOnDrag={false}
        selectNodesOnDrag={false}
        className="bg-[--bg-base]"
      >
        <Background gap={SNAP_GRID} size={1} color="var(--border)" />
        <Controls className="!bg-[--bg-surface] !border-[--border] !rounded-lg !shadow-lg" />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === 'group') return 'var(--border)'
            return 'var(--accent-primary)'
          }}
          maskColor="rgba(0, 0, 0, 0.8)"
          className="!bg-[--bg-surface] !border-[--border]"
        />
      </ReactFlow>

      {/* Smart snap lines */}
      {snapLines.x !== undefined && (
        <div
          className="snap-line snap-line-vertical"
          style={{ left: snapLines.x, top: 0, height: '100%' }}
        />
      )}
      {snapLines.y !== undefined && (
        <div
          className="snap-line snap-line-horizontal"
          style={{ top: snapLines.y, left: 0, width: '100%' }}
        />
      )}
    </div>
  )
}

export function CampaignCanvas(props: CampaignCanvasProps) {
  return (
    <ReactFlowProvider>
      <CampaignCanvasInner {...props} />
    </ReactFlowProvider>
  )
}

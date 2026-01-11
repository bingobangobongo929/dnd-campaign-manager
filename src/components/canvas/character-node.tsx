'use client'

import { memo, useState, useCallback, useEffect } from 'react'
import { Handle, Position, NodeResizer, useReactFlow } from '@xyflow/react'
import { cn, getInitials } from '@/lib/utils'
import { TagBadge } from '@/components/ui'
import { Maximize2, RotateCcw, X, Check } from 'lucide-react'
import Image from 'next/image'
import type { Character, Tag, CharacterTag } from '@/types/database'

// Default card dimensions
export const DEFAULT_CARD_WIDTH = 320
export const DEFAULT_CARD_HEIGHT = 280
export const MIN_CARD_WIDTH = 280
export const MIN_CARD_HEIGHT = 200
export const MAX_CARD_WIDTH = 600
export const MAX_CARD_HEIGHT = 800

export interface CharacterNodeData extends Record<string, unknown> {
  character: Character
  tags: (CharacterTag & { tag: Tag; related_character?: Character | null })[]
  isSelected: boolean
  onSelect: (id: string) => void
  onDoubleClick: (id: string) => void
  onResize?: (id: string, width: number, height: number) => void
}

function CharacterNodeComponent({
  id,
  data,
  selected
}: {
  id: string
  data: CharacterNodeData
  selected?: boolean
}) {
  const { character, tags, onSelect, onDoubleClick, onResize } = data
  const isPC = character.type === 'pc'
  const isActive = selected || data.isSelected
  const { setNodes } = useReactFlow()

  // Resize mode state
  const [isResizeMode, setIsResizeMode] = useState(false)
  const [originalSize, setOriginalSize] = useState<{ width: number; height: number } | null>(null)

  // Get DiceBear fallback image
  const imageUrl = character.image_url ||
    `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(character.name)}&backgroundColor=1a1a24`

  // Enter resize mode - store current size
  const handleEnterResizeMode = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    // Get current node size from React Flow
    setNodes((nodes) => {
      const node = nodes.find(n => n.id === id)
      if (node) {
        const width = (node.style?.width as number) || DEFAULT_CARD_WIDTH
        const height = (node.style?.height as number) || DEFAULT_CARD_HEIGHT
        setOriginalSize({ width, height })
      }
      return nodes
    })
    setIsResizeMode(true)
  }, [id, setNodes])

  // Exit resize mode - save new size
  const handleConfirmResize = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    // Get current size from the node and save it
    setNodes((nodes) => {
      const node = nodes.find(n => n.id === id)
      if (node && onResize) {
        const width = (node.style?.width as number) || DEFAULT_CARD_WIDTH
        const height = (node.style?.height as number) || DEFAULT_CARD_HEIGHT
        // Call the save function
        onResize(character.id, Math.round(width), Math.round(height))
      }
      return nodes
    })
    setIsResizeMode(false)
    setOriginalSize(null)
  }, [id, character.id, onResize, setNodes])

  // Exit resize mode - revert to original size
  const handleCancelResize = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (originalSize) {
      // Revert to original size
      setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id === id) {
            return {
              ...node,
              style: {
                ...node.style,
                width: originalSize.width,
                height: originalSize.height,
              },
            }
          }
          return node
        })
      )
    }
    setIsResizeMode(false)
    setOriginalSize(null)
  }, [id, originalSize, setNodes])

  // Reset to default size
  const handleResetSize = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            style: {
              ...node.style,
              width: DEFAULT_CARD_WIDTH,
              height: DEFAULT_CARD_HEIGHT,
            },
          }
        }
        return node
      })
    )
  }, [id, setNodes])

  return (
    <>
      {/* Resize handles - only visible in resize mode */}
      <NodeResizer
        minWidth={MIN_CARD_WIDTH}
        minHeight={MIN_CARD_HEIGHT}
        maxWidth={MAX_CARD_WIDTH}
        maxHeight={MAX_CARD_HEIGHT}
        isVisible={isResizeMode}
        lineClassName="!border-[--arcane-purple] !border-2"
        handleClassName="!w-3 !h-3 !bg-[--arcane-purple] !border-2 !border-white !rounded-sm"
      />

      {/* Resize mode toolbar */}
      {isResizeMode && (
        <div className="absolute -top-10 left-0 right-0 flex items-center justify-center gap-2 z-10">
          <button
            onClick={handleResetSize}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-[--bg-elevated] border border-[--border] rounded-md hover:bg-[--bg-hover] transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
          <button
            onClick={handleCancelResize}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-[--bg-elevated] border border-[--border] rounded-md hover:bg-[--bg-hover] transition-colors"
          >
            <X className="w-3 h-3" />
            Cancel
          </button>
          <button
            onClick={handleConfirmResize}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-[--arcane-purple] text-white rounded-md hover:bg-[--arcane-purple-dim] transition-colors"
          >
            <Check className="w-3 h-3" />
            Done
          </button>
        </div>
      )}

      <div
        className={cn(
          'character-card',
          isPC ? 'character-card-pc' : 'character-card-npc',
          isActive && 'character-card-selected',
          isResizeMode && 'character-card-resize-mode'
        )}
        onClick={() => !isResizeMode && onSelect(character.id)}
        onDoubleClick={() => !isResizeMode && onDoubleClick(character.id)}
      >
        {/* Main content area */}
        <div className="character-card-main">
          {/* LEFT COLUMN: Image + Badge */}
          <div className="character-card-left">
            {/* Portrait */}
            <div className="character-card-portrait">
              <Image
                src={imageUrl}
                alt={character.name}
                fill
                className="object-cover"
                sizes="96px"
              />
            </div>

            {/* Type badge below image */}
            <span className={cn(
              'character-card-type',
              isPC ? 'character-card-type-pc' : 'character-card-type-npc'
            )}>
              {character.type.toUpperCase()}
            </span>
          </div>

          {/* RIGHT COLUMN: Name + Description */}
          <div className="character-card-right">
            {/* Name */}
            <h3 className="character-card-name">{character.name}</h3>

            {/* Description - fills remaining space */}
            <div className="character-card-description">
              {character.summary && <p>{character.summary}</p>}
              <div className="character-card-description-fade" />
            </div>
          </div>
        </div>

        {/* BOTTOM: Tags spanning full width */}
        {tags.length > 0 && (
          <div className="character-card-tags-bottom">
            {tags.map((ct) => (
              <TagBadge
                key={ct.id}
                name={ct.tag.name}
                color={ct.tag.color}
                icon={ct.tag.icon || undefined}
                relatedCharacter={ct.related_character?.name}
                size="sm"
                uppercase
              />
            ))}
          </div>
        )}

        {/* Resize trigger icon (only when not in resize mode) */}
        {!isResizeMode && (
          <button
            onClick={handleEnterResizeMode}
            className="character-card-resize-trigger"
            title="Resize card"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Invisible handles for connections */}
        <Handle
          type="source"
          position={Position.Right}
          className="!opacity-0 !w-0 !h-0"
        />
        <Handle
          type="target"
          position={Position.Left}
          className="!opacity-0 !w-0 !h-0"
        />
      </div>
    </>
  )
}

export const CharacterNode = memo(CharacterNodeComponent)

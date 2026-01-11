'use client'

import { memo, useState, useCallback } from 'react'
import { Handle, Position, NodeResizer } from '@xyflow/react'
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

function CharacterNodeComponent({ data, selected }: { data: CharacterNodeData; selected?: boolean }) {
  const { character, tags, onSelect, onDoubleClick, onResize } = data
  const isPC = character.type === 'pc'
  const isActive = selected || data.isSelected

  // Resize mode state
  const [isResizeMode, setIsResizeMode] = useState(false)
  const [tempSize, setTempSize] = useState<{ width: number; height: number } | null>(null)
  const [originalSize, setOriginalSize] = useState<{ width: number; height: number } | null>(null)

  // Get DiceBear fallback image
  const imageUrl = character.image_url ||
    `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(character.name)}&backgroundColor=1a1a24`

  // Enter resize mode
  const handleEnterResizeMode = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsResizeMode(true)
    setOriginalSize({ width: DEFAULT_CARD_WIDTH, height: DEFAULT_CARD_HEIGHT })
    setTempSize(null)
  }, [])

  // Exit resize mode - save
  const handleConfirmResize = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (tempSize && onResize) {
      onResize(character.id, tempSize.width, tempSize.height)
    }
    setIsResizeMode(false)
    setTempSize(null)
    setOriginalSize(null)
  }, [character.id, tempSize, onResize])

  // Exit resize mode - cancel
  const handleCancelResize = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsResizeMode(false)
    setTempSize(null)
    setOriginalSize(null)
  }, [])

  // Reset to default size
  const handleResetSize = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setTempSize({ width: DEFAULT_CARD_WIDTH, height: DEFAULT_CARD_HEIGHT })
    if (onResize) {
      onResize(character.id, DEFAULT_CARD_WIDTH, DEFAULT_CARD_HEIGHT)
    }
  }, [character.id, onResize])

  // Handle resize during drag
  const handleResize = useCallback((_: unknown, params: { width: number; height: number }) => {
    setTempSize({ width: params.width, height: params.height })
  }, [])

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
        onResize={handleResize}
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
        {/* Two-column layout */}
        <div className="character-card-layout">
          {/* LEFT COLUMN: Image + Tags */}
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

            {/* Tags stacked vertically */}
            {tags.length > 0 && (
              <div className="character-card-tags-vertical">
                {tags.map((ct) => (
                  <TagBadge
                    key={ct.id}
                    name={ct.tag.name}
                    color={ct.tag.color}
                    icon={ct.tag.icon || undefined}
                    relatedCharacter={ct.related_character?.name}
                    size="sm"
                  />
                ))}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Name + Badge + Description */}
          <div className="character-card-right">
            {/* Name */}
            <h3 className="character-card-name">{character.name}</h3>

            {/* Type badge */}
            <span className={cn(
              'character-card-type',
              isPC ? 'character-card-type-pc' : 'character-card-type-npc'
            )}>
              {character.type.toUpperCase()}
            </span>

            {/* Description - fills remaining space */}
            <div className="character-card-description">
              {character.summary && <p>{character.summary}</p>}
              <div className="character-card-description-fade" />
            </div>
          </div>
        </div>

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

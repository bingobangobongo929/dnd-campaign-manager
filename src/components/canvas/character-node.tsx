'use client'

import { memo, useState, useCallback } from 'react'
import { Handle, Position, NodeResizer } from '@xyflow/react'
import { cn } from '@/lib/utils'
import { TagBadge } from '@/components/ui'
import { Eye, Pencil, Move, Check, X, RotateCcw } from 'lucide-react'
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
  onPreview: (id: string) => void
  onEdit: (id: string) => void
  onResize?: (id: string, width: number, height: number) => void
}

function CharacterNodeComponent({
  data,
  selected
}: {
  id: string
  data: CharacterNodeData
  selected?: boolean
}) {
  const { character, tags, onPreview, onEdit, onResize } = data
  const isPC = character.type === 'pc'
  const isActive = selected || data.isSelected

  // Hover and resize states
  const [isHovered, setIsHovered] = useState(false)
  const [isResizeMode, setIsResizeMode] = useState(false)

  // Get DiceBear fallback image
  const imageUrl = character.image_url ||
    `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(character.name)}&backgroundColor=1a1a24`

  const handlePreview = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onPreview(character.id)
  }, [character.id, onPreview])

  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit(character.id)
  }, [character.id, onEdit])

  const handleEnterResize = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsResizeMode(true)
  }, [])

  const handleConfirmResize = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsResizeMode(false)
    // Size is saved via onResizeEnd in NodeResizer
  }, [])

  const handleCancelResize = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsResizeMode(false)
    // Reset to original - handled by parent via the resize callback
    if (onResize) {
      onResize(character.id, character.canvas_width || DEFAULT_CARD_WIDTH, character.canvas_height || DEFAULT_CARD_HEIGHT)
    }
  }, [character.id, character.canvas_width, character.canvas_height, onResize])

  const handleResetSize = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (onResize) {
      onResize(character.id, DEFAULT_CARD_WIDTH, DEFAULT_CARD_HEIGHT)
    }
  }, [character.id, onResize])

  return (
    <>
      {/* Resize handles - visible in resize mode */}
      <NodeResizer
        minWidth={MIN_CARD_WIDTH}
        minHeight={MIN_CARD_HEIGHT}
        maxWidth={MAX_CARD_WIDTH}
        maxHeight={MAX_CARD_HEIGHT}
        isVisible={isResizeMode}
        lineClassName="!border-[--arcane-purple] !border-2"
        handleClassName="!w-3 !h-3 !bg-[--arcane-purple] !border-2 !border-white !rounded-sm"
        onResizeEnd={(_, params) => {
          if (onResize) {
            onResize(character.id, Math.round(params.width), Math.round(params.height))
          }
        }}
      />

      {/* Resize mode toolbar */}
      {isResizeMode && (
        <div className="absolute -top-10 left-0 right-0 flex items-center justify-center gap-2 z-10">
          <button
            onClick={handleResetSize}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-[--bg-elevated] border border-[--border] rounded-md hover:bg-[--bg-hover] transition-colors"
            title="Reset to default size"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
          <button
            onClick={handleCancelResize}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-[--bg-elevated] border border-[--border] rounded-md hover:bg-[--bg-hover] transition-colors"
            title="Cancel"
          >
            <X className="w-3 h-3" />
          </button>
          <button
            onClick={handleConfirmResize}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-[--arcane-purple] text-white rounded-md hover:bg-[--arcane-purple-dim] transition-colors"
            title="Done"
          >
            <Check className="w-3 h-3" />
          </button>
        </div>
      )}

      <div
        className={cn(
          'character-card',
          isPC ? 'character-card-pc' : 'character-card-npc',
          isActive && 'character-card-selected',
          isResizeMode && 'ring-2 ring-[--arcane-purple]'
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Hover action icons */}
        {isHovered && !isResizeMode && (
          <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
            <button
              onClick={handlePreview}
              className="w-7 h-7 flex items-center justify-center rounded-md bg-[--bg-elevated]/90 border border-[--border] hover:bg-[--bg-hover] hover:border-[--arcane-purple] transition-all shadow-sm"
              title="Preview"
            >
              <Eye className="w-3.5 h-3.5 text-[--text-secondary]" />
            </button>
            <button
              onClick={handleEdit}
              className="w-7 h-7 flex items-center justify-center rounded-md bg-[--bg-elevated]/90 border border-[--border] hover:bg-[--bg-hover] hover:border-[--arcane-purple] transition-all shadow-sm"
              title="Edit"
            >
              <Pencil className="w-3.5 h-3.5 text-[--text-secondary]" />
            </button>
            <button
              onClick={handleEnterResize}
              className="w-7 h-7 flex items-center justify-center rounded-md bg-[--bg-elevated]/90 border border-[--border] hover:bg-[--bg-hover] hover:border-[--arcane-purple] transition-all shadow-sm"
              title="Resize"
            >
              <Move className="w-3.5 h-3.5 text-[--text-secondary]" />
            </button>
          </div>
        )}

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

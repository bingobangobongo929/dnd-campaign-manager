'use client'

import { memo } from 'react'
import { Handle, Position, NodeResizer } from '@xyflow/react'
import { cn } from '@/lib/utils'
import { TagBadge } from '@/components/ui'
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

  // Get DiceBear fallback image
  const imageUrl = character.image_url ||
    `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(character.name)}&backgroundColor=1a1a24`

  return (
    <>
      {/* Resize handles - visible when selected (like groups) */}
      <NodeResizer
        minWidth={MIN_CARD_WIDTH}
        minHeight={MIN_CARD_HEIGHT}
        maxWidth={MAX_CARD_WIDTH}
        maxHeight={MAX_CARD_HEIGHT}
        isVisible={selected}
        lineClassName="!border-[--arcane-purple] !border-2"
        handleClassName="!w-3 !h-3 !bg-[--arcane-purple] !border-2 !border-white !rounded-sm"
        onResizeEnd={(_, params) => {
          // Save size when resize ends (like groups do)
          if (onResize) {
            onResize(character.id, Math.round(params.width), Math.round(params.height))
          }
        }}
      />

      <div
        className={cn(
          'character-card',
          isPC ? 'character-card-pc' : 'character-card-npc',
          isActive && 'character-card-selected'
        )}
        onClick={() => onSelect(character.id)}
        onDoubleClick={() => onDoubleClick(character.id)}
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

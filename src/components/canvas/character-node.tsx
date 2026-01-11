'use client'

import { memo, useState } from 'react'
import { Handle, Position, NodeResizer } from '@xyflow/react'
import { cn, getInitials } from '@/lib/utils'
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

function CharacterNodeComponent({ data, selected }: { data: CharacterNodeData; selected?: boolean }) {
  const { character, tags, onSelect, onDoubleClick, onResize } = data
  const isPC = character.type === 'pc'
  const isActive = selected || data.isSelected
  const [isHovered, setIsHovered] = useState(false)

  // Get DiceBear fallback image
  const imageUrl = character.image_url ||
    `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(character.name)}&backgroundColor=1a1a24`

  return (
    <>
      {/* Resize handles - visible when selected or hovered */}
      <NodeResizer
        minWidth={MIN_CARD_WIDTH}
        minHeight={MIN_CARD_HEIGHT}
        maxWidth={MAX_CARD_WIDTH}
        maxHeight={MAX_CARD_HEIGHT}
        isVisible={isActive || isHovered}
        lineClassName="!border-[--arcane-purple] !border-opacity-50"
        handleClassName="!w-2 !h-2 !bg-[--arcane-purple] !border-none !rounded-sm"
        onResize={(_, params) => {
          if (onResize) {
            onResize(character.id, params.width, params.height)
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
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Top Section: Image + Content */}
        <div className="character-card-top">
          {/* Portrait */}
          <div className="character-card-portrait">
            <Image
              src={imageUrl}
              alt={character.name}
              fill
              className="object-cover"
              sizes="96px"
              onError={(e) => {
                // Fallback to initials if image fails
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
              }}
            />
            {!character.image_url && (
              <div className="character-card-portrait-placeholder">
                {getInitials(character.name)}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="character-card-content">
            <h3 className="character-card-name">{character.name}</h3>
            <span className={cn(
              'character-card-type',
              isPC ? 'character-card-type-pc' : 'character-card-type-npc'
            )}>
              {character.type.toUpperCase()}
            </span>
            {character.summary && (
              <div className="character-card-description">
                <p>{character.summary}</p>
                <div className="character-card-description-fade" />
              </div>
            )}
          </div>
        </div>

        {/* Tags Section */}
        {tags.length > 0 && (
          <div className="character-card-tags">
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

        {/* Invisible handles for potential future connections */}
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

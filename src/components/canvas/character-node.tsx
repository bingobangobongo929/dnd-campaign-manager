'use client'

import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
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
}

function CharacterNodeComponent({
  data,
  selected
}: {
  id: string
  data: CharacterNodeData
  selected?: boolean
}) {
  const { character, tags, onSelect, onDoubleClick } = data
  const isPC = character.type === 'pc'
  const isActive = selected || data.isSelected

  // Get DiceBear fallback image
  const imageUrl = character.image_url ||
    `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(character.name)}&backgroundColor=1a1a24`

  return (
    <>
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

'use client'

import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { cn, getInitials } from '@/lib/utils'
import { TagBadge } from '@/components/ui'
import Image from 'next/image'
import type { Character, Tag, CharacterTag } from '@/types/database'

export interface CharacterNodeData extends Record<string, unknown> {
  character: Character
  tags: (CharacterTag & { tag: Tag; related_character?: Character | null })[]
  isSelected: boolean
  onSelect: (id: string) => void
  onDoubleClick: (id: string) => void
}

function CharacterNodeComponent({ data, selected }: { data: CharacterNodeData; selected?: boolean }) {
  const { character, tags, onSelect, onDoubleClick } = data
  const isPC = character.type === 'pc'
  const isActive = selected || data.isSelected

  return (
    <div
      className={cn(
        'character-card',
        isPC ? 'character-card-pc' : 'character-card-npc',
        isActive && 'character-card-selected'
      )}
      onClick={() => onSelect(character.id)}
      onDoubleClick={() => onDoubleClick(character.id)}
    >
      {/* Top Section: Image + Content */}
      <div className="character-card-top">
        {/* Portrait */}
        <div className="character-card-portrait">
          {character.image_url ? (
            <Image
              src={character.image_url}
              alt={character.name}
              fill
              className="object-cover"
              sizes="96px"
            />
          ) : (
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
  )
}

export const CharacterNode = memo(CharacterNodeComponent)

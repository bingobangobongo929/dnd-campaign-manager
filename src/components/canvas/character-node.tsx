'use client'

import { memo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { cn } from '@/lib/utils'
import { Avatar, TagBadge } from '@/components/ui'
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

  return (
    <div
      className={cn(
        'bg-[--bg-surface] rounded-xl border-2 shadow-lg transition-all duration-150 cursor-grab active:cursor-grabbing',
        'hover:shadow-xl hover:border-[--accent-primary]/30',
        selected || data.isSelected
          ? 'border-[--accent-primary] shadow-glow'
          : 'border-[--border]'
      )}
      style={{ width: 200 }}
      onClick={() => onSelect(character.id)}
      onDoubleClick={() => onDoubleClick(character.id)}
    >
      {/* Character portrait and name */}
      <div className="p-3">
        <div className="flex items-center gap-3">
          <Avatar
            src={character.image_url}
            name={character.name}
            size="lg"
            className="flex-shrink-0"
          />
          <div className="min-w-0">
            <h3 className="font-semibold text-[--text-primary] truncate">
              {character.name}
            </h3>
            <span className={cn(
              'text-xs font-medium px-1.5 py-0.5 rounded',
              character.type === 'pc'
                ? 'bg-[--accent-primary]/10 text-[--accent-primary]'
                : 'bg-[--text-tertiary]/20 text-[--text-secondary]'
            )}>
              {character.type.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Summary */}
        {character.summary && (
          <p className="mt-2 text-xs text-[--text-secondary] line-clamp-2">
            {character.summary}
          </p>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {tags.slice(0, 3).map((ct) => (
              <TagBadge
                key={ct.id}
                name={ct.tag.name}
                color={ct.tag.color}
                relatedCharacter={ct.related_character?.name}
              />
            ))}
            {tags.length > 3 && (
              <span className="text-xs text-[--text-tertiary] px-1">
                +{tags.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>

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

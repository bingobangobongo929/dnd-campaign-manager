'use client'

import { X, Pencil } from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { TagBadge } from '@/components/ui'
import Image from 'next/image'
import type { Character, Tag, CharacterTag } from '@/types/database'

interface CharacterViewModalProps {
  character: Character
  tags: (CharacterTag & { tag: Tag; related_character?: Character | null })[]
  onEdit: () => void
  onClose: () => void
}

export function CharacterViewModal({
  character,
  tags,
  onEdit,
  onClose,
}: CharacterViewModalProps) {
  const isPC = character.type === 'pc'

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="character-view-modal relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          className="character-view-close btn btn-ghost btn-icon"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header: Portrait + Basic Info */}
        <div className="character-view-header">
          {/* Portrait */}
          <div className="character-view-portrait">
            {character.image_url ? (
              <Image
                src={character.image_url}
                alt={character.name}
                fill
                className="object-cover"
                sizes="160px"
              />
            ) : (
              <div className="character-view-portrait-placeholder">
                {getInitials(character.name)}
              </div>
            )}
          </div>

          {/* Header Content */}
          <div className="character-view-header-content">
            <h2 className="character-view-name">{character.name}</h2>
            <span
              className={cn(
                'character-view-type',
                isPC ? 'character-view-type-pc' : 'character-view-type-npc'
              )}
            >
              {character.type === 'pc' ? 'Player Character' : 'Non-Player Character'}
            </span>
            {character.summary && (
              <p className="character-view-summary">{character.summary}</p>
            )}
          </div>
        </div>

        {/* Body: Tags + Notes */}
        <div className="character-view-body">
          {/* Tags */}
          {tags.length > 0 && (
            <div className="character-view-tags">
              {tags.map((ct) => (
                <TagBadge
                  key={ct.id}
                  name={ct.tag.name}
                  color={ct.tag.color}
                  relatedCharacter={ct.related_character?.name}
                />
              ))}
            </div>
          )}

          {/* Notes */}
          {character.notes && (
            <div className="character-view-section">
              <h3 className="character-view-section-title">Notes</h3>
              <div
                className="character-view-notes"
                dangerouslySetInnerHTML={{ __html: character.notes }}
              />
            </div>
          )}

          {/* Empty state if no notes */}
          {!character.notes && !tags.length && (
            <div className="text-center py-12">
              <p className="text-[--text-tertiary]">
                No additional information yet.
              </p>
              <button
                className="btn btn-secondary mt-4"
                onClick={onEdit}
              >
                <Pencil className="w-4 h-4" />
                Add Details
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="character-view-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-primary" onClick={onEdit}>
            <Pencil className="w-4 h-4" />
            Edit Character
          </button>
        </div>
      </div>
    </div>
  )
}

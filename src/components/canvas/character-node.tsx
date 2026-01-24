'use client'

import { memo, useState, useCallback } from 'react'
import { Handle, Position, NodeResizer } from '@xyflow/react'
import { cn } from '@/lib/utils'
import { TagBadge } from '@/components/ui'
import { Eye, Pencil, Move, Check, X, RotateCcw, Shield, Users } from 'lucide-react'
import Image from 'next/image'
import type { Character, Tag, CharacterTag, CanvasRelationship, RelationshipTemplate, FactionMembership, CampaignFaction } from '@/types/database'

// Type for relationship with details
type RelationshipWithDetails = CanvasRelationship & {
  template?: RelationshipTemplate | null
  to_character?: { id: string; name: string }
}

// Type for faction membership with details
type FactionMembershipWithFaction = FactionMembership & { faction: CampaignFaction }

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
  relationships: RelationshipWithDetails[]
  factionMemberships: FactionMembershipWithFaction[]
  isSelected: boolean
  canEdit?: boolean
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
  const { character, tags, relationships, factionMemberships, canEdit = true, onPreview, onEdit, onResize } = data
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
        lineClassName="!border-[--arcane-purple] !border-2 !opacity-100"
        handleClassName="!w-4 !h-4 !bg-white !border-2 !border-[--arcane-purple] !rounded !shadow-lg !opacity-100"
        handleStyle={{ boxShadow: '0 0 8px rgba(139, 92, 246, 0.5)' }}
        onResizeEnd={(_, params) => {
          if (onResize) {
            onResize(character.id, Math.round(params.width), Math.round(params.height))
          }
        }}
      />

      {/* Resize mode toolbar */}
      {isResizeMode && (
        <div className="absolute -top-14 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2.5 bg-[--bg-surface] border border-[--border] rounded-xl shadow-xl z-20">
          <button
            onClick={handleResetSize}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-[--text-secondary] bg-[--bg-elevated] border border-[--border] rounded-lg hover:bg-[--bg-hover] hover:text-[--text-primary] transition-colors"
            title="Reset to default size"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            onClick={handleCancelResize}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-[--text-secondary] bg-[--bg-elevated] border border-[--border] rounded-lg hover:bg-[--bg-hover] hover:text-[--text-primary] transition-colors"
            title="Cancel"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>
          <button
            onClick={handleConfirmResize}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[--arcane-purple] rounded-lg hover:bg-[--arcane-purple-dim] shadow-md shadow-[--arcane-purple]/30 transition-colors"
            title="Done"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Done</span>
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
        {/* Hover action icons - centered overlay */}
        {isHovered && !isResizeMode && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/40 backdrop-blur-[2px] transition-all">
            <div className="flex items-center gap-3">
              <button
                onClick={handlePreview}
                className="w-12 h-12 flex items-center justify-center rounded-xl bg-[--bg-surface] border border-[--border] hover:bg-[--arcane-purple] hover:border-[--arcane-purple] transition-all shadow-lg group/btn"
                title="Preview"
              >
                <Eye className="w-5 h-5 text-[--text-secondary] group-hover/btn:text-white transition-colors" />
              </button>
              {canEdit && (
                <>
                  <button
                    onClick={handleEdit}
                    className="w-12 h-12 flex items-center justify-center rounded-xl bg-[--bg-surface] border border-[--border] hover:bg-[--arcane-purple] hover:border-[--arcane-purple] transition-all shadow-lg group/btn"
                    title="Edit"
                  >
                    <Pencil className="w-5 h-5 text-[--text-secondary] group-hover/btn:text-white transition-colors" />
                  </button>
                  <button
                    onClick={handleEnterResize}
                    className="w-12 h-12 flex items-center justify-center rounded-xl bg-[--bg-surface] border border-[--border] hover:bg-[--arcane-purple] hover:border-[--arcane-purple] transition-all shadow-lg group/btn"
                    title="Resize"
                  >
                    <Move className="w-5 h-5 text-[--text-secondary] group-hover/btn:text-white transition-colors" />
                  </button>
                </>
              )}
            </div>
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

        {/* BOTTOM: Factions and Relationships */}
        {(factionMemberships.length > 0 || relationships.length > 0 || tags.length > 0) && (
          <div className="character-card-tags-bottom">
            {/* Factions Section (from new system) */}
            {factionMemberships.length > 0 && (
              <div className="flex flex-wrap gap-1.5 w-full">
                {factionMemberships.map((fm) => (
                  <div
                    key={fm.id}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
                    style={{
                      backgroundColor: `${fm.faction.color}20`,
                      color: fm.faction.color,
                      border: `1px solid ${fm.faction.color}40`,
                    }}
                  >
                    <Shield className="w-2.5 h-2.5" />
                    <span>{fm.faction.name}</span>
                    {fm.role && <span className="opacity-70">• {fm.role}</span>}
                  </div>
                ))}
              </div>
            )}

            {/* Relationships Section (from new system) */}
            {relationships.length > 0 && (
              <div className={cn(
                "flex flex-wrap gap-1.5 w-full",
                factionMemberships.length > 0 && "pt-1.5 mt-1.5 border-t border-white/10"
              )}>
                {relationships.slice(0, 4).map((rel) => (
                  <div
                    key={rel.id}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium"
                    style={{
                      backgroundColor: `${rel.template?.color || '#8B5CF6'}15`,
                      color: rel.template?.color || '#8B5CF6',
                      border: `1px solid ${rel.template?.color || '#8B5CF6'}30`,
                    }}
                  >
                    <span>{rel.custom_label || rel.template?.name || 'Related'}</span>
                    <span className="opacity-70">→</span>
                    <span className="text-white/80">{rel.to_character?.name || 'Unknown'}</span>
                  </div>
                ))}
                {relationships.length > 4 && (
                  <div className="px-2 py-0.5 rounded text-[10px] text-gray-400 bg-white/5">
                    +{relationships.length - 4} more
                  </div>
                )}
              </div>
            )}

            {/* General Tags (old system - still support them) */}
            {tags.filter(ct => ct.tag.category === 'general').length > 0 && (
              <div className={cn(
                "flex flex-wrap gap-1.5 w-full",
                (factionMemberships.length > 0 || relationships.length > 0) && "pt-1.5 mt-1.5 border-t border-white/10"
              )}>
                {tags.filter(ct => ct.tag.category === 'general').map((ct) => (
                  <TagBadge
                    key={ct.id}
                    name={ct.tag.name}
                    color={ct.tag.color}
                    icon={ct.tag.icon || undefined}
                    size="sm"
                    uppercase
                  />
                ))}
              </div>
            )}
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

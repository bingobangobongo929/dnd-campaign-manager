import type { Edge, MarkerType } from '@xyflow/react'
import type { CanvasRelationship, RelationshipTemplate, RelationshipCategory } from '@/types/database'

// Edge style configuration for different relationship categories
const CATEGORY_COLORS: Record<RelationshipCategory, string> = {
  family: '#3B82F6',      // Blue
  professional: '#10B981', // Green
  romantic: '#EC4899',     // Pink
  conflict: '#EF4444',     // Red
  social: '#8B5CF6',       // Purple
  other: '#6B7280',        // Gray
}

const RELATIONSHIP_MODE_STYLES: Record<string, { animated: boolean; markerEnd?: MarkerType }> = {
  symmetric: { animated: false },
  asymmetric: { animated: true, markerEnd: 'arrowclosed' as MarkerType },
  one_way: { animated: true, markerEnd: 'arrowclosed' as MarkerType },
}

export interface ConnectionLineData {
  relationships: (CanvasRelationship & { template?: RelationshipTemplate | null })[]
  filterCategory?: RelationshipCategory | null
  highlightCharacterId?: string | null
}

export function generateConnectionEdges(data: ConnectionLineData): Edge[] {
  const { relationships, filterCategory, highlightCharacterId } = data

  // Filter relationships
  let filteredRelationships = relationships

  // Filter by category if specified
  if (filterCategory) {
    filteredRelationships = filteredRelationships.filter(
      rel => rel.template?.category === filterCategory
    )
  }

  // Only show primary direction to avoid duplicate lines for bidirectional relationships
  filteredRelationships = filteredRelationships.filter(rel => rel.is_primary)

  // Generate edges
  return filteredRelationships.map((rel): Edge => {
    const category = rel.template?.category || 'other'
    const mode = rel.template?.relationship_mode || 'one_way'
    const modeStyle = RELATIONSHIP_MODE_STYLES[mode] || RELATIONSHIP_MODE_STYLES.one_way
    const color = rel.template?.color || CATEGORY_COLORS[category]

    // Highlight if character is selected
    const isHighlighted = highlightCharacterId && (
      rel.from_character_id === highlightCharacterId ||
      rel.to_character_id === highlightCharacterId
    )

    // Dimmed if another character is highlighted
    const isDimmed = highlightCharacterId && !isHighlighted

    return {
      id: `rel-${rel.id}`,
      source: rel.from_character_id,
      target: rel.to_character_id,
      type: 'smoothstep', // Use smooth step for nice curves
      animated: modeStyle.animated && !!isHighlighted,
      label: rel.custom_label || rel.template?.name || undefined,
      labelStyle: {
        fill: isHighlighted ? '#fff' : '#9CA3AF',
        fontWeight: isHighlighted ? 600 : 400,
        fontSize: 11,
      },
      labelBgStyle: {
        fill: 'rgba(10, 10, 15, 0.9)',
        fillOpacity: 0.9,
      },
      labelBgPadding: [4, 8] as [number, number],
      labelBgBorderRadius: 4,
      style: {
        stroke: color,
        strokeWidth: isHighlighted ? 3 : isDimmed ? 1 : 2,
        strokeDasharray: rel.status === 'ended' ? '5 5' : undefined,
        opacity: isDimmed ? 0.3 : 1,
      },
      markerEnd: modeStyle.markerEnd ? {
        type: modeStyle.markerEnd,
        color: color,
        width: 20,
        height: 20,
      } : undefined,
      data: {
        relationshipId: rel.id,
        category,
        mode,
        label: rel.custom_label || rel.template?.name,
      },
    }
  })
}

// Filter options for the connection lines toolbar
export const CONNECTION_FILTER_OPTIONS: { value: RelationshipCategory | 'all'; label: string; color: string }[] = [
  { value: 'all', label: 'All Connections', color: '#8B5CF6' },
  { value: 'family', label: 'Family', color: CATEGORY_COLORS.family },
  { value: 'professional', label: 'Professional', color: CATEGORY_COLORS.professional },
  { value: 'romantic', label: 'Romantic', color: CATEGORY_COLORS.romantic },
  { value: 'conflict', label: 'Conflict', color: CATEGORY_COLORS.conflict },
  { value: 'social', label: 'Social', color: CATEGORY_COLORS.social },
]

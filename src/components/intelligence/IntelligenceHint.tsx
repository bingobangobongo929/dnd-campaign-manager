'use client'

import Link from 'next/link'

type ContentType = 'campaigns' | 'adventures' | 'oneshots'
type ItemType = 'locations' | 'factions' | 'characters' | 'quests' | 'encounters' | 'timeline' | 'relationships'

interface IntelligenceHintProps {
  /** The content type determines the Intelligence branding (Campaign/Adventure/Oneshot) */
  contentType: ContentType
  /** The type of items this hint is about */
  itemType: ItemType
  /** The ID of the campaign/adventure/oneshot */
  contentId: string
  /** Whether this is for DM view (non-DMs won't see the hint) */
  isDm?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * Get the Intelligence branding based on content type
 */
function getIntelligenceName(contentType: ContentType): string {
  switch (contentType) {
    case 'campaigns':
      return 'Campaign Intelligence'
    case 'adventures':
      return 'Adventure Intelligence'
    case 'oneshots':
      return 'Oneshot Intelligence'
    default:
      return 'Intelligence'
  }
}

/**
 * Get the Intelligence page URL based on content type
 */
function getIntelligenceUrl(contentType: ContentType, contentId: string): string {
  switch (contentType) {
    case 'campaigns':
      return `/campaigns/${contentId}/intelligence`
    case 'adventures':
      return `/adventures/${contentId}/intelligence`
    case 'oneshots':
      return `/oneshots/${contentId}/intelligence`
    default:
      return `/campaigns/${contentId}/intelligence`
  }
}

/**
 * Get the item type description for messaging
 */
function getItemTypeDescription(itemType: ItemType): string {
  switch (itemType) {
    case 'locations':
      return 'locations'
    case 'factions':
      return 'factions and organizations'
    case 'characters':
      return 'characters and NPCs'
    case 'quests':
      return 'quests and objectives'
    case 'encounters':
      return 'encounters'
    case 'timeline':
      return 'timeline events'
    case 'relationships':
      return 'character relationships'
    default:
      return 'content'
  }
}

/**
 * A subtle, non-intrusive hint that Intelligence can detect content from session notes.
 *
 * Used as a footer in content areas when content exists. For empty states,
 * the messaging should be integrated directly into the empty state component.
 *
 * Only shown to DMs (Intelligence is a DM-only feature).
 */
export function IntelligenceHint({
  contentType,
  itemType,
  contentId,
  isDm = true,
  className = '',
}: IntelligenceHintProps) {
  // Don't show to non-DMs
  if (!isDm) {
    return null
  }

  const intelligenceName = getIntelligenceName(contentType)
  const intelligenceUrl = getIntelligenceUrl(contentType, contentId)
  const itemDescription = getItemTypeDescription(itemType)

  return (
    <div className={`mt-4 pt-3 border-t border-[--border] ${className}`}>
      <p className="text-xs text-gray-500">
        <Link
          href={intelligenceUrl}
          className="text-purple-400 hover:text-purple-300 transition-colors"
        >
          {intelligenceName}
        </Link>
        {' '}can detect {itemDescription} from your session notes.
      </p>
    </div>
  )
}

/**
 * Get the empty state description text that includes Intelligence mention.
 * Use this to build consistent empty state messaging.
 */
export function getEmptyStateIntelligenceText(
  contentType: ContentType,
  itemType: ItemType
): string {
  const intelligenceName = getIntelligenceName(contentType)
  const itemDescription = getItemTypeDescription(itemType)

  return `Add ${itemDescription} manually, or let ${intelligenceName} detect them from your session notes.`
}

/**
 * Export helpers for use in other components
 */
export { getIntelligenceName, getIntelligenceUrl, getItemTypeDescription }

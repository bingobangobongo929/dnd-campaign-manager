/**
 * Character Display Utilities
 *
 * Shared rendering functions and constants for displaying rich character content.
 * Used by CharacterView, CharacterEditor, and import preview.
 */

import React from 'react'

// ============================================================================
// EMOJI CONSTANTS
// ============================================================================

export const DISPLAY_EMOJIS = {
  // General
  occupation: '💼',
  location: '📍',
  faction: '🏛️',
  abilities: '✨',
  loot: '💰',
  thoughts: '💭',
  people: '👥',
  secret: '🔒',
  goal: '⭐',
  provide: '🎁',
  need: '🎯',
  heart: '❤️',
  combat: '⚔️',
  book: '📖',
  scroll: '📜',
  crown: '👑',
  shield: '🛡️',
  magic: '🔮',
  death: '💀',
  warning: '⚠️',
  check: '✓',
  cross: '✗',
} as const

// ============================================================================
// COLOR CONSTANTS
// ============================================================================

// Relationship type colors (matching NPCCard)
export const RELATIONSHIP_COLORS: Record<string, string> = {
  family: 'bg-red-500/15 text-red-400 border-red-500/20',
  mentor: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  friend: 'bg-green-500/15 text-green-400 border-green-500/20',
  enemy: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  patron: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  contact: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  ally: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  employer: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  love_interest: 'bg-pink-500/15 text-pink-400 border-pink-500/20',
  rival: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  acquaintance: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
  party_member: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
  other: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
}

// Companion type colors (matching CompanionCard)
export const COMPANION_TYPE_COLORS: Record<string, string> = {
  familiar: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  pet: 'bg-pink-500/15 text-pink-400 border-pink-500/20',
  mount: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  animal_companion: 'bg-green-500/15 text-green-400 border-green-500/20',
  construct: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  other: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
}

// Status colors
export const STATUS_COLORS: Record<string, string> = {
  alive: '#10B981',
  dead: '#EF4444',
  missing: '#F59E0B',
  unknown: '#6B7280',
  retired: '#8B5CF6',
}

// ============================================================================
// RENDER FUNCTIONS
// ============================================================================

/**
 * Render markdown text with basic formatting (bold, italic, bullets)
 */
export function renderMarkdown(text: string): React.ReactNode {
  if (!text) return null

  // First, normalize the text:
  // - Handle escaped newlines from JSON (\\n → actual newline)
  // - Handle literal \n strings that didn't get parsed
  const normalizedText = text.replace(/\\n/g, '\n')

  // Split by newlines and process each line
  const lines = normalizedText.split('\n')

  return lines.map((line, lineIndex) => {
    // Process inline formatting
    let processed: React.ReactNode[] = []
    const remaining = line
    let keyIndex = 0

    // Handle bold (**text** or __text__)
    // Use a more permissive regex that allows asterisks within the bold text
    const boldRegex = /\*\*(.+?)\*\*|__(.+?)__/g
    let lastIndex = 0
    let match

    while ((match = boldRegex.exec(remaining)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        processed.push(remaining.slice(lastIndex, match.index))
      }
      // Add bold text
      processed.push(
        <strong key={`b-${lineIndex}-${keyIndex++}`} className="text-white/90 font-semibold">
          {match[1] || match[2]}
        </strong>
      )
      lastIndex = match.index + match[0].length
    }

    // Add remaining text after last match
    if (lastIndex < remaining.length) {
      // Process remaining text for italics (*text* or _text_)
      const remainingStr = remaining.slice(lastIndex)
      const italicRegex = /(?<![*\w])\*([^*]+)\*(?![*\w])|(?<![_\w])_([^_]+)_(?![_\w])/g
      let italicLastIndex = 0
      let italicMatch

      while ((italicMatch = italicRegex.exec(remainingStr)) !== null) {
        if (italicMatch.index > italicLastIndex) {
          processed.push(remainingStr.slice(italicLastIndex, italicMatch.index))
        }
        processed.push(
          <em key={`i-${lineIndex}-${keyIndex++}`} className="text-gray-300 italic">
            {italicMatch[1] || italicMatch[2]}
          </em>
        )
        italicLastIndex = italicMatch.index + italicMatch[0].length
      }

      if (italicLastIndex < remainingStr.length) {
        processed.push(remainingStr.slice(italicLastIndex))
      } else if (italicLastIndex === 0) {
        processed.push(remainingStr)
      }
    }

    // If no formatting was found, just use the line
    if (processed.length === 0) {
      processed = [line]
    }

    // Check if line is a bullet point
    const trimmedLine = line.trim()
    const isBullet = trimmedLine.startsWith('- ') || trimmedLine.startsWith('• ') || trimmedLine.startsWith('* ')

    if (isBullet) {
      const bulletContent = processed.map((p) =>
        typeof p === 'string' ? p.replace(/^[\s]*[-•*]\s*/, '') : p
      )
      return (
        <div key={lineIndex} className="flex items-start gap-2 ml-2">
          <span className="text-purple-400 flex-shrink-0">•</span>
          <span>{bulletContent}</span>
        </div>
      )
    }

    // Regular line
    return (
      <div key={lineIndex}>
        {processed}
        {lineIndex < lines.length - 1 && line === '' && <br />}
      </div>
    )
  })
}

/**
 * Format a field name for display (snake_case to Title Case)
 */
export function formatFieldName(field: string): string {
  return field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
}

/**
 * Get initials from a name
 */
export function getInitials(name: string): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Format a date for display
 */
export function formatDate(dateString: string): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Format relative time (e.g., "2 days ago")
 */
export function formatRelativeTime(dateString: string): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(dateString)
}

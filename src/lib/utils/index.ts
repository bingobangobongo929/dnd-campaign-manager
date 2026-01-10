export { cn } from './cn'

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function generateId(): string {
  return crypto.randomUUID()
}

// Tag colors for the picker
export const TAG_COLORS = [
  { name: 'Red', value: '#DC2626' },
  { name: 'Orange', value: '#EA580C' },
  { name: 'Amber', value: '#D97706' },
  { name: 'Yellow', value: '#CA8A04' },
  { name: 'Lime', value: '#65A30D' },
  { name: 'Green', value: '#16A34A' },
  { name: 'Teal', value: '#0D9488' },
  { name: 'Cyan', value: '#0891B2' },
  { name: 'Blue', value: '#2563EB' },
  { name: 'Violet', value: '#7C3AED' },
  { name: 'Purple', value: '#9333EA' },
  { name: 'Pink', value: '#DB2777' },
] as const

// Event type colors for timeline
export const EVENT_TYPE_COLORS = {
  plot: '#8B5CF6',
  character_intro: '#10B981',
  character_death: '#EF4444',
  location: '#3B82F6',
  combat: '#F59E0B',
  revelation: '#EC4899',
  quest_start: '#06B6D4',
  quest_end: '#14B8A6',
  session: '#6366F1',
  discovery: '#0EA5E9',
  quest_complete: '#22C55E',
  death: '#DC2626',
  romance: '#F472B6',
  alliance: '#A855F7',
  other: '#6B7280',
} as const

export const EVENT_TYPE_LABELS = {
  plot: 'Plot Point',
  character_intro: 'Character Introduction',
  character_death: 'Character Death',
  location: 'Location Change',
  combat: 'Combat',
  revelation: 'Revelation',
  quest_start: 'Quest Started',
  quest_end: 'Quest Completed',
  session: 'Session',
  discovery: 'Discovery',
  quest_complete: 'Quest Completed',
  death: 'Death',
  romance: 'Romance',
  alliance: 'Alliance',
  other: 'Other',
} as const

import type { TimelineEvent, Character } from '@/types/database'

export interface TimelineEventWithCharacters extends TimelineEvent {
  characters: Character[]
}

export interface TimelineViewProps {
  events: TimelineEventWithCharacters[]
  onEventClick: (event: TimelineEventWithCharacters) => void
  onCharacterClick: (character: Character, e: React.MouseEvent) => void
}

export type TimelineViewType = 'chapters' | 'journal' | 'browser' | 'storyboard' | 'feed'

export const VIEW_OPTIONS: { value: TimelineViewType; label: string; description: string }[] = [
  { value: 'feed', label: 'Feed', description: 'Simple scrollable cards' },
  { value: 'chapters', label: 'Chapters', description: 'Grouped by story arcs' },
  { value: 'journal', label: 'Journal', description: 'Campaign diary style' },
  { value: 'browser', label: 'Browser', description: 'Two-panel navigation' },
  { value: 'storyboard', label: 'Storyboard', description: 'Horizontal filmstrip' },
]

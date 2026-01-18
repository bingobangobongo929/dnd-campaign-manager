import type { TimelineEvent, Character } from '@/types/database'
import { LayoutGrid, BookOpen, ScrollText, PanelLeft, Film } from 'lucide-react'

export interface TimelineEventWithCharacters extends TimelineEvent {
  characters: Character[]
}

export interface TimelineViewProps {
  events: TimelineEventWithCharacters[]
  onEventClick: (event: TimelineEventWithCharacters) => void
  onCharacterClick: (character: Character, e: React.MouseEvent) => void
}

export type TimelineViewType = 'chapters' | 'journal' | 'browser' | 'storyboard' | 'feed'

export const VIEW_OPTIONS: { value: TimelineViewType; label: string; description: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'feed', label: 'Feed', description: 'Simple scrollable cards', icon: LayoutGrid },
  { value: 'chapters', label: 'Chapters', description: 'Grouped by story arcs', icon: BookOpen },
  { value: 'journal', label: 'Journal', description: 'Campaign diary style', icon: ScrollText },
  { value: 'browser', label: 'Browser', description: 'Two-panel navigation', icon: PanelLeft },
  { value: 'storyboard', label: 'Storyboard', description: 'Horizontal filmstrip', icon: Film },
]

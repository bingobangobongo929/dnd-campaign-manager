'use client'

import {
  Plus,
  Calendar,
  User,
  Scroll,
  Swords,
  MapPin,
  Crown,
  Skull,
  Star,
  Heart,
  Shield,
  Check,
  Sparkles,
} from 'lucide-react'
import { Input, Textarea } from '@/components/ui'
import { AppLayout } from '@/components/layout/app-layout'
import { MobileLayout, MobileBottomSheet } from '@/components/mobile'
import { CharacterViewModal } from '@/components/character'
import { AIGenerateModal, VIEW_OPTIONS } from '@/components/timeline'
import type { TimelineViewType, TimelineEventWithCharacters } from '@/components/timeline'
import { getInitials, cn } from '@/lib/utils'
import Image from 'next/image'
import type { Character, Tag, CharacterTag, Session } from '@/types/database'

const EVENT_TYPES = [
  { value: 'session', label: 'Session', icon: Scroll },
  { value: 'character_intro', label: 'Character Introduction', icon: User },
  { value: 'combat', label: 'Combat/Battle', icon: Swords },
  { value: 'discovery', label: 'Discovery', icon: MapPin },
  { value: 'quest_start', label: 'Quest Started', icon: Star },
  { value: 'quest_complete', label: 'Quest Completed', icon: Crown },
  { value: 'death', label: 'Death', icon: Skull },
  { value: 'romance', label: 'Romance', icon: Heart },
  { value: 'alliance', label: 'Alliance', icon: Shield },
  { value: 'other', label: 'Other', icon: Calendar },
]

export interface CampaignTimelinePageMobileProps {
  campaignId: string
  events: TimelineEventWithCharacters[]
  characters: Character[]
  sessions: Session[]
  loading: boolean
  saving: boolean
  // View state
  currentView: TimelineViewType
  handleViewChange: (view: TimelineViewType) => void
  // Create modal state
  isCreateModalOpen: boolean
  setIsCreateModalOpen: (open: boolean) => void
  formData: {
    title: string
    description: string
    event_date: string
    event_type: string
    character_ids: string[]
  }
  setFormData: (data: {
    title: string
    description: string
    event_date: string
    event_type: string
    character_ids: string[]
  }) => void
  toggleCharacter: (characterId: string) => void
  resetForm: () => void
  handleCreate: () => void
  // Event handlers
  handleEventClick: (event: TimelineEventWithCharacters) => void
  handleCharacterClick: (character: Character, e: React.MouseEvent) => void
  // Character view modal
  viewingCharacter: Character | null
  setViewingCharacter: (character: Character | null) => void
  characterTags: (CharacterTag & { tag: Tag; related_character?: Character | null })[]
  // AI generate modal
  isAIGenerateModalOpen: boolean
  setIsAIGenerateModalOpen: (open: boolean) => void
  handleAIGeneratedEvents: (events: {
    title: string
    description: string
    event_type: string
    character_ids: string[]
    source_session_ids: string[]
    location?: string | null
    is_major?: boolean
  }[]) => void
}

export function CampaignTimelinePageMobile({
  campaignId,
  events,
  characters,
  sessions,
  loading,
  saving,
  currentView,
  handleViewChange,
  isCreateModalOpen,
  setIsCreateModalOpen,
  formData,
  setFormData,
  toggleCharacter,
  resetForm,
  handleCreate,
  handleEventClick,
  handleCharacterClick,
  viewingCharacter,
  setViewingCharacter,
  characterTags,
  isAIGenerateModalOpen,
  setIsAIGenerateModalOpen,
  handleAIGeneratedEvents,
}: CampaignTimelinePageMobileProps) {
  const pcCharacters = characters.filter(c => c.type === 'pc')
  const npcCharacters = characters.filter(c => c.type === 'npc')

  if (loading) {
    return (
      <AppLayout campaignId={campaignId}>
        <MobileLayout title="Timeline" showBackButton backHref={`/campaigns/${campaignId}/canvas`}>
          <div className="flex items-center justify-center h-[60vh]">
            <div className="w-10 h-10 border-2 border-[--arcane-purple] border-t-transparent rounded-full spinner" />
          </div>
        </MobileLayout>
      </AppLayout>
    )
  }

  return (
    <AppLayout campaignId={campaignId}>
      <MobileLayout
        title="Timeline"
        showBackButton
        backHref={`/campaigns/${campaignId}/canvas`}
        actions={
          <div className="flex items-center gap-2">
            {sessions.length > 0 && (
              <button
                onClick={() => setIsAIGenerateModalOpen(true)}
                className="p-2 rounded-lg active:bg-purple-500/20 transition-colors"
              >
                <Sparkles className="w-5 h-5 text-purple-400" />
              </button>
            )}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="p-2 rounded-lg bg-[--arcane-purple] active:bg-[--arcane-purple]/80 transition-colors"
            >
              <Plus className="w-5 h-5 text-white" />
            </button>
          </div>
        }
      >
        <div className="px-4 pb-24">
          {/* View Selector Pills */}
          <div className="mb-4 -mx-4 px-4 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 min-w-max pb-2">
              {VIEW_OPTIONS.map((option) => {
                const Icon = option.icon
                const isActive = currentView === option.value
                return (
                  <button
                    key={option.value}
                    onClick={() => handleViewChange(option.value)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                      isActive
                        ? "bg-[--arcane-purple] text-white"
                        : "bg-white/5 text-gray-400 active:bg-white/10"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Empty State */}
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-gray-500" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">No events yet</h2>
              <p className="text-sm text-gray-400 mb-6">
                Start building your campaign timeline by adding key moments
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="btn btn-primary"
              >
                <Plus className="w-5 h-5" />
                Add First Event
              </button>
            </div>
          ) : (
            /* Timeline Events - Simplified Feed for Mobile */
            <div className="space-y-3">
              {events.map((event) => {
                const TypeIcon = EVENT_TYPES.find(t => t.value === event.event_type)?.icon || Calendar
                return (
                  <button
                    key={event.id}
                    onClick={() => handleEventClick(event)}
                    className="w-full text-left p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] active:bg-white/[0.06] transition-colors"
                  >
                    {/* Event Header */}
                    <div className="flex items-start gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-[--arcane-purple]/20 flex items-center justify-center flex-shrink-0">
                        <TypeIcon className="w-5 h-5 text-[--arcane-purple]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white text-[15px] line-clamp-2">{event.title}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-500">
                            {new Date(event.event_date).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-gray-400 capitalize">
                            {event.event_type.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Description Preview */}
                    {event.description && (
                      <p className="text-sm text-gray-400 line-clamp-2 mb-3 pl-13">
                        {event.description.replace(/<[^>]*>/g, '').substring(0, 120)}
                      </p>
                    )}

                    {/* Characters */}
                    {event.characters && event.characters.length > 0 && (
                      <div className="flex items-center gap-2 pl-13">
                        <div className="flex -space-x-2">
                          {event.characters.slice(0, 4).map((char) => (
                            <div
                              key={char.id}
                              className={cn(
                                "relative w-7 h-7 rounded-full overflow-hidden border-2",
                                char.type === 'pc' ? 'border-[--arcane-purple]' : 'border-[--arcane-gold]'
                              )}
                              onClick={(e) => handleCharacterClick(char, e)}
                            >
                              {char.image_url ? (
                                <Image
                                  src={char.image_url}
                                  alt={char.name}
                                  fill
                                  className="object-cover"
                                  sizes="28px"
                                />
                              ) : (
                                <div className="w-full h-full bg-[--bg-elevated] flex items-center justify-center text-[10px] font-medium text-gray-400">
                                  {getInitials(char.name)}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        {event.characters.length > 4 && (
                          <span className="text-xs text-gray-500">
                            +{event.characters.length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </MobileLayout>

      {/* Create Event Bottom Sheet */}
      <MobileBottomSheet
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          resetForm()
        }}
        title="Add Event"
      >
        <div className="space-y-4">
          {/* Event Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Event Title</label>
            <Input
              className="form-input"
              placeholder="e.g., First encounter with the dragon"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          {/* Date & Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Date</label>
              <Input
                className="form-input"
                type="date"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
              <select
                className="form-input w-full"
                value={formData.event_type}
                onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Character Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Characters Involved ({formData.character_ids.length} selected)
            </label>

            {pcCharacters.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Player Characters</p>
                <div className="flex flex-wrap gap-2">
                  {pcCharacters.map((char) => {
                    const isSelected = formData.character_ids.includes(char.id)
                    return (
                      <button
                        key={char.id}
                        type="button"
                        onClick={() => toggleCharacter(char.id)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm",
                          isSelected
                            ? "bg-[--arcane-purple] text-white"
                            : "bg-white/5 border border-white/10 text-gray-400 active:bg-white/10"
                        )}
                      >
                        <div className={cn(
                          "relative w-5 h-5 rounded-full overflow-hidden flex-shrink-0",
                          isSelected ? "ring-1 ring-white/30" : "bg-[--bg-surface]"
                        )}>
                          {char.image_url ? (
                            <Image
                              src={char.image_url}
                              alt={char.name}
                              fill
                              className="object-cover"
                              sizes="20px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[8px] font-medium">
                              {getInitials(char.name)}
                            </div>
                          )}
                        </div>
                        {char.name}
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {npcCharacters.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">NPCs</p>
                <div className="flex flex-wrap gap-2">
                  {npcCharacters.map((char) => {
                    const isSelected = formData.character_ids.includes(char.id)
                    return (
                      <button
                        key={char.id}
                        type="button"
                        onClick={() => toggleCharacter(char.id)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm",
                          isSelected
                            ? "bg-[--arcane-gold] text-[--bg-base]"
                            : "bg-white/5 border border-white/10 text-gray-400 active:bg-white/10"
                        )}
                      >
                        <div className={cn(
                          "relative w-5 h-5 rounded-full overflow-hidden flex-shrink-0",
                          isSelected ? "ring-1 ring-black/20" : "bg-[--bg-surface]"
                        )}>
                          {char.image_url ? (
                            <Image
                              src={char.image_url}
                              alt={char.name}
                              fill
                              className="object-cover"
                              sizes="20px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[8px] font-medium">
                              {getInitials(char.name)}
                            </div>
                          )}
                        </div>
                        {char.name}
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {characters.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-3">
                No characters yet. Add characters on the Canvas first.
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description (optional)</label>
            <Textarea
              className="form-textarea"
              placeholder="What happened..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              className="flex-1 btn btn-secondary"
              onClick={() => {
                setIsCreateModalOpen(false)
                resetForm()
              }}
            >
              Cancel
            </button>
            <button
              className="flex-1 btn btn-primary"
              onClick={handleCreate}
              disabled={!formData.title.trim() || saving}
            >
              {saving ? 'Creating...' : 'Create & Edit'}
            </button>
          </div>
        </div>
      </MobileBottomSheet>

      {/* Character View Modal */}
      {viewingCharacter && (
        <CharacterViewModal
          character={viewingCharacter}
          tags={characterTags}
          onEdit={() => setViewingCharacter(null)}
          onClose={() => setViewingCharacter(null)}
        />
      )}

      {/* AI Generate Modal */}
      <AIGenerateModal
        isOpen={isAIGenerateModalOpen}
        onClose={() => setIsAIGenerateModalOpen(false)}
        sessions={sessions}
        characters={characters}
        onEventsGenerated={handleAIGeneratedEvents}
      />
    </AppLayout>
  )
}

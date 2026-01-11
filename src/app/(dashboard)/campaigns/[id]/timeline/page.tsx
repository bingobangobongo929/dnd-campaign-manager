'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
  Users,
  LayoutGrid,
  ChevronDown,
} from 'lucide-react'
import { Input, Textarea, Modal, Dropdown } from '@/components/ui'
import { AppLayout } from '@/components/layout/app-layout'
import { CharacterViewModal } from '@/components/character'
import {
  FeedView,
  ChaptersView,
  JournalView,
  BrowserView,
  StoryboardView,
  VIEW_OPTIONS,
} from '@/components/timeline'
import type { TimelineViewType, TimelineEventWithCharacters } from '@/components/timeline'
import { useSupabase, useUser } from '@/hooks'
import { getInitials, cn } from '@/lib/utils'
import Image from 'next/image'
import type { Campaign, TimelineEvent, Character, Tag, CharacterTag } from '@/types/database'

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

const STORAGE_KEY = 'timeline-view-preference'

export default function TimelinePage() {
  const params = useParams()
  const router = useRouter()
  const supabase = useSupabase()
  const { user } = useUser()

  const campaignId = params.id as string

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [events, setEvents] = useState<TimelineEventWithCharacters[]>([])
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: new Date().toISOString().split('T')[0],
    event_type: 'other',
    character_ids: [] as string[],
  })
  const [saving, setSaving] = useState(false)

  // View state
  const [currentView, setCurrentView] = useState<TimelineViewType>('feed')
  const [viewMenuOpen, setViewMenuOpen] = useState(false)

  // Character preview modal state
  const [viewingCharacter, setViewingCharacter] = useState<Character | null>(null)
  const [characterTags, setCharacterTags] = useState<(CharacterTag & { tag: Tag; related_character?: Character | null })[]>([])

  // Load view preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && VIEW_OPTIONS.some(v => v.value === saved)) {
      setCurrentView(saved as TimelineViewType)
    }
  }, [])

  // Save view preference
  const handleViewChange = (view: TimelineViewType) => {
    setCurrentView(view)
    localStorage.setItem(STORAGE_KEY, view)
    setViewMenuOpen(false)
  }

  useEffect(() => {
    if (user && campaignId) {
      loadData()
    }
  }, [user, campaignId])

  const loadData = async () => {
    setLoading(true)

    const { data: campaignData } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (!campaignData) {
      router.push('/campaigns')
      return
    }
    setCampaign(campaignData)

    // Load all characters (both PCs and NPCs)
    const { data: charactersData } = await supabase
      .from('characters')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('type', { ascending: true })
      .order('name')

    setCharacters(charactersData || [])

    const { data: eventsData } = await supabase
      .from('timeline_events')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('event_date', { ascending: true })
      .order('created_at', { ascending: true })

    // Map characters to events
    const eventsWithCharacters = (eventsData || []).map(event => {
      const charIds = event.character_ids || (event.character_id ? [event.character_id] : [])
      return {
        ...event,
        characters: charIds
          .map((id: string) => charactersData?.find(c => c.id === id))
          .filter(Boolean) as Character[]
      }
    })

    setEvents(eventsWithCharacters)
    setLoading(false)
  }

  const handleCreate = async () => {
    if (!formData.title.trim()) return

    setSaving(true)
    const { data } = await supabase
      .from('timeline_events')
      .insert({
        campaign_id: campaignId,
        title: formData.title,
        description: formData.description || null,
        event_date: formData.event_date,
        event_type: formData.event_type,
        character_ids: formData.character_ids.length > 0 ? formData.character_ids : null,
        character_id: formData.character_ids.length > 0 ? formData.character_ids[0] : null,
      })
      .select()
      .single()

    if (data) {
      setIsCreateModalOpen(false)
      resetForm()
      router.push(`/campaigns/${campaignId}/timeline/${data.id}`)
    }
    setSaving(false)
  }

  const handleEventClick = (event: TimelineEventWithCharacters) => {
    router.push(`/campaigns/${campaignId}/timeline/${event.id}`)
  }

  const handleCharacterClick = async (character: Character, e: React.MouseEvent) => {
    e.stopPropagation()
    const { data: tagsData } = await supabase
      .from('character_tags')
      .select(`
        *,
        tag:tags(*),
        related_character:characters!character_tags_related_character_id_fkey(*)
      `)
      .eq('character_id', character.id)

    setCharacterTags(tagsData || [])
    setViewingCharacter(character)
  }

  const toggleCharacter = (characterId: string) => {
    setFormData(prev => ({
      ...prev,
      character_ids: prev.character_ids.includes(characterId)
        ? prev.character_ids.filter(id => id !== characterId)
        : [...prev.character_ids, characterId]
    }))
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      event_date: new Date().toISOString().split('T')[0],
      event_type: 'other',
      character_ids: [],
    })
  }

  const pcCharacters = characters.filter(c => c.type === 'pc')
  const npcCharacters = characters.filter(c => c.type === 'npc')

  // Render the current view
  const renderView = () => {
    const viewProps = {
      events,
      onEventClick: handleEventClick,
      onCharacterClick: handleCharacterClick,
    }

    switch (currentView) {
      case 'feed':
        return <FeedView {...viewProps} />
      case 'chapters':
        return <ChaptersView {...viewProps} />
      case 'journal':
        return <JournalView {...viewProps} />
      case 'browser':
        return <BrowserView {...viewProps} />
      case 'storyboard':
        return <StoryboardView {...viewProps} />
      default:
        return <FeedView {...viewProps} />
    }
  }

  if (loading) {
    return (
      <AppLayout campaignId={campaignId}>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-10 h-10 border-2 border-[--arcane-purple] border-t-transparent rounded-full spinner" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout campaignId={campaignId}>
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="page-header flex items-center justify-between">
          <div>
            <h1 className="page-title">Campaign Timeline</h1>
            <p className="page-subtitle">Chronicle your adventure's key moments</p>
          </div>
          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="relative">
              <button
                onClick={() => setViewMenuOpen(!viewMenuOpen)}
                className="btn btn-secondary flex items-center gap-2"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="capitalize">{currentView}</span>
                <ChevronDown className={cn("w-4 h-4 transition-transform", viewMenuOpen && "rotate-180")} />
              </button>

              {/* View Menu */}
              {viewMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setViewMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-64 bg-[--bg-surface] border border-[--border] rounded-xl shadow-xl z-50 py-2 animate-slide-in-up">
                    <div className="px-3 py-2 border-b border-[--border]">
                      <p className="text-xs font-semibold text-[--text-tertiary] uppercase tracking-wide">
                        View Style
                      </p>
                    </div>
                    {VIEW_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleViewChange(option.value)}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-[--bg-elevated] transition-colors",
                          currentView === option.value && "bg-[--arcane-purple]/10"
                        )}
                      >
                        <div>
                          <p className={cn(
                            "font-medium text-sm",
                            currentView === option.value ? "text-[--arcane-purple]" : "text-[--text-primary]"
                          )}>
                            {option.label}
                          </p>
                          <p className="text-xs text-[--text-tertiary]">
                            {option.description}
                          </p>
                        </div>
                        {currentView === option.value && (
                          <Check className="w-4 h-4 text-[--arcane-purple]" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="w-4 h-4" />
              Add Event
            </button>
          </div>
        </div>

        {/* Timeline Content */}
        {events.length === 0 ? (
          <div className="empty-state">
            <Calendar className="empty-state-icon" />
            <h2 className="empty-state-title">No events yet</h2>
            <p className="empty-state-description">
              Start building your campaign timeline by adding key moments and events
            </p>
            <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="w-5 h-5" />
              Add First Event
            </button>
          </div>
        ) : (
          renderView()
        )}

        {/* FAB */}
        {events.length > 0 && (
          <button
            className="fab"
            onClick={() => setIsCreateModalOpen(true)}
            aria-label="Add new event"
          >
            <Plus className="fab-icon" />
          </button>
        )}

        {/* Create Modal */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false)
            resetForm()
          }}
          title="Add Event"
          description="Create a new event, then continue editing"
        >
          <div className="space-y-4">
            <div className="form-group">
              <label className="form-label">Event Title</label>
              <Input
                className="form-input"
                placeholder="e.g., First encounter with the dragon"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Date</label>
                <Input
                  className="form-input"
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Event Type</label>
                <Dropdown
                  options={EVENT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                  value={formData.event_type}
                  onChange={(value) => setFormData({ ...formData, event_type: value })}
                />
              </div>
            </div>

            {/* Character Selection */}
            <div className="form-group">
              <label className="form-label flex items-center gap-2">
                <Users className="w-4 h-4 text-[--text-tertiary]" />
                Characters Involved
                <span className="text-[--text-tertiary] font-normal">({formData.character_ids.length} selected)</span>
              </label>

              {pcCharacters.length > 0 && (
                <div className="mb-3">
                  <h4 className="text-xs font-semibold text-[--text-tertiary] uppercase tracking-wide mb-2">
                    Player Characters
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {pcCharacters.map((char) => {
                      const isSelected = formData.character_ids.includes(char.id)
                      return (
                        <button
                          key={char.id}
                          type="button"
                          onClick={() => toggleCharacter(char.id)}
                          className={cn(
                            'flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all text-sm',
                            isSelected
                              ? 'bg-[--arcane-purple] text-white'
                              : 'bg-[--bg-elevated] border border-[--border] hover:border-[--arcane-purple]/50 text-[--text-secondary]'
                          )}
                        >
                          <div className={cn(
                            "relative w-5 h-5 rounded-full overflow-hidden flex-shrink-0",
                            isSelected ? 'ring-1 ring-white/30' : 'bg-[--bg-surface]'
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
                              <div className={cn(
                                "w-full h-full flex items-center justify-center text-[8px] font-medium",
                                isSelected ? 'bg-white/20 text-white' : 'text-[--text-secondary]'
                              )}>
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
                  <h4 className="text-xs font-semibold text-[--text-tertiary] uppercase tracking-wide mb-2">
                    Non-Player Characters
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {npcCharacters.map((char) => {
                      const isSelected = formData.character_ids.includes(char.id)
                      return (
                        <button
                          key={char.id}
                          type="button"
                          onClick={() => toggleCharacter(char.id)}
                          className={cn(
                            'flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all text-sm',
                            isSelected
                              ? 'bg-[--arcane-gold] text-[--bg-base]'
                              : 'bg-[--bg-elevated] border border-[--border] hover:border-[--arcane-gold]/50 text-[--text-secondary]'
                          )}
                        >
                          <div className={cn(
                            "relative w-5 h-5 rounded-full overflow-hidden flex-shrink-0",
                            isSelected ? 'ring-1 ring-black/20' : 'bg-[--bg-surface]'
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
                              <div className={cn(
                                "w-full h-full flex items-center justify-center text-[8px] font-medium",
                                isSelected ? 'bg-black/20 text-[--bg-base]' : 'text-[--text-secondary]'
                              )}>
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
                <p className="text-sm text-[--text-tertiary] text-center py-2">
                  No characters yet. Add characters on the Canvas first.
                </p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Description (optional)</label>
              <Textarea
                className="form-textarea"
                placeholder="What happened..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setIsCreateModalOpen(false)
                  resetForm()
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreate}
                disabled={!formData.title.trim() || saving}
              >
                {saving ? 'Creating...' : 'Create & Edit'}
              </button>
            </div>
          </div>
        </Modal>

        {/* Character View Modal */}
        {viewingCharacter && (
          <CharacterViewModal
            character={viewingCharacter}
            tags={characterTags}
            onEdit={() => setViewingCharacter(null)}
            onClose={() => setViewingCharacter(null)}
          />
        )}
      </div>
    </AppLayout>
  )
}

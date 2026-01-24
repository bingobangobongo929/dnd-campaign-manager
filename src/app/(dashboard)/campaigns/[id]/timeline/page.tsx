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
  Sparkles,
} from 'lucide-react'
import { Input, Textarea, Modal, Dropdown, AccessDeniedPage } from '@/components/ui'
import { AppLayout } from '@/components/layout/app-layout'
import { BackToTopButton } from '@/components/ui/back-to-top'
import { CharacterViewModal } from '@/components/character'
import {
  FeedView,
  ChaptersView,
  JournalView,
  BrowserView,
  StoryboardView,
  AIGenerateModal,
  VIEW_OPTIONS,
} from '@/components/timeline'
import type { TimelineViewType, TimelineEventWithCharacters } from '@/components/timeline'
import { useSupabase, useUser, useIsMobile, usePermissions } from '@/hooks'
import { CampaignTimelinePageMobile } from './page.mobile'
import { getInitials, cn } from '@/lib/utils'
import Image from 'next/image'
import type { Campaign, TimelineEvent, Character, Tag, CharacterTag, Session, CampaignEra } from '@/types/database'
import { toast } from 'sonner'

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
  const isMobile = useIsMobile()

  // Permissions
  const { can, loading: permissionsLoading, isMember } = usePermissions(campaignId)

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

  // AI generation state
  const [sessions, setSessions] = useState<Session[]>([])
  const [isAIGenerateModalOpen, setIsAIGenerateModalOpen] = useState(false)

  // Character filter state
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null)
  const [characterFilterMenuOpen, setCharacterFilterMenuOpen] = useState(false)

  // Eras/Chapters state
  const [eras, setEras] = useState<CampaignEra[]>([])
  const [isEraModalOpen, setIsEraModalOpen] = useState(false)
  const [editingEra, setEditingEra] = useState<CampaignEra | null>(null)
  const [eraFormData, setEraFormData] = useState({
    name: '',
    description: '',
    color: '#8B5CF6',
  })

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

  // Filter events by selected character
  const filteredEvents = selectedCharacterId
    ? events.filter(event =>
        event.characters.some(c => c.id === selectedCharacterId) ||
        event.character_ids?.includes(selectedCharacterId) ||
        event.character_id === selectedCharacterId
      )
    : events

  const selectedCharacter = selectedCharacterId
    ? characters.find(c => c.id === selectedCharacterId)
    : null

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

    // Load sessions for AI generation
    const { data: sessionsData } = await supabase
      .from('sessions')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('session_date', { ascending: false })

    setSessions(sessionsData || [])

    // Load eras/chapters
    const { data: erasData } = await supabase
      .from('campaign_eras')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('sort_order', { ascending: true })

    setEras(erasData || [])

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

  // Handle AI-generated events
  const handleAIGeneratedEvents = async (generatedEvents: {
    title: string
    description: string
    event_type: string
    character_ids: string[]
    source_session_ids: string[]
    location?: string | null
    is_major?: boolean
  }[]) => {
    // Insert all generated events
    for (const event of generatedEvents) {
      await supabase
        .from('timeline_events')
        .insert({
          campaign_id: campaignId,
          title: event.title,
          description: event.description,
          event_type: event.event_type,
          event_date: new Date().toISOString().split('T')[0],
          location: event.location || null,
          is_major: event.is_major || false,
          character_ids: event.character_ids.length > 0 ? event.character_ids : null,
          character_id: event.character_ids.length > 0 ? event.character_ids[0] : null,
        })
    }

    // Reload events
    await loadData()
  }

  const pcCharacters = characters.filter(c => c.type === 'pc')
  const npcCharacters = characters.filter(c => c.type === 'npc')

  // Era handlers
  const handleEraCreate = () => {
    setEditingEra(null)
    setEraFormData({ name: '', description: '', color: '#8B5CF6' })
    setIsEraModalOpen(true)
  }

  const handleEraEdit = (era: CampaignEra) => {
    setEditingEra(era)
    setEraFormData({
      name: era.name,
      description: era.description || '',
      color: era.color || '#8B5CF6',
    })
    setIsEraModalOpen(true)
  }

  const handleEraSave = async () => {
    // Check permission - creating new requires addTimeline, editing requires editTimeline
    if (editingEra && !can.editTimeline) {
      toast.error('You do not have permission to edit chapters')
      return
    }
    if (!editingEra && !can.addTimeline) {
      toast.error('You do not have permission to add chapters')
      return
    }

    if (!eraFormData.name.trim()) {
      toast.error('Chapter name is required')
      return
    }

    setSaving(true)
    try {
      if (editingEra) {
        // Update existing era
        const { error } = await supabase
          .from('campaign_eras')
          .update({
            name: eraFormData.name,
            description: eraFormData.description || null,
            color: eraFormData.color,
          })
          .eq('id', editingEra.id)

        if (error) throw error
        toast.success('Chapter updated')
      } else {
        // Create new era
        const { error } = await supabase
          .from('campaign_eras')
          .insert({
            campaign_id: campaignId,
            name: eraFormData.name,
            description: eraFormData.description || null,
            color: eraFormData.color,
            sort_order: eras.length,
          })

        if (error) throw error
        toast.success('Chapter created')
      }

      setIsEraModalOpen(false)
      setEditingEra(null)
      await loadData()
    } catch (error) {
      console.error('Failed to save era:', error)
      toast.error('Failed to save chapter')
    } finally {
      setSaving(false)
    }
  }

  const handleEraDelete = async (eraId: string) => {
    // Check delete permission
    if (!can.deleteTimeline) {
      toast.error('You do not have permission to delete chapters')
      return
    }

    try {
      const { error } = await supabase
        .from('campaign_eras')
        .delete()
        .eq('id', eraId)

      if (error) throw error
      toast.success('Chapter deleted')
      await loadData()
    } catch (error) {
      console.error('Failed to delete era:', error)
      toast.error('Failed to delete chapter')
    }
  }

  // Render the current view
  const renderView = () => {
    const viewProps = {
      events: filteredEvents,
      onEventClick: handleEventClick,
      onCharacterClick: handleCharacterClick,
    }

    switch (currentView) {
      case 'feed':
        return <FeedView {...viewProps} />
      case 'chapters':
        return (
          <ChaptersView
            {...viewProps}
            eras={eras}
            canAdd={can.addTimeline}
            canEdit={can.editTimeline}
            canDelete={can.deleteTimeline}
            onEraCreate={handleEraCreate}
            onEraEdit={handleEraEdit}
            onEraDelete={handleEraDelete}
          />
        )
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

  // ============ MOBILE LAYOUT ============
  if (isMobile) {
    return (
      <CampaignTimelinePageMobile
        campaignId={campaignId}
        events={events}
        characters={characters}
        sessions={sessions}
        loading={loading}
        saving={saving}
        currentView={currentView}
        handleViewChange={handleViewChange}
        isCreateModalOpen={isCreateModalOpen}
        setIsCreateModalOpen={setIsCreateModalOpen}
        formData={formData}
        setFormData={setFormData}
        toggleCharacter={toggleCharacter}
        resetForm={resetForm}
        handleCreate={handleCreate}
        handleEventClick={handleEventClick}
        handleCharacterClick={handleCharacterClick}
        viewingCharacter={viewingCharacter}
        setViewingCharacter={setViewingCharacter}
        characterTags={characterTags}
        isAIGenerateModalOpen={isAIGenerateModalOpen}
        setIsAIGenerateModalOpen={setIsAIGenerateModalOpen}
        handleAIGeneratedEvents={handleAIGeneratedEvents}
      />
    )
  }

  // ============ DESKTOP LAYOUT ============
  if (loading || permissionsLoading) {
    return (
      <AppLayout campaignId={campaignId}>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-10 h-10 border-2 border-[--arcane-purple] border-t-transparent rounded-full spinner" />
        </div>
      </AppLayout>
    )
  }

  // Permission check - must be a member with view permission
  if (!isMember || !can.viewTimeline) {
    return (
      <AppLayout campaignId={campaignId}>
        <AccessDeniedPage
          campaignId={campaignId}
          message="You don't have permission to view the timeline for this campaign."
        />
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
            <p className="page-subtitle">
              {selectedCharacter
                ? `${selectedCharacter.name}'s journey - ${filteredEvents.length} event${filteredEvents.length !== 1 ? 's' : ''}`
                : 'Chronicle your adventure\'s key moments'}
            </p>
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
                  <div className="absolute right-0 top-full mt-2 w-72 rounded-xl shadow-2xl z-50 overflow-hidden" style={{ backgroundColor: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#9ca3af' }}>
                        View Style
                      </p>
                    </div>
                    <div className="py-2">
                      {VIEW_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleViewChange(option.value)}
                          className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
                          style={{
                            backgroundColor: currentView === option.value ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                          }}
                          onMouseEnter={(e) => {
                            if (currentView !== option.value) {
                              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = currentView === option.value ? 'rgba(139, 92, 246, 0.15)' : 'transparent'
                          }}
                        >
                          <div>
                            <p
                              className="font-semibold text-[15px]"
                              style={{ color: currentView === option.value ? '#a78bfa' : '#f3f4f6' }}
                            >
                              {option.label}
                            </p>
                            <p className="text-[13px] mt-0.5" style={{ color: '#9ca3af' }}>
                              {option.description}
                            </p>
                          </div>
                          {currentView === option.value && (
                            <Check className="w-5 h-5 flex-shrink-0" style={{ color: '#a78bfa' }} />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Character Filter */}
            {characters.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setCharacterFilterMenuOpen(!characterFilterMenuOpen)}
                  className="btn btn-secondary flex items-center gap-2"
                  style={{
                    backgroundColor: selectedCharacterId ? 'rgba(139, 92, 246, 0.2)' : undefined,
                    borderColor: selectedCharacterId ? 'rgba(139, 92, 246, 0.4)' : undefined,
                  }}
                >
                  <User className="w-4 h-4" />
                  <span className="max-w-24 truncate">
                    {selectedCharacter ? selectedCharacter.name : 'All Characters'}
                  </span>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", characterFilterMenuOpen && "rotate-180")} />
                </button>

                {characterFilterMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setCharacterFilterMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-64 rounded-xl shadow-2xl z-50 overflow-hidden max-h-80 overflow-y-auto" style={{ backgroundColor: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#9ca3af' }}>
                          Filter by Character
                        </p>
                      </div>
                      <div className="py-2">
                        <button
                          onClick={() => {
                            setSelectedCharacterId(null)
                            setCharacterFilterMenuOpen(false)
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                          style={{
                            backgroundColor: !selectedCharacterId ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                          }}
                          onMouseEnter={(e) => {
                            if (selectedCharacterId) {
                              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = !selectedCharacterId ? 'rgba(139, 92, 246, 0.15)' : 'transparent'
                          }}
                        >
                          <Users className="w-5 h-5" style={{ color: !selectedCharacterId ? '#a78bfa' : '#9ca3af' }} />
                          <span className="font-medium" style={{ color: !selectedCharacterId ? '#a78bfa' : '#f3f4f6' }}>
                            All Characters
                          </span>
                        </button>

                        {characters.map((character) => (
                          <button
                            key={character.id}
                            onClick={() => {
                              setSelectedCharacterId(character.id)
                              setCharacterFilterMenuOpen(false)
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                            style={{
                              backgroundColor: selectedCharacterId === character.id ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                            }}
                            onMouseEnter={(e) => {
                              if (selectedCharacterId !== character.id) {
                                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = selectedCharacterId === character.id ? 'rgba(139, 92, 246, 0.15)' : 'transparent'
                            }}
                          >
                            {character.image_url ? (
                              <Image
                                src={character.image_url}
                                alt={character.name}
                                width={24}
                                height={24}
                                className="rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-400 text-xs font-medium">
                                {getInitials(character.name)}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p
                                className="font-medium text-sm truncate"
                                style={{ color: selectedCharacterId === character.id ? '#a78bfa' : '#f3f4f6' }}
                              >
                                {character.name}
                              </p>
                              <p className="text-xs capitalize" style={{ color: '#9ca3af' }}>
                                {character.type}
                              </p>
                            </div>
                            {selectedCharacterId === character.id && (
                              <Check className="w-4 h-4 flex-shrink-0" style={{ color: '#a78bfa' }} />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {sessions.length > 0 && (
              <button
                className="btn btn-secondary flex items-center gap-2"
                onClick={() => setIsAIGenerateModalOpen(true)}
                style={{
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                }}
              >
                <Sparkles className="w-4 h-4" style={{ color: '#a78bfa' }} />
                <span style={{ color: '#a78bfa' }}>AI Generate</span>
              </button>
            )}

            {can.addTimeline && (
              <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="w-4 h-4" />
                Add Event
              </button>
            )}
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
            <p className="text-xs text-purple-400/80 mt-3 max-w-md italic">
              Add events manually, or use Campaign Intelligence to extract timeline events from your session notes automatically.
            </p>
            <div className="flex items-center gap-3 mt-4">
              {can.addTimeline && (
                <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="w-5 h-5" />
                  Add First Event
                </button>
              )}
              {can.addTimeline && sessions.length > 0 && (
                <button
                  className="btn btn-secondary flex items-center gap-2"
                  onClick={() => setIsAIGenerateModalOpen(true)}
                  style={{
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                  }}
                >
                  <Sparkles className="w-4 h-4" style={{ color: '#a78bfa' }} />
                  <span style={{ color: '#a78bfa' }}>AI Generate</span>
                </button>
              )}
            </div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="empty-state">
            <User className="empty-state-icon" />
            <h2 className="empty-state-title">No events for {selectedCharacter?.name}</h2>
            <p className="empty-state-description">
              This character hasn't been involved in any timeline events yet
            </p>
            <button className="btn btn-secondary mt-4" onClick={() => setSelectedCharacterId(null)}>
              Show All Events
            </button>
          </div>
        ) : (
          renderView()
        )}

        {/* FAB */}
        {events.length > 0 && can.addTimeline && (
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

        {/* AI Generate Modal */}
        <AIGenerateModal
          isOpen={isAIGenerateModalOpen}
          onClose={() => setIsAIGenerateModalOpen(false)}
          sessions={sessions}
          characters={characters}
          onEventsGenerated={handleAIGeneratedEvents}
        />

        {/* Era/Chapter Modal */}
        <Modal
          isOpen={isEraModalOpen}
          onClose={() => {
            setIsEraModalOpen(false)
            setEditingEra(null)
          }}
          title={editingEra ? 'Edit Chapter' : 'Create Chapter'}
          description="Organize your timeline into story chapters"
        >
          <div className="space-y-4">
            <div className="form-group">
              <label className="form-label">Chapter Name</label>
              <Input
                className="form-input"
                placeholder="e.g., The Gathering Storm, The Lost Mines, etc."
                value={eraFormData.name}
                onChange={(e) => setEraFormData({ ...eraFormData, name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description (optional)</label>
              <Textarea
                className="form-textarea"
                placeholder="What this chapter of the story is about..."
                value={eraFormData.description}
                onChange={(e) => setEraFormData({ ...eraFormData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Color</label>
              <div className="flex gap-2">
                {['#8B5CF6', '#EF4444', '#10B981', '#F59E0B', '#3B82F6', '#EC4899', '#6366F1', '#06B6D4'].map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setEraFormData({ ...eraFormData, color })}
                    className={cn(
                      'w-8 h-8 rounded-lg transition-all',
                      eraFormData.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[--bg-surface]' : ''
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setIsEraModalOpen(false)
                  setEditingEra(null)
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleEraSave}
                disabled={!eraFormData.name.trim() || saving}
              >
                {saving ? 'Saving...' : editingEra ? 'Update' : 'Create Chapter'}
              </button>
            </div>
          </div>
        </Modal>
      </div>
      <BackToTopButton />
    </AppLayout>
  )
}

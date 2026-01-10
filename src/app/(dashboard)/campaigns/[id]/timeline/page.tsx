'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Plus,
  ArrowLeft,
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
  Edit,
  Trash2,
} from 'lucide-react'
import { Button, Input, Textarea, Modal, Dropdown, Avatar } from '@/components/ui'
import { DashboardLayout } from '@/components/layout'
import { useSupabase, useUser } from '@/hooks'
import { formatDate, EVENT_TYPE_COLORS } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Campaign, TimelineEvent, Character } from '@/types/database'

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

const getEventIcon = (type: string) => {
  const eventType = EVENT_TYPES.find((t) => t.value === type)
  return eventType?.icon || Calendar
}

export default function TimelinePage() {
  const params = useParams()
  const router = useRouter()
  const supabase = useSupabase()
  const { user } = useUser()

  const campaignId = params.id as string

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [events, setEvents] = useState<(TimelineEvent & { character?: Character })[]>([])
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: new Date().toISOString().split('T')[0],
    event_type: 'other',
    character_id: null as string | null,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user && campaignId) {
      loadData()
    }
  }, [user, campaignId])

  const loadData = async () => {
    setLoading(true)

    // Load campaign
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

    // Load characters for linking
    const { data: charactersData } = await supabase
      .from('characters')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('name')

    setCharacters(charactersData || [])

    // Load timeline events with character data
    const { data: eventsData } = await supabase
      .from('timeline_events')
      .select(`
        *,
        character:characters(*)
      `)
      .eq('campaign_id', campaignId)
      .order('event_date', { ascending: true })
      .order('created_at', { ascending: true })

    setEvents(eventsData || [])
    setLoading(false)
  }

  const handleCreate = async () => {
    if (!formData.title.trim()) return

    setSaving(true)
    const { data, error } = await supabase
      .from('timeline_events')
      .insert({
        campaign_id: campaignId,
        title: formData.title,
        description: formData.description || null,
        event_date: formData.event_date,
        event_type: formData.event_type,
        character_id: formData.character_id,
      })
      .select(`
        *,
        character:characters(*)
      `)
      .single()

    if (data) {
      // Insert in sorted position
      const newEvents = [...events, data].sort((a, b) => {
        const dateCompare = new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
        if (dateCompare !== 0) return dateCompare
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      })
      setEvents(newEvents)
      setIsCreateModalOpen(false)
      resetForm()
    }
    setSaving(false)
  }

  const handleUpdate = async () => {
    if (!formData.title.trim() || !editingEvent) return

    setSaving(true)
    const { data, error } = await supabase
      .from('timeline_events')
      .update({
        title: formData.title,
        description: formData.description || null,
        event_date: formData.event_date,
        event_type: formData.event_type,
        character_id: formData.character_id,
      })
      .eq('id', editingEvent.id)
      .select(`
        *,
        character:characters(*)
      `)
      .single()

    if (data) {
      const newEvents = events.map((e) => (e.id === data.id ? data : e)).sort((a, b) => {
        const dateCompare = new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
        if (dateCompare !== 0) return dateCompare
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      })
      setEvents(newEvents)
      setEditingEvent(null)
      resetForm()
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return

    await supabase.from('timeline_events').delete().eq('id', id)
    setEvents(events.filter((e) => e.id !== id))
  }

  const openEditModal = (event: TimelineEvent) => {
    setFormData({
      title: event.title,
      description: event.description || '',
      event_date: event.event_date,
      event_type: event.event_type,
      character_id: event.character_id,
    })
    setEditingEvent(event)
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      event_date: new Date().toISOString().split('T')[0],
      event_type: 'other',
      character_id: null,
    })
  }

  // Group events by year/month for better visualization
  const groupedEvents = events.reduce((acc, event) => {
    const date = new Date(event.event_date)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(event)
    return acc
  }, {} as Record<string, typeof events>)

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="w-8 h-8 border-2 border-[--accent-primary] border-t-transparent rounded-full spinner" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/campaigns/${campaignId}/canvas`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-[--text-primary]">Campaign Timeline</h1>
            <p className="text-[--text-secondary]">{campaign?.name}</p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
        </div>

        {/* Timeline */}
        {events.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="h-16 w-16 mx-auto text-[--text-tertiary] mb-4" />
            <h3 className="text-lg font-semibold text-[--text-primary] mb-2">
              No events yet
            </h3>
            <p className="text-[--text-secondary] mb-6">
              Start building your campaign timeline by adding events
            </p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Event
            </Button>
          </div>
        ) : (
          <div className="relative">
            {/* Central timeline line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[--accent-primary] via-[--accent-secondary] to-[--accent-primary]" />

            {Object.entries(groupedEvents).map(([monthKey, monthEvents]) => {
              const [year, month] = monthKey.split('-')
              const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })

              return (
                <div key={monthKey} className="mb-8">
                  {/* Month header */}
                  <div className="flex items-center gap-4 mb-6 relative">
                    <div className="w-16 h-16 rounded-full bg-[--bg-surface] border-2 border-[--accent-primary] flex items-center justify-center z-10">
                      <Calendar className="h-6 w-6 text-[--accent-primary]" />
                    </div>
                    <h2 className="text-lg font-semibold text-[--text-primary]">{monthName}</h2>
                  </div>

                  {/* Events */}
                  <div className="space-y-4 ml-8 pl-12 border-l-2 border-[--border]">
                    {monthEvents.map((event, index) => {
                      const EventIcon = getEventIcon(event.event_type)
                      const color = EVENT_TYPE_COLORS[event.event_type] || EVENT_TYPE_COLORS.other

                      return (
                        <div
                          key={event.id}
                          className="relative group"
                        >
                          {/* Event dot on timeline */}
                          <div
                            className="absolute -left-[53px] w-4 h-4 rounded-full border-2 border-[--bg-base]"
                            style={{ backgroundColor: color }}
                          />

                          {/* Event card */}
                          <div
                            className={cn(
                              'bg-[--bg-surface] border border-[--border] rounded-xl p-4 transition-all',
                              'hover:border-[--accent-primary]/50 hover:shadow-lg'
                            )}
                          >
                            <div className="flex items-start gap-4">
                              {/* Icon */}
                              <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: `${color}20`, color }}
                              >
                                <EventIcon className="h-5 w-5" />
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span
                                    className="text-xs font-medium px-2 py-0.5 rounded"
                                    style={{ backgroundColor: `${color}20`, color }}
                                  >
                                    {EVENT_TYPES.find((t) => t.value === event.event_type)?.label}
                                  </span>
                                  <span className="text-xs text-[--text-tertiary]">
                                    {formatDate(event.event_date)}
                                  </span>
                                </div>
                                <h3 className="font-semibold text-[--text-primary]">
                                  {event.title}
                                </h3>
                                {event.description && (
                                  <p className="text-sm text-[--text-secondary] mt-1 line-clamp-2">
                                    {event.description}
                                  </p>
                                )}
                                {event.character && (
                                  <div className="flex items-center gap-2 mt-2">
                                    <Avatar
                                      src={event.character.image_url}
                                      name={event.character.name}
                                      size="sm"
                                    />
                                    <span className="text-sm text-[--text-secondary]">
                                      {event.character.name}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => openEditModal(event)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-[--accent-danger]"
                                  onClick={() => handleDelete(event.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Create/Edit Modal */}
        <Modal
          isOpen={isCreateModalOpen || !!editingEvent}
          onClose={() => {
            setIsCreateModalOpen(false)
            setEditingEvent(null)
            resetForm()
          }}
          title={editingEvent ? 'Edit Event' : 'Add Event'}
          description={editingEvent ? undefined : 'Add a new event to your campaign timeline'}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[--text-primary]">Event Title</label>
              <Input
                placeholder="e.g., First encounter with the dragon"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[--text-primary]">Date</label>
                <Input
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[--text-primary]">Event Type</label>
                <Dropdown
                  options={EVENT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                  value={formData.event_type}
                  onChange={(value) => setFormData({ ...formData, event_type: value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[--text-primary]">
                Related Character (optional)
              </label>
              <Dropdown
                options={[
                  { value: '', label: 'None' },
                  ...characters.map((c) => ({ value: c.id, label: c.name })),
                ]}
                value={formData.character_id || ''}
                onChange={(value) => setFormData({ ...formData, character_id: value || null })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[--text-primary]">
                Description (optional)
              </label>
              <Textarea
                placeholder="What happened..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsCreateModalOpen(false)
                  setEditingEvent(null)
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={editingEvent ? handleUpdate : handleCreate}
                loading={saving}
                disabled={!formData.title.trim()}
              >
                {editingEvent ? 'Save Changes' : 'Add Event'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  )
}

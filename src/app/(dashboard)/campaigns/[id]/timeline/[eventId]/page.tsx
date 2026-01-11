'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
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
  Check,
  Users,
} from 'lucide-react'
import { Input, Dropdown } from '@/components/ui'
import { RichTextEditor } from '@/components/editor'
import { AppLayout } from '@/components/layout/app-layout'
import { useSupabase, useUser, useAutoSave } from '@/hooks'
import { formatDate, cn, getInitials } from '@/lib/utils'
import Image from 'next/image'
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

export default function TimelineEventDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = useSupabase()
  const { user } = useUser()

  const campaignId = params.id as string
  const eventId = params.eventId as string

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [event, setEvent] = useState<TimelineEvent | null>(null)
  const [characters, setCharacters] = useState<Character[]>([])
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: '',
    event_type: 'other',
  })

  useEffect(() => {
    if (user && campaignId && eventId) {
      loadData()
    }
  }, [user, campaignId, eventId])

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

    // Load event
    const { data: eventData } = await supabase
      .from('timeline_events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (!eventData) {
      router.push(`/campaigns/${campaignId}/timeline`)
      return
    }

    setEvent(eventData)
    setFormData({
      title: eventData.title || '',
      description: eventData.description || '',
      event_date: eventData.event_date || '',
      event_type: eventData.event_type || 'other',
    })

    // Set selected characters - use character_ids if available, fall back to character_id
    const charIds = eventData.character_ids || (eventData.character_id ? [eventData.character_id] : [])
    setSelectedCharacterIds(charIds)

    // Load all characters for selection (both PCs and NPCs)
    const { data: charactersData } = await supabase
      .from('characters')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('type', { ascending: true })
      .order('name')

    setCharacters(charactersData || [])
    setLoading(false)
  }

  // Toggle character selection
  const toggleCharacter = (characterId: string) => {
    setSelectedCharacterIds(prev =>
      prev.includes(characterId)
        ? prev.filter(id => id !== characterId)
        : [...prev, characterId]
    )
  }

  // Auto-save functionality
  const saveEvent = useCallback(async () => {
    if (!event) return

    await supabase
      .from('timeline_events')
      .update({
        title: formData.title,
        description: formData.description || null,
        event_date: formData.event_date,
        event_type: formData.event_type,
        character_ids: selectedCharacterIds.length > 0 ? selectedCharacterIds : null,
        // Keep backward compatibility
        character_id: selectedCharacterIds.length > 0 ? selectedCharacterIds[0] : null,
      })
      .eq('id', event.id)
  }, [formData, selectedCharacterIds, event, supabase])

  const { status } = useAutoSave({
    data: { ...formData, selectedCharacterIds },
    onSave: saveEvent,
    delay: 1500,
  })

  // Group characters by type
  const pcCharacters = characters.filter(c => c.type === 'pc')
  const npcCharacters = characters.filter(c => c.type === 'npc')

  if (loading || !event) {
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
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push(`/campaigns/${campaignId}/timeline`)}
            className="btn btn-ghost mb-4 -ml-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Timeline
          </button>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Dropdown
                  options={EVENT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                  value={formData.event_type}
                  onChange={(value) => setFormData({ ...formData, event_type: value })}
                  className="w-48"
                />
                <div className="flex items-center gap-1.5 text-sm text-[--text-tertiary]">
                  <Calendar className="w-4 h-4" />
                  <Input
                    type="date"
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                    className="h-7 px-2 py-0 text-sm border-none bg-transparent hover:bg-[--bg-elevated] focus:bg-[--bg-elevated] rounded cursor-pointer"
                  />
                </div>
              </div>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="text-2xl font-display font-semibold border-none bg-transparent px-0 h-auto focus:ring-0 placeholder:text-[--text-tertiary]"
                placeholder="Event title..."
              />
            </div>
            <div className="flex items-center gap-3">
              <span className={cn(
                "text-sm transition-opacity",
                status === 'saving' ? 'text-[--text-tertiary]' : 'text-[--text-tertiary] opacity-60'
              )}>
                {status === 'saving' && 'Saving...'}
                {status === 'saved' && 'Saved'}
                {status === 'idle' && 'All changes saved'}
              </span>
            </div>
          </div>
        </div>

        {/* Characters Section */}
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[--arcane-purple]" />
              <label className="form-label mb-0 text-lg">
                Characters Involved
              </label>
              <span className="text-sm text-[--text-tertiary]">
                ({selectedCharacterIds.length} selected)
              </span>
            </div>
          </div>

          {/* PC Characters */}
          {pcCharacters.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-[--text-tertiary] uppercase tracking-wide mb-2">
                Player Characters
              </h4>
              <div className="flex flex-wrap gap-2">
                {pcCharacters.map((char) => {
                  const isSelected = selectedCharacterIds.includes(char.id)
                  return (
                    <button
                      key={char.id}
                      onClick={() => toggleCharacter(char.id)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-xl transition-all',
                        isSelected
                          ? 'bg-[--arcane-purple] text-white shadow-lg shadow-[--arcane-purple]/25'
                          : 'bg-[--bg-elevated] border border-[--border] hover:border-[--arcane-purple]/50 text-[--text-secondary] hover:text-[--text-primary]'
                      )}
                    >
                      <div className={cn(
                        "relative w-7 h-7 rounded-full overflow-hidden flex-shrink-0",
                        isSelected ? 'ring-2 ring-white/30' : 'bg-[--bg-surface]'
                      )}>
                        {char.image_url ? (
                          <Image
                            src={char.image_url}
                            alt={char.name}
                            fill
                            className="object-cover"
                            sizes="28px"
                          />
                        ) : (
                          <div className={cn(
                            "w-full h-full flex items-center justify-center text-xs font-medium",
                            isSelected ? 'bg-white/20 text-white' : 'text-[--text-secondary]'
                          )}>
                            {getInitials(char.name)}
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-medium">
                        {char.name}
                      </span>
                      {isSelected && (
                        <Check className="w-4 h-4 ml-1" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* NPC Characters */}
          {npcCharacters.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-[--text-tertiary] uppercase tracking-wide mb-2">
                Non-Player Characters
              </h4>
              <div className="flex flex-wrap gap-2">
                {npcCharacters.map((char) => {
                  const isSelected = selectedCharacterIds.includes(char.id)
                  return (
                    <button
                      key={char.id}
                      onClick={() => toggleCharacter(char.id)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-xl transition-all',
                        isSelected
                          ? 'bg-[--arcane-gold] text-[--bg-base] shadow-lg shadow-[--arcane-gold]/25'
                          : 'bg-[--bg-elevated] border border-[--border] hover:border-[--arcane-gold]/50 text-[--text-secondary] hover:text-[--text-primary]'
                      )}
                    >
                      <div className={cn(
                        "relative w-7 h-7 rounded-full overflow-hidden flex-shrink-0",
                        isSelected ? 'ring-2 ring-black/20' : 'bg-[--bg-surface]'
                      )}>
                        {char.image_url ? (
                          <Image
                            src={char.image_url}
                            alt={char.name}
                            fill
                            className="object-cover"
                            sizes="28px"
                          />
                        ) : (
                          <div className={cn(
                            "w-full h-full flex items-center justify-center text-xs font-medium",
                            isSelected ? 'bg-black/20 text-[--bg-base]' : 'text-[--text-secondary]'
                          )}>
                            {getInitials(char.name)}
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-medium">
                        {char.name}
                      </span>
                      {isSelected && (
                        <Check className="w-4 h-4 ml-1" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {characters.length === 0 && (
            <p className="text-sm text-[--text-tertiary] text-center py-4">
              No characters in this campaign yet. Add characters on the Canvas.
            </p>
          )}
        </div>

        {/* Description Section */}
        <div className="card p-5">
          <label className="form-label">Event Description</label>
          <RichTextEditor
            content={formData.description}
            onChange={(content) => setFormData({ ...formData, description: content })}
            placeholder="Describe what happened during this event..."
            className="min-h-[300px]"
          />
        </div>
      </div>
    </AppLayout>
  )
}

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { TimelineEventEditor, type TimelineEventFormData } from '@/components/timeline'
import { AppLayout } from '@/components/layout/app-layout'
import { useSupabase, useUser, useAutoSave, useIsMobile } from '@/hooks'
import { CampaignTimelineEventPageMobile } from './page.mobile'
import { cn } from '@/lib/utils'
import type { Campaign, TimelineEvent, Character, Session } from '@/types/database'

export default function TimelineEventDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = useSupabase()
  const { user } = useUser()

  const campaignId = params.id as string
  const eventId = params.eventId as string
  const isMobile = useIsMobile()

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [event, setEvent] = useState<TimelineEvent | null>(null)
  const [characters, setCharacters] = useState<Character[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [formData, setFormData] = useState<TimelineEventFormData>({
    title: '',
    description: '',
    event_date: '',
    event_type: 'other',
    session_id: null,
    location: '',
    is_major: false,
    character_ids: [],
  })

  useEffect(() => {
    if (user && campaignId && eventId) {
      loadData()
    }
  }, [user, campaignId, eventId])

  const loadData = async () => {
    // Only show loading spinner on initial load, not refetches
    if (!hasLoadedOnce) {
      setLoading(true)
    }

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

    // Set selected characters - use character_ids if available, fall back to character_id
    const charIds = eventData.character_ids || (eventData.character_id ? [eventData.character_id] : [])

    setFormData({
      title: eventData.title || '',
      description: eventData.description || '',
      event_date: eventData.event_date || '',
      event_type: eventData.event_type || 'other',
      session_id: eventData.session_id || null,
      location: eventData.location || '',
      is_major: eventData.is_major || false,
      character_ids: charIds,
    })

    // Load all characters for selection (both PCs and NPCs)
    const { data: charactersData } = await supabase
      .from('characters')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('type', { ascending: true })
      .order('name')

    setCharacters(charactersData || [])

    // Load sessions for linking
    const { data: sessionsData } = await supabase
      .from('sessions')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('session_number', { ascending: false })

    setSessions(sessionsData || [])

    setLoading(false)
    setHasLoadedOnce(true)
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
        session_id: formData.session_id || null,
        location: formData.location || null,
        is_major: formData.is_major,
        character_ids: formData.character_ids.length > 0 ? formData.character_ids : null,
        // Keep backward compatibility
        character_id: formData.character_ids.length > 0 ? formData.character_ids[0] : null,
      })
      .eq('id', event.id)
  }, [formData, event, supabase])

  const { status } = useAutoSave({
    data: formData,
    onSave: saveEvent,
    delay: 1500,
    showToast: true,
    toastMessage: 'Event saved',
  })

  // ============ MOBILE LAYOUT ============
  if (isMobile) {
    return (
      <CampaignTimelineEventPageMobile
        campaignId={campaignId}
        campaign={campaign}
        event={event}
        characters={characters}
        sessions={sessions}
        loading={loading}
        formData={formData}
        setFormData={setFormData}
        status={status}
      />
    )
  }

  // ============ DESKTOP LAYOUT ============
  if (loading || !event) {
    return (
      <AppLayout campaignId={campaignId}>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-10 h-10 animate-spin text-[--arcane-purple]" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout campaignId={campaignId}>
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push(`/campaigns/${campaignId}/timeline`)}
              className="btn btn-ghost -ml-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Timeline
            </button>
            <span className={cn(
              "text-sm transition-opacity",
              status === 'saving' ? 'text-[--text-tertiary]' : 'text-[--text-tertiary] opacity-60'
            )}>
              {status === 'saving' && 'Saving...'}
              {status === 'saved' && 'Saved'}
              {status === 'idle' && 'All changes saved'}
            </span>
          </div>
          {/* Campaign Context */}
          {campaign && (
            <p className="text-xs text-[--text-tertiary] mt-4">
              <span className="text-[--arcane-purple]">{campaign.name}</span>
              <span className="mx-2">/</span>
              <span>Timeline Event</span>
            </p>
          )}
        </div>

        {/* Editor */}
        <TimelineEventEditor
          formData={formData}
          onChange={setFormData}
          characters={characters}
          sessions={sessions}
          mode="full"
        />
      </div>
    </AppLayout>
  )
}

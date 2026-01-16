'use client'

import { useEffect, useState, useMemo } from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { useSupabase, useUser } from '@/hooks'
import { useAppStore } from '@/store'
import type { Campaign, Character, Session, TimelineEvent, CampaignLore, CanvasGroup } from '@/types/database'
import { AIAssistant } from '@/components/ai/ai-assistant'

interface DashboardLayoutProps {
  children: React.ReactNode
  campaignId?: string
}

export function DashboardLayout({ children, campaignId }: DashboardLayoutProps) {
  const supabase = useSupabase()
  const { user } = useUser()
  const { setUserId, setSettings, setCurrentCampaign, isAIAssistantOpen, aiEnabled } = useAppStore()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [characters, setCharacters] = useState<Character[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])
  const [lore, setLore] = useState<CampaignLore[]>([])
  const [canvasGroups, setCanvasGroups] = useState<CanvasGroup[]>([])

  useEffect(() => {
    if (user) {
      setUserId(user.id)
      loadUserData()
    }
  }, [user])

  useEffect(() => {
    if (campaignId && campaigns.length > 0) {
      const campaign = campaigns.find((c) => c.id === campaignId)
      if (campaign) {
        setCurrentCampaign(campaign)
      }
    }
  }, [campaignId, campaigns])

  // Load campaign-specific data for AI context when campaign changes
  useEffect(() => {
    if (campaignId && user) {
      loadCampaignContext()
    } else {
      setCharacters([])
      setSessions([])
      setTimelineEvents([])
      setLore([])
      setCanvasGroups([])
    }
  }, [campaignId, user])

  const loadUserData = async () => {
    if (!user) return

    // Load user settings
    const { data: settings } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (settings) {
      setSettings(settings)
      // Apply theme
      if (settings.theme === 'dark') {
        document.documentElement.classList.add('dark')
      } else if (settings.theme === 'light') {
        document.documentElement.classList.remove('dark')
      }
    }

    // Load campaigns
    const { data: campaignsData } = await supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (campaignsData) {
      setCampaigns(campaignsData)
    }
  }

  const loadCampaignContext = async () => {
    if (!campaignId) return

    // Load all data in parallel for efficiency
    const [
      { data: charactersData },
      { data: sessionsData },
      { data: timelineData },
      { data: loreData },
      { data: canvasData },
    ] = await Promise.all([
      // Full character data
      supabase
        .from('characters')
        .select('id, name, type, summary, notes, race, class, background, appearance, personality, goals, secrets, important_people, story_hooks, quotes, status')
        .eq('campaign_id', campaignId)
        .order('type')
        .order('name'),
      // Full session data (last 20)
      supabase
        .from('sessions')
        .select('id, session_number, title, summary, notes, date')
        .eq('campaign_id', campaignId)
        .order('date', { ascending: false })
        .limit(20),
      // Timeline events
      supabase
        .from('timeline_events')
        .select('id, title, description, event_type, event_date, is_major')
        .eq('campaign_id', campaignId)
        .order('event_date', { ascending: false })
        .limit(50),
      // Campaign lore
      supabase
        .from('campaign_lore')
        .select('id, lore_type, title, content')
        .eq('campaign_id', campaignId),
      // Canvas groups
      supabase
        .from('canvas_groups')
        .select('id, name, color, icon')
        .eq('campaign_id', campaignId),
    ])

    if (charactersData) setCharacters(charactersData as Character[])
    if (sessionsData) setSessions(sessionsData as Session[])
    if (timelineData) setTimelineEvents(timelineData as TimelineEvent[])
    if (loreData) setLore(loreData as CampaignLore[])
    if (canvasData) setCanvasGroups(canvasData as CanvasGroup[])
  }

  // Build campaign context for AI assistant
  const campaignContext = useMemo(() => {
    const currentCampaign = campaigns.find(c => c.id === campaignId)
    if (!currentCampaign) return undefined

    return {
      campaignName: currentCampaign.name,
      gameSystem: currentCampaign.game_system || 'D&D 5e',
      // Full character details
      characters: characters.map(c => ({
        name: c.name,
        type: c.type as string,
        status: c.status || undefined,
        summary: c.summary || undefined,
        race: c.race || undefined,
        class: c.class || undefined,
        background: c.background || undefined,
        appearance: c.appearance || undefined,
        personality: c.personality || undefined,
        goals: c.goals || undefined,
        secrets: c.secrets || undefined,
        notes: c.notes || undefined,
        importantPeople: c.important_people || undefined,
        storyHooks: c.story_hooks || undefined,
        quotes: c.quotes || undefined,
      })),
      // Full session data
      sessions: sessions.map(s => ({
        sessionNumber: s.session_number,
        title: s.title || `Session ${s.session_number}`,
        date: s.date,
        summary: s.summary || undefined,
        notes: s.notes || undefined,
      })),
      // Timeline events
      timelineEvents: timelineEvents.map(e => ({
        title: e.title,
        description: e.description || undefined,
        eventType: e.event_type,
        date: e.event_date || undefined,
        isMajor: e.is_major,
      })),
      // Campaign lore
      lore: lore.map(l => ({
        type: l.lore_type,
        title: l.title,
        content: l.content,
      })),
      // Canvas groups (areas of the campaign)
      canvasGroups: canvasGroups.map(g => ({
        name: g.name,
        icon: g.icon || undefined,
      })),
    }
  }, [campaignId, campaigns, characters, sessions, timelineEvents, lore, canvasGroups])

  return (
    <div className="flex h-screen overflow-hidden bg-[--bg-base]">
      <Sidebar campaignId={campaignId} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header campaigns={campaigns} currentCampaignId={campaignId} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* AI Assistant Panel - with campaign context, only when AI is enabled */}
      {isAIAssistantOpen && aiEnabled && <AIAssistant campaignContext={campaignContext} />}
    </div>
  )
}

'use client'

import { useEffect, useState, useMemo } from 'react'
import { FloatingDock } from './floating-dock'
import { TopBar } from './top-bar'
import { useSupabase, useUser } from '@/hooks'
import { useAppStore } from '@/store'
import type { Campaign, Character, Session } from '@/types/database'
import { AIAssistant } from '@/components/ai/ai-assistant'

interface AppLayoutProps {
  children: React.ReactNode
  campaignId?: string
  characterId?: string
  fullBleed?: boolean
  transparentTopBar?: boolean
  topBarActions?: React.ReactNode
}

export function AppLayout({
  children,
  campaignId,
  characterId,
  fullBleed = false,
  transparentTopBar = false,
  topBarActions,
}: AppLayoutProps) {
  const supabase = useSupabase()
  const { user } = useUser()
  const { setUserId, setSettings, setCurrentCampaign, isAIAssistantOpen, aiEnabled } = useAppStore()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [characters, setCharacters] = useState<Character[]>([])
  const [sessions, setSessions] = useState<Session[]>([])

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

    // Load characters for this campaign
    const { data: charactersData } = await supabase
      .from('characters')
      .select('id, name, type, summary')
      .eq('campaign_id', campaignId)
      .order('type')
      .order('name')

    if (charactersData) {
      setCharacters(charactersData as Character[])
    }

    // Load recent sessions (last 10)
    const { data: sessionsData } = await supabase
      .from('sessions')
      .select('id, title, summary, date')
      .eq('campaign_id', campaignId)
      .order('date', { ascending: false })
      .limit(10)

    if (sessionsData) {
      setSessions(sessionsData as Session[])
    }
  }

  // Build campaign context for AI assistant
  const campaignContext = useMemo(() => {
    const currentCampaign = campaigns.find(c => c.id === campaignId)
    if (!currentCampaign) return undefined

    return {
      campaignName: currentCampaign.name,
      gameSystem: currentCampaign.game_system || 'D&D 5e',
      characters: characters.map(c => ({
        name: c.name,
        type: c.type as string,
        summary: c.summary || undefined,
      })),
      recentSessions: sessions
        .filter(s => s.title) // Only include sessions with titles
        .map(s => ({
          title: s.title as string,
          summary: s.summary || undefined,
        })),
    }
  }, [campaignId, campaigns, characters, sessions])

  return (
    <>
      <FloatingDock campaignId={campaignId} characterId={characterId} />
      <TopBar
        campaigns={campaigns}
        currentCampaignId={campaignId}
        transparent={transparentTopBar}
        actions={topBarActions}
      />

      <main className={`main-content ${fullBleed ? 'full-bleed' : ''}`}>
        {children}
      </main>

      {/* AI Assistant Panel - with campaign context, only when AI is enabled */}
      {isAIAssistantOpen && aiEnabled && <AIAssistant campaignContext={campaignContext} />}
    </>
  )
}

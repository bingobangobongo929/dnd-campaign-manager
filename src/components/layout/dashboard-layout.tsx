'use client'

import { useEffect, useState, useMemo } from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { useSupabase, useUser } from '@/hooks'
import { useAppStore } from '@/store'
import type { Campaign, Character, Session } from '@/types/database'
import { AIAssistant } from '@/components/ai/ai-assistant'

interface DashboardLayoutProps {
  children: React.ReactNode
  campaignId?: string
}

export function DashboardLayout({ children, campaignId }: DashboardLayoutProps) {
  const supabase = useSupabase()
  const { user } = useUser()
  const { setUserId, setSettings, setCurrentCampaign, isAIAssistantOpen } = useAppStore()
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
    <div className="flex h-screen overflow-hidden bg-[--bg-base]">
      <Sidebar campaignId={campaignId} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header campaigns={campaigns} currentCampaignId={campaignId} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* AI Assistant Panel - with campaign context */}
      {isAIAssistantOpen && <AIAssistant campaignContext={campaignContext} />}
    </div>
  )
}

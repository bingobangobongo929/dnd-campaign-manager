'use client'

import { useEffect, useState } from 'react'
import { FloatingDock } from './floating-dock'
import { TopBar } from './top-bar'
import { useSupabase, useUser } from '@/hooks'
import { useAppStore } from '@/store'
import type { Campaign } from '@/types/database'
import { AIAssistant } from '@/components/ai/ai-assistant'

interface AppLayoutProps {
  children: React.ReactNode
  campaignId?: string
  fullBleed?: boolean
  transparentTopBar?: boolean
  topBarActions?: React.ReactNode
}

export function AppLayout({
  children,
  campaignId,
  fullBleed = false,
  transparentTopBar = false,
  topBarActions,
}: AppLayoutProps) {
  const supabase = useSupabase()
  const { user } = useUser()
  const { setUserId, setSettings, setCurrentCampaign, isAIAssistantOpen } = useAppStore()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])

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

  return (
    <>
      <FloatingDock campaignId={campaignId} />
      <TopBar
        campaigns={campaigns}
        currentCampaignId={campaignId}
        transparent={transparentTopBar}
        actions={topBarActions}
      />

      <main className={`main-content ${fullBleed ? 'full-bleed' : ''}`}>
        {children}
      </main>

      {/* AI Assistant Panel */}
      {isAIAssistantOpen && <AIAssistant />}
    </>
  )
}

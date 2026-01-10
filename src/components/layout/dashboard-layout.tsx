'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { useSupabase, useUser } from '@/hooks'
import { useAppStore } from '@/store'
import type { Campaign } from '@/types/database'
import { AIAssistant } from '@/components/ai/ai-assistant'

interface DashboardLayoutProps {
  children: React.ReactNode
  campaignId?: string
}

export function DashboardLayout({ children, campaignId }: DashboardLayoutProps) {
  const supabase = useSupabase()
  const { user } = useUser()
  const { setUserId, setSettings, setCurrentCampaign, isAIAssistantOpen, setIsAIAssistantOpen } = useAppStore()
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

  return (
    <div className="flex h-screen overflow-hidden bg-[--bg-base]">
      <Sidebar campaignId={campaignId} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header campaigns={campaigns} currentCampaignId={campaignId} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* AI Assistant Panel */}
      {isAIAssistantOpen && campaignId && (
        <AIAssistant
          campaignId={campaignId}
          onClose={() => setIsAIAssistantOpen(false)}
        />
      )}
    </div>
  )
}

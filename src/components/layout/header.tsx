'use client'

import { useRouter } from 'next/navigation'
import { LogOut, Moon, Sun, ChevronDown } from 'lucide-react'
import { Button, Dropdown, Avatar } from '@/components/ui'
import { useSupabase, useUser } from '@/hooks'
import { useAppStore } from '@/store'
import { useState, useEffect } from 'react'
import type { Campaign } from '@/types/database'

interface HeaderProps {
  campaigns?: Campaign[]
  currentCampaignId?: string
}

export function Header({ campaigns = [], currentCampaignId }: HeaderProps) {
  const router = useRouter()
  const supabase = useSupabase()
  const { user } = useUser()
  const { currentCampaign, settings, setSettings } = useAppStore()
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark')
    setIsDark(isDarkMode)
  }, [])

  const toggleTheme = async () => {
    const newTheme = isDark ? 'light' : 'dark'
    document.documentElement.classList.toggle('dark')
    setIsDark(!isDark)

    if (user) {
      await supabase
        .from('user_settings')
        .update({ theme: newTheme })
        .eq('user_id', user.id)

      if (settings) {
        setSettings({ ...settings, theme: newTheme as 'dark' | 'light' | 'system' })
      }
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleCampaignChange = (campaignId: string) => {
    router.push(`/campaigns/${campaignId}/canvas`)
  }

  const campaignOptions = campaigns.map((c) => ({
    value: c.id,
    label: c.name,
  }))

  return (
    <header className="flex items-center justify-between h-14 px-4 bg-[--bg-surface] border-b border-[--border]">
      {/* Campaign switcher */}
      <div className="flex items-center gap-4">
        {campaigns.length > 0 && currentCampaignId && (
          <Dropdown
            options={campaignOptions}
            value={currentCampaignId}
            onChange={handleCampaignChange}
            className="w-48"
          />
        )}
        {currentCampaign && (
          <span className="text-sm text-[--text-secondary]">
            {currentCampaign.game_system}
          </span>
        )}
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        <div className="flex items-center gap-2 pl-2 border-l border-[--border]">
          <Avatar name={user?.email || 'User'} size="sm" />
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}

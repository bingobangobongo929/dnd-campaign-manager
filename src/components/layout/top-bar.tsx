'use client'

import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronDown, Sparkles, LogOut, ChevronRight } from 'lucide-react'
import { useSupabase, useUser } from '@/hooks'
import { useAppStore } from '@/store'
import { useState, useRef, useEffect } from 'react'
import type { Campaign } from '@/types/database'

interface TopBarProps {
  campaigns?: Campaign[]
  currentCampaignId?: string
  transparent?: boolean
  actions?: React.ReactNode
}

export function TopBar({ campaigns = [], currentCampaignId, transparent = false, actions }: TopBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = useSupabase()
  const { user } = useUser()
  const { currentCampaign, setIsAIAssistantOpen, aiEnabled } = useAppStore()
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleCampaignChange = (campaignId: string) => {
    setShowDropdown(false)
    router.push(`/campaigns/${campaignId}/canvas`)
  }

  // Build breadcrumb from pathname
  const getBreadcrumbs = () => {
    const parts = pathname.split('/').filter(Boolean)
    const breadcrumbs: { label: string; href?: string }[] = []

    if (parts[0] === 'campaigns') {
      breadcrumbs.push({ label: 'Campaigns', href: '/campaigns' })

      if (parts[1] && currentCampaign) {
        breadcrumbs.push({
          label: currentCampaign.name,
          href: `/campaigns/${parts[1]}/canvas`
        })

        if (parts[2]) {
          const pageLabels: Record<string, string> = {
            canvas: 'Canvas',
            sessions: 'Sessions',
            timeline: 'Timeline',
            map: 'World Map',
            gallery: 'Gallery',
          }
          breadcrumbs.push({ label: pageLabels[parts[2]] || parts[2] })
        }
      }
    } else if (parts[0] === 'vault') {
      breadcrumbs.push({ label: 'Character Vault' })
    } else if (parts[0] === 'settings') {
      breadcrumbs.push({ label: 'Settings' })
    }

    return breadcrumbs
  }

  const breadcrumbs = getBreadcrumbs()

  return (
    <header className={`topbar ${transparent ? 'transparent' : ''}`}>
      {/* Left: Breadcrumbs */}
      <div className="topbar-left">
        <nav className="breadcrumb">
          {breadcrumbs.map((crumb, index) => (
            <span key={index} className="flex items-center gap-2">
              {index > 0 && (
                <ChevronRight className="breadcrumb-separator w-4 h-4" />
              )}
              {crumb.href && index < breadcrumbs.length - 1 ? (
                <Link href={crumb.href} className="breadcrumb-item">
                  {crumb.label}
                </Link>
              ) : (
                <span className="breadcrumb-item current">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      </div>

      {/* Center: Campaign Switcher (only when in a campaign) */}
      {currentCampaignId && campaigns.length > 1 && (
        <div className="topbar-center" ref={dropdownRef}>
          <button
            className="campaign-switcher"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <span className="campaign-switcher-name">
              {currentCampaign?.name || 'Select Campaign'}
            </span>
            <ChevronDown className="campaign-switcher-icon" />
          </button>

          {showDropdown && (
            <div
              className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-64 bg-[--bg-surface] border border-[--border] rounded-xl shadow-xl overflow-hidden animate-scale-in z-50"
            >
              {campaigns.map((campaign) => (
                <button
                  key={campaign.id}
                  onClick={() => handleCampaignChange(campaign.id)}
                  className={`w-full px-4 py-3 text-left transition-colors hover:bg-[--bg-hover] ${
                    campaign.id === currentCampaignId
                      ? 'bg-[--arcane-purple]/10 text-[--arcane-purple]'
                      : 'text-[--text-primary]'
                  }`}
                >
                  <div className="font-medium text-sm">{campaign.name}</div>
                  <div className="text-xs text-[--text-tertiary] mt-0.5">
                    {campaign.game_system}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Right: Page Actions + AI Assistant + User */}
      <div className="topbar-right">
        {/* Page-specific actions */}
        {actions && (
          <div className="flex items-center gap-2 mr-2">
            {actions}
          </div>
        )}

        {currentCampaignId && aiEnabled && (
          <button
            className="ai-trigger"
            onClick={() => setIsAIAssistantOpen(true)}
          >
            <Sparkles className="ai-trigger-icon" />
            <span>AI Assistant</span>
          </button>
        )}

        <div className="flex items-center gap-3">
          <div className="avatar avatar-sm">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <button className="btn-ghost btn-icon" onClick={handleLogout}>
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  )
}

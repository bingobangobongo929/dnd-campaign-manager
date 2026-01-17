'use client'

import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronDown, Sparkles, LogOut, ChevronRight, Swords, BookOpen, Settings, LayoutGrid, ScrollText, Clock, Brain, Network, Map, Image, Edit3, Eye, Users, Scroll } from 'lucide-react'
import { useSupabase, useUser } from '@/hooks'
import { useAppStore } from '@/store'
import { useState, useRef, useEffect } from 'react'
import type { Campaign } from '@/types/database'
import { RecentItems } from './recent-items'
import { NavigationMapButton } from './navigation-map'

import { Home } from 'lucide-react'

// Page icons for "You are here" indicator
const PAGE_ICONS: Record<string, any> = {
  home: Home,
  campaigns: Swords,
  vault: BookOpen,
  settings: Settings,
  canvas: LayoutGrid,
  sessions: ScrollText,
  timeline: Clock,
  intelligence: Brain,
  lore: Network,
  map: Map,
  gallery: Image,
  edit: Edit3,
  view: Eye,
  relationships: Users,
  oneshots: Scroll,
}

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
    // Preserve current sub-page when switching campaigns
    const parts = pathname.split('/').filter(Boolean)
    const currentSubPage = parts[2] || 'canvas' // e.g., 'intelligence', 'sessions', 'timeline'
    router.push(`/campaigns/${campaignId}/${currentSubPage}`)
  }

  // Build breadcrumb from pathname
  const getBreadcrumbs = () => {
    const parts = pathname.split('/').filter(Boolean)
    const breadcrumbs: { label: string; href?: string; icon?: string }[] = []

    if (parts[0] === 'home') {
      breadcrumbs.push({ label: 'Home', icon: 'home' })
    } else if (parts[0] === 'campaigns') {
      breadcrumbs.push({ label: 'Campaigns', href: '/campaigns', icon: 'campaigns' })

      if (parts[1] && parts[1] !== 'new' && currentCampaign) {
        breadcrumbs.push({
          label: currentCampaign.name,
          href: `/campaigns/${parts[1]}/canvas`
        })

        if (parts[2]) {
          const pageLabels: Record<string, string> = {
            canvas: 'Canvas',
            sessions: 'Sessions',
            timeline: 'Timeline',
            intelligence: 'Intelligence',
            lore: 'Lore',
            map: 'World Map',
            gallery: 'Gallery',
          }
          // Check if there's a session ID (parts[3])
          if (parts[2] === 'sessions' && parts[3]) {
            breadcrumbs.push({
              label: 'Sessions',
              href: `/campaigns/${parts[1]}/sessions`,
              icon: 'sessions'
            })
            breadcrumbs.push({ label: `Session Details`, icon: 'sessions' })
          } else if (parts[2] === 'timeline' && parts[3]) {
            breadcrumbs.push({
              label: 'Timeline',
              href: `/campaigns/${parts[1]}/timeline`,
              icon: 'timeline'
            })
            breadcrumbs.push({ label: 'Event Details', icon: 'timeline' })
          } else {
            breadcrumbs.push({ label: pageLabels[parts[2]] || parts[2], icon: parts[2] })
          }
        }
      } else if (parts[1] === 'new') {
        breadcrumbs.push({ label: 'New Campaign' })
      }
    } else if (parts[0] === 'vault') {
      breadcrumbs.push({ label: 'Character Vault', href: '/vault', icon: 'vault' })

      if (parts[1] && parts[1] !== 'new' && parts[1] !== 'import') {
        // Character detail page
        if (parts[2]) {
          const pageLabels: Record<string, string> = {
            view: 'View',
            intelligence: 'Intelligence',
            relationships: 'Relationships',
            sessions: 'Sessions',
            gallery: 'Gallery',
          }
          if (parts[2] === 'sessions' && parts[3]) {
            breadcrumbs.push({ label: 'Sessions', href: `/vault/${parts[1]}/sessions`, icon: 'sessions' })
            breadcrumbs.push({ label: 'Session Details', icon: 'sessions' })
          } else {
            breadcrumbs.push({ label: pageLabels[parts[2]] || 'Edit', icon: parts[2] || 'edit' })
          }
        } else {
          breadcrumbs.push({ label: 'Edit Character', icon: 'edit' })
        }
      } else if (parts[1] === 'new') {
        breadcrumbs.push({ label: 'New Character' })
      } else if (parts[1] === 'import') {
        breadcrumbs.push({ label: 'Import Character' })
      }
    } else if (parts[0] === 'settings') {
      breadcrumbs.push({ label: 'Settings', href: '/settings', icon: 'settings' })

      if (parts[1]) {
        const settingsLabels: Record<string, string> = {
          import: 'Import',
          shares: 'Share Analytics',
        }
        breadcrumbs.push({ label: settingsLabels[parts[1]] || parts[1] })
      }
    } else if (parts[0] === 'oneshots') {
      breadcrumbs.push({ label: 'One-Shots', href: '/campaigns', icon: 'oneshots' })
      if (parts[1] && parts[1] !== 'new') {
        breadcrumbs.push({ label: 'Edit One-Shot', icon: 'edit' })
      }
    }

    return breadcrumbs
  }

  const breadcrumbs = getBreadcrumbs()

  return (
    <header className={`topbar ${transparent ? 'transparent' : ''}`}>
      {/* Left: Breadcrumbs with "You are here" indicator */}
      <div className="topbar-left">
        <nav className="breadcrumb">
          {breadcrumbs.map((crumb, index) => {
            const Icon = crumb.icon ? PAGE_ICONS[crumb.icon] : null
            const isLast = index === breadcrumbs.length - 1
            return (
              <span key={index} className="flex items-center gap-2">
                {index > 0 && (
                  <ChevronRight className="breadcrumb-separator w-4 h-4" />
                )}
                {crumb.href && !isLast ? (
                  <Link href={crumb.href} className="breadcrumb-item flex items-center gap-1.5">
                    {index === 0 && Icon && <Icon className="w-4 h-4" />}
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="breadcrumb-item current flex items-center gap-1.5">
                    {isLast && Icon && <Icon className="w-4 h-4 text-purple-400" />}
                    {crumb.label}
                  </span>
                )}
              </span>
            )
          })}
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

      {/* Right: Page Actions + Recent + AI Assistant + User */}
      <div className="topbar-right">
        {/* Page-specific actions */}
        {actions && (
          <div className="flex items-center gap-2 mr-2">
            {actions}
          </div>
        )}

        {/* Navigation & Recent Items */}
        <NavigationMapButton />
        <RecentItems />

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

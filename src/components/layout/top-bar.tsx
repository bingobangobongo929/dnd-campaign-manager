'use client'

import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronDown, Sparkles, LogOut, ChevronRight, Swords, BookOpen, Settings, LayoutGrid, ScrollText, Clock, Brain, Network, Map, Image as ImageIcon, Edit3, Eye, Users, Scroll, LayoutDashboard, MapPin, Target, Compass, PanelTop, Share2, Home, User } from 'lucide-react'
import { useSupabase, useUser } from '@/hooks'
import { useAppStore, useCanUseAI } from '@/store'
import type { UserSettings } from '@/types/database'
import { useState, useRef, useEffect } from 'react'
import type { Campaign } from '@/types/database'
import { RecentItems } from './recent-items'
import { NavigationMapButton } from './navigation-map'
import { UnifiedShareModal } from '@/components/share/UnifiedShareModal'

// Page icons for "You are here" indicator
const PAGE_ICONS: Record<string, any> = {
  home: Home,
  campaigns: Swords,
  vault: BookOpen,
  settings: Settings,
  canvas: PanelTop,
  sessions: ScrollText,
  timeline: Clock,
  intelligence: Brain,
  lore: Network,
  map: Map,
  gallery: ImageIcon,
  edit: Edit3,
  view: Eye,
  relationships: Users,
  oneshots: Scroll,
  // Added for completeness
  dashboard: LayoutDashboard,
  locations: MapPin,
  quests: Target,
  encounters: Swords,
  adventures: Compass,
  presentation: BookOpen,
}

interface TopBarProps {
  campaigns?: Campaign[]
  currentCampaignId?: string
  characters?: { id: string; name: string; image_url?: string | null; race?: string | null; class?: string | null }[]
  currentCharacterId?: string
  transparent?: boolean
  actions?: React.ReactNode
  userSettings?: UserSettings | null
}

export function TopBar({
  campaigns = [],
  currentCampaignId,
  characters = [],
  currentCharacterId,
  transparent = false,
  actions,
  userSettings
}: TopBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = useSupabase()
  const { user } = useUser()
  const { currentCampaign, setIsAIAssistantOpen } = useAppStore()
  const canUseAI = useCanUseAI()
  const [showCampaignDropdown, setShowCampaignDropdown] = useState(false)
  const [showCharacterDropdown, setShowCharacterDropdown] = useState(false)
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const campaignDropdownRef = useRef<HTMLDivElement>(null)
  const characterDropdownRef = useRef<HTMLDivElement>(null)
  const userDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (campaignDropdownRef.current && !campaignDropdownRef.current.contains(event.target as Node)) {
        setShowCampaignDropdown(false)
      }
      if (characterDropdownRef.current && !characterDropdownRef.current.contains(event.target as Node)) {
        setShowCharacterDropdown(false)
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleCampaignChange = (campaignId: string) => {
    setShowCampaignDropdown(false)
    // Preserve current sub-page when switching campaigns
    const parts = pathname.split('/').filter(Boolean)
    const currentSubPage = parts[2] || 'canvas' // e.g., 'intelligence', 'sessions', 'timeline'
    router.push(`/campaigns/${campaignId}/${currentSubPage}`)
  }

  const handleCharacterChange = (charId: string) => {
    setShowCharacterDropdown(false)
    // Preserve current sub-page when switching characters
    const parts = pathname.split('/').filter(Boolean)
    const currentSubPage = parts[2] || '' // e.g., 'view', 'sessions', 'intelligence'
    if (currentSubPage) {
      router.push(`/vault/${charId}/${currentSubPage}`)
    } else {
      router.push(`/vault/${charId}`)
    }
  }

  // Get current character info for switcher
  const currentCharacter = characters.find(c => c.id === currentCharacterId)

  // Determine share context from pathname
  const getShareContext = (): { type: 'campaign' | 'character' | 'oneshot' | null; id: string | null; name: string } => {
    const parts = pathname.split('/').filter(Boolean)

    // Campaign context
    if (parts[0] === 'campaigns' && parts[1] && parts[1] !== 'new') {
      return {
        type: 'campaign',
        id: parts[1],
        name: currentCampaign?.name || 'Campaign'
      }
    }

    // Character (vault) context
    if (parts[0] === 'vault' && parts[1] && parts[1] !== 'new' && parts[1] !== 'import') {
      return {
        type: 'character',
        id: parts[1],
        name: currentCharacter?.name || 'Character'
      }
    }

    // Oneshot context
    if (parts[0] === 'oneshots' && parts[1] && parts[1] !== 'new') {
      return { type: 'oneshot', id: parts[1], name: 'One-Shot' }
    }

    // Adventure context (treated same as campaign for sharing)
    if (parts[0] === 'adventures' && parts[1] && parts[1] !== 'new') {
      return { type: 'campaign', id: parts[1], name: 'Adventure' }
    }

    return { type: null, id: null, name: '' }
  }

  const shareContext = getShareContext()

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
            dashboard: 'Dashboard',
            canvas: 'Canvas',
            view: 'View',
            sessions: 'Session Notes',
            timeline: 'Timeline',
            intelligence: 'Intelligence',
            lore: 'Lore',
            map: 'World Map',
            gallery: 'Gallery',
            locations: 'Locations',
            quests: 'Quests',
            encounters: 'Encounters',
            settings: 'Settings',
          }
          // Check if there's a session ID (parts[3])
          if (parts[2] === 'sessions' && parts[3]) {
            breadcrumbs.push({
              label: 'Session Notes',
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
      breadcrumbs.push({ label: 'Characters', href: '/vault', icon: 'vault' })

      if (parts[1] && parts[1] !== 'new' && parts[1] !== 'import') {
        // Character detail page
        if (parts[2]) {
          const pageLabels: Record<string, string> = {
            view: 'View',
            presentation: 'View 2',
            intelligence: 'Intelligence',
            relationships: 'Relationships',
            sessions: 'Session Notes',
            gallery: 'Gallery',
          }
          if (parts[2] === 'sessions' && parts[3]) {
            breadcrumbs.push({ label: 'Session Notes', href: `/vault/${parts[1]}/sessions`, icon: 'sessions' })
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
          activity: 'Activity Log',
          images: 'Image Enhancement',
          security: 'Security',
        }
        breadcrumbs.push({ label: settingsLabels[parts[1]] || parts[1] })
      }
    } else if (parts[0] === 'oneshots') {
      breadcrumbs.push({ label: 'One-Shots', href: '/oneshots', icon: 'oneshots' })
      if (parts[1] && parts[1] !== 'new') {
        breadcrumbs.push({ label: 'Edit One-Shot', icon: 'edit' })
      }
    } else if (parts[0] === 'adventures') {
      breadcrumbs.push({ label: 'Adventures', href: '/adventures', icon: 'adventures' })
      if (parts[1] && parts[1] !== 'new') {
        breadcrumbs.push({ label: 'Edit Adventure', icon: 'edit' })
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

      {/* Center: Campaign or Character Switcher */}
      <div className="topbar-center">
        {/* Campaign Switcher (only when in a campaign with multiple campaigns) */}
        {currentCampaignId && campaigns.length > 1 && (
          <div className="relative" ref={campaignDropdownRef}>
            <button
              className="campaign-switcher"
              onClick={() => setShowCampaignDropdown(!showCampaignDropdown)}
            >
              <span className="campaign-switcher-name">
                {currentCampaign?.name || 'Select Campaign'}
              </span>
              <ChevronDown className={`campaign-switcher-icon transition-transform ${showCampaignDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showCampaignDropdown && (
              <div
                className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-72 bg-[#12121a] border border-[--border] rounded-xl shadow-2xl overflow-hidden animate-scale-in z-50"
              >
                <div className="p-2 border-b border-[--border]">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[--text-tertiary] px-2">Switch Campaign</span>
                </div>
                <div className="max-h-80 overflow-y-auto p-1">
                  {campaigns.map((campaign) => (
                    <button
                      key={campaign.id}
                      onClick={() => handleCampaignChange(campaign.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-[--bg-hover] ${
                        campaign.id === currentCampaignId
                          ? 'bg-[--arcane-purple]/10 ring-1 ring-[--arcane-purple]/30'
                          : ''
                      }`}
                    >
                      {/* Campaign Image */}
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-[--bg-secondary] flex-shrink-0">
                        {campaign.image_url ? (
                          <Image
                            src={campaign.image_url}
                            alt={campaign.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Swords className="w-5 h-5 text-[--text-tertiary]" />
                          </div>
                        )}
                      </div>
                      {/* Campaign Info */}
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium text-sm truncate ${
                          campaign.id === currentCampaignId ? 'text-[--arcane-purple]' : 'text-[--text-primary]'
                        }`}>
                          {campaign.name}
                        </div>
                        <div className="text-xs text-[--text-tertiary] truncate">
                          {campaign.game_system}
                        </div>
                      </div>
                      {/* Current indicator */}
                      {campaign.id === currentCampaignId && (
                        <div className="w-2 h-2 rounded-full bg-[--arcane-purple]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Character Switcher (only when in vault with multiple characters) */}
        {currentCharacterId && characters.length > 1 && (
          <div className="relative" ref={characterDropdownRef}>
            <button
              className="campaign-switcher"
              onClick={() => setShowCharacterDropdown(!showCharacterDropdown)}
            >
              <span className="campaign-switcher-name">
                {currentCharacter?.name || 'Select Character'}
              </span>
              <ChevronDown className={`campaign-switcher-icon transition-transform ${showCharacterDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showCharacterDropdown && (
              <div
                className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-72 bg-[#12121a] border border-[--border] rounded-xl shadow-2xl overflow-hidden animate-scale-in z-50"
              >
                <div className="p-2 border-b border-[--border]">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[--text-tertiary] px-2">Switch Character</span>
                </div>
                <div className="max-h-80 overflow-y-auto p-1">
                  {characters.map((character) => (
                    <button
                      key={character.id}
                      onClick={() => handleCharacterChange(character.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-[--bg-hover] ${
                        character.id === currentCharacterId
                          ? 'bg-[--arcane-purple]/10 ring-1 ring-[--arcane-purple]/30'
                          : ''
                      }`}
                    >
                      {/* Character Image */}
                      <div className="relative w-10 h-10 rounded-full overflow-hidden bg-[--bg-secondary] flex-shrink-0">
                        {character.image_url ? (
                          <Image
                            src={character.image_url}
                            alt={character.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-[--text-tertiary]" />
                          </div>
                        )}
                      </div>
                      {/* Character Info */}
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium text-sm truncate ${
                          character.id === currentCharacterId ? 'text-[--arcane-purple]' : 'text-[--text-primary]'
                        }`}>
                          {character.name}
                        </div>
                        <div className="text-xs text-[--text-tertiary] truncate">
                          {[character.race, character.class].filter(Boolean).join(' • ') || 'Character'}
                        </div>
                      </div>
                      {/* Current indicator */}
                      {character.id === currentCharacterId && (
                        <div className="w-2 h-2 rounded-full bg-[--arcane-purple]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Page Actions + Recent + AI Assistant + User */}
      <div className="topbar-right">
        {/* Page-specific actions */}
        {actions && (
          <div className="flex items-center gap-2 mr-2">
            {actions}
          </div>
        )}

        {/* Share Button - context aware */}
        {shareContext.type && shareContext.id && (
          <button
            className="topbar-action-btn"
            onClick={() => setShowShareModal(true)}
            title="Share"
          >
            <Share2 className="w-4 h-4" />
            <span className="topbar-action-label">Share</span>
          </button>
        )}

        {/* Navigation & Recent Items (icon-only) */}
        <NavigationMapButton />
        <RecentItems />

        {/* AI Assistant (icon-only) */}
        {currentCampaignId && canUseAI && (
          <button
            className="topbar-action-btn ai"
            onClick={() => setIsAIAssistantOpen(true)}
            title="AI Assistant"
          >
            <Sparkles className="w-4 h-4" />
          </button>
        )}

        {/* User Avatar Dropdown */}
        <div className="relative" ref={userDropdownRef}>
          <button
            className="user-avatar-btn"
            onClick={() => setShowUserDropdown(!showUserDropdown)}
          >
            {userSettings?.avatar_url ? (
              <Image
                src={userSettings.avatar_url}
                alt="Profile"
                fill
                className="object-cover"
              />
            ) : (
              <span className="text-sm font-medium text-[--text-primary]">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            )}
          </button>

          {showUserDropdown && (
            <div className="user-dropdown">
              <div className="user-dropdown-header">
                <span className="user-dropdown-email">{user?.email}</span>
              </div>
              <div className="user-dropdown-divider" />
              <Link
                href="/home"
                className="user-dropdown-item"
                onClick={() => setShowUserDropdown(false)}
              >
                <User className="w-4 h-4" />
                Profile
              </Link>
              <Link
                href="/settings"
                className="user-dropdown-item"
                onClick={() => setShowUserDropdown(false)}
              >
                <Settings className="w-4 h-4" />
                Settings
              </Link>
              <div className="user-dropdown-divider" />
              <button
                className="user-dropdown-item text-red-400 hover:text-red-300"
                onClick={() => {
                  setShowUserDropdown(false)
                  handleLogout()
                }}
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Share Modal */}
      {shareContext.type && shareContext.id && (
        <UnifiedShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          contentType={shareContext.type}
          contentId={shareContext.id}
          contentName={shareContext.name}
          contentMode="active"
        />
      )}
    </header>
  )
}

'use client'

import { usePathname, useRouter } from 'next/navigation'
import {
  Home,
  BookOpen,
  Swords,
  Scroll,
  Settings,
  LayoutGrid,
  ScrollText,
  Clock,
  Network,
  Map,
  Image,
  Edit3,
  Eye,
  Users,
  ChevronLeft,
  MoreHorizontal,
  Brain,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCanUseAI } from '@/store'
import { useState } from 'react'
import { MobileBottomSheet } from './mobile-layout'
import { hapticLight, hapticSelection } from '@/lib/haptics'

interface MobileTabBarProps {
  campaignId?: string
  characterId?: string
}

export function MobileTabBar({ campaignId, characterId }: MobileTabBarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const canUseAI = useCanUseAI()
  const [moreSheetOpen, setMoreSheetOpen] = useState(false)

  // Detect context from pathname if not provided via props
  const detectedCampaignId = campaignId || extractCampaignId(pathname)
  const detectedCharacterId = characterId || extractCharacterId(pathname)

  // Determine which context we're in
  const isInCampaign = !!detectedCampaignId && pathname.startsWith('/campaigns/')
  const isInCharacter = !!detectedCharacterId && pathname.startsWith('/vault/')
  const isTopLevel = !isInCampaign && !isInCharacter

  // Build tabs based on context
  const tabs = isInCharacter
    ? getCharacterTabs(detectedCharacterId!, canUseAI)
    : isInCampaign
    ? getCampaignTabs(detectedCampaignId!, canUseAI)
    : getGlobalTabs()

  // For campaign/character context, we show a back button + 4 main tabs + more
  const showBackButton = isInCampaign || isInCharacter
  const mainTabs = showBackButton ? tabs.slice(0, 4) : tabs.slice(0, 5)
  const moreTabs = showBackButton ? tabs.slice(4) : []

  const handleBack = () => {
    hapticLight()
    if (isInCharacter) {
      router.push('/vault')
    } else if (isInCampaign) {
      router.push('/campaigns')
    }
  }

  const handleTabPress = (href: string) => {
    hapticSelection()
    router.push(href)
  }

  const isActive = (href: string) => {
    if (href === '/oneshots') {
      return pathname === '/oneshots' || pathname.startsWith('/oneshots/')
    }
    if (href === '/campaigns' && !isInCampaign) {
      return pathname === '/campaigns'
    }
    if (href === '/vault' && !isInCharacter) {
      return pathname === '/vault'
    }
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <>
      <nav className="mobile-tab-bar">
        {/* Back button for nested contexts */}
        {showBackButton && (
          <button
            onClick={handleBack}
            className="mobile-tab-item"
            aria-label="Back"
          >
            <ChevronLeft className="w-6 h-6" />
            <span className="text-[10px]">Back</span>
          </button>
        )}

        {/* Main tabs */}
        {mainTabs.map((tab) => (
          <button
            key={tab.href}
            onClick={() => handleTabPress(tab.href)}
            className={cn(
              'mobile-tab-item',
              isActive(tab.href) && 'mobile-tab-item-active'
            )}
          >
            <tab.icon className="w-6 h-6" />
            <span className="text-[10px]">{tab.label}</span>
          </button>
        ))}

        {/* More button for overflow tabs */}
        {moreTabs.length > 0 && (
          <button
            onClick={() => { hapticLight(); setMoreSheetOpen(true) }}
            className="mobile-tab-item"
          >
            <MoreHorizontal className="w-6 h-6" />
            <span className="text-[10px]">More</span>
          </button>
        )}
      </nav>

      {/* More sheet for overflow tabs */}
      <MobileBottomSheet
        isOpen={moreSheetOpen}
        onClose={() => setMoreSheetOpen(false)}
        title="More"
      >
        <div className="space-y-1">
          {moreTabs.map((tab) => (
            <button
              key={tab.href}
              onClick={() => {
                hapticSelection()
                router.push(tab.href)
                setMoreSheetOpen(false)
              }}
              className={cn(
                'w-full flex items-center gap-4 p-4 rounded-xl transition-colors',
                isActive(tab.href)
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 active:bg-gray-700'
              )}
            >
              <tab.icon className="w-5 h-5" />
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </MobileBottomSheet>
    </>
  )
}

// Helper to extract campaign ID from pathname
function extractCampaignId(pathname: string): string | null {
  const match = pathname.match(/\/campaigns\/([^\/]+)/)
  return match ? match[1] : null
}

// Helper to extract character ID from pathname
function extractCharacterId(pathname: string): string | null {
  const match = pathname.match(/\/vault\/([^\/]+)/)
  // Exclude special routes like 'new', 'import'
  if (match && !['new', 'import'].includes(match[1])) {
    return match[1]
  }
  return null
}

// Global tabs (top level) - matches desktop floating dock order
function getGlobalTabs() {
  return [
    { href: '/home', label: 'Home', icon: Home },
    { href: '/campaigns', label: 'Campaigns', icon: Swords },
    { href: '/oneshots', label: 'One-Shots', icon: Scroll },
    { href: '/vault', label: 'Characters', icon: BookOpen },
    { href: '/settings', label: 'Settings', icon: Settings },
  ]
}

// Campaign context tabs
function getCampaignTabs(campaignId: string, canUseAI: boolean) {
  const tabs = [
    { href: `/campaigns/${campaignId}/canvas`, label: 'Characters', icon: LayoutGrid },
    { href: `/campaigns/${campaignId}/sessions`, label: 'Sessions', icon: ScrollText },
    { href: `/campaigns/${campaignId}/timeline`, label: 'Timeline', icon: Clock },
    { href: `/campaigns/${campaignId}/lore`, label: 'Lore', icon: Network },
    { href: `/campaigns/${campaignId}/map`, label: 'Map', icon: Map },
    { href: `/campaigns/${campaignId}/gallery`, label: 'Gallery', icon: Image },
  ]

  if (canUseAI) {
    // Insert intelligence after lore
    tabs.splice(4, 0, { href: `/campaigns/${campaignId}/intelligence`, label: 'AI', icon: Brain })
  }

  return tabs
}

// Character context tabs
function getCharacterTabs(characterId: string, canUseAI: boolean) {
  const tabs = [
    { href: `/vault/${characterId}`, label: 'Edit', icon: Edit3 },
    { href: `/vault/${characterId}/view`, label: 'View', icon: Eye },
    { href: `/vault/${characterId}/sessions`, label: 'Sessions', icon: ScrollText },
    { href: `/vault/${characterId}/relationships`, label: 'Relations', icon: Users },
    { href: `/vault/${characterId}/gallery`, label: 'Gallery', icon: Image },
  ]

  if (canUseAI) {
    // Insert intelligence after sessions
    tabs.splice(3, 0, { href: `/vault/${characterId}/intelligence`, label: 'AI', icon: Brain })
  }

  return tabs
}

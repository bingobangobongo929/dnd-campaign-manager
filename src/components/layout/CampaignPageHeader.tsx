'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CampaignMenuDrawer } from './CampaignMenuDrawer'
import type { Campaign } from '@/types/database'

interface CampaignPageHeaderProps {
  campaign: Campaign | null
  campaignId: string
  title: string
  isOwner: boolean
  isDm: boolean
  // Current page for context-aware menu items
  currentPage?: 'dashboard' | 'canvas' | 'sessions' | 'timeline' | 'lore' | 'map' | 'gallery' | 'intelligence' | 'view' | 'settings'
  // Optional page-specific actions
  actions?: React.ReactNode
  // Callbacks for various modals
  onOpenMembers?: () => void
  onOpenLabels?: () => void
  onOpenFactions?: () => void
  onOpenRelationships?: () => void
  onOpenResize?: () => void
  onOpenShare?: () => void
  className?: string
}

export function CampaignPageHeader({
  campaign,
  campaignId,
  title,
  isOwner,
  isDm,
  currentPage,
  actions,
  onOpenMembers,
  onOpenLabels,
  onOpenFactions,
  onOpenRelationships,
  onOpenResize,
  onOpenShare,
  className,
}: CampaignPageHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <>
      <div className={cn(
        "flex items-center justify-between h-14 px-4 border-b border-white/[0.08] bg-[#0a0a0f]",
        className
      )}>
        {/* Left: Logo + Title */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/home"
            className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center"
          >
            <span className="text-white font-bold text-sm">M</span>
          </Link>
          <h1 className="text-lg font-semibold text-white truncate">
            {title}
          </h1>
        </div>

        {/* Right: Actions + Menu Button */}
        <div className="flex items-center gap-2">
          {/* Page-specific actions */}
          {actions}

          {/* Burger menu button */}
          <button
            onClick={() => setIsMenuOpen(true)}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
            aria-label="Open campaign menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Campaign Menu Drawer */}
      <CampaignMenuDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        campaign={campaign}
        campaignId={campaignId}
        isOwner={isOwner}
        isDm={isDm}
        currentPage={currentPage}
        onOpenMembers={onOpenMembers}
        onOpenLabels={onOpenLabels}
        onOpenFactions={onOpenFactions}
        onOpenRelationships={onOpenRelationships}
        onOpenResize={onOpenResize}
        onOpenShare={onOpenShare}
      />
    </>
  )
}

'use client'

import { useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  X,
  LayoutDashboard,
  Users,
  Calendar,
  Clock,
  BookOpen,
  Map,
  Image as ImageIcon,
  Tags,
  Shield,
  Link2,
  Scaling,
  Share2,
  Copy,
  Sparkles,
  Settings,
  Home,
  FolderOpen,
  Swords,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Campaign } from '@/types/database'
import { useState } from 'react'

interface CampaignMenuDrawerProps {
  isOpen: boolean
  onClose: () => void
  campaign: Campaign | null
  campaignId: string
  isOwner: boolean
  isDm: boolean
  // Callbacks for opening various modals/managers
  onOpenMembers?: () => void
  onOpenLabels?: () => void
  onOpenFactions?: () => void
  onOpenRelationships?: () => void
  onOpenResize?: () => void
  onOpenShare?: () => void
}

interface NavItemProps {
  href?: string
  icon: React.ElementType
  label: string
  isActive?: boolean
  onClick?: () => void
  disabled?: boolean
}

function NavItem({ href, icon: Icon, label, isActive, onClick, disabled }: NavItemProps) {
  const className = cn(
    "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors",
    isActive
      ? "bg-purple-600/20 text-purple-300"
      : "text-gray-300 hover:bg-white/[0.05] hover:text-white",
    disabled && "opacity-50 pointer-events-none"
  )

  if (onClick) {
    return (
      <button onClick={onClick} className={cn(className, "w-full text-left")} disabled={disabled}>
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="truncate">{label}</span>
      </button>
    )
  }

  if (href) {
    return (
      <Link href={href} className={className}>
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="truncate">{label}</span>
      </Link>
    )
  }

  return null
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
      {children}
    </div>
  )
}

export function CampaignMenuDrawer({
  isOpen,
  onClose,
  campaign,
  campaignId,
  isOwner,
  isDm,
  onOpenMembers,
  onOpenLabels,
  onOpenFactions,
  onOpenRelationships,
  onOpenResize,
  onOpenShare,
}: CampaignMenuDrawerProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [copied, setCopied] = useState(false)

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, handleEscape])

  const handleNavClick = (callback?: () => void) => {
    if (callback) {
      callback()
    }
    onClose()
  }

  const handleCopyInviteLink = async () => {
    const url = `${window.location.origin}/campaigns/${campaignId}/join`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success('Invite link copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const isActivePath = (path: string) => {
    return pathname?.includes(path)
  }

  if (!isOpen) return null

  const drawerContent = (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-[#0a0a0f] border-l border-white/[0.08] overflow-y-auto animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="sticky top-0 bg-[#0a0a0f] border-b border-white/[0.08] p-4 flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-white truncate">
              {campaign?.name || 'Campaign'}
            </h2>
            {campaign && (
              <p className="text-xs text-gray-500 mt-0.5">
                {campaign.game_system || 'TTRPG'}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 -mr-1.5 text-gray-400 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="py-4 space-y-6">
          {/* Campaign Navigation */}
          <div>
            <SectionHeader>Campaign</SectionHeader>
            <div className="mt-1 space-y-0.5">
              <NavItem
                href={`/campaigns/${campaignId}/dashboard`}
                icon={LayoutDashboard}
                label="Dashboard"
                isActive={isActivePath('/dashboard')}
              />
              <NavItem
                href={`/campaigns/${campaignId}/canvas`}
                icon={Users}
                label="Canvas"
                isActive={isActivePath('/canvas')}
              />
              <NavItem
                href={`/campaigns/${campaignId}/sessions`}
                icon={Calendar}
                label="Sessions"
                isActive={isActivePath('/sessions')}
              />
              <NavItem
                href={`/campaigns/${campaignId}/timeline`}
                icon={Clock}
                label="Timeline"
                isActive={isActivePath('/timeline')}
              />
              <NavItem
                href={`/campaigns/${campaignId}/lore`}
                icon={BookOpen}
                label="Lore"
                isActive={isActivePath('/lore')}
              />
              <NavItem
                href={`/campaigns/${campaignId}/map`}
                icon={Map}
                label="World Map"
                isActive={isActivePath('/map')}
              />
              <NavItem
                href={`/campaigns/${campaignId}/gallery`}
                icon={ImageIcon}
                label="Gallery"
                isActive={isActivePath('/gallery')}
              />
            </div>
          </div>

          {/* Management - DM Only */}
          {isDm && (
            <div>
              <SectionHeader>Management</SectionHeader>
              <div className="mt-1 space-y-0.5">
                <NavItem
                  icon={Users}
                  label="Party & Members"
                  onClick={() => handleNavClick(onOpenMembers)}
                />
                <NavItem
                  icon={Tags}
                  label="Labels"
                  onClick={() => handleNavClick(onOpenLabels)}
                />
                <NavItem
                  icon={Shield}
                  label="Factions"
                  onClick={() => handleNavClick(onOpenFactions)}
                />
                <NavItem
                  icon={Link2}
                  label="Character Relationships"
                  onClick={() => handleNavClick(onOpenRelationships)}
                />
                <NavItem
                  icon={Scaling}
                  label="Card Sizing"
                  onClick={() => handleNavClick(onOpenResize)}
                />
              </div>
            </div>
          )}

          {/* Sharing */}
          <div>
            <SectionHeader>Sharing</SectionHeader>
            <div className="mt-1 space-y-0.5">
              {isDm && (
                <NavItem
                  icon={Share2}
                  label="Share Campaign"
                  onClick={() => handleNavClick(onOpenShare)}
                />
              )}
              <NavItem
                icon={copied ? Check : Copy}
                label={copied ? 'Copied!' : 'Copy Invite Link'}
                onClick={handleCopyInviteLink}
              />
            </div>
          </div>

          {/* Template Status */}
          {campaign?.is_published && (
            <div className="px-4">
              <div className="bg-purple-600/10 border border-purple-500/20 rounded-lg p-3">
                <div className="flex items-center gap-2 text-purple-300">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm font-medium">Published Template</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Version {campaign.template_version} • {campaign.template_save_count || 0} copies
                </p>
                <Link
                  href={`/campaigns/${campaignId}/settings?tab=template`}
                  className="text-xs text-purple-400 hover:text-purple-300 mt-2 inline-block"
                  onClick={onClose}
                >
                  Manage Template →
                </Link>
              </div>
            </div>
          )}

          {/* Settings - Owner Only */}
          {isOwner && (
            <div className="border-t border-white/[0.08] pt-4">
              <NavItem
                href={`/campaigns/${campaignId}/settings`}
                icon={Settings}
                label="Campaign Settings"
                isActive={isActivePath('/settings')}
              />
            </div>
          )}

          {/* Global Navigation */}
          <div className="border-t border-white/[0.08] pt-4">
            <SectionHeader>Quick Links</SectionHeader>
            <div className="mt-1 space-y-0.5">
              <NavItem
                href="/home"
                icon={Home}
                label="Home"
              />
              <NavItem
                href="/campaigns"
                icon={FolderOpen}
                label="All Campaigns"
              />
              <NavItem
                href="/vault"
                icon={Users}
                label="Character Vault"
              />
              <NavItem
                href="/oneshots"
                icon={Swords}
                label="One-Shots"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(drawerContent, document.body)
}

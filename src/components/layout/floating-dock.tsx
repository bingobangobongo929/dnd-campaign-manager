'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Swords,
  Compass,
  Scroll,
  BookOpen,
  Settings,
  LayoutDashboard,
  PanelTop,
  ScrollText,
  Globe,
  Map,
  Image,
  Brain,
  Target,
  Edit3,
  Eye,
  Users,
  Lock,
  Shield,
} from 'lucide-react'
import { DockFlyout } from './dock-flyout'
import { useCanUseAI, useAppStore } from '@/store'
import { useUserSettings, usePermissions } from '@/hooks'
import { isAdmin } from '@/lib/admin'

interface FloatingDockProps {
  campaignId?: string
  characterId?: string
  oneshotId?: string
}

export function FloatingDock({ campaignId, characterId, oneshotId }: FloatingDockProps) {
  const pathname = usePathname()
  const canUseAI = useCanUseAI()
  const { settings } = useUserSettings()
  const showAdmin = settings?.role && isAdmin(settings.role)
  const { can, isOwner, isDm } = usePermissions(campaignId || null)
  const setIsPartyModalOpen = useAppStore((state) => state.setIsPartyModalOpen)

  // Determine page context
  const isMainPage = isMainListingPage(pathname)
  const isInCampaign = !!campaignId && pathname.startsWith('/campaigns/')
  const isInCharacter = !!characterId && pathname.startsWith('/vault/')
  const isInOneshot = !!oneshotId && pathname.startsWith('/oneshots/')

  // Helper to check active state
  const isActive = (href: string) => {
    if (href === '/oneshots') {
      return pathname === '/oneshots' || pathname.startsWith('/oneshots/')
    }
    if (href === '/adventures') {
      return pathname === '/adventures' || pathname.startsWith('/adventures/')
    }
    if (href === '/campaigns') {
      return pathname === '/campaigns' || (pathname.startsWith('/campaigns/') && !isInCampaign)
    }
    if (href === '/vault') {
      return pathname === '/vault' || (pathname.startsWith('/vault/') && !isInCharacter)
    }
    return pathname === href || pathname.startsWith(href + '/')
  }

  // Global navigation items
  const globalNavItems = [
    { href: '/home', label: 'Home', icon: Home },
    { href: '/campaigns', label: 'Campaigns', icon: Swords },
    { href: '/adventures', label: 'Adventures', icon: Compass },
    { href: '/oneshots', label: 'One-Shots', icon: Scroll },
    { href: '/vault', label: 'Characters', icon: BookOpen },
    { href: '/settings', label: 'Settings', icon: Settings },
  ]

  // Campaign navigation items
  // Note: Timeline is now integrated into the World page as a tab
  const campaignNavItems = campaignId ? [
    ...(isDm || can.viewCanvas ? [{ href: `/campaigns/${campaignId}/dashboard`, label: 'Dashboard', icon: LayoutDashboard }] : []),
    ...(isDm || can.viewCanvas ? [{ href: `/campaigns/${campaignId}/canvas`, label: 'Canvas', icon: PanelTop }] : []),
    { href: `/campaigns/${campaignId}/view`, label: 'View', icon: Eye },
    ...(isDm || can.viewSessions ? [{ href: `/campaigns/${campaignId}/sessions`, label: 'Sessions', icon: ScrollText }] : []),
    ...(isDm || can.viewLore ? [{ href: `/campaigns/${campaignId}/lore`, label: 'World', icon: Globe }] : []),
    ...(isDm || can.viewMaps ? [{ href: `/campaigns/${campaignId}/map`, label: 'Maps', icon: Map }] : []),
    ...(isDm || can.viewGallery ? [{ href: `/campaigns/${campaignId}/gallery`, label: 'Gallery', icon: Image }] : []),
  ] : []

  // DM Tools flyout items (campaign context only)
  // Note: Locations removed from here - now integrated into the World page
  const dmToolsItems = campaignId && isDm ? [
    ...(canUseAI ? [{ href: `/campaigns/${campaignId}/intelligence`, label: 'Intelligence', icon: Brain, isActive: isActive(`/campaigns/${campaignId}/intelligence`) }] : []),
    { href: `/campaigns/${campaignId}/quests`, label: 'Quests', icon: Target, isActive: isActive(`/campaigns/${campaignId}/quests`) },
    { href: `/campaigns/${campaignId}/encounters`, label: 'Encounters', icon: Swords, isActive: isActive(`/campaigns/${campaignId}/encounters`) },
    { href: '#', label: 'Party & Members', icon: Users, onClick: () => setIsPartyModalOpen(true) },
  ] : []

  // Navigate flyout items (for detail pages)
  const navigateItems = [
    { href: '/home', label: 'Home', icon: Home, isActive: isActive('/home') },
    { href: '/campaigns', label: 'Campaigns', icon: Swords, isActive: pathname === '/campaigns' },
    { href: '/adventures', label: 'Adventures', icon: Compass, isActive: isActive('/adventures') },
    { href: '/oneshots', label: 'One-Shots', icon: Scroll, isActive: pathname === '/oneshots' },
    { href: '/vault', label: 'Characters', icon: BookOpen, isActive: pathname === '/vault' },
  ]

  // Character navigation items
  const characterNavItems = characterId ? [
    { href: `/vault/${characterId}`, label: 'Edit', icon: Edit3 },
    { href: `/vault/${characterId}/view`, label: 'View 1', icon: Eye },
    { href: `/vault/${characterId}/presentation`, label: 'View 2', icon: BookOpen },
    { href: `/vault/${characterId}/sessions`, label: 'Sessions', icon: ScrollText },
    ...(canUseAI ? [{ href: `/vault/${characterId}/intelligence`, label: 'Intelligence', icon: Brain }] : []),
    { href: `/vault/${characterId}/relationships`, label: 'Relationships', icon: Users },
    { href: `/vault/${characterId}/gallery`, label: 'Gallery', icon: Image },
  ] : []

  // Oneshot navigation items
  const oneshotNavItems = oneshotId ? [
    { href: `/oneshots/${oneshotId}`, label: 'Edit', icon: Edit3 },
    { href: `/oneshots/${oneshotId}/view`, label: 'View', icon: Eye },
    { href: `/oneshots/${oneshotId}/run`, label: 'Present', icon: Scroll },
  ] : []

  return (
    <nav className="floating-dock">
      {/* Logo - always links to home */}
      <Link
        href="/home"
        className="dock-item dock-logo"
        title="Multiloop Beta"
      >
        <img
          src="/icons/icon-96x96.png"
          alt="Multiloop"
          className="dock-item-icon dock-logo-icon"
          style={{ width: '24px', height: '24px', borderRadius: '6px' }}
        />
        <span className="dock-item-label">
          Multiloop
          <span className="dock-logo-beta">BETA</span>
        </span>
      </Link>
      <div className="dock-divider" />

      {/* MAIN PAGES: Show all global nav directly */}
      {isMainPage && (
        <>
          {globalNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`dock-item ${isActive(item.href) ? 'active' : ''}`}
            >
              <item.icon className="dock-item-icon" />
              <span className="dock-item-label">{item.label}</span>
            </Link>
          ))}
          {showAdmin && (
            <Link
              href="/admin"
              className={`dock-item ${isActive('/admin') ? 'active' : ''}`}
            >
              <Shield className="dock-item-icon" />
              <span className="dock-item-label">Admin</span>
            </Link>
          )}
        </>
      )}

      {/* CAMPAIGN DETAIL PAGES */}
      {isInCampaign && (
        <>
          {/* Campaign nav items */}
          {campaignNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`dock-item ${isActive(item.href) ? 'active' : ''}`}
            >
              <item.icon className="dock-item-icon" />
              <span className="dock-item-label">{item.label}</span>
            </Link>
          ))}

          <div className="dock-divider" />

          {/* DM Tools Flyout */}
          {dmToolsItems.length > 0 && (
            <DockFlyout
              icon={Lock}
              label="DM Tools"
              items={dmToolsItems}
            />
          )}

          <div className="dock-divider" />

          {/* Navigate Flyout */}
          <DockFlyout
            icon={Compass}
            label="Navigate"
            items={navigateItems}
          />

          {/* Settings always visible */}
          <Link
            href="/settings"
            className={`dock-item ${isActive('/settings') ? 'active' : ''}`}
          >
            <Settings className="dock-item-icon" />
            <span className="dock-item-label">Settings</span>
          </Link>

          {/* Admin (if user has admin role) */}
          {showAdmin && (
            <Link
              href="/admin"
              className={`dock-item ${isActive('/admin') ? 'active' : ''}`}
            >
              <Shield className="dock-item-icon" />
              <span className="dock-item-label">Admin</span>
            </Link>
          )}
        </>
      )}

      {/* CHARACTER DETAIL PAGES */}
      {isInCharacter && (
        <>
          {/* Character nav items */}
          {characterNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`dock-item ${isActive(item.href) ? 'active' : ''}`}
            >
              <item.icon className="dock-item-icon" />
              <span className="dock-item-label">{item.label}</span>
            </Link>
          ))}

          <div className="dock-divider" />

          {/* Navigate Flyout */}
          <DockFlyout
            icon={Compass}
            label="Navigate"
            items={navigateItems}
          />

          {/* Settings always visible */}
          <Link
            href="/settings"
            className={`dock-item ${isActive('/settings') ? 'active' : ''}`}
          >
            <Settings className="dock-item-icon" />
            <span className="dock-item-label">Settings</span>
          </Link>

          {/* Admin (if user has admin role) */}
          {showAdmin && (
            <Link
              href="/admin"
              className={`dock-item ${isActive('/admin') ? 'active' : ''}`}
            >
              <Shield className="dock-item-icon" />
              <span className="dock-item-label">Admin</span>
            </Link>
          )}
        </>
      )}

      {/* ONESHOT DETAIL PAGES */}
      {isInOneshot && (
        <>
          {/* Oneshot nav items */}
          {oneshotNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`dock-item ${isActive(item.href) ? 'active' : ''}`}
            >
              <item.icon className="dock-item-icon" />
              <span className="dock-item-label">{item.label}</span>
            </Link>
          ))}

          <div className="dock-divider" />

          {/* Navigate Flyout */}
          <DockFlyout
            icon={Compass}
            label="Navigate"
            items={navigateItems}
          />

          {/* Settings always visible */}
          <Link
            href="/settings"
            className={`dock-item ${isActive('/settings') ? 'active' : ''}`}
          >
            <Settings className="dock-item-icon" />
            <span className="dock-item-label">Settings</span>
          </Link>

          {/* Admin (if user has admin role) */}
          {showAdmin && (
            <Link
              href="/admin"
              className={`dock-item ${isActive('/admin') ? 'active' : ''}`}
            >
              <Shield className="dock-item-icon" />
              <span className="dock-item-label">Admin</span>
            </Link>
          )}
        </>
      )}
    </nav>
  )
}

/**
 * Determines if the current pathname is a "main" listing page
 * where all global nav items should be visible directly (not in flyout)
 */
function isMainListingPage(pathname: string): boolean {
  const mainPages = [
    '/home',
    '/campaigns',
    '/adventures',
    '/oneshots',
    '/vault',
    '/settings',
    '/admin',
  ]

  // Exact match for main pages
  if (mainPages.includes(pathname)) {
    return true
  }

  // Settings sub-pages are also considered "main"
  if (pathname.startsWith('/settings/')) {
    return true
  }

  // /campaigns/new, /vault/new, /vault/import are main pages
  if (pathname === '/campaigns/new' || pathname === '/vault/new' || pathname === '/vault/import') {
    return true
  }

  // /adventures/new, /oneshots/new are main pages
  if (pathname === '/adventures/new' || pathname === '/oneshots/new') {
    return true
  }

  return false
}

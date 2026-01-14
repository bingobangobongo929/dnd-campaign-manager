'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutGrid,
  ScrollText,
  Clock,
  Map,
  Image,
  Settings,
  BookOpen,
  Swords,
  Network,
} from 'lucide-react'

interface FloatingDockProps {
  campaignId?: string
}

export function FloatingDock({ campaignId }: FloatingDockProps) {
  const pathname = usePathname()

  const campaignLinks = campaignId
    ? [
        { href: `/campaigns/${campaignId}/canvas`, label: 'Canvas', icon: LayoutGrid },
        { href: `/campaigns/${campaignId}/sessions`, label: 'Sessions', icon: ScrollText },
        { href: `/campaigns/${campaignId}/timeline`, label: 'Timeline', icon: Clock },
        { href: `/campaigns/${campaignId}/lore`, label: 'Lore', icon: Network },
        { href: `/campaigns/${campaignId}/map`, label: 'World Map', icon: Map },
        { href: `/campaigns/${campaignId}/gallery`, label: 'Gallery', icon: Image },
      ]
    : []

  const globalLinks = [
    { href: '/campaigns', label: 'Campaigns', icon: Swords },
    { href: '/vault', label: 'Vault', icon: BookOpen },
    { href: '/settings', label: 'Settings', icon: Settings },
  ]

  const isActive = (href: string) => pathname === href

  return (
    <nav className="floating-dock">
      {/* Campaign-specific links */}
      {campaignLinks.length > 0 && (
        <>
          {campaignLinks.map((link, index) => {
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`dock-item ${isActive(link.href) ? 'active' : ''}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Icon className="dock-item-icon" />
                <span className="dock-item-label">{link.label}</span>
              </Link>
            )
          })}
          <div className="dock-divider" />
        </>
      )}

      {/* Global links */}
      {globalLinks.map((link, index) => {
        const Icon = link.icon
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`dock-item ${isActive(link.href) ? 'active' : ''}`}
            style={{ animationDelay: `${(campaignLinks.length + index) * 50}ms` }}
          >
            <Icon className="dock-item-icon" />
            <span className="dock-item-label">{link.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

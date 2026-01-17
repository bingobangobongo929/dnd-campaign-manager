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
  Brain,
  Edit3,
  Eye,
  Users,
} from 'lucide-react'
import { useAppStore } from '@/store'

interface FloatingDockProps {
  campaignId?: string
  characterId?: string
}

export function FloatingDock({ campaignId, characterId }: FloatingDockProps) {
  const pathname = usePathname()
  const { aiEnabled } = useAppStore()

  // Character-specific links (when viewing a vault character)
  const characterLinks = characterId
    ? [
        { href: `/vault/${characterId}`, label: 'Edit', icon: Edit3 },
        { href: `/vault/${characterId}/view`, label: 'View', icon: Eye },
        ...(aiEnabled ? [{ href: `/vault/${characterId}/intelligence`, label: 'Intelligence', icon: Brain }] : []),
        { href: `/vault/${characterId}/relationships`, label: 'Relationships', icon: Users },
        { href: `/vault/${characterId}/sessions`, label: 'Sessions', icon: ScrollText },
        { href: `/vault/${characterId}/gallery`, label: 'Gallery', icon: Image },
      ]
    : []

  const campaignLinks = campaignId
    ? [
        { href: `/campaigns/${campaignId}/canvas`, label: 'Canvas', icon: LayoutGrid },
        { href: `/campaigns/${campaignId}/sessions`, label: 'Sessions', icon: ScrollText },
        { href: `/campaigns/${campaignId}/timeline`, label: 'Timeline', icon: Clock },
        ...(aiEnabled ? [{ href: `/campaigns/${campaignId}/intelligence`, label: 'Intelligence', icon: Brain }] : []),
        { href: `/campaigns/${campaignId}/lore`, label: 'Lore', icon: Network },
        { href: `/campaigns/${campaignId}/map`, label: 'World Map', icon: Map },
        { href: `/campaigns/${campaignId}/gallery`, label: 'Gallery', icon: Image },
      ]
    : []

  const globalLinks = [
    { href: '/campaigns', label: 'Campaigns', icon: Swords },
    { href: '/vault', label: 'Character Vault', icon: BookOpen },
    { href: '/settings', label: 'Settings', icon: Settings },
  ]

  const isActive = (href: string) => pathname === href

  // Calculate animation delay offset
  let animationOffset = 0

  return (
    <nav className="floating-dock">
      {/* Character-specific links (vault character context) */}
      {characterLinks.length > 0 && (
        <>
          {characterLinks.map((link, index) => {
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

      {/* Campaign-specific links */}
      {campaignLinks.length > 0 && (
        <>
          {campaignLinks.map((link, index) => {
            const Icon = link.icon
            const offset = characterLinks.length + (characterLinks.length > 0 ? 1 : 0)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`dock-item ${isActive(link.href) ? 'active' : ''}`}
                style={{ animationDelay: `${(offset + index) * 50}ms` }}
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
        const offset = characterLinks.length + (characterLinks.length > 0 ? 1 : 0) + campaignLinks.length + (campaignLinks.length > 0 ? 1 : 0)
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`dock-item ${isActive(link.href) ? 'active' : ''}`}
            style={{ animationDelay: `${(offset + index) * 50}ms` }}
          >
            <Icon className="dock-item-icon" />
            <span className="dock-item-label">{link.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

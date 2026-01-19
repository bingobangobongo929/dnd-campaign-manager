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
  Scroll,
  Home,
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
  // Order matches campaign dock: Edit/View are like Canvas, then Sessions, then other features
  const characterLinks = characterId
    ? [
        { href: `/vault/${characterId}`, label: 'Edit', icon: Edit3 },
        { href: `/vault/${characterId}/view`, label: 'View', icon: Eye },
        { href: `/vault/${characterId}/sessions`, label: 'Session Notes', icon: ScrollText },
        ...(aiEnabled ? [{ href: `/vault/${characterId}/intelligence`, label: 'Intelligence', icon: Brain }] : []),
        { href: `/vault/${characterId}/relationships`, label: 'Relationships', icon: Users },
        { href: `/vault/${characterId}/gallery`, label: 'Gallery', icon: Image },
      ]
    : []

  const campaignLinks = campaignId
    ? [
        { href: `/campaigns/${campaignId}/canvas`, label: 'Canvas', icon: LayoutGrid },
        { href: `/campaigns/${campaignId}/sessions`, label: 'Session Notes', icon: ScrollText },
        { href: `/campaigns/${campaignId}/timeline`, label: 'Timeline', icon: Clock },
        ...(aiEnabled ? [{ href: `/campaigns/${campaignId}/intelligence`, label: 'Intelligence', icon: Brain }] : []),
        { href: `/campaigns/${campaignId}/lore`, label: 'Lore', icon: Network },
        { href: `/campaigns/${campaignId}/map`, label: 'World Map', icon: Map },
        { href: `/campaigns/${campaignId}/gallery`, label: 'Gallery', icon: Image },
      ]
    : []

  const globalLinks = [
    { href: '/home', label: 'Home', icon: Home },
    { href: '/campaigns', label: 'Campaigns', icon: Swords },
    { href: '/oneshots', label: 'One-Shots', icon: Scroll },
    { href: '/vault', label: 'Character Vault', icon: BookOpen },
    { href: '/settings', label: 'Settings', icon: Settings },
  ]

  const isActive = (href: string) => {
    // Handle oneshots - match /oneshots or /oneshots/*
    if (href === '/oneshots') {
      return pathname === '/oneshots' || pathname.startsWith('/oneshots/')
    }
    // Handle campaigns - match /campaigns or /campaigns/*
    if (href === '/campaigns') {
      return pathname === '/campaigns' || (pathname.startsWith('/campaigns/') && !pathname.startsWith('/oneshots'))
    }
    return pathname === href || pathname.startsWith(href + '/')
  }

  // Calculate animation delay offset
  let animationOffset = 0

  return (
    <nav className="floating-dock">
      {/* App Logo */}
      <Link
        href="/home"
        className="dock-item dock-logo"
        title="Multiloop"
      >
        <img
          src="/icons/icon-96x96.png"
          alt="Multiloop"
          className="dock-item-icon dock-logo-icon"
          style={{ width: '24px', height: '24px', borderRadius: '6px' }}
        />
        <span className="dock-item-label">Multiloop</span>
      </Link>
      <div className="dock-divider" />

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

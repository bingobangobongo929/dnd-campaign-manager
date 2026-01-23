'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutGrid,
  Users,
  ScrollText,
  Clock,
  Map,
  Image,
  Settings,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Brain,
  Shield,
  Network,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui'
import { useState } from 'react'
import { useAppStore, useCanUseAI } from '@/store'
import { useUserSettings } from '@/hooks'
import { isAdmin } from '@/lib/admin'

interface SidebarProps {
  campaignId?: string
}

export function Sidebar({ campaignId }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const { setIsAIAssistantOpen } = useAppStore()
  const canUseAI = useCanUseAI()
  const { settings } = useUserSettings()
  const showAdmin = settings?.role && isAdmin(settings.role)

  const campaignLinks = campaignId
    ? [
        { href: `/campaigns/${campaignId}/canvas`, label: 'Canvas', icon: LayoutGrid },
        { href: `/campaigns/${campaignId}/sessions`, label: 'Sessions', icon: ScrollText },
        { href: `/campaigns/${campaignId}/timeline`, label: 'Timeline', icon: Clock },
        ...(canUseAI ? [{ href: `/campaigns/${campaignId}/intelligence`, label: 'Intelligence', icon: Brain }] : []),
        { href: `/campaigns/${campaignId}/lore`, label: 'Lore', icon: Network },
        { href: `/campaigns/${campaignId}/map`, label: 'World Map', icon: Map },
        { href: `/campaigns/${campaignId}/gallery`, label: 'Gallery', icon: Image },
      ]
    : []

  const globalLinks = [
    { href: '/campaigns', label: 'Campaigns', icon: Users },
    { href: '/vault', label: 'Character Vault', icon: BookOpen },
    { href: '/settings', label: 'Settings', icon: Settings },
    ...(showAdmin ? [{ href: '/admin', label: 'Admin', icon: Shield }] : []),
  ]

  const NavLink = ({ href, label, icon: Icon }: { href: string; label: string; icon: typeof LayoutGrid }) => {
    const isActive = pathname === href

    return (
      <Link
        href={href}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          isActive
            ? 'bg-[--arcane-purple]/10 text-[--arcane-purple]'
            : 'text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-hover]'
        )}
      >
        <Icon className="h-5 w-5 flex-shrink-0" />
        {!collapsed && <span>{label}</span>}
      </Link>
    )
  }

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-[--bg-surface] border-r border-[--border] transition-all duration-200',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-[--border]">
        {!collapsed && (
          <Link href="/campaigns" className="font-semibold text-[--text-primary]">
            Multiloop
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {/* Campaign-specific links */}
        {campaignLinks.length > 0 && (
          <>
            {!collapsed && (
              <div className="px-3 py-2 text-xs font-semibold text-[--text-tertiary] uppercase tracking-wider">
                Campaign
              </div>
            )}
            {campaignLinks.map((link) => (
              <NavLink key={link.href} {...link} />
            ))}
            <div className="my-4 border-t border-[--border]" />
          </>
        )}

        {/* Global links */}
        {!collapsed && (
          <div className="px-3 py-2 text-xs font-semibold text-[--text-tertiary] uppercase tracking-wider">
            General
          </div>
        )}
        {globalLinks.map((link) => (
          <NavLink key={link.href} {...link} />
        ))}
      </nav>

      {/* AI Assistant button - only show when user can use AI */}
      {campaignId && canUseAI && (
        <div className="p-3 border-t border-[--border]">
          <Button
            variant="secondary"
            className={cn('w-full justify-start gap-3', collapsed && 'justify-center')}
            onClick={() => setIsAIAssistantOpen(true)}
          >
            <Sparkles className="h-5 w-5 text-[--arcane-gold]" />
            {!collapsed && <span>AI Assistant</span>}
          </Button>
        </div>
      )}
    </aside>
  )
}

'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, FileText, Activity, BarChart3, Loader2, Ticket, Mail, Bot, Clock, MessageSquare, HeartPulse, FileStack, Megaphone, ChevronDown, Settings, PenTool } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { useUserSettings } from '@/hooks'
import { isAdmin } from '@/lib/admin'
import { cn } from '@/lib/utils'

// Grouped navigation structure
const adminNavGroups = [
  {
    label: 'Overview',
    href: '/admin',
    icon: LayoutDashboard,
    items: null, // Direct link, no dropdown
  },
  {
    label: 'Users',
    icon: Users,
    items: [
      { href: '/admin/users', label: 'All Users', icon: Users },
      { href: '/admin/invites', label: 'Invites', icon: Ticket },
      { href: '/admin/waitlist', label: 'Waitlist', icon: Clock },
    ],
  },
  {
    label: 'Content',
    icon: PenTool,
    items: [
      { href: '/admin/feedback', label: 'Feedback', icon: MessageSquare },
      { href: '/admin/templates', label: 'Templates', icon: FileStack },
      { href: '/admin/announcements', label: 'Announcements', icon: Megaphone },
      { href: '/admin/changelog', label: 'Changelog', icon: FileText },
    ],
  },
  {
    label: 'AI',
    href: '/admin/ai-usage',
    icon: Bot,
    items: null, // Direct link
  },
  {
    label: 'System',
    icon: Settings,
    items: [
      { href: '/admin/app-settings', label: 'App Settings', icon: Settings },
      { href: '/admin/emails', label: 'Emails', icon: Mail },
      { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
      { href: '/admin/health', label: 'Health', icon: HeartPulse },
      { href: '/admin/activity', label: 'Activity Log', icon: Activity },
    ],
  },
]

function NavDropdown({
  group,
  pathname
}: {
  group: typeof adminNavGroups[number]
  pathname: string
}) {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const Icon = group.icon

  // Check if any item in this group is active
  const isGroupActive = group.items?.some(item =>
    pathname === item.href || pathname.startsWith(item.href + '/')
  )

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
          isGroupActive
            ? "bg-[--arcane-purple] text-white"
            : "text-gray-400 hover:text-white hover:bg-white/[0.04]"
        )}
      >
        <Icon className="w-4 h-4" />
        {group.label}
        <ChevronDown className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
      </button>

      {open && group.items && (
        <div className="absolute top-full left-0 mt-1 py-1 bg-[#1a1a24] border border-white/[0.08] rounded-xl shadow-xl min-w-[180px] z-50">
          {group.items.map((item) => {
            const ItemIcon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-sm transition-colors",
                  isActive
                    ? "bg-purple-500/10 text-purple-400"
                    : "text-gray-400 hover:text-white hover:bg-white/[0.04]"
                )}
              >
                <ItemIcon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { settings, loading } = useUserSettings()
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    if (!loading) {
      if (!settings || !isAdmin(settings.role)) {
        router.push('/home')
      } else {
        setAuthorized(true)
      }
    }
  }, [settings, loading, router])

  if (loading || !authorized) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Admin Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage users, content, and system settings
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-1 mb-6 p-1 bg-white/[0.02] rounded-xl">
          {adminNavGroups.map((group) => {
            const Icon = group.icon

            // Direct link (no dropdown)
            if (!group.items && group.href) {
              const isActive = pathname === group.href
              return (
                <Link
                  key={group.href}
                  href={group.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                    isActive
                      ? "bg-[--arcane-purple] text-white"
                      : "text-gray-400 hover:text-white hover:bg-white/[0.04]"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {group.label}
                </Link>
              )
            }

            // Dropdown menu
            return (
              <NavDropdown key={group.label} group={group} pathname={pathname} />
            )
          })}
        </div>

        {/* Content */}
        {children}
      </div>
    </AppLayout>
  )
}

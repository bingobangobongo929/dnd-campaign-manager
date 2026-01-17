'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Settings, Share2, History } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'

const SETTINGS_TABS = [
  { href: '/settings', label: 'General', icon: Settings, exact: true },
  { href: '/settings/shares', label: 'Share Analytics', icon: Share2 },
  { href: '/settings/activity', label: 'Activity Log', icon: History },
]

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        {/* Settings Sub-Navigation */}
        <div className="mb-6">
          <nav className="flex items-center gap-1 p-1 bg-white/[0.02] rounded-xl border border-white/[0.06]">
            {SETTINGS_TABS.map((tab) => {
              const active = isActive(tab.href, tab.exact)
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? 'bg-[--arcane-purple] text-white shadow-lg shadow-purple-500/20'
                      : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Page Content */}
        {children}
      </div>
    </AppLayout>
  )
}

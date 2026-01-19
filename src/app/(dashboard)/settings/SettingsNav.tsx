'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Settings, Share2, History, ImagePlus } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { MobileLayout } from '@/components/mobile'
import { useIsMobile } from '@/hooks'

const SETTINGS_TABS = [
  { href: '/settings', label: 'General', shortLabel: 'General', icon: Settings, exact: true },
  { href: '/settings/shares', label: 'Share Analytics', shortLabel: 'Shares', icon: Share2 },
  { href: '/settings/activity', label: 'Activity Log', shortLabel: 'Activity', icon: History },
  { href: '/settings/images', label: 'Image Enhancement', shortLabel: 'Images', icon: ImagePlus },
]

export function SettingsNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isMobile = useIsMobile()

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  // Mobile Settings Layout
  if (isMobile) {
    return (
      <AppLayout>
        <MobileLayout title="Settings" showBackButton={false}>
          {/* Mobile Tab Navigation */}
          <div className="mobile-section-tabs mb-4">
            {SETTINGS_TABS.map((tab) => {
              const active = isActive(tab.href, tab.exact)
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`mobile-section-tab ${active ? 'mobile-section-tab-active' : ''}`}
                >
                  {tab.shortLabel}
                </Link>
              )
            })}
          </div>

          {/* Page Content */}
          <div className="px-4 pb-20">
            {children}
          </div>
        </MobileLayout>
      </AppLayout>
    )
  }

  // Desktop Settings Layout
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

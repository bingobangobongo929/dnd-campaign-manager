'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Home, BookOpen, Swords, Scroll, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TabItem {
  icon: React.ReactNode
  label: string
  href: string
  matchPaths: string[]
}

const tabs: TabItem[] = [
  {
    icon: <Home className="w-6 h-6" />,
    label: 'Home',
    href: '/home',
    matchPaths: ['/home'],
  },
  {
    icon: <BookOpen className="w-6 h-6" />,
    label: 'Vault',
    href: '/vault',
    matchPaths: ['/vault'],
  },
  {
    icon: <Swords className="w-6 h-6" />,
    label: 'Campaigns',
    href: '/campaigns',
    matchPaths: ['/campaigns'],
  },
  {
    icon: <Scroll className="w-6 h-6" />,
    label: 'One-Shots',
    href: '/oneshots',
    matchPaths: ['/oneshots'],
  },
  {
    icon: <Settings className="w-6 h-6" />,
    label: 'Settings',
    href: '/settings',
    matchPaths: ['/settings'],
  },
]

export function MobileTabBar() {
  const pathname = usePathname()
  const router = useRouter()

  const isActive = (tab: TabItem) => {
    return tab.matchPaths.some(path => pathname.startsWith(path))
  }

  return (
    <nav className="mobile-tab-bar">
      {tabs.map((tab) => (
        <button
          key={tab.href}
          onClick={() => router.push(tab.href)}
          className={cn(
            'mobile-tab-item',
            isActive(tab) && 'mobile-tab-item-active'
          )}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}

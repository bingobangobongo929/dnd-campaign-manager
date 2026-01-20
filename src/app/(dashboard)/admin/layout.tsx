'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, FileText, Activity, BarChart3, Loader2, Ticket, Mail, Bot } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { useUserSettings } from '@/hooks'
import { isAdmin } from '@/lib/admin'
import { cn } from '@/lib/utils'

const adminNavItems = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/invites', label: 'Invites', icon: Ticket },
  { href: '/admin/emails', label: 'Emails', icon: Mail },
  { href: '/admin/ai-usage', label: 'AI Usage', icon: Bot },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/changelog', label: 'Changelog', icon: FileText },
  { href: '/admin/activity', label: 'Activity Log', icon: Activity },
]

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
        <div className="flex gap-1 mb-6 p-1 bg-white/[0.02] rounded-xl overflow-x-auto">
          {adminNavItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href ||
              (item.href !== '/admin' && pathname.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                  isActive
                    ? "bg-[--arcane-purple] text-white"
                    : "text-gray-400 hover:text-white hover:bg-white/[0.04]"
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </div>

        {/* Content */}
        {children}
      </div>
    </AppLayout>
  )
}

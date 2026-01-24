'use client'

import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface DashboardWidgetProps {
  title: string
  icon: React.ElementType
  className?: string
  children: React.ReactNode
  action?: { label: string; href: string } | { label: string; onClick: () => void }
  priority?: number // For mobile ordering
  collapsible?: boolean
}

export function DashboardWidget({
  title,
  icon: Icon,
  className,
  children,
  action,
}: DashboardWidgetProps) {
  return (
    <div className={cn("bg-[#0a0a0f] border border-white/[0.08] rounded-xl overflow-hidden", className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-[--arcane-purple]" />
          <h3 className="font-medium text-white text-sm">{title}</h3>
        </div>
        {action && (
          'href' in action ? (
            <Link href={action.href} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
              {action.label}
              <ChevronRight className="w-3 h-3" />
            </Link>
          ) : (
            <button onClick={action.onClick} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
              {action.label}
              <ChevronRight className="w-3 h-3" />
            </button>
          )
        )}
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  )
}

// Skeleton for loading states
export function DashboardWidgetSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("bg-[#0a0a0f] border border-white/[0.08] rounded-xl overflow-hidden animate-pulse", className)}>
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
        <div className="w-4 h-4 bg-gray-700 rounded" />
        <div className="w-24 h-4 bg-gray-700 rounded" />
      </div>
      <div className="p-4 space-y-3">
        <div className="w-full h-4 bg-gray-800 rounded" />
        <div className="w-3/4 h-4 bg-gray-800 rounded" />
        <div className="w-1/2 h-4 bg-gray-800 rounded" />
      </div>
    </div>
  )
}

// Empty state pattern for widgets
interface EmptyStateProps {
  icon: React.ElementType
  title: string
  description?: string
  action?: { label: string; href?: string; onClick?: () => void }
}

export function WidgetEmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-8">
      <Icon className="w-10 h-10 text-gray-600 mx-auto mb-3" />
      <p className="text-gray-400 font-medium">{title}</p>
      {description && (
        <p className="text-gray-500 text-sm mt-1 max-w-xs mx-auto">{description}</p>
      )}
      {action && (
        action.href ? (
          <Link
            href={action.href}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-purple-600/20 text-purple-300 rounded-lg hover:bg-purple-600/30 transition-colors text-sm"
          >
            {action.label}
          </Link>
        ) : (
          <button
            onClick={action.onClick}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-purple-600/20 text-purple-300 rounded-lg hover:bg-purple-600/30 transition-colors text-sm"
          >
            {action.label}
          </button>
        )
      )}
    </div>
  )
}

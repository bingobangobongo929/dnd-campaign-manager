'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface FlyoutItem {
  icon: LucideIcon
  label: string
  href: string
  isActive?: boolean
  onClick?: () => void
  badge?: number
}

interface DockFlyoutProps {
  icon: LucideIcon
  label: string
  items: FlyoutItem[]
  className?: string
}

export function DockFlyout({ icon: Icon, label, items, className = '' }: DockFlyoutProps) {
  return (
    <div className={`dock-flyout ${className}`}>
      <div className="dock-flyout-trigger">
        <Icon className="dock-item-icon" />
        <span className="dock-item-label">{label}</span>
        <ChevronRight className="dock-flyout-arrow" />
      </div>
      <div className="dock-flyout-panel">
        {items.map((item) => {
          const ItemIcon = item.icon

          if (item.onClick) {
            return (
              <button
                key={item.label}
                onClick={item.onClick}
                className={`dock-flyout-item ${item.isActive ? 'active' : ''}`}
              >
                <ItemIcon className="dock-flyout-item-icon" />
                <span>{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span className="dock-flyout-item-badge">{item.badge > 99 ? '99+' : item.badge}</span>
                )}
              </button>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`dock-flyout-item ${item.isActive ? 'active' : ''}`}
            >
              <ItemIcon className="dock-flyout-item-icon" />
              <span>{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="dock-flyout-item-badge">{item.badge > 99 ? '99+' : item.badge}</span>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

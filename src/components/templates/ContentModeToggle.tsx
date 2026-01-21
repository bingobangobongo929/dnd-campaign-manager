'use client'

import { cn } from '@/lib/utils'
import type { ContentMode } from '@/types/database'

export type ContentModeTab = ContentMode | 'templates' | 'saved'

interface Tab {
  value: ContentModeTab
  label: string
  count?: number
}

interface ContentModeToggleProps {
  value: ContentModeTab
  onChange: (value: ContentModeTab) => void
  counts?: {
    active?: number
    inactive?: number
    templates?: number
    saved?: number
  }
  contentType: 'campaign' | 'character' | 'oneshot'
  className?: string
}

export function ContentModeToggle({
  value,
  onChange,
  counts = {},
  contentType,
  className,
}: ContentModeToggleProps) {
  // Customize labels based on content type
  const getInactiveLabel = () => {
    if (contentType === 'character') return 'Retired'
    return 'Inactive'
  }

  const tabs: Tab[] = [
    { value: 'active', label: 'Active', count: counts.active },
    { value: 'inactive', label: getInactiveLabel(), count: counts.inactive },
    { value: 'templates', label: 'My Templates', count: counts.templates },
    { value: 'saved', label: 'Saved', count: counts.saved },
  ]

  return (
    <div className={cn('flex gap-1 p-1 bg-white/[0.03] rounded-xl border border-white/[0.06]', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            value === tab.value
              ? 'bg-purple-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'
          )}
        >
          {tab.label}
          {typeof tab.count === 'number' && (
            <span
              className={cn(
                'min-w-[20px] px-1.5 py-0.5 text-xs rounded-full',
                value === tab.value
                  ? 'bg-white/20 text-white'
                  : 'bg-white/[0.08] text-gray-500'
              )}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

// Mobile version with horizontal scroll
interface MobileContentModeToggleProps extends ContentModeToggleProps {}

export function MobileContentModeToggle({
  value,
  onChange,
  counts = {},
  contentType,
  className,
}: MobileContentModeToggleProps) {
  const getInactiveLabel = () => {
    if (contentType === 'character') return 'Retired'
    return 'Inactive'
  }

  const tabs: Tab[] = [
    { value: 'active', label: 'Active', count: counts.active },
    { value: 'inactive', label: getInactiveLabel(), count: counts.inactive },
    { value: 'templates', label: 'Templates', count: counts.templates },
    { value: 'saved', label: 'Saved', count: counts.saved },
  ]

  return (
    <div className={cn('overflow-x-auto scrollbar-none -mx-4 px-4', className)}>
      <div className="flex gap-2 min-w-max py-1">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
              value === tab.value
                ? 'bg-purple-600 text-white'
                : 'bg-white/[0.05] text-gray-400 active:bg-white/[0.08]'
            )}
          >
            {tab.label}
            {typeof tab.count === 'number' && tab.count > 0 && (
              <span
                className={cn(
                  'min-w-[18px] px-1 text-xs rounded-full',
                  value === tab.value
                    ? 'bg-white/20'
                    : 'bg-white/[0.08]'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

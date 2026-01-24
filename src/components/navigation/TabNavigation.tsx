'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Info, X } from 'lucide-react'

// Tab definitions
export type ContentTab =
  | 'all'
  | 'active'
  | 'my-work'
  | 'collection'
  | 'discover'
  // Vault-specific tabs
  | 'my-characters'
  | 'in-play'
  // Sub-filters for active
  | 'running'
  | 'playing'
  // Sub-filters for my-work
  | 'drafts'
  | 'my-templates'
  | 'published'
  // Sub-filters for collection
  | 'saved'

export interface TabConfig {
  value: ContentTab
  label: string
  count?: number
  helpTip?: {
    title: string
    description: string
    items?: string[]
  }
  subFilters?: {
    value: ContentTab
    label: string
    count?: number
  }[]
}

interface TabNavigationProps {
  value: ContentTab
  onChange: (value: ContentTab) => void
  tabs: TabConfig[]
  subFilter?: ContentTab
  onSubFilterChange?: (value: ContentTab) => void
  showHelpTips?: boolean
  className?: string
}

export function TabNavigation({
  value,
  onChange,
  tabs,
  subFilter,
  onSubFilterChange,
  showHelpTips = true,
  className,
}: TabNavigationProps) {
  const [helpTipOpen, setHelpTipOpen] = useState<string | null>(null)

  const currentTab = tabs.find(t => t.value === value)
  const hasSubFilters = currentTab?.subFilters && currentTab.subFilters.length > 0

  return (
    <div className={cn('space-y-3', className)}>
      {/* Main tabs */}
      <div className="flex flex-wrap gap-1 p-1 bg-white/[0.03] rounded-xl border border-white/[0.06]">
        {tabs.map((tab) => (
          <div key={tab.value} className="relative flex items-center">
            <button
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

            {/* Help tip button */}
            {showHelpTips && tab.helpTip && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setHelpTipOpen(helpTipOpen === tab.value ? null : tab.value)
                }}
                className={cn(
                  'ml-1 p-1 rounded-full transition-colors',
                  helpTipOpen === tab.value
                    ? 'text-purple-400 bg-purple-400/10'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.05]'
                )}
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Help tip popover */}
            {helpTipOpen === tab.value && tab.helpTip && (
              <div className="absolute top-full left-0 mt-2 z-50 w-72 p-4 bg-[--bg-surface] border border-white/[0.1] rounded-xl shadow-xl">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-semibold text-white">{tab.helpTip.title}</h4>
                  <button
                    onClick={() => setHelpTipOpen(null)}
                    className="text-gray-500 hover:text-gray-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-gray-400 mb-3">{tab.helpTip.description}</p>
                {tab.helpTip.items && (
                  <ul className="space-y-1.5">
                    {tab.helpTip.items.map((item, i) => (
                      <li key={i} className="text-xs text-gray-500 flex items-start gap-2">
                        <span className="text-purple-400">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Sub-filter tabs */}
      {hasSubFilters && onSubFilterChange && (
        <div className="flex gap-2 pl-2">
          <span className="text-xs text-gray-500 py-1.5">Filter:</span>
          {currentTab.subFilters!.map((filter) => (
            <button
              key={filter.value}
              onClick={() => onSubFilterChange(filter.value)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                subFilter === filter.value
                  ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.05] border border-transparent'
              )}
            >
              {filter.label}
              {typeof filter.count === 'number' && (
                <span className="text-gray-500">{filter.count}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Mobile version with horizontal scroll
export function MobileTabNavigation({
  value,
  onChange,
  tabs,
  subFilter,
  onSubFilterChange,
  className,
}: Omit<TabNavigationProps, 'showHelpTips'>) {
  const currentTab = tabs.find(t => t.value === value)
  const hasSubFilters = currentTab?.subFilters && currentTab.subFilters.length > 0

  return (
    <div className={cn('space-y-2', className)}>
      {/* Main tabs */}
      <div className="overflow-x-auto scrollbar-none -mx-4 px-4">
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

      {/* Sub-filter tabs */}
      {hasSubFilters && onSubFilterChange && (
        <div className="overflow-x-auto scrollbar-none -mx-4 px-4">
          <div className="flex gap-2 min-w-max">
            {currentTab.subFilters!.map((filter) => (
              <button
                key={filter.value}
                onClick={() => onSubFilterChange(filter.value)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all',
                  subFilter === filter.value
                    ? 'bg-purple-600/20 text-purple-400'
                    : 'text-gray-500 active:bg-white/[0.05]'
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Pre-configured tab sets for different content types

export const CAMPAIGNS_TABS: TabConfig[] = [
  {
    value: 'all',
    label: 'All',
    helpTip: {
      title: 'All Campaigns',
      description: 'Overview of all your campaigns, organized by status.',
      items: ['Active campaigns you\'re running or playing', 'Your drafts and templates', 'Saved templates from the community']
    }
  },
  {
    value: 'active',
    label: 'Active',
    subFilters: [
      { value: 'running', label: 'Running' },
      { value: 'playing', label: 'Playing' },
    ],
    helpTip: {
      title: 'Active Games',
      description: 'Campaigns currently in progress.',
      items: ['Running = You\'re the DM', 'Playing = You\'re a player']
    }
  },
  {
    value: 'my-work',
    label: 'My Work',
    subFilters: [
      { value: 'drafts', label: 'Drafts' },
      { value: 'my-templates', label: 'My Templates' },
      { value: 'published', label: 'Published' },
    ],
    helpTip: {
      title: 'My Work',
      description: 'Your creative workspace for campaigns.',
      items: ['Drafts = Works in progress', 'My Templates = Finished, ready to use', 'Published = Shared with community']
    }
  },
  {
    value: 'collection',
    label: 'Collection',
    helpTip: {
      title: 'Collection',
      description: 'Templates you\'ve saved from other creators.',
      items: ['Saved copies are yours to keep forever', 'Start playing to create your own copy']
    }
  },
  {
    value: 'discover',
    label: 'Discover',
    helpTip: {
      title: 'Discover',
      description: 'Browse campaigns shared by the community.',
    }
  },
]

export const ADVENTURES_TABS: TabConfig[] = [
  ...CAMPAIGNS_TABS.map(tab => ({
    ...tab,
    helpTip: tab.helpTip ? {
      ...tab.helpTip,
      title: tab.helpTip.title.replace('Campaigns', 'Adventures').replace('campaigns', 'adventures')
    } : undefined
  }))
]

export const ONESHOTS_TABS: TabConfig[] = [
  ...CAMPAIGNS_TABS.map(tab => ({
    ...tab,
    helpTip: tab.helpTip ? {
      ...tab.helpTip,
      title: tab.helpTip.title.replace('Campaigns', 'Oneshots').replace('campaigns', 'oneshots')
    } : undefined
  }))
]

export const VAULT_TABS: TabConfig[] = [
  {
    value: 'all',
    label: 'All',
    helpTip: {
      title: 'All Characters',
      description: 'Overview of all your characters, organized by status.'
    }
  },
  {
    value: 'my-characters',
    label: 'My Characters',
    helpTip: {
      title: 'My Characters',
      description: 'Your personal characters. Fully editable - these are your source of truth.',
      items: ['Create and edit characters here', 'Bring them to any campaign', 'Your characters, your rules']
    }
  },
  {
    value: 'in-play',
    label: 'In-Play',
    helpTip: {
      title: 'In-Play Characters',
      description: 'Characters currently in active games.',
      items: ['Synced with their campaigns', 'View their journey here', 'Mostly read-only (managed by the campaign)']
    }
  },
  {
    value: 'collection',
    label: 'Collection',
    subFilters: [
      { value: 'my-templates', label: 'My Templates' },
      { value: 'saved', label: 'Saved' },
    ],
    helpTip: {
      title: 'Collection',
      description: 'Character templates and saved concepts.',
      items: ['My Templates = Your finished character concepts', 'Saved = Templates from other creators']
    }
  },
  {
    value: 'discover',
    label: 'Discover',
    helpTip: {
      title: 'Discover',
      description: 'Browse character templates shared by the community.',
    }
  },
]

'use client'

import { useState, useEffect, useMemo } from 'react'
import { MapPin, Shield, Users, Plus, ChevronDown, Clock, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LocationsTab } from './LocationsTab'
import { FactionsTab } from './FactionsTab'
import { RelationshipsTab } from './RelationshipsTab'
import { TimelineTab } from './TimelineTab'
import { EmptyWorldState } from './EmptyWorldState'
import type { Character, CharacterRelationship } from '@/types/database'

interface CharacterWithTags extends Character {
  tags: any[]
}

type TabType = 'locations' | 'factions' | 'relationships' | 'timeline'

interface WorldTabsProps {
  campaignId: string
  characters: CharacterWithTags[]
  relationships: CharacterRelationship[]
  locationCount: number
  factionCount: number
  relationshipCount: number
  eventCount: number
  isDm: boolean
  isOwner: boolean
  canViewTimeline: boolean
  onAddLocation: () => void
  onAddFaction: () => void
  onAddEvent?: () => void
  onSearch?: (query: string) => void
}

const STORAGE_KEY = 'world-active-tab'

export function WorldTabs({
  campaignId,
  characters,
  relationships,
  locationCount,
  factionCount,
  relationshipCount,
  eventCount,
  isDm,
  isOwner,
  canViewTimeline,
  onAddLocation,
  onAddFaction,
  onAddEvent,
  onSearch,
}: WorldTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('locations')
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  // Restore last active tab from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && ['locations', 'factions', 'relationships', 'timeline'].includes(saved)) {
      // Don't restore timeline tab if user can't view it
      if (saved === 'timeline' && !canViewTimeline) {
        setActiveTab('locations')
      } else {
        setActiveTab(saved as TabType)
      }
    }
  }, [canViewTimeline])

  // Save active tab to localStorage
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    localStorage.setItem(STORAGE_KEY, tab)
  }

  const totalContent = locationCount + factionCount + relationshipCount + eventCount

  // Build context-aware add menu items (current tab's option first)
  const addMenuItems = useMemo(() => {
    const items = [
      {
        id: 'location',
        label: 'Add Location',
        icon: MapPin,
        color: 'text-blue-400',
        onClick: onAddLocation,
        tab: 'locations' as TabType,
      },
      {
        id: 'faction',
        label: 'Add Faction',
        icon: Shield,
        color: 'text-emerald-400',
        onClick: onAddFaction,
        tab: 'factions' as TabType,
      },
      ...(canViewTimeline && onAddEvent ? [{
        id: 'event',
        label: 'Add Event',
        icon: Clock,
        color: 'text-amber-400',
        onClick: onAddEvent,
        tab: 'timeline' as TabType,
      }] : []),
    ]

    // Sort so current tab's item is first
    return items.sort((a, b) => {
      if (a.tab === activeTab) return -1
      if (b.tab === activeTab) return 1
      return 0
    })
  }, [activeTab, canViewTimeline, onAddLocation, onAddFaction, onAddEvent])

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query)
    onSearch?.(query)
  }

  // Show unified empty state if completely empty
  if (totalContent === 0) {
    return (
      <EmptyWorldState
        type="all"
        onAddLocation={isDm ? onAddLocation : undefined}
        onAddFaction={isDm ? onAddFaction : undefined}
      />
    )
  }

  // Tab configuration with descriptions
  const tabs = [
    {
      id: 'locations' as TabType,
      label: 'Locations',
      description: 'Places in your world',
      count: locationCount,
      icon: MapPin,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      borderColor: 'border-blue-500/50',
      shadowColor: 'shadow-blue-500/10',
    },
    {
      id: 'factions' as TabType,
      label: 'Factions',
      description: 'Organizations & groups',
      count: factionCount,
      icon: Shield,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/20',
      borderColor: 'border-emerald-500/50',
      shadowColor: 'shadow-emerald-500/10',
    },
    {
      id: 'relationships' as TabType,
      label: 'Relationships',
      description: 'Character connections',
      count: relationshipCount,
      icon: Users,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      borderColor: 'border-purple-500/50',
      shadowColor: 'shadow-purple-500/10',
    },
    // Only show Timeline tab if user has permission
    ...(canViewTimeline ? [{
      id: 'timeline' as TabType,
      label: 'Timeline',
      description: 'Events & history',
      count: eventCount,
      icon: Clock,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/20',
      borderColor: 'border-amber-500/50',
      shadowColor: 'shadow-amber-500/10',
    }] : []),
  ]

  return (
    <div className="space-y-6">
      {/* Header row with search and add button */}
      <div className="flex items-center justify-between gap-4">
        {/* Search */}
        <div className="flex-1 max-w-xs">
          {isSearchOpen ? (
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search world..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  autoFocus
                  className="w-full pl-9 pr-3 py-2 bg-[--bg-surface] border border-[--border] rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[--arcane-purple]/50"
                />
              </div>
              <button
                onClick={() => {
                  setIsSearchOpen(false)
                  handleSearch('')
                }}
                className="p-2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors rounded-lg hover:bg-white/[0.03]"
            >
              <Search className="w-4 h-4" />
              <span>Search</span>
            </button>
          )}
        </div>

        {/* Context-aware Add button */}
        {isDm && addMenuItems.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
              onBlur={() => setTimeout(() => setIsAddMenuOpen(false), 200)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[--arcane-purple] hover:bg-[--arcane-purple]/80 text-white rounded-lg font-medium text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
              <ChevronDown className={cn(
                'w-4 h-4 transition-transform',
                isAddMenuOpen && 'rotate-180'
              )} />
            </button>

            {/* Dropdown menu - context-aware ordering */}
            {isAddMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 py-1 bg-[--bg-elevated] border border-white/10 rounded-lg shadow-xl z-20">
                {addMenuItems.map((item) => {
                  const Icon = item.icon
                  const isCurrentTab = item.tab === activeTab
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        item.onClick()
                        setIsAddMenuOpen(false)
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                        isCurrentTab
                          ? 'bg-white/[0.05] text-white'
                          : 'text-gray-300 hover:bg-white/[0.05] hover:text-white'
                      )}
                    >
                      <Icon className={cn('w-4 h-4', item.color)} />
                      {item.label}
                      {isCurrentTab && (
                        <span className="ml-auto text-xs text-gray-500">current</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tab selector - 2x2 grid on mobile, row on desktop */}
      <div className="p-1.5 bg-white/[0.03] rounded-xl border border-white/[0.08]">
        <div className={cn(
          "grid gap-1.5",
          tabs.length === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"
        )}>
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "flex flex-col items-center gap-1.5 py-4 px-4 rounded-lg transition-all",
                  isActive
                    ? `${tab.bgColor} border-2 ${tab.borderColor} shadow-lg ${tab.shadowColor}`
                    : "border-2 border-transparent hover:bg-white/[0.04]"
                )}
              >
                <Icon className={cn(
                  "w-6 h-6",
                  isActive ? tab.color : "text-gray-500"
                )} />
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-sm font-semibold",
                    isActive ? tab.color : "text-gray-400"
                  )}>
                    {tab.label}
                  </span>
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-xs font-semibold",
                    isActive
                      ? "bg-white/20"
                      : tab.count === 0
                        ? "bg-white/5 text-gray-600"
                        : "bg-white/10 text-gray-500"
                  )}>
                    {tab.count}
                  </span>
                </div>
                <span className={cn(
                  "text-xs",
                  isActive ? `${tab.color} opacity-70` : "text-gray-600"
                )}>
                  {tab.description}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="min-h-[400px]">
        {activeTab === 'locations' && (
          <LocationsTab
            campaignId={campaignId}
            isDm={isDm}
            isOwner={isOwner}
          />
        )}

        {activeTab === 'factions' && (
          <FactionsTab
            campaignId={campaignId}
            characters={characters}
            isDm={isDm}
          />
        )}

        {activeTab === 'relationships' && (
          <RelationshipsTab
            campaignId={campaignId}
            characters={characters}
            relationships={relationships}
            isDm={isDm}
          />
        )}

        {activeTab === 'timeline' && canViewTimeline && (
          <TimelineTab
            campaignId={campaignId}
            characters={characters}
            isDm={isDm}
          />
        )}
      </div>
    </div>
  )
}

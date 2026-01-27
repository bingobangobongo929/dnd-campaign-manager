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

  const tabs = [
    {
      id: 'locations' as TabType,
      label: 'Locations',
      count: locationCount,
      icon: MapPin,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      id: 'factions' as TabType,
      label: 'Factions',
      count: factionCount,
      icon: Shield,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      id: 'relationships' as TabType,
      label: 'Relationships',
      count: relationshipCount,
      icon: Users,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
    // Only show Timeline tab if user has permission
    ...(canViewTimeline ? [{
      id: 'timeline' as TabType,
      label: 'Timeline',
      count: eventCount,
      icon: Clock,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
    }] : []),
  ]

  return (
    <div className="space-y-6">
      {/* Quick Stats Bar */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 bg-white/[0.02] rounded-lg border border-white/[0.05]">
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="w-4 h-4 text-blue-400" />
          <span className="text-gray-400">{locationCount}</span>
          <span className="text-gray-600">Locations</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span className="text-gray-400">{factionCount}</span>
          <span className="text-gray-600">Factions</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Users className="w-4 h-4 text-purple-400" />
          <span className="text-gray-400">{relationshipCount}</span>
          <span className="text-gray-600">Relationships</span>
        </div>
        {canViewTimeline && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-gray-400">{eventCount}</span>
            <span className="text-gray-600">Events</span>
          </div>
        )}

        {/* Search toggle */}
        <div className="flex-1 flex justify-end">
          {isSearchOpen ? (
            <div className="flex items-center gap-2 w-full max-w-xs">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search world..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  autoFocus
                  className="w-full pl-9 pr-3 py-1.5 bg-[--bg-surface] border border-[--border] rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[--arcane-purple]/50"
                />
              </div>
              <button
                onClick={() => {
                  setIsSearchOpen(false)
                  handleSearch('')
                }}
                className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors"
              title="Search world content"
            >
              <Search className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tab header with Add button */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Tabs */}
        <div className="flex-1">
          <div className="flex flex-wrap gap-2">
            {tabs.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id

              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all',
                    isActive
                      ? `${tab.bgColor} ${tab.color} ring-1 ring-current/20`
                      : 'bg-white/[0.02] text-gray-400 hover:bg-white/[0.05] hover:text-gray-300'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  <span className={cn(
                    'px-1.5 py-0.5 rounded text-xs font-semibold',
                    isActive
                      ? 'bg-white/20'
                      : tab.count === 0
                        ? 'bg-white/5 text-gray-600'
                        : 'bg-white/10 text-gray-500'
                  )}>
                    {tab.count}
                  </span>
                </button>
              )
            })}
          </div>
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
                {addMenuItems.map((item, index) => {
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

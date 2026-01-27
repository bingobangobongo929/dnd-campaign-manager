'use client'

import { useState, useEffect } from 'react'
import { MapPin, Shield, Users, Plus, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LocationsTab } from './LocationsTab'
import { FactionsTab } from './FactionsTab'
import { RelationshipsTab } from './RelationshipsTab'
import { EmptyWorldState } from './EmptyWorldState'
import type { Character, CharacterRelationship } from '@/types/database'

interface CharacterWithTags extends Character {
  tags: any[]
}

type TabType = 'locations' | 'factions' | 'relationships'

interface WorldTabsProps {
  campaignId: string
  characters: CharacterWithTags[]
  relationships: CharacterRelationship[]
  locationCount: number
  factionCount: number
  relationshipCount: number
  isDm: boolean
  isOwner: boolean
  onAddLocation: () => void
  onAddFaction: () => void
}

const STORAGE_KEY = 'world-active-tab'

export function WorldTabs({
  campaignId,
  characters,
  relationships,
  locationCount,
  factionCount,
  relationshipCount,
  isDm,
  isOwner,
  onAddLocation,
  onAddFaction,
}: WorldTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('locations')
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false)

  // Restore last active tab from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && ['locations', 'factions', 'relationships'].includes(saved)) {
      setActiveTab(saved as TabType)
    }
  }, [])

  // Save active tab to localStorage
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    localStorage.setItem(STORAGE_KEY, tab)
  }

  const totalContent = locationCount + factionCount + relationshipCount

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
  ]

  return (
    <div className="space-y-6">
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
                  {tab.count > 0 && (
                    <span className={cn(
                      'px-1.5 py-0.5 rounded text-xs font-semibold',
                      isActive
                        ? 'bg-white/20'
                        : 'bg-white/10 text-gray-500'
                    )}>
                      {tab.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Context-aware Add button */}
        {isDm && (
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

            {/* Dropdown menu */}
            {isAddMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 py-1 bg-[#1a1a24] border border-white/10 rounded-lg shadow-xl z-20">
                <button
                  onClick={() => {
                    onAddLocation()
                    setIsAddMenuOpen(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/[0.05] hover:text-white transition-colors"
                >
                  <MapPin className="w-4 h-4 text-blue-400" />
                  Add Location
                </button>
                <button
                  onClick={() => {
                    onAddFaction()
                    setIsAddMenuOpen(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/[0.05] hover:text-white transition-colors"
                >
                  <Shield className="w-4 h-4 text-emerald-400" />
                  Add Faction
                </button>
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
            characters={characters}
            relationships={relationships}
          />
        )}
      </div>
    </div>
  )
}

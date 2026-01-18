'use client'

import Image from 'next/image'
import {
  Plus,
  Search,
  X,
  ChevronRight,
  PenLine,
  Sparkles,
  Filter,
} from 'lucide-react'
import { Modal } from '@/components/ui'
import { AppLayout } from '@/components/layout/app-layout'
import { MobileLayout, MobileSearchBar, MobileSegmentedControl, MobileBottomSheet, MobileFAB } from '@/components/mobile'
import { cn, getInitials } from '@/lib/utils'
import type { VaultCharacter } from '@/types/database'

export interface VaultPageMobileProps {
  filteredCharacters: VaultCharacter[]
  searchQuery: string
  setSearchQuery: (query: string) => void
  typeFilter: 'all' | 'pc' | 'npc'
  setTypeFilter: (filter: 'all' | 'pc' | 'npc') => void
  statusFilter: string
  setStatusFilter: (filter: string) => void
  sortBy: 'updated' | 'name' | 'type' | 'created'
  setSortBy: (sort: 'updated' | 'name' | 'type' | 'created') => void
  availableStatuses: string[]
  isFilterSheetOpen: boolean
  setIsFilterSheetOpen: (open: boolean) => void
  isAddModalOpen: boolean
  setIsAddModalOpen: (open: boolean) => void
  onNavigate: (path: string) => void
}

export function VaultPageMobile({
  filteredCharacters,
  searchQuery,
  setSearchQuery,
  typeFilter,
  setTypeFilter,
  statusFilter,
  setStatusFilter,
  sortBy,
  setSortBy,
  availableStatuses,
  isFilterSheetOpen,
  setIsFilterSheetOpen,
  isAddModalOpen,
  setIsAddModalOpen,
  onNavigate,
}: VaultPageMobileProps) {
  return (
    <AppLayout>
      <MobileLayout title="Character Vault" showBackButton={false}>
        {/* Search Bar */}
        <MobileSearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search characters..."
        />

        {/* Type Filter Segmented Control */}
        <div className="mb-4">
          <MobileSegmentedControl
            options={[
              { value: 'all', label: 'All' },
              { value: 'pc', label: 'PCs' },
              { value: 'npc', label: 'NPCs' },
            ]}
            value={typeFilter}
            onChange={(val) => setTypeFilter(val as 'all' | 'pc' | 'npc')}
          />
        </div>

        {/* Filter Button */}
        {(statusFilter !== 'all' || sortBy !== 'updated') && (
          <div className="px-4 mb-3 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500">Active filters:</span>
            {statusFilter !== 'all' && (
              <button
                onClick={() => setStatusFilter('all')}
                className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs"
              >
                {statusFilter}
                <X className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={() => setIsFilterSheetOpen(true)}
              className="flex items-center gap-1 px-2 py-1 bg-gray-800 text-gray-400 rounded text-xs"
            >
              <Filter className="w-3 h-3" />
              More
            </button>
          </div>
        )}

        {/* Characters List */}
        {filteredCharacters.length === 0 ? (
          <div className="mobile-empty-state">
            {searchQuery ? (
              <>
                <Search className="mobile-empty-icon" />
                <h3 className="mobile-empty-title">No matches</h3>
                <p className="mobile-empty-description">Try a different search term</p>
              </>
            ) : (
              <>
                <Sparkles className="mobile-empty-icon" />
                <h3 className="mobile-empty-title">Your Vault Awaits</h3>
                <p className="mobile-empty-description">Create characters to store and reuse across campaigns</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3 pb-20">
            {filteredCharacters.map((char) => (
              <button
                key={char.id}
                onClick={() => onNavigate(`/vault/${char.id}`)}
                className="mobile-character-card"
              >
                <div className="mobile-character-portrait">
                  {char.image_url ? (
                    <Image
                      src={char.image_url}
                      alt={char.name}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="mobile-character-portrait-initial">
                      {getInitials(char.name)}
                    </span>
                  )}
                </div>
                <div className="mobile-character-info">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                      "mobile-character-badge",
                      char.type === 'npc' && "mobile-character-badge-npc"
                    )}>
                      {char.type === 'pc' ? 'PC' : 'NPC'}
                    </span>
                    {char.status && (
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: char.status_color ? `${char.status_color}20` : 'rgba(139, 92, 246, 0.15)',
                          color: char.status_color || '#8B5CF6',
                        }}
                      >
                        {char.status}
                      </span>
                    )}
                  </div>
                  <span className="mobile-character-name">{char.name}</span>
                  <span className="mobile-character-meta">
                    {[char.race, char.class].filter(Boolean).join(' • ') || 'Adventurer'}
                  </span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-600 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}

        {/* FAB for adding characters */}
        <MobileFAB
          icon={<Plus className="w-6 h-6" />}
          onClick={() => setIsAddModalOpen(true)}
          label="Add Character"
        />

        {/* Filter Bottom Sheet */}
        <MobileBottomSheet
          isOpen={isFilterSheetOpen}
          onClose={() => setIsFilterSheetOpen(false)}
          title="Filters & Sort"
        >
          <div className="space-y-6">
            {/* Status Filter */}
            {availableStatuses.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-400 block mb-3">Status</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      statusFilter === 'all' ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400"
                    )}
                  >
                    All
                  </button>
                  {availableStatuses.map(status => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={cn(
                        "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        statusFilter === status ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400"
                      )}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sort */}
            <div>
              <label className="text-sm font-medium text-gray-400 block mb-3">Sort By</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'updated', label: 'Recently Updated' },
                  { value: 'created', label: 'Recently Created' },
                  { value: 'name', label: 'Name (A-Z)' },
                  { value: 'type', label: 'Type' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setSortBy(opt.value as typeof sortBy)}
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      sortBy === opt.value ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setIsFilterSheetOpen(false)}
              className="w-full py-3 bg-purple-600 text-white font-medium rounded-xl"
            >
              Apply Filters
            </button>
          </div>
        </MobileBottomSheet>

        {/* Add Character Modal (shared with desktop) */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Add Character"
          description="How would you like to create your character?"
        >
          <div className="space-y-3 pt-2">
            <button
              onClick={() => {
                setIsAddModalOpen(false)
                onNavigate('/vault/import')
              }}
              className="w-full p-4 rounded-xl border border-white/[0.06] bg-gray-900/50 active:bg-gray-800 transition-colors text-left flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Import with AI</h3>
                <p className="text-sm text-gray-400">Upload a document and let AI extract data</p>
              </div>
            </button>
            <button
              onClick={() => {
                setIsAddModalOpen(false)
                onNavigate('/vault/new')
              }}
              className="w-full p-4 rounded-xl border border-white/[0.06] bg-gray-900/50 active:bg-gray-800 transition-colors text-left flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <PenLine className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Create from Scratch</h3>
                <p className="text-sm text-gray-400">Start with a blank editor</p>
              </div>
            </button>
          </div>
        </Modal>
      </MobileLayout>
    </AppLayout>
  )
}

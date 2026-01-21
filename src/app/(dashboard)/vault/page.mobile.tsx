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
  User,
  Eye,
  Bookmark,
  RotateCcw,
  Play,
} from 'lucide-react'
import { Modal } from '@/components/ui'
import { AppLayout } from '@/components/layout/app-layout'
import { MobileLayout, MobileSearchBar, MobileSegmentedControl, MobileBottomSheet, MobileFAB, MobileSectionHeader } from '@/components/mobile'
import { MobileContentModeToggle, TemplateStateBadge, type ContentModeTab } from '@/components/templates'
import { cn, getInitials, formatDate } from '@/lib/utils'
import type { VaultCharacter, ContentSave } from '@/types/database'

export interface VaultPageMobileProps {
  filteredCharacters: VaultCharacter[]
  savedCharacters: ContentSave[]
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
  canUseAI: boolean
  activeTab: ContentModeTab
  setActiveTab: (tab: ContentModeTab) => void
  tabCounts: {
    active: number
    inactive: number
    templates: number
    saved: number
  }
  onReactivate: (characterId: string) => void
}

export function VaultPageMobile({
  filteredCharacters,
  savedCharacters,
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
  canUseAI,
  activeTab,
  setActiveTab,
  tabCounts,
  onReactivate,
}: VaultPageMobileProps) {
  return (
    <AppLayout>
      <MobileLayout title="Character Vault" showBackButton={false}>
        {/* Tabs */}
        <div className="px-4 pt-2 pb-4">
          <MobileContentModeToggle
            value={activeTab}
            onChange={setActiveTab}
            counts={tabCounts}
            contentType="character"
          />
        </div>

        {/* Saved Characters Tab */}
        {activeTab === 'saved' && (
          savedCharacters.length === 0 ? (
            <div className="mobile-empty-state">
              <Bookmark className="mobile-empty-icon" />
              <h3 className="mobile-empty-title">No saved characters</h3>
              <p className="mobile-empty-description">Character templates you save will appear here</p>
            </div>
          ) : (
            <div className="px-4 space-y-3 pb-20">
              {savedCharacters.map((save) => (
                <div
                  key={save.id}
                  className="bg-[--bg-surface] rounded-xl border border-white/[0.06] overflow-hidden"
                >
                  <div className="relative h-32">
                    {save.source_image_url ? (
                      <>
                        <Image
                          src={save.source_image_url}
                          alt={save.source_name}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent" />
                      </>
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 to-gray-900 flex items-center justify-center">
                        <User className="w-10 h-10 text-purple-400/30" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-1 text-[10px] bg-purple-500/20 text-purple-300 rounded">Saved</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h4 className="font-semibold text-white">{save.source_name}</h4>
                    <p className="text-xs text-gray-500 mt-1">v{save.saved_version}</p>
                    {save.instance_id ? (
                      <button
                        onClick={() => onNavigate(`/vault/${save.instance_id}`)}
                        className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg"
                      >
                        <Play className="w-4 h-4" />
                        Continue Playing
                      </button>
                    ) : (
                      <button
                        onClick={() => onNavigate(`/vault?startPlaying=${save.id}`)}
                        className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg"
                      >
                        <Play className="w-4 h-4" />
                        Start Playing
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Inactive Characters Tab */}
        {activeTab === 'inactive' && (
          filteredCharacters.length === 0 ? (
            <div className="mobile-empty-state">
              <User className="mobile-empty-icon opacity-50" />
              <h3 className="mobile-empty-title">No inactive characters</h3>
              <p className="mobile-empty-description">Retired or deceased characters will appear here</p>
            </div>
          ) : (
            <div className="px-4 space-y-3 pb-20">
              {filteredCharacters.map((character) => (
                <div
                  key={character.id}
                  className="flex items-center gap-4 p-3 bg-[--bg-surface] rounded-xl border border-white/[0.04] opacity-75"
                >
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-900 flex-shrink-0">
                    {character.image_url ? (
                      <Image
                        src={character.image_url}
                        alt={character.name}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover grayscale"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-900">
                        <User className="w-6 h-6 text-gray-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-400 truncate">{character.name}</h4>
                    <TemplateStateBadge mode="inactive" inactiveReason={character.inactive_reason} size="sm" />
                  </div>
                  <button
                    onClick={() => onReactivate(character.id)}
                    className="p-2 bg-white/5 rounded-lg"
                  >
                    <RotateCcw className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              ))}
            </div>
          )
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          filteredCharacters.length === 0 ? (
            <div className="mobile-empty-state">
              <Sparkles className="mobile-empty-icon" />
              <h3 className="mobile-empty-title">No templates</h3>
              <p className="mobile-empty-description">Publish your characters as templates to share with others</p>
            </div>
          ) : (
            <div className="px-4 space-y-3 pb-20">
              {filteredCharacters.map((character) => (
                <button
                  key={character.id}
                  onClick={() => onNavigate(`/vault/${character.id}?fromTemplate=true`)}
                  className="w-full flex items-center gap-4 p-3 bg-[--bg-surface] rounded-xl border border-purple-500/20 active:bg-[--bg-hover]"
                >
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-900 flex-shrink-0">
                    {character.image_url ? (
                      <Image
                        src={character.image_url}
                        alt={character.name}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/30 to-gray-900">
                        <User className="w-6 h-6 text-purple-400/50" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <h4 className="font-semibold text-white truncate">{character.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-purple-400 bg-purple-500/10 rounded-full border border-purple-500/30">
                        <Sparkles className="w-2.5 h-2.5" />
                        Published
                      </span>
                      {character.template_save_count > 0 && (
                        <span className="text-xs text-gray-500">{character.template_save_count} saves</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              ))}
            </div>
          )
        )}

        {/* Active Characters Tab */}
        {activeTab === 'active' && (
          <>
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
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-medium rounded-xl"
                >
                  <User className="w-5 h-5" />
                  Add Character
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4 pb-20">
            {/* Featured Character Hero */}
            {!searchQuery && filteredCharacters.length > 0 && (() => {
              const featuredChar = filteredCharacters[0]

              return (
                <button
                  onClick={() => onNavigate(`/vault/${featuredChar.id}`)}
                  className="w-full mx-4 max-w-[calc(100%-32px)] relative rounded-2xl overflow-hidden bg-gray-900 border border-white/[0.06] active:scale-[0.98] transition-transform"
                >
                  <div className="relative h-64">
                    {featuredChar.image_url ? (
                      <>
                        <Image
                          src={featuredChar.image_url}
                          alt={featuredChar.name}
                          fill
                          className="object-cover"
                          priority
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                      </>
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 to-gray-900 flex items-center justify-center">
                        <User className="w-20 h-20 text-purple-400/30" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={cn(
                          "px-2 py-1 text-[10px] font-semibold uppercase tracking-wider rounded",
                          featuredChar.type === 'pc' ? "bg-purple-600 text-white" : "bg-amber-500 text-black"
                        )}>
                          {featuredChar.type === 'pc' ? 'Player Character' : 'NPC'}
                        </span>
                        {featuredChar.status && (
                          <span
                            className="px-2 py-1 text-[10px] font-medium rounded"
                            style={{
                              backgroundColor: featuredChar.status_color ? `${featuredChar.status_color}30` : 'rgba(139, 92, 246, 0.2)',
                              color: featuredChar.status_color || '#8B5CF6',
                            }}
                          >
                            {featuredChar.status}
                          </span>
                        )}
                        {(featuredChar.race || featuredChar.class) && (
                          <span className="px-2 py-1 text-[10px] font-medium rounded bg-white/10 text-gray-300">
                            {[featuredChar.race, featuredChar.class].filter(Boolean).join(' • ')}
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl font-display font-bold text-white">{featuredChar.name}</h2>
                      <div className="flex items-center gap-1 mt-2 text-xs text-purple-400">
                        <Eye className="w-3 h-3" />
                        <span>View Character</span>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })()}

            {/* All Characters List */}
            {filteredCharacters.length > 1 && !searchQuery && (
              <MobileSectionHeader title="All Characters" />
            )}
            <div className="space-y-3 px-4">
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
          </div>
        )}
          </>
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
            {canUseAI && (
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
            )}
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

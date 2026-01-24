'use client'

import Image from 'next/image'
import {
  Plus,
  Compass,
  Sparkles,
  ChevronRight,
  Bookmark,
  RotateCcw,
  Play,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { AppLayout } from '@/components/layout/app-layout'
import { MobileLayout, MobileSectionHeader, MobileFAB } from '@/components/mobile'
import { TemplateStateBadge } from '@/components/templates'
import { TabNavigation, type ContentTab, type TabConfig } from '@/components/navigation'
import type { Campaign, ContentSave } from '@/types/database'

interface TemplateSnapshot {
  id: string
  content_id: string
  version: number
  version_name?: string
  is_public: boolean
  published_at: string
  save_count: number
  view_count?: number
  snapshot_data: any
}

export interface AdventuresPageMobileProps {
  adventures: Campaign[]
  inactiveAdventures: Campaign[]
  savedAdventures: ContentSave[]
  templateSnapshots: TemplateSnapshot[]
  onNavigate: (path: string) => void
  activeTab: ContentTab
  setActiveTab: (tab: ContentTab) => void
  subFilter: ContentTab
  setSubFilter: (filter: ContentTab) => void
  tabsWithCounts: TabConfig[]
  onReactivate: (adventureId: string) => void
}

export function AdventuresPageMobile({
  adventures,
  inactiveAdventures,
  savedAdventures,
  templateSnapshots,
  onNavigate,
  activeTab,
  setActiveTab,
  subFilter,
  setSubFilter,
  tabsWithCounts,
  onReactivate,
}: AdventuresPageMobileProps) {
  return (
    <AppLayout>
      <MobileLayout title="Adventures" showBackButton={false}>
        {/* Tabs */}
        <div className="px-4 pt-2 pb-4">
          <TabNavigation
            value={activeTab}
            onChange={setActiveTab}
            tabs={tabsWithCounts}
            subFilter={subFilter}
            onSubFilterChange={setSubFilter}
          />
        </div>

        {/* Discover Tab - Coming Soon */}
        {activeTab === 'discover' && (
          <div className="mobile-empty-state">
            <Sparkles className="mobile-empty-icon" />
            <h3 className="mobile-empty-title">Coming Soon</h3>
            <p className="mobile-empty-description">Discover adventure templates shared by the community</p>
          </div>
        )}

        {/* Collection Tab */}
        {activeTab === 'collection' && (
          savedAdventures.length === 0 ? (
            <div className="mobile-empty-state">
              <Bookmark className="mobile-empty-icon" />
              <h3 className="mobile-empty-title">No saved adventures</h3>
              <p className="mobile-empty-description">Adventure templates you save will appear here</p>
            </div>
          ) : (
            <div className="px-4 space-y-3 pb-20">
              {savedAdventures.map((save) => (
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
                      <div className="absolute inset-0 bg-gradient-to-br from-amber-900/30 to-gray-900 flex items-center justify-center">
                        <Compass className="w-10 h-10 text-amber-400/30" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-1 text-[10px] bg-amber-500/20 text-amber-300 rounded">Saved</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h4 className="font-semibold text-white">{save.source_name}</h4>
                    <p className="text-xs text-gray-500 mt-1">v{save.saved_version}</p>
                    {save.instance_id ? (
                      <button
                        onClick={() => onNavigate(`/campaigns/${save.instance_id}/dashboard`)}
                        className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg"
                      >
                        <Play className="w-4 h-4" />
                        Continue Playing
                      </button>
                    ) : (
                      <button
                        onClick={() => onNavigate(`/adventures?startPlaying=${save.id}`)}
                        className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg"
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

        {/* My Work Tab - Drafts and Templates */}
        {activeTab === 'my-work' && (
          inactiveAdventures.length === 0 && templateSnapshots.length === 0 ? (
            <div className="mobile-empty-state">
              <Sparkles className="mobile-empty-icon" />
              <h3 className="mobile-empty-title">No work in progress</h3>
              <p className="mobile-empty-description">Drafts and templates will appear here</p>
            </div>
          ) : (
            <div className="space-y-6 pb-20">
              {/* Drafts */}
              {inactiveAdventures.length > 0 && (
                <>
                  <MobileSectionHeader title="Drafts" />
                  <div className="px-4 space-y-3">
                    {inactiveAdventures.map((adventure) => (
                      <div
                        key={adventure.id}
                        className="flex items-center gap-4 p-3 bg-[--bg-surface] rounded-xl border border-white/[0.04] opacity-75"
                      >
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-900 flex-shrink-0">
                          {adventure.image_url ? (
                            <Image
                              src={adventure.image_url}
                              alt={adventure.name}
                              width={64}
                              height={64}
                              className="w-full h-full object-cover grayscale"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-900">
                              <Compass className="w-6 h-6 text-gray-600" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-400 truncate">{adventure.name}</h4>
                          <TemplateStateBadge mode="inactive" inactiveReason={adventure.inactive_reason} size="sm" />
                        </div>
                        <button
                          onClick={() => onReactivate(adventure.id)}
                          className="p-2 bg-white/5 rounded-lg"
                        >
                          <RotateCcw className="w-5 h-5 text-gray-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* My Templates */}
              {templateSnapshots.length > 0 && (
                <>
                  <MobileSectionHeader title="My Templates" />
                  <div className="px-4 space-y-3">
                    {templateSnapshots.map((snapshot) => {
                      const snapshotData = snapshot.snapshot_data || {}
                      const imageUrl = snapshotData.image_url
                      const name = snapshotData.name || 'Untitled'

                      return (
                        <button
                          key={snapshot.id}
                          onClick={() => onNavigate(`/campaigns/${snapshot.content_id}/dashboard?fromTemplate=true`)}
                          className="w-full flex items-center gap-4 p-3 bg-[--bg-surface] rounded-xl border border-amber-500/20 active:bg-[--bg-hover]"
                        >
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-900 flex-shrink-0">
                            {imageUrl ? (
                              <Image
                                src={imageUrl}
                                alt={name}
                                width={64}
                                height={64}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-900/30 to-gray-900">
                                <Compass className="w-6 h-6 text-amber-400/50" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <h4 className="font-semibold text-white truncate">{name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              {snapshot.is_public ? (
                                <span className="px-2 py-0.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 rounded-full border border-emerald-500/30">
                                  Public
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 text-xs font-medium text-gray-400 bg-gray-500/10 rounded-full border border-gray-500/30">
                                  Private
                                </span>
                              )}
                              {snapshot.save_count > 0 && (
                                <span className="text-xs text-gray-500">{snapshot.save_count} saves</span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-600" />
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )
        )}

        {/* Active Tab */}
        {activeTab === 'active' && (
          adventures.length === 0 ? (
            <div className="mobile-empty-state">
              <Compass className="mobile-empty-icon text-amber-400/50" />
              <h3 className="mobile-empty-title">No Active Adventures</h3>
              <p className="mobile-empty-description">Start a new adventure to begin your multi-session story</p>
              <button
                onClick={() => onNavigate('/adventures/new')}
                className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-amber-600 text-white font-medium rounded-xl"
              >
                <Compass className="w-5 h-5" />
                New Adventure
              </button>
            </div>
          ) : (
            <div className="px-4 grid grid-cols-2 gap-3 pb-20">
              {adventures.map((adventure) => (
                <button
                  key={adventure.id}
                  onClick={() => onNavigate(`/campaigns/${adventure.id}/dashboard`)}
                  className="relative rounded-xl overflow-hidden bg-gray-900 border border-white/[0.06] active:scale-[0.98] transition-transform aspect-[2/3] text-left"
                >
                  {adventure.image_url ? (
                    <>
                      <Image
                        src={adventure.image_url}
                        alt={adventure.name}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-900/30 to-gray-900 flex items-center justify-center">
                      <Compass className="w-10 h-10 text-amber-400/30" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Adventure
                    </span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h4 className="font-semibold text-white text-sm line-clamp-2">{adventure.name}</h4>
                    <p className="text-[10px] text-gray-400 mt-1">{adventure.game_system}</p>
                  </div>
                </button>
              ))}
            </div>
          )
        )}

        {/* All Tab - Overview */}
        {activeTab === 'all' && (
          adventures.length === 0 && savedAdventures.length === 0 ? (
            <div className="mobile-empty-state">
              <Compass className="mobile-empty-icon text-amber-400/50" />
              <h3 className="mobile-empty-title">Begin Your Adventure</h3>
              <p className="mobile-empty-description">Adventures are 3-9 session arcs - perfect for module-length content</p>
              <button
                onClick={() => onNavigate('/adventures/new')}
                className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-amber-600 text-white font-medium rounded-xl"
              >
                <Compass className="w-5 h-5" />
                Create Adventure
              </button>
            </div>
          ) : (
            <div className="space-y-6 pb-20">
              {/* Active Adventures */}
              {adventures.length > 0 && (
                <>
                  <MobileSectionHeader title="Active Adventures" />
                  <div className="px-4 grid grid-cols-2 gap-3">
                    {adventures.slice(0, 4).map((adventure) => (
                      <button
                        key={adventure.id}
                        onClick={() => onNavigate(`/campaigns/${adventure.id}/dashboard`)}
                        className="relative rounded-xl overflow-hidden bg-gray-900 border border-white/[0.06] active:scale-[0.98] transition-transform aspect-[2/3] text-left"
                      >
                        {adventure.image_url ? (
                          <>
                            <Image
                              src={adventure.image_url}
                              alt={adventure.name}
                              fill
                              className="object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                          </>
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-amber-900/30 to-gray-900 flex items-center justify-center">
                            <Compass className="w-10 h-10 text-amber-400/30" />
                          </div>
                        )}
                        <div className="absolute top-2 left-2">
                          <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Adventure
                          </span>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <h4 className="font-semibold text-white text-sm line-clamp-2">{adventure.name}</h4>
                          <p className="text-[10px] text-gray-400 mt-1">{adventure.game_system}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Saved Adventures */}
              {savedAdventures.length > 0 && (
                <>
                  <MobileSectionHeader
                    title="Saved"
                    action={
                      <button
                        onClick={() => setActiveTab('collection')}
                        className="text-sm text-amber-400"
                      >
                        View All
                      </button>
                    }
                  />
                  <div className="px-4 space-y-3">
                    {savedAdventures.slice(0, 2).map((save) => (
                      <div
                        key={save.id}
                        className="flex items-center gap-4 p-3 bg-[--bg-surface] rounded-xl border border-white/[0.06]"
                      >
                        <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-900 flex-shrink-0">
                          {save.source_image_url ? (
                            <Image
                              src={save.source_image_url}
                              alt={save.source_name}
                              width={56}
                              height={56}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-900/30 to-gray-900">
                              <Compass className="w-5 h-5 text-amber-400/30" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-white truncate text-sm">{save.source_name}</h4>
                          <p className="text-xs text-gray-500">Saved template</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-600" />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )
        )}

        {/* FAB */}
        <MobileFAB
          icon={<Plus className="w-6 h-6" />}
          onClick={() => onNavigate('/adventures/new')}
          label="New Adventure"
        />
      </MobileLayout>
    </AppLayout>
  )
}

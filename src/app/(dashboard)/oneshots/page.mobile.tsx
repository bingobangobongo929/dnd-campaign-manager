'use client'

import Image from 'next/image'
import {
  Plus,
  Scroll,
  Users,
  Clock,
  Bookmark,
  RotateCcw,
  Play,
  Sparkles,
  ChevronRight,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { MobileLayout, MobileSectionHeader, MobileFAB } from '@/components/mobile'
import { MobileContentModeToggle, TemplateStateBadge, type ContentModeTab } from '@/components/templates'
import type { Oneshot, OneshotGenreTag, OneshotRun, ContentSave } from '@/types/database'

export interface OneshotsPageMobileProps {
  oneshots: Oneshot[]
  savedOneshots: ContentSave[]
  genreTags: OneshotGenreTag[]
  oneshotRuns: Record<string, OneshotRun[]>
  getTagsForOneshot: (oneshot: Oneshot) => OneshotGenreTag[]
  onNavigate: (path: string) => void
  activeTab: ContentModeTab
  setActiveTab: (tab: ContentModeTab) => void
  tabCounts: {
    active: number
    inactive: number
    templates: number
    saved: number
  }
  onReactivate: (oneshotId: string) => void
}

export function OneshotsPageMobile({
  oneshots,
  savedOneshots,
  genreTags,
  oneshotRuns,
  getTagsForOneshot,
  onNavigate,
  activeTab,
  setActiveTab,
  tabCounts,
  onReactivate,
}: OneshotsPageMobileProps) {
  const featuredOneshot = activeTab === 'active' ? oneshots[0] : null

  return (
    <AppLayout>
      <MobileLayout title="One-Shots" showBackButton={false}>
        {/* Tabs */}
        <div className="px-4 pt-2 pb-4">
          <MobileContentModeToggle
            value={activeTab}
            onChange={setActiveTab}
            counts={tabCounts}
            contentType="oneshot"
          />
        </div>

        {/* Saved Oneshots Tab */}
        {activeTab === 'saved' && (
          savedOneshots.length === 0 ? (
            <div className="mobile-empty-state">
              <Bookmark className="mobile-empty-icon" />
              <h3 className="mobile-empty-title">No saved one-shots</h3>
              <p className="mobile-empty-description">One-shot templates you save will appear here</p>
            </div>
          ) : (
            <div className="px-4 grid grid-cols-2 gap-3 pb-20">
              {savedOneshots.map((save) => (
                <div
                  key={save.id}
                  className="relative rounded-xl overflow-hidden bg-gray-900 border border-white/[0.06] aspect-[2/3] flex flex-col"
                >
                  <div className="relative flex-1">
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
                        <Scroll className="w-10 h-10 text-amber-400/30" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-1 text-[10px] bg-amber-500/20 text-amber-300 rounded">Saved</span>
                    </div>
                  </div>
                  <div className="p-3 bg-gray-900">
                    <h4 className="font-semibold text-white text-sm truncate">{save.source_name}</h4>
                    {save.instance_id ? (
                      <button
                        onClick={() => onNavigate(`/oneshots/${save.instance_id}`)}
                        className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg"
                      >
                        <Play className="w-3 h-3" />
                        Continue
                      </button>
                    ) : (
                      <button
                        onClick={() => onNavigate(`/oneshots?startPlaying=${save.id}`)}
                        className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-1.5 bg-amber-600 text-white text-xs font-medium rounded-lg"
                      >
                        <Play className="w-3 h-3" />
                        Start
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Inactive Oneshots Tab */}
        {activeTab === 'inactive' && (
          oneshots.length === 0 ? (
            <div className="mobile-empty-state">
              <Scroll className="mobile-empty-icon opacity-50" />
              <h3 className="mobile-empty-title">No inactive one-shots</h3>
              <p className="mobile-empty-description">Completed or archived one-shots will appear here</p>
            </div>
          ) : (
            <div className="px-4 grid grid-cols-2 gap-3 pb-20">
              {oneshots.map((oneshot) => (
                <div
                  key={oneshot.id}
                  className="relative rounded-xl overflow-hidden bg-gray-900/30 border border-white/[0.04] opacity-75 aspect-[2/3] flex flex-col"
                >
                  <div className="relative flex-1">
                    {oneshot.image_url ? (
                      <>
                        <Image
                          src={oneshot.image_url}
                          alt={oneshot.title}
                          fill
                          className="object-cover grayscale"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent" />
                      </>
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-gray-800/30 to-gray-900 flex items-center justify-center">
                        <Scroll className="w-10 h-10 text-gray-500/30" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2">
                      <TemplateStateBadge mode="inactive" inactiveReason={oneshot.inactive_reason} size="sm" />
                    </div>
                  </div>
                  <div className="p-3 bg-gray-900/50">
                    <h4 className="font-semibold text-gray-400 text-sm truncate">{oneshot.title}</h4>
                    <button
                      onClick={() => onReactivate(oneshot.id)}
                      className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-1.5 bg-white/5 text-gray-300 text-xs font-medium rounded-lg"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reactivate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          oneshots.length === 0 ? (
            <div className="mobile-empty-state">
              <Sparkles className="mobile-empty-icon" />
              <h3 className="mobile-empty-title">No templates</h3>
              <p className="mobile-empty-description">Publish your one-shots as templates to share with others</p>
            </div>
          ) : (
            <div className="px-4 grid grid-cols-2 gap-3 pb-20">
              {oneshots.map((oneshot) => (
                <button
                  key={oneshot.id}
                  onClick={() => onNavigate(`/oneshots/${oneshot.id}?fromTemplate=true`)}
                  className="relative rounded-xl overflow-hidden bg-gray-900 border border-amber-500/20 active:scale-[0.98] transition-transform aspect-[2/3] text-left"
                >
                  {oneshot.image_url ? (
                    <>
                      <Image
                        src={oneshot.image_url}
                        alt={oneshot.title}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-900/30 to-gray-900 flex items-center justify-center">
                      <Scroll className="w-10 h-10 text-amber-400/30" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-purple-400 bg-purple-500/10 rounded-full border border-purple-500/30">
                      <Sparkles className="w-2.5 h-2.5" />
                      Published
                    </span>
                  </div>
                  {oneshot.template_save_count > 0 && (
                    <div className="absolute top-2 right-2">
                      <span className="px-2 py-0.5 text-[10px] font-medium bg-black/60 text-white rounded">
                        {oneshot.template_save_count} saves
                      </span>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h4 className="font-semibold text-white text-sm line-clamp-2">{oneshot.title}</h4>
                    <p className="text-[10px] text-gray-500 mt-1">v{oneshot.template_version || 1}</p>
                  </div>
                </button>
              ))}
            </div>
          )
        )}

        {/* Active Oneshots Tab */}
        {activeTab === 'active' && (
        oneshots.length === 0 ? (
          <div className="mobile-empty-state">
            <Scroll className="mobile-empty-icon" />
            <h3 className="mobile-empty-title">No One-Shots Yet</h3>
            <p className="mobile-empty-description">Create standalone adventures ready to run</p>
            <button
              onClick={() => onNavigate('/oneshots/new')}
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-amber-600 text-white font-medium rounded-xl"
            >
              <Plus className="w-5 h-5" />
              Create One-Shot
            </button>
          </div>
        ) : (
          <div className="space-y-4 pb-20">
            {/* Featured One-Shot */}
            {featuredOneshot && (
              <button
                onClick={() => onNavigate(`/oneshots/${featuredOneshot.id}`)}
                className="w-full mx-4 max-w-[calc(100%-32px)] relative rounded-2xl overflow-hidden bg-gray-900 border border-white/[0.06] active:scale-[0.98] transition-transform"
              >
                <div className="relative h-56">
                  {featuredOneshot.image_url ? (
                    <>
                      <Image
                        src={featuredOneshot.image_url}
                        alt={featuredOneshot.title}
                        fill
                        className="object-cover"
                        priority
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-900/30 to-gray-900 flex items-center justify-center">
                      <Scroll className="w-16 h-16 text-amber-400/30" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider rounded bg-amber-500 text-black">
                        Featured
                      </span>
                      <span className="px-2 py-1 text-[10px] font-medium rounded bg-white/10 text-gray-300">
                        {featuredOneshot.game_system}
                      </span>
                      {getTagsForOneshot(featuredOneshot).slice(0, 2).map(tag => (
                        <span
                          key={tag.id}
                          className="px-2 py-1 text-[10px] font-medium rounded"
                          style={{ backgroundColor: `${tag.color}30`, color: tag.color }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                    <h2 className="text-xl font-display font-bold text-white mb-1">{featuredOneshot.title}</h2>
                    {featuredOneshot.tagline && (
                      <p className="text-xs text-gray-400 italic line-clamp-1">"{featuredOneshot.tagline}"</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {featuredOneshot.player_count_min}-{featuredOneshot.player_count_max}
                      </span>
                      {featuredOneshot.estimated_duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {featuredOneshot.estimated_duration}
                        </span>
                      )}
                      <span className="text-amber-400">Lvl {featuredOneshot.level || '?'}</span>
                    </div>
                  </div>
                </div>
              </button>
            )}

            {/* All One-Shots Grid */}
            {oneshots.length > 1 && (
              <>
                <MobileSectionHeader title="All One-Shots" />
                <div className="px-4 grid grid-cols-2 gap-3">
                  {oneshots.map((oneshot) => (
                    <button
                      key={oneshot.id}
                      onClick={() => onNavigate(`/oneshots/${oneshot.id}`)}
                      className="relative rounded-xl overflow-hidden bg-gray-900 border border-white/[0.06] active:scale-[0.98] transition-transform aspect-[2/3]"
                    >
                      {oneshot.image_url ? (
                        <>
                          <Image
                            src={oneshot.image_url}
                            alt={oneshot.title}
                            fill
                            className="object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                        </>
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/30 to-gray-900 flex items-center justify-center">
                          <Scroll className="w-10 h-10 text-amber-400/30" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <span className="inline-block px-2 py-0.5 text-[9px] font-semibold uppercase rounded bg-amber-500/20 text-amber-300 mb-1">
                          {oneshot.game_system}
                        </span>
                        <h4 className="font-semibold text-white text-sm line-clamp-2">{oneshot.title}</h4>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500">
                          <span>Lvl {oneshot.level || '?'}</span>
                          <span>•</span>
                          <span>{oneshot.player_count_min}-{oneshot.player_count_max}p</span>
                        </div>
                      </div>
                      {oneshotRuns[oneshot.id]?.length > 0 && (
                        <div className="absolute top-2 right-2">
                          <span className="px-2 py-0.5 text-[10px] font-medium bg-black/60 text-white rounded">
                            {oneshotRuns[oneshot.id].length}x
                          </span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )
        )}

        {/* FAB for new one-shot */}
        <MobileFAB
          icon={<Plus className="w-6 h-6" />}
          onClick={() => onNavigate('/oneshots/new')}
          label="New One-Shot"
        />
      </MobileLayout>
    </AppLayout>
  )
}

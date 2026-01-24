'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  Plus,
  Scroll,
  Users,
  Clock,
  Play,
  Sparkles,
  ChevronRight,
  Loader2,
  Bookmark,
  RotateCcw,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { BackToTopButton } from '@/components/ui/back-to-top'
import { OneshotsPageMobile } from './page.mobile'
import { useSupabase, useUser, useIsMobile } from '@/hooks'
import { formatDate } from '@/lib/utils'
import type { Oneshot, OneshotGenreTag, OneshotRun, ContentSave } from '@/types/database'
import { TemplateStateBadge } from '@/components/templates'
import { TabNavigation, ONESHOTS_TABS, type ContentTab } from '@/components/navigation'

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

export default function OneshotsPage() {
  const router = useRouter()
  const supabase = useSupabase()
  const { user, loading: userLoading } = useUser()
  const isMobile = useIsMobile()

  const [oneshots, setOneshots] = useState<Oneshot[]>([])
  const [savedOneshots, setSavedOneshots] = useState<ContentSave[]>([])
  const [templateSnapshots, setTemplateSnapshots] = useState<TemplateSnapshot[]>([])
  const [genreTags, setGenreTags] = useState<OneshotGenreTag[]>([])
  const [oneshotRuns, setOneshotRuns] = useState<Record<string, OneshotRun[]>>({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<ContentTab>('all')
  const [subFilter, setSubFilter] = useState<ContentTab>('running')

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    // Load one-shots
    const { data: oneshotsData } = await supabase
      .from('oneshots')
      .select('*')
      .eq('user_id', user!.id)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })

    if (oneshotsData) {
      setOneshots(oneshotsData)

      // Load runs for each oneshot
      const runsMap: Record<string, OneshotRun[]> = {}
      for (const oneshot of oneshotsData) {
        const { data: runsData } = await supabase
          .from('oneshot_runs')
          .select('*')
          .eq('oneshot_id', oneshot.id)
          .order('run_date', { ascending: false })

        if (runsData) {
          runsMap[oneshot.id] = runsData
        }
      }
      setOneshotRuns(runsMap)
    }

    // Load genre tags
    const { data: tagsData } = await supabase
      .from('oneshot_genre_tags')
      .select('*')
      .eq('user_id', user!.id)
      .order('sort_order')

    if (tagsData) {
      setGenreTags(tagsData)
    }

    // Load template snapshots (My Templates tab)
    const { data: snapshotsData } = await supabase
      .from('template_snapshots')
      .select('*')
      .eq('user_id', user!.id)
      .eq('content_type', 'oneshot')
      .order('published_at', { ascending: false })

    if (snapshotsData) {
      setTemplateSnapshots(snapshotsData)
    }

    // Load saved oneshots from others
    const savedResponse = await fetch('/api/templates/saved?type=oneshot')
    if (savedResponse.ok) {
      const savedData = await savedResponse.json()
      setSavedOneshots(savedData.saves || [])
    }

    setLoading(false)
  }

  // Filter oneshots by active status
  const activeOneshots = oneshots.filter(o => o.content_mode === 'active' || !o.content_mode)
  const inactiveOneshots = oneshots.filter(o => o.content_mode === 'inactive')

  // Group snapshots by content_id to get unique templates
  const uniqueTemplateContentIds = new Set(templateSnapshots.map(s => s.content_id))

  // Get counts for tabs
  const tabCounts = {
    all: activeOneshots.length + inactiveOneshots.length + templateSnapshots.length + savedOneshots.length,
    active: activeOneshots.length,
    'my-work': templateSnapshots.length + oneshots.filter(o => o.content_mode === 'inactive').length,
    collection: savedOneshots.length,
  }

  // Create tabs with counts
  const tabsWithCounts = ONESHOTS_TABS.map(tab => ({
    ...tab,
    count: tabCounts[tab.value as keyof typeof tabCounts] ?? 0,
    subFilters: tab.subFilters?.map(sf => ({
      ...sf,
      count: sf.value === 'running' ? activeOneshots.length : 0,
    })),
  }))

  const handleReactivate = async (oneshotId: string) => {
    const response = await fetch('/api/content/reactivate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contentType: 'oneshot',
        contentId: oneshotId,
      }),
    })

    if (response.ok) {
      loadData()
    }
  }

  const getTagsForOneshot = (oneshot: Oneshot) => {
    return genreTags.filter(tag => oneshot.genre_tag_ids?.includes(tag.id))
  }

  if (userLoading || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-10 h-10 animate-spin text-purple-400" />
        </div>
      </AppLayout>
    )
  }

  const featuredOneshot = activeOneshots[0] || null

  // ============ MOBILE LAYOUT ============
  if (isMobile) {
    return (
      <OneshotsPageMobile
        oneshots={activeOneshots}
        inactiveOneshots={inactiveOneshots}
        savedOneshots={savedOneshots}
        templateSnapshots={templateSnapshots}
        genreTags={genreTags}
        oneshotRuns={oneshotRuns}
        getTagsForOneshot={getTagsForOneshot}
        onNavigate={(path) => router.push(path)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        tabsWithCounts={tabsWithCounts}
        onReactivate={handleReactivate}
      />
    )
  }

  // ============ DESKTOP LAYOUT ============
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-white">One-Shot Adventures</h1>
            <p className="text-gray-400 mt-1">Standalone adventures ready to run</p>
          </div>
          <Link
            href="/oneshots/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl transition-colors"
          >
            <Plus className="w-5 h-5" />
            New One-Shot
          </Link>
        </div>

        {/* Tabs */}
        <TabNavigation
          value={activeTab}
          onChange={setActiveTab}
          tabs={tabsWithCounts}
          subFilter={subFilter}
          onSubFilterChange={setSubFilter}
        />

        {/* Collection Tab (Saved) */}
        {activeTab === 'collection' && (
          <div className="space-y-6">
            {savedOneshots.length === 0 ? (
              <div className="text-center py-16 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                <Bookmark className="w-12 h-12 mx-auto mb-4 text-amber-400/50" />
                <h3 className="text-lg font-medium text-white mb-2">No saved one-shots yet</h3>
                <p className="text-gray-400 max-w-sm mx-auto">
                  When you save one-shot templates from share links, they'll appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                {savedOneshots.map((save) => (
                  <div
                    key={save.id}
                    className="relative rounded-xl overflow-hidden bg-gray-900/50 border border-white/[0.06] hover:border-amber-500/40 transition-all aspect-[2/3] flex flex-col"
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
                          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
                        </>
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/30 to-gray-900 flex items-center justify-center">
                          <Scroll className="w-12 h-12 text-amber-400/30" />
                        </div>
                      )}
                      <div className="absolute top-3 left-3">
                        <span className="px-2 py-1 text-[10px] font-semibold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Saved
                        </span>
                      </div>
                    </div>
                    <div className="p-4 bg-gray-900">
                      <h4 className="font-semibold text-white text-sm truncate">
                        {save.source_name}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        v{save.saved_version}
                      </p>
                      {save.instance_id ? (
                        <button
                          onClick={() => router.push(`/oneshots/${save.instance_id}`)}
                          className="mt-3 flex items-center justify-center gap-2 w-full px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          <Play className="w-3 h-3" />
                          Continue
                        </button>
                      ) : (
                        <button
                          onClick={() => router.push(`/oneshots?startPlaying=${save.id}`)}
                          className="mt-3 flex items-center justify-center gap-2 w-full px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          <Play className="w-3 h-3" />
                          Start
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* My Work Tab - Drafts and Templates */}
        {activeTab === 'my-work' && (
          <div className="space-y-8">
            {/* Drafts Section */}
            {inactiveOneshots.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold text-white mb-4">Drafts</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                  {inactiveOneshots.map((oneshot) => (
                    <div
                      key={oneshot.id}
                      className="group relative rounded-xl overflow-hidden bg-gray-900/30 border border-white/[0.04] opacity-75 hover:opacity-100 transition-all aspect-[2/3] flex flex-col"
                    >
                      <div className="relative flex-1">
                        {oneshot.image_url ? (
                          <>
                            <Image
                              src={oneshot.image_url}
                              alt={oneshot.title}
                              fill
                              className="object-cover grayscale group-hover:grayscale-0 transition-all"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
                          </>
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-gray-800/30 to-gray-900 flex items-center justify-center">
                            <Scroll className="w-12 h-12 text-gray-500/30" />
                          </div>
                        )}
                        <div className="absolute top-3 left-3">
                          <TemplateStateBadge mode="inactive" inactiveReason={oneshot.inactive_reason} size="sm" />
                        </div>
                      </div>
                      <div className="p-4 bg-gray-900/50">
                        <h4 className="font-semibold text-gray-300 text-sm truncate">
                          {oneshot.title}
                        </h4>
                        <button
                          onClick={() => handleReactivate(oneshot.id)}
                          className="mt-3 flex items-center justify-center gap-2 w-full px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium rounded-lg transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Reactivate
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* My Templates Section */}
            {templateSnapshots.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold text-white mb-4">My Templates</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                  {templateSnapshots.map((snapshot) => {
                    const snapshotData = snapshot.snapshot_data || {}
                    const oneshot = oneshots.find(o => o.id === snapshot.content_id)
                    const imageUrl = snapshotData.image_url || oneshot?.image_url
                    const title = snapshotData.title || oneshot?.title || 'Untitled'

                    return (
                      <Link
                        key={snapshot.id}
                        href={`/oneshots/${snapshot.content_id}?fromTemplate=true`}
                        className="group relative rounded-xl overflow-hidden bg-gray-900/50 border border-green-500/20 hover:border-green-500/40 transition-all aspect-[2/3]"
                      >
                        {imageUrl ? (
                          <>
                            <Image
                              src={imageUrl}
                              alt={title}
                              fill
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                          </>
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-green-900/30 to-gray-900 flex items-center justify-center">
                            <Scroll className="w-16 h-16 text-green-400/30" />
                          </div>
                        )}
                        <div className="absolute top-3 left-3 flex gap-2">
                          {snapshot.is_public ? (
                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Public
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-gray-500/20 text-gray-300 border border-gray-500/30">
                              Private
                            </span>
                          )}
                        </div>
                        {snapshot.save_count > 0 && (
                          <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg text-xs text-gray-300">
                            {snapshot.save_count} saves
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <h4 className="font-semibold text-white text-sm line-clamp-2 group-hover:text-green-300 transition-colors">
                            {title}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">
                            v{snapshot.version}
                            {snapshot.version_name && ` "${snapshot.version_name}"`}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            Published {formatDate(snapshot.published_at)}
                          </p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Empty state */}
            {inactiveOneshots.length === 0 && templateSnapshots.length === 0 && (
              <div className="text-center py-16 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                <Sparkles className="w-12 h-12 mx-auto mb-4 text-green-400/50" />
                <h3 className="text-lg font-medium text-white mb-2">No work in progress</h3>
                <p className="text-gray-400 max-w-sm mx-auto">
                  Drafts and templates you create will appear here.
                </p>
              </div>
            )}
          </div>
        )}

        {/* All Tab - Overview */}
        {activeTab === 'all' && (
          <div className="space-y-8">
            {/* Active One-Shots */}
            {activeOneshots.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold text-white mb-4">Active One-Shots</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                  {activeOneshots.slice(0, 5).map((oneshot) => (
                    <Link
                      key={oneshot.id}
                      href={`/oneshots/${oneshot.id}`}
                      className="group relative rounded-xl overflow-hidden bg-gray-900/50 border border-white/[0.06] hover:border-green-500/40 transition-all aspect-[2/3]"
                    >
                      {oneshot.image_url ? (
                        <>
                          <Image
                            src={oneshot.image_url}
                            alt={oneshot.title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                        </>
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-green-900/30 to-gray-900 flex items-center justify-center">
                          <Scroll className="w-16 h-16 text-green-400/30" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <span className="inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-green-500/20 text-green-300 mb-2">
                          {oneshot.game_system}
                        </span>
                        <h4 className="font-semibold text-white text-sm line-clamp-2 group-hover:text-green-300 transition-colors">
                          {oneshot.title}
                        </h4>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Saved Templates */}
            {savedOneshots.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold text-white mb-4">Saved from Community</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                  {savedOneshots.slice(0, 5).map((save) => (
                    <div
                      key={save.id}
                      className="relative rounded-xl overflow-hidden bg-gray-900/50 border border-white/[0.06] hover:border-green-500/40 transition-all aspect-[2/3] flex flex-col"
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
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
                          </>
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-green-900/30 to-gray-900 flex items-center justify-center">
                            <Scroll className="w-12 h-12 text-green-400/30" />
                          </div>
                        )}
                      </div>
                      <div className="p-4 bg-gray-900">
                        <h4 className="font-semibold text-white text-sm truncate">
                          {save.source_name}
                        </h4>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Empty state */}
            {activeOneshots.length === 0 && savedOneshots.length === 0 && (
              <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-green-900/20 via-gray-900 to-gray-950 border border-white/[0.06] p-16 text-center">
                <Scroll className="w-20 h-20 mx-auto mb-6 text-green-400/50" />
                <h2 className="text-2xl font-display font-bold text-white mb-3">
                  No One-Shots Yet
                </h2>
                <p className="text-gray-400 mb-8 max-w-md mx-auto">
                  Create your first one-shot adventure. Perfect for introducing new players or running a quick session.
                </p>
                <Link
                  href="/oneshots/new"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-medium rounded-xl transition-colors"
                >
                  <Sparkles className="w-5 h-5" />
                  Create Your First One-Shot
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Active Oneshots Tab */}
        {activeTab === 'active' && (
        activeOneshots.length === 0 ? (
          /* Empty State */
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-green-900/20 via-gray-900 to-gray-950 border border-white/[0.06] p-16 text-center">
            <Scroll className="w-20 h-20 mx-auto mb-6 text-green-400/50" />
            <h2 className="text-2xl font-display font-bold text-white mb-3">
              No One-Shots Yet
            </h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              Create your first one-shot adventure. Perfect for introducing new players or running a quick session.
            </p>
            <Link
              href="/oneshots/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-medium rounded-xl transition-colors"
            >
              <Sparkles className="w-5 h-5" />
              Create Your First One-Shot
            </Link>
          </div>
        ) : (
          <>
            {/* Featured One-Shot (Hero) */}
            {featuredOneshot && (
              <section>
                <Link
                  href={`/oneshots/${featuredOneshot.id}`}
                  className="group relative block rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-950 border border-white/[0.06] hover:border-green-500/30 transition-all duration-500"
                >
                  <div className="relative h-[350px] md:h-[450px]">
                    {featuredOneshot.image_url ? (
                      <>
                        <Image
                          src={featuredOneshot.image_url}
                          alt={featuredOneshot.title}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                          priority
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />
                      </>
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-green-900/30 via-gray-900 to-gray-950 flex items-center justify-center">
                        <Scroll className="w-32 h-32 text-green-400/20" />
                      </div>
                    )}

                    {/* Content Overlay */}
                    <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-12">
                      {/* Genre Tags */}
                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-green-500 text-black">
                          Featured
                        </span>
                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-white/10 text-gray-300">
                          {featuredOneshot.game_system}
                        </span>
                        {getTagsForOneshot(featuredOneshot).slice(0, 3).map(tag => (
                          <span
                            key={tag.id}
                            className="px-2.5 py-1 text-xs font-medium rounded-full"
                            style={{ backgroundColor: `${tag.color}30`, color: tag.color }}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>

                      <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-3 group-hover:text-green-400 transition-colors">
                        {featuredOneshot.title}
                      </h2>

                      {featuredOneshot.tagline && (
                        <p className="text-gray-300 text-lg md:text-xl max-w-2xl mb-4 italic">
                          "{featuredOneshot.tagline}"
                        </p>
                      )}

                      {/* Meta Info */}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-4">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-4 h-4" />
                          {featuredOneshot.player_count_min}-{featuredOneshot.player_count_max} players
                        </span>
                        {featuredOneshot.estimated_duration && (
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            {featuredOneshot.estimated_duration}
                          </span>
                        )}
                        <span className="text-green-400">
                          Level {featuredOneshot.level || '?'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-2 text-green-400 font-medium">
                          <Play className="w-5 h-5" />
                          Open Adventure
                          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </span>
                        {oneshotRuns[featuredOneshot.id]?.length > 0 && (
                          <span className="text-sm text-gray-500">
                            Run {oneshotRuns[featuredOneshot.id].length} time{oneshotRuns[featuredOneshot.id].length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </section>
            )}

            {/* One-Shot Gallery (Movie Posters) */}
            {activeOneshots.length > 1 && (
              <section>
                <h3 className="text-xl font-semibold text-white mb-6">All One-Shots</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                  {activeOneshots.map((oneshot) => (
                    <Link
                      key={oneshot.id}
                      href={`/oneshots/${oneshot.id}`}
                      className="group relative rounded-xl overflow-hidden bg-gray-900/50 border border-white/[0.06] hover:border-green-500/40 transition-all aspect-[2/3]"
                    >
                      {oneshot.image_url ? (
                        <>
                          <Image
                            src={oneshot.image_url}
                            alt={oneshot.title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                        </>
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-green-900/30 to-gray-900 flex items-center justify-center">
                          <Scroll className="w-16 h-16 text-green-400/30" />
                        </div>
                      )}

                      {/* Genre tag at top */}
                      {getTagsForOneshot(oneshot)[0] && (
                        <div className="absolute top-3 left-3">
                          <span
                            className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded"
                            style={{
                              backgroundColor: `${getTagsForOneshot(oneshot)[0].color}40`,
                              color: getTagsForOneshot(oneshot)[0].color
                            }}
                          >
                            {getTagsForOneshot(oneshot)[0].name}
                          </span>
                        </div>
                      )}

                      {/* Run count badge */}
                      {oneshotRuns[oneshot.id]?.length > 0 && (
                        <div className="absolute top-3 right-3">
                          <span className="px-2 py-0.5 text-[10px] font-medium bg-black/60 text-white rounded">
                            {oneshotRuns[oneshot.id].length}x run
                          </span>
                        </div>
                      )}

                      {/* Content at bottom */}
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <span className="inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-green-500/20 text-green-300 mb-2">
                          {oneshot.game_system}
                        </span>
                        <h4 className="font-semibold text-white text-sm line-clamp-2 group-hover:text-green-300 transition-colors">
                          {oneshot.title}
                        </h4>
                        {oneshot.tagline && (
                          <p className="text-[11px] text-gray-400 mt-1 line-clamp-1 italic">
                            {oneshot.tagline}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-500">
                          <span>Lvl {oneshot.level || '?'}</span>
                          <span>•</span>
                          <span>{oneshot.player_count_min}-{oneshot.player_count_max} players</span>
                        </div>
                      </div>
                    </Link>
                  ))}

                  {/* Create New Card */}
                  <Link
                    href="/oneshots/new"
                    className="group relative rounded-xl overflow-hidden bg-gradient-to-br from-green-900/10 to-gray-900/50 border-2 border-dashed border-green-500/20 hover:border-green-500/50 transition-all aspect-[2/3] flex flex-col items-center justify-center gap-4"
                  >
                    <div className="p-4 rounded-full bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                      <Plus className="w-8 h-8 text-green-400" />
                    </div>
                    <span className="text-sm font-medium text-green-400">Create New</span>
                  </Link>
                </div>
              </section>
            )}

            {/* Single oneshot - show create prompt */}
            {activeOneshots.length === 1 && (
              <section>
                <div className="flex flex-col items-center justify-center py-12 bg-white/[0.015] border border-dashed border-white/[0.08] rounded-xl">
                  <p className="text-gray-400 mb-4">Looking good! Add more adventures to your collection.</p>
                  <Link
                    href="/oneshots/new"
                    className="flex items-center gap-2 px-4 py-2 bg-green-600/80 hover:bg-green-500 text-white font-medium rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create Another One-Shot
                  </Link>
                </div>
              </section>
            )}
          </>
        )
        )}
      </div>
      <BackToTopButton />
    </AppLayout>
  )
}

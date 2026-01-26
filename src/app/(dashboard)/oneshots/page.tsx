'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  Settings,
  Crown,
  Edit,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { BackToTopButton } from '@/components/ui/back-to-top'
import { ContentBadge, PageCustomizeModal } from '@/components/ui'
import type { TabConfig as ModalTabConfig, PagePreferences } from '@/components/ui/PageCustomizeModal'
import { getOneshotBadge } from '@/lib/content-badges'
import { OneshotsPageMobile } from './page.mobile'
import { useSupabase, useUser, useIsMobile } from '@/hooks'
import { formatDate } from '@/lib/utils'
import type { Oneshot, OneshotGenreTag, OneshotRun, ContentSave, OneshotsPageTabId, OneshotsPagePreferences } from '@/types/database'
import { DEFAULT_ONESHOTS_PAGE_PREFERENCES } from '@/types/database'
import { TemplateStateBadge } from '@/components/templates'
import { TabNavigation, ONESHOTS_TABS, type ContentTab } from '@/components/navigation'

// Tab configuration for customize modal
const ONESHOTS_TAB_CONFIG: ModalTabConfig<OneshotsPageTabId>[] = [
  { id: 'all', label: 'All', icon: <Scroll className="w-4 h-4" />, color: 'text-gray-400' },
  { id: 'participating', label: 'Participating', icon: <Users className="w-4 h-4" />, color: 'text-purple-400' },
  { id: 'running', label: 'Running', icon: <Crown className="w-4 h-4" />, color: 'text-orange-400' },
  { id: 'my-work', label: 'My Work', icon: <Edit className="w-4 h-4" />, color: 'text-amber-400' },
  { id: 'collection', label: 'Collection', icon: <Bookmark className="w-4 h-4" />, color: 'text-emerald-400' },
  { id: 'discover', label: 'Discover', icon: <Sparkles className="w-4 h-4" />, color: 'text-purple-400', comingSoon: true },
]

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
  const searchParams = useSearchParams()
  const supabase = useSupabase()
  const { user, loading: userLoading } = useUser()
  const isMobile = useIsMobile()

  // Page preferences
  const [preferences, setPreferences] = useState<OneshotsPagePreferences>(DEFAULT_ONESHOTS_PAGE_PREFERENCES)
  const [customizeModalOpen, setCustomizeModalOpen] = useState(false)

  const initialTab = (searchParams.get('tab') as ContentTab) || preferences.default_tab || 'all'
  const initialFilter = (searchParams.get('filter') as ContentTab) || 'drafts'

  const [oneshots, setOneshots] = useState<Oneshot[]>([])
  const [participatingRuns, setParticipatingRuns] = useState<OneshotRun[]>([])
  const [savedOneshots, setSavedOneshots] = useState<ContentSave[]>([])
  const [templateSnapshots, setTemplateSnapshots] = useState<TemplateSnapshot[]>([])
  const [genreTags, setGenreTags] = useState<OneshotGenreTag[]>([])
  const [oneshotRuns, setOneshotRuns] = useState<Record<string, OneshotRun[]>>({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<ContentTab>(initialTab)
  const [subFilter, setSubFilter] = useState<ContentTab>(initialFilter)

  useEffect(() => {
    if (user) {
      loadPreferences()
      loadData()
    }
  }, [user])

  const loadPreferences = async () => {
    const { data } = await supabase
      .from('user_settings')
      .select('oneshots_page_preferences')
      .eq('user_id', user!.id)
      .single()

    if (data?.oneshots_page_preferences) {
      setPreferences(data.oneshots_page_preferences as OneshotsPagePreferences)
      if (!searchParams.get('tab')) {
        setActiveTab((data.oneshots_page_preferences as OneshotsPagePreferences).default_tab as ContentTab || 'all')
      }
    }
  }

  const savePreferences = async (newPrefs: PagePreferences<OneshotsPageTabId>) => {
    const prefs = newPrefs as OneshotsPagePreferences
    setPreferences(prefs)

    await supabase
      .from('user_settings')
      .upsert({
        user_id: user!.id,
        oneshots_page_preferences: prefs,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      })
  }

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
  const publishedSnapshots = templateSnapshots.filter(s => s.is_public)
  const privateSnapshots = templateSnapshots.filter(s => !s.is_public)

  // Group snapshots by content_id to get unique templates
  const uniqueTemplateContentIds = new Set(templateSnapshots.map(s => s.content_id))

  // Tab counts
  const tabCounts: Record<OneshotsPageTabId, number> = {
    all: oneshots.length + participatingRuns.length,
    participating: participatingRuns.length,
    running: activeOneshots.length,
    'my-work': inactiveOneshots.length + uniqueTemplateContentIds.size,
    collection: savedOneshots.length,
    discover: 0,
  }

  // Build tabs with counts - filtered by preferences
  const tabsWithCounts = useMemo(() => {
    const orderedTabIds = preferences.auto_order
      ? [...(preferences.tab_order || ONESHOTS_TABS.map(t => t.value as OneshotsPageTabId))]
          .sort((a, b) => {
            const tabA = ONESHOTS_TABS.find(t => t.value === a)
            const tabB = ONESHOTS_TABS.find(t => t.value === b)
            if (tabA?.comingSoon && !tabB?.comingSoon) return 1
            if (!tabA?.comingSoon && tabB?.comingSoon) return -1
            const countA = tabCounts[a] || 0
            const countB = tabCounts[b] || 0
            if (countA === 0 && countB > 0) return 1
            if (countA > 0 && countB === 0) return -1
            return countB - countA
          })
      : preferences.tab_order || ONESHOTS_TABS.map(t => t.value as OneshotsPageTabId)

    return orderedTabIds
      .filter(id => !preferences.hidden_tabs.includes(id))
      .map(id => {
        const tab = ONESHOTS_TABS.find(t => t.value === id)
        if (!tab) return null

        const subFilters = tab.subFilters?.map(sf => {
          let sfCount: number | undefined
          if (sf.value === 'drafts') sfCount = inactiveOneshots.length
          else if (sf.value === 'my-templates') sfCount = privateSnapshots.length
          else if (sf.value === 'published') sfCount = publishedSnapshots.length
          return { ...sf, count: sfCount }
        })

        return { ...tab, count: tabCounts[id as OneshotsPageTabId], subFilters }
      })
      .filter(Boolean) as typeof ONESHOTS_TABS
  }, [preferences, tabCounts, inactiveOneshots.length, privateSnapshots.length, publishedSnapshots.length])

  // Get hero oneshot based on active tab
  const getHeroOneshot = () => {
    if (activeTab === 'all' || activeTab === 'running') {
      return activeOneshots[0] || null
    }
    // For participating tab, we'd need to get from participatingRuns
    return null
  }
  const heroOneshot = getHeroOneshot()

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
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCustomizeModalOpen(true)}
              className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1] text-gray-400 hover:text-white transition-all"
              title="Customize page"
            >
              <Settings className="w-5 h-5" />
            </button>
            <Link
              href="/oneshots/new"
              className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl transition-colors"
            >
              <Plus className="w-5 h-5" />
              New One-Shot
            </Link>
          </div>
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
              <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-amber-900/20 via-gray-900 to-gray-950 border border-white/[0.06] p-16 text-center">
                <Edit className="w-20 h-20 mx-auto mb-6 text-amber-400/50" />
                <h2 className="text-2xl font-display font-bold text-white mb-3">
                  Your Creative Workshop
                </h2>
                <p className="text-gray-400 mb-8 max-w-md mx-auto">
                  Drafts and templates you're working on will appear here. When you're ready to publish
                  a one-shot for others to use, it'll live in your workshop first.
                </p>
                <Link
                  href="/oneshots/new"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-xl transition-colors"
                >
                  <Sparkles className="w-5 h-5" />
                  Start Creating
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Participating Tab - One-shots you're playing in */}
        {activeTab === 'participating' && (
          participatingRuns.length === 0 ? (
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-purple-900/20 via-gray-900 to-gray-950 border border-white/[0.06] p-16 text-center">
              <Users className="w-20 h-20 mx-auto mb-6 text-purple-400/50" />
              <h2 className="text-2xl font-display font-bold text-white mb-3">
                Your Adventures Await
              </h2>
              <p className="text-gray-400 mb-8 max-w-md mx-auto">
                One-shots you've joined will appear here. When a DM invites you to their adventure,
                you'll be able to track your character and stay connected with your party.
              </p>
              <div className="flex items-center justify-center gap-4">
                <Link
                  href="/oneshots"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white/[0.05] hover:bg-white/[0.08] text-gray-300 font-medium rounded-xl transition-colors"
                >
                  Browse One-Shots
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Hero - Most Recent Participating Run */}
              {participatingRuns[0] && (
                <section>
                  <Link
                    href={`/oneshots/${participatingRuns[0].oneshot_id}/run/${participatingRuns[0].id}`}
                    className="group relative block rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-950 border border-white/[0.06] hover:border-purple-500/30 transition-all duration-500"
                  >
                    <div className="relative h-[350px] md:h-[400px]">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-gray-900 to-gray-950 flex items-center justify-center">
                        <Scroll className="w-32 h-32 text-purple-400/20" />
                      </div>
                      <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-12">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            Participating
                          </span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-3 group-hover:text-purple-400 transition-colors">
                          {participatingRuns[0].group_name || 'One-Shot Run'}
                        </h2>
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-2 text-purple-400 font-medium">
                            <Play className="w-5 h-5" />
                            Continue Adventure
                            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </section>
              )}

              {/* Participating Runs Grid */}
              {participatingRuns.length > 0 && (
                <section>
                  <h3 className="text-xl font-semibold text-white mb-6">All Participating Runs</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                    {participatingRuns.map((run) => (
                      <Link
                        key={run.id}
                        href={`/oneshots/${run.oneshot_id}/run/${run.id}`}
                        className="group relative rounded-xl overflow-hidden bg-gray-900/50 border border-white/[0.06] hover:border-purple-500/40 transition-all aspect-[2/3]"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 to-gray-900 flex items-center justify-center">
                          <Scroll className="w-16 h-16 text-purple-400/30" />
                        </div>
                        <div className="absolute top-3 left-3">
                          <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            Player
                          </span>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <h4 className="font-semibold text-white text-sm line-clamp-2 group-hover:text-purple-300 transition-colors">
                            {run.group_name || 'One-Shot Run'}
                          </h4>
                          {run.run_date && (
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDate(run.run_date)}
                            </p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )
        )}

        {/* Running Tab - One-shots you're running as DM */}
        {activeTab === 'running' && (
          activeOneshots.length === 0 ? (
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-orange-900/20 via-gray-900 to-gray-950 border border-white/[0.06] p-16 text-center">
              <Crown className="w-20 h-20 mx-auto mb-6 text-orange-400/50" />
              <h2 className="text-2xl font-display font-bold text-white mb-3">
                Ready to Run Your Own Game?
              </h2>
              <p className="text-gray-400 mb-8 max-w-md mx-auto">
                When you're ready to be the Game Master, this is where the magic happens.
                Create a one-shot adventure and invite your players for a standalone session.
              </p>
              <Link
                href="/oneshots/new"
                className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white font-medium rounded-xl transition-colors"
              >
                <Sparkles className="w-5 h-5" />
                Create Your First One-Shot
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Hero - Most Recent Running One-Shot */}
              {activeOneshots[0] && (
                <section>
                  <Link
                    href={`/oneshots/${activeOneshots[0].id}`}
                    className="group relative block rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-950 border border-white/[0.06] hover:border-orange-500/30 transition-all duration-500"
                  >
                    <div className="relative h-[350px] md:h-[450px]">
                      {activeOneshots[0].image_url ? (
                        <>
                          <Image
                            src={activeOneshots[0].image_url}
                            alt={activeOneshots[0].title}
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                            priority
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />
                        </>
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-900/30 via-gray-900 to-gray-950 flex items-center justify-center">
                          <Scroll className="w-32 h-32 text-orange-400/20" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-12">
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                            Running
                          </span>
                          <span className="px-3 py-1 text-xs font-medium rounded-full bg-white/10 text-gray-300">
                            {activeOneshots[0].game_system}
                          </span>
                          {getTagsForOneshot(activeOneshots[0]).slice(0, 3).map(tag => (
                            <span
                              key={tag.id}
                              className="px-2.5 py-1 text-xs font-medium rounded-full"
                              style={{ backgroundColor: `${tag.color}30`, color: tag.color }}
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                        <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-3 group-hover:text-orange-400 transition-colors">
                          {activeOneshots[0].title}
                        </h2>
                        {activeOneshots[0].tagline && (
                          <p className="text-gray-300 text-lg md:text-xl max-w-2xl mb-4 italic">
                            "{activeOneshots[0].tagline}"
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-4">
                          <span className="flex items-center gap-1.5">
                            <Users className="w-4 h-4" />
                            {activeOneshots[0].player_count_min}-{activeOneshots[0].player_count_max} players
                          </span>
                          {activeOneshots[0].estimated_duration && (
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-4 h-4" />
                              {activeOneshots[0].estimated_duration}
                            </span>
                          )}
                          <span className="text-orange-400">
                            Level {activeOneshots[0].level || '?'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-2 text-orange-400 font-medium">
                            <Play className="w-5 h-5" />
                            Open Adventure
                            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                          </span>
                          {oneshotRuns[activeOneshots[0].id]?.length > 0 && (
                            <span className="text-sm text-gray-500">
                              Run {oneshotRuns[activeOneshots[0].id].length} time{oneshotRuns[activeOneshots[0].id].length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </section>
              )}

              {/* Running One-Shots Grid */}
              {activeOneshots.length > 0 && (
                <section>
                  <h3 className="text-xl font-semibold text-white mb-6">All Running One-Shots</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                    {activeOneshots.map((oneshot) => {
                      const badge = getOneshotBadge(oneshot, user?.id || '')
                      return (
                        <Link
                          key={oneshot.id}
                          href={`/oneshots/${oneshot.id}`}
                          className="group relative rounded-xl overflow-hidden bg-gray-900/50 border border-white/[0.06] hover:border-orange-500/40 transition-all aspect-[2/3]"
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
                            <div className="absolute inset-0 bg-gradient-to-br from-orange-900/30 to-gray-900 flex items-center justify-center">
                              <Scroll className="w-16 h-16 text-orange-400/30" />
                            </div>
                          )}
                          <div className="absolute top-3 left-3">
                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">
                              Running
                            </span>
                          </div>
                          {oneshotRuns[oneshot.id]?.length > 0 && (
                            <div className="absolute top-3 right-3">
                              <span className="px-2 py-0.5 text-[10px] font-medium bg-black/60 text-white rounded">
                                {oneshotRuns[oneshot.id].length}x run
                              </span>
                            </div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 p-4">
                            <span className="inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-orange-500/20 text-orange-300 mb-2">
                              {oneshot.game_system}
                            </span>
                            <h4 className="font-semibold text-white text-sm line-clamp-2 group-hover:text-orange-300 transition-colors">
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
                      )
                    })}

                    {/* Create New Card */}
                    <Link
                      href="/oneshots/new"
                      className="group relative rounded-xl overflow-hidden bg-gradient-to-br from-orange-900/10 to-gray-900/50 border-2 border-dashed border-orange-500/20 hover:border-orange-500/50 transition-all aspect-[2/3] flex flex-col items-center justify-center gap-4"
                    >
                      <div className="p-4 rounded-full bg-orange-500/10 group-hover:bg-orange-500/20 transition-colors">
                        <Plus className="w-8 h-8 text-orange-400" />
                      </div>
                      <span className="text-sm font-medium text-orange-400">Create New</span>
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
                      className="flex items-center gap-2 px-4 py-2 bg-orange-600/80 hover:bg-orange-500 text-white font-medium rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Create Another One-Shot
                    </Link>
                  </div>
                </section>
              )}
            </div>
          )
        )}

        {/* All Tab - Overview */}
        {activeTab === 'all' && (
          <div className="space-y-8">
            {/* Hero One-Shot */}
            {heroOneshot && (
              <section className="group relative">
                <Link
                  href={`/oneshots/${heroOneshot.id}`}
                  className="relative block rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-950 border border-white/[0.06] hover:border-green-500/30 transition-all duration-500"
                >
                  <div className="relative h-[300px] md:h-[380px] overflow-hidden">
                    {heroOneshot.image_url ? (
                      <>
                        <Image
                          src={heroOneshot.image_url}
                          alt={heroOneshot.title}
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
                    <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-10">
                      <div className="flex items-center gap-2 mb-3">
                        <ContentBadge
                          variant={getOneshotBadge(heroOneshot, user?.id || '').primary}
                          size="lg"
                          progress={getOneshotBadge(heroOneshot, user?.id || '').progress}
                        />
                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-white/10 text-gray-300">
                          {heroOneshot.game_system}
                        </span>
                      </div>
                      <h2 className="text-2xl md:text-4xl font-display font-bold text-white mb-2 group-hover:text-green-400 transition-colors">
                        {heroOneshot.title}
                      </h2>
                      {heroOneshot.tagline && (
                        <p className="text-gray-300 text-sm md:text-base max-w-2xl line-clamp-2 mb-3 italic">
                          "{heroOneshot.tagline}"
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-4 h-4" />
                          {heroOneshot.player_count_min}-{heroOneshot.player_count_max} players
                        </span>
                        {heroOneshot.estimated_duration && (
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            {heroOneshot.estimated_duration}
                          </span>
                        )}
                        <span className="text-green-400">Level {heroOneshot.level || '?'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-green-400 font-medium">
                        <Play className="w-5 h-5" />
                        <span>Open One-Shot</span>
                        <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </div>
                </Link>
              </section>
            )}

            {/* Active One-Shots */}
            {activeOneshots.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold text-white mb-4">Active One-Shots</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                  {activeOneshots.map((oneshot) => {
                    const badge = getOneshotBadge(oneshot, user?.id || '')
                    return (
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
                        <ContentBadge
                          variant={badge.primary}
                          size="sm"
                          progress={badge.progress}
                          className="absolute top-3 left-3"
                        />
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <span className="inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-green-500/20 text-green-300 mb-2">
                            {oneshot.game_system}
                          </span>
                          <h4 className="font-semibold text-white text-sm line-clamp-2 group-hover:text-green-300 transition-colors">
                            {oneshot.title}
                          </h4>
                        </div>
                      </Link>
                    )
                  })}
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

      </div>

      {/* Page Customize Modal */}
      <PageCustomizeModal
        isOpen={customizeModalOpen}
        onClose={() => setCustomizeModalOpen(false)}
        title="Customize One-Shots Page"
        tabs={ONESHOTS_TAB_CONFIG}
        preferences={preferences as PagePreferences<OneshotsPageTabId>}
        defaultPreferences={DEFAULT_ONESHOTS_PAGE_PREFERENCES as PagePreferences<OneshotsPageTabId>}
        onSave={savePreferences}
        tabCounts={tabCounts}
      />
      <BackToTopButton />
    </AppLayout>
  )
}

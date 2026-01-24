'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  Plus,
  Compass,
  Loader2,
  Sparkles,
  Bookmark,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { AppLayout } from '@/components/layout/app-layout'
import { BackToTopButton } from '@/components/ui/back-to-top'
import { useSupabase, useUser, useIsMobile } from '@/hooks'
import type { Campaign, ContentSave } from '@/types/database'
import { TabNavigation, type ContentTab, ADVENTURES_TABS } from '@/components/navigation'
import { TemplateStateBadge } from '@/components/templates'
import { AdventuresPageMobile } from './page.mobile'
import { toast } from 'sonner'

interface TemplateSnapshot {
  id: string
  content_id: string
  version: number
  version_name?: string
  is_public: boolean
  published_at: string
  save_count: number
  snapshot_data: any
}

export default function AdventuresPage() {
  const router = useRouter()
  const supabase = useSupabase()
  const { user, loading: userLoading } = useUser()
  const isMobile = useIsMobile()

  const [adventures, setAdventures] = useState<Campaign[]>([])
  const [savedAdventures, setSavedAdventures] = useState<ContentSave[]>([])
  const [templateSnapshots, setTemplateSnapshots] = useState<TemplateSnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<ContentTab>('all')
  const [subFilter, setSubFilter] = useState<ContentTab>('running')

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    // Load user's adventures (campaigns with duration_type = 'adventure')
    const { data: adventuresData } = await supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', user!.id)
      .eq('duration_type', 'adventure')
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })

    if (adventuresData) {
      setAdventures(adventuresData)
    }

    // Load template snapshots for adventures
    const { data: snapshotsData } = await supabase
      .from('template_snapshots')
      .select('*')
      .eq('user_id', user!.id)
      .eq('content_type', 'campaign')
      .order('published_at', { ascending: false })

    if (snapshotsData) {
      // Filter to only include adventures (would need to check snapshot_data.duration_type)
      const adventureSnapshots = snapshotsData.filter(s =>
        s.snapshot_data?.duration_type === 'adventure'
      )
      setTemplateSnapshots(adventureSnapshots)
    }

    setLoading(false)
  }

  // Filter adventures based on active tab
  const activeAdventures = adventures.filter(a => a.content_mode === 'active' || !a.content_mode)
  const inactiveAdventures = adventures.filter(a => a.content_mode === 'inactive')
  const uniqueTemplateContentIds = new Set(templateSnapshots.map(s => s.content_id))
  const publishedSnapshots = templateSnapshots.filter(s => s.is_public)
  const privateSnapshots = templateSnapshots.filter(s => !s.is_public)

  const getFilteredAdventures = () => {
    if (activeTab === 'all') return activeAdventures
    if (activeTab === 'active') {
      if (subFilter === 'running') return activeAdventures
    }
    if (activeTab === 'my-work') {
      if (subFilter === 'drafts') return inactiveAdventures
    }
    return activeAdventures
  }

  const filteredAdventures = getFilteredAdventures()

  // Build tabs with counts
  const tabsWithCounts = ADVENTURES_TABS.map(tab => {
    let count: number | undefined
    if (tab.value === 'all') count = adventures.length
    else if (tab.value === 'active') count = activeAdventures.length
    else if (tab.value === 'my-work') count = inactiveAdventures.length + uniqueTemplateContentIds.size
    else if (tab.value === 'collection') count = savedAdventures.length
    else if (tab.value === 'discover') count = undefined

    const subFilters = tab.subFilters?.map(sf => {
      let sfCount: number | undefined
      if (sf.value === 'running') sfCount = activeAdventures.length
      else if (sf.value === 'drafts') sfCount = inactiveAdventures.length
      else if (sf.value === 'my-templates') sfCount = privateSnapshots.length
      else if (sf.value === 'published') sfCount = publishedSnapshots.length
      return { ...sf, count: sfCount }
    })

    return { ...tab, count, subFilters }
  })

  // Reactivate adventure
  const handleReactivate = async (adventureId: string) => {
    const { error } = await supabase
      .from('campaigns')
      .update({ content_mode: 'active', inactive_reason: null })
      .eq('id', adventureId)

    if (error) {
      toast.error('Failed to reactivate adventure')
      return
    }

    toast.success('Adventure reactivated')
    loadData()
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

  // Mobile view
  if (isMobile) {
    return (
      <AdventuresPageMobile
        adventures={activeAdventures}
        inactiveAdventures={inactiveAdventures}
        savedAdventures={savedAdventures}
        templateSnapshots={templateSnapshots}
        onNavigate={(path) => router.push(path)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        subFilter={subFilter}
        setSubFilter={setSubFilter}
        tabsWithCounts={tabsWithCounts}
        onReactivate={handleReactivate}
      />
    )
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-white">Adventures</h1>
            <p className="text-gray-400 mt-1">Multi-session stories (3-9 sessions)</p>
          </div>
          <Link
            href="/adventures/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Adventure
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

        {/* All Tab - Overview */}
        {activeTab === 'all' && (
          <div className="space-y-10">
            {/* Active Adventures */}
            {activeAdventures.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Active Adventures</h3>
                  <button
                    onClick={() => { setActiveTab('active'); setSubFilter('running'); }}
                    className="text-sm text-purple-400 hover:text-purple-300"
                  >
                    View all →
                  </button>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeAdventures.slice(0, 3).map((adventure) => (
                    <Link
                      key={adventure.id}
                      href={`/campaigns/${adventure.id}/dashboard`}
                      className="group relative rounded-xl overflow-hidden bg-gray-900/50 border border-white/[0.06] hover:border-purple-500/40 transition-all"
                    >
                      <div className="relative h-40 overflow-hidden">
                        {adventure.image_url ? (
                          <>
                            <Image
                              src={adventure.image_url}
                              alt={adventure.name}
                              fill
                              className="object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent" />
                          </>
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-amber-900/30 to-gray-900 flex items-center justify-center">
                            <Compass className="w-12 h-12 text-amber-400/30" />
                          </div>
                        )}
                        <div className="absolute top-2 left-2 flex gap-2">
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Adventure
                          </span>
                          {adventure.estimated_sessions && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-black/60 text-gray-300">
                              ~{adventure.estimated_sessions} sessions
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="p-4">
                        <h4 className="font-semibold text-white truncate group-hover:text-purple-400 transition-colors">
                          {adventure.name}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">{adventure.game_system}</p>
                        {adventure.description && (
                          <p className="text-sm text-gray-400 mt-2 line-clamp-2">
                            {adventure.description}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Empty state */}
            {adventures.length === 0 && (
              <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-amber-900/20 via-gray-900 to-gray-950 border border-white/[0.06] p-16 text-center">
                <Compass className="w-20 h-20 mx-auto mb-6 text-amber-400/50" />
                <h2 className="text-2xl font-display font-bold text-white mb-3">
                  Start Your First Adventure
                </h2>
                <p className="text-gray-400 mb-8 max-w-md mx-auto">
                  Adventures are multi-session stories that span 3-9 sessions. Perfect for module-length content.
                </p>
                <Link
                  href="/adventures/new"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-xl transition-colors"
                >
                  <Compass className="w-5 h-5" />
                  Create Your First Adventure
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Active Tab */}
        {activeTab === 'active' && subFilter === 'running' && (
          <div className="space-y-6">
            {filteredAdventures.length === 0 ? (
              <div className="text-center py-16 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                <Compass className="w-12 h-12 mx-auto mb-4 text-amber-400/50" />
                <h3 className="text-lg font-medium text-white mb-2">No active adventures</h3>
                <p className="text-gray-400 max-w-sm mx-auto mb-6">
                  Start a new adventure to begin your multi-session story.
                </p>
                <Link
                  href="/adventures/new"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  New Adventure
                </Link>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAdventures.map((adventure) => (
                  <Link
                    key={adventure.id}
                    href={`/campaigns/${adventure.id}/dashboard`}
                    className="group relative rounded-xl overflow-hidden bg-gray-900/50 border border-white/[0.06] hover:border-amber-500/40 transition-all"
                  >
                    <div className="relative h-48 overflow-hidden">
                      {adventure.image_url ? (
                        <>
                          <Image
                            src={adventure.image_url}
                            alt={adventure.name}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
                        </>
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/30 to-gray-900 flex items-center justify-center">
                          <Compass className="w-16 h-16 text-amber-400/30" />
                        </div>
                      )}
                      <div className="absolute top-3 left-3 flex gap-2">
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Adventure
                        </span>
                      </div>
                    </div>
                    <div className="p-5">
                      <h4 className="font-display font-semibold text-lg text-white truncate group-hover:text-amber-400 transition-colors">
                        {adventure.name}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">{adventure.game_system}</p>
                      {adventure.description && (
                        <p className="text-sm text-gray-400 mt-2 line-clamp-2">
                          {adventure.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-3">
                        Updated {formatDate(adventure.updated_at)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* My Work - Drafts */}
        {activeTab === 'my-work' && subFilter === 'drafts' && (
          <div className="space-y-6">
            {inactiveAdventures.length === 0 ? (
              <div className="text-center py-16 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                <Compass className="w-12 h-12 mx-auto mb-4 text-gray-400/50" />
                <h3 className="text-lg font-medium text-white mb-2">No drafts</h3>
                <p className="text-gray-400 max-w-sm mx-auto">
                  Adventures you're working on will appear here.
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {inactiveAdventures.map((adventure) => (
                  <Link
                    key={adventure.id}
                    href={`/campaigns/${adventure.id}/canvas`}
                    className="group relative rounded-xl overflow-hidden bg-gray-900/30 border border-white/[0.04] opacity-75 hover:opacity-100 transition-all"
                  >
                    <div className="relative h-40 overflow-hidden">
                      {adventure.image_url ? (
                        <>
                          <Image
                            src={adventure.image_url}
                            alt={adventure.name}
                            fill
                            className="object-cover grayscale group-hover:grayscale-0 transition-all"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
                        </>
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-800/30 to-gray-900 flex items-center justify-center">
                          <Compass className="w-12 h-12 text-gray-500/30" />
                        </div>
                      )}
                      <div className="absolute top-3 left-3">
                        <TemplateStateBadge mode="inactive" inactiveReason={adventure.inactive_reason} size="sm" />
                      </div>
                    </div>
                    <div className="p-5">
                      <h4 className="font-display font-semibold text-lg text-gray-300 truncate">
                        {adventure.name}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">{adventure.game_system}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Collection */}
        {activeTab === 'collection' && (
          <div className="space-y-6">
            {savedAdventures.length === 0 ? (
              <div className="text-center py-16 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                <Bookmark className="w-12 h-12 mx-auto mb-4 text-amber-400/50" />
                <h3 className="text-lg font-medium text-white mb-2">No saved adventures yet</h3>
                <p className="text-gray-400 max-w-sm mx-auto">
                  When you save adventure templates from share links, they'll appear here.
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedAdventures.map((save) => (
                  <div
                    key={save.id}
                    className="relative rounded-xl overflow-hidden bg-gray-900/50 border border-white/[0.06] hover:border-amber-500/40 transition-all"
                  >
                    <div className="p-5">
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Saved Template
                      </span>
                      <h4 className="font-display font-semibold text-lg text-white mt-3 truncate">
                        {save.source_name}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        v{save.saved_version}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Discover */}
        {activeTab === 'discover' && (
          <div className="text-center py-20 bg-white/[0.02] border border-white/[0.06] rounded-xl">
            <Sparkles className="w-16 h-16 mx-auto mb-6 text-amber-400/30" />
            <h3 className="text-xl font-semibold text-white mb-2">Discover Coming Soon</h3>
            <p className="text-gray-400 max-w-md mx-auto">
              Browse adventures shared by the community. Find your next multi-session story.
            </p>
          </div>
        )}
      </div>
      <BackToTopButton />
    </AppLayout>
  )
}

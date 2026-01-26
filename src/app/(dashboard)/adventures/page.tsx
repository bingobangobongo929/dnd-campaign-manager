'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  Plus,
  Compass,
  Loader2,
  Sparkles,
  Bookmark,
  Settings,
  Users,
  Crown,
  Play,
  ChevronRight,
  Edit,
  RotateCcw,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { AppLayout } from '@/components/layout/app-layout'
import { BackToTopButton } from '@/components/ui/back-to-top'
import { ContentBadge, PageCustomizeModal } from '@/components/ui'
import type { TabConfig as ModalTabConfig, PagePreferences } from '@/components/ui/PageCustomizeModal'
import { getCampaignBadge } from '@/lib/content-badges'
import { useSupabase, useUser, useIsMobile } from '@/hooks'
import type { Campaign, ContentSave, AdventuresPageTabId, AdventuresPagePreferences } from '@/types/database'
import { DEFAULT_ADVENTURES_PAGE_PREFERENCES } from '@/types/database'
import { TabNavigation, type ContentTab, ADVENTURES_TABS } from '@/components/navigation'
import { TemplateStateBadge } from '@/components/templates'
import { AdventuresPageMobile } from './page.mobile'
import { toast } from 'sonner'

// Tab configuration for customize modal
const ADVENTURES_TAB_CONFIG: ModalTabConfig<AdventuresPageTabId>[] = [
  { id: 'all', label: 'All', icon: <Compass className="w-4 h-4" />, color: 'text-gray-400' },
  { id: 'playing', label: 'Playing In', icon: <Users className="w-4 h-4" />, color: 'text-purple-400' },
  { id: 'running', label: 'Running', icon: <Crown className="w-4 h-4" />, color: 'text-blue-400' },
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
  snapshot_data: any
}

export default function AdventuresPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useSupabase()
  const { user, loading: userLoading } = useUser()
  const isMobile = useIsMobile()

  // Page preferences
  const [preferences, setPreferences] = useState<AdventuresPagePreferences>(DEFAULT_ADVENTURES_PAGE_PREFERENCES)
  const [customizeModalOpen, setCustomizeModalOpen] = useState(false)

  const initialTab = (searchParams.get('tab') as ContentTab) || preferences.default_tab || 'all'
  const initialFilter = (searchParams.get('filter') as ContentTab) || 'drafts'

  const [adventures, setAdventures] = useState<Campaign[]>([])
  const [joinedAdventures, setJoinedAdventures] = useState<{ membership: any; campaign: Campaign }[]>([])
  const [savedAdventures, setSavedAdventures] = useState<ContentSave[]>([])
  const [templateSnapshots, setTemplateSnapshots] = useState<TemplateSnapshot[]>([])
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
      .select('adventures_page_preferences')
      .eq('user_id', user!.id)
      .single()

    if (data?.adventures_page_preferences) {
      setPreferences(data.adventures_page_preferences as AdventuresPagePreferences)
      if (!searchParams.get('tab')) {
        setActiveTab((data.adventures_page_preferences as AdventuresPagePreferences).default_tab || 'all')
      }
    }
  }

  const savePreferences = async (newPrefs: PagePreferences<AdventuresPageTabId>) => {
    const prefs = newPrefs as AdventuresPagePreferences
    setPreferences(prefs)

    await supabase
      .from('user_settings')
      .upsert({
        user_id: user!.id,
        adventures_page_preferences: prefs,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      })
  }

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

    // Load joined adventures (adventures user is a member of but doesn't own)
    const joinedResponse = await fetch('/api/campaigns/joined')
    if (joinedResponse.ok) {
      const joinedData = await joinedResponse.json()
      // Filter to only adventures
      const adventureJoined = (joinedData.joinedCampaigns || []).filter(
        (j: { campaign: Campaign }) => j.campaign.duration_type === 'adventure'
      )
      setJoinedAdventures(adventureJoined)
    }

    // Load template snapshots for adventures
    const { data: snapshotsData } = await supabase
      .from('template_snapshots')
      .select('*')
      .eq('user_id', user!.id)
      .eq('content_type', 'campaign')
      .order('published_at', { ascending: false })

    if (snapshotsData) {
      const adventureSnapshots = snapshotsData.filter(s =>
        s.snapshot_data?.duration_type === 'adventure'
      )
      setTemplateSnapshots(adventureSnapshots)
    }

    // Load saved adventures from others
    const savedResponse = await fetch('/api/templates/saved?type=campaign')
    if (savedResponse.ok) {
      const savedData = await savedResponse.json()
      const adventureSaves = (savedData.saves || []).filter((save: ContentSave & { snapshot?: { snapshot_data?: { duration_type?: string } } }) =>
        save.snapshot?.snapshot_data?.duration_type === 'adventure'
      )
      setSavedAdventures(adventureSaves)
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
    if (activeTab === 'running') return activeAdventures
    if (activeTab === 'playing') return [] // Joined adventures handled separately
    if (activeTab === 'my-work') {
      if (subFilter === 'drafts') return inactiveAdventures
    }
    return activeAdventures
  }

  const filteredAdventures = getFilteredAdventures()

  // Tab counts
  const tabCounts: Record<AdventuresPageTabId, number> = {
    all: adventures.length + joinedAdventures.length,
    playing: joinedAdventures.length,
    running: activeAdventures.length,
    'my-work': inactiveAdventures.length + uniqueTemplateContentIds.size,
    collection: savedAdventures.length,
    discover: 0,
  }

  // Build tabs with counts - filtered by preferences
  const tabsWithCounts = useMemo(() => {
    const orderedTabIds = preferences.auto_order
      ? [...(preferences.tab_order || ADVENTURES_TABS.map(t => t.value as AdventuresPageTabId))]
          .sort((a, b) => {
            const tabA = ADVENTURES_TABS.find(t => t.value === a)
            const tabB = ADVENTURES_TABS.find(t => t.value === b)
            if (tabA?.comingSoon && !tabB?.comingSoon) return 1
            if (!tabA?.comingSoon && tabB?.comingSoon) return -1
            const countA = tabCounts[a] || 0
            const countB = tabCounts[b] || 0
            if (countA === 0 && countB > 0) return 1
            if (countA > 0 && countB === 0) return -1
            return countB - countA
          })
      : preferences.tab_order || ADVENTURES_TABS.map(t => t.value as AdventuresPageTabId)

    return orderedTabIds
      .filter(id => !preferences.hidden_tabs.includes(id))
      .map(id => {
        const tab = ADVENTURES_TABS.find(t => t.value === id)
        if (!tab) return null

        const subFilters = tab.subFilters?.map(sf => {
          let sfCount: number | undefined
          if (sf.value === 'drafts') sfCount = inactiveAdventures.length
          else if (sf.value === 'my-templates') sfCount = privateSnapshots.length
          else if (sf.value === 'published') sfCount = publishedSnapshots.length
          return { ...sf, count: sfCount }
        })

        return { ...tab, count: tabCounts[id as AdventuresPageTabId], subFilters }
      })
      .filter(Boolean) as typeof ADVENTURES_TABS
  }, [preferences, tabCounts, inactiveAdventures.length, privateSnapshots.length, publishedSnapshots.length])

  // Get hero adventure based on active tab
  const getHeroAdventure = () => {
    if (activeTab === 'all' || activeTab === 'running') {
      return activeAdventures[0] || null
    }
    if (activeTab === 'playing') {
      return joinedAdventures[0]?.campaign || null
    }
    return null
  }
  const heroAdventure = getHeroAdventure()
  const heroMembership = activeTab === 'playing' ? joinedAdventures[0]?.membership : null

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
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCustomizeModalOpen(true)}
              className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1] text-gray-400 hover:text-white transition-all"
              title="Customize page"
            >
              <Settings className="w-5 h-5" />
            </button>
            <Link
              href="/adventures/new"
              className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Adventure
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

        {/* All Tab - Overview */}
        {activeTab === 'all' && (
          <div className="space-y-10">
            {/* Hero Adventure */}
            {heroAdventure && (
              <section className="group relative">
                <Link
                  href={`/campaigns/${heroAdventure.id}/dashboard`}
                  className="relative block rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-950 border border-white/[0.06] hover:border-amber-500/30 transition-all duration-500"
                >
                  <div className="relative h-[300px] md:h-[380px] overflow-hidden">
                    {heroAdventure.image_url ? (
                      <>
                        <Image
                          src={heroAdventure.image_url}
                          alt={heroAdventure.name}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                          priority
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />
                      </>
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-amber-900/30 via-gray-900 to-gray-950 flex items-center justify-center">
                        <Compass className="w-32 h-32 text-amber-400/20" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-10">
                      <div className="flex items-center gap-2 mb-3">
                        <ContentBadge
                          variant={getCampaignBadge(heroAdventure, user?.id || '').primary}
                          size="lg"
                          progress={getCampaignBadge(heroAdventure, user?.id || '').progress}
                        />
                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-white/10 text-gray-300">
                          {heroAdventure.game_system}
                        </span>
                      </div>
                      <h2 className="text-2xl md:text-4xl font-display font-bold text-white mb-2 group-hover:text-amber-400 transition-colors">
                        {heroAdventure.name}
                      </h2>
                      {heroAdventure.description && (
                        <p className="text-gray-300 text-sm md:text-base max-w-2xl line-clamp-2 mb-3">
                          {heroAdventure.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-amber-400 font-medium">
                        <Play className="w-5 h-5" />
                        <span>Enter Adventure</span>
                        <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </div>
                </Link>
              </section>
            )}

            {/* Active Adventures */}
            {activeAdventures.length > 1 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Running</h3>
                  <button
                    onClick={() => setActiveTab('running')}
                    className="text-sm text-purple-400 hover:text-purple-300"
                  >
                    View all →
                  </button>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeAdventures.slice(0, 3).map((adventure) => {
                    const badge = getCampaignBadge(adventure, user?.id || '')
                    return (
                      <Link
                        key={adventure.id}
                        href={`/campaigns/${adventure.id}/dashboard`}
                        className="group relative rounded-xl overflow-hidden bg-gray-900/50 border border-white/[0.06] hover:border-amber-500/40 transition-all"
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
                            <ContentBadge
                              variant={badge.primary}
                              size="sm"
                              progress={badge.progress}
                            />
                            {adventure.estimated_sessions && (
                              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-black/60 text-gray-300">
                                ~{adventure.estimated_sessions} sessions
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="p-4">
                          <h4 className="font-semibold text-white truncate group-hover:text-amber-400 transition-colors">
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
                    )
                  })}
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

        {/* Playing In Tab */}
        {activeTab === 'playing' && (
          <div className="space-y-6">
            {joinedAdventures.length === 0 ? (
              <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-purple-900/20 via-gray-900 to-gray-950 border border-white/[0.06] p-16 text-center">
                <Users className="w-20 h-20 mx-auto mb-6 text-purple-400/50" />
                <h2 className="text-2xl font-display font-bold text-white mb-3">
                  Your Adventures Await
                </h2>
                <p className="text-gray-400 mb-8 max-w-md mx-auto">
                  Adventures you've joined will appear here. When your DM sends an invite, you'll be able to
                  track your character's journey, add session notes, and stay connected with your party.
                </p>
                <div className="flex items-center justify-center gap-4">
                  <Link
                    href="/adventures"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white/[0.05] hover:bg-white/[0.08] text-gray-300 font-medium rounded-xl transition-colors"
                  >
                    Browse Adventures
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {/* Hero for most recent joined adventure */}
                {heroAdventure && heroMembership && (
                  <section className="group relative">
                    <Link
                      href={`/campaigns/${heroAdventure.id}/dashboard`}
                      className="relative block rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-950 border border-white/[0.06] hover:border-purple-500/30 transition-all duration-500"
                    >
                      <div className="relative h-[300px] md:h-[380px] overflow-hidden">
                        {heroAdventure.image_url ? (
                          <>
                            <Image
                              src={heroAdventure.image_url}
                              alt={heroAdventure.name}
                              fill
                              className="object-cover transition-transform duration-700 group-hover:scale-105"
                              priority
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />
                          </>
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-gray-900 to-gray-950 flex items-center justify-center">
                            <Compass className="w-32 h-32 text-purple-400/20" />
                          </div>
                        )}
                        <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-10">
                          <div className="flex items-center gap-2 mb-3">
                            <ContentBadge variant="playing" size="lg" />
                            <span className="px-3 py-1 text-xs font-medium rounded-full bg-white/10 text-gray-300">
                              {heroAdventure.game_system}
                            </span>
                          </div>
                          <h2 className="text-2xl md:text-4xl font-display font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">
                            {heroAdventure.name}
                          </h2>
                          {heroAdventure.description && (
                            <p className="text-gray-300 text-sm md:text-base max-w-2xl line-clamp-2 mb-3">
                              {heroAdventure.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-purple-400 font-medium">
                            <Play className="w-5 h-5" />
                            <span>Enter Adventure</span>
                            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  </section>
                )}

                {/* Rest of joined adventures */}
                {joinedAdventures.length > 1 && (
                  <section>
                    <h3 className="text-xl font-semibold text-white mb-6">All Adventures</h3>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {joinedAdventures.slice(1).map(({ membership, campaign }) => (
                        <Link
                          key={membership.id}
                          href={`/campaigns/${campaign.id}/dashboard`}
                          className="group relative rounded-xl overflow-hidden bg-gray-900/50 border border-white/[0.06] hover:border-purple-500/40 transition-all"
                        >
                          <div className="relative h-48 overflow-hidden">
                            {campaign.image_url ? (
                              <>
                                <Image
                                  src={campaign.image_url}
                                  alt={campaign.name}
                                  fill
                                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
                              </>
                            ) : (
                              <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 to-gray-900 flex items-center justify-center">
                                <Compass className="w-16 h-16 text-purple-400/30" />
                              </div>
                            )}
                            <ContentBadge variant="playing" size="sm" className="absolute top-3 left-3" />
                          </div>
                          <div className="p-5">
                            <h4 className="font-display font-semibold text-lg text-white truncate group-hover:text-purple-400 transition-colors">
                              {campaign.name}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1">{campaign.game_system}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        )}

        {/* Running Tab */}
        {activeTab === 'running' && (
          <div className="space-y-6">
            {activeAdventures.length === 0 ? (
              <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-blue-900/20 via-gray-900 to-gray-950 border border-white/[0.06] p-16 text-center">
                <Crown className="w-20 h-20 mx-auto mb-6 text-blue-400/50" />
                <h2 className="text-2xl font-display font-bold text-white mb-3">
                  Ready to Run Your Own Game?
                </h2>
                <p className="text-gray-400 mb-8 max-w-md mx-auto">
                  When you're ready to be the Dungeon Master, this is where the magic happens. Adventures
                  are multi-session stories that span 3-9 sessions - perfect for module-length content.
                </p>
                <Link
                  href="/adventures/new"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors"
                >
                  <Sparkles className="w-5 h-5" />
                  Create Your First Adventure
                </Link>
              </div>
            ) : (
              <>
                {/* Hero */}
                {heroAdventure && (
                  <section className="group relative">
                    <Link
                      href={`/campaigns/${heroAdventure.id}/dashboard`}
                      className="relative block rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-950 border border-white/[0.06] hover:border-blue-500/30 transition-all duration-500"
                    >
                      <div className="relative h-[300px] md:h-[380px] overflow-hidden">
                        {heroAdventure.image_url ? (
                          <>
                            <Image
                              src={heroAdventure.image_url}
                              alt={heroAdventure.name}
                              fill
                              className="object-cover transition-transform duration-700 group-hover:scale-105"
                              priority
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />
                          </>
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/30 via-gray-900 to-gray-950 flex items-center justify-center">
                            <Compass className="w-32 h-32 text-blue-400/20" />
                          </div>
                        )}
                        <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-10">
                          <div className="flex items-center gap-2 mb-3">
                            <ContentBadge
                              variant={getCampaignBadge(heroAdventure, user?.id || '').primary}
                              size="lg"
                              progress={getCampaignBadge(heroAdventure, user?.id || '').progress}
                            />
                            <span className="px-3 py-1 text-xs font-medium rounded-full bg-white/10 text-gray-300">
                              {heroAdventure.game_system}
                            </span>
                          </div>
                          <h2 className="text-2xl md:text-4xl font-display font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                            {heroAdventure.name}
                          </h2>
                          {heroAdventure.description && (
                            <p className="text-gray-300 text-sm md:text-base max-w-2xl line-clamp-2 mb-3">
                              {heroAdventure.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-blue-400 font-medium">
                            <Play className="w-5 h-5" />
                            <span>Enter Adventure</span>
                            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  </section>
                )}

                {/* Grid */}
                {activeAdventures.length > 1 && (
                  <section>
                    <h3 className="text-xl font-semibold text-white mb-6">All Adventures</h3>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {activeAdventures.slice(1).map((adventure) => {
                        const badge = getCampaignBadge(adventure, user?.id || '')
                        return (
                          <Link
                            key={adventure.id}
                            href={`/campaigns/${adventure.id}/dashboard`}
                            className="group relative rounded-xl overflow-hidden bg-gray-900/50 border border-white/[0.06] hover:border-blue-500/40 transition-all"
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
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/30 to-gray-900 flex items-center justify-center">
                                  <Compass className="w-16 h-16 text-blue-400/30" />
                                </div>
                              )}
                              <ContentBadge
                                variant={badge.primary}
                                size="sm"
                                progress={badge.progress}
                                className="absolute top-3 left-3"
                              />
                            </div>
                            <div className="p-5">
                              <h4 className="font-display font-semibold text-lg text-white truncate group-hover:text-blue-400 transition-colors">
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
                        )
                      })}
                      {/* Create New Card */}
                      <Link
                        href="/adventures/new"
                        className="group relative rounded-xl overflow-hidden bg-gradient-to-br from-blue-900/10 to-gray-900/50 border-2 border-dashed border-blue-500/20 hover:border-blue-500/50 transition-all flex flex-col items-center justify-center gap-4 min-h-[280px]"
                      >
                        <div className="p-4 rounded-full bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                          <Plus className="w-8 h-8 text-blue-400" />
                        </div>
                        <span className="text-sm font-medium text-blue-400">Create New Adventure</span>
                      </Link>
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        )}

        {/* My Work - Drafts */}
        {activeTab === 'my-work' && subFilter === 'drafts' && (
          <div className="space-y-6">
            {inactiveAdventures.length === 0 ? (
              <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-amber-900/20 via-gray-900 to-gray-950 border border-white/[0.06] p-16 text-center">
                <Edit className="w-20 h-20 mx-auto mb-6 text-amber-400/50" />
                <h2 className="text-2xl font-display font-bold text-white mb-3">
                  Your Creative Workshop
                </h2>
                <p className="text-gray-400 mb-8 max-w-md mx-auto">
                  Drafts and templates you're working on will appear here. When you're ready to publish
                  an adventure for others to use, it'll live in your workshop first.
                </p>
                <Link
                  href="/adventures/new"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-xl transition-colors"
                >
                  <Sparkles className="w-5 h-5" />
                  Start Creating
                </Link>
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

      {/* Page Customize Modal */}
      <PageCustomizeModal
        isOpen={customizeModalOpen}
        onClose={() => setCustomizeModalOpen(false)}
        title="Customize Adventures Page"
        tabs={ADVENTURES_TAB_CONFIG}
        preferences={preferences as PagePreferences<AdventuresPageTabId>}
        defaultPreferences={DEFAULT_ADVENTURES_PAGE_PREFERENCES as PagePreferences<AdventuresPageTabId>}
        onSave={savePreferences}
        tabCounts={tabCounts}
      />
      <BackToTopButton />
    </AppLayout>
  )
}

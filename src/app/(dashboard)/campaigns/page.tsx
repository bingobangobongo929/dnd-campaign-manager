'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  Plus,
  Swords,
  Camera,
  Loader2,
  Play,
  ChevronRight,
  Edit,
  Trash2,
  Sparkles,
  RotateCcw,
  Bookmark,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { Modal, Input, Textarea, Dropdown, UnifiedImageModal, ContentBadge } from '@/components/ui'
import { getCampaignBadge } from '@/lib/content-badges'
import { AppLayout } from '@/components/layout/app-layout'
import { BackToTopButton } from '@/components/ui/back-to-top'
import { MobileLayout, MobileSectionHeader, MobileFAB } from '@/components/mobile'
import { useSupabase, useUser, useIsMobile } from '@/hooks'
import { v4 as uuidv4 } from 'uuid'
import type { Campaign, ContentSave } from '@/types/database'
import { CampaignsPageMobile } from './page.mobile'
import { TemplateStateBadge } from '@/components/templates'
import { TabNavigation, type ContentTab, CAMPAIGNS_TABS } from '@/components/navigation'

// Helper to format role for display
function formatRoleLabel(role: string): string {
  switch (role) {
    case 'owner': return 'Owner'
    case 'co_dm': return 'Co-DM'
    case 'player': return 'Player'
    case 'contributor': return 'Contributor'
    case 'guest': return 'Guest'
    default: return role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }
}

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

interface JoinedCampaign {
  membership: {
    id: string
    role: string
    status: string
    joined_at: string | null
    invited_at: string | null
    character_id: string | null
    permissions: any
  }
  campaign: Campaign
}

const GAME_SYSTEMS = [
  { value: 'D&D 5e', label: 'D&D 5e' },
  { value: 'D&D 3.5e', label: 'D&D 3.5e' },
  { value: 'Pathfinder 2e', label: 'Pathfinder 2e' },
  { value: 'Lancer', label: 'Lancer' },
  { value: 'Call of Cthulhu', label: 'Call of Cthulhu' },
  { value: 'Vampire: The Masquerade', label: 'Vampire: The Masquerade' },
  { value: 'Custom', label: 'Custom System' },
]

export default function CampaignsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useSupabase()
  const { user, loading: userLoading } = useUser()
  const isMobile = useIsMobile()

  // Read initial tab/filter from URL params
  const initialTab = (searchParams.get('tab') as ContentTab) || 'all'
  const initialFilter = (searchParams.get('filter') as ContentTab) || 'running'

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [joinedCampaigns, setJoinedCampaigns] = useState<JoinedCampaign[]>([])
  const [savedCampaigns, setSavedCampaigns] = useState<ContentSave[]>([])
  const [templateSnapshots, setTemplateSnapshots] = useState<TemplateSnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<ContentTab>(initialTab)
  const [subFilter, setSubFilter] = useState<ContentTab>(initialFilter)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    game_system: 'D&D 5e',
    description: '',
    image_url: null as string | null,
  })
  const [saving, setSaving] = useState(false)
  const [imageModalOpen, setImageModalOpen] = useState(false)

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    // Load user's campaigns (excluding adventures which have duration_type = 'adventure')
    const { data: campaignsData } = await supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', user!.id)
      .is('deleted_at', null)
      .or('duration_type.is.null,duration_type.eq.campaign')
      .order('updated_at', { ascending: false })

    if (campaignsData) {
      setCampaigns(campaignsData)
    }

    // Load template snapshots (My Templates tab) - filter out adventures
    const { data: snapshotsData } = await supabase
      .from('template_snapshots')
      .select('*')
      .eq('user_id', user!.id)
      .eq('content_type', 'campaign')
      .order('published_at', { ascending: false })

    if (snapshotsData) {
      // Filter out adventures (they have duration_type = 'adventure' in snapshot_data)
      const campaignSnapshots = snapshotsData.filter(s =>
        !s.snapshot_data?.duration_type || s.snapshot_data?.duration_type === 'campaign'
      )
      setTemplateSnapshots(campaignSnapshots)
    }

    // Load saved campaigns from others - filter out adventures
    const savedResponse = await fetch('/api/templates/saved?type=campaign')
    if (savedResponse.ok) {
      const savedData = await savedResponse.json()
      // Filter out adventures based on snapshot_data.duration_type
      const campaignSaves = (savedData.saves || []).filter((save: ContentSave & { snapshot?: { snapshot_data?: { duration_type?: string } } }) =>
        !save.snapshot?.snapshot_data?.duration_type || save.snapshot?.snapshot_data?.duration_type === 'campaign'
      )
      setSavedCampaigns(campaignSaves)
    }

    // Load joined campaigns (campaigns user is a member of but doesn't own)
    const joinedResponse = await fetch('/api/campaigns/joined')
    if (joinedResponse.ok) {
      const joinedData = await joinedResponse.json()
      setJoinedCampaigns(joinedData.joinedCampaigns || [])
    }

    setLoading(false)
  }

  // Filter campaigns based on active tab and sub-filter
  const activeCampaigns = campaigns.filter(c => c.content_mode === 'active' || !c.content_mode)
  const inactiveCampaigns = campaigns.filter(c => c.content_mode === 'inactive')

  // Group snapshots by content_id to get unique templates
  const uniqueTemplateContentIds = new Set(templateSnapshots.map(s => s.content_id))
  const publishedSnapshots = templateSnapshots.filter(s => s.is_public)
  const privateSnapshots = templateSnapshots.filter(s => !s.is_public)

  // Get what campaigns to show based on tab + sub-filter
  const getFilteredCampaigns = () => {
    if (activeTab === 'all') return activeCampaigns
    if (activeTab === 'active') {
      if (subFilter === 'running') return activeCampaigns
      if (subFilter === 'playing') return [] // Joined campaigns handled separately
    }
    if (activeTab === 'my-work') {
      if (subFilter === 'drafts') return inactiveCampaigns
      // Templates handled via templateSnapshots
    }
    return activeCampaigns
  }

  const filteredCampaigns = getFilteredCampaigns()

  // Build tabs with counts
  const tabsWithCounts = CAMPAIGNS_TABS.map(tab => {
    let count: number | undefined
    if (tab.value === 'all') count = campaigns.length
    else if (tab.value === 'active') count = activeCampaigns.length + joinedCampaigns.length
    else if (tab.value === 'my-work') count = inactiveCampaigns.length + uniqueTemplateContentIds.size
    else if (tab.value === 'collection') count = savedCampaigns.length
    else if (tab.value === 'discover') count = undefined // Coming soon

    // Update sub-filter counts
    const subFilters = tab.subFilters?.map(sf => {
      let sfCount: number | undefined
      if (sf.value === 'running') sfCount = activeCampaigns.length
      else if (sf.value === 'playing') sfCount = joinedCampaigns.length
      else if (sf.value === 'drafts') sfCount = inactiveCampaigns.length
      else if (sf.value === 'my-templates') sfCount = privateSnapshots.length
      else if (sf.value === 'published') sfCount = publishedSnapshots.length
      return { ...sf, count: sfCount }
    })

    return { ...tab, count, subFilters }
  })

  const handleReactivate = async (campaignId: string) => {
    const response = await fetch('/api/content/reactivate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contentType: 'campaign',
        contentId: campaignId,
      }),
    })

    if (response.ok) {
      loadData()
    }
  }

  const handleImageUpload = async (blob: Blob): Promise<string> => {
    const uniqueId = uuidv4()
    const path = `campaigns/${uniqueId}.webp`

    const { error: uploadError } = await supabase.storage
      .from('campaign-images')
      .upload(path, blob, { contentType: 'image/webp' })

    if (uploadError) throw uploadError

    const { data: urlData } = supabase.storage
      .from('campaign-images')
      .getPublicUrl(path)

    return urlData.publicUrl
  }

  const handleUpdate = async () => {
    if (!formData.name.trim() || !editingCampaign) return

    setSaving(true)
    const { data } = await supabase
      .from('campaigns')
      .update({
        name: formData.name,
        game_system: formData.game_system,
        description: formData.description || null,
        image_url: formData.image_url,
      })
      .eq('id', editingCampaign.id)
      .select()
      .single()

    if (data) {
      setCampaigns(campaigns.map((c) => (c.id === data.id ? data : c)))
      setEditingCampaign(null)
      setFormData({ name: '', game_system: 'D&D 5e', description: '', image_url: null })
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Move this campaign to the recycle bin? You can restore it within 30 days.')) return

    const { error } = await supabase
      .from('campaigns')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (!error) {
      setCampaigns(campaigns.filter((c) => c.id !== id))
    }
  }

  const openEditModal = (campaign: Campaign) => {
    setFormData({
      name: campaign.name,
      game_system: campaign.game_system,
      description: campaign.description || '',
      image_url: campaign.image_url || null,
    })
    setEditingCampaign(campaign)
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

  // Show featured campaign on both 'all' and 'active' tabs
  const featuredCampaign = (activeTab === 'all' || activeTab === 'active') ? activeCampaigns[0] : null

  // ============ MOBILE LAYOUT ============
  if (isMobile) {
    return (
      <CampaignsPageMobile
        campaigns={activeCampaigns}
        joinedCampaigns={joinedCampaigns.map(j => j.campaign)}
        inactiveCampaigns={inactiveCampaigns}
        savedCampaigns={savedCampaigns}
        templateSnapshots={templateSnapshots}
        featuredCampaign={featuredCampaign}
        editingCampaign={editingCampaign}
        setEditingCampaign={setEditingCampaign}
        formData={formData}
        setFormData={setFormData}
        saving={saving}
        handleUpdate={handleUpdate}
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

  // ============ DESKTOP LAYOUT ============
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-white">Your Campaigns</h1>
            <p className="text-gray-400 mt-1">Epic adventures await</p>
          </div>
          <Link
            href="/campaigns/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Campaign
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

        {/* All Tab - Overview with smart grouping */}
        {activeTab === 'all' && (
          <div className="space-y-10">
            {/* Featured Campaign Hero */}
            {featuredCampaign && (
              <section className="group relative">
                <Link
                  href={`/campaigns/${featuredCampaign.id}/dashboard`}
                  className="relative block rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-950 border border-white/[0.06] hover:border-purple-500/30 transition-all duration-500"
                >
                  <div className="relative h-[300px] md:h-[380px] overflow-hidden">
                    {featuredCampaign.image_url ? (
                      <>
                        <Image
                          src={featuredCampaign.image_url}
                          alt={featuredCampaign.name}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                          priority
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />
                      </>
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-gray-900 to-gray-950 flex items-center justify-center">
                        <Swords className="w-32 h-32 text-purple-400/20" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-10">
                      <div className="flex items-center gap-2 mb-3">
                        <ContentBadge
                          variant={getCampaignBadge(featuredCampaign, user?.id || '').primary}
                          size="lg"
                          progress={getCampaignBadge(featuredCampaign, user?.id || '').progress}
                        />
                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-white/10 text-gray-300">
                          {featuredCampaign.game_system}
                        </span>
                      </div>
                      <h2 className="text-2xl md:text-4xl font-display font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">
                        {featuredCampaign.name}
                      </h2>
                      {featuredCampaign.description && (
                        <p className="text-gray-300 text-sm md:text-base max-w-2xl line-clamp-2 mb-3">
                          {featuredCampaign.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-purple-400 font-medium">
                        <Play className="w-5 h-5" />
                        <span>Enter Campaign</span>
                        <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </div>
                </Link>
              </section>
            )}

            {/* Active Games Section */}
            {(activeCampaigns.length > 1 || joinedCampaigns.length > 0) && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Play className="w-4 h-4 text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">Active Games</h3>
                    <span className="text-xs text-gray-500">
                      {activeCampaigns.length + joinedCampaigns.length}
                    </span>
                  </div>
                  <button
                    onClick={() => { setActiveTab('active'); setSubFilter('running'); }}
                    className="text-sm text-purple-400 hover:text-purple-300"
                  >
                    View all →
                  </button>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Skip first campaign as it's shown in the hero section */}
                  {activeCampaigns.slice(1, 4).map((campaign) => {
                    const badge = getCampaignBadge(campaign, user?.id || '')
                    return (
                      <Link
                        key={campaign.id}
                        href={`/campaigns/${campaign.id}/dashboard`}
                        className="group relative rounded-xl overflow-hidden bg-gray-900/50 border border-white/[0.06] hover:border-purple-500/40 transition-all"
                      >
                        <div className="relative h-32 overflow-hidden">
                          {campaign.image_url ? (
                            <>
                              <Image
                                src={campaign.image_url}
                                alt={campaign.name}
                                fill
                                className="object-cover"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent" />
                            </>
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 to-gray-900 flex items-center justify-center">
                              <Swords className="w-10 h-10 text-purple-400/30" />
                            </div>
                          )}
                          <ContentBadge
                            variant={badge.primary}
                            size="sm"
                            progress={badge.progress}
                            className="absolute top-2 left-2"
                          />
                        </div>
                        <div className="p-3">
                          <h4 className="font-medium text-white truncate group-hover:text-purple-400 transition-colors">
                            {campaign.name}
                          </h4>
                          <p className="text-xs text-gray-500">{campaign.game_system}</p>
                        </div>
                      </Link>
                    )
                  })}
                  {joinedCampaigns.slice(0, 3 - Math.min(activeCampaigns.length - 1, 3)).map(({ membership, campaign }) => (
                    <Link
                      key={membership.id}
                      href={`/campaigns/${campaign.id}/dashboard`}
                      className="group relative rounded-xl overflow-hidden bg-gray-900/50 border border-white/[0.06] hover:border-purple-500/40 transition-all"
                    >
                      <div className="relative h-32 overflow-hidden">
                        {campaign.image_url ? (
                          <>
                            <Image
                              src={campaign.image_url}
                              alt={campaign.name}
                              fill
                              className="object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent" />
                          </>
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 to-gray-900 flex items-center justify-center">
                            <Swords className="w-10 h-10 text-purple-400/30" />
                          </div>
                        )}
                        <ContentBadge
                          variant="playing"
                          size="sm"
                          className="absolute top-2 left-2"
                        />
                      </div>
                      <div className="p-3">
                        <h4 className="font-medium text-white truncate group-hover:text-purple-400 transition-colors">
                          {campaign.name}
                        </h4>
                        <p className="text-xs text-gray-500">{campaign.game_system}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* My Work Section */}
            {(inactiveCampaigns.length > 0 || templateSnapshots.length > 0) && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Edit className="w-4 h-4 text-amber-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">My Work</h3>
                    <span className="text-xs text-gray-500">
                      {inactiveCampaigns.length + uniqueTemplateContentIds.size}
                    </span>
                  </div>
                  <button
                    onClick={() => { setActiveTab('my-work'); setSubFilter('drafts'); }}
                    className="text-sm text-purple-400 hover:text-purple-300"
                  >
                    View all →
                  </button>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {inactiveCampaigns.slice(0, 2).map((campaign) => (
                    <Link
                      key={campaign.id}
                      href={`/campaigns/${campaign.id}/canvas`}
                      className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-purple-500/30 transition-all"
                    >
                      <span className="text-xs font-medium text-amber-400">Draft</span>
                      <h4 className="font-medium text-white mt-1 truncate">{campaign.name}</h4>
                      <p className="text-xs text-gray-500 mt-1">{campaign.game_system}</p>
                    </Link>
                  ))}
                  {templateSnapshots.slice(0, 2).map((snapshot) => (
                    <Link
                      key={snapshot.id}
                      href={`/campaigns/${snapshot.content_id}/canvas?fromTemplate=true`}
                      className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-purple-500/30 transition-all"
                    >
                      <span className={`text-xs font-medium ${snapshot.is_public ? 'text-emerald-400' : 'text-purple-400'}`}>
                        {snapshot.is_public ? 'Published' : 'Template'}
                      </span>
                      <h4 className="font-medium text-white mt-1 truncate">
                        {snapshot.snapshot_data?.name || 'Untitled'}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">v{snapshot.version}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Collection Section */}
            {savedCampaigns.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Bookmark className="w-4 h-4 text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">Saved From Community</h3>
                    <span className="text-xs text-gray-500">{savedCampaigns.length}</span>
                  </div>
                  <button
                    onClick={() => setActiveTab('collection')}
                    className="text-sm text-purple-400 hover:text-purple-300"
                  >
                    View all →
                  </button>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {savedCampaigns.slice(0, 4).map((save) => (
                    <div
                      key={save.id}
                      className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-purple-500/30 transition-all"
                    >
                      <span className="text-xs font-medium text-purple-400">Saved</span>
                      <h4 className="font-medium text-white mt-1 truncate">{save.source_name}</h4>
                      <p className="text-xs text-gray-500 mt-1">v{save.saved_version}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Empty state when nothing */}
            {campaigns.length === 0 && joinedCampaigns.length === 0 && savedCampaigns.length === 0 && (
              <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-purple-900/20 via-gray-900 to-gray-950 border border-white/[0.06] p-16 text-center">
                <Sparkles className="w-20 h-20 mx-auto mb-6 text-purple-400/50" />
                <h2 className="text-2xl font-display font-bold text-white mb-3">
                  Begin Your Adventure
                </h2>
                <p className="text-gray-400 mb-8 max-w-md mx-auto">
                  Create your first campaign and start building an unforgettable story with your players.
                </p>
                <Link
                  href="/campaigns/new"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl transition-colors"
                >
                  <Swords className="w-5 h-5" />
                  Create Your First Campaign
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Discover Tab - Coming Soon */}
        {activeTab === 'discover' && (
          <div className="text-center py-20 bg-white/[0.02] border border-white/[0.06] rounded-xl">
            <Sparkles className="w-16 h-16 mx-auto mb-6 text-purple-400/30" />
            <h3 className="text-xl font-semibold text-white mb-2">Discover Coming Soon</h3>
            <p className="text-gray-400 max-w-md mx-auto">
              Browse campaigns shared by the community. Find your next adventure or share your creations with others.
            </p>
          </div>
        )}

        {/* Collection Tab (Saved Campaigns) */}
        {activeTab === 'collection' && (
          <div className="space-y-6">
            {savedCampaigns.length === 0 ? (
              <div className="text-center py-16 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                <Bookmark className="w-12 h-12 mx-auto mb-4 text-purple-400/50" />
                <h3 className="text-lg font-medium text-white mb-2">No saved campaigns yet</h3>
                <p className="text-gray-400 max-w-sm mx-auto">
                  When you save campaign templates from share links, they'll appear here.
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedCampaigns.map((save) => (
                  <div
                    key={save.id}
                    className="relative rounded-xl overflow-hidden bg-gray-900/50 border border-white/[0.06] hover:border-purple-500/40 transition-all"
                  >
                    <div className="relative h-40 overflow-hidden">
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
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 to-gray-900 flex items-center justify-center">
                          <Swords className="w-12 h-12 text-purple-400/30" />
                        </div>
                      )}
                      <div className="absolute top-3 left-3">
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          Saved Template
                        </span>
                      </div>
                    </div>
                    <div className="p-5">
                      <h4 className="font-display font-semibold text-lg text-white truncate">
                        {save.source_name}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        v{save.saved_version}
                        {save.update_available && (
                          <span className="ml-2 text-purple-400">Update available!</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Saved {formatDate(save.saved_at)}
                      </p>
                      {save.instance_id ? (
                        <Link
                          href={`/campaigns/${save.instance_id}/dashboard`}
                          className="mt-4 flex items-center justify-center gap-2 w-full px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          <Play className="w-4 h-4" />
                          Continue Playing
                        </Link>
                      ) : (
                        <button
                          onClick={() => {
                            // Open start playing modal - would need to add state for this
                            router.push(`/vault?startPlaying=${save.id}`)
                          }}
                          className="mt-4 flex items-center justify-center gap-2 w-full px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          <Play className="w-4 h-4" />
                          Start Playing
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Active - Playing (Joined Campaigns) */}
        {activeTab === 'active' && subFilter === 'playing' && (
          <div className="space-y-6">
            {joinedCampaigns.length === 0 ? (
              <div className="text-center py-16 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                <Swords className="w-12 h-12 mx-auto mb-4 text-purple-400/50" />
                <h3 className="text-lg font-medium text-white mb-2">No campaigns joined yet</h3>
                <p className="text-gray-400 max-w-sm mx-auto">
                  When you're invited to join a campaign, it will appear here.
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {joinedCampaigns.map(({ membership, campaign }) => (
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
                          <Swords className="w-16 h-16 text-purple-400/30" />
                        </div>
                      )}
                      <div className="absolute top-3 left-3 flex gap-2">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg border ${
                          membership.status === 'pending'
                            ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        }`}>
                          {membership.status === 'pending' ? 'Pending Invite' : formatRoleLabel(membership.role)}
                        </span>
                      </div>
                      <div className="absolute top-3 right-3">
                        <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-black/60 backdrop-blur-sm text-gray-300">
                          {campaign.game_system}
                        </span>
                      </div>
                    </div>
                    <div className="p-5">
                      <h4 className="font-display font-semibold text-lg text-white truncate group-hover:text-purple-400 transition-colors">
                        {campaign.name}
                      </h4>
                      {campaign.description && (
                        <p className="text-sm text-gray-400 mt-2 line-clamp-2">
                          {campaign.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-3">
                        {membership.joined_at
                          ? `Joined ${formatDate(membership.joined_at)}`
                          : `Invited ${formatDate(membership.invited_at!)}`}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* My Work - Drafts (Inactive Campaigns) */}
        {activeTab === 'my-work' && subFilter === 'drafts' && (
          <div className="space-y-6">
            {filteredCampaigns.length === 0 ? (
              <div className="text-center py-16 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                <Swords className="w-12 h-12 mx-auto mb-4 text-gray-400/50" />
                <h3 className="text-lg font-medium text-white mb-2">No inactive campaigns</h3>
                <p className="text-gray-400 max-w-sm mx-auto">
                  Completed or retired campaigns will appear here.
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCampaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="group relative rounded-xl overflow-hidden bg-gray-900/30 border border-white/[0.04] opacity-75 hover:opacity-100 transition-all"
                  >
                    <div className="relative h-40 overflow-hidden">
                      {campaign.image_url ? (
                        <>
                          <Image
                            src={campaign.image_url}
                            alt={campaign.name}
                            fill
                            className="object-cover grayscale group-hover:grayscale-0 transition-all"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
                        </>
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-800/30 to-gray-900 flex items-center justify-center">
                          <Swords className="w-12 h-12 text-gray-500/30" />
                        </div>
                      )}
                      <div className="absolute top-3 left-3">
                        <TemplateStateBadge mode="inactive" inactiveReason={campaign.inactive_reason} size="sm" />
                      </div>
                    </div>
                    <div className="p-5">
                      <h4 className="font-display font-semibold text-lg text-gray-300 truncate">
                        {campaign.name}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">{campaign.game_system}</p>
                      <button
                        onClick={() => handleReactivate(campaign.id)}
                        className="mt-4 flex items-center justify-center gap-2 w-full px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium rounded-lg transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Reactivate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* My Work - My Templates (Private Templates) */}
        {activeTab === 'my-work' && (subFilter === 'my-templates' || subFilter === 'published') && (
          <div className="space-y-6">
            {templateSnapshots.length === 0 ? (
              <div className="text-center py-16 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                <Sparkles className="w-12 h-12 mx-auto mb-4 text-purple-400/50" />
                <h3 className="text-lg font-medium text-white mb-2">No templates yet</h3>
                <p className="text-gray-400 max-w-sm mx-auto">
                  Publish your campaigns as templates to share Session 0 ready content with others.
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {templateSnapshots.map((snapshot) => {
                  const snapshotData = snapshot.snapshot_data || {}
                  const campaign = campaigns.find(c => c.id === snapshot.content_id)
                  const imageUrl = snapshotData.image_url || campaign?.image_url
                  const name = snapshotData.name || campaign?.name || 'Untitled'
                  const gameSystem = snapshotData.game_system || campaign?.game_system || 'D&D 5e'

                  return (
                    <Link
                      key={snapshot.id}
                      href={`/campaigns/${snapshot.content_id}/canvas?fromTemplate=true`}
                      className="group relative rounded-xl overflow-hidden bg-gray-900/50 border border-purple-500/20 hover:border-purple-500/40 transition-all"
                    >
                      <div className="relative h-48 overflow-hidden">
                        {imageUrl ? (
                          <>
                            <Image
                              src={imageUrl}
                              alt={name}
                              fill
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
                          </>
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 to-gray-900 flex items-center justify-center">
                            <Swords className="w-16 h-16 text-purple-400/30" />
                          </div>
                        )}
                        <div className="absolute top-3 left-3 flex gap-2">
                          {snapshot.is_public ? (
                            <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Public
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-500/20 text-gray-300 border border-gray-500/30">
                              Private
                            </span>
                          )}
                        </div>
                        {snapshot.save_count > 0 && (
                          <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg text-xs text-gray-300">
                            {snapshot.save_count} saves
                          </div>
                        )}
                      </div>
                      <div className="p-5">
                        <h4 className="font-display font-semibold text-lg text-white truncate group-hover:text-purple-400 transition-colors">
                          {name}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {gameSystem} • v{snapshot.version}
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
            )}
          </div>
        )}

        {/* Active - Running (My Campaigns) */}
        {(activeTab === 'active' && subFilter === 'running') && (
          filteredCampaigns.length === 0 ? (
            /* Empty State */
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-purple-900/20 via-gray-900 to-gray-950 border border-white/[0.06] p-16 text-center">
              <Sparkles className="w-20 h-20 mx-auto mb-6 text-purple-400/50" />
              <h2 className="text-2xl font-display font-bold text-white mb-3">
                Begin Your Adventure
              </h2>
              <p className="text-gray-400 mb-8 max-w-md mx-auto">
                Create your first campaign and start building an unforgettable story with your players.
              </p>
              <Link
                href="/campaigns/new"
                className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl transition-colors"
              >
                <Swords className="w-5 h-5" />
                Create Your First Campaign
              </Link>
            </div>
          ) : (
            <>
            {/* Featured Campaign (Hero) */}
            {featuredCampaign && (
              <section className="group relative">
                <Link
                  href={`/campaigns/${featuredCampaign.id}/dashboard`}
                  className="relative block rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-950 border border-white/[0.06] hover:border-purple-500/30 transition-all duration-500"
                >
                  <div className="relative h-[350px] md:h-[450px] overflow-hidden">
                    {featuredCampaign.image_url ? (
                      <>
                        <Image
                          src={featuredCampaign.image_url}
                          alt={featuredCampaign.name}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                          priority
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />
                      </>
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-gray-900 to-gray-950 flex items-center justify-center">
                        <Swords className="w-32 h-32 text-purple-400/20" />
                      </div>
                    )}

                    {/* Content Overlay */}
                    <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-12">
                      <div className="flex items-center gap-2 mb-4">
                        <ContentBadge
                          variant={getCampaignBadge(featuredCampaign, user?.id || '').primary}
                          size="lg"
                          progress={getCampaignBadge(featuredCampaign, user?.id || '').progress}
                        />
                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-white/10 text-gray-300">
                          {featuredCampaign.game_system}
                        </span>
                      </div>

                      <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-3 group-hover:text-purple-400 transition-colors">
                        {featuredCampaign.name}
                      </h2>

                      {featuredCampaign.description && (
                        <p className="text-gray-300 text-base md:text-lg max-w-2xl line-clamp-2 mb-4">
                          {featuredCampaign.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2 text-purple-400 font-medium">
                        <Play className="w-5 h-5" />
                        <span>Enter Campaign</span>
                        <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </div>
                </Link>

                {/* Edit/Delete buttons - positioned outside the link */}
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEditModal(featuredCampaign) }}
                    className="p-2.5 bg-black/70 backdrop-blur-sm rounded-lg hover:bg-purple-500 transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4 text-white" />
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(featuredCampaign.id) }}
                    className="p-2.5 bg-black/70 backdrop-blur-sm rounded-lg hover:bg-red-500 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                </div>
              </section>
            )}

            {/* Campaign Grid */}
            {filteredCampaigns.length > 1 && (
              <section>
                <h3 className="text-xl font-semibold text-white mb-6">All Campaigns</h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCampaigns.map((campaign) => {
                    const badge = getCampaignBadge(campaign, user?.id || '')
                    return (
                      <div key={campaign.id} className="group relative">
                        <Link
                          href={`/campaigns/${campaign.id}/dashboard`}
                          className="relative block rounded-xl overflow-hidden bg-gray-900/50 border border-white/[0.06] hover:border-purple-500/40 transition-all"
                        >
                          {/* Large Image */}
                          <div className="relative h-48 sm:h-56 overflow-hidden">
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
                                <Swords className="w-16 h-16 text-purple-400/30" />
                              </div>
                            )}

                            {/* Badge and game system */}
                            <div className="absolute top-3 left-3 flex gap-2">
                              <ContentBadge
                                variant={badge.primary}
                                size="sm"
                                progress={badge.progress}
                              />
                            </div>
                            <div className="absolute top-3 right-12">
                              <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-black/60 backdrop-blur-sm text-gray-300">
                                {campaign.game_system}
                              </span>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="p-5">
                            <h4 className="font-display font-semibold text-lg text-white truncate group-hover:text-purple-400 transition-colors">
                              {campaign.name}
                            </h4>
                            {campaign.description && (
                              <p className="text-sm text-gray-400 mt-2 line-clamp-2">
                                {campaign.description}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 mt-3">
                              Updated {formatDate(campaign.updated_at)}
                            </p>
                          </div>
                        </Link>

                        {/* Edit/Delete buttons */}
                        <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEditModal(campaign) }}
                            className="p-2 bg-black/70 backdrop-blur-sm rounded-lg hover:bg-purple-500 transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5 text-white" />
                          </button>
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(campaign.id) }}
                            className="p-2 bg-black/70 backdrop-blur-sm rounded-lg hover:bg-red-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-white" />
                          </button>
                        </div>
                      </div>
                    )
                  })}

                  {/* Create New Card */}
                  <Link
                    href="/campaigns/new"
                    className="group relative rounded-xl overflow-hidden bg-gradient-to-br from-purple-900/10 to-gray-900/50 border-2 border-dashed border-purple-500/20 hover:border-purple-500/50 transition-all flex flex-col items-center justify-center gap-4 min-h-[280px]"
                  >
                    <div className="p-4 rounded-full bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                      <Plus className="w-8 h-8 text-purple-400" />
                    </div>
                    <span className="text-sm font-medium text-purple-400">Create New Campaign</span>
                  </Link>
                </div>
              </section>
            )}

            {/* Single campaign - show create prompt */}
            {filteredCampaigns.length === 1 && (
              <section>
                <div className="flex flex-col items-center justify-center py-12 bg-white/[0.015] border border-dashed border-white/[0.08] rounded-xl">
                  <p className="text-gray-400 mb-4">Great start! Add more campaigns to your collection.</p>
                  <Link
                    href="/campaigns/new"
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600/80 hover:bg-purple-500 text-white font-medium rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create Another Campaign
                  </Link>
                </div>
              </section>
            )}
            </>
          )
        )}
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingCampaign}
        onClose={() => {
          setEditingCampaign(null)
          setFormData({ name: '', game_system: 'D&D 5e', description: '', image_url: null })
        }}
        title="Edit Campaign"
        size="lg"
      >
        <div className="space-y-5">
          {/* Campaign Image */}
          <div className="form-group">
            <label className="form-label">Campaign Image</label>
            <button
              type="button"
              onClick={() => setImageModalOpen(true)}
              className="relative w-full aspect-video rounded-xl overflow-hidden transition-all group"
              style={{
                backgroundColor: formData.image_url ? 'transparent' : '#1a1a24',
                border: formData.image_url ? '2px solid #2a2a3a' : '2px dashed #606070',
              }}
            >
              {formData.image_url ? (
                <>
                  <Image
                    src={formData.image_url}
                    alt="Campaign"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <Camera className="w-8 h-8 text-[#606070] group-hover:text-[#8B5CF6] transition-colors" />
                  <span className="text-sm text-[#606070] group-hover:text-[#8B5CF6] transition-colors">Click to add image</span>
                </div>
              )}
            </button>
          </div>

          <div className="form-group">
            <label className="form-label">Campaign Name</label>
            <Input
              className="form-input"
              placeholder="e.g., Curse of Strahd"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Game System</label>
            <Dropdown
              options={GAME_SYSTEMS}
              value={formData.game_system}
              onChange={(value) => setFormData({ ...formData, game_system: value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description (optional)</label>
            <Textarea
              className="form-textarea"
              placeholder="Brief description of your campaign..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              className="btn btn-secondary"
              onClick={() => setEditingCampaign(null)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleUpdate}
              disabled={!formData.name.trim() || saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Unified Image Modal */}
      <UnifiedImageModal
        isOpen={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        imageType="campaign"
        currentImageUrl={formData.image_url}
        onImageChange={(url) => setFormData({ ...formData, image_url: url })}
        onUpload={handleImageUpload}
        promptData={{
          title: formData.name,
          summary: formData.description,
          game_system: formData.game_system,
        }}
        title="Campaign"
      />
      <BackToTopButton />
    </AppLayout>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Swords,
  BookOpen,
  Scroll,
  Plus,
  Clock,
  ChevronRight,
  Play,
  Sparkles,
  ArrowRight,
  Bookmark,
  X,
  Compass,
  Users,
  Map,
  Wand2,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { BackToTopButton } from '@/components/ui/back-to-top'
import { OnboardingTour } from '@/components/ui'
import { FounderBadge } from '@/components/membership'
import { MobileLayout, MobileSectionHeader, MobileSearchBar } from '@/components/mobile'
import { useSupabase, useUser, useIsMobile, useMembership } from '@/hooks'
import { useAppStore } from '@/store'
import { formatDistanceToNow, cn } from '@/lib/utils'
import type { Campaign, VaultCharacter, Oneshot, ContentSave } from '@/types/database'
import { HomePageMobile } from './page.mobile'

export default function HomePage() {
  const router = useRouter()
  const supabase = useSupabase()
  const { user } = useUser()
  const isMobile = useIsMobile()
  const { recentItems } = useAppStore()
  const { isFounder, loading: membershipLoading } = useMembership()

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [adventures, setAdventures] = useState<Campaign[]>([])
  const [joinedCampaigns, setJoinedCampaigns] = useState<Campaign[]>([])
  const [characters, setCharacters] = useState<VaultCharacter[]>([])
  const [oneshots, setOneshots] = useState<Oneshot[]>([])
  const [savedTemplates, setSavedTemplates] = useState<ContentSave[]>([])
  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [founderBannerDismissed, setFounderBannerDismissed] = useState(true) // Start true to prevent flash

  // Check if founder banner was dismissed
  useEffect(() => {
    const dismissed = localStorage.getItem('founder-banner-dismissed')
    setFounderBannerDismissed(dismissed === 'true')
  }, [])

  const dismissFounderBanner = () => {
    localStorage.setItem('founder-banner-dismissed', 'true')
    setFounderBannerDismissed(true)
  }

  useEffect(() => {
    if (user) {
      loadData()
      checkOnboarding()
    }
  }, [user])

  const checkOnboarding = async () => {
    if (!user) return
    try {
      const { data } = await supabase
        .from('user_settings')
        .select('onboarding_completed')
        .eq('user_id', user.id)
        .single()

      // Show tour if onboarding not completed (and column exists)
      if (data && data.onboarding_completed === false) {
        setShowOnboarding(true)
      }
    } catch {
      // Column might not exist yet, ignore errors
    }
  }

  const loadData = async () => {
    if (!user) return

    const [campaignsRes, adventuresRes, charactersRes, oneshotsRes, savedRes] = await Promise.all([
      // Campaigns: duration_type = 'campaign' or null (legacy)
      supabase
        .from('campaigns')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .or('content_mode.eq.active,content_mode.is.null')
        .or('duration_type.eq.campaign,duration_type.is.null')
        .order('updated_at', { ascending: false })
        .limit(6),
      // Adventures: duration_type = 'adventure'
      supabase
        .from('campaigns')
        .select('*')
        .eq('user_id', user.id)
        .eq('duration_type', 'adventure')
        .is('deleted_at', null)
        .or('content_mode.eq.active,content_mode.is.null')
        .order('updated_at', { ascending: false })
        .limit(4),
      supabase
        .from('vault_characters')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .or('content_mode.eq.active,content_mode.is.null')
        .order('updated_at', { ascending: false })
        .limit(8),
      supabase
        .from('oneshots')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .or('content_mode.eq.active,content_mode.is.null')
        .order('updated_at', { ascending: false })
        .limit(4),
      supabase
        .from('content_saves')
        .select('*')
        .eq('user_id', user.id)
        .is('instance_id', null)
        .order('saved_at', { ascending: false })
        .limit(6),
    ])

    if (campaignsRes.data) setCampaigns(campaignsRes.data)
    if (adventuresRes.data) setAdventures(adventuresRes.data)
    if (charactersRes.data) setCharacters(charactersRes.data)
    if (oneshotsRes.data) setOneshots(oneshotsRes.data)
    if (savedRes.data) setSavedTemplates(savedRes.data)

    // Load joined campaigns (campaigns user is a member of but doesn't own)
    const joinedRes = await fetch('/api/campaigns/joined')
    if (joinedRes.ok) {
      const joinedData = await joinedRes.json()
      setJoinedCampaigns((joinedData.joinedCampaigns || []).map((j: { campaign: Campaign }) => j.campaign))
    }

    setLoading(false)
  }

  function getInitials(name: string): string {
    return name.split(' ').map((word) => word[0]).slice(0, 2).join('').toUpperCase()
  }

  // Check if this is a fresh user (no content at all, including joined campaigns)
  const isFreshUser = !loading && campaigns.length === 0 && adventures.length === 0 && joinedCampaigns.length === 0 && characters.length === 0 && oneshots.length === 0

  const featuredCampaign = campaigns[0]
  const featuredAdventure = adventures[0]
  const featuredCharacter = characters[0]
  const featuredOneshot = oneshots[0]
  // Show all campaigns in the grid (including featured) - slice to limit display
  const displayCampaigns = campaigns.slice(0, 6)
  const displayAdventures = adventures.slice(0, 4)

  // ============ MOBILE LAYOUT ============
  if (isMobile) {
    return (
      <>
        <HomePageMobile
          campaigns={campaigns}
          adventures={adventures}
          characters={characters}
          oneshots={oneshots}
          savedTemplates={savedTemplates}
          featuredCampaign={featuredCampaign}
          displayCampaigns={displayCampaigns}
          onNavigate={(path) => router.push(path)}
          isFounder={isFounder}
          founderBannerDismissed={founderBannerDismissed}
          onDismissFounderBanner={dismissFounderBanner}
          isFreshUser={isFreshUser}
        />
        <OnboardingTour
          isOpen={showOnboarding}
          onClose={() => setShowOnboarding(false)}
        />
      </>
    )
  }

  // ============ DESKTOP LAYOUT ============
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-12">

        {/* Founder Welcome Banner */}
        {isFounder && !membershipLoading && !founderBannerDismissed && (
          <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl relative group">
            <FounderBadge size="lg" />
            <div className="flex-1">
              <p className="font-medium text-amber-400">You're a Founder!</p>
              <p className="text-sm text-amber-200/70">
                Thanks for being here early. You've got extra capacity to build out your worlds.
              </p>
            </div>
            <button
              onClick={dismissFounderBanner}
              className="absolute top-2 right-2 p-1.5 rounded-lg text-amber-400/50 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Fresh User Welcome Experience */}
        {isFreshUser && (
          <div className="space-y-8">
            {/* Welcome Hero */}
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center">
                <Wand2 className="w-10 h-10 text-purple-400" />
              </div>
              <h1 className="text-4xl font-display font-bold text-white mb-3">
                Welcome to Multiloop
              </h1>
              <p className="text-gray-400 text-lg max-w-xl mx-auto">
                Your all-in-one platform for TTRPG campaign management. Let's get you started on your adventure.
              </p>
            </div>

            {/* Getting Started Cards */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Start a Campaign */}
              <div className="group relative rounded-2xl overflow-hidden bg-gradient-to-br from-blue-900/30 to-gray-900 border border-blue-500/20 hover:border-blue-500/40 transition-all p-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <Swords className="w-7 h-7 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-2">Start a Campaign</h3>
                    <p className="text-gray-400 text-sm mb-4">
                      Create an ongoing campaign for long-term storytelling. Perfect for epic adventures that span many sessions.
                    </p>
                    <Link
                      href="/campaigns/new"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Create Campaign
                    </Link>
                  </div>
                </div>
              </div>

              {/* Start an Adventure */}
              <div className="group relative rounded-2xl overflow-hidden bg-gradient-to-br from-amber-900/30 to-gray-900 border border-amber-500/20 hover:border-amber-500/40 transition-all p-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <Compass className="w-7 h-7 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-2">Start an Adventure</h3>
                    <p className="text-gray-400 text-sm mb-4">
                      Multi-session stories that span 3-9 sessions. Great for published modules or shorter arcs.
                    </p>
                    <Link
                      href="/adventures/new"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Create Adventure
                    </Link>
                  </div>
                </div>
              </div>

              {/* Create a One-Shot */}
              <div className="group relative rounded-2xl overflow-hidden bg-gradient-to-br from-green-900/30 to-gray-900 border border-green-500/20 hover:border-green-500/40 transition-all p-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <Scroll className="w-7 h-7 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-2">Create a One-Shot</h3>
                    <p className="text-gray-400 text-sm mb-4">
                      Single-session adventures for quick games, convention play, or trying new systems.
                    </p>
                    <Link
                      href="/oneshots/new"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Create One-Shot
                    </Link>
                  </div>
                </div>
              </div>

              {/* Character Vault */}
              <div className="group relative rounded-2xl overflow-hidden bg-gradient-to-br from-purple-900/30 to-gray-900 border border-purple-500/20 hover:border-purple-500/40 transition-all p-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-7 h-7 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-2">Build Your Character</h3>
                    <p className="text-gray-400 text-sm mb-4">
                      Create detailed characters with backstories, motivations, and more. Use them across any campaign.
                    </p>
                    <Link
                      href="/vault/new"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Create Character
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Explore Section */}
            <div className="text-center py-6 border-t border-white/[0.06]">
              <p className="text-gray-400 mb-4">Or explore what's already here</p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/demo/campaign" className="btn btn-ghost text-sm">
                  <Sparkles className="w-4 h-4" />
                  Demo Campaign
                </Link>
                <Link href="/demo/character" className="btn btn-ghost text-sm">
                  <Sparkles className="w-4 h-4" />
                  Demo Character
                </Link>
                <Link href="/demo/oneshot" className="btn btn-ghost text-sm">
                  <Sparkles className="w-4 h-4" />
                  Demo One-Shot
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Returning User Content */}
        {!isFreshUser && (
          <>
        {/* Your Campaigns Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Swords className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">Your Campaigns</h3>
            </div>
            {campaigns.length > 0 && (
              <Link href="/campaigns" className="text-sm text-[--arcane-purple] hover:underline flex items-center gap-1">
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>

          {/* Featured Campaign Hero */}
          {featuredCampaign && (
            <Link
              href={`/campaigns/${featuredCampaign.id}/dashboard`}
              className="group relative block rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-950 border border-white/[0.06] hover:border-blue-500/30 transition-all duration-500 mb-6"
            >
              <div className="relative h-[280px] md:h-[360px]">
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
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-gray-900 to-gray-950" />
                )}

                {/* Content Overlay */}
                <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-10">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-300">
                      Continue Playing
                    </span>
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-white/10 text-gray-300">
                      {featuredCampaign.game_system}
                    </span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                    {featuredCampaign.name}
                  </h2>
                  {featuredCampaign.description && (
                    <p className="text-gray-400 text-sm md:text-base max-w-2xl line-clamp-2 mb-4">
                      {featuredCampaign.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-blue-400 font-medium">
                    <Play className="w-5 h-5" />
                    <span>Enter Campaign</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            </Link>
          )}

          {campaigns.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                <Swords className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Begin Your Adventure</h3>
              <p className="text-gray-400 mb-6 max-w-sm mx-auto">
                Create your first campaign and start building your world
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/campaigns" className="btn btn-secondary">
                  <Plus className="w-4 h-4" />
                  Create Campaign
                </Link>
                <Link href="/demo/campaign" className="btn btn-ghost text-sm">
                  <Sparkles className="w-4 h-4" />
                  Explore Demo
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayCampaigns.map((campaign) => (
                <Link
                  key={campaign.id}
                  href={`/campaigns/${campaign.id}/dashboard`}
                  className="group relative rounded-xl overflow-hidden bg-gray-900/50 border border-white/[0.06] hover:border-blue-500/30 transition-all"
                >
                  <div className="relative h-40">
                    {campaign.image_url ? (
                      <>
                        <Image
                          src={campaign.image_url}
                          alt={campaign.name}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent" />
                      </>
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/30 to-gray-900 flex items-center justify-center">
                        <Swords className="w-12 h-12 text-blue-400/30" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h4 className="font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                      {campaign.name}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">{campaign.game_system}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Adventures Section */}
        {adventures.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Compass className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="text-xl font-semibold text-white">Adventures</h3>
              </div>
              <Link href="/adventures" className="text-sm text-[--arcane-purple] hover:underline flex items-center gap-1">
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Featured Adventure Hero */}
            {featuredAdventure && (
              <Link
                href={`/campaigns/${featuredAdventure.id}/dashboard`}
                className="group relative block rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-950 border border-white/[0.06] hover:border-amber-500/30 transition-all duration-500 mb-6"
              >
                <div className="relative h-[200px] md:h-[280px]">
                  {featuredAdventure.image_url ? (
                    <>
                      <Image
                        src={featuredAdventure.image_url}
                        alt={featuredAdventure.name}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 via-gray-900 to-gray-950" />
                  )}

                  {/* Content Overlay */}
                  <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-300">
                        {(featuredAdventure as Campaign & { estimated_sessions?: number }).estimated_sessions || '3-9'} Sessions
                      </span>
                      <span className="px-3 py-1 text-xs font-medium rounded-full bg-white/10 text-gray-300">
                        {featuredAdventure.game_system}
                      </span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-2 group-hover:text-amber-400 transition-colors">
                      {featuredAdventure.name}
                    </h2>
                    {featuredAdventure.description && (
                      <p className="text-gray-400 text-sm max-w-2xl line-clamp-2 mb-3">
                        {featuredAdventure.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-amber-400 font-medium">
                      <Compass className="w-5 h-5" />
                      <span>Continue Adventure</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              </Link>
            )}

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {displayAdventures.map((adventure) => (
                <Link
                  key={adventure.id}
                  href={`/campaigns/${adventure.id}/dashboard`}
                  className="group relative rounded-xl overflow-hidden bg-gray-900/50 border border-white/[0.06] hover:border-amber-500/30 transition-all"
                >
                  <div className="relative h-32">
                    {adventure.image_url ? (
                      <>
                        <Image
                          src={adventure.image_url}
                          alt={adventure.name}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent" />
                      </>
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-amber-900/30 to-gray-900 flex items-center justify-center">
                        <Compass className="w-10 h-10 text-amber-400/30" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h4 className="font-semibold text-white truncate group-hover:text-amber-400 transition-colors text-sm">
                      {adventure.name}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">{adventure.game_system}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* One-Shots - Cinematic Posters */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Scroll className="w-5 h-5 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">One-Shots</h3>
            </div>
            {oneshots.length > 0 && (
              <Link href="/oneshots" className="text-sm text-[--arcane-purple] hover:underline flex items-center gap-1">
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>

          {oneshots.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-green-500/10 flex items-center justify-center">
                <Scroll className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Quick Adventures Await</h3>
              <p className="text-gray-400 mb-6 max-w-sm mx-auto">
                Create standalone one-shot adventures for quick games or convention play.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/oneshots" className="btn btn-secondary">
                  <Plus className="w-4 h-4" />
                  Create One-Shot
                </Link>
                <Link href="/demo/oneshot" className="btn btn-ghost text-sm">
                  <Sparkles className="w-4 h-4" />
                  Explore Demo
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Featured One-Shot Hero */}
              {featuredOneshot && (
              <Link
                href={`/oneshots/${featuredOneshot.id}`}
                className="group relative block rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-950 border border-white/[0.06] hover:border-green-500/30 transition-all duration-500 mb-6"
              >
                <div className="relative h-[280px] md:h-[360px]">
                  {featuredOneshot.image_url ? (
                    <>
                      <Image
                        src={featuredOneshot.image_url}
                        alt={featuredOneshot.title}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 via-gray-900 to-gray-950" />
                  )}

                  {/* Content Overlay */}
                  <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-10">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-green-300">
                        Continue One-Shot
                      </span>
                      <span className="px-3 py-1 text-xs font-medium rounded-full bg-white/10 text-gray-300">
                        {featuredOneshot.game_system}
                      </span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-2 group-hover:text-green-400 transition-colors">
                      {featuredOneshot.title}
                    </h2>
                    {featuredOneshot.tagline && (
                      <p className="text-gray-400 text-sm md:text-base mb-4">
                        {featuredOneshot.tagline}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-green-400 font-medium">
                      <Scroll className="w-5 h-5" />
                      <span>Open One-Shot</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              </Link>
            )}

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {oneshots.map((oneshot) => (
                <Link
                  key={oneshot.id}
                  href={`/oneshots/${oneshot.id}`}
                  className="group relative rounded-xl overflow-hidden bg-gray-900/50 border border-white/[0.06] hover:border-green-500/30 transition-all aspect-[2/3]"
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
                    {oneshot.tagline && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-1">{oneshot.tagline}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
            </>
          )}
        </section>

        {/* Character Vault - Portrait Gallery */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <BookOpen className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">Character Vault</h3>
            </div>
            <Link href="/vault" className="text-sm text-[--arcane-purple] hover:underline flex items-center gap-1">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Featured Character Hero */}
          {featuredCharacter && (
            <Link
              href={`/vault/${featuredCharacter.id}`}
              className="group relative block rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-950 border border-white/[0.06] hover:border-purple-500/30 transition-all duration-500 mb-6"
            >
              <div className="relative h-[280px] md:h-[360px]">
                {featuredCharacter.image_url ? (
                  <>
                    <Image
                      src={featuredCharacter.image_url}
                      alt={featuredCharacter.name}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />
                  </>
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-gray-900 to-gray-950" />
                )}

                {/* Content Overlay */}
                <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-10">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-purple-300">
                      Continue Your Story
                    </span>
                    {featuredCharacter.status && (
                      <span
                        className="px-3 py-1 text-xs font-medium rounded-full text-white"
                        style={{ backgroundColor: featuredCharacter.status_color || 'rgba(255,255,255,0.1)' }}
                      >
                        {featuredCharacter.status}
                      </span>
                    )}
                  </div>
                  <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">
                    {featuredCharacter.name}
                  </h2>
                  <p className="text-gray-400 text-sm md:text-base mb-4">
                    {[featuredCharacter.race, featuredCharacter.class].filter(Boolean).join(' ') || 'Adventurer'}
                  </p>
                  <div className="flex items-center gap-2 text-purple-400 font-medium">
                    <BookOpen className="w-5 h-5" />
                    <span>Open Character</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            </Link>
          )}

          {characters.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Your Vault Awaits</h3>
              <p className="text-gray-400 mb-6 max-w-sm mx-auto">
                Create characters once and reuse them across campaigns. Build detailed backstories and track their journeys.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/vault" className="btn btn-secondary">
                  <Plus className="w-4 h-4" />
                  Add Your First Character
                </Link>
                <Link href="/demo/character" className="btn btn-ghost text-sm">
                  <Sparkles className="w-4 h-4" />
                  Explore Demo
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {characters.map((character) => (
                <Link
                  key={character.id}
                  href={`/vault/${character.id}`}
                  className="group relative rounded-xl overflow-hidden bg-gray-900/50 border border-white/[0.06] hover:border-purple-500/30 transition-all aspect-[3/4]"
                >
                  {character.detail_image_url || character.image_url ? (
                    <>
                      <Image
                        src={character.detail_image_url || character.image_url!}
                        alt={character.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 to-gray-900 flex items-center justify-center">
                      <span className="text-4xl font-bold text-purple-400/40">
                        {getInitials(character.name)}
                      </span>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h4 className="font-semibold text-white truncate text-sm group-hover:text-purple-300 transition-colors">
                      {character.name}
                    </h4>
                    <p className="text-xs text-gray-400 truncate">
                      {[character.race, character.class].filter(Boolean).join(' ') || 'Adventurer'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Saved from Community */}
        {savedTemplates.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Bookmark className="w-5 h-5 text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-white">Saved from Community</h3>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedTemplates.map((save) => {
                const getContentLink = () => {
                  switch (save.source_type) {
                    case 'campaign':
                      return `/campaigns?startPlaying=${save.id}`
                    case 'character':
                      return `/vault?startPlaying=${save.id}`
                    case 'oneshot':
                      return `/oneshots?startPlaying=${save.id}`
                    default:
                      return '#'
                  }
                }

                const getIcon = () => {
                  switch (save.source_type) {
                    case 'campaign':
                      return <Swords className="w-8 h-8 text-blue-400/30" />
                    case 'character':
                      return <BookOpen className="w-8 h-8 text-purple-400/30" />
                    case 'oneshot':
                      return <Scroll className="w-8 h-8 text-amber-400/30" />
                    default:
                      return <Bookmark className="w-8 h-8 text-gray-400/30" />
                  }
                }

                const getColorClasses = () => {
                  switch (save.source_type) {
                    case 'campaign':
                      return 'from-blue-900/30 to-gray-900 hover:border-blue-500/30'
                    case 'character':
                      return 'from-purple-900/30 to-gray-900 hover:border-purple-500/30'
                    case 'oneshot':
                      return 'from-amber-900/30 to-gray-900 hover:border-amber-500/30'
                    default:
                      return 'from-gray-800/30 to-gray-900 hover:border-gray-500/30'
                  }
                }

                return (
                  <div
                    key={save.id}
                    className={cn(
                      "group relative rounded-xl overflow-hidden bg-gradient-to-br border border-white/[0.06] transition-all",
                      getColorClasses()
                    )}
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
                          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent" />
                        </>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          {getIcon()}
                        </div>
                      )}
                      <div className="absolute top-2 left-2">
                        <span className="px-2 py-1 text-[10px] font-medium bg-green-500/20 text-green-400 rounded capitalize">
                          {save.source_type}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h4 className="font-semibold text-white truncate">{save.source_name}</h4>
                      <p className="text-xs text-gray-500 mt-1">v{save.saved_version}</p>
                      {save.instance_id ? (
                        <Link
                          href={
                            save.source_type === 'campaign'
                              ? `/campaigns/${save.instance_id}/dashboard`
                              : save.source_type === 'character'
                              ? `/vault/${save.instance_id}`
                              : `/oneshots/${save.instance_id}`
                          }
                          className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          <Play className="w-4 h-4" />
                          Continue Playing
                        </Link>
                      ) : (
                        <Link
                          href={getContentLink()}
                          className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          <Play className="w-4 h-4" />
                          Start Playing
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Recent Activity - Subtle Footer */}
        {recentItems.length > 0 && (
          <section className="border-t border-white/[0.06] pt-8">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-medium text-gray-400">Recent Activity</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentItems.slice(0, 6).map((item) => (
                <Link
                  key={`${item.type}-${item.id}`}
                  href={item.href}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-colors text-sm"
                >
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      width={20}
                      height={20}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-[--arcane-purple]/20 flex items-center justify-center text-[10px] font-bold text-[--arcane-purple]">
                      {item.name.charAt(0)}
                    </span>
                  )}
                  <span className="text-gray-300 truncate max-w-[120px]">{item.name}</span>
                  <span className="text-gray-600 text-xs">
                    {formatDistanceToNow(new Date(item.visitedAt))}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Quick Actions Footer */}
        <section className="flex flex-wrap justify-center gap-3 pt-4 pb-8">
          <Link href="/campaigns" className="btn btn-ghost text-sm">
            <Swords className="w-4 h-4" />
            Campaigns
          </Link>
          <Link href="/adventures" className="btn btn-ghost text-sm">
            <Compass className="w-4 h-4" />
            Adventures
          </Link>
          <Link href="/oneshots" className="btn btn-ghost text-sm">
            <Scroll className="w-4 h-4" />
            One-Shots
          </Link>
          <Link href="/vault" className="btn btn-ghost text-sm">
            <BookOpen className="w-4 h-4" />
            Character Vault
          </Link>
        </section>
        </>
        )}
      </div>

      <BackToTopButton />

      {/* Onboarding Tour */}
      <OnboardingTour
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />
    </AppLayout>
  )
}

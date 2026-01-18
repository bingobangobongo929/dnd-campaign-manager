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
} from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { BackToTopButton } from '@/components/ui/back-to-top'
import { MobileLayout, MobileSectionHeader, MobileSearchBar } from '@/components/mobile'
import { useSupabase, useUser, useIsMobile } from '@/hooks'
import { useAppStore } from '@/store'
import { formatDistanceToNow, cn } from '@/lib/utils'
import type { Campaign, VaultCharacter, Oneshot } from '@/types/database'

export default function HomePage() {
  const router = useRouter()
  const supabase = useSupabase()
  const { user } = useUser()
  const isMobile = useIsMobile()
  const { recentItems } = useAppStore()

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [characters, setCharacters] = useState<VaultCharacter[]>([])
  const [oneshots, setOneshots] = useState<Oneshot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    if (!user) return

    const [campaignsRes, charactersRes, oneshotsRes] = await Promise.all([
      supabase
        .from('campaigns')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(6),
      supabase
        .from('vault_characters')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(8),
      supabase
        .from('oneshots')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(4),
    ])

    if (campaignsRes.data) setCampaigns(campaignsRes.data)
    if (charactersRes.data) setCharacters(charactersRes.data)
    if (oneshotsRes.data) setOneshots(oneshotsRes.data)
    setLoading(false)
  }

  function getInitials(name: string): string {
    return name.split(' ').map((word) => word[0]).slice(0, 2).join('').toUpperCase()
  }

  const featuredCampaign = campaigns[0]
  const featuredCharacter = characters[0]
  const featuredOneshot = oneshots[0]
  // Show all campaigns in the grid (including featured) - slice to limit display
  const displayCampaigns = campaigns.slice(0, 6)

  // Mobile Home View
  if (isMobile) {
    return (
      <AppLayout>
        <MobileLayout title="Home" showBackButton={false}>
          {/* Featured Campaign Card */}
          {featuredCampaign && (
            <div className="px-4 mb-6">
              <button
                onClick={() => router.push(`/campaigns/${featuredCampaign.id}/canvas`)}
                className="w-full relative rounded-2xl overflow-hidden bg-gray-900 border border-white/[0.06] active:scale-[0.98] transition-transform"
              >
                <div className="relative h-48">
                  {featuredCampaign.image_url ? (
                    <>
                      <Image
                        src={featuredCampaign.image_url}
                        alt={featuredCampaign.name}
                        fill
                        className="object-cover"
                        priority
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[--arcane-purple]/20 via-gray-900 to-gray-950" />
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <span className="inline-block px-2 py-1 text-[10px] font-semibold uppercase tracking-wider rounded bg-[--arcane-purple] text-white mb-2">
                      Continue
                    </span>
                    <h2 className="text-xl font-display font-bold text-white">
                      {featuredCampaign.name}
                    </h2>
                    <p className="text-xs text-gray-400 mt-1">{featuredCampaign.game_system}</p>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Campaigns Section */}
          {displayCampaigns.length > 0 && (
            <>
              <MobileSectionHeader
                title="Campaigns"
                action={
                  <button onClick={() => router.push('/campaigns')} className="text-sm text-[--arcane-purple]">
                    View All
                  </button>
                }
              />
              <div className="px-4 space-y-3">
                {displayCampaigns.slice(0, 4).map((campaign) => (
                  <button
                    key={campaign.id}
                    onClick={() => router.push(`/campaigns/${campaign.id}/canvas`)}
                    className="w-full flex items-center gap-4 p-3 bg-[--bg-surface] rounded-xl border border-white/[0.06] active:bg-[--bg-hover] transition-colors"
                  >
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-900 flex-shrink-0">
                      {campaign.image_url ? (
                        <Image
                          src={campaign.image_url}
                          alt={campaign.name}
                          width={56}
                          height={56}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-900/30 to-gray-900">
                          <Swords className="w-6 h-6 text-blue-400/50" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <h4 className="font-semibold text-white truncate">{campaign.name}</h4>
                      <p className="text-xs text-gray-500">{campaign.game_system}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Characters Section */}
          <MobileSectionHeader
            title="Recent Characters"
            action={
              <button onClick={() => router.push('/vault')} className="text-sm text-[--arcane-purple]">
                View All
              </button>
            }
          />
          {characters.length === 0 ? (
            <div className="mx-4 p-8 text-center bg-[--bg-surface] rounded-xl border border-white/[0.06]">
              <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-600" />
              <p className="text-gray-500 text-sm mb-4">No characters yet</p>
              <button
                onClick={() => router.push('/vault/new')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg"
              >
                <Plus className="w-4 h-4" />
                Create Character
              </button>
            </div>
          ) : (
            <div className="px-4 grid grid-cols-2 gap-3">
              {characters.slice(0, 6).map((character) => (
                <button
                  key={character.id}
                  onClick={() => router.push(`/vault/${character.id}`)}
                  className="relative aspect-[3/4] rounded-xl overflow-hidden bg-gray-900 border border-white/[0.06] active:scale-[0.98] transition-transform"
                >
                  {character.detail_image_url || character.image_url ? (
                    <>
                      <Image
                        src={character.detail_image_url || character.image_url!}
                        alt={character.name}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 to-gray-900 flex items-center justify-center">
                      <span className="text-2xl font-bold text-purple-400/40">
                        {getInitials(character.name)}
                      </span>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h4 className="font-semibold text-white text-sm truncate">{character.name}</h4>
                    <p className="text-[11px] text-gray-400 truncate">
                      {[character.race, character.class].filter(Boolean).join(' ')}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* One-Shots Section */}
          {oneshots.length > 0 && (
            <>
              <MobileSectionHeader
                title="One-Shots"
                action={
                  <button onClick={() => router.push('/oneshots')} className="text-sm text-[--arcane-purple]">
                    View All
                  </button>
                }
              />
              <div className="px-4 flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
                {oneshots.map((oneshot) => (
                  <button
                    key={oneshot.id}
                    onClick={() => router.push(`/oneshots/${oneshot.id}`)}
                    className="flex-shrink-0 w-36 aspect-[2/3] rounded-xl overflow-hidden bg-gray-900 border border-white/[0.06] active:scale-[0.98] transition-transform"
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
                      <h4 className="font-semibold text-white text-xs line-clamp-2">{oneshot.title}</h4>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Quick Actions */}
          <div className="px-4 pt-6 pb-4 space-y-3">
            <button
              onClick={() => router.push('/vault/new')}
              className="w-full flex items-center gap-3 p-4 bg-purple-600/10 border border-purple-500/30 rounded-xl active:bg-purple-600/20 transition-colors"
            >
              <Plus className="w-5 h-5 text-purple-400" />
              <span className="text-purple-400 font-medium">Create New Character</span>
            </button>
            <button
              onClick={() => router.push('/campaigns')}
              className="w-full flex items-center gap-3 p-4 bg-[--bg-surface] border border-white/[0.06] rounded-xl active:bg-[--bg-hover] transition-colors"
            >
              <Swords className="w-5 h-5 text-blue-400" />
              <span className="text-gray-300 font-medium">Start New Campaign</span>
            </button>
          </div>
        </MobileLayout>
      </AppLayout>
    )
  }

  // Desktop Home View
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-12">

        {/* Hero Section - Featured Campaign */}
        {featuredCampaign ? (
          <section>
            <Link
              href={`/campaigns/${featuredCampaign.id}/canvas`}
              className="group relative block rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-950 border border-white/[0.06] hover:border-[--arcane-purple]/30 transition-all duration-500"
            >
              {/* Background Image */}
              <div className="relative h-[320px] md:h-[400px]">
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
                  <div className="absolute inset-0 bg-gradient-to-br from-[--arcane-purple]/20 via-gray-900 to-gray-950" />
                )}

                {/* Content Overlay */}
                <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-10">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-[--arcane-purple] text-white">
                      Continue Playing
                    </span>
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-white/10 text-gray-300">
                      {featuredCampaign.game_system}
                    </span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-2 group-hover:text-[--arcane-purple] transition-colors">
                    {featuredCampaign.name}
                  </h2>
                  {featuredCampaign.description && (
                    <p className="text-gray-400 text-sm md:text-base max-w-2xl line-clamp-2 mb-4">
                      {featuredCampaign.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-[--arcane-purple] font-medium">
                    <Play className="w-5 h-5" />
                    <span>Enter Campaign</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            </Link>
          </section>
        ) : (
          /* Empty State Hero */
          <section className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[--arcane-purple]/10 via-gray-900 to-gray-950 border border-white/[0.06] p-12 text-center">
            <Sparkles className="w-16 h-16 mx-auto mb-6 text-[--arcane-purple]" />
            <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-3">
              Begin Your Adventure
            </h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Create your first campaign and start building your world
            </p>
            <Link href="/campaigns" className="btn btn-primary">
              <Plus className="w-5 h-5" />
              Create Campaign
            </Link>
          </section>
        )}

        {/* All Campaigns Grid */}
        {displayCampaigns.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Swords className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-white">Your Campaigns</h3>
              </div>
              <Link href="/campaigns" className="text-sm text-[--arcane-purple] hover:underline flex items-center gap-1">
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayCampaigns.map((campaign) => (
                <Link
                  key={campaign.id}
                  href={`/campaigns/${campaign.id}/canvas`}
                  className="group relative rounded-xl overflow-hidden bg-gray-900/50 border border-white/[0.06] hover:border-[--arcane-purple]/30 transition-all"
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
                    <h4 className="font-semibold text-white truncate group-hover:text-[--arcane-purple] transition-colors">
                      {campaign.name}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">{campaign.game_system}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

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
            <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <p className="text-gray-500 mb-4">Your character vault is empty</p>
              <Link href="/vault/new" className="btn btn-secondary">
                <Plus className="w-4 h-4" />
                Create Character
              </Link>
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

        {/* One-Shots - Cinematic Posters */}
        {oneshots.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Scroll className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="text-xl font-semibold text-white">One-Shot Adventures</h3>
              </div>
              <Link href="/oneshots" className="text-sm text-[--arcane-purple] hover:underline flex items-center gap-1">
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Featured One-Shot Hero */}
            {featuredOneshot && (
              <Link
                href={`/oneshots/${featuredOneshot.id}`}
                className="group relative block rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-950 border border-white/[0.06] hover:border-amber-500/30 transition-all duration-500 mb-6"
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
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 via-gray-900 to-gray-950" />
                  )}

                  {/* Content Overlay */}
                  <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-10">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-300">
                        Continue Adventure
                      </span>
                      <span className="px-3 py-1 text-xs font-medium rounded-full bg-white/10 text-gray-300">
                        {featuredOneshot.game_system}
                      </span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-2 group-hover:text-amber-400 transition-colors">
                      {featuredOneshot.title}
                    </h2>
                    {featuredOneshot.tagline && (
                      <p className="text-gray-400 text-sm md:text-base mb-4">
                        {featuredOneshot.tagline}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-amber-400 font-medium">
                      <Scroll className="w-5 h-5" />
                      <span>Open Adventure</span>
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
                  className="group relative rounded-xl overflow-hidden bg-gray-900/50 border border-white/[0.06] hover:border-amber-500/30 transition-all aspect-[2/3]"
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
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-900/30 to-gray-900 flex items-center justify-center">
                      <Scroll className="w-16 h-16 text-amber-400/30" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <span className="inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-amber-500/20 text-amber-300 mb-2">
                      {oneshot.game_system}
                    </span>
                    <h4 className="font-semibold text-white text-sm line-clamp-2 group-hover:text-amber-300 transition-colors">
                      {oneshot.title}
                    </h4>
                    {oneshot.tagline && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-1">{oneshot.tagline}</p>
                    )}
                  </div>
                </Link>
              ))}
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
            All Campaigns
          </Link>
          <Link href="/vault" className="btn btn-ghost text-sm">
            <BookOpen className="w-4 h-4" />
            Character Vault
          </Link>
          <Link href="/oneshots" className="btn btn-ghost text-sm">
            <Scroll className="w-4 h-4" />
            One-Shots
          </Link>
        </section>
      </div>

      <BackToTopButton />
    </AppLayout>
  )
}

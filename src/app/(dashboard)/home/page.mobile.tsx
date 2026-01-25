'use client'

import Image from 'next/image'
import {
  Swords,
  BookOpen,
  Scroll,
  Plus,
  ChevronRight,
  Clock,
  Bookmark,
  Play,
  X,
  Compass,
  Wand2,
  Sparkles,
  Users,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { MobileLayout, MobileSectionHeader } from '@/components/mobile'
import { FounderBadge } from '@/components/membership'
import { formatDistanceToNow } from '@/lib/utils'
import type { Campaign, VaultCharacter, Oneshot, ContentSave } from '@/types/database'

function getInitials(name: string): string {
  return name.split(' ').map((word) => word[0]).slice(0, 2).join('').toUpperCase()
}

export interface HomePageMobileProps {
  campaigns: Campaign[]
  adventures: Campaign[]
  joinedCampaigns: Campaign[]
  characters: VaultCharacter[]
  oneshots: Oneshot[]
  savedTemplates: ContentSave[]
  featuredCampaign: Campaign | undefined
  displayCampaigns: Campaign[]
  onNavigate: (path: string) => void
  isFounder?: boolean
  founderBannerDismissed?: boolean
  onDismissFounderBanner?: () => void
  isFreshUser?: boolean
}

export function HomePageMobile({
  campaigns,
  adventures,
  joinedCampaigns,
  characters,
  oneshots,
  savedTemplates,
  displayCampaigns,
  onNavigate,
  isFounder = false,
  founderBannerDismissed = false,
  onDismissFounderBanner,
  isFreshUser = false,
}: HomePageMobileProps) {
  // Combine recent items for activity section
  const recentActivity = [
    ...campaigns.map(c => ({
      type: 'campaign' as const,
      id: c.id,
      name: c.name,
      image: c.image_url,
      meta: c.game_system,
      updated: c.updated_at
    })),
    ...characters.map(c => ({
      type: 'character' as const,
      id: c.id,
      name: c.name,
      image: c.image_url,
      meta: [c.race, c.class].filter(Boolean).join(' ') || 'Character',
      updated: c.updated_at
    })),
    ...oneshots.map(o => ({
      type: 'oneshot' as const,
      id: o.id,
      name: o.title,
      image: o.image_url,
      meta: o.game_system,
      updated: o.updated_at
    })),
  ].sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime()).slice(0, 5)

  const getItemIcon = (type: 'campaign' | 'character' | 'oneshot') => {
    switch (type) {
      case 'campaign': return <Swords className="w-4 h-4 text-blue-400" />
      case 'character': return <BookOpen className="w-4 h-4 text-purple-400" />
      case 'oneshot': return <Scroll className="w-4 h-4 text-amber-400" />
    }
  }

  const getItemPath = (type: 'campaign' | 'character' | 'oneshot', id: string) => {
    switch (type) {
      case 'campaign': return `/campaigns/${id}/dashboard`
      case 'character': return `/vault/${id}`
      case 'oneshot': return `/oneshots/${id}`
    }
  }

  return (
    <AppLayout>
      <MobileLayout title="Home" showBackButton={false}>
        {/* Founder Welcome Banner */}
        {isFounder && !founderBannerDismissed && (
          <div className="mx-4 mb-4 flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl relative">
            <FounderBadge size="md" />
            <div className="flex-1">
              <p className="font-medium text-amber-400 text-sm">You're a Founder!</p>
              <p className="text-xs text-amber-200/70">
                Extra capacity to build your worlds.
              </p>
            </div>
            {onDismissFounderBanner && (
              <button
                onClick={onDismissFounderBanner}
                className="p-1.5 rounded-lg text-amber-400/50 hover:text-amber-400 transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Fresh User Welcome Experience */}
        {isFreshUser && (
          <div className="px-4 space-y-6 pb-6">
            {/* Welcome Header */}
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center">
                <Wand2 className="w-8 h-8 text-purple-400" />
              </div>
              <h1 className="text-2xl font-display font-bold text-white mb-2">
                Welcome to Multiloop
              </h1>
              <p className="text-gray-400 text-sm">
                Your TTRPG campaign companion. Let's get started!
              </p>
            </div>

            {/* Getting Started Cards */}
            <div className="space-y-3">
              <button
                onClick={() => onNavigate('/campaigns/new')}
                className="w-full flex items-center gap-4 p-4 bg-blue-600/10 border border-blue-500/30 rounded-xl active:bg-blue-600/20 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Swords className="w-6 h-6 text-blue-400" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-white">Start a Campaign</h3>
                  <p className="text-xs text-gray-400">Ongoing stories that span many sessions</p>
                </div>
                <ChevronRight className="w-5 h-5 text-blue-400" />
              </button>

              <button
                onClick={() => onNavigate('/adventures/new')}
                className="w-full flex items-center gap-4 p-4 bg-amber-600/10 border border-amber-500/30 rounded-xl active:bg-amber-600/20 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Compass className="w-6 h-6 text-amber-400" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-white">Start an Adventure</h3>
                  <p className="text-xs text-gray-400">3-9 session stories for shorter arcs</p>
                </div>
                <ChevronRight className="w-5 h-5 text-amber-400" />
              </button>

              <button
                onClick={() => onNavigate('/oneshots/new')}
                className="w-full flex items-center gap-4 p-4 bg-green-600/10 border border-green-500/30 rounded-xl active:bg-green-600/20 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <Scroll className="w-6 h-6 text-green-400" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-white">Create a One-Shot</h3>
                  <p className="text-xs text-gray-400">Single-session adventures</p>
                </div>
                <ChevronRight className="w-5 h-5 text-green-400" />
              </button>

              <button
                onClick={() => onNavigate('/vault/new')}
                className="w-full flex items-center gap-4 p-4 bg-purple-600/10 border border-purple-500/30 rounded-xl active:bg-purple-600/20 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-6 h-6 text-purple-400" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-white">Build Your Character</h3>
                  <p className="text-xs text-gray-400">Create characters for any campaign</p>
                </div>
                <ChevronRight className="w-5 h-5 text-purple-400" />
              </button>
            </div>

            {/* Explore Demos */}
            <div className="text-center pt-4 border-t border-white/[0.06]">
              <p className="text-gray-500 text-xs mb-3">Or explore the demos</p>
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => onNavigate('/demo/campaign')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.05] rounded-lg text-xs text-gray-300 active:bg-white/[0.08]"
                >
                  <Sparkles className="w-3 h-3" />
                  Campaign
                </button>
                <button
                  onClick={() => onNavigate('/demo/character')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.05] rounded-lg text-xs text-gray-300 active:bg-white/[0.08]"
                >
                  <Sparkles className="w-3 h-3" />
                  Character
                </button>
                <button
                  onClick={() => onNavigate('/demo/oneshot')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.05] rounded-lg text-xs text-gray-300 active:bg-white/[0.08]"
                >
                  <Sparkles className="w-3 h-3" />
                  One-Shot
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Returning User Content */}
        {!isFreshUser && (
          <>
        {/* Recent Activity Section */}
        {recentActivity.length > 0 && (
          <>
            <MobileSectionHeader title="Recent Activity" />
            <div className="px-4 space-y-2 mb-4">
              {recentActivity.map((item) => (
                <button
                  key={`${item.type}-${item.id}`}
                  onClick={() => onNavigate(getItemPath(item.type, item.id))}
                  className="w-full flex items-center gap-3 p-3 bg-[--bg-surface] rounded-xl border border-white/[0.06] active:bg-[--bg-hover] transition-colors"
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-900 flex-shrink-0">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                        {getItemIcon(item.type)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
                        {item.type}
                      </span>
                    </div>
                    <h4 className="font-semibold text-white truncate text-sm">{item.name}</h4>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{formatDistanceToNow(item.updated)}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-600 flex-shrink-0" />
                </button>
              ))}
            </div>
          </>
        )}

        {/* Campaigns Section */}
        <MobileSectionHeader
          title="Campaigns"
          action={
            campaigns.length > 0 ? (
              <button onClick={() => onNavigate('/campaigns')} className="text-sm text-[--arcane-purple]">
                View All
              </button>
            ) : undefined
          }
        />
        {campaigns.length === 0 ? (
          <div className="mx-4 p-8 text-center bg-gradient-to-br from-blue-500/5 to-transparent rounded-xl border border-dashed border-blue-500/20">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-blue-500/10 flex items-center justify-center">
              <Swords className="w-7 h-7 text-blue-400" />
            </div>
            <h3 className="text-base font-semibold text-white mb-1">Begin Your Adventure</h3>
            <p className="text-gray-400 text-sm mb-5">Create your first campaign</p>
            <button
              onClick={() => onNavigate('/campaigns')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl"
            >
              <Plus className="w-4 h-4" />
              Create Campaign
            </button>
          </div>
        ) : (
          <div className="px-4 flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {campaigns.slice(0, 5).map((campaign) => (
              <button
                key={campaign.id}
                onClick={() => onNavigate(`/campaigns/${campaign.id}/dashboard`)}
                className="flex-shrink-0 w-52 aspect-[16/10] rounded-xl overflow-hidden bg-gray-900 border border-white/[0.06] active:scale-[0.98] transition-transform relative"
              >
                {campaign.image_url ? (
                  <>
                    <Image
                      src={campaign.image_url}
                      alt={campaign.name}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                  </>
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-900/30 to-gray-900 flex items-center justify-center">
                    <Swords className="w-10 h-10 text-blue-400/30" />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <span className="inline-block px-2 py-0.5 text-[9px] font-semibold uppercase rounded bg-blue-500/20 text-blue-300 mb-1">
                    {campaign.game_system}
                  </span>
                  <h4 className="font-semibold text-white text-sm line-clamp-1">{campaign.name}</h4>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Joined Campaigns Section - Campaigns where user is a player */}
        {joinedCampaigns.length > 0 && (
          <>
            <MobileSectionHeader
              title="Playing In"
              action={
                <button onClick={() => onNavigate('/campaigns')} className="text-sm text-[--arcane-purple]">
                  View All
                </button>
              }
            />
            <div className="px-4 flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
              {joinedCampaigns.slice(0, 5).map((campaign) => (
                <button
                  key={campaign.id}
                  onClick={() => onNavigate(`/campaigns/${campaign.id}/dashboard`)}
                  className="flex-shrink-0 w-44 aspect-[16/10] rounded-xl overflow-hidden bg-gray-900 border border-white/[0.06] active:scale-[0.98] transition-transform relative"
                >
                  {campaign.image_url ? (
                    <>
                      <Image
                        src={campaign.image_url}
                        alt={campaign.name}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/30 to-gray-900 flex items-center justify-center">
                      <Users className="w-10 h-10 text-emerald-400/30" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <span className="inline-block px-2 py-0.5 text-[9px] font-semibold uppercase rounded bg-emerald-500/20 text-emerald-300 mb-1">
                      Playing
                    </span>
                    <h4 className="font-semibold text-white text-sm line-clamp-1">{campaign.name}</h4>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Adventures Section */}
        {adventures.length > 0 && (
          <>
            <MobileSectionHeader
              title="Adventures"
              action={
                <button onClick={() => onNavigate('/adventures')} className="text-sm text-[--arcane-purple]">
                  View All
                </button>
              }
            />
            <div className="px-4 flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
              {adventures.slice(0, 5).map((adventure) => (
                <button
                  key={adventure.id}
                  onClick={() => onNavigate(`/campaigns/${adventure.id}/dashboard`)}
                  className="flex-shrink-0 w-44 aspect-[16/10] rounded-xl overflow-hidden bg-gray-900 border border-white/[0.06] active:scale-[0.98] transition-transform relative"
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
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <span className="inline-block px-2 py-0.5 text-[9px] font-semibold uppercase rounded bg-amber-500/20 text-amber-300 mb-1">
                      {adventure.game_system}
                    </span>
                    <h4 className="font-semibold text-white text-sm line-clamp-1">{adventure.name}</h4>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* One-Shots Section */}
        <MobileSectionHeader
          title="One-Shots"
          action={
            oneshots.length > 0 ? (
              <button onClick={() => onNavigate('/oneshots')} className="text-sm text-[--arcane-purple]">
                View All
              </button>
            ) : undefined
          }
        />
        {oneshots.length === 0 ? (
          <div className="mx-4 p-8 text-center bg-gradient-to-br from-green-500/5 to-transparent rounded-xl border border-dashed border-green-500/20">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-green-500/10 flex items-center justify-center">
              <Scroll className="w-7 h-7 text-green-400" />
            </div>
            <h3 className="text-base font-semibold text-white mb-1">Quick Adventures Await</h3>
            <p className="text-gray-400 text-sm mb-5">Create standalone one-shot adventures</p>
            <button
              onClick={() => onNavigate('/oneshots')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl"
            >
              <Plus className="w-4 h-4" />
              Create One-Shot
            </button>
          </div>
        ) : (
          <div className="px-4 flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {oneshots.map((oneshot) => (
              <button
                key={oneshot.id}
                onClick={() => onNavigate(`/oneshots/${oneshot.id}`)}
                className="flex-shrink-0 w-36 aspect-[2/3] rounded-xl overflow-hidden bg-gray-900 border border-white/[0.06] active:scale-[0.98] transition-transform relative"
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
                  <div className="absolute inset-0 bg-gradient-to-br from-green-900/30 to-gray-900 flex items-center justify-center">
                    <Scroll className="w-10 h-10 text-green-400/30" />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <span className="inline-block px-2 py-0.5 text-[9px] font-semibold uppercase rounded bg-green-500/20 text-green-300 mb-1">
                    {oneshot.game_system}
                  </span>
                  <h4 className="font-semibold text-white text-xs line-clamp-2">{oneshot.title}</h4>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Saved from Community Section */}
        {savedTemplates.length > 0 && (
          <>
            <MobileSectionHeader title="Saved from Community" />
            <div className="px-4 flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
              {savedTemplates.slice(0, 6).map((save) => {
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

                const getContentLink = () => {
                  if (save.instance_id) {
                    switch (save.source_type) {
                      case 'campaign':
                        return `/campaigns/${save.instance_id}/dashboard`
                      case 'character':
                        return `/vault/${save.instance_id}`
                      case 'oneshot':
                        return `/oneshots/${save.instance_id}`
                      default:
                        return '#'
                    }
                  }
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

                return (
                  <button
                    key={save.id}
                    onClick={() => onNavigate(getContentLink())}
                    className="flex-shrink-0 w-44 rounded-xl overflow-hidden bg-[--bg-surface] border border-white/[0.06] active:scale-[0.98] transition-transform"
                  >
                    <div className="relative h-24">
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
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                          {getIcon()}
                        </div>
                      )}
                      <div className="absolute top-2 left-2">
                        <span className="px-2 py-0.5 text-[9px] font-medium bg-green-500/20 text-green-400 rounded capitalize">
                          {save.source_type}
                        </span>
                      </div>
                    </div>
                    <div className="p-3">
                      <h4 className="font-semibold text-white text-sm truncate">{save.source_name}</h4>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-gray-500">v{save.saved_version}</span>
                        <span className={`flex items-center gap-1 text-[10px] font-medium ${save.instance_id ? 'text-green-400' : 'text-purple-400'}`}>
                          <Play className="w-3 h-3" />
                          {save.instance_id ? 'Continue' : 'Start'}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* Characters Section */}
        <MobileSectionHeader
          title="Characters"
          action={
            <button onClick={() => onNavigate('/vault')} className="text-sm text-[--arcane-purple]">
              View All
            </button>
          }
        />
        {characters.length === 0 ? (
          <div className="mx-4 p-8 text-center bg-gradient-to-br from-purple-500/5 to-transparent rounded-xl border border-dashed border-purple-500/20">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-purple-500/10 flex items-center justify-center">
              <BookOpen className="w-7 h-7 text-purple-400" />
            </div>
            <h3 className="text-base font-semibold text-white mb-1">Your Vault Awaits</h3>
            <p className="text-gray-400 text-sm mb-5">Create characters to track their journeys</p>
            <button
              onClick={() => onNavigate('/vault')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-xl"
            >
              <Plus className="w-4 h-4" />
              Add Your First Character
            </button>
          </div>
        ) : (
          <div className="px-4 grid grid-cols-2 gap-3">
            {characters.slice(0, 6).map((character) => (
              <button
                key={character.id}
                onClick={() => onNavigate(`/vault/${character.id}`)}
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

        {/* Quick Actions */}
        <div className="px-4 pt-6 pb-4 space-y-3">
          <button
            onClick={() => onNavigate('/campaigns/new')}
            className="w-full flex items-center gap-3 p-4 bg-blue-600/10 border border-blue-500/30 rounded-xl active:bg-blue-600/20 transition-colors"
          >
            <Plus className="w-5 h-5 text-blue-400" />
            <span className="text-blue-400 font-medium">Start New Campaign</span>
          </button>
          <button
            onClick={() => onNavigate('/adventures/new')}
            className="w-full flex items-center gap-3 p-4 bg-[--bg-surface] border border-white/[0.06] rounded-xl active:bg-[--bg-hover] transition-colors"
          >
            <Compass className="w-5 h-5 text-amber-400" />
            <span className="text-gray-300 font-medium">Start New Adventure</span>
          </button>
          <button
            onClick={() => onNavigate('/oneshots/new')}
            className="w-full flex items-center gap-3 p-4 bg-[--bg-surface] border border-white/[0.06] rounded-xl active:bg-[--bg-hover] transition-colors"
          >
            <Scroll className="w-5 h-5 text-green-400" />
            <span className="text-gray-300 font-medium">Start New One-Shot</span>
          </button>
          <button
            onClick={() => onNavigate('/vault/new')}
            className="w-full flex items-center gap-3 p-4 bg-[--bg-surface] border border-white/[0.06] rounded-xl active:bg-[--bg-hover] transition-colors"
          >
            <BookOpen className="w-5 h-5 text-purple-400" />
            <span className="text-gray-300 font-medium">Create New Character</span>
          </button>
        </div>
        </>
        )}
      </MobileLayout>
    </AppLayout>
  )
}

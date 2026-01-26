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
  ArrowRight,
  Map,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppLayout } from '@/components/layout/app-layout'
import { MobileLayout, MobileSectionHeader } from '@/components/mobile'
import { FounderBadge } from '@/components/membership'
import { ContentBadge, StatusIndicator, determineCampaignStatus, getStatusCardClass, DismissibleEmptyState, getSectionColorScheme, EMPTY_STATE_CONTENT } from '@/components/ui'
import type { SectionId } from '@/components/ui'
import { formatDistanceToNow } from '@/lib/utils'
import { getCampaignBadge, getOneshotBadge, getCharacterBadge } from '@/lib/content-badges'
import type { Campaign, VaultCharacter, Oneshot, ContentSave } from '@/types/database'

function getInitials(name: string): string {
  return name.split(' ').map((word) => word[0]).slice(0, 2).join('').toUpperCase()
}

import type { Character } from '@/types/database'

export interface HomePageMobileProps {
  campaigns: Campaign[]
  adventures: Campaign[]
  joinedCampaigns: Campaign[]
  characters: VaultCharacter[]
  oneshots: Oneshot[]
  savedTemplates: ContentSave[]
  featuredCampaign: Campaign | undefined
  featuredAdventure: Campaign | undefined
  featuredCharacter: VaultCharacter | undefined
  featuredOneshot: Oneshot | undefined
  displayCampaigns: Campaign[]
  displayAdventures: Campaign[]
  displayOneshots: Oneshot[]
  displayCharacters: VaultCharacter[]
  drafts: { type: 'campaign' | 'adventure' | 'oneshot' | 'character'; item: Campaign | Oneshot | VaultCharacter; progress: number }[]
  pendingInvites: { id: string; campaign: Campaign; inviter_name?: string }[]
  claimableCharacters: { character: Character; campaign: Campaign }[]
  onNavigate: (path: string) => void
  isFounder?: boolean
  founderBannerDismissed?: boolean
  onDismissFounderBanner?: () => void
  isFreshUser?: boolean
  userId?: string
  // Card stats
  sessionCounts?: Record<string, number>
  playerCounts?: Record<string, number>
  characterNames?: Record<string, string>
  oneshotRunCounts?: Record<string, number>
  characterCampaignCounts?: Record<string, number>
  // Section visibility
  isSectionVisible?: (sectionId: SectionId) => boolean
  onDismissSection?: (sectionId: SectionId, permanent: boolean) => void
  // For conditional "Playing In" section
  hasOwnedContent?: boolean
}

export function HomePageMobile({
  campaigns,
  adventures,
  joinedCampaigns,
  characters,
  oneshots,
  savedTemplates,
  featuredCampaign,
  featuredAdventure,
  featuredCharacter,
  featuredOneshot,
  displayCampaigns,
  displayAdventures,
  displayOneshots,
  displayCharacters,
  drafts,
  pendingInvites,
  claimableCharacters,
  onNavigate,
  isFounder = false,
  founderBannerDismissed = false,
  onDismissFounderBanner,
  isFreshUser = false,
  userId = '',
  sessionCounts = {},
  playerCounts = {},
  characterNames = {},
  oneshotRunCounts = {},
  characterCampaignCounts = {},
  isSectionVisible = () => true,
  onDismissSection,
  hasOwnedContent = false,
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

        {/* Claimable Characters Notification */}
        {claimableCharacters.length > 0 && (
          <div className="mx-4 mb-4 bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-white">
                  {claimableCharacters.length === 1
                    ? 'A character is waiting!'
                    : `${claimableCharacters.length} characters waiting!`}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Add to your vault to track their journey
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {claimableCharacters.slice(0, 2).map(({ character, campaign }) => (
                    <button
                      key={character.id}
                      onClick={() => onNavigate(`/campaigns/${campaign.id}/dashboard`)}
                      className="flex items-center gap-2 p-2 bg-white/[0.03] border border-white/[0.06] rounded-lg active:bg-white/[0.06]"
                    >
                      {character.image_url ? (
                        <Image
                          src={character.image_url}
                          alt={character.name}
                          width={32}
                          height={32}
                          className="rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center text-purple-400 text-xs font-bold">
                          {getInitials(character.name)}
                        </div>
                      )}
                      <div className="text-left">
                        <p className="text-xs font-medium text-white">{character.name}</p>
                        <p className="text-[10px] text-gray-500">{campaign.name}</p>
                      </div>
                    </button>
                  ))}
                  {claimableCharacters.length > 2 && (
                    <span className="flex items-center text-xs text-gray-400">
                      +{claimableCharacters.length - 2} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pending Invites Notification */}
        {pendingInvites.length > 0 && (
          <div className="mx-4 mb-4 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-white">
                  {pendingInvites.length === 1
                    ? 'Campaign invite!'
                    : `${pendingInvites.length} campaign invites!`}
                </h3>
                <div className="flex flex-wrap gap-2 mt-3">
                  {pendingInvites.slice(0, 2).map(({ id, campaign }) => (
                    <button
                      key={id}
                      onClick={() => onNavigate(`/campaigns/${campaign.id}/dashboard`)}
                      className="flex items-center gap-2 p-2 bg-white/[0.03] border border-white/[0.06] rounded-lg active:bg-white/[0.06]"
                    >
                      {campaign.image_url ? (
                        <Image
                          src={campaign.image_url}
                          alt={campaign.name}
                          width={32}
                          height={32}
                          className="rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
                          <Swords className="w-4 h-4 text-blue-400" />
                        </div>
                      )}
                      <div className="text-left">
                        <p className="text-xs font-medium text-white">{campaign.name}</p>
                        <p className="text-[10px] text-gray-500">Tap to view invite</p>
                      </div>
                    </button>
                  ))}
                  {pendingInvites.length > 2 && (
                    <span className="flex items-center text-xs text-gray-400">
                      +{pendingInvites.length - 2} more
                    </span>
                  )}
                </div>
              </div>
            </div>
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
        {/* Continue Working On - Drafts */}
        {drafts.length > 0 && (
          <>
            <MobileSectionHeader title="Continue Working On" />
            <div className="px-4 space-y-2 mb-4">
              {drafts.map(({ type, item, progress }) => {
                const href = type === 'character'
                  ? `/vault/${item.id}`
                  : type === 'oneshot'
                  ? `/oneshots/${item.id}`
                  : `/campaigns/${item.id}/dashboard`

                const name = 'title' in item ? item.title : item.name
                const Icon = type === 'character' ? BookOpen : type === 'oneshot' ? Scroll : type === 'adventure' ? Compass : Swords

                const colors = {
                  character: { bg: 'bg-purple-500/20', text: 'text-purple-400', bar: 'bg-purple-500/60' },
                  oneshot: { bg: 'bg-green-500/20', text: 'text-green-400', bar: 'bg-green-500/60' },
                  adventure: { bg: 'bg-amber-500/20', text: 'text-amber-400', bar: 'bg-amber-500/60' },
                  campaign: { bg: 'bg-blue-500/20', text: 'text-blue-400', bar: 'bg-blue-500/60' },
                }
                const color = colors[type]

                return (
                  <button
                    key={`${type}-${item.id}`}
                    onClick={() => onNavigate(href)}
                    className="w-full flex items-center gap-3 p-3 bg-[--bg-surface] rounded-xl border border-white/[0.06] active:bg-[--bg-hover] transition-colors"
                  >
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", color.bg)}>
                      <Icon className={cn("w-5 h-5", color.text)} />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-[10px] uppercase tracking-wider font-medium", color.text)}>
                          {type === 'adventure' ? 'Adventure' : type.charAt(0).toUpperCase() + type.slice(1)} • Draft
                        </span>
                      </div>
                      <h4 className="font-medium text-white truncate text-sm mt-0.5">
                        {name || 'Untitled'}
                      </h4>
                      <div className="mt-1.5">
                        <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full", color.bar)}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5">{progress}% complete</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-600 flex-shrink-0" />
                  </button>
                )
              })}
            </div>
          </>
        )}

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

        {/* Featured Campaign Hero */}
        {featuredCampaign && (
          <button
            onClick={() => onNavigate(`/campaigns/${featuredCampaign.id}/dashboard`)}
            className="mx-4 mb-4 relative block rounded-xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-950 border border-white/[0.06] active:scale-[0.99] transition-transform"
          >
            <div className="relative h-[180px]">
              {featuredCampaign.image_url ? (
                <>
                  <Image
                    src={featuredCampaign.image_url}
                    alt={featuredCampaign.name}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
                </>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-gray-900 to-gray-950" />
              )}
              <div className="absolute inset-0 flex flex-col justify-end p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ContentBadge
                    variant={getCampaignBadge(featuredCampaign, userId).primary}
                    size="sm"
                    progress={getCampaignBadge(featuredCampaign, userId).progress}
                  />
                  <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-white/10 text-gray-300">
                    {featuredCampaign.game_system}
                  </span>
                </div>
                <h2 className="text-xl font-display font-bold text-white mb-1">
                  {featuredCampaign.name}
                </h2>
                {/* Meta line */}
                <div className="flex items-center gap-2 text-[10px] text-gray-400 mb-2">
                  <StatusIndicator status={determineCampaignStatus(featuredCampaign)} size="sm" showLabel={false} />
                  <span>{sessionCounts[featuredCampaign.id] || 0} sessions</span>
                  <span>·</span>
                  <span>{playerCounts[featuredCampaign.id] || 0} players</span>
                  <span>·</span>
                  <span>{formatDistanceToNow(featuredCampaign.updated_at)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-blue-400 text-sm font-medium">
                  <Play className="w-4 h-4" />
                  <span>Enter Campaign</span>
                </div>
              </div>
            </div>
          </button>
        )}

        {campaigns.length === 0 && !featuredCampaign && isSectionVisible('campaigns') ? (
          <div className="mx-4">
            <DismissibleEmptyState
              sectionId="campaigns"
              icon={<Swords className="w-7 h-7" />}
              title={EMPTY_STATE_CONTENT.campaigns.title}
              description={EMPTY_STATE_CONTENT.campaigns.description}
              primaryAction={{
                label: EMPTY_STATE_CONTENT.campaigns.primaryLabel,
                href: EMPTY_STATE_CONTENT.campaigns.primaryHref,
                icon: <Plus className="w-4 h-4" />
              }}
              secondaryAction={{
                label: "Explore Demo",
                href: EMPTY_STATE_CONTENT.campaigns.demoHref
              }}
              colorScheme={getSectionColorScheme('campaigns')}
              onDismiss={onDismissSection}
              compact
            />
          </div>
        ) : campaigns.length > 0 ? (
          <div className="px-4 flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {campaigns.slice(0, 5).map((campaign) => {
              const badge = getCampaignBadge(campaign, userId)
              const status = determineCampaignStatus(campaign)
              const sessions = sessionCounts[campaign.id] || 0
              const players = playerCounts[campaign.id] || 0
              return (
                <button
                  key={campaign.id}
                  onClick={() => onNavigate(`/campaigns/${campaign.id}/dashboard`)}
                  className={cn(
                    "flex-shrink-0 w-52 rounded-xl overflow-hidden bg-gray-900 border border-white/[0.06] active:scale-[0.98] transition-transform relative",
                    getStatusCardClass(status)
                  )}
                >
                  <div className="relative h-28">
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
                    <ContentBadge
                      variant={badge.primary}
                      size="sm"
                      progress={badge.progress}
                      className="absolute top-2 left-2"
                    />
                  </div>
                  <div className="p-3">
                    <h4 className="font-semibold text-white text-sm line-clamp-1">{campaign.name}</h4>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {campaign.game_system} · {sessions} session{sessions !== 1 ? 's' : ''} · {players} player{players !== 1 ? 's' : ''}
                    </p>
                    <div className="flex items-center justify-between mt-1.5">
                      <StatusIndicator status={status} size="sm" />
                      <span className="text-[9px] text-gray-600">{formatDistanceToNow(campaign.updated_at)}</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        ) : null}

        {/* Subtle "Join a campaign" link for DMs who might also want to play */}
        {campaigns.length > 0 && joinedCampaigns.length === 0 && (
          <div className="px-4 pb-4">
            <button
              onClick={() => onNavigate('/join')}
              className="flex items-center gap-2 text-sm text-gray-500 active:text-emerald-400"
            >
              <Users className="w-4 h-4" />
              Want to play too? Join a campaign
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Joined Campaigns Section - Campaigns where user is a player */}
        {/* Only show if: user has joined campaigns OR (user has no owned content AND hasn't dismissed) */}
        {(joinedCampaigns.length > 0 || (!hasOwnedContent && isSectionVisible('playing'))) && (
          <>
            <MobileSectionHeader
              title="Playing In"
              action={
                joinedCampaigns.length > 0 ? (
                  <button onClick={() => onNavigate('/campaigns?tab=active&filter=playing')} className="text-sm text-[--arcane-purple]">
                    View All
                  </button>
                ) : undefined
              }
            />

            {/* Empty State - only for fresh users */}
            {joinedCampaigns.length === 0 && !hasOwnedContent && isSectionVisible('playing') && (
              <div className="mx-4 mb-4">
                <DismissibleEmptyState
                  sectionId="playing"
                  icon={<Users className="w-7 h-7" />}
                  title={EMPTY_STATE_CONTENT.playing.title}
                  description={EMPTY_STATE_CONTENT.playing.description}
                  primaryAction={{
                    label: EMPTY_STATE_CONTENT.playing.primaryLabel,
                    href: EMPTY_STATE_CONTENT.playing.primaryHref,
                    icon: <Plus className="w-4 h-4" />
                  }}
                  secondaryAction={{
                    label: "Explore Demo",
                    href: EMPTY_STATE_CONTENT.playing.demoHref
                  }}
                  colorScheme={getSectionColorScheme('playing')}
                  onDismiss={onDismissSection}
                  compact
                />
              </div>
            )}

            {joinedCampaigns.length > 0 && (
            <div className="px-4 flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
              {joinedCampaigns.slice(0, 5).map((campaign) => {
                const status = determineCampaignStatus(campaign)
                const sessions = sessionCounts[campaign.id] || 0
                const myCharacter = characterNames[campaign.id]
                return (
                  <button
                    key={campaign.id}
                    onClick={() => onNavigate(`/campaigns/${campaign.id}/dashboard`)}
                    className={cn(
                      "flex-shrink-0 w-48 rounded-xl overflow-hidden bg-gray-900 border border-white/[0.06] active:scale-[0.98] transition-transform relative",
                      getStatusCardClass(status)
                    )}
                  >
                    <div className="relative h-24">
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
                      <ContentBadge
                        variant="playing"
                        size="sm"
                        className="absolute top-2 left-2"
                      />
                    </div>
                    <div className="p-3">
                      <h4 className="font-semibold text-white text-sm line-clamp-1">{campaign.name}</h4>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {campaign.game_system} · {sessions} session{sessions !== 1 ? 's' : ''}
                      </p>
                      <div className="flex items-center justify-between mt-1.5">
                        {myCharacter ? (
                          <span className="text-[10px] text-emerald-400 truncate max-w-[80%]">Playing as {myCharacter}</span>
                        ) : (
                          <StatusIndicator status={status} size="sm" />
                        )}
                        <span className="text-[9px] text-gray-600">{formatDistanceToNow(campaign.updated_at)}</span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
            )}
          </>
        )}

        {/* Adventures Section */}
        {(adventures.length > 0 || isSectionVisible('adventures')) && (
          <>
            <MobileSectionHeader
              title="Adventures"
              action={
                adventures.length > 0 ? (
                  <button onClick={() => onNavigate('/adventures')} className="text-sm text-[--arcane-purple]">
                    View All
                  </button>
                ) : undefined
              }
            />

            {/* Empty State */}
            {adventures.length === 0 && isSectionVisible('adventures') && (
              <div className="mx-4 mb-4">
                <DismissibleEmptyState
                  sectionId="adventures"
                  icon={<Compass className="w-7 h-7" />}
                  title={EMPTY_STATE_CONTENT.adventures.title}
                  description={EMPTY_STATE_CONTENT.adventures.description}
                  primaryAction={{
                    label: EMPTY_STATE_CONTENT.adventures.primaryLabel,
                    href: EMPTY_STATE_CONTENT.adventures.primaryHref,
                    icon: <Plus className="w-4 h-4" />
                  }}
                  secondaryAction={{
                    label: "Explore Demo",
                    href: EMPTY_STATE_CONTENT.adventures.demoHref
                  }}
                  colorScheme={getSectionColorScheme('adventures')}
                  onDismiss={onDismissSection}
                  compact
                />
              </div>
            )}

            {/* Featured Adventure Hero */}
            {featuredAdventure && (
              <button
                onClick={() => onNavigate(`/campaigns/${featuredAdventure.id}/dashboard`)}
                className="mx-4 mb-4 relative block rounded-xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-950 border border-white/[0.06] active:scale-[0.99] transition-transform"
              >
                <div className="relative h-[160px]">
                  {featuredAdventure.image_url ? (
                    <>
                      <Image
                        src={featuredAdventure.image_url}
                        alt={featuredAdventure.name}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 via-gray-900 to-gray-950" />
                  )}
                  <div className="absolute inset-0 flex flex-col justify-end p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ContentBadge
                        variant={getCampaignBadge(featuredAdventure, userId).primary}
                        size="sm"
                        progress={getCampaignBadge(featuredAdventure, userId).progress}
                      />
                      <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                        {(featuredAdventure as Campaign & { estimated_sessions?: number }).estimated_sessions || '3-9'} Sessions
                      </span>
                    </div>
                    <h2 className="text-lg font-display font-bold text-white mb-1">
                      {featuredAdventure.name}
                    </h2>
                    {/* Meta line */}
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 mb-2">
                      <StatusIndicator status={determineCampaignStatus(featuredAdventure)} size="sm" showLabel={false} />
                      <span>{sessionCounts[featuredAdventure.id] || 0} sessions</span>
                      <span>·</span>
                      <span>{playerCounts[featuredAdventure.id] || 0} players</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-amber-400 text-sm font-medium">
                      <Compass className="w-4 h-4" />
                      <span>Continue Adventure</span>
                    </div>
                  </div>
                </div>
              </button>
            )}

            <div className="px-4 flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
              {displayAdventures.slice(0, 5).map((adventure) => {
                const badge = getCampaignBadge(adventure, userId)
                const status = determineCampaignStatus(adventure)
                const sessions = sessionCounts[adventure.id] || 0
                const players = playerCounts[adventure.id] || 0
                return (
                  <button
                    key={adventure.id}
                    onClick={() => onNavigate(`/campaigns/${adventure.id}/dashboard`)}
                    className={cn(
                      "flex-shrink-0 w-48 rounded-xl overflow-hidden bg-gray-900 border border-white/[0.06] active:scale-[0.98] transition-transform relative",
                      getStatusCardClass(status)
                    )}
                  >
                    <div className="relative h-24">
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
                      <ContentBadge
                        variant={badge.primary}
                        size="sm"
                        progress={badge.progress}
                        className="absolute top-2 left-2"
                      />
                    </div>
                    <div className="p-3">
                      <h4 className="font-semibold text-white text-sm line-clamp-1">{adventure.name}</h4>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {adventure.game_system} · {sessions} session{sessions !== 1 ? 's' : ''} · {players} player{players !== 1 ? 's' : ''}
                      </p>
                      <div className="flex items-center justify-between mt-1.5">
                        <StatusIndicator status={status} size="sm" />
                        <span className="text-[9px] text-gray-600">{formatDistanceToNow(adventure.updated_at)}</span>
                      </div>
                    </div>
                  </button>
                )
              })}
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
        {/* Featured One-Shot Hero */}
        {featuredOneshot && (
          <button
            onClick={() => onNavigate(`/oneshots/${featuredOneshot.id}`)}
            className="mx-4 mb-4 relative block rounded-xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-950 border border-white/[0.06] active:scale-[0.99] transition-transform"
          >
            <div className="relative h-[180px]">
              {featuredOneshot.image_url ? (
                <>
                  <Image
                    src={featuredOneshot.image_url}
                    alt={featuredOneshot.title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
                </>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 via-gray-900 to-gray-950" />
              )}
              <div className="absolute inset-0 flex flex-col justify-end p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ContentBadge
                    variant={getOneshotBadge(featuredOneshot, userId).primary}
                    size="sm"
                    progress={getOneshotBadge(featuredOneshot, userId).progress}
                  />
                  <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-white/10 text-gray-300">
                    {featuredOneshot.game_system}
                  </span>
                </div>
                <h2 className="text-xl font-display font-bold text-white mb-1">
                  {featuredOneshot.title}
                </h2>
                {/* Meta line */}
                <div className="flex items-center gap-2 text-[10px] text-gray-400 mb-2">
                  <span>{oneshotRunCounts[featuredOneshot.id] || 0} run{(oneshotRunCounts[featuredOneshot.id] || 0) !== 1 ? 's' : ''}</span>
                  <span>·</span>
                  <span>{formatDistanceToNow(featuredOneshot.updated_at)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-green-400 text-sm font-medium">
                  <Scroll className="w-4 h-4" />
                  <span>Open One-Shot</span>
                </div>
              </div>
            </div>
          </button>
        )}

        {oneshots.length === 0 && isSectionVisible('oneshots') ? (
          <div className="mx-4">
            <DismissibleEmptyState
              sectionId="oneshots"
              icon={<Scroll className="w-7 h-7" />}
              title={EMPTY_STATE_CONTENT.oneshots.title}
              description={EMPTY_STATE_CONTENT.oneshots.description}
              primaryAction={{
                label: EMPTY_STATE_CONTENT.oneshots.primaryLabel,
                href: EMPTY_STATE_CONTENT.oneshots.primaryHref,
                icon: <Plus className="w-4 h-4" />
              }}
              secondaryAction={{
                label: "Explore Demo",
                href: EMPTY_STATE_CONTENT.oneshots.demoHref
              }}
              colorScheme={getSectionColorScheme('oneshots')}
              onDismiss={onDismissSection}
              compact
            />
          </div>
        ) : oneshots.length > 0 ? (
          <div className="px-4 flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {displayOneshots.map((oneshot) => {
              const badge = getOneshotBadge(oneshot, userId)
              const runs = oneshotRunCounts[oneshot.id] || 0
              return (
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
                  <ContentBadge
                    variant={badge.primary}
                    size="sm"
                    progress={badge.progress}
                    className="absolute top-2 left-2"
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h4 className="font-semibold text-white text-xs line-clamp-2">{oneshot.title}</h4>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[9px] text-gray-500">{runs} run{runs !== 1 ? 's' : ''}</span>
                      <span className="text-[9px] text-gray-600">{formatDistanceToNow(oneshot.updated_at)}</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        ) : null}

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
          title="Character Vault"
          action={
            <button onClick={() => onNavigate('/vault')} className="text-sm text-[--arcane-purple]">
              View All
            </button>
          }
        />

        {/* Featured Character Hero */}
        {featuredCharacter && (
          <button
            onClick={() => onNavigate(`/vault/${featuredCharacter.id}`)}
            className="mx-4 mb-4 relative block rounded-xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-950 border border-white/[0.06] active:scale-[0.99] transition-transform"
          >
            <div className="relative h-[180px]">
              {featuredCharacter.image_url ? (
                <>
                  <Image
                    src={featuredCharacter.image_url}
                    alt={featuredCharacter.name}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
                </>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-gray-900 to-gray-950" />
              )}
              <div className="absolute inset-0 flex flex-col justify-end p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ContentBadge
                    variant={getCharacterBadge(featuredCharacter).primary}
                    size="sm"
                  />
                  {featuredCharacter.status && (
                    <span
                      className="px-2 py-0.5 text-[10px] font-medium rounded-full text-white"
                      style={{ backgroundColor: featuredCharacter.status_color || 'rgba(255,255,255,0.1)' }}
                    >
                      {featuredCharacter.status}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-display font-bold text-white mb-1">
                  {featuredCharacter.name}
                </h2>
                <p className="text-gray-400 text-xs mb-1">
                  {[featuredCharacter.race, featuredCharacter.class].filter(Boolean).join(' ') || 'Adventurer'}
                </p>
                {/* Meta line */}
                <div className="flex items-center gap-2 text-[10px] text-gray-400 mb-2">
                  <span>{characterCampaignCounts[featuredCharacter.id] || 0} campaign{(characterCampaignCounts[featuredCharacter.id] || 0) !== 1 ? 's' : ''}</span>
                  <span>·</span>
                  <span>{formatDistanceToNow(featuredCharacter.updated_at)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-purple-400 text-sm font-medium">
                  <BookOpen className="w-4 h-4" />
                  <span>Open Character</span>
                </div>
              </div>
            </div>
          </button>
        )}

        {characters.length === 0 && isSectionVisible('characters') ? (
          <div className="mx-4">
            <DismissibleEmptyState
              sectionId="characters"
              icon={<BookOpen className="w-7 h-7" />}
              title={EMPTY_STATE_CONTENT.characters.title}
              description={EMPTY_STATE_CONTENT.characters.description}
              primaryAction={{
                label: EMPTY_STATE_CONTENT.characters.primaryLabel,
                href: EMPTY_STATE_CONTENT.characters.primaryHref,
                icon: <Plus className="w-4 h-4" />
              }}
              secondaryAction={{
                label: "Explore Demo",
                href: EMPTY_STATE_CONTENT.characters.demoHref
              }}
              colorScheme={getSectionColorScheme('characters')}
              onDismiss={onDismissSection}
              compact
            />
          </div>
        ) : characters.length > 0 ? (
          <div className="px-4 grid grid-cols-2 gap-3">
            {displayCharacters.slice(0, 6).map((character) => {
              const badge = getCharacterBadge(character)
              const campaigns = characterCampaignCounts[character.id] || 0
              return (
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
                  <ContentBadge
                    variant={badge.primary}
                    size="sm"
                    className="absolute top-2 left-2"
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h4 className="font-semibold text-white text-sm truncate">{character.name}</h4>
                    <p className="text-[11px] text-gray-400 truncate">
                      {[character.race, character.class].filter(Boolean).join(' ')}
                    </p>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[9px] text-gray-500">{campaigns} campaign{campaigns !== 1 ? 's' : ''}</span>
                      <span className="text-[9px] text-gray-600">{formatDistanceToNow(character.updated_at)}</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        ) : null}

        {/* Community Discovery - Coming Soon */}
        <div className="mx-4 mt-6 rounded-xl bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 border border-white/[0.06] p-6 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center">
            <Users className="w-6 h-6 text-indigo-400" />
          </div>
          <span className="inline-block px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 rounded-full mb-2">
            Coming Soon
          </span>
          <h3 className="text-base font-semibold text-white mb-1">Community Hub</h3>
          <p className="text-gray-400 text-xs">
            Discover campaigns, characters, and one-shots shared by other DMs and players.
          </p>
        </div>

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

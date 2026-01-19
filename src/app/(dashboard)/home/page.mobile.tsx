'use client'

import Image from 'next/image'
import {
  Swords,
  BookOpen,
  Scroll,
  Plus,
  ChevronRight,
  Clock,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { MobileLayout, MobileSectionHeader } from '@/components/mobile'
import { formatDistanceToNow } from '@/lib/utils'
import type { Campaign, VaultCharacter, Oneshot } from '@/types/database'

function getInitials(name: string): string {
  return name.split(' ').map((word) => word[0]).slice(0, 2).join('').toUpperCase()
}

export interface HomePageMobileProps {
  campaigns: Campaign[]
  characters: VaultCharacter[]
  oneshots: Oneshot[]
  featuredCampaign: Campaign | undefined
  displayCampaigns: Campaign[]
  onNavigate: (path: string) => void
}

export function HomePageMobile({
  campaigns,
  characters,
  oneshots,
  displayCampaigns,
  onNavigate,
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
      case 'campaign': return `/campaigns/${id}/canvas`
      case 'character': return `/vault/${id}`
      case 'oneshot': return `/oneshots/${id}`
    }
  }

  return (
    <AppLayout>
      <MobileLayout title="Home" showBackButton={false}>
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
        {campaigns.length > 0 && (
          <>
            <MobileSectionHeader
              title="Campaigns"
              action={
                <button onClick={() => onNavigate('/campaigns')} className="text-sm text-[--arcane-purple]">
                  View All
                </button>
              }
            />
            <div className="px-4 flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
              {campaigns.slice(0, 5).map((campaign) => (
                <button
                  key={campaign.id}
                  onClick={() => onNavigate(`/campaigns/${campaign.id}/canvas`)}
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

        {/* One-Shots Section */}
        {oneshots.length > 0 && (
          <>
            <MobileSectionHeader
              title="One-Shots"
              action={
                <button onClick={() => onNavigate('/oneshots')} className="text-sm text-[--arcane-purple]">
                  View All
                </button>
              }
            />
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
            onClick={() => onNavigate('/vault/new')}
            className="w-full flex items-center gap-3 p-4 bg-purple-600/10 border border-purple-500/30 rounded-xl active:bg-purple-600/20 transition-colors"
          >
            <Plus className="w-5 h-5 text-purple-400" />
            <span className="text-purple-400 font-medium">Create New Character</span>
          </button>
          <button
            onClick={() => onNavigate('/campaigns')}
            className="w-full flex items-center gap-3 p-4 bg-[--bg-surface] border border-white/[0.06] rounded-xl active:bg-[--bg-hover] transition-colors"
          >
            <Swords className="w-5 h-5 text-blue-400" />
            <span className="text-gray-300 font-medium">Start New Campaign</span>
          </button>
          <button
            onClick={() => onNavigate('/oneshots/new')}
            className="w-full flex items-center gap-3 p-4 bg-[--bg-surface] border border-white/[0.06] rounded-xl active:bg-[--bg-hover] transition-colors"
          >
            <Scroll className="w-5 h-5 text-amber-400" />
            <span className="text-gray-300 font-medium">Start New One-Shot</span>
          </button>
        </div>
      </MobileLayout>
    </AppLayout>
  )
}

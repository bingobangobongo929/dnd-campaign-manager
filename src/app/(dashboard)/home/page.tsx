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
  Users,
  Calendar,
  TrendingUp,
  Sparkles
} from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { useSupabase, useUser } from '@/hooks'
import { useAppStore } from '@/store'
import { formatDistanceToNow } from '@/lib/utils'
import type { Campaign, VaultCharacter, Oneshot } from '@/types/database'

export default function HomePage() {
  const router = useRouter()
  const supabase = useSupabase()
  const { user } = useUser()
  const { recentItems, aiEnabled } = useAppStore()

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [characters, setCharacters] = useState<VaultCharacter[]>([])
  const [oneshots, setOneshots] = useState<Oneshot[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    campaigns: 0,
    characters: 0,
    vaultCharacters: 0,
    sessions: 0,
    oneshots: 0,
  })

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    if (!user) return

    // Load recent campaigns
    const { data: campaignsData } = await supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(4)

    if (campaignsData) setCampaigns(campaignsData)

    // Load recent vault characters
    const { data: charactersData } = await supabase
      .from('vault_characters')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(4)

    if (charactersData) setCharacters(charactersData)

    // Load recent oneshots
    const { data: oneshotsData } = await supabase
      .from('oneshots')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(2)

    if (oneshotsData) setOneshots(oneshotsData)

    // Get counts for stats
    const [
      { count: campaignCount },
      { count: characterCount },
      { count: vaultCount },
      { count: sessionCount },
      { count: oneshotCount },
    ] = await Promise.all([
      supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('characters').select('*', { count: 'exact', head: true }).eq('campaign_id', campaigns[0]?.id || ''),
      supabase.from('vault_characters').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('campaign_id', campaigns[0]?.id || ''),
      supabase.from('oneshots').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    ])

    setStats({
      campaigns: campaignCount || 0,
      characters: characterCount || 0,
      vaultCharacters: vaultCount || 0,
      sessions: sessionCount || 0,
      oneshots: oneshotCount || 0,
    })

    setLoading(false)
  }

  function getInitials(name: string): string {
    return name
      .split(' ')
      .map((word) => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        {/* Welcome Header */}
        <div className="page-header mb-8">
          <h1 className="page-title">Welcome Back</h1>
          <p className="page-subtitle">Your campaigns and characters at a glance</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Swords className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.campaigns}</p>
                <p className="text-xs text-gray-500">Campaigns</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <BookOpen className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.vaultCharacters}</p>
                <p className="text-xs text-gray-500">Characters</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Scroll className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.oneshots}</p>
                <p className="text-xs text-gray-500">One-Shots</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Calendar className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.sessions}</p>
                <p className="text-xs text-gray-500">Sessions</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Campaigns */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Swords className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-semibold text-white">Campaigns</h2>
              </div>
              <Link href="/campaigns" className="text-sm text-[--arcane-purple] hover:underline flex items-center gap-1">
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {campaigns.length === 0 ? (
              <div className="text-center py-8">
                <Swords className="w-10 h-10 mx-auto mb-3 text-gray-600" />
                <p className="text-sm text-gray-500 mb-4">No campaigns yet</p>
                <Link href="/campaigns" className="btn btn-primary btn-sm">
                  <Plus className="w-4 h-4" />
                  Create Campaign
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {campaigns.map((campaign) => (
                  <Link
                    key={campaign.id}
                    href={`/campaigns/${campaign.id}/canvas`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/[0.04] transition-colors group"
                  >
                    {campaign.image_url ? (
                      <Image
                        src={campaign.image_url}
                        alt={campaign.name}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Swords className="w-6 h-6 text-blue-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{campaign.name}</p>
                      <p className="text-xs text-gray-500">{campaign.game_system}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Character Vault */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-semibold text-white">Character Vault</h2>
              </div>
              <Link href="/vault" className="text-sm text-[--arcane-purple] hover:underline flex items-center gap-1">
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {characters.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-600" />
                <p className="text-sm text-gray-500 mb-4">No characters yet</p>
                <Link href="/vault/new" className="btn btn-primary btn-sm">
                  <Plus className="w-4 h-4" />
                  Create Character
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {characters.map((character) => (
                  <Link
                    key={character.id}
                    href={`/vault/${character.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/[0.04] transition-colors group"
                  >
                    {character.image_url ? (
                      <Image
                        src={character.image_url}
                        alt={character.name}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 font-bold">
                        {getInitials(character.name)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{character.name}</p>
                      <p className="text-xs text-gray-500">
                        {[character.race, character.class].filter(Boolean).join(' ') || 'No details'}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* One-Shots */}
        {oneshots.length > 0 && (
          <div className="mt-6 card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Scroll className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-semibold text-white">One-Shots</h2>
              </div>
              <Link href="/campaigns?tab=oneshots" className="text-sm text-[--arcane-purple] hover:underline flex items-center gap-1">
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {oneshots.map((oneshot) => (
                <Link
                  key={oneshot.id}
                  href={`/oneshots/${oneshot.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/[0.04] transition-colors group"
                >
                  {oneshot.image_url ? (
                    <Image
                      src={oneshot.image_url}
                      alt={oneshot.title}
                      width={48}
                      height={64}
                      className="w-12 h-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-12 h-16 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Scroll className="w-6 h-6 text-amber-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{oneshot.title}</p>
                    <p className="text-xs text-gray-500">{oneshot.game_system}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {recentItems.length > 0 && (
          <div className="mt-6 card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
            </div>

            <div className="space-y-2">
              {recentItems.slice(0, 5).map((item) => (
                <Link
                  key={`${item.type}-${item.id}`}
                  href={item.href}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.04] transition-colors text-sm"
                >
                  <span className="text-gray-500">
                    {formatDistanceToNow(new Date(item.visitedAt))}
                  </span>
                  <span className="text-gray-400">Visited</span>
                  <span className="text-white font-medium truncate">{item.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-gray-500 capitalize">
                    {item.type}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/campaigns" className="btn btn-secondary">
            <Swords className="w-4 h-4" />
            View Campaigns
          </Link>
          <Link href="/vault" className="btn btn-secondary">
            <BookOpen className="w-4 h-4" />
            Character Vault
          </Link>
          <Link href="/campaigns?tab=oneshots" className="btn btn-secondary">
            <Scroll className="w-4 h-4" />
            One-Shots
          </Link>
          <Link href="/settings" className="btn btn-ghost">
            Settings
          </Link>
        </div>
      </div>
    </AppLayout>
  )
}

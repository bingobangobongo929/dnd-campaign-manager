'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Play,
  ChevronRight,
  User,
  Castle,
  Compass,
  Sword,
  Clock,
  Loader2,
  ExternalLink,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'
import { cn, getInitials, formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { VaultCharacter, Campaign } from '@/types/database'

interface CampaignLink {
  campaign_id: string
  character_id: string
  joined_at: string
}

interface CampaignGroup {
  campaign: Campaign
  characters: VaultCharacter[]
  latestSessionNumber?: number
  status: 'active' | 'inactive' | 'completed'
}

interface InPlayTabViewProps {
  inPlayCharacters: VaultCharacter[]
}

type StatusFilter = 'all' | 'active' | 'inactive' | 'completed'

export function InPlayTabView({ inPlayCharacters }: InPlayTabViewProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [campaignGroups, setCampaignGroups] = useState<CampaignGroup[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  useEffect(() => {
    loadCampaignData()
  }, [inPlayCharacters])

  const loadCampaignData = async () => {
    if (inPlayCharacters.length === 0) {
      setLoading(false)
      return
    }

    setLoading(true)
    const supabase = createClient()

    // Extract unique campaign IDs from all characters
    const campaignIds = new Set<string>()
    inPlayCharacters.forEach(char => {
      const links = char.campaign_links as CampaignLink[] | null
      links?.forEach(link => campaignIds.add(link.campaign_id))
    })

    if (campaignIds.size === 0) {
      setLoading(false)
      return
    }

    // Fetch campaigns
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('*')
      .in('id', Array.from(campaignIds))

    if (!campaigns) {
      setLoading(false)
      return
    }

    // Fetch latest session numbers for each campaign
    const sessionPromises = Array.from(campaignIds).map(async (campaignId) => {
      const { data } = await supabase
        .from('sessions')
        .select('session_number')
        .eq('campaign_id', campaignId)
        .order('session_number', { ascending: false })
        .limit(1)
        .single()
      return { campaignId, sessionNumber: data?.session_number }
    })

    const sessionResults = await Promise.all(sessionPromises)
    const sessionMap = new Map(
      sessionResults.map(r => [r.campaignId, r.sessionNumber])
    )

    // Group characters by campaign
    const groupsMap = new Map<string, CampaignGroup>()

    inPlayCharacters.forEach(char => {
      const links = char.campaign_links as CampaignLink[] | null
      links?.forEach(link => {
        const campaign = campaigns.find(c => c.id === link.campaign_id)
        if (!campaign) return

        if (!groupsMap.has(campaign.id)) {
          // Determine campaign status
          let status: 'active' | 'inactive' | 'completed' = 'active'
          if (campaign.status === 'completed' || campaign.status === 'archived') {
            status = 'completed'
          } else if (campaign.status === 'inactive' || campaign.status === 'paused') {
            status = 'inactive'
          }

          groupsMap.set(campaign.id, {
            campaign,
            characters: [],
            latestSessionNumber: sessionMap.get(campaign.id),
            status,
          })
        }
        groupsMap.get(campaign.id)!.characters.push(char)
      })
    })

    setCampaignGroups(Array.from(groupsMap.values()))
    setLoading(false)
  }

  // Filter groups by status
  const filteredGroups = useMemo(() => {
    if (statusFilter === 'all') return campaignGroups
    return campaignGroups.filter(group => group.status === statusFilter)
  }, [campaignGroups, statusFilter])

  // Separate groups by status for display
  const activeGroups = useMemo(() =>
    filteredGroups.filter(g => g.status === 'active'),
    [filteredGroups]
  )
  const inactiveGroups = useMemo(() =>
    filteredGroups.filter(g => g.status === 'inactive'),
    [filteredGroups]
  )
  const completedGroups = useMemo(() =>
    filteredGroups.filter(g => g.status === 'completed'),
    [filteredGroups]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    )
  }

  if (inPlayCharacters.length === 0) {
    return (
      <div className="text-center py-16 bg-white/[0.02] border border-white/[0.06] rounded-xl">
        <Play className="w-12 h-12 mx-auto mb-4 text-purple-400/50" />
        <h3 className="text-lg font-medium text-white mb-2">No characters in play</h3>
        <p className="text-gray-400 max-w-sm mx-auto mb-6">
          When you join a campaign with a character, they'll appear here with their campaign info.
        </p>
        <div className="max-w-md mx-auto text-left bg-white/[0.02] border border-white/[0.06] rounded-lg p-4">
          <p className="text-sm text-gray-400 mb-3">Ready to play?</p>
          <ol className="text-sm text-gray-300 space-y-2">
            <li className="flex gap-2">
              <span className="text-purple-400 font-medium">1.</span>
              Join a campaign, adventure, or oneshot
            </li>
            <li className="flex gap-2">
              <span className="text-purple-400 font-medium">2.</span>
              Bring one of your characters (or create one)
            </li>
            <li className="flex gap-2">
              <span className="text-purple-400 font-medium">3.</span>
              Your in-play version appears here automatically
            </li>
          </ol>
        </div>
      </div>
    )
  }

  const getCampaignIcon = (campaign: Campaign) => {
    // Determine icon based on campaign type or name patterns
    const name = campaign.name.toLowerCase()
    if (name.includes('oneshot') || name.includes('one-shot')) {
      return <Sword className="w-5 h-5" />
    }
    if (name.includes('adventure')) {
      return <Compass className="w-5 h-5" />
    }
    return <Castle className="w-5 h-5" />
  }

  const getStatusIcon = (status: 'active' | 'inactive' | 'completed') => {
    switch (status) {
      case 'active':
        return <Play className="w-3.5 h-3.5 text-green-400" />
      case 'inactive':
        return <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
      case 'completed':
        return <CheckCircle className="w-3.5 h-3.5 text-blue-400" />
    }
  }

  const renderCampaignGroup = (group: CampaignGroup) => (
    <div
      key={group.campaign.id}
      className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden"
    >
      {/* Campaign Header */}
      <div className="p-4 border-b border-white/[0.06]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              group.status === 'active' && "bg-green-500/10 text-green-400",
              group.status === 'inactive' && "bg-amber-500/10 text-amber-400",
              group.status === 'completed' && "bg-blue-500/10 text-blue-400",
            )}>
              {getCampaignIcon(group.campaign)}
            </div>
            <div>
              <h3 className="font-semibold text-white flex items-center gap-2">
                {group.campaign.name}
                <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-white/[0.05]">
                  {getStatusIcon(group.status)}
                  <span className="capitalize">{group.status}</span>
                </span>
              </h3>
              <p className="text-sm text-gray-400 flex items-center gap-2">
                {group.latestSessionNumber !== undefined && (
                  <span>Session {group.latestSessionNumber}</span>
                )}
                {group.campaign.game_system && (
                  <>
                    <span className="text-gray-600">•</span>
                    <span>{group.campaign.game_system}</span>
                  </>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push(`/campaigns/${group.campaign.id}/dashboard`)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
          >
            Open Campaign
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Characters in this campaign */}
      <div className="p-4 space-y-3">
        {group.characters.map(character => (
          <button
            key={character.id}
            onClick={() => router.push(`/vault/${character.id}?view=inplay`)}
            className="w-full flex items-center gap-4 p-3 bg-white/[0.02] hover:bg-white/[0.05] rounded-lg transition-colors text-left group"
          >
            {/* Character Portrait */}
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
              {character.image_url ? (
                <Image
                  src={character.image_url}
                  alt={character.name}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-purple-500/10">
                  <span className="text-sm font-medium text-purple-400">
                    {getInitials(character.name)}
                  </span>
                </div>
              )}
            </div>

            {/* Character Info */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white truncate group-hover:text-purple-400 transition-colors">
                {character.name}
              </p>
              <p className="text-sm text-gray-400 truncate">
                {[character.race, character.class].filter(Boolean).join(' ') ||
                  (character.type === 'pc' ? 'Player Character' : 'NPC')}
              </p>
            </div>

            {/* Status Badge */}
            {character.status && (
              <span
                className="px-2 py-1 text-xs font-medium rounded-full flex-shrink-0"
                style={{
                  backgroundColor: `${character.status_color || '#8B5CF6'}20`,
                  color: character.status_color || '#8B5CF6',
                }}
              >
                {character.status}
              </span>
            )}

            <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-purple-400 transition-colors" />
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Status Filter */}
      {campaignGroups.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Filter:</span>
          {(['all', 'active', 'inactive', 'completed'] as StatusFilter[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                statusFilter === filter
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                  : "text-gray-400 hover:text-white hover:bg-white/[0.05]"
              )}
            >
              {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* No results after filter */}
      {filteredGroups.length === 0 && statusFilter !== 'all' && (
        <div className="text-center py-8 bg-white/[0.02] border border-white/[0.06] rounded-xl">
          <p className="text-gray-400">
            No {statusFilter} campaigns found.
          </p>
          <button
            onClick={() => setStatusFilter('all')}
            className="mt-2 text-sm text-purple-400 hover:text-purple-300 underline"
          >
            Show all campaigns
          </button>
        </div>
      )}

      {/* Active Campaigns Section */}
      {activeGroups.length > 0 && (statusFilter === 'all' || statusFilter === 'active') && (
        <section>
          {statusFilter === 'all' && (
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              Active ({activeGroups.length})
            </h3>
          )}
          <div className="space-y-4">
            {activeGroups.map(renderCampaignGroup)}
          </div>
        </section>
      )}

      {/* Inactive Campaigns Section */}
      {inactiveGroups.length > 0 && (statusFilter === 'all' || statusFilter === 'inactive') && (
        <section>
          {statusFilter === 'all' && (
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              Inactive ({inactiveGroups.length})
            </h3>
          )}
          <div className="space-y-4">
            {inactiveGroups.map(renderCampaignGroup)}
          </div>
        </section>
      )}

      {/* Completed Campaigns Section */}
      {completedGroups.length > 0 && (statusFilter === 'all' || statusFilter === 'completed') && (
        <section>
          {statusFilter === 'all' && (
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              Completed ({completedGroups.length})
            </h3>
          )}
          <div className="space-y-4">
            {completedGroups.map(renderCampaignGroup)}
          </div>
        </section>
      )}
    </div>
  )
}

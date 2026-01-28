'use client'

import {
  Network,
  Shield,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  GitBranch,
  Info,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { MobileLayout } from '@/components/mobile'
import { MarkdownContent } from '@/components/ui'
import { getInitials } from '@/lib/utils'
import Image from 'next/image'
import type { Tag, CampaignLore } from '@/types/database'
import type { CharacterWithTags } from './page'

interface FamilyTreeData {
  nodes: {
    id: string
    name: string
    type: string
    image_url: string | null
    status: string | null
  }[]
  edges: {
    source: string
    target: string
    relationship: string
    label?: string
  }[]
}

export interface CampaignLorePageMobileProps {
  campaignId: string
  characters: CharacterWithTags[]
  factionTags: Tag[]
  loreEntries: CampaignLore[]
  loading: boolean
  canUseAI: boolean
  generatingLore: boolean
  error: string | null
  familyTree: FamilyTreeData
  factionGroups: Map<string, CharacterWithTags[]>
  // Expand states
  familyTreeExpanded: boolean
  setFamilyTreeExpanded: (expanded: boolean) => void
  factionsExpanded: boolean
  setFactionsExpanded: (expanded: boolean) => void
  insightsExpanded: boolean
  setInsightsExpanded: (expanded: boolean) => void
  // Handlers
  handleGenerateLore: () => void
}

export function CampaignLorePageMobile({
  campaignId,
  characters,
  factionTags,
  loreEntries,
  loading,
  canUseAI,
  generatingLore,
  error,
  familyTree,
  factionGroups,
  familyTreeExpanded,
  setFamilyTreeExpanded,
  factionsExpanded,
  setFactionsExpanded,
  insightsExpanded,
  setInsightsExpanded,
  handleGenerateLore,
}: CampaignLorePageMobileProps) {
  if (loading) {
    return (
      <AppLayout campaignId={campaignId}>
        <MobileLayout title="Lore" showBackButton backHref={`/campaigns/${campaignId}/canvas`}>
          <div className="flex items-center justify-center h-[60vh]">
            <Loader2 className="w-10 h-10 animate-spin text-[--arcane-purple]" />
          </div>
        </MobileLayout>
      </AppLayout>
    )
  }

  return (
    <AppLayout campaignId={campaignId}>
      <MobileLayout
        title="Lore"
        showBackButton
        backHref={`/campaigns/${campaignId}/canvas`}
        actions={
          canUseAI && (
            <button
              onClick={handleGenerateLore}
              disabled={generatingLore}
              className="p-2 rounded-lg active:bg-purple-500/20 transition-colors"
            >
              {generatingLore ? (
                <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5 text-purple-400" />
              )}
            </button>
          )
        }
      >
        <div className="px-4 pb-24">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Stats Overview */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl text-center">
              <p className="text-2xl font-bold text-purple-400">
                {characters.filter(c => c.type === 'pc').length}
              </p>
              <p className="text-xs text-gray-500">Player Characters</p>
            </div>
            <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl text-center">
              <p className="text-2xl font-bold text-emerald-400">
                {characters.filter(c => c.type === 'npc').length}
              </p>
              <p className="text-xs text-gray-500">NPCs</p>
            </div>
            <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl text-center">
              <p className="text-2xl font-bold text-amber-400">
                {factionTags.length}
              </p>
              <p className="text-xs text-gray-500">Factions</p>
            </div>
            <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl text-center">
              <p className="text-2xl font-bold text-blue-400">
                {familyTree.edges.length}
              </p>
              <p className="text-xs text-gray-500">Relationships</p>
            </div>
          </div>

          {/* Family Tree Section */}
          <section className="mb-4">
            <button
              onClick={() => setFamilyTreeExpanded(!familyTreeExpanded)}
              className="w-full flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl active:bg-white/[0.04] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <GitBranch className="w-5 h-5 text-purple-400" />
                </div>
                <div className="text-left">
                  <h2 className="text-[15px] font-semibold text-white">Relationships</h2>
                  <p className="text-xs text-gray-500">
                    {familyTree.nodes.length} characters • {familyTree.edges.length} connections
                  </p>
                </div>
              </div>
              {familyTreeExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>

            {familyTreeExpanded && (
              <div className="mt-2 space-y-2">
                {familyTree.nodes.length === 0 ? (
                  <div className="p-6 bg-white/[0.02] border border-white/[0.06] rounded-xl text-center">
                    <Network className="w-10 h-10 mx-auto mb-3 text-gray-600" />
                    <p className="text-sm text-gray-500">No relationships yet</p>
                  </div>
                ) : (
                  familyTree.edges.map((edge, idx) => {
                    const source = familyTree.nodes.find(n => n.id === edge.source)
                    const target = familyTree.nodes.find(n => n.id === edge.target)
                    if (!source || !target) return null

                    return (
                      <div
                        key={idx}
                        className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl"
                      >
                        <div className="flex items-center justify-between mb-2">
                          {/* Source */}
                          <div className="flex items-center gap-2">
                            <div className="relative w-8 h-8 rounded-full overflow-hidden bg-[--bg-surface]">
                              {source.image_url ? (
                                <Image
                                  src={source.image_url}
                                  alt={source.name}
                                  fill
                                  className="object-cover"
                                  sizes="32px"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">
                                  {getInitials(source.name)}
                                </div>
                              )}
                            </div>
                            <span className="text-sm font-medium text-white">{source.name}</span>
                          </div>
                          {/* Target */}
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white">{target.name}</span>
                            <div className="relative w-8 h-8 rounded-full overflow-hidden bg-[--bg-surface]">
                              {target.image_url ? (
                                <Image
                                  src={target.image_url}
                                  alt={target.name}
                                  fill
                                  className="object-cover"
                                  sizes="32px"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">
                                  {getInitials(target.name)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-center">
                          <span className="px-2 py-0.5 bg-purple-500/20 rounded-full text-xs font-medium text-purple-400">
                            {edge.label || edge.relationship}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </section>

          {/* Factions Section */}
          <section className="mb-4">
            <button
              onClick={() => setFactionsExpanded(!factionsExpanded)}
              className="w-full flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl active:bg-white/[0.04] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <Shield className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="text-left">
                  <h2 className="text-[15px] font-semibold text-white">Factions</h2>
                  <p className="text-xs text-gray-500">
                    {factionTags.length} faction{factionTags.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              {factionsExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>

            {factionsExpanded && (
              <div className="mt-2 space-y-2">
                {factionTags.length === 0 ? (
                  <div className="p-6 bg-white/[0.02] border border-white/[0.06] rounded-xl text-center">
                    <Shield className="w-10 h-10 mx-auto mb-3 text-gray-600" />
                    <p className="text-sm text-gray-500">No factions yet</p>
                  </div>
                ) : (
                  factionTags.map(faction => {
                    const members = factionGroups.get(faction.id) || []
                    return (
                      <div
                        key={faction.id}
                        className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <Shield className="w-4 h-4" style={{ color: faction.color }} />
                          <span className="font-medium" style={{ color: faction.color }}>
                            {faction.name}
                          </span>
                          <span className="text-xs text-gray-500 ml-auto">
                            {members.length} member{members.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {members.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {members.map(char => (
                              <div
                                key={char.id}
                                className="flex items-center gap-1.5 px-2 py-1 bg-white/[0.03] rounded-lg"
                              >
                                <div className="relative w-5 h-5 rounded-full overflow-hidden bg-[--bg-surface]">
                                  {char.image_url ? (
                                    <Image
                                      src={char.image_url}
                                      alt={char.name}
                                      fill
                                      className="object-cover"
                                      sizes="20px"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-gray-500">
                                      {getInitials(char.name)}
                                    </div>
                                  )}
                                </div>
                                <span className="text-xs text-gray-300">{char.name}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-600 italic">No members</p>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </section>

          {/* Campaign Intelligence Insights Section */}
          {canUseAI && (
            <section className="mb-4">
              <button
                onClick={() => setInsightsExpanded(!insightsExpanded)}
                className="w-full flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl active:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="text-left">
                    <h2 className="text-[15px] font-semibold text-white">Campaign Insights</h2>
                    <p className="text-xs text-gray-500">
                      {loreEntries.length} insight{loreEntries.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                {insightsExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </button>

              {insightsExpanded && (
                <div className="mt-2 space-y-2">
                  {loreEntries.length === 0 ? (
                    <div className="p-6 bg-white/[0.02] border border-white/[0.06] rounded-xl text-center">
                      <Sparkles className="w-10 h-10 mx-auto mb-3 text-gray-600" />
                      <p className="text-sm text-gray-500 mb-3">No insights yet</p>
                      <button
                        className="btn btn-secondary text-sm"
                        onClick={handleGenerateLore}
                        disabled={generatingLore}
                      >
                        {generatingLore ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            Generate
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    loreEntries.map(entry => (
                      <div
                        key={entry.id}
                        className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl"
                      >
                        <div className="flex items-start gap-2 mb-2">
                          <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                          <h4 className="font-medium text-white text-sm">{entry.title}</h4>
                        </div>
                        <div className="text-xs text-gray-400 mb-2 line-clamp-4">
                          {typeof entry.content === 'string' ? (
                            <MarkdownContent content={entry.content} className="text-xs [&_p]:text-gray-400" />
                          ) : (
                            <pre className="whitespace-pre-wrap">{JSON.stringify(entry.content, null, 2)}</pre>
                          )}
                        </div>
                        <p className="text-xs text-gray-600">
                          {entry.lore_type} • {new Date(entry.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </section>
          )}
        </div>
      </MobileLayout>
    </AppLayout>
  )
}

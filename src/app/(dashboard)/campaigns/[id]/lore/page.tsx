'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Network,
  Users,
  Shield,
  Sparkles,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  GitBranch,
  Info,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { BackToTopButton } from '@/components/ui/back-to-top'
import { useSupabase, useUser, useIsMobile } from '@/hooks'
import { CampaignLorePageMobile } from './page.mobile'
import { useAppStore } from '@/store'
import { cn, getInitials } from '@/lib/utils'
import Image from 'next/image'
import type { Campaign, Character, Tag, CharacterTag, CharacterRelationship, CampaignLore } from '@/types/database'

interface CharacterWithTags extends Character {
  tags: (CharacterTag & { tag: Tag })[]
}

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

export default function LorePage() {
  const params = useParams()
  const router = useRouter()
  const supabase = useSupabase()
  const { user } = useUser()
  const { aiEnabled } = useAppStore()

  const campaignId = params.id as string
  const isMobile = useIsMobile()

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [characters, setCharacters] = useState<CharacterWithTags[]>([])
  const [relationships, setRelationships] = useState<CharacterRelationship[]>([])
  const [loreEntries, setLoreEntries] = useState<CampaignLore[]>([])
  const [factionTags, setFactionTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [generatingLore, setGeneratingLore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Section expand states
  const [familyTreeExpanded, setFamilyTreeExpanded] = useState(true)
  const [factionsExpanded, setFactionsExpanded] = useState(true)
  const [insightsExpanded, setInsightsExpanded] = useState(true)

  useEffect(() => {
    if (user && campaignId) {
      loadData()
    }
  }, [user, campaignId])

  const loadData = async () => {
    setLoading(true)

    // Load campaign
    const { data: campaignData } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (!campaignData) {
      router.push('/campaigns')
      return
    }
    setCampaign(campaignData)

    // Load characters with tags
    const { data: charactersData } = await supabase
      .from('characters')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('name')

    if (charactersData) {
      // Load tags for all characters
      const characterIds = charactersData.map(c => c.id)
      const { data: tagsData } = characterIds.length > 0
        ? await supabase
            .from('character_tags')
            .select(`*, tag:tags(*)`)
            .in('character_id', characterIds)
        : { data: null }

      // Group tags by character
      const tagMap = new Map<string, (CharacterTag & { tag: Tag })[]>()
      for (const tag of (tagsData || [])) {
        const existing = tagMap.get(tag.character_id) || []
        existing.push(tag as CharacterTag & { tag: Tag })
        tagMap.set(tag.character_id, existing)
      }

      const charsWithTags = charactersData.map(c => ({
        ...c,
        tags: tagMap.get(c.id) || []
      }))
      setCharacters(charsWithTags)
    }

    // Load character relationships
    const { data: relationshipsData } = await supabase
      .from('character_relationships')
      .select('*')
      .eq('campaign_id', campaignId)

    setRelationships(relationshipsData || [])

    // Load faction tags
    const { data: factionTagsData } = await supabase
      .from('tags')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('category', 'faction')

    setFactionTags(factionTagsData || [])

    // Load lore entries
    const { data: loreData } = await supabase
      .from('campaign_lore')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })

    setLoreEntries(loreData || [])

    setLoading(false)
  }

  // Build family tree data from relationships
  const buildFamilyTree = useCallback((): FamilyTreeData => {
    const characterIds = new Set(relationships.flatMap(r => [r.character_id, r.related_character_id]))
    const nodes = characters
      .filter(c => characterIds.has(c.id))
      .map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
        image_url: c.image_url,
        status: c.status,
      }))

    const edges = relationships.map(r => ({
      source: r.character_id,
      target: r.related_character_id,
      relationship: r.relationship_type,
      label: r.relationship_label || undefined,
    }))

    return { nodes, edges }
  }, [characters, relationships])

  // Generate AI lore analysis
  const handleGenerateLore = async () => {
    if (!aiEnabled) return

    setGeneratingLore(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/analyze-lore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          characters: characters.map(c => ({
            name: c.name,
            type: c.type,
            description: c.description,
            summary: c.summary,
            secrets: c.secrets,
            tags: c.tags.map(t => t.tag.name),
          })),
          relationships: relationships.map(r => ({
            character: characters.find(c => c.id === r.character_id)?.name,
            related: characters.find(c => c.id === r.related_character_id)?.name,
            type: r.relationship_type,
            label: r.relationship_label,
          })),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to analyze lore')
      }

      // Reload lore entries
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate lore')
    } finally {
      setGeneratingLore(false)
    }
  }

  // Group characters by faction
  const charactersByFaction = useCallback(() => {
    const grouped = new Map<string, CharacterWithTags[]>()

    // Add "No Faction" group
    grouped.set('__none__', [])

    // Initialize faction groups
    for (const faction of factionTags) {
      grouped.set(faction.id, [])
    }

    // Group characters
    for (const char of characters) {
      const factionTag = char.tags.find(t => t.tag.category === 'faction')
      if (factionTag) {
        const existing = grouped.get(factionTag.tag.id) || []
        existing.push(char)
        grouped.set(factionTag.tag.id, existing)
      } else {
        const noFaction = grouped.get('__none__') || []
        noFaction.push(char)
        grouped.set('__none__', noFaction)
      }
    }

    return grouped
  }, [characters, factionTags])

  const familyTree = buildFamilyTree()
  const factionGroups = charactersByFaction()

  // ============ MOBILE LAYOUT ============
  if (isMobile) {
    return (
      <CampaignLorePageMobile
        campaignId={campaignId}
        characters={characters}
        factionTags={factionTags}
        loreEntries={loreEntries}
        loading={loading}
        aiEnabled={aiEnabled}
        generatingLore={generatingLore}
        error={error}
        familyTree={familyTree}
        factionGroups={factionGroups}
        familyTreeExpanded={familyTreeExpanded}
        setFamilyTreeExpanded={setFamilyTreeExpanded}
        factionsExpanded={factionsExpanded}
        setFactionsExpanded={setFactionsExpanded}
        insightsExpanded={insightsExpanded}
        setInsightsExpanded={setInsightsExpanded}
        handleGenerateLore={handleGenerateLore}
      />
    )
  }

  // ============ DESKTOP LAYOUT ============
  if (loading) {
    return (
      <AppLayout campaignId={campaignId}>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-10 h-10 border-2 border-[--arcane-purple] border-t-transparent rounded-full spinner" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout campaignId={campaignId}>
      <div className="max-w-5xl mx-auto">
        {/* Page Header */}
        <div className="page-header flex items-start justify-between">
          <div>
            <h1 className="page-title">Campaign Lore</h1>
            <p className="page-subtitle">
              Explore relationships, factions, and AI-generated insights
            </p>
          </div>
          {aiEnabled && (
            <button
              className="btn btn-primary"
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
                  Analyze Lore
                </>
              )}
            </button>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Family Tree Section */}
        <section className="mb-8">
          <button
            onClick={() => setFamilyTreeExpanded(!familyTreeExpanded)}
            className="w-full flex items-center justify-between py-4 px-1 group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                <GitBranch className="w-5 h-5 text-purple-400" />
              </div>
              <div className="text-left">
                <h2 className="text-lg font-semibold text-white/90">Family Tree & Relationships</h2>
                <p className="text-sm text-gray-500">
                  {familyTree.nodes.length} characters with {familyTree.edges.length} connections
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
            <div className="mt-4 p-6 bg-white/[0.02] border border-white/[0.06] rounded-xl">
              {familyTree.nodes.length === 0 ? (
                <div className="text-center py-12">
                  <Network className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                  <p className="text-gray-500 mb-2">No relationships defined yet</p>
                  <p className="text-sm text-gray-600">
                    Add relationships to characters from the canvas editor to see them here
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Relationship List View */}
                  <div className="grid gap-4">
                    {familyTree.edges.map((edge, idx) => {
                      const source = familyTree.nodes.find(n => n.id === edge.source)
                      const target = familyTree.nodes.find(n => n.id === edge.target)
                      if (!source || !target) return null

                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-4 p-4 bg-white/[0.03] rounded-lg"
                        >
                          {/* Source character */}
                          <div className="flex items-center gap-3 flex-1">
                            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-[--bg-surface] flex-shrink-0">
                              {source.image_url ? (
                                <Image
                                  src={source.image_url}
                                  alt={source.name}
                                  fill
                                  className="object-cover"
                                  sizes="40px"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">
                                  {getInitials(source.name)}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-white">{source.name}</p>
                              <p className="text-xs text-gray-500 capitalize">{source.type}</p>
                            </div>
                          </div>

                          {/* Relationship */}
                          <div className="flex flex-col items-center px-4">
                            <div className="px-3 py-1 bg-purple-500/20 rounded-full text-xs font-medium text-purple-400">
                              {edge.label || edge.relationship}
                            </div>
                            <div className="w-px h-4 bg-purple-500/30 my-1" />
                          </div>

                          {/* Target character */}
                          <div className="flex items-center gap-3 flex-1 justify-end">
                            <div className="text-right">
                              <p className="font-medium text-white">{target.name}</p>
                              <p className="text-xs text-gray-500 capitalize">{target.type}</p>
                            </div>
                            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-[--bg-surface] flex-shrink-0">
                              {target.image_url ? (
                                <Image
                                  src={target.image_url}
                                  alt={target.name}
                                  fill
                                  className="object-cover"
                                  sizes="40px"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">
                                  {getInitials(target.name)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Factions Section */}
        <section className="mb-8">
          <button
            onClick={() => setFactionsExpanded(!factionsExpanded)}
            className="w-full flex items-center justify-between py-4 px-1 group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <Shield className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-left">
                <h2 className="text-lg font-semibold text-white/90">Factions</h2>
                <p className="text-sm text-gray-500">
                  {factionTags.length} factions across {characters.length} characters
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
            <div className="mt-4 space-y-4">
              {factionTags.length === 0 ? (
                <div className="p-6 bg-white/[0.02] border border-white/[0.06] rounded-xl text-center">
                  <Shield className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                  <p className="text-gray-500 mb-2">No factions defined yet</p>
                  <p className="text-sm text-gray-600">
                    Create faction tags from the character editor to organize your world
                  </p>
                </div>
              ) : (
                <>
                  {factionTags.map(faction => {
                    const members = factionGroups.get(faction.id) || []
                    return (
                      <div
                        key={faction.id}
                        className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl"
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <Shield
                            className="w-5 h-5"
                            style={{ color: faction.color }}
                          />
                          <h3
                            className="font-semibold"
                            style={{ color: faction.color }}
                          >
                            {faction.name}
                          </h3>
                          <span className="text-xs text-gray-500">
                            {members.length} member{members.length !== 1 ? 's' : ''}
                          </span>
                        </div>

                        {members.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {members.map(char => (
                              <div
                                key={char.id}
                                className="flex items-center gap-2 px-3 py-2 bg-white/[0.03] rounded-lg"
                              >
                                <div className="relative w-6 h-6 rounded-full overflow-hidden bg-[--bg-surface]">
                                  {char.image_url ? (
                                    <Image
                                      src={char.image_url}
                                      alt={char.name}
                                      fill
                                      className="object-cover"
                                      sizes="24px"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-gray-500">
                                      {getInitials(char.name)}
                                    </div>
                                  )}
                                </div>
                                <span className="text-sm text-gray-300">{char.name}</span>
                                <span className="text-xs text-gray-600 capitalize">({char.type})</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-600 italic">No members yet</p>
                        )}
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          )}
        </section>

        {/* AI Insights Section */}
        {aiEnabled && (
          <section className="mb-8">
            <button
              onClick={() => setInsightsExpanded(!insightsExpanded)}
              className="w-full flex items-center justify-between py-4 px-1 group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                </div>
                <div className="text-left">
                  <h2 className="text-lg font-semibold text-white/90">AI Insights</h2>
                  <p className="text-sm text-gray-500">
                    {loreEntries.length} insight{loreEntries.length !== 1 ? 's' : ''} generated
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
              <div className="mt-4">
                {loreEntries.length === 0 ? (
                  <div className="p-6 bg-white/[0.02] border border-white/[0.06] rounded-xl text-center">
                    <Sparkles className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                    <p className="text-gray-500 mb-2">No AI insights yet</p>
                    <p className="text-sm text-gray-600 mb-4">
                      Click "Analyze Lore" to generate insights about your campaign
                    </p>
                    <button
                      className="btn btn-secondary"
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
                          Generate Insights
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {loreEntries.map(entry => (
                      <div
                        key={entry.id}
                        className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-amber-500/10 rounded-lg">
                            <Info className="w-4 h-4 text-amber-400" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-white mb-2">{entry.title}</h4>
                            <div className="text-sm text-gray-400 whitespace-pre-wrap">
                              {typeof entry.content === 'string'
                                ? entry.content
                                : JSON.stringify(entry.content, null, 2)}
                            </div>
                            <p className="text-xs text-gray-600 mt-3">
                              {entry.lore_type} • Generated {new Date(entry.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Character Overview Stats */}
        <section className="mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl text-center">
              <p className="text-3xl font-bold text-purple-400">
                {characters.filter(c => c.type === 'pc').length}
              </p>
              <p className="text-sm text-gray-500">Player Characters</p>
            </div>
            <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl text-center">
              <p className="text-3xl font-bold text-emerald-400">
                {characters.filter(c => c.type === 'npc').length}
              </p>
              <p className="text-sm text-gray-500">NPCs</p>
            </div>
            <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl text-center">
              <p className="text-3xl font-bold text-amber-400">
                {factionTags.length}
              </p>
              <p className="text-sm text-gray-500">Factions</p>
            </div>
            <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl text-center">
              <p className="text-3xl font-bold text-blue-400">
                {relationships.length}
              </p>
              <p className="text-sm text-gray-500">Relationships</p>
            </div>
          </div>
        </section>
      </div>
      <BackToTopButton />
    </AppLayout>
  )
}

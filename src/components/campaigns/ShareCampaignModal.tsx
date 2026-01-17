'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Modal } from '@/components/ui'
import {
  Check,
  Copy,
  Link2,
  Trash2,
  Loader2,
  ExternalLink,
  Users,
  BookOpen,
  Map,
  Network,
  Image as ImageIcon,
  Calendar,
  ChevronDown,
  ChevronRight,
  Scroll,
  Castle,
  Swords,
} from 'lucide-react'
import { useSupabase } from '@/hooks'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { getInitials } from '@/lib/utils'

interface ShareCampaignModalProps {
  isOpen: boolean
  onClose: () => void
  campaignId: string
  campaignName: string
}

interface SectionToggle {
  key: string
  label: string
  group: string
  defaultOn: boolean
  warning?: string
  description?: string
}

interface CharacterItem {
  id: string
  name: string
  image_url?: string | null
  is_pc: boolean
}

interface SessionItem {
  id: string
  session_number: number
  title: string | null
  date: string
}

interface LoreItem {
  id: string
  title: string
  lore_type: string
}

// Section toggles grouped by category
const SECTION_TOGGLES: SectionToggle[] = [
  // OVERVIEW
  { key: 'campaignInfo', label: 'Campaign Info', group: 'OVERVIEW', defaultOn: true, description: 'Name, description, game system' },
  { key: 'partySummary', label: 'Party Summary', group: 'OVERVIEW', defaultOn: true, description: 'Quick overview of the adventuring party' },

  // THE PARTY (PCs)
  { key: 'pcBasics', label: 'Basic Info', group: 'THE PARTY', defaultOn: true, description: 'Names, classes, images' },
  { key: 'pcDetails', label: 'Character Details', group: 'THE PARTY', defaultOn: true, description: 'Backgrounds, personalities' },
  { key: 'pcSecrets', label: 'PC Secrets', group: 'THE PARTY', defaultOn: false, warning: 'spoilers', description: 'Secret backstories, hidden agendas' },

  // THE CAST (NPCs)
  { key: 'npcBasics', label: 'Basic Info', group: 'THE CAST', defaultOn: true, description: 'Names, roles, images' },
  { key: 'npcDetails', label: 'NPC Details', group: 'THE CAST', defaultOn: true, description: 'Descriptions, motivations' },
  { key: 'npcSecrets', label: 'NPC Secrets', group: 'THE CAST', defaultOn: false, warning: 'spoilers', description: 'Hidden agendas, secret allegiances' },

  // THE STORY
  { key: 'sessionRecaps', label: 'Session Recaps', group: 'THE STORY', defaultOn: true, description: 'Summary of each session' },
  { key: 'sessionNotes', label: 'Full Session Notes', group: 'THE STORY', defaultOn: false, description: 'Detailed notes from sessions' },
  { key: 'timeline', label: 'Timeline', group: 'THE STORY', defaultOn: true, description: 'Interactive timeline of events' },

  // THE WORLD
  { key: 'worldMaps', label: 'Maps', group: 'THE WORLD', defaultOn: true, description: 'World and location maps' },
  { key: 'locations', label: 'Locations', group: 'THE WORLD', defaultOn: true, description: 'Places of interest' },
  { key: 'factions', label: 'Factions', group: 'THE WORLD', defaultOn: true, description: 'Organizations and groups' },
  { key: 'lore', label: 'Lore & History', group: 'THE WORLD', defaultOn: true, description: 'World lore entries' },

  // RELATIONSHIPS
  { key: 'knownRelationships', label: 'Known Relationships', group: 'RELATIONSHIPS', defaultOn: true, description: 'Public character connections' },
  { key: 'hiddenRelationships', label: 'Hidden Relationships', group: 'RELATIONSHIPS', defaultOn: false, warning: 'spoilers', description: 'Secret connections' },

  // THE CANVAS
  { key: 'canvas', label: 'Interactive Canvas', group: 'THE CANVAS', defaultOn: true, description: 'Visual character arrangement' },

  // MEDIA
  { key: 'gallery', label: 'Gallery', group: 'MEDIA', defaultOn: true, description: 'Campaign images and artwork' },
]

const EXPIRATION_OPTIONS = [
  { value: null, label: 'Never' },
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
]

const GROUP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'OVERVIEW': BookOpen,
  'THE PARTY': Users,
  'THE CAST': Users,
  'THE STORY': Scroll,
  'THE WORLD': Castle,
  'RELATIONSHIPS': Network,
  'THE CANVAS': Map,
  'MEDIA': ImageIcon,
}

export function ShareCampaignModal({
  isOpen,
  onClose,
  campaignId,
  campaignName,
}: ShareCampaignModalProps) {
  const supabase = useSupabase()
  const [sections, setSections] = useState<Record<string, boolean>>({})
  const [expiresInDays, setExpiresInDays] = useState<number | null>(null)
  const [note, setNote] = useState<string>('')
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [shareCode, setShareCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [existingShares, setExistingShares] = useState<any[]>([])
  const [selectedShareId, setSelectedShareId] = useState<string | null>(null)
  const [checkingExisting, setCheckingExisting] = useState(true)
  const [showNewLinkForm, setShowNewLinkForm] = useState(false)

  // Content availability
  const [sectionContent, setSectionContent] = useState<Record<string, boolean>>({})
  const [loadingContent, setLoadingContent] = useState(true)

  // Individual item selection
  const [characters, setCharacters] = useState<CharacterItem[]>([])
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [loreItems, setLoreItems] = useState<LoreItem[]>([])
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<Set<string>>(new Set())
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set())
  const [selectedLoreIds, setSelectedLoreIds] = useState<Set<string>>(new Set())

  // Collapsed groups for UI
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  // Initialize with defaults
  useEffect(() => {
    const defaults: Record<string, boolean> = {}
    SECTION_TOGGLES.forEach((t) => {
      defaults[t.key] = t.defaultOn
    })
    setSections(defaults)
  }, [])

  // Check for existing share and load content availability when modal opens
  useEffect(() => {
    if (isOpen && campaignId) {
      checkExistingShare()
      loadSectionContent()
    }
  }, [isOpen, campaignId])

  const checkExistingShare = async () => {
    setCheckingExisting(true)
    try {
      const { data } = await supabase
        .from('campaign_shares')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false })

      if (data && data.length > 0) {
        setExistingShares(data)
      }
    } catch {
      // No existing shares
    }
    setCheckingExisting(false)
  }

  const loadSectionContent = async () => {
    setLoadingContent(true)
    const client = createClient()

    try {
      // Load campaign data
      const { data: campaign } = await client
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single()

      // Load characters
      const { data: chars } = await client
        .from('characters')
        .select('id, name, image_url, is_pc')
        .eq('campaign_id', campaignId)
        .order('name')

      // Load sessions
      const { data: sess } = await client
        .from('sessions')
        .select('id, session_number, title, date')
        .eq('campaign_id', campaignId)
        .order('session_number', { ascending: true })

      // Load timeline events
      const { data: timeline } = await client
        .from('timeline_events')
        .select('id')
        .eq('campaign_id', campaignId)

      // Load world maps
      const { data: maps } = await client
        .from('world_maps')
        .select('id')
        .eq('campaign_id', campaignId)

      // Load relationships
      const { data: relationships } = await client
        .from('character_relationships')
        .select('id, is_known_to_party')
        .eq('campaign_id', campaignId)

      // Load lore
      const { data: lore } = await client
        .from('campaign_lore')
        .select('id, title, lore_type')
        .eq('campaign_id', campaignId)

      // Load gallery
      const { data: gallery } = await client
        .from('media_gallery')
        .select('id')
        .eq('campaign_id', campaignId)

      // Load canvas groups (to check if canvas has content)
      const { data: canvasGroups } = await client
        .from('canvas_groups')
        .select('id')
        .eq('campaign_id', campaignId)

      const characterList = chars || []
      const sessionList = sess || []
      const loreList = lore || []
      const pcs = characterList.filter(c => c.is_pc)
      const npcs = characterList.filter(c => !c.is_pc)
      const knownRels = (relationships || []).filter(r => r.is_known_to_party)
      const hiddenRels = (relationships || []).filter(r => !r.is_known_to_party)

      setCharacters(characterList)
      setSessions(sessionList)
      setLoreItems(loreList)

      // Select all by default
      setSelectedCharacterIds(new Set(characterList.map(c => c.id)))
      setSelectedSessionIds(new Set(sessionList.map(s => s.id)))
      setSelectedLoreIds(new Set(loreList.map(l => l.id)))

      setSectionContent({
        campaignInfo: !!campaign,
        partySummary: pcs.length > 0,
        pcBasics: pcs.length > 0,
        pcDetails: pcs.length > 0,
        pcSecrets: pcs.length > 0,
        npcBasics: npcs.length > 0,
        npcDetails: npcs.length > 0,
        npcSecrets: npcs.length > 0,
        sessionRecaps: sessionList.length > 0,
        sessionNotes: sessionList.length > 0,
        timeline: (timeline?.length || 0) > 0,
        worldMaps: (maps?.length || 0) > 0,
        locations: loreList.some(l => l.lore_type === 'location'),
        factions: loreList.some(l => l.lore_type === 'faction'),
        lore: loreList.length > 0,
        knownRelationships: knownRels.length > 0,
        hiddenRelationships: hiddenRels.length > 0,
        canvas: characterList.length > 0 || (canvasGroups?.length || 0) > 0,
        gallery: (gallery?.length || 0) > 0,
      })
    } catch (err) {
      console.error('Error loading section content:', err)
    }
    setLoadingContent(false)
  }

  const selectShare = (share: any) => {
    setSelectedShareId(share.id)
    setShareCode(share.share_code)
    setShareUrl(`${window.location.origin}/share/campaign/${share.share_code}`)

    // Merge with defaults
    const defaults: Record<string, boolean> = {}
    SECTION_TOGGLES.forEach((t) => {
      defaults[t.key] = t.defaultOn
    })
    const includedSections = share.included_sections || {}
    setSections({ ...defaults, ...includedSections })

    // Restore individual selections
    if (includedSections.selectedCharacterIds) {
      setSelectedCharacterIds(new Set(includedSections.selectedCharacterIds))
    }
    if (includedSections.selectedSessionIds) {
      setSelectedSessionIds(new Set(includedSections.selectedSessionIds))
    }
    if (includedSections.selectedLoreIds) {
      setSelectedLoreIds(new Set(includedSections.selectedLoreIds))
    }

    setNote(share.note || '')
    setShowNewLinkForm(false)
  }

  const startNewLink = () => {
    setSelectedShareId(null)
    setShareCode(null)
    setShareUrl(null)
    setShowNewLinkForm(true)

    // Reset to defaults
    const defaults: Record<string, boolean> = {}
    SECTION_TOGGLES.forEach((t) => {
      defaults[t.key] = t.defaultOn
    })
    setSections(defaults)

    // Select all items
    setSelectedCharacterIds(new Set(characters.map(c => c.id)))
    setSelectedSessionIds(new Set(sessions.map(s => s.id)))
    setSelectedLoreIds(new Set(loreItems.map(l => l.id)))
    setNote('')
  }

  const toggleSection = (key: string) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const toggleGroup = (group: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })
  }

  const toggleCharacter = (id: string) => {
    setSelectedCharacterIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSession = (id: string) => {
    setSelectedSessionIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleLore = (id: string) => {
    setSelectedLoreIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllCharacters = (pcs: boolean) => {
    const chars = characters.filter(c => c.is_pc === pcs)
    setSelectedCharacterIds(prev => {
      const next = new Set(prev)
      chars.forEach(c => next.add(c.id))
      return next
    })
  }

  const deselectAllCharacters = (pcs: boolean) => {
    const chars = characters.filter(c => c.is_pc === pcs)
    setSelectedCharacterIds(prev => {
      const next = new Set(prev)
      chars.forEach(c => next.delete(c.id))
      return next
    })
  }

  const selectAllSessions = () => {
    setSelectedSessionIds(new Set(sessions.map(s => s.id)))
  }

  const deselectAllSessions = () => {
    setSelectedSessionIds(new Set())
  }

  const createShare = async () => {
    setLoading(true)
    try {
      const includedSections = {
        ...sections,
        selectedCharacterIds: Array.from(selectedCharacterIds),
        selectedSessionIds: Array.from(selectedSessionIds),
        selectedLoreIds: Array.from(selectedLoreIds),
      }

      const res = await fetch('/api/campaigns/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          includedSections,
          expiresInDays,
          note: note.trim() || null,
        }),
      })

      if (!res.ok) throw new Error('Failed to create share')

      const data = await res.json()
      const newShare = {
        id: data.shareId || Date.now().toString(),
        share_code: data.shareCode,
        included_sections: includedSections,
        note: note.trim() || null,
        created_at: new Date().toISOString(),
        view_count: 0,
      }
      setShareCode(data.shareCode)
      setShareUrl(`${window.location.origin}${data.shareUrl}`)
      setSelectedShareId(newShare.id)
      setExistingShares(prev => [newShare, ...prev])
      setShowNewLinkForm(false)
    } catch (err) {
      console.error('Share creation error:', err)
    }
    setLoading(false)
  }

  const updateShare = async () => {
    if (!shareCode) return
    setLoading(true)
    try {
      const includedSections = {
        ...sections,
        selectedCharacterIds: Array.from(selectedCharacterIds),
        selectedSessionIds: Array.from(selectedSessionIds),
        selectedLoreIds: Array.from(selectedLoreIds),
      }

      await supabase
        .from('campaign_shares')
        .update({
          included_sections: includedSections,
          note: note.trim() || null,
        })
        .eq('share_code', shareCode)
    } catch (err) {
      console.error('Update error:', err)
    }
    setLoading(false)
  }

  const revokeShare = async () => {
    if (!shareCode) return
    setLoading(true)
    try {
      await fetch(`/api/campaigns/share?code=${shareCode}`, { method: 'DELETE' })
      setExistingShares(prev => prev.filter(s => s.share_code !== shareCode))
      setShareUrl(null)
      setShareCode(null)
      setSelectedShareId(null)
      if (existingShares.length <= 1) {
        setShowNewLinkForm(true)
      }
    } catch (err) {
      console.error('Revoke error:', err)
    }
    setLoading(false)
  }

  const copyToClipboard = async () => {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Group sections
  const groups = ['OVERVIEW', 'THE PARTY', 'THE CAST', 'THE STORY', 'THE WORLD', 'RELATIONSHIPS', 'THE CANVAS', 'MEDIA']

  // Helper to get PCs and NPCs
  const pcs = characters.filter(c => c.is_pc)
  const npcs = characters.filter(c => !c.is_pc)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Share "${campaignName}"`}
      description="Create a shareable link with granular visibility controls"
      size="xl"
    >
      {checkingExisting || loadingContent ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
        </div>
      ) : (
        <div className="space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
          {/* Existing Shares List */}
          {existingShares.length > 0 && !selectedShareId && !showNewLinkForm && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-400">
                  Existing share links ({existingShares.length}):
                </label>
                <button
                  onClick={startNewLink}
                  className="flex items-center gap-1.5 text-sm text-purple-400 hover:text-purple-300 transition-colors"
                >
                  <Link2 className="w-4 h-4" />
                  Create New Link
                </button>
              </div>
              <div className="space-y-2">
                {existingShares.map((share) => (
                  <button
                    key={share.id}
                    onClick={() => selectShare(share)}
                    className="w-full p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-left transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono text-purple-400 truncate">
                            /share/campaign/{share.share_code}
                          </span>
                          {share.view_count > 0 && (
                            <span className="text-xs text-gray-500">{share.view_count} views</span>
                          )}
                        </div>
                        {share.note && (
                          <p className="text-xs text-gray-500 mt-1 truncate">{share.note}</p>
                        )}
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-500 flex-shrink-0 ml-2" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Show form when creating new or editing existing */}
          {(showNewLinkForm || selectedShareId || existingShares.length === 0) && (
            <>
              {/* Back button when editing */}
              {existingShares.length > 0 && (selectedShareId || showNewLinkForm) && (
                <button
                  onClick={() => {
                    setSelectedShareId(null)
                    setShareUrl(null)
                    setShareCode(null)
                    setShowNewLinkForm(false)
                  }}
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors mb-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to all links
                </button>
              )}

              {/* Section Toggles */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-3">
                  Select what to include:
                </label>
                <div className="border border-white/10 rounded-xl overflow-hidden divide-y divide-white/10">
                  {groups.map((group) => {
                    const groupToggles = SECTION_TOGGLES.filter((t) => t.group === group)
                    const hasAnyContent = groupToggles.some(t => sectionContent[t.key])
                    const isCollapsed = collapsedGroups.has(group)
                    const GroupIcon = GROUP_ICONS[group] || BookOpen

                    return (
                      <div key={group} className="bg-white/[0.01]">
                        <button
                          onClick={() => toggleGroup(group)}
                          className="w-full p-4 flex items-center gap-3 hover:bg-white/[0.02] transition-colors"
                        >
                          <div className="p-1.5 bg-purple-500/10 rounded-lg">
                            <GroupIcon className="w-4 h-4 text-purple-400" />
                          </div>
                          <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex-1 text-left">
                            {group}
                          </h4>
                          {!hasAnyContent && (
                            <span className="text-xs text-gray-600">(no content)</span>
                          )}
                          {isCollapsed ? (
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          )}
                        </button>

                        {!isCollapsed && (
                          <div className="px-4 pb-4 space-y-2">
                            {groupToggles.map((toggle) => {
                              const hasContent = sectionContent[toggle.key]
                              const isEnabled = sections[toggle.key]

                              return (
                                <label
                                  key={toggle.key}
                                  className={`flex items-start gap-3 cursor-pointer group p-2 rounded-lg hover:bg-white/[0.02] ${!hasContent ? 'opacity-50' : ''}`}
                                >
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      toggleSection(toggle.key)
                                    }}
                                    disabled={!hasContent}
                                    className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                                      isEnabled && hasContent
                                        ? 'bg-purple-600 border-purple-600'
                                        : 'border-white/20 hover:border-white/40'
                                    } ${!hasContent ? 'cursor-not-allowed' : ''}`}
                                  >
                                    {isEnabled && hasContent && <Check className="w-3 h-3 text-white" />}
                                  </button>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-sm transition-colors ${
                                        hasContent ? 'text-gray-300 group-hover:text-white' : 'text-gray-600'
                                      }`}>
                                        {toggle.label}
                                      </span>
                                      {toggle.warning && hasContent && (
                                        <span className="text-xs text-amber-500">({toggle.warning})</span>
                                      )}
                                      {!hasContent && (
                                        <span className="text-xs text-gray-600 italic">empty</span>
                                      )}
                                    </div>
                                    {toggle.description && hasContent && (
                                      <p className="text-xs text-gray-500 mt-0.5">{toggle.description}</p>
                                    )}
                                  </div>
                                </label>
                              )
                            })}

                            {/* Individual character selection for THE PARTY */}
                            {group === 'THE PARTY' && pcs.length > 0 && sections.pcBasics && (
                              <div className="mt-3 pt-3 border-t border-white/[0.06]">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs text-gray-500">Select Characters:</span>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => selectAllCharacters(true)}
                                      className="text-xs text-purple-400 hover:text-purple-300"
                                    >
                                      All
                                    </button>
                                    <button
                                      onClick={() => deselectAllCharacters(true)}
                                      className="text-xs text-gray-500 hover:text-gray-400"
                                    >
                                      None
                                    </button>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {pcs.map(char => (
                                    <button
                                      key={char.id}
                                      onClick={() => toggleCharacter(char.id)}
                                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-colors ${
                                        selectedCharacterIds.has(char.id)
                                          ? 'border-purple-500/50 bg-purple-500/10 text-white'
                                          : 'border-white/10 bg-white/[0.02] text-gray-400 hover:text-white'
                                      }`}
                                    >
                                      {char.image_url ? (
                                        <Image
                                          src={char.image_url}
                                          alt={char.name}
                                          width={20}
                                          height={20}
                                          className="rounded-full object-cover"
                                        />
                                      ) : (
                                        <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-[8px] font-bold">
                                          {getInitials(char.name)}
                                        </div>
                                      )}
                                      <span className="text-xs">{char.name}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Individual character selection for THE CAST */}
                            {group === 'THE CAST' && npcs.length > 0 && sections.npcBasics && (
                              <div className="mt-3 pt-3 border-t border-white/[0.06]">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs text-gray-500">Select NPCs:</span>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => selectAllCharacters(false)}
                                      className="text-xs text-purple-400 hover:text-purple-300"
                                    >
                                      All
                                    </button>
                                    <button
                                      onClick={() => deselectAllCharacters(false)}
                                      className="text-xs text-gray-500 hover:text-gray-400"
                                    >
                                      None
                                    </button>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                                  {npcs.map(char => (
                                    <button
                                      key={char.id}
                                      onClick={() => toggleCharacter(char.id)}
                                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-colors ${
                                        selectedCharacterIds.has(char.id)
                                          ? 'border-purple-500/50 bg-purple-500/10 text-white'
                                          : 'border-white/10 bg-white/[0.02] text-gray-400 hover:text-white'
                                      }`}
                                    >
                                      {char.image_url ? (
                                        <Image
                                          src={char.image_url}
                                          alt={char.name}
                                          width={20}
                                          height={20}
                                          className="rounded-full object-cover"
                                        />
                                      ) : (
                                        <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-[8px] font-bold">
                                          {getInitials(char.name)}
                                        </div>
                                      )}
                                      <span className="text-xs">{char.name}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Individual session selection for THE STORY */}
                            {group === 'THE STORY' && sessions.length > 0 && sections.sessionRecaps && (
                              <div className="mt-3 pt-3 border-t border-white/[0.06]">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs text-gray-500">Select Sessions:</span>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={selectAllSessions}
                                      className="text-xs text-purple-400 hover:text-purple-300"
                                    >
                                      All
                                    </button>
                                    <button
                                      onClick={deselectAllSessions}
                                      className="text-xs text-gray-500 hover:text-gray-400"
                                    >
                                      None
                                    </button>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                                  {sessions.map(sess => (
                                    <button
                                      key={sess.id}
                                      onClick={() => toggleSession(sess.id)}
                                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-colors ${
                                        selectedSessionIds.has(sess.id)
                                          ? 'border-purple-500/50 bg-purple-500/10 text-white'
                                          : 'border-white/10 bg-white/[0.02] text-gray-400 hover:text-white'
                                      }`}
                                    >
                                      <Calendar className="w-3 h-3" />
                                      <span className="text-xs">
                                        #{sess.session_number}: {sess.title || 'Untitled'}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Expiration - only for new links */}
              {showNewLinkForm && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Link expires:
                  </label>
                  <div className="relative">
                    <select
                      value={expiresInDays === null ? '' : expiresInDays}
                      onChange={(e) =>
                        setExpiresInDays(e.target.value === '' ? null : parseInt(e.target.value))
                      }
                      className="w-full py-3 px-4 bg-[#1a1a24] border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 appearance-none cursor-pointer"
                      style={{ colorScheme: 'dark' }}
                    >
                      {EXPIRATION_OPTIONS.map((opt) => (
                        <option
                          key={opt.label}
                          value={opt.value === null ? '' : opt.value}
                          className="bg-[#1a1a24] text-white"
                        >
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}

              {/* Note */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Note (optional):
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g., For my players, Discord group, Session recap..."
                  className="w-full py-3 px-4 bg-[#1a1a24] border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Helps you remember who this link was shared with
                </p>
              </div>

              {/* Share URL Display */}
              {shareUrl ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-4 bg-white/5 border border-white/10 rounded-xl">
                    <Link2 className="w-5 h-5 text-purple-400 flex-shrink-0" />
                    <input
                      type="text"
                      value={shareUrl}
                      readOnly
                      className="flex-1 bg-transparent text-sm text-gray-300 outline-none truncate"
                    />
                    <button
                      onClick={copyToClipboard}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-purple-400 bg-purple-500/10 rounded-lg hover:bg-purple-500/20 transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <a
                      href={shareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-gray-400 hover:text-purple-400 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Preview link
                    </a>
                  </div>

                  <button
                    onClick={updateShare}
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Update Share Settings'
                    )}
                  </button>
                </div>
              ) : (
                <button
                  onClick={createShare}
                  disabled={loading}
                  className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4" />
                      Create Share Link
                    </>
                  )}
                </button>
              )}

              {/* Actions */}
              <div className="flex justify-between pt-4 border-t border-white/10">
                {shareUrl ? (
                  <button
                    onClick={revokeShare}
                    disabled={loading}
                    className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Revoke Link
                  </button>
                ) : (
                  <div />
                )}
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                >
                  Done
                </button>
              </div>
            </>
          )}

          {/* Done button when viewing list */}
          {existingShares.length > 0 && !selectedShareId && !showNewLinkForm && (
            <div className="flex justify-end pt-4 border-t border-white/10">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

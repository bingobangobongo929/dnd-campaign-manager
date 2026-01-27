'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Globe, Loader2 } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { BackToTopButton } from '@/components/ui/back-to-top'
import { AccessDeniedPage, Modal, Button } from '@/components/ui'
import { WorldTabs } from '@/components/world'
import { useSupabase, useUser, useIsMobile, usePermissions } from '@/hooks'
import type { Campaign, Character, Tag, CharacterTag, CharacterRelationship, CampaignFaction } from '@/types/database'

export interface CharacterWithTags extends Character {
  tags: (CharacterTag & { tag: Tag })[]
}

export default function WorldPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = useSupabase()
  const { user } = useUser()
  const isMobile = useIsMobile()

  const campaignId = params.id as string

  // Permissions
  const { can, loading: permissionsLoading, isMember, isOwner, isDm } = usePermissions(campaignId)

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [characters, setCharacters] = useState<CharacterWithTags[]>([])
  const [relationships, setRelationships] = useState<CharacterRelationship[]>([])
  const [locationCount, setLocationCount] = useState(0)
  const [factionCount, setFactionCount] = useState(0)
  const [eventCount, setEventCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)

  // Modal states for adding content
  const [showAddLocationModal, setShowAddLocationModal] = useState(false)
  const [showAddFactionModal, setShowAddFactionModal] = useState(false)

  // Track if we need to trigger add actions in child components
  const addLocationTriggerRef = useRef(false)
  const addFactionTriggerRef = useRef(false)

  useEffect(() => {
    if (user && campaignId) {
      loadData()
    }
  }, [user, campaignId])

  const loadData = async () => {
    if (!hasLoadedOnce) {
      setLoading(true)
    }

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
      const characterIds = charactersData.map(c => c.id)
      const { data: tagsData } = characterIds.length > 0
        ? await supabase
            .from('character_tags')
            .select(`*, tag:tags(*)`)
            .in('character_id', characterIds)
        : { data: null }

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

    // Get location count (filter by visibility for non-DMs)
    let locationsQuery = supabase
      .from('locations')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)

    if (!isDm) {
      locationsQuery = locationsQuery.in('visibility', ['party', 'public'])
    }

    const { count: locCount } = await locationsQuery
    setLocationCount(locCount || 0)

    // Get faction count (filter by visibility for non-DMs)
    let factionsQuery = supabase
      .from('campaign_factions')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)

    if (!isDm) {
      factionsQuery = factionsQuery.eq('is_known_to_party', true)
    }

    const { count: facCount } = await factionsQuery
    setFactionCount(facCount || 0)

    // Get timeline event count (only if user can view timeline)
    if (can.viewTimeline || isDm) {
      const { count: evtCount } = await supabase
        .from('timeline_events')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaignId)

      setEventCount(evtCount || 0)
    }

    setLoading(false)
    setHasLoadedOnce(true)
  }

  // Handle add location - this will be passed to WorldTabs
  // and will trigger the LocationsTab to open its add modal
  const handleAddLocation = useCallback(() => {
    // Set the active tab to locations and trigger add
    localStorage.setItem('world-active-tab', 'locations')
    setShowAddLocationModal(true)
  }, [])

  // Handle add faction
  const handleAddFaction = useCallback(() => {
    localStorage.setItem('world-active-tab', 'factions')
    setShowAddFactionModal(true)
  }, [])

  // Loading state
  if (loading || permissionsLoading) {
    return (
      <AppLayout campaignId={campaignId}>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-10 h-10 border-2 border-[--arcane-purple] border-t-transparent rounded-full spinner" />
        </div>
      </AppLayout>
    )
  }

  // Permission check
  if (!isMember || !can.viewLore) {
    return (
      <AppLayout campaignId={campaignId}>
        <AccessDeniedPage
          campaignId={campaignId}
          message="You don't have permission to view this campaign's world."
        />
      </AppLayout>
    )
  }

  return (
    <AppLayout campaignId={campaignId}>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Page header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl border border-purple-500/20">
            <Globe className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">World</h1>
            <p className="text-sm text-gray-500">
              Locations, factions, relationships, and timeline in {campaign?.name}
            </p>
          </div>
        </div>

        {/* World tabs content */}
        <WorldTabs
          campaignId={campaignId}
          characters={characters}
          relationships={relationships}
          locationCount={locationCount}
          factionCount={factionCount}
          relationshipCount={relationships.length}
          eventCount={eventCount}
          isDm={isDm}
          isOwner={isOwner}
          canViewTimeline={can.viewTimeline || isDm}
          onAddLocation={handleAddLocation}
          onAddFaction={handleAddFaction}
        />
      </div>

      <BackToTopButton />

      {/* Trigger modals - these are minimal wrappers that redirect to the tabs */}
      {showAddLocationModal && (
        <AddLocationRedirect
          onClose={() => setShowAddLocationModal(false)}
          campaignId={campaignId}
        />
      )}

      {showAddFactionModal && (
        <AddFactionRedirect
          onClose={() => setShowAddFactionModal(false)}
          campaignId={campaignId}
        />
      )}
    </AppLayout>
  )
}

// These components handle the redirect to tabs with add modal open
// They're needed because the WorldTabs manages its own state
function AddLocationRedirect({ onClose, campaignId }: { onClose: () => void; campaignId: string }) {
  useEffect(() => {
    // Set the flag that LocationsTab checks
    localStorage.setItem('world-add-location-trigger', 'true')
    // Force re-render of the tab
    window.dispatchEvent(new Event('world-add-location'))
    onClose()
  }, [onClose])

  return null
}

function AddFactionRedirect({ onClose, campaignId }: { onClose: () => void; campaignId: string }) {
  useEffect(() => {
    // Set the flag that FactionsTab checks
    localStorage.setItem('world-add-faction-trigger', 'true')
    // Force re-render of the tab
    window.dispatchEvent(new Event('world-add-faction'))
    onClose()
  }, [onClose])

  return null
}

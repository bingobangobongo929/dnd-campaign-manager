import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { CampaignShareClient } from '@/app/share/campaign/[code]/client'
import Link from 'next/link'
import { ArrowLeft, Share2, Pencil } from 'lucide-react'

interface ViewPageProps {
  params: Promise<{ id: string }>
}

export default async function CampaignViewPage({ params }: ViewPageProps) {
  const { id: campaignId } = await params
  const supabase = await createClient()

  // Verify user is authenticated and owns this campaign
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Fetch campaign (will fail if user doesn't own it due to RLS)
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single()

  if (campaignError || !campaign) {
    notFound()
  }

  // ALL sections enabled - owner sees everything
  const sections = {
    campaignInfo: true,
    partySummary: true,
    pcBasics: true,
    pcDetails: true,
    pcSecrets: true,
    npcBasics: true,
    npcDetails: true,
    npcSecrets: true,
    sessionRecaps: true,
    sessionNotes: true,
    timeline: true,
    worldMaps: true,
    locations: true,
    factions: true,
    lore: true,
    knownRelationships: true,
    hiddenRelationships: true,
    canvas: true,
    gallery: true,
  }

  // Fetch ALL characters (no filtering)
  const { data: characters } = await supabase
    .from('characters')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('name')

  const allCharacters = characters || []
  const pcs = allCharacters.filter(c => c.type === 'pc')
  const npcs = allCharacters.filter(c => c.type === 'npc')

  // Fetch ALL sessions
  const { data: sessions } = await supabase
    .from('sessions')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('session_number', { ascending: true })

  const allSessions = sessions || []

  // Fetch session attendees
  const sessionAttendees: Record<string, any[]> = {}
  if (allSessions.length > 0) {
    const sessionIds = allSessions.map(s => s.id)
    const { data: sessionCharacters } = await supabase
      .from('session_characters')
      .select('session_id, character_id')
      .in('session_id', sessionIds)

    if (sessionCharacters) {
      for (const sc of sessionCharacters) {
        if (!sessionAttendees[sc.session_id]) {
          sessionAttendees[sc.session_id] = []
        }
        const char = allCharacters.find(c => c.id === sc.character_id)
        if (char) {
          sessionAttendees[sc.session_id].push(char)
        }
      }
    }
  }

  // Fetch ALL timeline events
  const { data: timelineEvents } = await supabase
    .from('timeline_events')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('event_date', { ascending: true })

  // Fetch ALL world maps
  const { data: worldMaps } = await supabase
    .from('world_maps')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('is_primary', { ascending: false })
    .order('created_at')

  // Fetch ALL relationships (including hidden)
  const { data: relationships } = await supabase
    .from('character_relationships')
    .select('*')
    .eq('campaign_id', campaignId)

  // Fetch ALL lore
  const { data: lore } = await supabase
    .from('campaign_lore')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at')

  // Fetch ALL gallery
  const { data: gallery } = await supabase
    .from('media_gallery')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })

  // Fetch canvas groups
  const { data: canvasGroups } = await supabase
    .from('canvas_groups')
    .select('*')
    .eq('campaign_id', campaignId)

  // Fetch character tags for canvas display
  const characterTags: Record<string, any[]> = {}
  if (allCharacters.length > 0) {
    const charIds = allCharacters.map(c => c.id)
    const { data: tags } = await supabase
      .from('character_tags')
      .select(`
        *,
        tag:tags(*),
        related_character:characters!character_tags_related_character_id_fkey(*)
      `)
      .in('character_id', charIds)

    if (tags) {
      for (const t of tags) {
        if (!characterTags[t.character_id]) {
          characterTags[t.character_id] = []
        }
        characterTags[t.character_id].push(t)
      }
    }
  }

  // Determine which tabs to show (all that have content)
  const availableTabs: string[] = []

  availableTabs.push('overview')
  if (pcs.length > 0) availableTabs.push('party')
  if (npcs.length > 0) availableTabs.push('cast')
  if (allSessions.length > 0 || (timelineEvents && timelineEvents.length > 0)) availableTabs.push('story')
  if ((worldMaps && worldMaps.length > 0) || (lore && lore.length > 0)) availableTabs.push('world')
  if (relationships && relationships.length > 0) availableTabs.push('relationships')
  if (allCharacters.length > 0) availableTabs.push('canvas')
  if (gallery && gallery.length > 0) availableTabs.push('gallery')

  return (
    <>
      {/* Owner Header with navigation */}
      <div className="sticky top-0 z-50 bg-[#0a0a0c]/95 backdrop-blur-sm border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link
              href={`/campaigns/${campaignId}/canvas`}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back to Canvas</span>
            </Link>

            <div className="flex items-center gap-3">
              <Link
                href={`/campaigns/${campaignId}/canvas`}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <Pencil className="w-4 h-4" />
                Edit
              </Link>
              <Link
                href={`/campaigns/${campaignId}/canvas?share=true`}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-purple-400 bg-purple-500/10 rounded-lg hover:bg-purple-500/20 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Share
              </Link>
            </div>
          </div>
        </div>
      </div>

      <CampaignShareClient
        campaign={campaign}
        sections={sections}
        availableTabs={availableTabs}
        pcs={pcs}
        npcs={npcs}
        sessions={allSessions}
        sessionAttendees={sessionAttendees}
        timelineEvents={timelineEvents || []}
        worldMaps={worldMaps || []}
        relationships={relationships || []}
        lore={lore || []}
        gallery={gallery || []}
        canvasGroups={canvasGroups || []}
        characterTags={characterTags}
        characters={allCharacters}
      />
    </>
  )
}

import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import crypto from 'crypto'
import { CampaignShareClient } from './client'
import { SharePageHeader } from '@/components/share/SharePageHeader'
import type { Metadata } from 'next'

// Detect bot/crawler user agents (social media unfurl previews, search engines, etc.)
function isBot(userAgent: string | null): boolean {
  if (!userAgent) return false
  const ua = userAgent.toLowerCase()

  // Social media preview bots
  if (ua.includes('discordbot')) return true
  if (ua.includes('slackbot')) return true
  if (ua.includes('twitterbot')) return true
  if (ua.includes('facebookexternalhit')) return true
  if (ua.includes('facebot')) return true
  if (ua.includes('telegrambot')) return true
  if (ua.includes('whatsapp')) return true
  if (ua.includes('linkedinbot')) return true
  if (ua.includes('pinterest')) return true
  if (ua.includes('embedly')) return true

  // Search engine bots
  if (ua.includes('googlebot')) return true
  if (ua.includes('bingbot')) return true
  if (ua.includes('yandex')) return true
  if (ua.includes('baiduspider')) return true
  if (ua.includes('duckduckbot')) return true

  // Generic bot patterns
  if (ua.includes('bot/') || ua.includes('bot ')) return true
  if (ua.includes('crawler')) return true
  if (ua.includes('spider')) return true
  if (ua.includes('preview')) return true
  if (ua.includes('fetcher')) return true
  if (ua.includes('scraper')) return true

  return false
}

interface SharePageProps {
  params: Promise<{ code: string }>
}

// Generate rich OpenGraph metadata for Discord/social sharing
export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { code } = await params
  const supabase = createAdminClient()

  // Fetch share and campaign data
  const { data: share } = await supabase
    .from('campaign_shares')
    .select('campaign_id')
    .eq('share_code', code)
    .single()

  if (!share) {
    return { title: 'Campaign Not Found' }
  }

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, name, description, setting, image_url')
    .eq('id', share.campaign_id)
    .single()

  if (!campaign) {
    return { title: 'Campaign Not Found' }
  }

  // Count sessions and characters for rich context
  const [sessionCount, characterCount] = await Promise.all([
    supabase
      .from('campaign_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaign.id),
    supabase
      .from('vault_characters')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaign.id),
  ])

  const sessions = sessionCount.count || 0
  const characters = characterCount.count || 0

  // Build a rich title with setting if available
  const title = campaign.setting
    ? `${campaign.name} | ${campaign.setting}`
    : campaign.name

  // Build a compelling description with stats
  let description: string
  if (campaign.description) {
    const plainDesc = campaign.description
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    description = plainDesc.length > 120
      ? plainDesc.substring(0, 117) + '...'
      : plainDesc
  } else if (campaign.setting) {
    description = `An epic ${campaign.setting.toLowerCase()} adventure`
  } else {
    description = 'A tabletop RPG campaign'
  }

  // Add stats context
  const stats: string[] = []
  if (sessions > 0) stats.push(`${sessions} session${sessions !== 1 ? 's' : ''}`)
  if (characters > 0) stats.push(`${characters} adventurer${characters !== 1 ? 's' : ''}`)
  if (stats.length > 0) {
    description = `${description} — ${stats.join(', ')}`
  }

  const imageUrl = campaign.image_url

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'Multiloop',
      images: imageUrl ? [{
        url: imageUrl,
        width: 1200,
        height: 675,
        alt: campaign.name,
      }] : [],
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title,
      description,
      images: imageUrl ? [imageUrl] : [],
    },
  }
}

export default async function ShareCampaignPage({ params }: SharePageProps) {
  const { code } = await params
  const supabase = createAdminClient()

  // Fetch share data
  const { data: share, error: shareError } = await supabase
    .from('campaign_shares')
    .select('*')
    .eq('share_code', code)
    .single()

  if (shareError || !share) {
    notFound()
  }

  // Check expiration
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0a0c]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Link Expired</h1>
          <p className="text-gray-400">This share link has expired.</p>
        </div>
      </div>
    )
  }

  // Get request headers for tracking
  const headersList = await headers()
  const referrer = headersList.get('referer') || null
  const userAgent = headersList.get('user-agent') || null
  const forwardedFor = headersList.get('x-forwarded-for')
  const realIp = headersList.get('x-real-ip')
  const ip = forwardedFor?.split(',')[0] || realIp || 'unknown'

  // Skip view tracking for bots (Discord unfurls, search engines, etc.)
  // This prevents link previews from counting as views or showing as "live" viewers
  if (!isBot(userAgent)) {
    const viewerHash = crypto.createHash('sha256').update(ip + share.id).digest('hex').substring(0, 16)

    // Abuse protection: Check if this viewer viewed this share in the last 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
    const { data: recentView } = await supabase
      .from('share_view_events')
      .select('id')
      .eq('share_id', share.id)
      .eq('viewer_hash', viewerHash)
      .gte('viewed_at', fifteenMinutesAgo)
      .limit(1)
      .single()

    // Only record view if no recent view from this viewer
    if (!recentView) {
      // Update view tracking
      await supabase
        .from('campaign_shares')
        .update({
          view_count: (share.view_count || 0) + 1,
          last_viewed_at: new Date().toISOString()
        })
        .eq('id', share.id)

      await supabase
        .from('share_view_events')
        .insert({
          share_id: share.id,
          share_type: 'campaign',
          viewer_hash: viewerHash,
          referrer: referrer?.substring(0, 500),
          user_agent: userAgent?.substring(0, 500),
        })
    }
  }

  // Fetch campaign data
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', share.campaign_id)
    .single()

  if (campaignError || !campaign) {
    notFound()
  }

  // Parse included sections
  const rawSections = share.included_sections as Record<string, any> || {}
  const sections = {
    campaignInfo: rawSections.campaignInfo !== false,
    partySummary: rawSections.partySummary !== false,
    pcBasics: rawSections.pcBasics !== false,
    pcDetails: rawSections.pcDetails !== false,
    pcSecrets: rawSections.pcSecrets === true,
    npcBasics: rawSections.npcBasics !== false,
    npcDetails: rawSections.npcDetails !== false,
    npcSecrets: rawSections.npcSecrets === true,
    sessionRecaps: rawSections.sessionRecaps !== false,
    sessionNotes: rawSections.sessionNotes !== false,
    timeline: rawSections.timeline !== false,
    worldMaps: rawSections.worldMaps !== false,
    locations: rawSections.locations !== false,
    factions: rawSections.factions !== false,
    lore: rawSections.lore !== false,
    knownRelationships: rawSections.knownRelationships !== false,
    hiddenRelationships: rawSections.hiddenRelationships === true,
    canvas: rawSections.canvas !== false,
    gallery: rawSections.gallery !== false,
  }

  // Get selected IDs (default to all if not specified)
  const selectedCharacterIds = rawSections.selectedCharacterIds as string[] | undefined
  const selectedSessionIds = rawSections.selectedSessionIds as string[] | undefined
  const selectedLoreIds = rawSections.selectedLoreIds as string[] | undefined

  // Fetch characters
  let characters: any[] = []
  if (sections.pcBasics || sections.npcBasics || sections.canvas) {
    let query = supabase
      .from('characters')
      .select('*')
      .eq('campaign_id', campaign.id)
      .order('name')

    if (selectedCharacterIds && selectedCharacterIds.length > 0) {
      query = query.in('id', selectedCharacterIds)
    }

    const { data } = await query
    characters = data || []
  }

  const pcs = characters.filter(c => c.type === 'pc')
  const npcs = characters.filter(c => c.type === 'npc')

  // Fetch sessions
  let sessions: any[] = []
  if (sections.sessionRecaps || sections.sessionNotes) {
    let query = supabase
      .from('sessions')
      .select('*')
      .eq('campaign_id', campaign.id)
      .order('session_number', { ascending: true })

    if (selectedSessionIds && selectedSessionIds.length > 0) {
      query = query.in('id', selectedSessionIds)
    }

    const { data } = await query
    sessions = data || []
  }

  // Fetch session attendees
  let sessionAttendees: Record<string, any[]> = {}
  if (sessions.length > 0) {
    const sessionIds = sessions.map(s => s.id)
    const { data: sessionCharacters } = await supabase
      .from('session_characters')
      .select('session_id, character_id')
      .in('session_id', sessionIds)

    if (sessionCharacters) {
      for (const sc of sessionCharacters) {
        if (!sessionAttendees[sc.session_id]) {
          sessionAttendees[sc.session_id] = []
        }
        const char = characters.find(c => c.id === sc.character_id)
        if (char) {
          sessionAttendees[sc.session_id].push(char)
        }
      }
    }
  }

  // Fetch timeline events
  let timelineEvents: any[] = []
  if (sections.timeline) {
    const { data } = await supabase
      .from('timeline_events')
      .select('*')
      .eq('campaign_id', campaign.id)
      .order('event_date', { ascending: true })
    timelineEvents = data || []
  }

  // Fetch world maps
  let worldMaps: any[] = []
  if (sections.worldMaps) {
    const { data } = await supabase
      .from('world_maps')
      .select('*')
      .eq('campaign_id', campaign.id)
      .order('is_primary', { ascending: false })
      .order('created_at')
    worldMaps = data || []
  }

  // Fetch relationships
  let relationships: any[] = []
  if (sections.knownRelationships || sections.hiddenRelationships) {
    const { data } = await supabase
      .from('character_relationships')
      .select('*')
      .eq('campaign_id', campaign.id)
    relationships = data || []

    // Filter based on visibility
    if (!sections.hiddenRelationships) {
      relationships = relationships.filter(r => r.is_known_to_party)
    }
  }

  // Fetch lore
  let lore: any[] = []
  if (sections.lore || sections.locations || sections.factions) {
    let query = supabase
      .from('campaign_lore')
      .select('*')
      .eq('campaign_id', campaign.id)
      .order('created_at')

    if (selectedLoreIds && selectedLoreIds.length > 0) {
      query = query.in('id', selectedLoreIds)
    }

    const { data } = await query
    lore = data || []
  }

  // Fetch gallery
  let gallery: any[] = []
  if (sections.gallery) {
    const { data } = await supabase
      .from('media_gallery')
      .select('*')
      .eq('campaign_id', campaign.id)
      .order('created_at', { ascending: false })
    gallery = data || []
  }

  // Fetch canvas groups
  let canvasGroups: any[] = []
  if (sections.canvas) {
    const { data } = await supabase
      .from('canvas_groups')
      .select('*')
      .eq('campaign_id', campaign.id)
    canvasGroups = data || []
  }

  // Fetch character tags for canvas display
  let characterTags: Record<string, any[]> = {}
  if (sections.canvas && characters.length > 0) {
    const charIds = characters.map(c => c.id)
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

  // Determine which tabs to show
  const availableTabs: string[] = []

  if (sections.campaignInfo || sections.partySummary) {
    availableTabs.push('overview')
  }
  if ((sections.pcBasics || sections.pcDetails || sections.pcSecrets) && pcs.length > 0) {
    availableTabs.push('party')
  }
  if ((sections.npcBasics || sections.npcDetails || sections.npcSecrets) && npcs.length > 0) {
    availableTabs.push('cast')
  }
  if ((sections.sessionRecaps || sections.sessionNotes || sections.timeline) && (sessions.length > 0 || timelineEvents.length > 0)) {
    availableTabs.push('story')
  }
  if ((sections.worldMaps || sections.locations || sections.factions || sections.lore) && (worldMaps.length > 0 || lore.length > 0)) {
    availableTabs.push('world')
  }
  if ((sections.knownRelationships || sections.hiddenRelationships) && relationships.length > 0) {
    availableTabs.push('relationships')
  }
  if (sections.canvas && characters.length > 0) {
    availableTabs.push('canvas')
  }
  if (sections.gallery && gallery.length > 0) {
    availableTabs.push('gallery')
  }

  return (
    <>
      <SharePageHeader contentType="campaign" contentName={campaign.name} />
      <CampaignShareClient
        campaign={campaign}
        sections={sections}
        availableTabs={availableTabs}
        pcs={pcs}
        npcs={npcs}
        sessions={sessions}
        sessionAttendees={sessionAttendees}
        timelineEvents={timelineEvents}
        worldMaps={worldMaps}
        relationships={relationships}
        lore={lore}
        gallery={gallery}
        canvasGroups={canvasGroups}
        characterTags={characterTags}
        characters={characters}
      />
    </>
  )
}

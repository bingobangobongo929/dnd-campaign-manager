'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, Settings2, Check, LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppLayout } from '@/components/layout/app-layout'
import { useSupabase, useUser, usePermissions, useDashboardPreferences } from '@/hooks'
import { useAppStore, useCanUseAI } from '@/store'
import {
  ScheduleSessionModal,
  ScheduleSettingsModal,
  CustomizeDashboardModal,
  DmDashboardLayout,
  PlayerDashboardLayout,
  EditModeToolbar,
} from '@/components/dashboard'
import {
  type ScheduleSettings,
  type SchedulePattern,
  type ScheduleException,
  getDefaultScheduleSettings,
} from '@/lib/schedule-utils'
import { getUserTimezone } from '@/lib/timezone-utils'
import { PartyModal } from '@/components/campaign'
import { UnifiedShareModal } from '@/components/share/UnifiedShareModal'
import { AccessDeniedPage } from '@/components/ui'
import { toast } from 'sonner'
import type {
  Campaign,
  Character,
  Session,
  TimelineEvent,
  PlayerSessionNote,
  CampaignMember,
  Tag,
  VaultCharacter,
} from '@/types/database'

export default function CampaignDashboardPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = useSupabase()
  const { user } = useUser()
  const { trackRecentItem } = useAppStore()
  const canUseAI = useCanUseAI()

  const campaignId = params.id as string

  // Permissions
  const { can, loading: permissionsLoading, isMember, isDm } = usePermissions(campaignId)

  // Data state
  const [loading, setLoading] = useState(true)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [characters, setCharacters] = useState<Character[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])
  const [playerNotes, setPlayerNotes] = useState<PlayerSessionNote[]>([])
  const [members, setMembers] = useState<CampaignMember[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [loreCount, setLoreCount] = useState(0)
  const [mapsCount, setMapsCount] = useState(0)

  // User's membership and character
  const [membership, setMembership] = useState<CampaignMember | null>(null)
  const [myCharacter, setMyCharacter] = useState<Character | null>(null)
  const [userVaultCharacters, setUserVaultCharacters] = useState<Pick<VaultCharacter, 'id' | 'name' | 'image_url'>[]>([])

  // Modal state
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showScheduleSettings, setShowScheduleSettings] = useState(false)
  const [showCustomizeModal, setShowCustomizeModal] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)

  const isOwner = campaign?.user_id === user?.id
  // Use isDm from usePermissions for layout decisions - it properly handles loading states
  // isPlayer is true if user has a player/contributor role and is not a DM
  const isPlayerLayout = !isDm && isMember

  // Dashboard widget preferences
  const {
    preferences,
    loaded: preferencesLoaded,
    toggleDmWidget,
    togglePlayerWidget,
    reorderDmWidgets,
    reorderPlayerWidgets,
    resetToDefaults,
    isDmWidgetVisible,
    isPlayerWidgetVisible,
    getDmWidgetSize,
    getPlayerWidgetSize,
    setDmWidgetSize,
    setPlayerWidgetSize,
    getHiddenDmWidgets,
    getHiddenPlayerWidgets,
  } = useDashboardPreferences(campaignId, user?.id)

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    if (!user) return
    // Only show loading spinner on initial load, not refetches
    if (!hasLoadedOnce) {
      setLoading(true)
    }

    try {
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

      // Track recent visit
      trackRecentItem({
        id: campaignData.id,
        type: 'campaign',
        name: campaignData.name,
        href: `/campaigns/${campaignData.id}/dashboard`,
        imageUrl: campaignData.image_url,
      })

      // Load all data in parallel
      const [
        charactersResult,
        sessionsResult,
        timelineResult,
        membersResult,
        tagsResult,
        loreCountResult,
        mapsCountResult,
      ] = await Promise.all([
        supabase
          .from('characters')
          .select('*')
          .eq('campaign_id', campaignId)
          .order('type', { ascending: true })
          .order('name'),
        supabase
          .from('sessions')
          .select('*')
          .eq('campaign_id', campaignId)
          .order('session_number', { ascending: false })
          .limit(10),
        supabase
          .from('timeline_events')
          .select('*')
          .eq('campaign_id', campaignId)
          .order('event_date', { ascending: false })
          .limit(10),
        supabase
          .from('campaign_members')
          .select('*')
          .eq('campaign_id', campaignId)
          .eq('status', 'active'),
        supabase
          .from('tags')
          .select('*')
          .eq('campaign_id', campaignId)
          .order('name'),
        supabase
          .from('campaign_lore')
          .select('id', { count: 'exact', head: true })
          .eq('campaign_id', campaignId),
        supabase
          .from('world_maps')
          .select('id', { count: 'exact', head: true })
          .eq('campaign_id', campaignId),
      ])

      setCharacters(charactersResult.data || [])
      setSessions(sessionsResult.data || [])
      setTimelineEvents(timelineResult.data || [])
      setMembers(membersResult.data || [])
      setTags(tagsResult.data || [])
      setLoreCount(loreCountResult.count || 0)
      setMapsCount(mapsCountResult.count || 0)

      // Load player notes
      if (sessionsResult.data && sessionsResult.data.length > 0) {
        const { data: notesData } = await supabase
          .from('player_session_notes')
          .select('*')
          .in('session_id', sessionsResult.data.map(s => s.id))
          .order('created_at', { ascending: false })
          .limit(10)
        setPlayerNotes(notesData || [])
      }

      // Load user's vault characters (for character claiming)
      const { data: vaultCharsData } = await supabase
        .from('vault_characters')
        .select('id, name, image_url')
        .eq('user_id', user.id)
        .order('name')
      setUserVaultCharacters(vaultCharsData || [])

      // Load current user's membership - check by user_id first, then by email as fallback
      const userEmail = user.email?.toLowerCase()
      let userMembership = (membersResult.data || []).find(m => m.user_id === user.id)

      // Fallback: if not found by user_id, try finding by email (handles case where user_id wasn't set)
      if (!userMembership && userEmail) {
        userMembership = (membersResult.data || []).find(
          m => m.email?.toLowerCase() === userEmail
        )
      }

      // Debug logging for character assignment issue
      console.log('[Dashboard Debug] user.id:', user.id)
      console.log('[Dashboard Debug] user.email:', user.email)
      console.log('[Dashboard Debug] membersResult.data:', membersResult.data)
      console.log('[Dashboard Debug] userMembership found:', userMembership)
      console.log('[Dashboard Debug] found by:', userMembership?.user_id === user.id ? 'user_id' : 'email')
      console.log('[Dashboard Debug] userMembership.character_id:', userMembership?.character_id)
      console.log('[Dashboard Debug] charactersResult.data:', charactersResult.data?.map(c => ({ id: c.id, name: c.name })))

      if (userMembership) {
        setMembership(userMembership)
        // Load player's character
        if (userMembership.character_id) {
          const playerChar = (charactersResult.data || []).find(
            c => c.id === userMembership.character_id
          )
          console.log('[Dashboard Debug] playerChar found:', playerChar?.name || 'NOT FOUND')
          if (playerChar) {
            setMyCharacter(playerChar)
          }
        }
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      toast.error('Failed to load dashboard')
    } finally {
      setLoading(false)
      setHasLoadedOnce(true)
    }
  }, [user, campaignId, supabase, router, trackRecentItem, hasLoadedOnce])

  useEffect(() => {
    if (user && campaignId) {
      loadDashboardData()
    }
  }, [user, campaignId, loadDashboardData])

  // Computed values
  const pcCharacters = characters.filter(c => c.type === 'pc')
  const npcCharacters = characters.filter(c => c.type === 'npc')
  const npcsMissingDetails = npcCharacters.filter(
    c => !c.description || c.description.length < 50
  ).length
  const sessionsWithoutNotes = sessions.filter(
    s => !s.notes || s.notes.length < 20
  ).length

  const latestSession = sessions[0] || null
  const memberCount = members.filter(m => m.role === 'player').length

  // Build party members for PartyOverviewWidget
  const partyMembers = pcCharacters.map(character => {
    const member = members.find(m => m.character_id === character.id)
    return {
      character,
      member,
      sessionStatus: (member as CampaignMember & { next_session_status?: 'confirmed' | 'unavailable' | 'maybe' | 'no_response' })?.next_session_status || 'no_response',
    }
  })

  // Session events for PreviouslyOn
  const latestSessionEvents = latestSession
    ? timelineEvents.filter(e => e.session_id === latestSession.id)
    : []

  // Session scheduling handlers
  const handleScheduleSession = async (data: { date: string; location: string; notes: string }) => {
    if (!campaign) return

    const { error } = await supabase
      .from('campaigns')
      .update({
        next_session_date: data.date,
        next_session_location: data.location,
        next_session_notes: data.notes,
      })
      .eq('id', campaignId)

    if (error) throw error

    // Reload campaign data
    loadDashboardData()
  }

  const handleClearSession = async () => {
    const { error } = await supabase
      .from('campaigns')
      .update({
        next_session_date: null,
        next_session_location: null,
        next_session_notes: null,
      })
      .eq('id', campaignId)

    if (error) throw error

    // Reload campaign data
    loadDashboardData()
  }

  const handleUpdateSessionStatus = async (memberId: string, status: 'confirmed' | 'unavailable' | 'maybe' | 'no_response') => {
    const { error } = await supabase
      .from('campaign_members')
      .update({ next_session_status: status })
      .eq('id', memberId)

    if (error) {
      toast.error('Failed to update status')
      return
    }

    // Reload data
    loadDashboardData()
    toast.success('Status updated')
  }

  // Schedule settings handler
  const handleSaveScheduleSettings = async (data: {
    settings: ScheduleSettings
    pattern: SchedulePattern | null
    nextDate?: string | null
    nextTime?: string | null
    nextLocation?: string | null
    nextNotes?: string | null
  }) => {
    if (!campaign) return

    const { error } = await supabase
      .from('campaigns')
      .update({
        schedule_settings: data.settings,
        schedule_pattern: data.pattern,
        next_session_date: data.nextDate,
        next_session_time: data.nextTime,
        next_session_location: data.nextLocation,
        next_session_notes: data.nextNotes,
      })
      .eq('id', campaignId)

    if (error) throw error

    // Reload campaign data
    loadDashboardData()
  }

  // Player availability handler for NextSessionWidget
  const handleUpdatePlayerAvailability = async (status: 'attending' | 'unavailable' | 'late', note?: string) => {
    if (!membership) return

    const { error } = await supabase
      .from('campaign_members')
      .update({
        next_session_status: status === 'attending' ? 'confirmed' : status === 'unavailable' ? 'unavailable' : 'maybe',
        next_session_note: note || null,
      })
      .eq('id', membership.id)

    if (error) {
      toast.error('Failed to update availability')
      return
    }

    loadDashboardData()
    toast.success('Availability updated')
  }

  // Parse schedule data from campaign
  const scheduleSettings: ScheduleSettings = (campaign?.schedule_settings as unknown as ScheduleSettings) || getDefaultScheduleSettings()
  const schedulePattern: SchedulePattern | null = (campaign?.schedule_pattern as unknown as SchedulePattern) || null
  const scheduleExceptions: ScheduleException[] = (campaign?.schedule_exceptions as unknown as ScheduleException[]) || []
  const userTimezone = getUserTimezone()

  // Build party member statuses for NextSessionWidget
  const partyMemberStatuses = pcCharacters.map(character => {
    const member = members.find(m => m.character_id === character.id)
    const memberStatus = (member as CampaignMember & { next_session_status?: string })?.next_session_status as string | undefined
    let widgetStatus: 'attending' | 'unavailable' | 'late' = 'attending'
    if (memberStatus === 'confirmed') widgetStatus = 'attending'
    else if (memberStatus === 'unavailable') widgetStatus = 'unavailable'
    else if (memberStatus === 'maybe') widgetStatus = 'late'

    return {
      id: character.id,
      characterName: character.name,
      imageUrl: character.image_url || undefined,
      status: widgetStatus,
      note: (member as CampaignMember & { next_session_note?: string })?.next_session_note || undefined,
    }
  })

  // Determine if current character is designated for the current user
  // Debug logging for character claiming flow
  if (myCharacter) {
    console.log('[Dashboard Debug] Character claiming check:')
    console.log('[Dashboard Debug] myCharacter.controlled_by_user_id:', myCharacter.controlled_by_user_id)
    console.log('[Dashboard Debug] myCharacter.controlled_by_email:', myCharacter.controlled_by_email)
    console.log('[Dashboard Debug] user.id:', user?.id)
    console.log('[Dashboard Debug] user.email:', user?.email)
  }
  // Check if character is designated for this user (by user_id, email, or Discord)
  const memberDiscordId = (membership as CampaignMember & { discord_id?: string | null })?.discord_id
  const isCharacterDesignatedForUser = myCharacter ? !!(
    myCharacter.controlled_by_user_id === user?.id ||
    (myCharacter.controlled_by_email?.toLowerCase() === user?.email?.toLowerCase()) ||
    (myCharacter.controlled_by_discord && memberDiscordId &&
      myCharacter.controlled_by_discord.toLowerCase() === memberDiscordId.toLowerCase())
  ) : false

  // Handler for when a character is claimed to vault
  const handleCharacterClaimed = (vaultCharacterId: string) => {
    // Reload data to reflect the new vault link
    loadDashboardData()
    toast.success('Character added to your vault!')
  }

  // Page actions for top bar
  const pageActions = (
    <button
      onClick={() => setIsEditMode(!isEditMode)}
      className={cn(
        "p-2 rounded-lg transition-colors",
        isEditMode
          ? "bg-purple-600 text-white"
          : "text-gray-400 hover:text-white hover:bg-white/[0.05]"
      )}
      title={isEditMode ? "Exit edit mode" : "Customize dashboard"}
    >
      {isEditMode ? <Check className="w-5 h-5" /> : <Settings2 className="w-5 h-5" />}
    </button>
  )

  // Loading state
  if (loading || permissionsLoading) {
    return (
      <AppLayout campaignId={campaignId}>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        </div>
      </AppLayout>
    )
  }

  // Permission check
  if (!isMember) {
    return (
      <AppLayout campaignId={campaignId}>
        <AccessDeniedPage
          campaignId={campaignId}
          message="You don't have permission to view this campaign."
        />
      </AppLayout>
    )
  }

  return (
    <AppLayout campaignId={campaignId} topBarActions={pageActions}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Player Dashboard Layout */}
        {isPlayerLayout ? (
          <PlayerDashboardLayout
            campaignId={campaignId}
            campaign={campaign}
            widgetOrder={preferences.playerWidgets.map(w => w.id) as Parameters<typeof reorderPlayerWidgets>[0]}
            isVisible={isPlayerWidgetVisible}
            getWidgetSize={getPlayerWidgetSize}
            myCharacter={myCharacter}
            membership={membership}
            isCharacterDesignatedForUser={isCharacterDesignatedForUser}
            userVaultCharacters={userVaultCharacters}
            latestSession={latestSession}
            latestSessionEvents={latestSessionEvents}
            partyMembers={partyMembers}
            partyMemberStatuses={partyMemberStatuses}
            sessions={sessions}
            scheduleSettings={scheduleSettings}
            schedulePattern={schedulePattern}
            scheduleExceptions={scheduleExceptions}
            userTimezone={userTimezone}
            canUseAI={canUseAI}
            can={can}
            onUpdateSessionStatus={handleUpdateSessionStatus}
            onUpdatePlayerAvailability={handleUpdatePlayerAvailability}
            onCharacterClaimed={handleCharacterClaimed}
            isEditMode={isEditMode}
            onReorderWidgets={reorderPlayerWidgets}
            onToggleWidget={togglePlayerWidget}
            onResizeWidget={setPlayerWidgetSize}
          />
        ) : (
          /* DM Dashboard Layout */
          <DmDashboardLayout
            campaignId={campaignId}
            campaign={campaign}
            widgetOrder={preferences.dmWidgets.map(w => w.id) as Parameters<typeof reorderDmWidgets>[0]}
            isVisible={isDmWidgetVisible}
            getWidgetSize={getDmWidgetSize}
            sessions={sessions}
            characters={characters}
            pcCharacters={pcCharacters}
            npcCharacters={npcCharacters}
            timelineEvents={timelineEvents}
            partyMembers={partyMembers}
            partyMemberStatuses={partyMemberStatuses}
            playerNotes={playerNotes}
            memberCount={memberCount}
            mapsCount={mapsCount}
            loreCount={loreCount}
            latestSession={latestSession}
            npcsMissingDetails={npcsMissingDetails}
            sessionsWithoutNotes={sessionsWithoutNotes}
            scheduleSettings={scheduleSettings}
            schedulePattern={schedulePattern}
            scheduleExceptions={scheduleExceptions}
            userTimezone={userTimezone}
            canUseAI={canUseAI}
            can={can}
            onOpenMembersModal={() => setShowMembersModal(true)}
            onOpenShareModal={() => setShowShareModal(true)}
            onOpenScheduleSettings={() => setShowScheduleSettings(true)}
            isEditMode={isEditMode}
            onReorderWidgets={reorderDmWidgets}
            onToggleWidget={toggleDmWidget}
            onResizeWidget={setDmWidgetSize}
          />
        )}
      </div>

      {/* Edit Mode Toolbar */}
      {isEditMode && (
        <EditModeToolbar
          hiddenWidgets={isPlayerLayout ? getHiddenPlayerWidgets() : getHiddenDmWidgets()}
          onShowWidget={isPlayerLayout ? togglePlayerWidget : toggleDmWidget}
          onReset={resetToDefaults}
          onDone={() => setIsEditMode(false)}
        />
      )}

      {/* Modals */}
      <PartyModal
        campaignId={campaignId}
        characters={characters}
        isOpen={showMembersModal}
        onClose={() => setShowMembersModal(false)}
      />

      {campaign && (
        <UnifiedShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          contentType="campaign"
          contentId={campaignId}
          contentName={campaign.name}
          contentMode="active"
        />
      )}

      <ScheduleSessionModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        campaignId={campaignId}
        initialDate={(campaign as Campaign & { next_session_date?: string })?.next_session_date}
        initialLocation={(campaign as Campaign & { next_session_location?: string })?.next_session_location}
        initialNotes={(campaign as Campaign & { next_session_notes?: string })?.next_session_notes}
        onSave={handleScheduleSession}
        onClear={handleClearSession}
      />

      <ScheduleSettingsModal
        isOpen={showScheduleSettings}
        onClose={() => setShowScheduleSettings(false)}
        campaignId={campaignId}
        userTimezone={userTimezone}
        initialSettings={scheduleSettings}
        initialPattern={schedulePattern}
        initialNextDate={(campaign as Campaign & { next_session_date?: string })?.next_session_date}
        initialNextTime={(campaign as Campaign & { next_session_time?: string })?.next_session_time}
        initialNextLocation={(campaign as Campaign & { next_session_location?: string })?.next_session_location}
        initialNextNotes={(campaign as Campaign & { next_session_notes?: string })?.next_session_notes}
        onSave={handleSaveScheduleSettings}
      />

      <CustomizeDashboardModal
        isOpen={showCustomizeModal}
        onClose={() => setShowCustomizeModal(false)}
        isDm={isDm}
        visibleWidgets={isPlayerLayout
          ? preferences.playerWidgets.map(w => w.id) as Parameters<typeof reorderPlayerWidgets>[0]
          : preferences.dmWidgets.map(w => w.id) as Parameters<typeof reorderDmWidgets>[0]
        }
        widgetOrder={isPlayerLayout
          ? preferences.playerWidgets.map(w => w.id) as Parameters<typeof reorderPlayerWidgets>[0]
          : preferences.dmWidgets.map(w => w.id) as Parameters<typeof reorderDmWidgets>[0]
        }
        onToggleWidget={isPlayerLayout ? togglePlayerWidget : toggleDmWidget}
        onReorderWidgets={isPlayerLayout
          ? (order) => reorderPlayerWidgets(order as Parameters<typeof reorderPlayerWidgets>[0])
          : (order) => reorderDmWidgets(order as Parameters<typeof reorderDmWidgets>[0])
        }
        onResetToDefaults={resetToDefaults}
      />
    </AppLayout>
  )
}

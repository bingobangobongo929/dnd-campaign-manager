'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, Settings2 } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { CampaignPageHeader } from '@/components/layout'
import { useSupabase, useUser, usePermissions, useDashboardPreferences } from '@/hooks'
import { useAppStore, useCanUseAI } from '@/store'
import {
  CampaignHeaderWidget,
  QuickActionsWidget,
  LatestSessionWidget,
  CampaignStatsWidget,
  PartyOverviewWidget,
  RecentEventsWidget,
  RecentSessionsWidget,
  RecentActivityWidget,
  DmToolboxWidget,
  IntelligenceStatusWidget,
  MyCharacterWidget,
  PreviouslyOnWidget,
  ScheduleSessionModal,
  ScheduleSettingsModal,
  NextSessionWidget,
  CustomizeDashboardModal,
} from '@/components/dashboard'
import {
  type ScheduleSettings,
  type SchedulePattern,
  type ScheduleException,
  getDefaultScheduleSettings,
} from '@/lib/schedule-utils'
import { getUserTimezone } from '@/lib/timezone-utils'
import {
  PartyModal,
  TagManager,
  FactionManager,
  RelationshipManager,
} from '@/components/campaign'
import { ResizeToolbar } from '@/components/canvas'
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
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [characters, setCharacters] = useState<Character[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])
  const [playerNotes, setPlayerNotes] = useState<PlayerSessionNote[]>([])
  const [members, setMembers] = useState<(CampaignMember & { user_settings?: { username: string | null } | null })[]>([])
  const [tags, setTags] = useState<Tag[]>([])

  // User's membership and character
  const [membership, setMembership] = useState<CampaignMember | null>(null)
  const [myCharacter, setMyCharacter] = useState<Character | null>(null)

  // Modal state
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [showLabelsModal, setShowLabelsModal] = useState(false)
  const [showFactionsModal, setShowFactionsModal] = useState(false)
  const [showRelationshipsModal, setShowRelationshipsModal] = useState(false)
  const [showResizeModal, setShowResizeModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showScheduleSettings, setShowScheduleSettings] = useState(false)
  const [showCustomizeModal, setShowCustomizeModal] = useState(false)

  const isOwner = campaign?.user_id === user?.id
  const isPlayer = membership && ['player', 'contributor'].includes(membership.role) && !isOwner

  // Dashboard widget preferences
  const {
    preferences,
    loaded: preferencesLoaded,
    toggleDmWidget,
    togglePlayerWidget,
    resetToDefaults,
    isDmWidgetVisible,
    isPlayerWidgetVisible,
  } = useDashboardPreferences(campaignId, user?.id)

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    if (!user) return
    setLoading(true)

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
          .select('*, user_settings(username)')
          .eq('campaign_id', campaignId)
          .eq('status', 'active'),
        supabase
          .from('tags')
          .select('*')
          .eq('campaign_id', campaignId)
          .order('name'),
      ])

      setCharacters(charactersResult.data || [])
      setSessions(sessionsResult.data || [])
      setTimelineEvents(timelineResult.data || [])
      setMembers(membersResult.data || [])
      setTags(tagsResult.data || [])

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

      // Load current user's membership
      const userMembership = (membersResult.data || []).find(m => m.user_id === user.id)
      if (userMembership) {
        setMembership(userMembership)
        // Load player's character
        if (userMembership.character_id) {
          const playerChar = (charactersResult.data || []).find(
            c => c.id === userMembership.character_id
          )
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
    }
  }, [user, campaignId, supabase, router, trackRecentItem])

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
    <AppLayout campaignId={campaignId} hideHeader>
      {/* Page Header with Burger Menu */}
      <CampaignPageHeader
        campaign={campaign}
        campaignId={campaignId}
        title="Dashboard"
        isOwner={isOwner}
        isDm={isDm}
        currentPage="dashboard"
        onOpenMembers={() => setShowMembersModal(true)}
        onOpenLabels={() => setShowLabelsModal(true)}
        onOpenFactions={() => setShowFactionsModal(true)}
        onOpenRelationships={() => setShowRelationshipsModal(true)}
        onOpenResize={() => setShowResizeModal(true)}
        onOpenShare={() => setShowShareModal(true)}
        actions={
          <button
            onClick={() => setShowCustomizeModal(true)}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
            title="Customize dashboard"
          >
            <Settings2 className="w-5 h-5" />
          </button>
        }
      />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Player Dashboard Layout */}
        {isPlayer ? (
          <div className="space-y-6">
            {/* My Character - Full Width (required) */}
            {isPlayerWidgetVisible('myCharacter') && (
              <MyCharacterWidget
                campaignId={campaignId}
                character={myCharacter}
                vaultCharacterId={membership?.vault_character_id}
              />
            )}

            {/* Next Session */}
            {isPlayerWidgetVisible('nextSession') && (() => {
              const myStatus = (membership as CampaignMember & { next_session_status?: string })?.next_session_status as string | undefined
              let currentStatus: 'attending' | 'unavailable' | 'late' = 'attending'
              if (myStatus === 'confirmed') currentStatus = 'attending'
              else if (myStatus === 'unavailable') currentStatus = 'unavailable'
              else if (myStatus === 'maybe') currentStatus = 'late'

              return (
                <NextSessionWidget
                  scheduleSettings={scheduleSettings}
                  schedulePattern={schedulePattern}
                  scheduleExceptions={scheduleExceptions}
                  nextSessionDate={(campaign as Campaign & { next_session_date?: string })?.next_session_date}
                  nextSessionTime={(campaign as Campaign & { next_session_time?: string })?.next_session_time}
                  nextSessionLocation={(campaign as Campaign & { next_session_location?: string })?.next_session_location}
                  partyMembers={partyMemberStatuses}
                  userTimezone={userTimezone}
                  isDm={false}
                  currentUserStatus={currentStatus}
                  currentUserNote={(membership as CampaignMember & { next_session_note?: string })?.next_session_note || undefined}
                  onUpdateStatus={handleUpdatePlayerAvailability}
                />
              )
            })()}

            {/* Previously On */}
            {isPlayerWidgetVisible('previouslyOn') && latestSession && (
              <PreviouslyOnWidget
                campaignId={campaignId}
                campaignName={campaign?.name || 'Campaign'}
                session={latestSession}
                sessionEvents={latestSessionEvents}
              />
            )}

            {/* Party with Attendance */}
            {isPlayerWidgetVisible('partyOverview') && (
              <PartyOverviewWidget
                campaignId={campaignId}
                partyMembers={partyMembers}
                campaign={campaign}
                currentUserMemberId={membership?.id}
                isDm={false}
                onUpdateStatus={handleUpdateSessionStatus}
              />
            )}

            {/* Quick Actions + Recent Sessions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {isPlayerWidgetVisible('quickActions') && (
                <QuickActionsWidget
                  campaignId={campaignId}
                  isDm={false}
                  canUseAI={canUseAI}
                  can={can}
                />
              )}
              {isPlayerWidgetVisible('recentSessions') && can.viewSessions && (
                <RecentSessionsWidget
                  campaignId={campaignId}
                  sessions={sessions}
                  isDm={false}
                />
              )}
            </div>
          </div>
        ) : (
          /* DM Dashboard Layout */
          <div className="space-y-6">
            {/* Campaign Header (required) */}
            {isDmWidgetVisible('campaignHeader') && (
              <CampaignHeaderWidget
                campaign={campaign!}
                sessionCount={sessions.length}
                memberCount={memberCount}
                isDm={true}
                onShare={() => setShowShareModal(true)}
              />
            )}

            {/* Row 1: Quick Actions, Latest Session, Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {isDmWidgetVisible('quickActions') && (
                <QuickActionsWidget
                  campaignId={campaignId}
                  isDm={true}
                  canUseAI={canUseAI}
                  can={can}
                  onOpenMembers={() => setShowMembersModal(true)}
                  onOpenShare={() => setShowShareModal(true)}
                  onOpenSchedule={() => setShowScheduleSettings(true)}
                />
              )}
              {isDmWidgetVisible('latestSession') && can.viewSessions && (
                <LatestSessionWidget
                  campaignId={campaignId}
                  session={latestSession}
                  campaign={campaign}
                  isDm={true}
                />
              )}
              {isDmWidgetVisible('campaignStats') && (
                <CampaignStatsWidget
                  campaignId={campaignId}
                  stats={{
                    partyCount: pcCharacters.length,
                    totalCharacters: characters.length,
                    sessionCount: sessions.length,
                    timelineEventCount: timelineEvents.length,
                    locationCount: 0, // TODO: Add location count
                    loreEntryCount: 0, // TODO: Add lore count
                  }}
                  health={{
                    npcsMissingDetails,
                    sessionsWithoutNotes,
                  }}
                  isDm={true}
                />
              )}
            </div>

            {/* Row 1.5: Next Session (DM) */}
            {isDmWidgetVisible('nextSession') && (
              <NextSessionWidget
                scheduleSettings={scheduleSettings}
                schedulePattern={schedulePattern}
                scheduleExceptions={scheduleExceptions}
                nextSessionDate={(campaign as Campaign & { next_session_date?: string })?.next_session_date}
                nextSessionTime={(campaign as Campaign & { next_session_time?: string })?.next_session_time}
                nextSessionLocation={(campaign as Campaign & { next_session_location?: string })?.next_session_location}
                partyMembers={partyMemberStatuses}
                userTimezone={userTimezone}
                isDm={true}
                onEditSchedule={() => setShowScheduleSettings(true)}
              />
            )}

            {/* Row 2: Party Overview */}
            {isDmWidgetVisible('partyOverview') && (
              <PartyOverviewWidget
                campaignId={campaignId}
                partyMembers={partyMembers}
                campaign={campaign}
                isDm={true}
                onSendReminder={() => toast.info('Reminder feature coming soon!')}
              />
            )}

            {/* Row 3: Recent Events + Recent Sessions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {isDmWidgetVisible('recentEvents') && can.viewTimeline && (
                <RecentEventsWidget
                  campaignId={campaignId}
                  events={timelineEvents}
                  isDm={true}
                />
              )}
              {isDmWidgetVisible('recentSessions') && can.viewSessions && (
                <RecentSessionsWidget
                  campaignId={campaignId}
                  sessions={sessions}
                  isDm={true}
                  className="lg:col-span-2"
                />
              )}
            </div>

            {/* Row 4: Intelligence Status + DM Toolbox */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {isDmWidgetVisible('intelligenceStatus') && canUseAI && (
                <IntelligenceStatusWidget
                  campaignId={campaignId}
                  lastRunAt={campaign?.last_intelligence_run || null}
                />
              )}
              {isDmWidgetVisible('dmToolbox') && (
                <DmToolboxWidget
                  campaignId={campaignId}
                  campaign={campaign}
                  pendingPlayerNotes={playerNotes.length}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <PartyModal
        campaignId={campaignId}
        characters={characters}
        isOpen={showMembersModal}
        onClose={() => setShowMembersModal(false)}
      />

      {showLabelsModal && (
        <TagManager
          campaignId={campaignId}
          isOpen={showLabelsModal}
          onClose={() => setShowLabelsModal(false)}
        />
      )}

      {showFactionsModal && (
        <FactionManager
          campaignId={campaignId}
          characters={characters}
          isOpen={showFactionsModal}
          onClose={() => setShowFactionsModal(false)}
        />
      )}

      {showRelationshipsModal && (
        <RelationshipManager
          campaignId={campaignId}
          isOpen={showRelationshipsModal}
          onClose={() => setShowRelationshipsModal(false)}
        />
      )}

      {showResizeModal && (
        <ResizeToolbar
          onClose={() => setShowResizeModal(false)}
          characters={characters}
          onResize={async () => {}}
        />
      )}

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
        isDm={!isPlayer}
        visibleWidgets={isPlayer ? preferences.playerWidgets : preferences.dmWidgets}
        onToggleWidget={isPlayer ? togglePlayerWidget : toggleDmWidget}
        onResetToDefaults={resetToDefaults}
      />
    </AppLayout>
  )
}

'use client'

import { ReactNode } from 'react'
import type { Campaign, Character, Session, TimelineEvent, PlayerSessionNote, CampaignMember, VaultCharacter } from '@/types/database'
import type { DmWidgetId, PlayerWidgetId } from '@/hooks/useDashboardPreferences'
import type { PermissionCan } from '@/hooks/usePermissions'
import type { ScheduleSettings, SchedulePattern, ScheduleException } from '@/lib/schedule-utils'
import {
  CampaignHeaderWidget,
  QuickActionsWidget,
  LatestSessionWidget,
  CampaignStatsWidget,
  PartyOverviewWidget,
  RecentEventsWidget,
  UpcomingPlotWidget,
  RecentSessionsWidget,
  DmToolboxWidget,
  IntelligenceStatusWidget,
  PlayerNotesReviewWidget,
  MyCharacterWidget,
  PreviouslyOnWidget,
  NextSessionWidget,
} from '@/components/dashboard'

interface PartyMember {
  character: Character
  member?: CampaignMember
  sessionStatus: 'confirmed' | 'unavailable' | 'maybe' | 'no_response'
}

interface PartyMemberStatus {
  id: string
  characterName: string
  imageUrl?: string
  status: 'attending' | 'unavailable' | 'late'
  note?: string
}

// Widget size hints for layout decisions
const WIDGET_SIZES: { [key: string]: 'full' | 'half' | 'third' } = {
  // DM widgets
  campaignHeader: 'full',
  quickActions: 'third',
  latestSession: 'third',
  campaignStats: 'third',
  nextSession: 'full',
  partyOverview: 'full',
  recentEvents: 'third',
  upcomingPlot: 'third',
  recentSessions: 'full',
  intelligenceStatus: 'half',
  playerNotesReview: 'half',
  dmToolbox: 'half',
  // Player widgets
  myCharacter: 'full',
  previouslyOn: 'full',
}

interface DmDashboardLayoutProps {
  campaignId: string
  campaign: Campaign | null
  widgetOrder: readonly DmWidgetId[]
  isVisible: (widgetId: DmWidgetId) => boolean
  sessions: Session[]
  characters: Character[]
  pcCharacters: Character[]
  npcCharacters: Character[]
  timelineEvents: TimelineEvent[]
  partyMembers: PartyMember[]
  partyMemberStatuses: PartyMemberStatus[]
  playerNotes: PlayerSessionNote[]
  memberCount: number
  mapsCount: number
  loreCount: number
  latestSession: Session | null
  npcsMissingDetails: number
  sessionsWithoutNotes: number
  scheduleSettings: ScheduleSettings
  schedulePattern: SchedulePattern | null
  scheduleExceptions: ScheduleException[]
  userTimezone: string
  canUseAI: boolean
  can: PermissionCan
  onOpenMembersModal: () => void
  onOpenShareModal: () => void
  onOpenScheduleSettings: () => void
}

export function DmDashboardLayout({
  campaignId,
  campaign,
  widgetOrder,
  isVisible,
  sessions,
  characters,
  pcCharacters,
  timelineEvents,
  partyMembers,
  partyMemberStatuses,
  playerNotes,
  memberCount,
  mapsCount,
  loreCount,
  latestSession,
  npcsMissingDetails,
  sessionsWithoutNotes,
  scheduleSettings,
  schedulePattern,
  scheduleExceptions,
  userTimezone,
  canUseAI,
  can,
  onOpenMembersModal,
  onOpenShareModal,
  onOpenScheduleSettings,
}: DmDashboardLayoutProps) {
  // Build widget map
  const widgetMap: { [key in DmWidgetId]?: ReactNode } = {
    campaignHeader: campaign && (
      <CampaignHeaderWidget
        campaign={campaign}
        sessionCount={sessions.length}
        memberCount={memberCount}
        isDm={true}
        onShare={onOpenShareModal}
      />
    ),
    quickActions: (
      <QuickActionsWidget
        campaignId={campaignId}
        isDm={true}
        canUseAI={canUseAI}
        can={can}
        onOpenMembers={onOpenMembersModal}
        onOpenShare={onOpenShareModal}
        onOpenSchedule={onOpenScheduleSettings}
      />
    ),
    latestSession: can.viewSessions && (
      <LatestSessionWidget
        campaignId={campaignId}
        session={latestSession}
        campaign={campaign}
        isDm={true}
      />
    ),
    campaignStats: (
      <CampaignStatsWidget
        campaignId={campaignId}
        stats={{
          partyCount: pcCharacters.length,
          totalCharacters: characters.length,
          sessionCount: sessions.length,
          timelineEventCount: timelineEvents.length,
          locationCount: mapsCount,
          loreEntryCount: loreCount,
        }}
        health={{
          npcsMissingDetails,
          sessionsWithoutNotes,
        }}
        isDm={true}
      />
    ),
    nextSession: (
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
        onEditSchedule={onOpenScheduleSettings}
      />
    ),
    partyOverview: (
      <PartyOverviewWidget
        campaignId={campaignId}
        partyMembers={partyMembers}
        campaign={campaign}
        isDm={true}
      />
    ),
    recentEvents: can.viewTimeline && (
      <RecentEventsWidget
        campaignId={campaignId}
        events={timelineEvents}
        isDm={true}
      />
    ),
    upcomingPlot: can.viewFutureTimeline && (
      <UpcomingPlotWidget
        campaignId={campaignId}
        events={timelineEvents}
      />
    ),
    recentSessions: can.viewSessions && (
      <RecentSessionsWidget
        campaignId={campaignId}
        sessions={sessions}
        isDm={true}
      />
    ),
    intelligenceStatus: canUseAI && (
      <IntelligenceStatusWidget
        campaignId={campaignId}
        lastRunAt={campaign?.last_intelligence_run || null}
      />
    ),
    playerNotesReview: (
      <PlayerNotesReviewWidget
        campaignId={campaignId}
      />
    ),
    dmToolbox: (
      <DmToolboxWidget
        campaignId={campaignId}
        campaign={campaign}
        pendingPlayerNotes={playerNotes.length}
      />
    ),
  }

  // Render widgets in order, grouping by size for layout
  const visibleWidgets = widgetOrder.filter(id => isVisible(id) && widgetMap[id])
  const renderedWidgets: ReactNode[] = []
  let currentRow: { id: DmWidgetId; size: 'full' | 'half' | 'third' }[] = []

  const flushRow = () => {
    if (currentRow.length === 0) return

    // Determine grid columns based on row contents
    const allThirds = currentRow.every(w => w.size === 'third')
    const allHalves = currentRow.every(w => w.size === 'half')
    const mixed = !allThirds && !allHalves

    if (currentRow.length === 1 || (currentRow.length > 1 && mixed)) {
      // Render each widget full width
      currentRow.forEach(w => {
        renderedWidgets.push(
          <div key={w.id}>{widgetMap[w.id]}</div>
        )
      })
    } else if (allThirds) {
      // Render in 3-column grid
      renderedWidgets.push(
        <div key={`row-${renderedWidgets.length}`} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentRow.map(w => (
            <div key={w.id}>{widgetMap[w.id]}</div>
          ))}
        </div>
      )
    } else if (allHalves) {
      // Render in 2-column grid
      renderedWidgets.push(
        <div key={`row-${renderedWidgets.length}`} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {currentRow.map(w => (
            <div key={w.id}>{widgetMap[w.id]}</div>
          ))}
        </div>
      )
    }

    currentRow = []
  }

  visibleWidgets.forEach((widgetId, index) => {
    const size = WIDGET_SIZES[widgetId] || 'full'

    if (size === 'full') {
      // Flush any pending row, then render this widget
      flushRow()
      renderedWidgets.push(
        <div key={widgetId}>{widgetMap[widgetId]}</div>
      )
    } else {
      // Add to current row
      currentRow.push({ id: widgetId, size })

      // If we have enough widgets or it's the last one, consider flushing
      const maxInRow = size === 'third' ? 3 : 2
      if (currentRow.length >= maxInRow) {
        flushRow()
      } else {
        // Check if next widget has different size
        const nextWidget = visibleWidgets[index + 1]
        if (nextWidget) {
          const nextSize = WIDGET_SIZES[nextWidget] || 'full'
          if (nextSize !== size) {
            flushRow()
          }
        } else {
          flushRow()
        }
      }
    }
  })

  // Flush any remaining
  flushRow()

  return <div className="space-y-6">{renderedWidgets}</div>
}

interface PlayerDashboardLayoutProps {
  campaignId: string
  campaign: Campaign | null
  widgetOrder: readonly PlayerWidgetId[]
  isVisible: (widgetId: PlayerWidgetId) => boolean
  myCharacter: Character | null
  membership: CampaignMember | null
  isCharacterDesignatedForUser: boolean
  userVaultCharacters: Pick<VaultCharacter, 'id' | 'name' | 'image_url'>[]
  latestSession: Session | null
  latestSessionEvents: TimelineEvent[]
  partyMembers: PartyMember[]
  partyMemberStatuses: PartyMemberStatus[]
  sessions: Session[]
  scheduleSettings: ScheduleSettings
  schedulePattern: SchedulePattern | null
  scheduleExceptions: ScheduleException[]
  userTimezone: string
  canUseAI: boolean
  can: PermissionCan
  onUpdateSessionStatus: (memberId: string, status: 'confirmed' | 'unavailable' | 'maybe' | 'no_response') => Promise<void>
  onUpdatePlayerAvailability: (status: 'attending' | 'unavailable' | 'late', note?: string) => Promise<void>
  onCharacterClaimed?: (vaultCharacterId: string) => void
}

export function PlayerDashboardLayout({
  campaignId,
  campaign,
  widgetOrder,
  isVisible,
  myCharacter,
  membership,
  isCharacterDesignatedForUser,
  userVaultCharacters,
  latestSession,
  latestSessionEvents,
  partyMembers,
  partyMemberStatuses,
  sessions,
  scheduleSettings,
  schedulePattern,
  scheduleExceptions,
  userTimezone,
  canUseAI,
  can,
  onUpdateSessionStatus,
  onUpdatePlayerAvailability,
  onCharacterClaimed,
}: PlayerDashboardLayoutProps) {
  // Compute player status
  const myStatus = (membership as CampaignMember & { next_session_status?: string })?.next_session_status as string | undefined
  let currentStatus: 'attending' | 'unavailable' | 'late' = 'attending'
  if (myStatus === 'confirmed') currentStatus = 'attending'
  else if (myStatus === 'unavailable') currentStatus = 'unavailable'
  else if (myStatus === 'maybe') currentStatus = 'late'

  // Build widget map
  const widgetMap: { [key in PlayerWidgetId]?: ReactNode } = {
    myCharacter: (
      <MyCharacterWidget
        campaignId={campaignId}
        character={myCharacter}
        vaultCharacterId={membership?.vault_character_id}
        isDesignatedForUser={isCharacterDesignatedForUser}
        userVaultCharacters={userVaultCharacters}
        onCharacterClaimed={onCharacterClaimed}
      />
    ),
    nextSession: (
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
        onUpdateStatus={onUpdatePlayerAvailability}
      />
    ),
    previouslyOn: latestSession && (
      <PreviouslyOnWidget
        campaignId={campaignId}
        campaignName={campaign?.name || 'Campaign'}
        session={latestSession}
        sessionEvents={latestSessionEvents}
      />
    ),
    partyOverview: (
      <PartyOverviewWidget
        campaignId={campaignId}
        partyMembers={partyMembers}
        campaign={campaign}
        currentUserMemberId={membership?.id}
        isDm={false}
        onUpdateStatus={onUpdateSessionStatus}
      />
    ),
    quickActions: (
      <QuickActionsWidget
        campaignId={campaignId}
        isDm={false}
        canUseAI={canUseAI}
        can={can}
      />
    ),
    recentSessions: can.viewSessions && (
      <RecentSessionsWidget
        campaignId={campaignId}
        sessions={sessions}
        isDm={false}
      />
    ),
  }

  // Render widgets in order, grouping halves together
  const visibleWidgets = widgetOrder.filter(id => isVisible(id) && widgetMap[id])
  const renderedWidgets: ReactNode[] = []
  let currentHalfRow: PlayerWidgetId[] = []

  const flushHalfRow = () => {
    if (currentHalfRow.length === 0) return

    if (currentHalfRow.length === 1) {
      renderedWidgets.push(
        <div key={currentHalfRow[0]}>{widgetMap[currentHalfRow[0]]}</div>
      )
    } else {
      renderedWidgets.push(
        <div key={`row-${renderedWidgets.length}`} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {currentHalfRow.map(id => (
            <div key={id}>{widgetMap[id]}</div>
          ))}
        </div>
      )
    }
    currentHalfRow = []
  }

  visibleWidgets.forEach((widgetId, index) => {
    const size = WIDGET_SIZES[widgetId] || 'half'

    if (size === 'full') {
      flushHalfRow()
      renderedWidgets.push(
        <div key={widgetId}>{widgetMap[widgetId]}</div>
      )
    } else {
      currentHalfRow.push(widgetId)
      if (currentHalfRow.length >= 2) {
        flushHalfRow()
      } else {
        const nextWidget = visibleWidgets[index + 1]
        if (nextWidget) {
          const nextSize = WIDGET_SIZES[nextWidget] || 'half'
          if (nextSize === 'full') {
            flushHalfRow()
          }
        } else {
          flushHalfRow()
        }
      }
    }
  })

  flushHalfRow()

  return <div className="space-y-6">{renderedWidgets}</div>
}

'use client'

import { ReactNode } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { GripVertical, Eye, EyeOff, Lock } from 'lucide-react'
import type { Campaign, Character, Session, TimelineEvent, PlayerSessionNote, CampaignMember, VaultCharacter } from '@/types/database'
import type { DmWidgetId, PlayerWidgetId } from '@/hooks/useDashboardPreferences'
import { DM_WIDGETS, PLAYER_WIDGETS } from '@/hooks/useDashboardPreferences'
import type { PermissionCan } from '@/hooks/usePermissions'
import type { ScheduleSettings, SchedulePattern, ScheduleException } from '@/lib/schedule-utils'
import { cn } from '@/lib/utils'
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
export const WIDGET_SIZES: { [key: string]: 'full' | 'half' | 'third' } = {
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

// Edit mode overlay for widgets
function WidgetEditOverlay({
  widgetId,
  isRequired,
  isVisible,
  onToggleVisibility,
  isDragging,
}: {
  widgetId: string
  isRequired: boolean
  isVisible: boolean
  onToggleVisibility?: () => void
  isDragging: boolean
}) {
  const widgetDef = [...DM_WIDGETS, ...PLAYER_WIDGETS].find(w => w.id === widgetId)
  const label = widgetDef?.label || widgetId

  return (
    <div
      className={cn(
        "absolute inset-0 z-10 pointer-events-none rounded-xl transition-all",
        "border-2 border-dashed",
        isDragging ? "border-purple-400 bg-purple-500/10" : "border-purple-500/50"
      )}
    >
      {/* Drag handle and widget info */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-2 pointer-events-auto">
        <div className="flex items-center gap-2">
          {!isRequired && (
            <div className="p-1.5 rounded-lg bg-black/80 text-white cursor-grab active:cursor-grabbing">
              <GripVertical className="w-4 h-4" />
            </div>
          )}
          {isRequired && (
            <div className="p-1.5 rounded-lg bg-black/80 text-amber-400" title="Required widget">
              <Lock className="w-4 h-4" />
            </div>
          )}
          <span className="px-2 py-1 text-xs font-medium text-white bg-black/80 rounded-lg">
            {label}
          </span>
        </div>

        {/* Visibility toggle */}
        {!isRequired && onToggleVisibility && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleVisibility()
            }}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              isVisible
                ? "bg-black/80 text-white hover:bg-red-600/80"
                : "bg-red-600/80 text-white"
            )}
            title={isVisible ? "Hide widget" : "Show widget"}
          >
            {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  )
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
  // Edit mode props
  isEditMode?: boolean
  onReorderWidgets?: (newOrder: DmWidgetId[]) => void
  onToggleWidget?: (widgetId: DmWidgetId) => void
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
  isEditMode = false,
  onReorderWidgets,
  onToggleWidget,
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

  // Handle drag end
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !onReorderWidgets) return

    const items = Array.from(widgetOrder.filter(id => isVisible(id) && widgetMap[id]))
    const [reordered] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reordered)

    // Preserve hidden widgets in their relative positions
    const hiddenWidgets = widgetOrder.filter(id => !isVisible(id) || !widgetMap[id])
    onReorderWidgets([...items, ...hiddenWidgets] as DmWidgetId[])
  }

  // Get visible widgets
  const visibleWidgets = widgetOrder.filter(id => isVisible(id) && widgetMap[id])

  // Non-edit mode: use the original row-grouping layout
  if (!isEditMode) {
    const renderedWidgets: ReactNode[] = []
    let currentRow: { id: DmWidgetId; size: 'full' | 'half' | 'third' }[] = []

    const flushRow = () => {
      if (currentRow.length === 0) return

      const allThirds = currentRow.every(w => w.size === 'third')
      const allHalves = currentRow.every(w => w.size === 'half')
      const mixed = !allThirds && !allHalves

      if (currentRow.length === 1 || (currentRow.length > 1 && mixed)) {
        currentRow.forEach(w => {
          renderedWidgets.push(
            <div key={w.id}>{widgetMap[w.id]}</div>
          )
        })
      } else if (allThirds) {
        renderedWidgets.push(
          <div key={`row-${renderedWidgets.length}`} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentRow.map(w => (
              <div key={w.id}>{widgetMap[w.id]}</div>
            ))}
          </div>
        )
      } else if (allHalves) {
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
        flushRow()
        renderedWidgets.push(
          <div key={widgetId}>{widgetMap[widgetId]}</div>
        )
      } else {
        currentRow.push({ id: widgetId, size })

        const maxInRow = size === 'third' ? 3 : 2
        if (currentRow.length >= maxInRow) {
          flushRow()
        } else {
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

    flushRow()

    return <div className="space-y-6">{renderedWidgets}</div>
  }

  // Edit mode: use drag-and-drop with flat list for simpler reordering
  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="dm-dashboard-widgets">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "space-y-4 transition-colors rounded-xl p-2 -m-2",
              snapshot.isDraggingOver && "bg-purple-500/5"
            )}
          >
            {visibleWidgets.map((widgetId, index) => {
              const widgetDef = DM_WIDGETS.find(w => w.id === widgetId)
              const isRequired = widgetDef?.required || false

              return (
                <Draggable
                  key={widgetId}
                  draggableId={widgetId}
                  index={index}
                  isDragDisabled={isRequired}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={cn(
                        "relative transition-transform",
                        snapshot.isDragging && "rotate-1 scale-[1.02] z-50"
                      )}
                      style={{
                        ...provided.draggableProps.style,
                        opacity: snapshot.isDragging ? 0.9 : 1,
                      }}
                    >
                      <WidgetEditOverlay
                        widgetId={widgetId}
                        isRequired={isRequired}
                        isVisible={true}
                        onToggleVisibility={onToggleWidget ? () => onToggleWidget(widgetId) : undefined}
                        isDragging={snapshot.isDragging}
                      />
                      {widgetMap[widgetId]}
                    </div>
                  )}
                </Draggable>
              )
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  )
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
  // Edit mode props
  isEditMode?: boolean
  onReorderWidgets?: (newOrder: PlayerWidgetId[]) => void
  onToggleWidget?: (widgetId: PlayerWidgetId) => void
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
  isEditMode = false,
  onReorderWidgets,
  onToggleWidget,
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

  // Handle drag end
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !onReorderWidgets) return

    const items = Array.from(widgetOrder.filter(id => isVisible(id) && widgetMap[id]))
    const [reordered] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reordered)

    // Preserve hidden widgets
    const hiddenWidgets = widgetOrder.filter(id => !isVisible(id) || !widgetMap[id])
    onReorderWidgets([...items, ...hiddenWidgets] as PlayerWidgetId[])
  }

  // Get visible widgets
  const visibleWidgets = widgetOrder.filter(id => isVisible(id) && widgetMap[id])

  // Non-edit mode: use the original row-grouping layout
  if (!isEditMode) {
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

  // Edit mode: use drag-and-drop with flat list
  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="player-dashboard-widgets">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "space-y-4 transition-colors rounded-xl p-2 -m-2",
              snapshot.isDraggingOver && "bg-purple-500/5"
            )}
          >
            {visibleWidgets.map((widgetId, index) => {
              const widgetDef = PLAYER_WIDGETS.find(w => w.id === widgetId)
              const isRequired = widgetDef?.required || false

              return (
                <Draggable
                  key={widgetId}
                  draggableId={widgetId}
                  index={index}
                  isDragDisabled={isRequired}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={cn(
                        "relative transition-transform",
                        snapshot.isDragging && "rotate-1 scale-[1.02] z-50"
                      )}
                      style={{
                        ...provided.draggableProps.style,
                        opacity: snapshot.isDragging ? 0.9 : 1,
                      }}
                    >
                      <WidgetEditOverlay
                        widgetId={widgetId}
                        isRequired={isRequired}
                        isVisible={true}
                        onToggleVisibility={onToggleWidget ? () => onToggleWidget(widgetId) : undefined}
                        isDragging={snapshot.isDragging}
                      />
                      {widgetMap[widgetId]}
                    </div>
                  )}
                </Draggable>
              )
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  )
}

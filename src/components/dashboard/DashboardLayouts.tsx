'use client'

import { ReactNode } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { GripVertical, Eye, EyeOff, Lock } from 'lucide-react'
import type { Campaign, Character, Session, TimelineEvent, PlayerSessionNote, CampaignMember, VaultCharacter } from '@/types/database'
import type { DmWidgetId, PlayerWidgetId, WidgetSize } from '@/hooks/useDashboardPreferences'
import { DM_WIDGETS, PLAYER_WIDGETS, WIDGET_SIZE_OPTIONS } from '@/hooks/useDashboardPreferences'
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

// Size to column span mapping for 6-column grid
const SIZE_TO_SPAN: Record<WidgetSize, number> = {
  'third': 2,  // 2 of 6 columns = 33%
  'half': 3,   // 3 of 6 columns = 50%
  'full': 6,   // 6 of 6 columns = 100%
}

// Size to medium breakpoint span (4-column grid)
const SIZE_TO_MD_SPAN: Record<WidgetSize, number> = {
  'third': 2,  // 2 of 4 columns = 50%
  'half': 2,   // 2 of 4 columns = 50%
  'full': 4,   // 4 of 4 columns = 100%
}

// Edit mode overlay for widgets
function WidgetEditOverlay({
  widgetId,
  isRequired,
  currentSize,
  allowedSizes,
  onToggleVisibility,
  onResize,
  isDragging,
}: {
  widgetId: string
  isRequired: boolean
  currentSize: WidgetSize
  allowedSizes: WidgetSize[]
  onToggleVisibility?: () => void
  onResize?: (size: WidgetSize) => void
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
      {/* Top bar with drag handle, label, and controls */}
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

        <div className="flex items-center gap-2">
          {/* Size selector - only show if multiple sizes allowed */}
          {allowedSizes.length > 1 && onResize && (
            <div className="flex gap-0.5 p-0.5 bg-black/80 rounded-lg">
              {allowedSizes.map(size => (
                <button
                  key={size}
                  onClick={(e) => {
                    e.stopPropagation()
                    onResize(size)
                  }}
                  className={cn(
                    "px-2 py-1 text-xs font-medium rounded transition-colors",
                    currentSize === size
                      ? "bg-purple-600 text-white"
                      : "text-gray-400 hover:text-white hover:bg-white/10"
                  )}
                  title={size === 'third' ? 'Small (1/3)' : size === 'half' ? 'Medium (1/2)' : 'Large (Full)'}
                >
                  {size === 'third' ? 'S' : size === 'half' ? 'M' : 'L'}
                </button>
              ))}
            </div>
          )}

          {/* Visibility toggle */}
          {!isRequired && onToggleVisibility && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleVisibility()
              }}
              className="p-1.5 rounded-lg bg-black/80 text-white hover:bg-red-600/80 transition-colors"
              title="Hide widget"
            >
              <EyeOff className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

interface DmDashboardLayoutProps {
  campaignId: string
  campaign: Campaign | null
  widgetOrder: readonly DmWidgetId[]
  isVisible: (widgetId: DmWidgetId) => boolean
  getWidgetSize: (widgetId: DmWidgetId) => WidgetSize
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
  onResizeWidget?: (widgetId: DmWidgetId, size: WidgetSize) => void
}

export function DmDashboardLayout({
  campaignId,
  campaign,
  widgetOrder,
  isVisible,
  getWidgetSize,
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
  onResizeWidget,
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

  // Render widget with grid span
  const renderWidget = (widgetId: DmWidgetId, index?: number) => {
    const size = getWidgetSize(widgetId)
    const span = SIZE_TO_SPAN[size]
    const mdSpan = SIZE_TO_MD_SPAN[size]

    return (
      <div
        key={widgetId}
        className="col-span-full"
        style={{
          gridColumn: `span ${span}`,
        }}
        // Use responsive classes via data attribute for CSS
        data-size={size}
      >
        {widgetMap[widgetId]}
      </div>
    )
  }

  // Non-edit mode: CSS grid layout
  if (!isEditMode) {
    return (
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: 'repeat(6, 1fr)',
        }}
      >
        <style jsx>{`
          @media (max-width: 1023px) {
            div {
              grid-template-columns: repeat(4, 1fr) !important;
            }
            div > [data-size="third"] {
              grid-column: span 2 !important;
            }
            div > [data-size="half"] {
              grid-column: span 2 !important;
            }
            div > [data-size="full"] {
              grid-column: span 4 !important;
            }
          }
          @media (max-width: 767px) {
            div {
              grid-template-columns: 1fr !important;
            }
            div > [data-size] {
              grid-column: span 1 !important;
            }
          }
        `}</style>
        {visibleWidgets.map(widgetId => renderWidget(widgetId))}
      </div>
    )
  }

  // Edit mode: drag-and-drop with CSS grid
  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="dm-dashboard-widgets">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "grid gap-4 transition-colors rounded-xl p-2 -m-2",
              snapshot.isDraggingOver && "bg-purple-500/5"
            )}
            style={{
              gridTemplateColumns: 'repeat(6, 1fr)',
            }}
          >
            <style jsx>{`
              @media (max-width: 1023px) {
                div {
                  grid-template-columns: repeat(4, 1fr) !important;
                }
              }
              @media (max-width: 767px) {
                div {
                  grid-template-columns: 1fr !important;
                }
              }
            `}</style>
            {visibleWidgets.map((widgetId, index) => {
              const widgetDef = DM_WIDGETS.find(w => w.id === widgetId)
              const isRequired = widgetDef?.required || false
              const size = getWidgetSize(widgetId)
              const span = SIZE_TO_SPAN[size]
              const allowedSizes = WIDGET_SIZE_OPTIONS[widgetId] || ['full']

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
                        "relative transition-transform col-span-full",
                        snapshot.isDragging && "rotate-1 scale-[1.02] z-50"
                      )}
                      style={{
                        ...provided.draggableProps.style,
                        opacity: snapshot.isDragging ? 0.9 : 1,
                        gridColumn: snapshot.isDragging ? 'span 6' : `span ${span}`,
                      }}
                      data-size={size}
                    >
                      <WidgetEditOverlay
                        widgetId={widgetId}
                        isRequired={isRequired}
                        currentSize={size}
                        allowedSizes={allowedSizes}
                        onToggleVisibility={onToggleWidget ? () => onToggleWidget(widgetId) : undefined}
                        onResize={onResizeWidget ? (newSize) => onResizeWidget(widgetId, newSize) : undefined}
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
  getWidgetSize: (widgetId: PlayerWidgetId) => WidgetSize
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
  onResizeWidget?: (widgetId: PlayerWidgetId, size: WidgetSize) => void
}

export function PlayerDashboardLayout({
  campaignId,
  campaign,
  widgetOrder,
  isVisible,
  getWidgetSize,
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
  onResizeWidget,
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

  // Render widget with grid span
  const renderWidget = (widgetId: PlayerWidgetId) => {
    const size = getWidgetSize(widgetId)
    const span = SIZE_TO_SPAN[size]

    return (
      <div
        key={widgetId}
        className="col-span-full"
        style={{
          gridColumn: `span ${span}`,
        }}
        data-size={size}
      >
        {widgetMap[widgetId]}
      </div>
    )
  }

  // Non-edit mode: CSS grid layout
  if (!isEditMode) {
    return (
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: 'repeat(6, 1fr)',
        }}
      >
        <style jsx>{`
          @media (max-width: 1023px) {
            div {
              grid-template-columns: repeat(4, 1fr) !important;
            }
            div > [data-size="third"] {
              grid-column: span 2 !important;
            }
            div > [data-size="half"] {
              grid-column: span 2 !important;
            }
            div > [data-size="full"] {
              grid-column: span 4 !important;
            }
          }
          @media (max-width: 767px) {
            div {
              grid-template-columns: 1fr !important;
            }
            div > [data-size] {
              grid-column: span 1 !important;
            }
          }
        `}</style>
        {visibleWidgets.map(widgetId => renderWidget(widgetId))}
      </div>
    )
  }

  // Edit mode: drag-and-drop with CSS grid
  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="player-dashboard-widgets">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "grid gap-4 transition-colors rounded-xl p-2 -m-2",
              snapshot.isDraggingOver && "bg-purple-500/5"
            )}
            style={{
              gridTemplateColumns: 'repeat(6, 1fr)',
            }}
          >
            <style jsx>{`
              @media (max-width: 1023px) {
                div {
                  grid-template-columns: repeat(4, 1fr) !important;
                }
              }
              @media (max-width: 767px) {
                div {
                  grid-template-columns: 1fr !important;
                }
              }
            `}</style>
            {visibleWidgets.map((widgetId, index) => {
              const widgetDef = PLAYER_WIDGETS.find(w => w.id === widgetId)
              const isRequired = widgetDef?.required || false
              const size = getWidgetSize(widgetId)
              const span = SIZE_TO_SPAN[size]
              const allowedSizes = WIDGET_SIZE_OPTIONS[widgetId] || ['full']

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
                        "relative transition-transform col-span-full",
                        snapshot.isDragging && "rotate-1 scale-[1.02] z-50"
                      )}
                      style={{
                        ...provided.draggableProps.style,
                        opacity: snapshot.isDragging ? 0.9 : 1,
                        gridColumn: snapshot.isDragging ? 'span 6' : `span ${span}`,
                      }}
                      data-size={size}
                    >
                      <WidgetEditOverlay
                        widgetId={widgetId}
                        isRequired={isRequired}
                        currentSize={size}
                        allowedSizes={allowedSizes}
                        onToggleVisibility={onToggleWidget ? () => onToggleWidget(widgetId) : undefined}
                        onResize={onResizeWidget ? (newSize) => onResizeWidget(widgetId, newSize) : undefined}
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

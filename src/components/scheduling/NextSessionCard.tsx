'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  AlertCircle,
  Check,
  X,
  Clock3,
  Settings,
  ChevronRight,
  CalendarOff,
  AlertTriangle,
  Edit3
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type ProjectedSession,
  type SessionStatus,
  type ScheduleSettings,
  type SchedulePattern,
  getNextSession,
  calculateSessionStatus,
} from '@/lib/schedule-utils'
import {
  formatSessionTime,
  getTimezoneAbbreviation,
  type FormattedSessionTime
} from '@/lib/timezone-utils'

interface NextSessionCardProps {
  // Campaign scheduling data
  scheduleSettings: ScheduleSettings
  schedulePattern?: SchedulePattern | null
  // For simple mode
  nextSessionDate?: string | null
  nextSessionTime?: string | null
  nextSessionLocation?: string | null
  // Party members for attendance
  partyMembers?: {
    id: string
    characterName?: string
    imageUrl?: string
    status: 'attending' | 'unavailable' | 'late'
    note?: string
  }[]
  // User context
  userTimezone: string
  isDm: boolean
  // Current user's status (for player view)
  currentUserStatus?: 'attending' | 'unavailable' | 'late'
  currentUserNote?: string
  // Callbacks
  onUpdateStatus?: (status: 'attending' | 'unavailable' | 'late', note?: string) => void
  onEditSchedule?: () => void
  onViewUpcoming?: () => void
  className?: string
}

function getStatusColor(status: SessionStatus['status']): string {
  switch (status) {
    case 'on': return 'text-emerald-400'
    case 'on_partial': return 'text-amber-400'
    case 'needs_decision': return 'text-orange-400'
    case 'skipped': return 'text-gray-500'
    default: return 'text-[--text-tertiary]'
  }
}

function getStatusBgColor(status: SessionStatus['status']): string {
  switch (status) {
    case 'on': return 'bg-emerald-500/10 border-emerald-500/30'
    case 'on_partial': return 'bg-amber-500/10 border-amber-500/30'
    case 'needs_decision': return 'bg-orange-500/10 border-orange-500/30'
    case 'skipped': return 'bg-gray-500/10 border-gray-500/30'
    default: return 'bg-white/[0.02] border-white/[0.06]'
  }
}

export function NextSessionCard({
  scheduleSettings,
  schedulePattern,
  nextSessionDate,
  nextSessionTime,
  nextSessionLocation,
  partyMembers = [],
  userTimezone,
  isDm,
  currentUserStatus = 'attending',
  currentUserNote,
  onUpdateStatus,
  onEditSchedule,
  onViewUpcoming,
  className
}: NextSessionCardProps) {
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [noteValue, setNoteValue] = useState(currentUserNote || '')

  // If scheduling is off, show simple message
  if (scheduleSettings.mode === 'off') {
    return (
      <div className={cn(
        'p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]',
        className
      )}>
        <div className="flex items-center gap-3 text-[--text-tertiary]">
          <CalendarOff className="w-5 h-5" />
          <span className="text-sm">Scheduling is handled outside Multiloop</span>
        </div>
        {isDm && onEditSchedule && (
          <button
            onClick={onEditSchedule}
            className="mt-4 text-xs text-[--arcane-purple] hover:underline flex items-center gap-1"
          >
            <Settings className="w-3 h-3" />
            Enable scheduling
          </button>
        )}
      </div>
    )
  }

  // Get next session info
  const nextSession = getNextSession(
    schedulePattern || null,
    [], // exceptions would come from props
    nextSessionDate,
    nextSessionTime
  )

  if (!nextSession) {
    return (
      <div className={cn(
        'p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]',
        className
      )}>
        <div className="text-center py-4">
          <Calendar className="w-8 h-8 text-[--text-tertiary] mx-auto mb-2" />
          <div className="text-sm text-[--text-secondary]">No upcoming session scheduled</div>
          {isDm && onEditSchedule && (
            <button
              onClick={onEditSchedule}
              className="mt-3 text-sm text-[--arcane-purple] hover:underline flex items-center gap-1 mx-auto"
            >
              <Edit3 className="w-4 h-4" />
              Set next session
            </button>
          )}
        </div>
      </div>
    )
  }

  // Format session time for user's timezone
  const formattedTime: FormattedSessionTime = formatSessionTime(
    nextSession.date,
    schedulePattern?.timezone || userTimezone,
    userTimezone
  )

  // Calculate session status based on party member responses
  const sessionStatus: SessionStatus = calculateSessionStatus(
    partyMembers.map(m => ({
      id: m.id,
      characterName: m.characterName,
      status: m.status,
      note: m.note
    })),
    scheduleSettings
  )

  const location = schedulePattern?.location || nextSessionLocation

  // Player availability response handler
  const handleStatusChange = (newStatus: 'attending' | 'unavailable' | 'late') => {
    if (onUpdateStatus) {
      if (newStatus !== 'attending' && !showNoteInput) {
        setShowNoteInput(true)
        return
      }
      onUpdateStatus(newStatus, noteValue || undefined)
      setShowNoteInput(false)
    }
  }

  const submitWithNote = () => {
    if (onUpdateStatus && currentUserStatus) {
      onUpdateStatus(currentUserStatus, noteValue || undefined)
      setShowNoteInput(false)
    }
  }

  return (
    <div className={cn(
      'rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden',
      className
    )}>
      {/* Header with date */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs text-[--text-tertiary] uppercase tracking-wider mb-1">
              Next Session
            </div>
            <div className="text-xl font-semibold text-white">
              {formattedTime.date}
            </div>
            <div className="flex items-center gap-3 mt-2 text-sm">
              <span className="flex items-center gap-1.5 text-[--arcane-purple]">
                <Clock className="w-4 h-4" />
                {formattedTime.time}
              </span>
              <span className="text-[--text-tertiary]">
                {formattedTime.timezone}
              </span>
            </div>

            {/* DST Warning */}
            {formattedTime.isDstShift && (
              <div className="flex items-start gap-2 mt-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span className="text-xs text-amber-200">
                  {formattedTime.dstWarning}
                </span>
              </div>
            )}
          </div>

          {/* Session status badge */}
          <div className={cn(
            'px-3 py-1.5 rounded-full text-xs font-medium border',
            getStatusBgColor(sessionStatus.status)
          )}>
            <span className={getStatusColor(sessionStatus.status)}>
              {sessionStatus.statusLabel}
            </span>
          </div>
        </div>

        {/* Location */}
        {location && (
          <div className="flex items-center gap-2 mt-4 text-sm text-[--text-secondary]">
            <MapPin className="w-4 h-4 text-[--text-tertiary]" />
            {location}
          </div>
        )}
      </div>

      {/* DM View: Party attendance overview */}
      {isDm && partyMembers.length > 0 && (
        <div className="px-6 py-4 border-t border-white/[0.06]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm text-[--text-secondary]">
              <Users className="w-4 h-4 text-[--text-tertiary]" />
              Party Availability
            </div>
            <span className="text-xs text-[--text-tertiary]">
              {sessionStatus.availableCount}/{sessionStatus.totalCount} available
            </span>
          </div>

          {/* Member avatars */}
          <div className="flex flex-wrap gap-2">
            {partyMembers.map((member) => {
              const statusColors = {
                attending: 'ring-emerald-500',
                unavailable: 'ring-red-500 opacity-50',
                late: 'ring-amber-500',
              }

              return (
                <div
                  key={member.id}
                  className="relative group"
                  title={`${member.characterName || 'Unknown'}: ${member.status}${member.note ? ` - ${member.note}` : ''}`}
                >
                  <div className={cn(
                    'w-10 h-10 rounded-full overflow-hidden ring-2',
                    statusColors[member.status]
                  )}>
                    {member.imageUrl ? (
                      <Image
                        src={member.imageUrl}
                        alt={member.characterName || ''}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-white/10 flex items-center justify-center text-xs text-white font-medium">
                        {(member.characterName || '?')[0]}
                      </div>
                    )}
                  </div>

                  {/* Status indicator */}
                  <div className={cn(
                    'absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center',
                    member.status === 'attending' && 'bg-emerald-500',
                    member.status === 'unavailable' && 'bg-red-500',
                    member.status === 'late' && 'bg-amber-500'
                  )}>
                    {member.status === 'attending' && <Check className="w-2.5 h-2.5 text-white" />}
                    {member.status === 'unavailable' && <X className="w-2.5 h-2.5 text-white" />}
                    {member.status === 'late' && <Clock3 className="w-2.5 h-2.5 text-white" />}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Warnings */}
          {sessionStatus.warnings.length > 0 && (
            <div className="mt-3 space-y-1">
              {sessionStatus.warnings.map((warning, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 text-xs text-amber-300"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  {warning}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Player View: My availability response */}
      {!isDm && onUpdateStatus && (
        <div className="px-6 py-4 border-t border-white/[0.06]">
          <div className="text-xs text-[--text-tertiary] mb-3">
            Your Availability (assumed attending unless you say otherwise)
          </div>

          {!showNoteInput ? (
            <div className="flex gap-2">
              <button
                onClick={() => handleStatusChange('attending')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  currentUserStatus === 'attending'
                    ? 'bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/30'
                    : 'bg-white/[0.04] text-[--text-secondary] hover:bg-white/[0.08]'
                )}
              >
                <Check className="w-4 h-4" />
                Attending
              </button>
              <button
                onClick={() => handleStatusChange('late')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  currentUserStatus === 'late'
                    ? 'bg-amber-500/20 text-amber-400 ring-2 ring-amber-500/30'
                    : 'bg-white/[0.04] text-[--text-secondary] hover:bg-white/[0.08]'
                )}
              >
                <Clock3 className="w-4 h-4" />
                Late
              </button>
              <button
                onClick={() => handleStatusChange('unavailable')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  currentUserStatus === 'unavailable'
                    ? 'bg-red-500/20 text-red-400 ring-2 ring-red-500/30'
                    : 'bg-white/[0.04] text-[--text-secondary] hover:bg-white/[0.08]'
                )}
              >
                <X className="w-4 h-4" />
                Can't Make It
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                value={noteValue}
                onChange={(e) => setNoteValue(e.target.value)}
                placeholder="Optional: Add a note (e.g., 'work until 8pm')"
                className={cn(
                  'w-full px-4 py-2 rounded-lg',
                  'bg-white/[0.04] border border-white/[0.06]',
                  'text-sm text-white placeholder:text-[--text-tertiary]',
                  'focus:outline-none focus:ring-2 focus:ring-[--arcane-purple]/30'
                )}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowNoteInput(false)
                    setNoteValue('')
                  }}
                  className="flex-1 px-4 py-2 rounded-lg text-sm text-[--text-secondary] bg-white/[0.04] hover:bg-white/[0.08]"
                >
                  Cancel
                </button>
                <button
                  onClick={submitWithNote}
                  className="flex-1 px-4 py-2 rounded-lg text-sm text-white bg-[--arcane-purple] hover:bg-[--arcane-purple]/80"
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {currentUserNote && !showNoteInput && (
            <div className="mt-2 text-xs text-[--text-tertiary] flex items-center gap-1">
              <span>Note:</span>
              <span className="text-[--text-secondary]">{currentUserNote}</span>
            </div>
          )}
        </div>
      )}

      {/* Footer actions */}
      <div className="px-6 py-3 border-t border-white/[0.06] flex items-center justify-between">
        {onViewUpcoming && (
          <button
            onClick={onViewUpcoming}
            className="text-xs text-[--arcane-purple] hover:underline flex items-center gap-1"
          >
            View upcoming sessions
            <ChevronRight className="w-3 h-3" />
          </button>
        )}

        {isDm && onEditSchedule && (
          <button
            onClick={onEditSchedule}
            className="text-xs text-[--text-tertiary] hover:text-white flex items-center gap-1 ml-auto"
          >
            <Settings className="w-3 h-3" />
            Edit schedule
          </button>
        )}
      </div>
    </div>
  )
}

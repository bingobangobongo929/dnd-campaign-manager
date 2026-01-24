'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import {
  Calendar,
  Clock,
  MapPin,
  Settings,
  Users,
  Check,
  X,
  Clock3,
  AlertCircle,
  CalendarOff,
  Edit3,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DashboardWidget } from './DashboardWidget'
import {
  getNextSession,
  calculateSessionStatus,
  type ScheduleSettings,
  type SchedulePattern,
  type ScheduleException,
  type SessionStatus,
} from '@/lib/schedule-utils'
import {
  formatSessionTime,
  getUserTimezone,
  type FormattedSessionTime,
} from '@/lib/timezone-utils'

interface PartyMemberStatus {
  id: string
  characterName?: string
  imageUrl?: string
  status: 'attending' | 'unavailable' | 'late'
  note?: string
}

interface NextSessionWidgetProps {
  // Campaign scheduling data
  scheduleSettings: ScheduleSettings
  schedulePattern?: SchedulePattern | null
  scheduleExceptions?: ScheduleException[]
  // Simple mode fields
  nextSessionDate?: string | null
  nextSessionTime?: string | null
  nextSessionLocation?: string | null
  // Party member statuses
  partyMembers?: PartyMemberStatus[]
  // User context
  userTimezone?: string
  isDm: boolean
  // Current user's status (for player view)
  currentUserStatus?: 'attending' | 'unavailable' | 'late'
  currentUserNote?: string
  currentUserCharacterId?: string
  // Callbacks
  onUpdateStatus?: (status: 'attending' | 'unavailable' | 'late', note?: string) => void
  onEditSchedule?: () => void
  className?: string
}

export function NextSessionWidget({
  scheduleSettings,
  schedulePattern,
  scheduleExceptions = [],
  nextSessionDate,
  nextSessionTime,
  nextSessionLocation,
  partyMembers = [],
  userTimezone,
  isDm,
  currentUserStatus = 'attending',
  currentUserNote,
  currentUserCharacterId,
  onUpdateStatus,
  onEditSchedule,
  className,
}: NextSessionWidgetProps) {
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [noteValue, setNoteValue] = useState(currentUserNote || '')

  const tz = userTimezone || getUserTimezone()

  // Get next session
  const nextSession = useMemo(() => {
    return getNextSession(
      schedulePattern || null,
      scheduleExceptions,
      nextSessionDate,
      nextSessionTime
    )
  }, [schedulePattern, scheduleExceptions, nextSessionDate, nextSessionTime])

  // Format session time
  const formattedTime: FormattedSessionTime | null = useMemo(() => {
    if (!nextSession) return null
    return formatSessionTime(
      nextSession.date,
      schedulePattern?.timezone || tz,
      tz
    )
  }, [nextSession, schedulePattern?.timezone, tz])

  // Calculate session status
  const sessionStatus: SessionStatus = useMemo(() => {
    return calculateSessionStatus(
      partyMembers.map(m => ({
        id: m.id,
        characterName: m.characterName,
        status: m.status,
        note: m.note,
      })),
      scheduleSettings
    )
  }, [partyMembers, scheduleSettings])

  const location = schedulePattern?.location || nextSessionLocation

  // Player status change handler
  const handleStatusClick = (status: 'attending' | 'unavailable' | 'late') => {
    if (status === 'attending') {
      onUpdateStatus?.(status)
      setShowNoteInput(false)
      setNoteValue('')
    } else {
      setShowNoteInput(true)
    }
  }

  const submitNote = (status: 'attending' | 'unavailable' | 'late') => {
    onUpdateStatus?.(status, noteValue || undefined)
    setShowNoteInput(false)
  }

  // If scheduling is off
  if (scheduleSettings.mode === 'off') {
    return (
      <DashboardWidget title="Next Session" icon={CalendarOff} className={className}>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <CalendarOff className="w-8 h-8 text-[--text-tertiary] mb-2" />
          <p className="text-sm text-[--text-tertiary]">
            Scheduling is managed outside Multiloop
          </p>
          {isDm && onEditSchedule && (
            <button
              onClick={onEditSchedule}
              className="mt-3 text-sm text-[--arcane-purple] hover:underline flex items-center gap-1"
            >
              <Settings className="w-4 h-4" />
              Enable scheduling
            </button>
          )}
        </div>
      </DashboardWidget>
    )
  }

  // No session scheduled
  if (!nextSession) {
    return (
      <DashboardWidget title="Next Session" icon={Calendar} className={className}>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <Calendar className="w-8 h-8 text-[--text-tertiary] mb-2" />
          <p className="text-sm text-[--text-secondary]">No upcoming session</p>
          {isDm && onEditSchedule && (
            <button
              onClick={onEditSchedule}
              className="mt-3 text-sm text-[--arcane-purple] hover:underline flex items-center gap-1"
            >
              <Edit3 className="w-4 h-4" />
              Schedule session
            </button>
          )}
        </div>
      </DashboardWidget>
    )
  }

  return (
    <DashboardWidget
      title="Next Session"
      icon={Calendar}
      action={isDm && onEditSchedule ? { label: 'Edit', onClick: onEditSchedule } : undefined}
      className={className}
    >
      <div className="space-y-4">
        {/* Date & Time */}
        <div>
          <div className="text-lg font-semibold text-white">
            {formattedTime?.date}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1.5 text-sm text-[--arcane-purple]">
              <Clock className="w-4 h-4" />
              {formattedTime?.time}
            </span>
            <span className="text-xs text-[--text-tertiary]">
              {formattedTime?.timezone}
            </span>
          </div>

          {/* DST Warning */}
          {formattedTime?.isDstShift && (
            <div className="flex items-start gap-2 mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span className="text-xs text-amber-200">
                {formattedTime.dstWarning}
              </span>
            </div>
          )}
        </div>

        {/* Location */}
        {location && (
          <div className="flex items-center gap-2 text-sm text-[--text-secondary]">
            <MapPin className="w-4 h-4 text-[--text-tertiary]" />
            {location}
          </div>
        )}

        {/* DM View: Party attendance */}
        {isDm && partyMembers.length > 0 && (
          <div className="pt-3 border-t border-white/[0.06]">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-2 text-xs text-[--text-tertiary]">
                <Users className="w-3.5 h-3.5" />
                Party Availability
              </span>
              <span className={cn(
                'text-xs font-medium px-2 py-0.5 rounded-full',
                sessionStatus.status === 'on' && 'bg-emerald-500/20 text-emerald-400',
                sessionStatus.status === 'on_partial' && 'bg-amber-500/20 text-amber-400',
                sessionStatus.status === 'needs_decision' && 'bg-orange-500/20 text-orange-400',
                sessionStatus.status === 'skipped' && 'bg-gray-500/20 text-gray-400',
                sessionStatus.status === 'not_scheduled' && 'bg-gray-500/20 text-gray-400'
              )}>
                {sessionStatus.availableCount}/{sessionStatus.totalCount}
              </span>
            </div>

            {/* Member avatars */}
            <div className="flex flex-wrap gap-1.5">
              {partyMembers.map((member) => (
                <div
                  key={member.id}
                  className="relative group"
                  title={`${member.characterName || 'Unknown'}: ${member.status}${member.note ? ` - ${member.note}` : ''}`}
                >
                  <div className={cn(
                    'w-8 h-8 rounded-full overflow-hidden ring-2',
                    member.status === 'attending' && 'ring-emerald-500',
                    member.status === 'unavailable' && 'ring-red-500 opacity-50',
                    member.status === 'late' && 'ring-amber-500'
                  )}>
                    {member.imageUrl ? (
                      <Image
                        src={member.imageUrl}
                        alt={member.characterName || ''}
                        width={32}
                        height={32}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-white/10 flex items-center justify-center text-xs text-white font-medium">
                        {(member.characterName || '?')[0]}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Warnings */}
            {sessionStatus.warnings.length > 0 && (
              <div className="mt-2 space-y-1">
                {sessionStatus.warnings.map((warning, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 text-xs text-amber-300"
                  >
                    <AlertCircle className="w-3 h-3" />
                    {warning}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Player View: My status */}
        {!isDm && onUpdateStatus && (
          <div className="pt-3 border-t border-white/[0.06]">
            <div className="text-xs text-[--text-tertiary] mb-2">
              Your availability
            </div>

            {!showNoteInput ? (
              <div className="flex gap-2">
                <button
                  onClick={() => handleStatusClick('attending')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                    currentUserStatus === 'attending'
                      ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
                      : 'bg-white/[0.04] text-[--text-secondary] hover:bg-white/[0.08]'
                  )}
                >
                  <Check className="w-3.5 h-3.5" />
                  Attending
                </button>
                <button
                  onClick={() => handleStatusClick('late')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                    currentUserStatus === 'late'
                      ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30'
                      : 'bg-white/[0.04] text-[--text-secondary] hover:bg-white/[0.08]'
                  )}
                >
                  <Clock3 className="w-3.5 h-3.5" />
                  Late
                </button>
                <button
                  onClick={() => handleStatusClick('unavailable')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                    currentUserStatus === 'unavailable'
                      ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30'
                      : 'bg-white/[0.04] text-[--text-secondary] hover:bg-white/[0.08]'
                  )}
                >
                  <X className="w-3.5 h-3.5" />
                  Can't Make It
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={noteValue}
                  onChange={(e) => setNoteValue(e.target.value)}
                  placeholder="Optional note (e.g., 'work until 8')"
                  className={cn(
                    'w-full px-3 py-2 rounded-lg',
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
                    className="flex-1 px-3 py-2 rounded-lg text-xs text-[--text-secondary] bg-white/[0.04]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => submitNote(currentUserStatus === 'late' ? 'late' : 'unavailable')}
                    className="flex-1 px-3 py-2 rounded-lg text-xs text-white bg-[--arcane-purple]"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            {currentUserNote && !showNoteInput && (
              <div className="mt-2 text-xs text-[--text-tertiary]">
                Note: {currentUserNote}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardWidget>
  )
}

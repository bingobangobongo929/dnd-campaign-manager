'use client'

import { Calendar, Clock, AlertTriangle, Check, SkipForward, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type ProjectedSession,
  type SchedulePattern,
  type ScheduleException,
  getUpcomingSessions,
} from '@/lib/schedule-utils'
import { formatSessionTime } from '@/lib/timezone-utils'

interface UpcomingSessionsListProps {
  schedulePattern: SchedulePattern | null
  exceptions: ScheduleException[]
  userTimezone: string
  count?: number
  isDm?: boolean
  onSkipSession?: (dateString: string) => void
  onConfirmSession?: (dateString: string) => void
  onRescheduleSession?: (dateString: string) => void
  className?: string
}

export function UpcomingSessionsList({
  schedulePattern,
  exceptions,
  userTimezone,
  count = 6,
  isDm = false,
  onSkipSession,
  onConfirmSession,
  onRescheduleSession,
  className
}: UpcomingSessionsListProps) {
  const sessions = getUpcomingSessions(schedulePattern, exceptions, count)

  if (sessions.length === 0) {
    return (
      <div className={cn(
        'p-8 text-center rounded-xl bg-white/[0.02] border border-white/[0.06]',
        className
      )}>
        <Calendar className="w-8 h-8 text-[--text-tertiary] mx-auto mb-2" />
        <div className="text-sm text-[--text-secondary]">
          No upcoming sessions scheduled
        </div>
        <div className="text-xs text-[--text-tertiary] mt-1">
          Set up a recurring schedule or switch to simple mode
        </div>
      </div>
    )
  }

  const campaignTimezone = schedulePattern?.timezone || userTimezone

  return (
    <div className={cn('space-y-2', className)}>
      {sessions.map((session, idx) => {
        const formattedTime = formatSessionTime(
          session.date,
          campaignTimezone,
          userTimezone
        )

        const isFirst = idx === 0
        const isSkipped = session.status === 'skipped'
        const isRescheduled = session.status === 'rescheduled'
        const isConfirmed = session.status === 'confirmed'

        return (
          <div
            key={session.dateString}
            className={cn(
              'flex items-center gap-4 p-4 rounded-xl border transition-all',
              isFirst
                ? 'bg-[--arcane-purple]/5 border-[--arcane-purple]/30'
                : 'bg-white/[0.02] border-white/[0.06]',
              (isSkipped || isRescheduled) && 'opacity-60'
            )}
          >
            {/* Date info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn(
                  'text-sm font-medium',
                  isFirst ? 'text-[--arcane-purple]' : 'text-white',
                  (isSkipped || isRescheduled) && 'line-through text-[--text-tertiary]'
                )}>
                  {formattedTime.date}
                </span>

                {/* Status badges */}
                {isConfirmed && (
                  <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    <Check className="w-3 h-3" />
                    Confirmed
                  </span>
                )}
                {isSkipped && (
                  <span className="flex items-center gap-1 text-xs text-gray-400 bg-gray-500/10 px-2 py-0.5 rounded-full">
                    <SkipForward className="w-3 h-3" />
                    Skipped
                  </span>
                )}
                {isRescheduled && (
                  <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    <ArrowRight className="w-3 h-3" />
                    Moved
                  </span>
                )}
                {isFirst && !isSkipped && !isRescheduled && (
                  <span className="text-xs text-[--arcane-purple] bg-[--arcane-purple]/10 px-2 py-0.5 rounded-full">
                    Next
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 mt-1 text-xs text-[--text-tertiary]">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formattedTime.time} {formattedTime.timezone}
                </span>

                {formattedTime.isDstShift && (
                  <span className="flex items-center gap-1 text-amber-400">
                    <AlertTriangle className="w-3 h-3" />
                    DST shift
                  </span>
                )}
              </div>

              {/* Exception reason */}
              {session.exception?.reason && (
                <div className="text-xs text-[--text-tertiary] mt-1">
                  {session.exception.reason}
                </div>
              )}

              {/* Rescheduled to info */}
              {session.rescheduledFrom && (
                <div className="text-xs text-amber-300 mt-1">
                  Rescheduled from {session.rescheduledFrom.toLocaleDateString()}
                </div>
              )}
            </div>

            {/* DM Actions */}
            {isDm && !isSkipped && !isRescheduled && (
              <div className="flex items-center gap-1">
                {!isConfirmed && onConfirmSession && (
                  <button
                    onClick={() => onConfirmSession(session.dateString)}
                    className="p-2 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                    title="Confirm session"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                {onSkipSession && (
                  <button
                    onClick={() => onSkipSession(session.dateString)}
                    className="p-2 rounded-lg text-[--text-tertiary] hover:text-gray-400 hover:bg-white/[0.04] transition-colors"
                    title="Skip this session"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                )}
                {onRescheduleSession && (
                  <button
                    onClick={() => onRescheduleSession(session.dateString)}
                    className="p-2 rounded-lg text-[--text-tertiary] hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                    title="Reschedule"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

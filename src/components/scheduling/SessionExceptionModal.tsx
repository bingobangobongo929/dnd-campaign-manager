'use client'

import { useState } from 'react'
import { SkipForward, ArrowRight, Calendar, Clock, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Modal } from '@/components/ui'
import { type ExceptionType } from '@/lib/schedule-utils'
import { formatTime24to12 } from '@/lib/timezone-utils'

interface SessionExceptionModalProps {
  isOpen: boolean
  onClose: () => void
  sessionDate: string // YYYY-MM-DD
  sessionDayName: string // "Tuesday"
  defaultType?: ExceptionType
  onSubmit: (exception: {
    date: string
    type: ExceptionType
    reason?: string
    new_date?: string
    new_time?: string
  }) => void
}

export function SessionExceptionModal({
  isOpen,
  onClose,
  sessionDate,
  sessionDayName,
  defaultType = 'skip',
  onSubmit
}: SessionExceptionModalProps) {
  const [exceptionType, setExceptionType] = useState<ExceptionType>(defaultType)
  const [reason, setReason] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')

  const handleSubmit = () => {
    const exception: {
      date: string
      type: ExceptionType
      reason?: string
      new_date?: string
      new_time?: string
    } = {
      date: sessionDate,
      type: exceptionType,
    }

    if (reason.trim()) {
      exception.reason = reason.trim()
    }

    if (exceptionType === 'reschedule') {
      if (newDate) {
        exception.new_date = newDate
      }
      if (newTime) {
        exception.new_time = newTime
      }
    }

    onSubmit(exception)
    onClose()
  }

  const formattedDate = new Date(sessionDate + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Modify Session"
      description={`${sessionDayName}, ${formattedDate}`}
      size="md"
    >
      <div className="space-y-6">
        {/* Exception Type Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-[--text-secondary]">
            What would you like to do?
          </label>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setExceptionType('skip')}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all',
                exceptionType === 'skip'
                  ? 'bg-gray-500/10 border-gray-500/50 ring-2 ring-gray-500/20'
                  : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
              )}
            >
              <SkipForward className={cn(
                'w-6 h-6',
                exceptionType === 'skip' ? 'text-gray-400' : 'text-[--text-tertiary]'
              )} />
              <div>
                <div className={cn(
                  'text-sm font-medium',
                  exceptionType === 'skip' ? 'text-white' : 'text-[--text-secondary]'
                )}>
                  Skip Session
                </div>
                <div className="text-xs text-[--text-tertiary] mt-0.5">
                  No game this week
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setExceptionType('reschedule')}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all',
                exceptionType === 'reschedule'
                  ? 'bg-amber-500/10 border-amber-500/50 ring-2 ring-amber-500/20'
                  : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
              )}
            >
              <ArrowRight className={cn(
                'w-6 h-6',
                exceptionType === 'reschedule' ? 'text-amber-400' : 'text-[--text-tertiary]'
              )} />
              <div>
                <div className={cn(
                  'text-sm font-medium',
                  exceptionType === 'reschedule' ? 'text-white' : 'text-[--text-secondary]'
                )}>
                  Reschedule
                </div>
                <div className="text-xs text-[--text-tertiary] mt-0.5">
                  Move to different date
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Reason (optional) */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-[--text-secondary]">
            Reason <span className="text-[--text-tertiary]">(optional)</span>
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={exceptionType === 'skip' ? 'e.g., Super Bowl, Holiday' : 'e.g., Scheduling conflict'}
            className={cn(
              'w-full px-4 py-3 rounded-xl',
              'bg-white/[0.02] border border-white/[0.06]',
              'text-sm text-white placeholder:text-[--text-tertiary]',
              'focus:outline-none focus:ring-2 focus:ring-[--arcane-purple]/30 focus:border-[--arcane-purple]/50'
            )}
          />
        </div>

        {/* Reschedule Options */}
        {exceptionType === 'reschedule' && (
          <div className="space-y-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <div className="text-sm font-medium text-amber-300">
              Reschedule To
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-[--text-tertiary]">
                  <Calendar className="w-3 h-3" />
                  New Date
                </label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  min={sessionDate}
                  className={cn(
                    'w-full px-4 py-2.5 rounded-lg',
                    'bg-white/[0.04] border border-white/[0.06]',
                    'text-sm text-white',
                    'focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50'
                  )}
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-[--text-tertiary]">
                  <Clock className="w-3 h-3" />
                  New Time <span>(optional)</span>
                </label>
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className={cn(
                    'w-full px-4 py-2.5 rounded-lg',
                    'bg-white/[0.04] border border-white/[0.06]',
                    'text-sm text-white',
                    'focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50'
                  )}
                />
                <div className="text-xs text-[--text-tertiary]">
                  Leave empty to use regular time
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-[--text-secondary] bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={exceptionType === 'reschedule' && !newDate}
            className={cn(
              'flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              exceptionType === 'skip'
                ? 'bg-gray-600 hover:bg-gray-500 text-white'
                : 'bg-amber-600 hover:bg-amber-500 text-white'
            )}
          >
            {exceptionType === 'skip' ? 'Skip Session' : 'Reschedule'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

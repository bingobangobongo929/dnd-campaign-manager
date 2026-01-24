'use client'

import { useState } from 'react'
import { Calendar, Clock, MapPin, Repeat, Pause, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type SchedulePattern, type ScheduleType, describePattern } from '@/lib/schedule-utils'
import { getDayName, formatTime24to12 } from '@/lib/timezone-utils'
import { TimezoneSelector } from './TimezoneSelector'

interface SchedulePatternEditorProps {
  value: SchedulePattern | null
  onChange: (pattern: SchedulePattern) => void
  userTimezone: string
  className?: string
}

const SCHEDULE_TYPES: {
  value: ScheduleType
  label: string
  description: string
  icon: React.ElementType
}[] = [
  {
    value: 'weekly',
    label: 'Weekly',
    description: 'Same day every week',
    icon: Repeat,
  },
  {
    value: 'biweekly',
    label: 'Every 2 Weeks',
    description: 'Same day every other week',
    icon: Repeat,
  },
  {
    value: 'monthly',
    label: 'Monthly',
    description: 'Same week each month',
    icon: CalendarDays,
  },
  {
    value: 'adhoc',
    label: 'Ad-Hoc',
    description: 'Schedule sessions individually',
    icon: Calendar,
  },
  {
    value: 'hiatus',
    label: 'On Hiatus',
    description: 'Campaign is paused',
    icon: Pause,
  },
]

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
]

const WEEKS_OF_MONTH = [
  { value: 1, label: '1st' },
  { value: 2, label: '2nd' },
  { value: 3, label: '3rd' },
  { value: 4, label: '4th' },
]

const COMMON_TIMES = [
  '14:00', '15:00', '16:00', '17:00', '18:00',
  '19:00', '19:30', '20:00', '20:30', '21:00'
]

const DURATION_OPTIONS = [
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
  { value: 240, label: '4 hours' },
  { value: 300, label: '5 hours' },
  { value: 360, label: '6 hours' },
]

export function SchedulePatternEditor({
  value,
  onChange,
  userTimezone,
  className
}: SchedulePatternEditorProps) {
  const [showCustomTime, setShowCustomTime] = useState(false)

  // Initialize with defaults if null
  const pattern = value || {
    type: 'weekly' as ScheduleType,
    day_of_week: 2, // Tuesday
    time: '19:00',
    duration_minutes: 240,
    timezone: userTimezone,
    location: '',
  }

  const updatePattern = (updates: Partial<SchedulePattern>) => {
    onChange({ ...pattern, ...updates })
  }

  const needsDaySelection = pattern.type === 'weekly' || pattern.type === 'biweekly' || pattern.type === 'monthly'
  const needsWeekSelection = pattern.type === 'monthly'
  const needsTimeSettings = pattern.type !== 'hiatus' && pattern.type !== 'adhoc'

  return (
    <div className={cn('space-y-6', className)}>
      {/* Schedule Type */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-[--text-secondary]">
          Schedule Type
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SCHEDULE_TYPES.map((type) => {
            const isSelected = pattern.type === type.value
            const Icon = type.icon

            return (
              <button
                key={type.value}
                type="button"
                onClick={() => updatePattern({ type: type.value })}
                className={cn(
                  'flex flex-col items-center gap-2 p-3 rounded-xl border transition-all',
                  isSelected
                    ? 'bg-[--arcane-purple]/10 border-[--arcane-purple]/50'
                    : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/10'
                )}
              >
                <Icon className={cn(
                  'w-5 h-5',
                  isSelected ? 'text-[--arcane-purple]' : 'text-[--text-tertiary]'
                )} />
                <span className={cn(
                  'text-xs font-medium',
                  isSelected ? 'text-[--arcane-purple]' : 'text-[--text-secondary]'
                )}>
                  {type.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Day of Week Selection */}
      {needsDaySelection && (
        <div className="space-y-3">
          <label className="text-sm font-medium text-[--text-secondary]">
            Day of Week
          </label>
          <div className="flex flex-wrap gap-2">
            {DAYS_OF_WEEK.map((day) => {
              const isSelected = pattern.day_of_week === day.value

              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => updatePattern({ day_of_week: day.value })}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    isSelected
                      ? 'bg-[--arcane-purple] text-white'
                      : 'bg-white/[0.04] text-[--text-secondary] hover:bg-white/[0.08]'
                  )}
                >
                  {day.short}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Week of Month Selection (for monthly) */}
      {needsWeekSelection && (
        <div className="space-y-3">
          <label className="text-sm font-medium text-[--text-secondary]">
            Week of Month
          </label>
          <div className="flex gap-2">
            {WEEKS_OF_MONTH.map((week) => {
              const isSelected = pattern.week_of_month === week.value

              return (
                <button
                  key={week.value}
                  type="button"
                  onClick={() => updatePattern({ week_of_month: week.value })}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    isSelected
                      ? 'bg-[--arcane-purple] text-white'
                      : 'bg-white/[0.04] text-[--text-secondary] hover:bg-white/[0.08]'
                  )}
                >
                  {week.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Time Selection */}
      {needsTimeSettings && (
        <>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-[--text-secondary]">
              <Clock className="w-4 h-4 text-[--text-tertiary]" />
              Start Time
            </label>

            {!showCustomTime ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {COMMON_TIMES.map((time) => {
                    const isSelected = pattern.time === time

                    return (
                      <button
                        key={time}
                        type="button"
                        onClick={() => updatePattern({ time })}
                        className={cn(
                          'px-3 py-2 rounded-lg text-sm font-medium transition-all',
                          isSelected
                            ? 'bg-[--arcane-purple] text-white'
                            : 'bg-white/[0.04] text-[--text-secondary] hover:bg-white/[0.08]'
                        )}
                      >
                        {formatTime24to12(time)}
                      </button>
                    )
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setShowCustomTime(true)}
                  className="text-xs text-[--arcane-purple] hover:underline"
                >
                  Custom time...
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={pattern.time || '19:00'}
                  onChange={(e) => updatePattern({ time: e.target.value })}
                  className={cn(
                    'px-4 py-2 rounded-lg',
                    'bg-white/[0.04] border border-white/[0.06]',
                    'text-sm text-white',
                    'focus:outline-none focus:ring-2 focus:ring-[--arcane-purple]/30 focus:border-[--arcane-purple]/50'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowCustomTime(false)}
                  className="text-xs text-[--text-tertiary] hover:text-white"
                >
                  Show presets
                </button>
              </div>
            )}
          </div>

          {/* Duration */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-[--text-secondary]">
              Session Duration
            </label>
            <div className="flex flex-wrap gap-2">
              {DURATION_OPTIONS.map((duration) => {
                const isSelected = pattern.duration_minutes === duration.value

                return (
                  <button
                    key={duration.value}
                    type="button"
                    onClick={() => updatePattern({ duration_minutes: duration.value })}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                      isSelected
                        ? 'bg-[--arcane-purple] text-white'
                        : 'bg-white/[0.04] text-[--text-secondary] hover:bg-white/[0.08]'
                    )}
                  >
                    {duration.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Timezone */}
          <TimezoneSelector
            value={pattern.timezone}
            onChange={(timezone) => updatePattern({ timezone })}
            label="Session Timezone"
            description="Times will be converted for players in other timezones"
          />
        </>
      )}

      {/* Location */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium text-[--text-secondary]">
          <MapPin className="w-4 h-4 text-[--text-tertiary]" />
          Location
        </label>
        <input
          type="text"
          value={pattern.location || ''}
          onChange={(e) => updatePattern({ location: e.target.value })}
          placeholder="e.g., Discord + Roll20, Jim's place"
          className={cn(
            'w-full px-4 py-3 rounded-xl',
            'bg-white/[0.02] border border-white/[0.06]',
            'text-sm text-white placeholder:text-[--text-tertiary]',
            'focus:outline-none focus:ring-2 focus:ring-[--arcane-purple]/30 focus:border-[--arcane-purple]/50'
          )}
        />
      </div>

      {/* Pattern Summary */}
      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
        <div className="text-xs text-[--text-tertiary] mb-1">Schedule Summary</div>
        <div className="text-sm text-white font-medium">
          {describePattern(pattern)}
        </div>
        {pattern.location && (
          <div className="text-xs text-[--text-tertiary] mt-1 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {pattern.location}
          </div>
        )}
      </div>
    </div>
  )
}

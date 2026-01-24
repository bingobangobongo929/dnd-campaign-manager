'use client'

import { Calendar, CalendarClock, CalendarOff, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type ScheduleMode, describeModeSettings } from '@/lib/schedule-utils'

interface SchedulingModeSelectorProps {
  value: ScheduleMode
  onChange: (mode: ScheduleMode) => void
  className?: string
}

const MODE_OPTIONS: {
  value: ScheduleMode
  icon: React.ElementType
  title: string
  description: string
  features: string[]
}[] = [
  {
    value: 'off',
    icon: CalendarOff,
    title: 'Off',
    description: 'Handle scheduling outside Multiloop',
    features: [
      'No scheduling features',
      'Use Discord, Google Calendar, etc.',
      'Simplest option if you have a system that works',
    ],
  },
  {
    value: 'simple',
    icon: Calendar,
    title: 'Simple',
    description: 'Set next session date & location manually',
    features: [
      'Set next session date and time',
      'Add location (Discord, Roll20, etc.)',
      'Players see when and where',
      'Update after each session',
    ],
  },
  {
    value: 'full',
    icon: CalendarClock,
    title: 'Full',
    description: 'Recurring schedule with attendance tracking',
    features: [
      'Set recurring pattern (weekly, biweekly, monthly)',
      'Automatic session projections',
      'Player availability tracking',
      'Skip or reschedule sessions',
      'Timezone conversion for all players',
    ],
  },
]

export function SchedulingModeSelector({
  value,
  onChange,
  className
}: SchedulingModeSelectorProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="text-sm text-[--text-tertiary]">
        Choose how you want to manage session scheduling for this campaign.
      </div>

      <div className="grid gap-3">
        {MODE_OPTIONS.map((option) => {
          const isSelected = value === option.value
          const Icon = option.icon

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                'relative flex gap-4 p-4 rounded-xl border text-left transition-all',
                isSelected
                  ? 'bg-[--arcane-purple]/10 border-[--arcane-purple]/50 ring-2 ring-[--arcane-purple]/20'
                  : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/10'
              )}
            >
              {/* Icon */}
              <div className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                isSelected
                  ? 'bg-[--arcane-purple]/20 text-[--arcane-purple]'
                  : 'bg-white/[0.04] text-[--text-tertiary]'
              )}>
                <Icon className="w-5 h-5" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-sm font-semibold',
                    isSelected ? 'text-[--arcane-purple]' : 'text-white'
                  )}>
                    {option.title}
                  </span>
                  {isSelected && (
                    <span className="flex items-center gap-1 text-xs text-[--arcane-purple] bg-[--arcane-purple]/10 px-2 py-0.5 rounded-full">
                      <Check className="w-3 h-3" />
                      Selected
                    </span>
                  )}
                </div>
                <p className="text-xs text-[--text-tertiary] mt-0.5">
                  {option.description}
                </p>

                {/* Features list */}
                <ul className="mt-3 space-y-1">
                  {option.features.map((feature, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-xs text-[--text-secondary]"
                    >
                      <span className={cn(
                        'w-1 h-1 rounded-full mt-1.5 shrink-0',
                        isSelected ? 'bg-[--arcane-purple]' : 'bg-white/30'
                      )} />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

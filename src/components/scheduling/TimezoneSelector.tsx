'use client'

import { useState, useMemo } from 'react'
import { Globe, ChevronDown, Search, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  TIMEZONE_GROUPS,
  ALL_TIMEZONES,
  formatCurrentTime,
  getTimezoneAbbreviation
} from '@/lib/timezone-utils'

interface TimezoneSelectorProps {
  value: string
  onChange: (timezone: string) => void
  label?: string
  description?: string
  showCurrentTime?: boolean
  className?: string
}

export function TimezoneSelector({
  value,
  onChange,
  label = 'Timezone',
  description,
  showCurrentTime = true,
  className
}: TimezoneSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const selectedTimezone = useMemo(() => {
    return ALL_TIMEZONES.find(tz => tz.value === value)
  }, [value])

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return TIMEZONE_GROUPS

    const query = searchQuery.toLowerCase()
    return TIMEZONE_GROUPS.map(group => ({
      ...group,
      timezones: group.timezones.filter(tz =>
        tz.label.toLowerCase().includes(query) ||
        tz.cities.toLowerCase().includes(query) ||
        tz.value.toLowerCase().includes(query)
      )
    })).filter(group => group.timezones.length > 0)
  }, [searchQuery])

  const currentTime = showCurrentTime ? formatCurrentTime(value) : null
  const abbreviation = getTimezoneAbbreviation(value)

  return (
    <div className={cn('space-y-2', className)}>
      {/* Label */}
      {label && (
        <label className="flex items-center gap-2 text-sm font-medium text-[--text-secondary]">
          <Globe className="w-4 h-4 text-[--text-tertiary]" />
          {label}
        </label>
      )}

      {description && (
        <p className="text-xs text-[--text-tertiary]">{description}</p>
      )}

      {/* Selector button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'w-full flex items-center justify-between gap-3 px-4 py-3',
            'bg-white/[0.02] border border-white/[0.06] rounded-xl',
            'hover:bg-white/[0.04] hover:border-white/10 transition-all',
            'text-left',
            isOpen && 'ring-2 ring-[--arcane-purple]/30 border-[--arcane-purple]/50'
          )}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white truncate">
                {selectedTimezone?.label || 'Select timezone'}
              </span>
              {selectedTimezone && (
                <span className="text-xs text-[--text-tertiary] shrink-0">
                  ({abbreviation})
                </span>
              )}
            </div>
            {selectedTimezone && (
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-[--text-tertiary]">
                  {selectedTimezone.cities}
                </span>
                {currentTime && (
                  <>
                    <span className="text-xs text-[--text-tertiary]">•</span>
                    <span className="text-xs text-[--arcane-purple] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {currentTime}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
          <ChevronDown className={cn(
            'w-4 h-4 text-[--text-tertiary] transition-transform',
            isOpen && 'transform rotate-180'
          )} />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown menu */}
            <div className={cn(
              'absolute z-50 w-full mt-2',
              'bg-[--bg-secondary] border border-white/[0.06] rounded-xl',
              'shadow-xl shadow-black/30',
              'max-h-[400px] overflow-hidden flex flex-col'
            )}>
              {/* Search */}
              <div className="p-3 border-b border-white/[0.06]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-tertiary]" />
                  <input
                    type="text"
                    placeholder="Search timezones..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={cn(
                      'w-full pl-9 pr-4 py-2',
                      'bg-white/[0.02] border border-white/[0.06] rounded-lg',
                      'text-sm text-white placeholder:text-[--text-tertiary]',
                      'focus:outline-none focus:ring-2 focus:ring-[--arcane-purple]/30 focus:border-[--arcane-purple]/50'
                    )}
                    autoFocus
                  />
                </div>
              </div>

              {/* Timezone list */}
              <div className="overflow-y-auto flex-1 p-2">
                {filteredGroups.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-[--text-tertiary]">
                    No timezones found
                  </div>
                ) : (
                  filteredGroups.map(group => (
                    <div key={group.label} className="mb-2 last:mb-0">
                      <div className="px-3 py-2 text-xs font-medium text-[--text-tertiary] uppercase tracking-wider">
                        {group.label}
                      </div>
                      {group.timezones.map(tz => {
                        const isSelected = tz.value === value
                        const time = formatCurrentTime(tz.value)

                        return (
                          <button
                            key={tz.value}
                            type="button"
                            onClick={() => {
                              onChange(tz.value)
                              setIsOpen(false)
                              setSearchQuery('')
                            }}
                            className={cn(
                              'w-full flex items-center justify-between px-3 py-2 rounded-lg',
                              'text-left transition-all',
                              isSelected
                                ? 'bg-[--arcane-purple]/10 text-[--arcane-purple]'
                                : 'hover:bg-white/[0.04] text-[--text-secondary]'
                            )}
                          >
                            <div>
                              <div className="text-sm font-medium">
                                {tz.label}
                              </div>
                              <div className="text-xs text-[--text-tertiary]">
                                {tz.cities}
                              </div>
                            </div>
                            <div className="text-xs text-[--text-tertiary]">
                              {time}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Schedule utilities for session scheduling
 * Calculates upcoming sessions, session status, and handles exceptions
 */

import { parseTimeString, createDateInTimezone, toISODateString, getDayName } from './timezone-utils'

// Types
export type ScheduleType = 'weekly' | 'biweekly' | 'monthly' | 'adhoc' | 'hiatus'
export type ScheduleMode = 'off' | 'simple' | 'full'
export type AttendanceMode = 'assumed' | 'confirmed'
export type ExceptionType = 'skip' | 'reschedule' | 'confirmed'
export type SessionResponseStatus = 'attending' | 'unavailable' | 'late'

export interface SchedulePattern {
  type: ScheduleType
  day_of_week?: number        // 0-6, Sunday = 0
  week_of_month?: number      // 1-4 for monthly (1st, 2nd, 3rd, 4th week)
  time?: string               // "19:00"
  duration_minutes?: number   // 240
  timezone: string            // "America/New_York"
  location?: string           // "Discord + Roll20"
}

export interface ScheduleSettings {
  mode: ScheduleMode
  attendance_mode?: AttendanceMode
  minimum_players?: number
  auto_skip_below_minimum?: boolean
}

export interface ScheduleException {
  date: string                // "2025-02-04"
  type: ExceptionType
  reason?: string             // "Super Bowl"
  new_date?: string           // For reschedule
  new_time?: string           // For reschedule (optional)
}

export interface ProjectedSession {
  date: Date
  dateString: string          // ISO date string
  dayName: string             // "Tuesday"
  time: string                // "19:00"
  status: 'projected' | 'confirmed' | 'skipped' | 'rescheduled'
  exception?: ScheduleException
  rescheduledTo?: Date        // If this session was rescheduled
  rescheduledFrom?: Date      // If this is a rescheduled session
}

export interface MemberSessionStatus {
  memberId: string
  characterName?: string
  status: SessionResponseStatus
  note?: string
}

export interface SessionStatus {
  status: 'on' | 'on_partial' | 'needs_decision' | 'skipped' | 'not_scheduled'
  statusLabel: string
  statusColor: string
  availableCount: number
  totalCount: number
  unavailable: MemberSessionStatus[]
  late: MemberSessionStatus[]
  warnings: string[]
}

/**
 * Get the default schedule settings
 */
export function getDefaultScheduleSettings(): ScheduleSettings {
  return {
    mode: 'simple',
    attendance_mode: 'assumed',
    minimum_players: 3,
    auto_skip_below_minimum: false,
  }
}

/**
 * Get the default schedule pattern
 */
export function getDefaultSchedulePattern(timezone: string): SchedulePattern {
  return {
    type: 'weekly',
    day_of_week: 2, // Tuesday
    time: '19:00',
    duration_minutes: 240,
    timezone,
    location: '',
  }
}

/**
 * Calculate the next occurrence of a day of week
 */
function getNextDayOfWeek(dayOfWeek: number, startFrom: Date = new Date()): Date {
  const result = new Date(startFrom)
  result.setHours(0, 0, 0, 0)

  const currentDay = result.getDay()
  let daysUntil = dayOfWeek - currentDay

  if (daysUntil <= 0) {
    daysUntil += 7
  }

  result.setDate(result.getDate() + daysUntil)
  return result
}

/**
 * Get the nth occurrence of a day of week in a month
 */
function getNthDayOfMonth(year: number, month: number, dayOfWeek: number, n: number): Date | null {
  const firstDay = new Date(year, month, 1)
  const firstDayOfWeek = firstDay.getDay()

  let daysUntil = dayOfWeek - firstDayOfWeek
  if (daysUntil < 0) daysUntil += 7

  const firstOccurrence = 1 + daysUntil
  const nthOccurrence = firstOccurrence + (n - 1) * 7

  // Check if this date is still in the month
  const result = new Date(year, month, nthOccurrence)
  if (result.getMonth() !== month) return null

  return result
}

/**
 * Calculate upcoming sessions from a pattern
 */
export function getUpcomingSessions(
  pattern: SchedulePattern | null,
  exceptions: ScheduleException[],
  count: number = 4,
  startFrom: Date = new Date()
): ProjectedSession[] {
  if (!pattern || pattern.type === 'adhoc' || pattern.type === 'hiatus') {
    return []
  }

  const sessions: ProjectedSession[] = []
  const { hours, minutes } = parseTimeString(pattern.time || '19:00')
  const today = new Date(startFrom)
  today.setHours(0, 0, 0, 0)

  // Track rescheduled sessions to add them
  const rescheduledSessions: ProjectedSession[] = []

  if (pattern.type === 'weekly' && pattern.day_of_week !== undefined) {
    let currentDate = getNextDayOfWeek(pattern.day_of_week, today)

    // If today is the session day and it's still before the session time, include it
    if (today.getDay() === pattern.day_of_week) {
      const now = new Date()
      const sessionTimeToday = new Date(today)
      sessionTimeToday.setHours(hours, minutes, 0, 0)

      if (now < sessionTimeToday) {
        currentDate = today
      }
    }

    let iterations = 0
    while (sessions.length < count && iterations < count * 3) {
      iterations++
      const dateString = toISODateString(currentDate)
      const exception = exceptions.find(e => e.date === dateString)

      const sessionDate = createDateInTimezone(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate(),
        hours,
        minutes,
        pattern.timezone
      )

      if (exception) {
        if (exception.type === 'skip') {
          sessions.push({
            date: sessionDate,
            dateString,
            dayName: getDayName(pattern.day_of_week),
            time: pattern.time || '19:00',
            status: 'skipped',
            exception,
          })
        } else if (exception.type === 'reschedule' && exception.new_date) {
          // Mark original as rescheduled
          sessions.push({
            date: sessionDate,
            dateString,
            dayName: getDayName(pattern.day_of_week),
            time: pattern.time || '19:00',
            status: 'rescheduled',
            exception,
          })

          // Add the rescheduled session
          const newDate = new Date(exception.new_date)
          const newTime = exception.new_time || pattern.time || '19:00'
          const { hours: newHours, minutes: newMinutes } = parseTimeString(newTime)
          const rescheduledDate = createDateInTimezone(
            newDate.getFullYear(),
            newDate.getMonth(),
            newDate.getDate(),
            newHours,
            newMinutes,
            pattern.timezone
          )

          rescheduledSessions.push({
            date: rescheduledDate,
            dateString: exception.new_date,
            dayName: getDayName(newDate.getDay()),
            time: newTime,
            status: 'projected',
            rescheduledFrom: sessionDate,
          })
        } else if (exception.type === 'confirmed') {
          sessions.push({
            date: sessionDate,
            dateString,
            dayName: getDayName(pattern.day_of_week),
            time: pattern.time || '19:00',
            status: 'confirmed',
            exception,
          })
        }
      } else {
        sessions.push({
          date: sessionDate,
          dateString,
          dayName: getDayName(pattern.day_of_week),
          time: pattern.time || '19:00',
          status: 'projected',
        })
      }

      // Move to next week
      currentDate = new Date(currentDate)
      currentDate.setDate(currentDate.getDate() + 7)
    }
  } else if (pattern.type === 'biweekly' && pattern.day_of_week !== undefined) {
    let currentDate = getNextDayOfWeek(pattern.day_of_week, today)

    // Similar to weekly but skip every other week
    let iterations = 0
    while (sessions.length < count && iterations < count * 4) {
      iterations++
      const dateString = toISODateString(currentDate)
      const exception = exceptions.find(e => e.date === dateString)

      const sessionDate = createDateInTimezone(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate(),
        hours,
        minutes,
        pattern.timezone
      )

      if (exception?.type === 'skip') {
        sessions.push({
          date: sessionDate,
          dateString,
          dayName: getDayName(pattern.day_of_week),
          time: pattern.time || '19:00',
          status: 'skipped',
          exception,
        })
      } else {
        sessions.push({
          date: sessionDate,
          dateString,
          dayName: getDayName(pattern.day_of_week),
          time: pattern.time || '19:00',
          status: exception?.type === 'confirmed' ? 'confirmed' : 'projected',
          exception,
        })
      }

      // Move to next occurrence (2 weeks)
      currentDate = new Date(currentDate)
      currentDate.setDate(currentDate.getDate() + 14)
    }
  } else if (pattern.type === 'monthly' && pattern.day_of_week !== undefined && pattern.week_of_month !== undefined) {
    let currentMonth = today.getMonth()
    let currentYear = today.getFullYear()

    let iterations = 0
    while (sessions.length < count && iterations < count * 3) {
      iterations++
      const nthDay = getNthDayOfMonth(currentYear, currentMonth, pattern.day_of_week, pattern.week_of_month)

      if (nthDay && nthDay >= today) {
        const dateString = toISODateString(nthDay)
        const exception = exceptions.find(e => e.date === dateString)

        const sessionDate = createDateInTimezone(
          nthDay.getFullYear(),
          nthDay.getMonth(),
          nthDay.getDate(),
          hours,
          minutes,
          pattern.timezone
        )

        if (exception?.type === 'skip') {
          sessions.push({
            date: sessionDate,
            dateString,
            dayName: getDayName(pattern.day_of_week),
            time: pattern.time || '19:00',
            status: 'skipped',
            exception,
          })
        } else {
          sessions.push({
            date: sessionDate,
            dateString,
            dayName: getDayName(pattern.day_of_week),
            time: pattern.time || '19:00',
            status: exception?.type === 'confirmed' ? 'confirmed' : 'projected',
            exception,
          })
        }
      }

      // Move to next month
      currentMonth++
      if (currentMonth > 11) {
        currentMonth = 0
        currentYear++
      }
    }
  }

  // Merge in rescheduled sessions and sort by date
  const allSessions = [...sessions, ...rescheduledSessions]
  allSessions.sort((a, b) => a.date.getTime() - b.date.getTime())

  return allSessions.slice(0, count)
}

/**
 * Get the next upcoming session (not skipped)
 */
export function getNextSession(
  pattern: SchedulePattern | null,
  exceptions: ScheduleException[],
  simpleNextDate?: string | null,
  simpleNextTime?: string | null
): ProjectedSession | null {
  // For simple mode, use the manually set date
  if (simpleNextDate) {
    const date = new Date(simpleNextDate)
    const time = simpleNextTime || '19:00'
    const { hours, minutes } = parseTimeString(time)
    date.setHours(hours, minutes, 0, 0)

    return {
      date,
      dateString: simpleNextDate,
      dayName: getDayName(date.getDay()),
      time,
      status: 'projected',
    }
  }

  // For full mode, calculate from pattern
  const upcoming = getUpcomingSessions(pattern, exceptions, 10)

  // Return first session that isn't skipped
  return upcoming.find(s => s.status !== 'skipped' && s.status !== 'rescheduled') || null
}

/**
 * Calculate session status based on member responses
 */
export function calculateSessionStatus(
  members: { id: string; characterName?: string; status: SessionResponseStatus; note?: string }[],
  settings: ScheduleSettings
): SessionStatus {
  const attending = members.filter(m => m.status === 'attending')
  const unavailable = members.filter(m => m.status === 'unavailable')
  const late = members.filter(m => m.status === 'late')

  const availableCount = attending.length + late.length
  const totalCount = members.length
  const minimumPlayers = settings.minimum_players || 3

  const warnings: string[] = []

  // Determine status
  let status: SessionStatus['status']
  let statusLabel: string
  let statusColor: string

  if (totalCount === 0) {
    status = 'not_scheduled'
    statusLabel = 'No players'
    statusColor = 'gray'
  } else if (unavailable.length === 0) {
    status = 'on'
    statusLabel = 'Session On'
    statusColor = 'green'
  } else if (availableCount >= minimumPlayers) {
    status = 'on_partial'
    statusLabel = `On (${unavailable.length} absent)`
    statusColor = 'yellow'
    if (unavailable.length > 0) {
      warnings.push(`${unavailable.length} player${unavailable.length > 1 ? 's' : ''} can't make it`)
    }
  } else {
    status = 'needs_decision'
    statusLabel = 'Needs Decision'
    statusColor = 'orange'
    warnings.push(`Only ${availableCount}/${totalCount} available (minimum: ${minimumPlayers})`)
  }

  return {
    status,
    statusLabel,
    statusColor,
    availableCount,
    totalCount,
    unavailable: unavailable.map(m => ({
      memberId: m.id,
      characterName: m.characterName,
      status: m.status,
      note: m.note,
    })),
    late: late.map(m => ({
      memberId: m.id,
      characterName: m.characterName,
      status: m.status,
      note: m.note,
    })),
    warnings,
  }
}

/**
 * Get human-readable description of a schedule pattern
 */
export function describePattern(pattern: SchedulePattern | null): string {
  if (!pattern) return 'No schedule set'

  switch (pattern.type) {
    case 'weekly':
      return `Every ${getDayName(pattern.day_of_week || 0)} at ${pattern.time ? formatTime(pattern.time) : 'TBD'}`
    case 'biweekly':
      return `Every other ${getDayName(pattern.day_of_week || 0)} at ${pattern.time ? formatTime(pattern.time) : 'TBD'}`
    case 'monthly':
      const weekNames = ['', '1st', '2nd', '3rd', '4th']
      return `${weekNames[pattern.week_of_month || 1]} ${getDayName(pattern.day_of_week || 0)} of each month at ${pattern.time ? formatTime(pattern.time) : 'TBD'}`
    case 'adhoc':
      return 'Sessions scheduled individually'
    case 'hiatus':
      return 'Campaign on hiatus'
    default:
      return 'Unknown schedule'
  }
}

/**
 * Format time for display
 */
function formatTime(time: string): string {
  const { hours, minutes } = parseTimeString(time)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`
}

/**
 * Get schedule mode description
 */
export function describeModeSettings(settings: ScheduleSettings): { title: string; description: string } {
  switch (settings.mode) {
    case 'off':
      return {
        title: 'Scheduling Off',
        description: 'Handle scheduling outside Multiloop',
      }
    case 'simple':
      return {
        title: 'Simple Scheduling',
        description: 'Set next session date & location manually',
      }
    case 'full':
      return {
        title: 'Full Scheduling',
        description: 'Recurring schedule, attendance tracking, exceptions',
      }
    default:
      return {
        title: 'Unknown',
        description: '',
      }
  }
}

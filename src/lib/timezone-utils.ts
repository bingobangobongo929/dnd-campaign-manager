/**
 * Timezone utilities for session scheduling
 * Handles timezone conversion, DST detection, and formatting
 */

// Common timezones grouped by region
export const TIMEZONE_GROUPS = [
  {
    label: 'Americas',
    timezones: [
      { value: 'America/New_York', label: 'Eastern Time (ET)', cities: 'New York, Toronto' },
      { value: 'America/Chicago', label: 'Central Time (CT)', cities: 'Chicago, Dallas' },
      { value: 'America/Denver', label: 'Mountain Time (MT)', cities: 'Denver, Phoenix' },
      { value: 'America/Los_Angeles', label: 'Pacific Time (PT)', cities: 'Los Angeles, Seattle' },
      { value: 'America/Anchorage', label: 'Alaska Time (AKT)', cities: 'Anchorage' },
      { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)', cities: 'Honolulu' },
      { value: 'America/Sao_Paulo', label: 'Brasilia Time (BRT)', cities: 'São Paulo' },
      { value: 'America/Argentina/Buenos_Aires', label: 'Argentina Time (ART)', cities: 'Buenos Aires' },
    ],
  },
  {
    label: 'Europe',
    timezones: [
      { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)', cities: 'London, Dublin' },
      { value: 'Europe/Paris', label: 'Central European Time (CET)', cities: 'Paris, Berlin, Rome' },
      { value: 'Europe/Helsinki', label: 'Eastern European Time (EET)', cities: 'Helsinki, Athens' },
      { value: 'Europe/Moscow', label: 'Moscow Time (MSK)', cities: 'Moscow' },
    ],
  },
  {
    label: 'Asia & Pacific',
    timezones: [
      { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST)', cities: 'Dubai' },
      { value: 'Asia/Kolkata', label: 'India Standard Time (IST)', cities: 'Mumbai, Delhi' },
      { value: 'Asia/Singapore', label: 'Singapore Time (SGT)', cities: 'Singapore' },
      { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)', cities: 'Tokyo' },
      { value: 'Asia/Shanghai', label: 'China Standard Time (CST)', cities: 'Shanghai, Beijing' },
      { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)', cities: 'Sydney, Melbourne' },
      { value: 'Australia/Perth', label: 'Australian Western Time (AWT)', cities: 'Perth' },
      { value: 'Pacific/Auckland', label: 'New Zealand Time (NZT)', cities: 'Auckland' },
    ],
  },
]

// Flat list for easy lookup
export const ALL_TIMEZONES = TIMEZONE_GROUPS.flatMap(g => g.timezones)

/**
 * Get user's timezone from settings or browser
 */
export function getUserTimezone(userTimezone?: string | null): string {
  if (userTimezone) return userTimezone

  // Try to detect from browser
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'America/New_York' // Fallback
  }
}

/**
 * Get timezone display info
 */
export function getTimezoneInfo(timezone: string): { label: string; cities: string } | null {
  const tz = ALL_TIMEZONES.find(t => t.value === timezone)
  if (tz) return { label: tz.label, cities: tz.cities }
  return null
}

/**
 * Get current time in a timezone
 */
export function getCurrentTimeInTimezone(timezone: string): Date {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(now)
  const get = (type: string) => parts.find(p => p.type === type)?.value || '0'

  return new Date(
    parseInt(get('year')),
    parseInt(get('month')) - 1,
    parseInt(get('day')),
    parseInt(get('hour')),
    parseInt(get('minute')),
    parseInt(get('second'))
  )
}

/**
 * Format current time for display
 */
export function formatCurrentTime(timezone: string): string {
  const now = new Date()
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(now)
}

/**
 * Get timezone abbreviation (e.g., "EST", "PST", "GMT")
 */
export function getTimezoneAbbreviation(timezone: string, date?: Date): string {
  const d = date || new Date()
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'short',
  })

  const parts = formatter.formatToParts(d)
  return parts.find(p => p.type === 'timeZoneName')?.value || timezone
}

/**
 * Get UTC offset in hours for a timezone at a specific date
 */
export function getUtcOffset(timezone: string, date: Date): number {
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }))
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }))
  return (tzDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60)
}

/**
 * Convert a time from one timezone to another
 */
export function convertTime(
  date: Date,
  fromTimezone: string,
  toTimezone: string
): Date {
  // Get the time string in the source timezone
  const sourceTime = date.toLocaleString('en-US', { timeZone: fromTimezone })
  const sourceDate = new Date(sourceTime)

  // Get the same moment in target timezone
  const targetTime = new Date(date.toLocaleString('en-US', { timeZone: toTimezone }))

  // Calculate the offset difference
  const fromOffset = getUtcOffset(fromTimezone, date)
  const toOffset = getUtcOffset(toTimezone, date)
  const offsetDiff = toOffset - fromOffset

  // Apply offset
  return new Date(sourceDate.getTime() + offsetDiff * 60 * 60 * 1000)
}

/**
 * Create a date in a specific timezone
 */
export function createDateInTimezone(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timezone: string
): Date {
  // Create date string and parse in the target timezone
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`

  // This creates a date object representing that moment in UTC
  const localDate = new Date(dateStr)
  const utcDate = new Date(localDate.toLocaleString('en-US', { timeZone: 'UTC' }))
  const tzDate = new Date(localDate.toLocaleString('en-US', { timeZone: timezone }))
  const offset = utcDate.getTime() - tzDate.getTime()

  return new Date(localDate.getTime() + offset)
}

/**
 * Parse a time string like "19:00" into hours and minutes
 */
export function parseTimeString(time: string): { hours: number; minutes: number } {
  const [hours, minutes] = time.split(':').map(Number)
  return { hours: hours || 0, minutes: minutes || 0 }
}

/**
 * Format a date for session display
 */
export interface FormattedSessionTime {
  date: string           // "Tuesday, January 28"
  time: string           // "7:00 PM"
  fullDateTime: string   // "Tuesday, January 28 at 7:00 PM"
  timezone: string       // "EST"
  isDstShift: boolean    // True if DST causes unusual offset
  dstWarning?: string    // Warning message if applicable
}

export function formatSessionTime(
  sessionDate: Date,
  campaignTimezone: string,
  userTimezone: string
): FormattedSessionTime {
  // Format in user's timezone
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: userTimezone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: userTimezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  const date = dateFormatter.format(sessionDate)
  const time = timeFormatter.format(sessionDate)
  const timezone = getTimezoneAbbreviation(userTimezone, sessionDate)

  // Check for DST shift
  const dstInfo = detectDstShift(sessionDate, campaignTimezone, userTimezone)

  return {
    date,
    time,
    fullDateTime: `${date} at ${time}`,
    timezone,
    isDstShift: dstInfo !== null,
    dstWarning: dstInfo?.warning,
  }
}

/**
 * Detect if there's a DST shift affecting the session time
 * This happens when one timezone changes clocks but the other hasn't yet
 */
export interface DstShiftInfo {
  direction: 'earlier' | 'later'
  hoursDifference: number
  warning: string
}

export function detectDstShift(
  sessionDate: Date,
  campaignTimezone: string,
  userTimezone: string
): DstShiftInfo | null {
  if (campaignTimezone === userTimezone) return null

  // Get the offset now and at the session date
  const now = new Date()
  const currentCampaignOffset = getUtcOffset(campaignTimezone, now)
  const currentUserOffset = getUtcOffset(userTimezone, now)
  const currentDiff = currentUserOffset - currentCampaignOffset

  const sessionCampaignOffset = getUtcOffset(campaignTimezone, sessionDate)
  const sessionUserOffset = getUtcOffset(userTimezone, sessionDate)
  const sessionDiff = sessionUserOffset - sessionCampaignOffset

  // If the offset difference changed, there's a DST shift
  const shiftHours = sessionDiff - currentDiff

  if (Math.abs(shiftHours) >= 0.5) { // At least 30 minutes difference
    const direction = shiftHours > 0 ? 'later' : 'earlier'
    const hours = Math.abs(shiftHours)

    return {
      direction,
      hoursDifference: hours,
      warning: `Due to daylight saving time changes, this session is ${hours} hour${hours !== 1 ? 's' : ''} ${direction} than usual in your timezone.`,
    }
  }

  return null
}

/**
 * Get the day of week name
 */
export function getDayName(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[dayOfWeek] || 'Unknown'
}

/**
 * Get short day name
 */
export function getShortDayName(dayOfWeek: number): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return days[dayOfWeek] || '???'
}

/**
 * Format a time string (e.g., "19:00") to display format
 */
export function formatTime24to12(time: string): string {
  const { hours, minutes } = parseTimeString(time)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`
}

/**
 * Format a date as ISO string for storage (YYYY-MM-DD)
 */
export function toISODateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Parse an ISO date string
 */
export function fromISODateString(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00')
}

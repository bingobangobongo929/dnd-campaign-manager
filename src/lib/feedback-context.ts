'use client'

import type { BrowserInfo, ConsoleError, NavigationEntry } from '@/types/database'

// Session start time
let sessionStartTime: number | null = null

// Store for console errors
const consoleErrors: ConsoleError[] = []
const MAX_CONSOLE_ERRORS = 10

// Store for navigation history
const navigationHistory: NavigationEntry[] = []
const MAX_NAVIGATION_HISTORY = 5

/**
 * Initialize context tracking - call this once in your app layout
 */
export function initFeedbackContextTracking() {
  if (typeof window === 'undefined') return

  // Track session start
  sessionStartTime = Date.now()

  // Intercept console errors
  const originalError = console.error
  console.error = (...args: unknown[]) => {
    const error: ConsoleError = {
      message: args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' '),
      timestamp: new Date().toISOString(),
    }

    // Try to extract stack trace
    if (args[0] instanceof Error) {
      error.stack = args[0].stack
    }

    consoleErrors.push(error)
    if (consoleErrors.length > MAX_CONSOLE_ERRORS) {
      consoleErrors.shift()
    }

    originalError.apply(console, args)
  }

  // Track global errors
  window.addEventListener('error', (event) => {
    const error: ConsoleError = {
      message: event.message,
      source: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      timestamp: new Date().toISOString(),
      stack: event.error?.stack,
    }

    consoleErrors.push(error)
    if (consoleErrors.length > MAX_CONSOLE_ERRORS) {
      consoleErrors.shift()
    }
  })

  // Track unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error: ConsoleError = {
      message: `Unhandled Promise Rejection: ${event.reason?.message || String(event.reason)}`,
      timestamp: new Date().toISOString(),
      stack: event.reason?.stack,
    }

    consoleErrors.push(error)
    if (consoleErrors.length > MAX_CONSOLE_ERRORS) {
      consoleErrors.shift()
    }
  })

  // Track navigation (initial page)
  trackNavigation()

  // Track navigation changes with popstate (browser back/forward)
  window.addEventListener('popstate', () => {
    setTimeout(trackNavigation, 100) // Small delay to allow title update
  })
}

/**
 * Track a navigation event - call this when the route changes
 */
export function trackNavigation() {
  if (typeof window === 'undefined') return

  const entry: NavigationEntry = {
    url: window.location.pathname,
    title: document.title,
    timestamp: new Date().toISOString(),
  }

  // Don't add duplicate entries for the same URL
  const lastEntry = navigationHistory[navigationHistory.length - 1]
  if (lastEntry?.url === entry.url) return

  navigationHistory.push(entry)
  if (navigationHistory.length > MAX_NAVIGATION_HISTORY) {
    navigationHistory.shift()
  }
}

/**
 * Get browser information
 */
export function getBrowserInfo(): BrowserInfo {
  if (typeof window === 'undefined') {
    return {
      name: 'Unknown',
      version: 'Unknown',
      os: 'Unknown',
      osVersion: 'Unknown',
      device: 'desktop',
      userAgent: '',
    }
  }

  const ua = navigator.userAgent

  // Parse browser name and version
  let browserName = 'Unknown'
  let browserVersion = 'Unknown'

  if (ua.includes('Firefox/')) {
    browserName = 'Firefox'
    browserVersion = ua.match(/Firefox\/(\d+\.\d+)/)?.[1] || 'Unknown'
  } else if (ua.includes('Edg/')) {
    browserName = 'Edge'
    browserVersion = ua.match(/Edg\/(\d+\.\d+)/)?.[1] || 'Unknown'
  } else if (ua.includes('Chrome/')) {
    browserName = 'Chrome'
    browserVersion = ua.match(/Chrome\/(\d+\.\d+)/)?.[1] || 'Unknown'
  } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    browserName = 'Safari'
    browserVersion = ua.match(/Version\/(\d+\.\d+)/)?.[1] || 'Unknown'
  }

  // Parse OS
  let os = 'Unknown'
  let osVersion = 'Unknown'

  if (ua.includes('Windows')) {
    os = 'Windows'
    if (ua.includes('Windows NT 10.0')) osVersion = '10/11'
    else if (ua.includes('Windows NT 6.3')) osVersion = '8.1'
    else if (ua.includes('Windows NT 6.2')) osVersion = '8'
    else if (ua.includes('Windows NT 6.1')) osVersion = '7'
  } else if (ua.includes('Mac OS X')) {
    os = 'macOS'
    osVersion = ua.match(/Mac OS X (\d+[._]\d+)/)?.[1]?.replace('_', '.') || 'Unknown'
  } else if (ua.includes('Linux')) {
    os = 'Linux'
  } else if (ua.includes('Android')) {
    os = 'Android'
    osVersion = ua.match(/Android (\d+\.\d+)/)?.[1] || 'Unknown'
  } else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) {
    os = 'iOS'
    osVersion = ua.match(/OS (\d+_\d+)/)?.[1]?.replace('_', '.') || 'Unknown'
  }

  // Detect device type
  let device: 'desktop' | 'mobile' | 'tablet' = 'desktop'
  if (/Mobi|Android/i.test(ua)) {
    device = 'mobile'
  } else if (/Tablet|iPad/i.test(ua)) {
    device = 'tablet'
  }

  return {
    name: browserName,
    version: browserVersion,
    os,
    osVersion,
    device,
    userAgent: ua,
  }
}

/**
 * Get screen resolution
 */
export function getScreenResolution(): string {
  if (typeof window === 'undefined') return 'Unknown'
  return `${window.screen.width}x${window.screen.height}`
}

/**
 * Get viewport size
 */
export function getViewportSize(): string {
  if (typeof window === 'undefined') return 'Unknown'
  return `${window.innerWidth}x${window.innerHeight}`
}

/**
 * Get session duration in seconds
 */
export function getSessionDuration(): number {
  if (!sessionStartTime) return 0
  return Math.floor((Date.now() - sessionStartTime) / 1000)
}

/**
 * Get network status
 */
export function getNetworkStatus(): string {
  if (typeof navigator === 'undefined') return 'Unknown'
  return navigator.onLine ? 'Online' : 'Offline'
}

/**
 * Get captured console errors
 */
export function getConsoleErrors(): ConsoleError[] {
  return [...consoleErrors]
}

/**
 * Get navigation history
 */
export function getNavigationHistory(): NavigationEntry[] {
  return [...navigationHistory]
}

/**
 * Get the current route pattern (e.g., /vault/[id] instead of /vault/abc123)
 */
export function getCurrentRoute(): string {
  if (typeof window === 'undefined') return 'Unknown'

  const path = window.location.pathname

  // Replace UUIDs with [id]
  const withReplacedUuids = path.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    '[id]'
  )

  // Replace other common patterns (numeric IDs, etc.)
  const withReplacedIds = withReplacedUuids.replace(
    /\/\d+(?=\/|$)/g,
    '/[id]'
  )

  return withReplacedIds
}

/**
 * Capture all context at once - call this when submitting feedback
 */
export function captureAllContext() {
  // Track current page before capturing
  trackNavigation()

  return {
    currentUrl: typeof window !== 'undefined' ? window.location.href : '',
    currentRoute: getCurrentRoute(),
    browserInfo: getBrowserInfo(),
    screenResolution: getScreenResolution(),
    viewportSize: getViewportSize(),
    sessionDurationSeconds: getSessionDuration(),
    consoleErrors: getConsoleErrors(),
    networkStatus: getNetworkStatus(),
    navigationHistory: getNavigationHistory(),
    appVersion: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  }
}

/**
 * Clear console errors - useful for testing
 */
export function clearConsoleErrors() {
  consoleErrors.length = 0
}

/**
 * Clear navigation history - useful for testing
 */
export function clearNavigationHistory() {
  navigationHistory.length = 0
}

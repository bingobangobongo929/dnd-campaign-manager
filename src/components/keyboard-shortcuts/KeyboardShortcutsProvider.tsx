'use client'

import { useEffect, useRef, ReactNode, useCallback, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useUserSettings } from '@/hooks'
import { isAdmin } from '@/lib/admin'

// Navigation shortcuts that use G+[key] sequence
const NAVIGATION_SHORTCUTS: Record<string, string> = {
  'h': '/home',
  'c': '/campaigns',
  'a': '/adventures',
  'o': '/oneshots',
  'v': '/vault',
  's': '/settings',
}

// Admin shortcut - only for admins
const ADMIN_SHORTCUT = 'd' // G+D for admin dashboard

interface KeyboardShortcutsProviderProps {
  children: ReactNode
}

export function KeyboardShortcutsProvider({ children }: KeyboardShortcutsProviderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { settings } = useUserSettings()
  const showAdmin = settings?.role && isAdmin(settings.role)

  // Track if 'G' was pressed recently for two-key shortcuts
  const gPressedRef = useRef(false)
  const gTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Help modal state - we'll trigger this via custom event
  const [, setShowHelp] = useState(false)

  // Clear the G pressed state after a timeout
  const clearGPressed = useCallback(() => {
    gPressedRef.current = false
    if (gTimeoutRef.current) {
      clearTimeout(gTimeoutRef.current)
      gTimeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts if user is typing in an input or textarea
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      const key = e.key.toLowerCase()

      // Handle ? for help
      if (key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        // Dispatch a custom event that the settings page (or a help modal) can listen to
        window.dispatchEvent(new CustomEvent('show-keyboard-help'))
        return
      }

      // Handle Ctrl/Cmd+K for quick search
      if ((e.ctrlKey || e.metaKey) && key === 'k') {
        e.preventDefault()
        // Dispatch a custom event for quick search
        window.dispatchEvent(new CustomEvent('open-quick-search'))
        return
      }

      // Handle G key for navigation sequence
      if (key === 'g' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (!gPressedRef.current) {
          gPressedRef.current = true
          // Clear after 1 second
          gTimeoutRef.current = setTimeout(clearGPressed, 1000)
        }
        return
      }

      // Handle second key in G+[key] sequence
      if (gPressedRef.current && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const destination = NAVIGATION_SHORTCUTS[key]

        // Check for admin shortcut
        if (key === ADMIN_SHORTCUT && showAdmin) {
          e.preventDefault()
          clearGPressed()
          router.push('/admin')
          return
        }

        if (destination) {
          e.preventDefault()
          clearGPressed()

          // Don't navigate if already on the page
          if (pathname !== destination) {
            router.push(destination)
          }
          return
        }

        // Invalid second key, clear the G state
        clearGPressed()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (gTimeoutRef.current) {
        clearTimeout(gTimeoutRef.current)
      }
    }
  }, [router, pathname, showAdmin, clearGPressed])

  return <>{children}</>
}

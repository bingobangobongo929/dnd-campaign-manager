'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { initFeedbackContextTracking, trackNavigation } from '@/lib/feedback-context'
import type { FeedbackType } from '@/types/database'

interface FeedbackContextValue {
  isOpen: boolean
  openFeedback: (type?: FeedbackType) => void
  closeFeedback: () => void
  preselectedType: FeedbackType | null
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null)

export function useFeedback() {
  const context = useContext(FeedbackContext)
  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider')
  }
  return context
}

interface FeedbackProviderProps {
  children: ReactNode
}

export function FeedbackProvider({ children }: FeedbackProviderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [preselectedType, setPreselectedType] = useState<FeedbackType | null>(null)

  // Initialize context tracking on mount
  useEffect(() => {
    initFeedbackContextTracking()
  }, [])

  // Track navigation on route changes
  useEffect(() => {
    // Track initial page
    trackNavigation()

    // For Next.js App Router, we can use MutationObserver to detect URL changes
    // since popstate doesn't fire for client-side navigation
    let lastUrl = window.location.href
    const observer = new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href
        trackNavigation()
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    return () => observer.disconnect()
  }, [])

  // Keyboard shortcut: Ctrl/Cmd + Shift + F
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        setIsOpen(true)
        setPreselectedType(null)
      }
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [])

  const openFeedback = useCallback((type?: FeedbackType) => {
    setPreselectedType(type || null)
    setIsOpen(true)
  }, [])

  const closeFeedback = useCallback(() => {
    setIsOpen(false)
    setPreselectedType(null)
  }, [])

  return (
    <FeedbackContext.Provider value={{ isOpen, openFeedback, closeFeedback, preselectedType }}>
      {children}
    </FeedbackContext.Provider>
  )
}

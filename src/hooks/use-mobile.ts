'use client'

import { useState, useEffect } from 'react'

const MOBILE_BREAKPOINT = 768

/**
 * Hook to detect if the current device is mobile (iPhone-sized)
 * Returns true for screens <= 768px width
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Check initial value
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT)
    }

    // Set initial value
    checkMobile()

    // Listen for resize events
    window.addEventListener('resize', checkMobile)

    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
}

/**
 * Hook to detect device orientation
 */
export function useOrientation(): 'portrait' | 'landscape' {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')

  useEffect(() => {
    const checkOrientation = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape')
    }

    checkOrientation()
    window.addEventListener('resize', checkOrientation)

    return () => window.removeEventListener('resize', checkOrientation)
  }, [])

  return orientation
}

/**
 * Hook to get safe area insets for iOS devices
 */
export function useSafeArea() {
  const [safeArea, setSafeArea] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  })

  useEffect(() => {
    const updateSafeArea = () => {
      const computedStyle = getComputedStyle(document.documentElement)
      setSafeArea({
        top: parseInt(computedStyle.getPropertyValue('--sat') || '0', 10),
        right: parseInt(computedStyle.getPropertyValue('--sar') || '0', 10),
        bottom: parseInt(computedStyle.getPropertyValue('--sab') || '0', 10),
        left: parseInt(computedStyle.getPropertyValue('--sal') || '0', 10),
      })
    }

    // Set CSS custom properties for safe area insets
    document.documentElement.style.setProperty('--sat', 'env(safe-area-inset-top, 0px)')
    document.documentElement.style.setProperty('--sar', 'env(safe-area-inset-right, 0px)')
    document.documentElement.style.setProperty('--sab', 'env(safe-area-inset-bottom, 0px)')
    document.documentElement.style.setProperty('--sal', 'env(safe-area-inset-left, 0px)')

    updateSafeArea()
  }, [])

  return safeArea
}

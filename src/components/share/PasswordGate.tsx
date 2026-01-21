'use client'

import { useState, useEffect } from 'react'
import { PasswordEntryForm } from './PasswordEntryForm'

interface PasswordGateProps {
  shareCode: string
  requiresPassword: boolean
  contentName?: string
  children: React.ReactNode
}

/**
 * Client-side wrapper that gates content behind password verification.
 * Checks sessionStorage for a valid verification token before showing content.
 */
export function PasswordGate({ shareCode, requiresPassword, contentName, children }: PasswordGateProps) {
  const [isVerified, setIsVerified] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    if (!requiresPassword) {
      setIsVerified(true)
      setIsChecking(false)
      return
    }

    // Check sessionStorage for verification token
    const token = sessionStorage.getItem(`share_verified_${shareCode}`)
    if (token) {
      try {
        const decoded = JSON.parse(atob(token))
        // Check if token is still valid (not expired)
        if (decoded.expiresAt && decoded.expiresAt > Date.now()) {
          setIsVerified(true)
        }
      } catch {
        // Invalid token, clear it
        sessionStorage.removeItem(`share_verified_${shareCode}`)
      }
    }
    setIsChecking(false)
  }, [shareCode, requiresPassword])

  const handleVerified = (token: string) => {
    // Token is already stored in sessionStorage by PasswordEntryForm
    setIsVerified(true)
  }

  // Still checking verification status
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Password required but not verified
  if (requiresPassword && !isVerified) {
    return (
      <PasswordEntryForm
        shareCode={shareCode}
        contentName={contentName}
        onSuccess={handleVerified}
      />
    )
  }

  // Verified or no password required - show content
  return <>{children}</>
}

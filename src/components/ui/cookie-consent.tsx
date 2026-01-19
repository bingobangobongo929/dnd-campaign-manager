'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Cookie, X } from 'lucide-react'

const COOKIE_CONSENT_KEY = 'cookie_consent'

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!consent) {
      // Small delay to prevent flash on page load
      const timer = setTimeout(() => setShowBanner(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
      accepted: true,
      timestamp: new Date().toISOString(),
    }))
    setShowBanner(false)
  }

  const handleDecline = () => {
    // Even with decline, essential cookies are still used
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
      accepted: false,
      essentialOnly: true,
      timestamp: new Date().toISOString(),
    }))
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-[#1a1a24] border border-white/10 rounded-2xl shadow-2xl p-4 sm:p-6">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="hidden sm:flex shrink-0 w-10 h-10 rounded-xl bg-purple-500/10 items-center justify-center">
              <Cookie className="w-5 h-5 text-purple-400" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-white mb-1">
                    Cookie Notice
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    We use only essential cookies required for the service to function (authentication).
                    We use privacy-focused analytics that don&apos;t require cookies.{' '}
                    <Link href="/cookies" className="text-[--arcane-purple] hover:underline">
                      Learn more
                    </Link>
                  </p>
                </div>

                {/* Close button (mobile) */}
                <button
                  onClick={handleDecline}
                  className="sm:hidden p-1 text-gray-500 hover:text-gray-300 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4">
                <button
                  onClick={handleAccept}
                  className="px-4 py-2.5 bg-[--arcane-purple] hover:bg-[--arcane-purple]/90 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Accept All
                </button>
                <button
                  onClick={handleDecline}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium rounded-lg transition-colors border border-white/10"
                >
                  Essential Only
                </button>
                <Link
                  href="/privacy"
                  className="px-4 py-2.5 text-gray-400 hover:text-white text-sm font-medium text-center transition-colors"
                >
                  Privacy Policy
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

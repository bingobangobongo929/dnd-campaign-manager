'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { SaveToCollectionButton } from '@/components/templates'
import { FounderIndicator } from '@/components/membership'

interface SharePageHeaderProps {
  contentType?: 'character' | 'campaign' | 'oneshot'
  contentName?: string
  // Author info
  authorName?: string
  isFounder?: boolean
  // Template save functionality
  allowSave?: boolean
  snapshotId?: string | null
  isLoggedIn?: boolean
  isSaved?: boolean
}

export function SharePageHeader({
  contentType,
  contentName,
  authorName,
  isFounder = false,
  allowSave = false,
  snapshotId,
  isLoggedIn = false,
  isSaved = false,
}: SharePageHeaderProps) {
  // Can only show save button if allowSave is true and we have a snapshot
  const canSave = allowSave && snapshotId

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0a0a0f]/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Left: Back to home */}
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium hidden sm:inline">Multiloop</span>
          </Link>

          {/* Center: Content info (optional) */}
          {contentType && contentName && (
            <div className="hidden md:flex items-center gap-2 text-sm">
              <span className="text-gray-500 capitalize">{contentType}:</span>
              <span className="text-gray-300 truncate max-w-[200px]">{contentName}</span>
              {authorName && (
                <>
                  <span className="text-gray-600">•</span>
                  <span className="text-gray-400 flex items-center gap-1">
                    by {authorName}
                    {isFounder && <FounderIndicator />}
                  </span>
                </>
              )}
            </div>
          )}

          {/* Right: Auth buttons + Save CTA */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Show save button only for templates with allowSave enabled */}
            {canSave ? (
              <SaveToCollectionButton
                snapshotId={snapshotId}
                isLoggedIn={isLoggedIn}
                isSaved={isSaved}
                size="sm"
              />
            ) : (
              // Show sign-in/get started for non-saveable content
              <>
                <Link
                  href="/login"
                  className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5"
                >
                  Sign In
                </Link>
                <Link
                  href="/login"
                  className="text-sm font-medium px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

'use client'

import Link from 'next/link'
import Image from 'next/image'
import { SaveToCollectionButton } from '@/components/templates'
import { FounderIndicator } from '@/components/membership'
import { getInitials } from '@/lib/utils'

interface SharePageHeaderProps {
  contentType?: 'character' | 'campaign' | 'oneshot'
  contentName?: string
  // Author info
  authorName?: string
  authorAvatar?: string | null
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
  authorAvatar,
  isFounder = false,
  allowSave = false,
  snapshotId,
  isLoggedIn = false,
  isSaved = false,
}: SharePageHeaderProps) {
  // Can only show save button if allowSave is true and we have a snapshot
  const canSave = allowSave && snapshotId

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0a0a0f]/95 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Left: Logo + Brand */}
          <Link
            href="/"
            className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg overflow-hidden shadow-lg shadow-purple-500/20">
              <img src="/icons/icon-192x192.png" alt="Multiloop" className="w-full h-full object-cover" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-white">Multiloop</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                BETA
              </span>
            </div>
          </Link>

          {/* Center: Content info (optional) */}
          {contentType && contentName && (
            <div className="hidden md:flex items-center gap-2 text-sm">
              <span className="text-gray-500 capitalize">{contentType}:</span>
              <span className="text-gray-300 truncate max-w-[200px]">{contentName}</span>
              {authorName && (
                <>
                  <span className="text-gray-600">•</span>
                  <span className="text-gray-400 flex items-center gap-1.5">
                    {authorAvatar ? (
                      <Image
                        src={authorAvatar}
                        alt={authorName}
                        width={20}
                        height={20}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-[10px] font-medium">
                        {getInitials(authorName)}
                      </span>
                    )}
                    <span>by {authorName}</span>
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
            ) : !isLoggedIn ? (
              // Show sign-in/join waitlist for non-logged-in users only
              <>
                <Link
                  href="/login"
                  className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5"
                >
                  Sign In
                </Link>
                <Link
                  href="/#waitlist"
                  className="text-sm font-medium px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white transition-all shadow-lg shadow-purple-500/20"
                >
                  Join Waitlist
                </Link>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  )
}

'use client'

import Link from 'next/link'
import { ArrowLeft, Bookmark } from 'lucide-react'

interface SharePageHeaderProps {
  contentType?: 'character' | 'campaign' | 'oneshot'
  contentName?: string
}

export function SharePageHeader({ contentType, contentName }: SharePageHeaderProps) {
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
            </div>
          )}

          {/* Right: Auth buttons + Save CTA */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm text-purple-400 hover:text-purple-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-purple-500/10"
            >
              <Bookmark className="w-4 h-4" />
              <span>Save to Collection</span>
            </Link>
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
          </div>
        </div>
      </div>
    </header>
  )
}

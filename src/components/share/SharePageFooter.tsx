'use client'

import Link from 'next/link'
import { Sparkles, Users, BookOpen, Scroll } from 'lucide-react'

interface SharePageFooterProps {
  contentType: 'character' | 'campaign' | 'oneshot'
  isLoggedIn: boolean
}

const CONTENT_CONFIG = {
  character: {
    icon: Users,
    heading: 'Create your own characters',
    description: 'Build rich backstories, track relationships, and share your creations with your party.',
    cta: 'Start for free',
  },
  campaign: {
    icon: BookOpen,
    heading: 'Run your own campaigns',
    description: 'Track sessions, manage NPCs, build your world, and keep everything organized in one place.',
    cta: 'Start for free',
  },
  oneshot: {
    icon: Scroll,
    heading: 'Create your own one-shots',
    description: 'Plan adventures, prepare handouts, and share everything your players need in one link.',
    cta: 'Start for free',
  },
}

export function SharePageFooter({ contentType, isLoggedIn }: SharePageFooterProps) {
  // Don't show banner if user is logged in
  if (isLoggedIn) {
    return (
      <footer className="border-t border-white/[0.06] py-8">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm text-gray-600">
            Created with <span className="text-purple-400">Multiloop</span>
          </p>
        </div>
      </footer>
    )
  }

  const config = CONTENT_CONFIG[contentType]
  const Icon = config.icon

  return (
    <footer className="border-t border-white/[0.06]">
      {/* CTA Banner */}
      <div className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 via-indigo-900/20 to-purple-900/20" />
        <div className="absolute inset-0 bg-[#0a0a0f]/50" />

        {/* Decorative elements */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto px-6 py-12 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 mb-4">
            <Icon className="w-6 h-6 text-purple-400" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-3">
            {config.heading}
          </h2>

          <p className="text-gray-400 max-w-md mx-auto mb-6">
            {config.description}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-purple-500/25"
            >
              <Sparkles className="w-4 h-4" />
              {config.cta}
            </Link>
            <Link
              href="/"
              className="text-sm text-gray-400 hover:text-white transition-colors px-4 py-2"
            >
              Learn more about Multiloop
            </Link>
          </div>
        </div>
      </div>

      {/* Simple footer */}
      <div className="bg-[#0a0a0f] py-4">
        <p className="text-center text-xs text-gray-600">
          Forge stories. Track adventures. Remember legends.
        </p>
      </div>
    </footer>
  )
}

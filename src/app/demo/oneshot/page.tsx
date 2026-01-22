import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  Crown,
  Users,
  Clock,
  BookOpen,
  ArrowLeft,
  Sparkles,
  Target,
} from 'lucide-react'
import { MarkdownContent } from '@/components/ui'
import type { Metadata } from 'next'

// Demo oneshot ID from migration
const DEMO_ONESHOT_ID = '00000000-0000-0000-0003-000000000001'

export const metadata: Metadata = {
  title: 'Demo One-Shot: The Night Market | Multiloop',
  description: 'Explore a ready-to-run one-shot adventure with encounters and NPCs.',
}

export default async function DemoOneshotPage() {
  const supabase = await createClient()

  // Fetch demo oneshot (public RLS policy allows this)
  const { data: oneshot, error: oneshotError } = await supabase
    .from('oneshots')
    .select('*')
    .eq('id', DEMO_ONESHOT_ID)
    .eq('is_demo', true)
    .single()

  if (oneshotError || !oneshot) {
    console.error('Demo oneshot not found:', oneshotError)
    notFound()
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0a0a0f]/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link
              href="/"
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back to Home</span>
            </Link>

            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-medium text-amber-300">Demo Content</span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
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
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="relative">
        {oneshot.image_url ? (
          <div className="h-64 md:h-80 relative">
            <Image
              src={oneshot.image_url}
              alt={oneshot.title}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0f]/50 to-[#0a0a0f]" />
          </div>
        ) : (
          <div className="h-48 md:h-64 bg-gradient-to-b from-amber-900/30 to-transparent" />
        )}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-10">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center shadow-xl overflow-hidden">
              {oneshot.image_url ? (
                <Image
                  src={oneshot.image_url}
                  alt={oneshot.title}
                  width={80}
                  height={80}
                  className="object-cover w-full h-full"
                />
              ) : (
                <Crown className="w-10 h-10 text-white" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  {oneshot.game_system || 'D&D 5e'}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{oneshot.title}</h1>
              {oneshot.tagline && (
                <p className="text-lg text-amber-400 italic mb-3">{oneshot.tagline}</p>
              )}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                {(oneshot.player_count_min || oneshot.player_count_max) && (
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    {oneshot.player_count_min}-{oneshot.player_count_max} players
                  </span>
                )}
                {oneshot.estimated_duration && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {oneshot.estimated_duration}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* Introduction */}
        {oneshot.introduction && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <BookOpen className="w-5 h-5 text-amber-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">Introduction</h2>
            </div>
            <div className="p-6 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <MarkdownContent content={oneshot.introduction} />
            </div>
          </section>
        )}

        {/* Session Plan */}
        {oneshot.session_plan && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <Target className="w-5 h-5 text-red-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">Session Plan</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                DM Only
              </span>
            </div>
            <div className="p-6 rounded-xl bg-red-500/5 border border-red-500/20">
              <MarkdownContent content={oneshot.session_plan} />
            </div>
          </section>
        )}

        {/* Key NPCs */}
        {oneshot.key_npcs && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Users className="w-5 h-5 text-purple-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">Key NPCs</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                DM Only
              </span>
            </div>
            <div className="p-6 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <MarkdownContent content={oneshot.key_npcs} />
            </div>
          </section>
        )}

        {/* CTA */}
        <div className="text-center py-12 border-t border-white/[0.06]">
          <h3 className="text-2xl font-bold text-white mb-4">Ready to Create Your Own One-Shots?</h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Join the waitlist to become a Founding Member and organize your adventures.
          </p>
          <Link
            href="/#waitlist"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 hover:shadow-lg hover:shadow-purple-500/25 transition-all"
          >
            <Sparkles className="w-5 h-5" />
            Join the Waitlist
          </Link>
        </div>
      </div>
    </div>
  )
}

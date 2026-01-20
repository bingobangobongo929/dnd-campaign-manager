import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  Users,
  BookOpen,
  ArrowLeft,
  Sparkles,
  Heart,
  User,
  Shield,
  Scroll,
} from 'lucide-react'
import type { Metadata } from 'next'

// Demo character ID from migration
const DEMO_CHARACTER_ID = '00000000-0000-0000-0002-000000000001'

export const metadata: Metadata = {
  title: 'Demo Character: Lyra Silvervane | Multiloop',
  description: 'Explore a detailed character vault example with backstory, relationships, and play journal.',
}

export default async function DemoCharacterPage() {
  const supabase = await createClient()

  // Fetch demo character (public RLS policy allows this)
  const { data: character, error: characterError } = await supabase
    .from('vault_characters')
    .select('*')
    .eq('id', DEMO_CHARACTER_ID)
    .eq('is_demo', true)
    .single()

  if (characterError || !character) {
    console.error('Demo character not found:', characterError)
    notFound()
  }

  // Fetch related data
  const [
    { data: relationships },
    { data: journals },
  ] = await Promise.all([
    supabase
      .from('vault_character_relationships')
      .select('*')
      .eq('character_id', DEMO_CHARACTER_ID)
      .order('created_at'),
    supabase
      .from('play_journal')
      .select('*')
      .eq('character_id', DEMO_CHARACTER_ID)
      .order('session_date', { ascending: false }),
  ])

  const partyMembers = relationships?.filter(r => r.is_party_member) || []
  const companions = relationships?.filter(r => r.is_companion) || []

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
                href="/login"
                className="text-sm font-medium px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="relative">
        <div className="h-48 md:h-64 bg-gradient-to-b from-indigo-900/30 to-transparent" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-10">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center shadow-xl">
              <User className="w-12 h-12 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                  {character.status || 'Active'}
                </span>
                <span className="text-xs text-gray-500">Level {character.level || 1}</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{character.name}</h1>
              <p className="text-lg text-gray-400">
                {character.race} {character.class}
                {character.subclass && ` (${character.subclass})`}
              </p>
              {character.background && (
                <p className="text-sm text-gray-500 mt-1">{character.background}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Backstory */}
            {character.backstory && (
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-indigo-500/10 rounded-lg">
                    <BookOpen className="w-5 h-5 text-indigo-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-white">Backstory</h2>
                </div>
                <div className="p-6 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {character.backstory}
                  </p>
                </div>
              </section>
            )}

            {/* Personality */}
            {character.personality && (
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Heart className="w-5 h-5 text-purple-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-white">Personality</h2>
                </div>
                <div className="p-6 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {character.personality}
                  </p>
                </div>
              </section>
            )}

            {/* Traits Grid */}
            <div className="grid md:grid-cols-3 gap-4">
              {character.ideals && (
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <h3 className="text-sm font-semibold text-purple-400 mb-2">Ideals</h3>
                  <p className="text-sm text-gray-300">{character.ideals}</p>
                </div>
              )}
              {character.bonds && (
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <h3 className="text-sm font-semibold text-indigo-400 mb-2">Bonds</h3>
                  <p className="text-sm text-gray-300">{character.bonds}</p>
                </div>
              )}
              {character.flaws && (
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <h3 className="text-sm font-semibold text-amber-400 mb-2">Flaws</h3>
                  <p className="text-sm text-gray-300">{character.flaws}</p>
                </div>
              )}
            </div>

            {/* Play Journal */}
            {journals && journals.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <Scroll className="w-5 h-5 text-amber-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-white">Play Journal</h2>
                </div>
                <div className="space-y-4">
                  {journals.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-6 rounded-xl bg-white/[0.02] border border-white/[0.06]"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-white">{entry.title}</h3>
                        {entry.session_date && (
                          <span className="text-xs text-gray-500">
                            {new Date(entry.session_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-300 prose prose-invert prose-sm max-w-none whitespace-pre-wrap">
                        {entry.notes}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Party Members */}
            {partyMembers.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Users className="w-5 h-5 text-green-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">Party Members</h2>
                </div>
                <div className="space-y-3">
                  {partyMembers.map((member) => (
                    <div
                      key={member.id}
                      className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-600/30 to-green-800/30 flex items-center justify-center text-sm font-semibold text-green-300">
                          {member.related_name?.[0] || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-white truncate">{member.related_name}</h3>
                          {member.relationship_label && (
                            <p className="text-xs text-gray-500">{member.relationship_label}</p>
                          )}
                        </div>
                      </div>
                      {member.description && (
                        <p className="text-xs text-gray-400 mt-2 line-clamp-3">{member.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Companions */}
            {companions.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Shield className="w-5 h-5 text-purple-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">Companions</h2>
                </div>
                <div className="space-y-3">
                  {companions.map((companion) => (
                    <div
                      key={companion.id}
                      className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600/30 to-purple-800/30 flex items-center justify-center text-sm font-semibold text-purple-300">
                          {companion.related_name?.[0] || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-white truncate">{companion.related_name}</h3>
                          {companion.relationship_label && (
                            <p className="text-xs text-gray-500">{companion.relationship_label}</p>
                          )}
                        </div>
                      </div>
                      {companion.description && (
                        <p className="text-xs text-gray-400 mt-2 line-clamp-3">{companion.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center py-12 mt-8 border-t border-white/[0.06]">
          <h3 className="text-2xl font-bold text-white mb-4">Ready to Create Your Own Character?</h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Sign up to build rich character profiles with backstories, relationships, and journals.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 transition-all"
          >
            <Sparkles className="w-5 h-5" />
            Get Started Free
          </Link>
        </div>
      </div>
    </div>
  )
}

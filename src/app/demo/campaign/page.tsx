import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  Map,
  Users,
  BookOpen,
  Calendar,
  ArrowLeft,
  Sparkles,
  Clock,
  Scroll,
  User,
} from 'lucide-react'
import { MarkdownContent } from '@/components/ui'
import type { Metadata } from 'next'

// Demo campaign ID from migration
const DEMO_CAMPAIGN_ID = '00000000-0000-0000-0001-000000000001'

export const metadata: Metadata = {
  title: 'Demo Campaign: The Sunken Citadel | Multiloop',
  description: 'Explore a complete D&D campaign example with NPCs, sessions, and timeline events.',
}

export default async function DemoCampaignPage() {
  const supabase = await createClient()

  // Fetch demo campaign (public RLS policy allows this)
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', DEMO_CAMPAIGN_ID)
    .eq('is_demo', true)
    .single()

  if (campaignError || !campaign) {
    console.error('Demo campaign not found:', campaignError)
    notFound()
  }

  // Fetch related data
  const [
    { data: characters },
    { data: sessions },
    { data: timelineEvents },
  ] = await Promise.all([
    supabase
      .from('characters')
      .select('*')
      .eq('campaign_id', DEMO_CAMPAIGN_ID)
      .order('name'),
    supabase
      .from('sessions')
      .select('*')
      .eq('campaign_id', DEMO_CAMPAIGN_ID)
      .order('session_number'),
    supabase
      .from('timeline_events')
      .select('*')
      .eq('campaign_id', DEMO_CAMPAIGN_ID)
      .order('event_date'),
  ])

  const npcs = characters?.filter(c => c.type === 'npc') || []

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
        {campaign.image_url ? (
          <div className="h-64 md:h-80 relative">
            <Image
              src={campaign.image_url}
              alt={campaign.name}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0f]/50 to-[#0a0a0f]" />
          </div>
        ) : (
          <div className="h-48 md:h-64 bg-gradient-to-b from-purple-900/30 to-transparent" />
        )}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-10">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center shadow-xl overflow-hidden">
              {campaign.image_url ? (
                <Image
                  src={campaign.image_url}
                  alt={campaign.name}
                  width={80}
                  height={80}
                  className="object-cover w-full h-full"
                />
              ) : (
                <Map className="w-10 h-10 text-white" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                  Active
                </span>
                <span className="text-xs text-gray-500">{campaign.game_system}</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">{campaign.name}</h1>
              <p className="text-gray-400 max-w-3xl">{campaign.description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-3 gap-4 mb-12">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Users className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{npcs.length}</p>
                <p className="text-sm text-gray-400">NPCs</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <BookOpen className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{sessions?.length || 0}</p>
                <p className="text-sm text-gray-400">Sessions</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{timelineEvents?.length || 0}</p>
                <p className="text-sm text-gray-400">Timeline Events</p>
              </div>
            </div>
          </div>
        </div>

        {/* NPCs Section */}
        {npcs.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Users className="w-5 h-5 text-purple-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">NPCs</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {npcs.map((npc) => (
                <div
                  key={npc.id}
                  className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-purple-500/30 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600/30 to-purple-800/30 flex items-center justify-center text-lg font-semibold text-purple-300 overflow-hidden">
                      {npc.image_url ? (
                        <Image
                          src={npc.image_url}
                          alt={npc.name}
                          width={48}
                          height={48}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        npc.name[0]
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white mb-1">{npc.name}</h3>
                      {npc.race && (
                        <p className="text-sm text-gray-500 mb-2">
                          {npc.race}{npc.class ? ` • ${npc.class}` : ''}
                        </p>
                      )}
                      <div className="text-sm text-gray-400 line-clamp-2">{npc.description}</div>
                      {npc.notes && (
                        <div className="mt-2">
                          <MarkdownContent content={npc.notes} className="text-xs [&_p]:text-purple-400 [&_strong]:text-purple-300" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Sessions Section */}
        {sessions && sessions.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <BookOpen className="w-5 h-5 text-indigo-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">Sessions</h2>
            </div>
            <div className="space-y-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06]"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs px-2 py-1 rounded-full bg-indigo-500/20 text-indigo-400">
                      Session {session.session_number}
                    </span>
                    {session.date && (
                      <span className="text-xs text-gray-500">
                        {new Date(session.date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-white mb-2">{session.title}</h3>
                  {session.summary && (
                    <p className="text-sm text-gray-400 mb-3">{session.summary}</p>
                  )}
                  {session.notes && (
                    <div className="border-t border-white/[0.06] pt-3 mt-3">
                      <MarkdownContent content={session.notes} className="text-sm" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Timeline Section */}
        {timelineEvents && timelineEvents.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Scroll className="w-5 h-5 text-amber-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">Timeline</h2>
            </div>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-white/[0.06]" />
              <div className="space-y-4">
                {timelineEvents.map((event) => (
                  <div key={event.id} className="relative pl-10">
                    <div className="absolute left-2.5 w-3 h-3 rounded-full bg-amber-500/50 border-2 border-amber-500" />
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="text-xs text-gray-500">
                          {event.event_date ? new Date(event.event_date).toLocaleDateString() : 'Unknown date'}
                        </span>
                      </div>
                      <h3 className="font-medium text-white mb-1">{event.title}</h3>
                      {event.description && (
                        <p className="text-sm text-gray-400">{event.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        <div className="text-center py-12 border-t border-white/[0.06]">
          <h3 className="text-2xl font-bold text-white mb-4">Ready to Create Your Own Campaign?</h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Join the waitlist to become a Founding Member and start tracking your adventures.
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

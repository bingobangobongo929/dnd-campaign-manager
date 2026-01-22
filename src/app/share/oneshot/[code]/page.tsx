import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createUserClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import Image from 'next/image'
import { Users, Clock, Scroll, BookOpen, Target, Eye } from 'lucide-react'
import { SharePageHeader } from '@/components/share/SharePageHeader'
import { PasswordGate } from '@/components/share/PasswordGate'
import { MarkdownContent } from '@/components/ui'
import crypto from 'crypto'
import type { Metadata } from 'next'

// Detect bot/crawler user agents (social media unfurl previews, search engines, etc.)
function isBot(userAgent: string | null): boolean {
  if (!userAgent) return false
  const ua = userAgent.toLowerCase()

  // Social media preview bots
  if (ua.includes('discordbot')) return true
  if (ua.includes('slackbot')) return true
  if (ua.includes('twitterbot')) return true
  if (ua.includes('facebookexternalhit')) return true
  if (ua.includes('facebot')) return true
  if (ua.includes('telegrambot')) return true
  if (ua.includes('whatsapp')) return true
  if (ua.includes('linkedinbot')) return true
  if (ua.includes('pinterest')) return true
  if (ua.includes('embedly')) return true

  // Search engine bots
  if (ua.includes('googlebot')) return true
  if (ua.includes('bingbot')) return true
  if (ua.includes('yandex')) return true
  if (ua.includes('baiduspider')) return true
  if (ua.includes('duckduckbot')) return true

  // Generic bot patterns
  if (ua.includes('bot/') || ua.includes('bot ')) return true
  if (ua.includes('crawler')) return true
  if (ua.includes('spider')) return true
  if (ua.includes('preview')) return true
  if (ua.includes('fetcher')) return true
  if (ua.includes('scraper')) return true

  return false
}

interface SharePageProps {
  params: Promise<{ code: string }>
}

// Generate rich OpenGraph metadata for Discord/social sharing
export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { code } = await params
  const supabase = createAdminClient()

  // Fetch share and oneshot data
  const { data: share } = await supabase
    .from('oneshot_shares')
    .select('oneshot_id')
    .eq('share_code', code)
    .single()

  if (!share) {
    return { title: 'One-Shot Not Found' }
  }

  const { data: oneshot } = await supabase
    .from('oneshots')
    .select('title, tagline, introduction, image_url, min_players, max_players, estimated_duration, difficulty')
    .eq('id', share.oneshot_id)
    .single()

  if (!oneshot) {
    return { title: 'One-Shot Not Found' }
  }

  // Build specs for the title/description
  const specs: string[] = []
  if (oneshot.min_players && oneshot.max_players) {
    specs.push(`${oneshot.min_players}-${oneshot.max_players} Players`)
  } else if (oneshot.min_players) {
    specs.push(`${oneshot.min_players}+ Players`)
  }
  if (oneshot.estimated_duration) {
    specs.push(oneshot.estimated_duration)
  }

  // Build a title like "Title | 3-5 Players • 4 Hours"
  const title = specs.length > 0
    ? `${oneshot.title} | ${specs.join(' • ')}`
    : oneshot.title

  // Build a compelling description - taglines are written to hook
  let description: string
  if (oneshot.tagline) {
    description = oneshot.tagline
    // Add difficulty if it fits
    if (oneshot.difficulty && description.length < 140) {
      const difficultyLabel = oneshot.difficulty.charAt(0).toUpperCase() + oneshot.difficulty.slice(1)
      description = `${description} — ${difficultyLabel} difficulty`
    }
  } else if (oneshot.introduction) {
    const plainIntro = oneshot.introduction
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    description = plainIntro.length > 150
      ? plainIntro.substring(0, 147) + '...'
      : plainIntro
  } else {
    // Build from specs
    const parts: string[] = ['A one-shot adventure']
    if (oneshot.min_players && oneshot.max_players) {
      parts.push(`for ${oneshot.min_players}-${oneshot.max_players} players`)
    }
    if (oneshot.estimated_duration) {
      parts.push(`(${oneshot.estimated_duration})`)
    }
    description = parts.join(' ')
  }

  const imageUrl = oneshot.image_url

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'Multiloop',
      images: imageUrl ? [{
        url: imageUrl,
        width: 1200,
        height: 675,
        alt: oneshot.title,
      }] : [],
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title,
      description,
      images: imageUrl ? [imageUrl] : [],
    },
  }
}

export default async function ShareOneshotPage({ params }: SharePageProps) {
  const { code } = await params
  const supabase = createAdminClient()

  // Fetch share data
  const { data: share, error: shareError } = await supabase
    .from('oneshot_shares')
    .select('*')
    .eq('share_code', code)
    .single()

  if (shareError) {
    console.error('Share fetch error:', shareError)
  }

  if (shareError || !share) {
    notFound()
  }

  // Check expiration
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return (
      <div className="min-h-screen bg-[--bg-base] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[--text-primary] mb-4">Link Expired</h1>
          <p className="text-[--text-secondary]">This share link has expired.</p>
        </div>
      </div>
    )
  }

  // Get request headers for tracking
  const headersList = await headers()
  const referrer = headersList.get('referer') || null
  const userAgent = headersList.get('user-agent') || null
  const forwardedFor = headersList.get('x-forwarded-for')
  const realIp = headersList.get('x-real-ip')
  const ip = forwardedFor?.split(',')[0] || realIp || 'unknown'

  // Skip view tracking for bots (Discord unfurls, search engines, etc.)
  // This prevents link previews from counting as views or showing as "live" viewers
  if (!isBot(userAgent)) {
    // Create a hash of the IP for privacy-friendly unique visitor tracking
    const viewerHash = crypto.createHash('sha256').update(ip + share.id).digest('hex').substring(0, 16)

    // Abuse protection: Check if this viewer viewed this share in the last 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
    const { data: recentView } = await supabase
      .from('share_view_events')
      .select('id')
      .eq('share_id', share.id)
      .eq('viewer_hash', viewerHash)
      .gte('viewed_at', fifteenMinutesAgo)
      .limit(1)
      .single()

    // Only record view if no recent view from this viewer
    if (!recentView) {
      // Update view count and last_viewed_at
      await supabase
        .from('oneshot_shares')
        .update({
          view_count: (share.view_count || 0) + 1,
          last_viewed_at: new Date().toISOString()
        })
        .eq('id', share.id)

      // Record view event for analytics
      await supabase
        .from('share_view_events')
        .insert({
          share_id: share.id,
          share_type: 'oneshot',
          viewer_hash: viewerHash,
          referrer: referrer?.substring(0, 500),
          user_agent: userAgent?.substring(0, 500),
        })
    }
  }

  // Fetch oneshot data
  const { data: oneshot, error: oneshotError } = await supabase
    .from('oneshots')
    .select('*')
    .eq('id', share.oneshot_id)
    .single()

  if (oneshotError || !oneshot) {
    notFound()
  }

  // Fetch author info (username and founder status)
  const { data: authorSettings } = await supabase
    .from('user_settings')
    .select('username, is_founder')
    .eq('user_id', oneshot.user_id)
    .single()

  const authorName = authorSettings?.username || null
  const isFounder = authorSettings?.is_founder || false

  // Fetch genre tags
  const { data: allTags } = await supabase
    .from('oneshot_genre_tags')
    .select('*')
    .eq('user_id', oneshot.user_id)

  const genreTags = (allTags || []).filter((tag: any) =>
    oneshot.genre_tag_ids?.includes(tag.id)
  )

  const sections = share.included_sections as Record<string, boolean>

  // Check if save is allowed and get snapshot info
  let snapshotId: string | null = null
  let isLoggedIn = false
  let isSaved = false
  const allowSave = share.allow_save === true && oneshot.content_mode === 'template'

  if (allowSave) {
    // Get the latest snapshot for this oneshot
    const snapshotVersion = share.snapshot_version || null
    let snapshotQuery = supabase
      .from('template_snapshots')
      .select('id')
      .eq('content_type', 'oneshot')
      .eq('content_id', oneshot.id)

    if (snapshotVersion) {
      snapshotQuery = snapshotQuery.eq('version', snapshotVersion)
    } else {
      snapshotQuery = snapshotQuery.order('version', { ascending: false }).limit(1)
    }

    const { data: snapshot } = await snapshotQuery.single()
    snapshotId = snapshot?.id || null

    // Check if user is logged in and has already saved
    if (snapshotId) {
      const userSupabase = await createUserClient()
      const { data: { user } } = await userSupabase.auth.getUser()
      isLoggedIn = !!user

      if (user && snapshotId) {
        const { data: existingSave } = await supabase
          .from('content_saves')
          .select('id')
          .eq('user_id', user.id)
          .eq('snapshot_id', snapshotId)
          .single()
        isSaved = !!existingSave
      }
    }
  }

  // Check if password is required
  const requiresPassword = !!share.password_hash

  return (
    <PasswordGate
      shareCode={code}
      requiresPassword={requiresPassword}
      contentName={oneshot.title}
    >
      <SharePageHeader
        contentType="oneshot"
        contentName={oneshot.title}
        authorName={authorName}
        isFounder={isFounder}
        allowSave={allowSave}
        snapshotId={snapshotId}
        isLoggedIn={isLoggedIn}
        isSaved={isSaved}
      />
      <div className="min-h-screen bg-[--bg-base]">
        {/* Hero Section */}
      <div className="relative">
        {oneshot.image_url ? (
          <div className="relative h-64 md:h-80">
            <Image
              src={oneshot.image_url}
              alt={oneshot.title}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[--bg-base] via-[--bg-base]/60 to-transparent" />
          </div>
        ) : (
          <div className="h-32 bg-gradient-to-b from-purple-900/20 to-transparent" />
        )}

        <div className="max-w-4xl mx-auto px-6 -mt-20 relative z-10">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Poster thumbnail on mobile */}
            {oneshot.image_url && (
              <div className="hidden md:block relative w-40 h-60 rounded-xl overflow-hidden border-2 border-white/10 shadow-2xl flex-shrink-0">
                <Image
                  src={oneshot.image_url}
                  alt={oneshot.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            <div className="flex-1">
              {/* Genre Tags */}
              {genreTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {genreTags.map((tag: any) => (
                    <span
                      key={tag.id}
                      className="px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded"
                      style={{
                        backgroundColor: `${tag.color}25`,
                        color: tag.color,
                        border: `1px solid ${tag.color}40`,
                      }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Title */}
              <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-3">
                {oneshot.title}
              </h1>

              {/* Tagline */}
              {sections.tagline && oneshot.tagline && (
                <p className="text-lg text-gray-400 mb-4">{oneshot.tagline}</p>
              )}

              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Scroll className="w-4 h-4" />
                  {oneshot.game_system}
                </span>
                {oneshot.level && (
                  <span>Level {oneshot.level}</span>
                )}
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
      <div className="max-w-4xl mx-auto px-6 py-12 space-y-10">
        {/* Introduction */}
        {sections.introduction && oneshot.introduction && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <BookOpen className="w-5 h-5 text-purple-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">Introduction</h2>
            </div>
            <div className="prose prose-invert max-w-none">
              <MarkdownContent content={oneshot.introduction} />
            </div>
          </section>
        )}

        {/* Setting Notes */}
        {sections.settingNotes && oneshot.setting_notes && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Scroll className="w-5 h-5 text-purple-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">Setting Notes</h2>
            </div>
            <div className="p-6 bg-white/[0.02] rounded-xl border border-white/[0.06]">
              <MarkdownContent content={oneshot.setting_notes} />
            </div>
          </section>
        )}

        {/* Character Creation */}
        {sections.characterCreation && oneshot.character_creation && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Users className="w-5 h-5 text-purple-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">Character Creation</h2>
            </div>
            <div className="p-6 bg-white/[0.02] rounded-xl border border-white/[0.06]">
              <MarkdownContent content={oneshot.character_creation} />
            </div>
          </section>
        )}

        {/* Handouts */}
        {sections.handouts && oneshot.handouts && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Scroll className="w-5 h-5 text-purple-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">Handouts</h2>
            </div>
            <div className="p-6 bg-amber-500/5 rounded-xl border border-amber-500/20">
              <MarkdownContent content={oneshot.handouts} className="font-mono text-sm" />
            </div>
          </section>
        )}

        {/* Session Plan (DM Only) */}
        {sections.sessionPlan && oneshot.session_plan && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <Target className="w-5 h-5 text-red-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">Session Plan</h2>
              <span className="text-xs px-2 py-0.5 bg-red-500/15 text-red-400 rounded border border-red-500/20">
                DM Only
              </span>
            </div>
            <div className="p-6 bg-red-500/5 rounded-xl border border-red-500/20">
              <MarkdownContent content={oneshot.session_plan} />
            </div>
          </section>
        )}

        {/* Twists & Secrets (DM Only) */}
        {sections.twists && oneshot.twists && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <Eye className="w-5 h-5 text-red-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">Twists & Secrets</h2>
              <span className="text-xs px-2 py-0.5 bg-red-500/15 text-red-400 rounded border border-red-500/20">
                DM Only
              </span>
            </div>
            <div className="p-6 bg-red-500/5 rounded-xl border border-red-500/20">
              <MarkdownContent content={oneshot.twists} />
            </div>
          </section>
        )}

        {/* Key NPCs (DM Only) */}
        {sections.keyNpcs && oneshot.key_npcs && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Users className="w-5 h-5 text-purple-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">Key NPCs</h2>
              <span className="text-xs px-2 py-0.5 bg-red-500/15 text-red-400 rounded border border-red-500/20">
                DM Only
              </span>
            </div>
            <div className="p-6 bg-white/[0.02] rounded-xl border border-white/[0.06]">
              <MarkdownContent content={oneshot.key_npcs} />
            </div>
          </section>
        )}
      </div>

        {/* Footer */}
        <div className="border-t border-white/10 py-8">
          <div className="max-w-4xl mx-auto px-6 text-center text-sm text-gray-500">
            Shared via Multiloop
          </div>
        </div>
      </div>
    </PasswordGate>
  )
}

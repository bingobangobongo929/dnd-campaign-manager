import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Image from 'next/image'
import { Users, Clock, Scroll, BookOpen, Target, Eye } from 'lucide-react'
import { MarkdownContent } from '@/components/ui'
import { FloatingDock } from '@/components/layout/floating-dock'

interface ViewPageProps {
  params: Promise<{ id: string }>
}

export default async function OneshotViewPage({ params }: ViewPageProps) {
  const { id: oneshotId } = await params
  const supabase = await createClient()

  // Verify user is authenticated and owns this oneshot
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Fetch oneshot (will fail if user doesn't own it due to RLS)
  const { data: oneshot, error: oneshotError } = await supabase
    .from('oneshots')
    .select('*')
    .eq('id', oneshotId)
    .single()

  if (oneshotError || !oneshot) {
    notFound()
  }

  // Fetch genre tags
  const { data: allTags } = await supabase
    .from('oneshot_genre_tags')
    .select('*')
    .eq('user_id', oneshot.user_id)

  const genreTags = (allTags || []).filter((tag: any) =>
    oneshot.genre_tag_ids?.includes(tag.id)
  )

  // ALL sections enabled - owner sees everything
  const sections = {
    tagline: true,
    introduction: true,
    settingNotes: true,
    characterCreation: true,
    handouts: true,
    sessionPlan: true,
    twists: true,
    keyNpcs: true,
  }

  return (
    <>
      <FloatingDock oneshotId={oneshotId} />
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
              {/* Poster thumbnail on desktop */}
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
            Viewing as owner
          </div>
        </div>
      </div>
    </>
  )
}

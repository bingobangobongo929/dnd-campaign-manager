import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { User, Users, Scroll, Quote, BookOpen, Heart } from 'lucide-react'
import { getInitials } from '@/lib/utils'

interface SharePageProps {
  params: Promise<{ code: string }>
}

export default async function ShareCharacterPage({ params }: SharePageProps) {
  const { code } = await params
  const supabase = await createClient()

  // Fetch share data
  const { data: share, error: shareError } = await supabase
    .from('character_shares')
    .select('*')
    .eq('share_code', code)
    .single()

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

  // Increment view count
  await supabase
    .from('character_shares')
    .update({ view_count: (share.view_count || 0) + 1 })
    .eq('id', share.id)

  // Fetch character data
  const { data: character, error: charError } = await supabase
    .from('vault_characters')
    .select('*')
    .eq('id', share.character_id)
    .single()

  if (charError || !character) {
    notFound()
  }

  const sections = share.included_sections as Record<string, boolean>

  // Fetch story characters if included
  let storyCharacters: any[] = []
  if (sections.storyCharacters) {
    const { data } = await supabase
      .from('story_characters')
      .select('*')
      .eq('character_id', character.id)
      .order('sort_order')
    storyCharacters = data || []
  }

  const displayUrl = character.detail_image_url || character.image_url

  return (
    <div className="min-h-screen bg-[--bg-base]">
      {/* Header */}
      <div className="bg-[--bg-surface] border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <p className="text-sm text-[--text-tertiary]">Shared Character</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Hero Section */}
        <div className="flex flex-col md:flex-row gap-8 mb-12">
          {/* Portrait */}
          <div className="w-full md:w-64 flex-shrink-0">
            {displayUrl ? (
              <div className="relative aspect-[2/3] rounded-2xl overflow-hidden border-2 border-white/10">
                <Image
                  src={displayUrl}
                  alt={character.name}
                  fill
                  className="object-cover"
                  sizes="256px"
                />
              </div>
            ) : (
              <div className="aspect-[2/3] rounded-2xl bg-[--bg-elevated] border-2 border-white/10 flex items-center justify-center">
                <span className="text-5xl font-bold text-[--text-tertiary]">
                  {getInitials(character.name)}
                </span>
              </div>
            )}
          </div>

          {/* Basic Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                character.type === 'pc' ? 'bg-purple-600/20 text-purple-400' : 'bg-gray-600/20 text-gray-400'
              }`}>
                {character.type === 'pc' ? <User className="w-6 h-6" /> : <Users className="w-6 h-6" />}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[--text-primary]">{character.name}</h1>
                {(character.race || character.class) && (
                  <p className="text-[--text-secondary]">
                    {[character.race, character.class].filter(Boolean).join(' ')}
                  </p>
                )}
              </div>
            </div>

            {character.status && (
              <div className="flex items-center gap-2 mb-6">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: character.status_color || '#8B5CF6' }}
                />
                <span className="text-sm text-[--text-secondary]">{character.status}</span>
              </div>
            )}

            {/* Summary */}
            {sections.summary && character.summary && (
              <div
                className="prose prose-invert prose-sm max-w-none text-[--text-secondary]"
                dangerouslySetInnerHTML={{ __html: character.summary }}
              />
            )}

            {/* TL;DR */}
            {character.tldr && character.tldr.length > 0 && (
              <div className="mt-6 p-4 bg-[--bg-elevated] rounded-xl border border-white/10">
                <h3 className="text-xs font-semibold text-[--text-tertiary] uppercase tracking-wider mb-3">Quick Facts</h3>
                <ul className="space-y-1.5">
                  {character.tldr.map((item: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[--text-primary]">
                      <span className="text-[--arcane-purple]">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-8">
          {/* Backstory */}
          {sections.backstory && character.notes && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Scroll className="w-5 h-5 text-[--arcane-purple]" />
                <h2 className="text-xl font-bold text-[--text-primary]">Backstory</h2>
              </div>
              <div
                className="prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: character.notes }}
              />
            </section>
          )}

          {/* Appearance */}
          {sections.appearance && character.appearance && (
            <section>
              <h2 className="text-xl font-bold text-[--text-primary] mb-4">Appearance</h2>
              <p className="text-[--text-secondary] whitespace-pre-wrap">{character.appearance}</p>
            </section>
          )}

          {/* Personality */}
          {sections.personality && character.personality && (
            <section>
              <h2 className="text-xl font-bold text-[--text-primary] mb-4">Personality</h2>
              <p className="text-[--text-secondary] whitespace-pre-wrap">{character.personality}</p>
            </section>
          )}

          {/* Goals */}
          {sections.goals && character.goals && (
            <section>
              <h2 className="text-xl font-bold text-[--text-primary] mb-4">Goals & Motivations</h2>
              <p className="text-[--text-secondary] whitespace-pre-wrap">{character.goals}</p>
            </section>
          )}

          {/* Quotes */}
          {sections.quotes && character.quotes && character.quotes.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Quote className="w-5 h-5 text-[--arcane-gold]" />
                <h2 className="text-xl font-bold text-[--text-primary]">Memorable Quotes</h2>
              </div>
              <div className="space-y-4">
                {character.quotes.map((quote: string, i: number) => (
                  <blockquote
                    key={i}
                    className="pl-4 border-l-2 border-[--arcane-gold]/50 text-[--text-secondary] italic"
                  >
                    "{quote}"
                  </blockquote>
                ))}
              </div>
            </section>
          )}

          {/* Story Characters */}
          {sections.storyCharacters && storyCharacters.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Heart className="w-5 h-5 text-[--arcane-purple]" />
                <h2 className="text-xl font-bold text-[--text-primary]">Related Characters</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {storyCharacters.map((char) => (
                  <div
                    key={char.id}
                    className="flex items-start gap-3 p-4 bg-[--bg-elevated] rounded-xl border border-white/5"
                  >
                    {char.image_url ? (
                      <Image
                        src={char.image_url}
                        alt={char.name}
                        width={48}
                        height={48}
                        className="rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-[--bg-surface] flex items-center justify-center">
                        <User className="w-5 h-5 text-[--text-tertiary]" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[--text-primary]">{char.name}</span>
                        <span className="text-xs px-2 py-0.5 bg-[--arcane-purple]/20 text-[--arcane-purple] rounded-full capitalize">
                          {char.relationship.replace(/_/g, ' ')}
                        </span>
                      </div>
                      {char.tagline && (
                        <p className="text-sm text-[--text-secondary] mt-0.5">{char.tagline}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-white/10 text-center">
          <p className="text-sm text-[--text-tertiary]">
            Created with Campaign Manager
          </p>
        </div>
      </div>
    </div>
  )
}

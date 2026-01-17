import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import Image from 'next/image'
import { User, Users, Scroll, Quote, BookOpen, Heart, Eye, FileText, Image as ImageIcon } from 'lucide-react'
import { getInitials } from '@/lib/utils'
import { renderMarkdown } from '@/lib/character-display'
import crypto from 'crypto'

interface SharePageProps {
  params: Promise<{ code: string }>
}

// Relationship type colors
const RELATIONSHIP_COLORS: Record<string, string> = {
  family: 'bg-red-500/15 text-red-400 border-red-500/20',
  mentor: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  friend: 'bg-green-500/15 text-green-400 border-green-500/20',
  enemy: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  patron: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  contact: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  ally: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  employer: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  love_interest: 'bg-pink-500/15 text-pink-400 border-pink-500/20',
  rival: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  acquaintance: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
  party_member: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
  other: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
}

// Companion type colors
const COMPANION_TYPE_COLORS: Record<string, string> = {
  familiar: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  pet: 'bg-pink-500/15 text-pink-400 border-pink-500/20',
  mount: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  animal_companion: 'bg-green-500/15 text-green-400 border-green-500/20',
  construct: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  other: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
}

export default async function ShareCharacterPage({ params }: SharePageProps) {
  const { code } = await params
  const supabase = createAdminClient()

  // Fetch share data
  const { data: share, error: shareError } = await supabase
    .from('character_shares')
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

  // Create a hash of the IP for privacy-friendly unique visitor tracking
  const viewerHash = crypto.createHash('sha256').update(ip + share.id).digest('hex').substring(0, 16)

  // Update view count and last_viewed_at
  await supabase
    .from('character_shares')
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
      share_type: 'character',
      viewer_hash: viewerHash,
      referrer: referrer?.substring(0, 500), // Limit length
      user_agent: userAgent?.substring(0, 500),
    })

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

  // Fetch relationships if any people sections are enabled
  let relationships: any[] = []
  if (sections.partyMembers || sections.npcs || sections.companions) {
    const { data } = await supabase
      .from('vault_character_relationships')
      .select('*')
      .eq('character_id', character.id)
      .order('display_order')
    relationships = data || []
  }

  // Fetch writings if enabled
  let writings: any[] = []
  if (sections.writings) {
    const { data } = await supabase
      .from('vault_character_writings')
      .select('*')
      .eq('character_id', character.id)
      .order('display_order')
    writings = data || []
  }

  // Fetch gallery images if enabled
  let galleryImages: any[] = []
  if (sections.gallery) {
    const { data } = await supabase
      .from('vault_character_images')
      .select('*')
      .eq('character_id', character.id)
      .order('is_primary', { ascending: false })
      .order('display_order')
    galleryImages = data || []
  }

  // Parse character data
  const partyMembers = relationships.filter(r => r.is_party_member && !r.is_companion)
  const npcs = relationships.filter(r => !r.is_companion && !r.is_party_member)
  const companions = relationships.filter(r => r.is_companion)

  const tldr = (character.tldr as string[]) || []
  const quotes = (character.quotes as string[]) || []
  const plotHooks = (character.plot_hooks as string[]) || []
  const fears = ((character as any).fears as string[]) || []
  const weaknesses = (character.weaknesses as string[]) || []
  const backstoryPhases = ((character as any).backstory_phases as { title: string; content: string }[]) || []
  const dmQa = (character.dm_qa as { question: string; answer: string }[]) || []
  const rumors = (character.rumors as { statement: string; is_true: boolean }[]) || []
  const openQuestions = ((character as any).open_questions as string[]) || []

  const displayUrl = character.detail_image_url || character.image_url

  // Check if we have any content to show
  const hasBackstoryContent = (sections.summary && character.summary) ||
    (sections.tldr && tldr.length > 0) ||
    (sections.backstory && character.notes) ||
    (sections.lifePhases && backstoryPhases.length > 0) ||
    (sections.plotHooks && plotHooks.length > 0) ||
    (sections.quotes && quotes.length > 0)

  const hasDetailsContent = (sections.appearance && character.appearance) ||
    (sections.physicalDetails && ((character as any).height || (character as any).weight)) ||
    (sections.personality && character.personality) ||
    (sections.goals && character.goals) ||
    (sections.secrets && character.secrets) ||
    (sections.weaknesses && weaknesses.length > 0) ||
    (sections.fears && fears.length > 0)

  const hasPeopleContent = (sections.partyMembers && partyMembers.length > 0) ||
    (sections.npcs && npcs.length > 0) ||
    (sections.companions && companions.length > 0)

  const hasWritingsContent = (sections.writings && writings.length > 0) ||
    (sections.rumors && rumors.length > 0) ||
    (sections.dmQa && dmQa.length > 0) ||
    (sections.openQuestions && openQuestions.length > 0)

  const hasGalleryContent = sections.gallery && galleryImages.length > 0

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
            {sections.tldr && tldr.length > 0 && (
              <div className="mt-6 p-4 bg-[--bg-elevated] rounded-xl border border-white/10">
                <h3 className="text-xs font-semibold text-[--text-tertiary] uppercase tracking-wider mb-3">Quick Facts</h3>
                <ul className="space-y-1.5">
                  {tldr.map((item: string, i: number) => (
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

          {/* Life Phases */}
          {sections.lifePhases && backstoryPhases.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-5 h-5 text-[--arcane-purple]" />
                <h2 className="text-xl font-bold text-[--text-primary]">Life Phases</h2>
              </div>
              <div className="space-y-4">
                {backstoryPhases.map((phase, i) => (
                  <div key={i} className="bg-[--bg-elevated] rounded-xl p-4 border-l-2 border-[--arcane-purple]">
                    <h3 className="font-medium text-purple-400 mb-2">{phase.title}</h3>
                    <div className="text-sm text-[--text-secondary]">
                      {renderMarkdown(phase.content)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Plot Hooks */}
          {sections.plotHooks && plotHooks.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-[--text-primary] mb-4">🎯 Plot Hooks</h2>
              <ul className="space-y-2">
                {plotHooks.map((hook, i) => (
                  <li key={i} className="flex items-start gap-2 text-[--text-secondary]">
                    <span className="text-amber-400">•</span>
                    {hook}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Appearance */}
          {sections.appearance && character.appearance && (
            <section>
              <h2 className="text-xl font-bold text-[--text-primary] mb-4">Appearance</h2>
              <p className="text-[--text-secondary] whitespace-pre-wrap">{character.appearance}</p>
            </section>
          )}

          {/* Physical Details */}
          {sections.physicalDetails && ((character as any).height || (character as any).weight || (character as any).hair || (character as any).eyes) && (
            <section>
              <h2 className="text-xl font-bold text-[--text-primary] mb-4">Physical Details</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(character as any).height && (
                  <div className="bg-[--bg-elevated] rounded-lg p-3 border border-white/5">
                    <p className="text-xs text-[--text-tertiary] mb-1">Height</p>
                    <p className="text-sm text-[--text-primary]">{(character as any).height}</p>
                  </div>
                )}
                {(character as any).weight && (
                  <div className="bg-[--bg-elevated] rounded-lg p-3 border border-white/5">
                    <p className="text-xs text-[--text-tertiary] mb-1">Weight</p>
                    <p className="text-sm text-[--text-primary]">{(character as any).weight}</p>
                  </div>
                )}
                {(character as any).hair && (
                  <div className="bg-[--bg-elevated] rounded-lg p-3 border border-white/5">
                    <p className="text-xs text-[--text-tertiary] mb-1">Hair</p>
                    <p className="text-sm text-[--text-primary]">{(character as any).hair}</p>
                  </div>
                )}
                {(character as any).eyes && (
                  <div className="bg-[--bg-elevated] rounded-lg p-3 border border-white/5">
                    <p className="text-xs text-[--text-tertiary] mb-1">Eyes</p>
                    <p className="text-sm text-[--text-primary]">{(character as any).eyes}</p>
                  </div>
                )}
              </div>
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

          {/* Secrets */}
          {sections.secrets && character.secrets && (
            <section className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-6">
              <h2 className="text-xl font-bold text-amber-400 mb-4">🔒 Secrets</h2>
              <p className="text-amber-200/80 whitespace-pre-wrap">{character.secrets}</p>
            </section>
          )}

          {/* Weaknesses */}
          {sections.weaknesses && weaknesses.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-[--text-primary] mb-4">💔 Weaknesses</h2>
              <ul className="space-y-2">
                {weaknesses.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[--text-secondary]">
                    <span className="text-orange-400">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Fears */}
          {sections.fears && fears.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-[--text-primary] mb-4">😨 Fears</h2>
              <ul className="space-y-2">
                {fears.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[--text-secondary]">
                    <span className="text-orange-400">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Quotes */}
          {sections.quotes && quotes.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Quote className="w-5 h-5 text-[--arcane-gold]" />
                <h2 className="text-xl font-bold text-[--text-primary]">Memorable Quotes</h2>
              </div>
              <div className="space-y-4">
                {quotes.map((quote: string, i: number) => (
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

          {/* Party Members */}
          {sections.partyMembers && partyMembers.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-indigo-400" />
                <h2 className="text-xl font-bold text-[--text-primary]">Party Members</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {partyMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-start gap-3 p-4 bg-[--bg-elevated] rounded-xl border border-white/5"
                  >
                    {member.related_image_url ? (
                      <Image
                        src={member.related_image_url}
                        alt={member.related_name}
                        width={48}
                        height={48}
                        className="rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-indigo-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-[--text-primary]">{member.related_name}</span>
                        <span className="text-xs px-2 py-0.5 bg-indigo-500/15 text-indigo-400 rounded-full border border-indigo-500/20">
                          Party Member
                        </span>
                      </div>
                      {member.occupation && (
                        <p className="text-sm text-[--text-secondary] mt-0.5">{member.occupation}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* NPCs */}
          {sections.npcs && npcs.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Heart className="w-5 h-5 text-[--arcane-purple]" />
                <h2 className="text-xl font-bold text-[--text-primary]">NPCs & Contacts</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {npcs.map((npc) => {
                  const relationshipColor = RELATIONSHIP_COLORS[npc.relationship_type] || RELATIONSHIP_COLORS.other
                  return (
                    <div
                      key={npc.id}
                      className="flex items-start gap-3 p-4 bg-[--bg-elevated] rounded-xl border border-white/5"
                    >
                      {npc.related_image_url ? (
                        <Image
                          src={npc.related_image_url}
                          alt={npc.related_name}
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-[--text-primary]">{npc.related_name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full capitalize border ${relationshipColor}`}>
                            {npc.relationship_label || npc.relationship_type.replace(/_/g, ' ')}
                          </span>
                        </div>
                        {npc.occupation && (
                          <p className="text-sm text-[--text-secondary] mt-0.5">{npc.occupation}</p>
                        )}
                        {npc.location && (
                          <p className="text-xs text-[--text-tertiary] mt-0.5">📍 {npc.location}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Companions */}
          {sections.companions && companions.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Heart className="w-5 h-5 text-pink-400" />
                <h2 className="text-xl font-bold text-[--text-primary]">Companions</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {companions.map((companion) => {
                  const typeColor = COMPANION_TYPE_COLORS[companion.companion_type || 'pet'] || COMPANION_TYPE_COLORS.other
                  return (
                    <div
                      key={companion.id}
                      className="flex items-start gap-3 p-4 bg-[--bg-elevated] rounded-xl border border-white/5"
                    >
                      {companion.related_image_url ? (
                        <Image
                          src={companion.related_image_url}
                          alt={companion.related_name}
                          width={48}
                          height={48}
                          className="rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-pink-500/10 flex items-center justify-center">
                          <Heart className="w-5 h-5 text-pink-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-[--text-primary]">{companion.related_name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full capitalize border ${typeColor}`}>
                            {(companion.companion_type || 'pet').replace(/_/g, ' ')}
                          </span>
                        </div>
                        {companion.companion_species && (
                          <p className="text-sm text-[--text-secondary] mt-0.5">{companion.companion_species}</p>
                        )}
                        {companion.description && (
                          <p className="text-xs text-[--text-tertiary] mt-1">{companion.description}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Writings */}
          {sections.writings && writings.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-[--arcane-purple]" />
                <h2 className="text-xl font-bold text-[--text-primary]">Writings</h2>
              </div>
              <div className="space-y-4">
                {writings.map((writing) => (
                  <div key={writing.id} className="bg-[--bg-elevated] rounded-xl p-5 border border-white/5">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="font-medium text-[--text-primary]">{writing.title || 'Untitled'}</h3>
                      <span className="text-xs px-2 py-0.5 bg-purple-500/15 text-purple-400 rounded capitalize">
                        {(writing.writing_type || 'other').replace(/_/g, ' ')}
                      </span>
                      {writing.in_universe_date && (
                        <span className="text-xs text-[--text-tertiary]">{writing.in_universe_date}</span>
                      )}
                    </div>
                    {writing.recipient && (
                      <p className="text-xs text-[--text-tertiary] mb-2">To: {writing.recipient}</p>
                    )}
                    <p className="text-sm text-[--text-secondary] whitespace-pre-wrap">{writing.content}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Rumors */}
          {sections.rumors && rumors.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-[--text-primary] mb-4">🗣️ Rumors</h2>
              <ul className="space-y-2">
                {rumors.map((rumor, i) => (
                  <li key={i} className="flex items-start gap-2 text-[--text-secondary]">
                    <span className={rumor.is_true ? 'text-green-400' : 'text-red-400'}>
                      {rumor.is_true ? '✓' : '✗'}
                    </span>
                    <span>{rumor.statement}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* DM Q&A */}
          {sections.dmQa && dmQa.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-[--text-primary] mb-4">DM Q&A</h2>
              <div className="space-y-3">
                {dmQa.map((qa, i) => (
                  <div key={i} className="bg-[--bg-elevated] rounded-lg p-4 border border-white/5">
                    <p className="text-sm text-purple-400 font-medium mb-2">Q: {qa.question}</p>
                    <p className="text-sm text-[--text-secondary]">A: {qa.answer}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Open Questions */}
          {sections.openQuestions && openQuestions.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-[--text-primary] mb-4">❓ Open Questions</h2>
              <ul className="space-y-2">
                {openQuestions.map((q, i) => (
                  <li key={i} className="flex items-start gap-2 text-[--text-secondary]">
                    <span className="text-purple-400">?</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Gallery */}
          {sections.gallery && galleryImages.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <ImageIcon className="w-5 h-5 text-[--arcane-purple]" />
                <h2 className="text-xl font-bold text-[--text-primary]">Gallery</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {galleryImages.map((image) => (
                  <div
                    key={image.id}
                    className="relative aspect-square rounded-xl overflow-hidden bg-[--bg-elevated] border border-white/5"
                  >
                    <Image
                      src={image.image_url}
                      alt={image.caption || 'Gallery image'}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                    />
                    {image.caption && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                        <p className="text-xs text-white/80 truncate">{image.caption}</p>
                      </div>
                    )}
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

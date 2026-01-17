import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import Image from 'next/image'
import {
  User,
  Users,
  BookOpen,
  FileText,
  Quote,
  Heart,
  Music,
  ExternalLink,
  Image as GalleryIcon,
} from 'lucide-react'
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

const COMPANION_TYPE_COLORS: Record<string, string> = {
  familiar: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  pet: 'bg-pink-500/15 text-pink-400 border-pink-500/20',
  mount: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  animal_companion: 'bg-green-500/15 text-green-400 border-green-500/20',
  construct: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  other: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
}

// Field label component
function FieldLabel({ children, emoji, count }: { children: React.ReactNode; emoji?: string; count?: number }) {
  return (
    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
      {emoji && <span>{emoji}</span>}
      {children}
      {count !== undefined && count > 0 && (
        <span className="text-gray-600">({count})</span>
      )}
    </h4>
  )
}

// Section component
function Section({ title, icon: Icon, count, children }: { title: string; icon: React.ComponentType<{ className?: string }>; count?: number; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <div className="border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="flex items-center gap-4 p-4 sm:p-5 bg-white/[0.02] border-b border-white/[0.06]">
          <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
          </div>
          <h2 className="text-base sm:text-lg font-semibold text-white/90 tracking-wide uppercase flex-1">
            {title}
            {count !== undefined && count > 0 && (
              <span className="ml-2 text-sm text-gray-500 font-normal normal-case">({count})</span>
            )}
          </h2>
        </div>
        <div className="p-4 sm:p-6">
          {children}
        </div>
      </div>
    </section>
  )
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
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Link Expired</h1>
          <p className="text-gray-400">This share link has expired.</p>
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

  const viewerHash = crypto.createHash('sha256').update(ip + share.id).digest('hex').substring(0, 16)

  // Update view tracking
  await supabase
    .from('character_shares')
    .update({
      view_count: (share.view_count || 0) + 1,
      last_viewed_at: new Date().toISOString()
    })
    .eq('id', share.id)

  await supabase
    .from('share_view_events')
    .insert({
      share_id: share.id,
      share_type: 'character',
      viewer_hash: viewerHash,
      referrer: referrer?.substring(0, 500),
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

  // Section visibility - default to showing if not explicitly false
  const rawSections = share.included_sections as Record<string, boolean> || {}
  const sections = {
    summary: rawSections.summary !== false,
    tldr: rawSections.tldr !== false,
    backstory: rawSections.backstory !== false,
    lifePhases: rawSections.lifePhases !== false,
    plotHooks: rawSections.plotHooks !== false,
    quotes: rawSections.quotes !== false,
    appearance: rawSections.appearance !== false,
    physicalDetails: rawSections.physicalDetails !== false,
    personality: rawSections.personality !== false,
    goals: rawSections.goals !== false,
    secrets: rawSections.secrets === true,
    weaknesses: rawSections.weaknesses !== false,
    fears: rawSections.fears !== false,
    partyMembers: rawSections.partyMembers !== false,
    npcs: rawSections.npcs !== false,
    companions: rawSections.companions !== false,
    writings: rawSections.writings !== false,
    rumors: rawSections.rumors === true,
    dmQa: rawSections.dmQa === true,
    openQuestions: rawSections.openQuestions === true,
    gallery: rawSections.gallery !== false,
  }

  // Fetch relationships
  let relationships: any[] = []
  if (sections.partyMembers || sections.npcs || sections.companions) {
    const { data } = await supabase
      .from('vault_character_relationships')
      .select('*')
      .eq('character_id', character.id)
      .order('display_order')
    relationships = data || []
  }

  // Fetch writings
  let writings: any[] = []
  if (sections.writings) {
    const { data } = await supabase
      .from('vault_character_writings')
      .select('*')
      .eq('character_id', character.id)
      .order('display_order')
    writings = data || []
  }

  // Fetch gallery
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

  // Parse data
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
  const commonPhrases = ((character as any).common_phrases as string[]) || []

  const displayUrl = character.detail_image_url || character.image_url

  // Check for content
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
    (sections.fears && fears.length > 0) ||
    (character.ideals || character.bonds || character.flaws) ||
    commonPhrases.length > 0

  const hasPeopleContent = (sections.partyMembers && partyMembers.length > 0) ||
    (sections.npcs && npcs.length > 0) ||
    (sections.companions && companions.length > 0)

  const hasWritingsContent = (sections.writings && writings.length > 0) ||
    (sections.rumors && rumors.length > 0) ||
    (sections.dmQa && dmQa.length > 0) ||
    (sections.openQuestions && openQuestions.length > 0)

  const hasGalleryContent = sections.gallery && galleryImages.length > 0

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full lg:w-[320px] xl:w-[360px] flex-shrink-0 bg-[#0f0f11] border-b lg:border-b-0 lg:border-r border-white/[0.06]">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Portrait */}
          <div className="mb-6">
            {displayUrl ? (
              <div className="relative w-48 sm:w-56 lg:w-full mx-auto aspect-[3/4] rounded-2xl overflow-hidden border-2 border-white/[0.08]">
                <Image
                  src={displayUrl}
                  alt={character.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 224px, 360px"
                  priority
                />
              </div>
            ) : (
              <div className="w-48 sm:w-56 lg:w-full mx-auto aspect-[3/4] rounded-2xl bg-gradient-to-br from-purple-500/5 to-transparent border-2 border-dashed border-white/[0.08] flex items-center justify-center">
                <span className="text-5xl font-semibold text-gray-600">
                  {getInitials(character.name)}
                </span>
              </div>
            )}
          </div>

          {/* Name & Type */}
          <div className="text-center lg:text-left mb-5">
            <h1 className="text-xl sm:text-2xl font-semibold text-white/90 mb-2">{character.name}</h1>
            <div className="flex items-center justify-center lg:justify-start gap-2 flex-wrap">
              <span className={`text-xs px-2.5 py-1 rounded-lg ${
                character.type === 'pc' ? 'bg-purple-500/15 text-purple-400' : 'bg-gray-500/15 text-gray-400'
              }`}>
                {character.type === 'pc' ? 'Player Character' : 'NPC'}
              </span>
              {character.status && (
                <span
                  className="text-xs px-2.5 py-1 rounded-lg"
                  style={{ backgroundColor: `${character.status_color || '#888'}20`, color: character.status_color || '#888' }}
                >
                  {character.status}
                </span>
              )}
            </div>
          </div>

          {/* Quick Details */}
          {(character.race || character.class || character.background || (character as any).level) && (
            <>
              <div className="my-5 h-px bg-gradient-to-r from-white/[0.06] via-white/[0.04] to-transparent" />
              <div className="mb-5">
                <h3 className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-3">Quick Details</h3>
                <div className="space-y-2">
                  {character.race && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Race</span>
                      <span className="text-white/80">{character.race}</span>
                    </div>
                  )}
                  {character.class && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Class</span>
                      <span className="text-white/80">{character.class}</span>
                    </div>
                  )}
                  {(character as any).level && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Level</span>
                      <span className="text-white/80">{(character as any).level}</span>
                    </div>
                  )}
                  {character.background && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Background</span>
                      <span className="text-white/80">{character.background}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Campaign Info */}
          {((character as any).game_system || (character as any).external_campaign || (character as any).dm_name) && (
            <>
              <div className="my-5 h-px bg-gradient-to-r from-white/[0.06] via-white/[0.04] to-transparent" />
              <div className="mb-5">
                <h3 className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-3">Campaign</h3>
                <div className="space-y-2">
                  {(character as any).game_system && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">System</span>
                      <span className="text-white/80">{(character as any).game_system}</span>
                    </div>
                  )}
                  {(character as any).external_campaign && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Campaign</span>
                      <span className="text-white/80">{(character as any).external_campaign}</span>
                    </div>
                  )}
                  {(character as any).dm_name && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">DM</span>
                      <span className="text-white/80">{(character as any).dm_name}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Links */}
          {(character.theme_music_url || character.character_sheet_url) && (
            <>
              <div className="my-5 h-px bg-gradient-to-r from-white/[0.06] via-white/[0.04] to-transparent" />
              <div>
                <h3 className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-3">Links</h3>
                <div className="space-y-2">
                  {character.theme_music_url && (
                    <a
                      href={character.theme_music_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 py-2 px-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-purple-500/20 transition-all"
                    >
                      <Music className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-400 flex-1 truncate">
                        {character.theme_music_title || 'Theme Music'}
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-gray-600" />
                    </a>
                  )}
                  {character.character_sheet_url && (
                    <a
                      href={character.character_sheet_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 py-2 px-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-purple-500/20 transition-all"
                    >
                      <FileText className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-400">Character Sheet</span>
                      <ExternalLink className="w-3.5 h-3.5 text-gray-600" />
                    </a>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-10 xl:p-12">
        <div className="max-w-[1200px] mx-auto">
          {/* Stats Grid */}
          <div className="mb-8">
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
              {npcs.length > 0 && (
                <div className="bg-white/[0.02] rounded-lg p-3 text-center border border-white/[0.04]">
                  <p className="text-lg font-semibold text-white">{npcs.length}</p>
                  <p className="text-xs text-gray-500">NPCs</p>
                </div>
              )}
              {companions.length > 0 && (
                <div className="bg-white/[0.02] rounded-lg p-3 text-center border border-white/[0.04]">
                  <p className="text-lg font-semibold text-white">{companions.length}</p>
                  <p className="text-xs text-gray-500">Companions</p>
                </div>
              )}
              {writings.length > 0 && (
                <div className="bg-white/[0.02] rounded-lg p-3 text-center border border-white/[0.04]">
                  <p className="text-lg font-semibold text-white">{writings.length}</p>
                  <p className="text-xs text-gray-500">Writings</p>
                </div>
              )}
              {backstoryPhases.length > 0 && (
                <div className="bg-white/[0.02] rounded-lg p-3 text-center border border-white/[0.04]">
                  <p className="text-lg font-semibold text-white">{backstoryPhases.length}</p>
                  <p className="text-xs text-gray-500">Life Phases</p>
                </div>
              )}
              {quotes.length > 0 && (
                <div className="bg-white/[0.02] rounded-lg p-3 text-center border border-white/[0.04]">
                  <p className="text-lg font-semibold text-white">{quotes.length}</p>
                  <p className="text-xs text-gray-500">Quotes</p>
                </div>
              )}
              {galleryImages.length > 0 && (
                <div className="bg-white/[0.02] rounded-lg p-3 text-center border border-white/[0.04]">
                  <p className="text-lg font-semibold text-white">{galleryImages.length}</p>
                  <p className="text-xs text-gray-500">Images</p>
                </div>
              )}
            </div>
          </div>

          {/* BACKSTORY SECTION */}
          {hasBackstoryContent && (
            <Section title="Backstory" icon={BookOpen}>
              <div className="space-y-8">
                {sections.summary && character.summary && (
                  <div>
                    <FieldLabel>Summary</FieldLabel>
                    <div className="prose prose-invert max-w-none text-gray-300" dangerouslySetInnerHTML={{ __html: character.summary }} />
                  </div>
                )}

                {sections.tldr && tldr.length > 0 && (
                  <div>
                    <FieldLabel emoji="⚡" count={tldr.length}>Quick Summary (TL;DR)</FieldLabel>
                    <ul className="space-y-1.5">
                      {tldr.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                          <span className="text-purple-400 mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {sections.backstory && character.notes && (
                  <div>
                    <FieldLabel>Full Backstory</FieldLabel>
                    <div className="prose prose-invert prose-lg max-w-none text-gray-300" dangerouslySetInnerHTML={{ __html: character.notes }} />
                  </div>
                )}

                {sections.lifePhases && backstoryPhases.length > 0 && (
                  <div>
                    <FieldLabel emoji="📅" count={backstoryPhases.length}>Life Phases</FieldLabel>
                    <div className="space-y-4">
                      {backstoryPhases.map((phase, i) => (
                        <div key={i} className="bg-white/[0.02] rounded-xl p-4 border-l-2 border-purple-500">
                          <h4 className="font-medium text-purple-400 mb-2">{phase.title}</h4>
                          <div className="text-sm text-gray-400">
                            {renderMarkdown(phase.content)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {sections.plotHooks && plotHooks.length > 0 && (
                  <div>
                    <FieldLabel emoji="🎯" count={plotHooks.length}>Plot Hooks</FieldLabel>
                    <ul className="space-y-1.5">
                      {plotHooks.map((hook, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                          <span className="text-amber-400 mt-0.5">•</span>
                          <span>{hook}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {sections.quotes && quotes.length > 0 && (
                  <div>
                    <FieldLabel emoji="💬" count={quotes.length}>Memorable Quotes</FieldLabel>
                    <div className="space-y-3">
                      {quotes.map((quote, i) => (
                        <blockquote key={i} className="pl-4 border-l-2 border-amber-500/50 text-gray-400 italic">
                          "{quote}"
                        </blockquote>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* DETAILS SECTION */}
          {hasDetailsContent && (
            <Section title="Details" icon={FileText}>
              <div className="space-y-8">
                {sections.appearance && character.appearance && (
                  <div>
                    <FieldLabel>Appearance</FieldLabel>
                    <p className="text-gray-300 whitespace-pre-wrap">{character.appearance}</p>
                  </div>
                )}

                {sections.physicalDetails && ((character as any).height || (character as any).weight || (character as any).hair || (character as any).eyes || (character as any).skin || (character as any).voice) && (
                  <div>
                    <FieldLabel>Physical Details</FieldLabel>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {(character as any).height && (
                        <div className="bg-white/[0.02] rounded-lg p-3 border border-white/[0.04]">
                          <p className="text-xs text-gray-500 mb-1">Height</p>
                          <p className="text-sm text-white/85">{(character as any).height}</p>
                        </div>
                      )}
                      {(character as any).weight && (
                        <div className="bg-white/[0.02] rounded-lg p-3 border border-white/[0.04]">
                          <p className="text-xs text-gray-500 mb-1">Weight</p>
                          <p className="text-sm text-white/85">{(character as any).weight}</p>
                        </div>
                      )}
                      {(character as any).hair && (
                        <div className="bg-white/[0.02] rounded-lg p-3 border border-white/[0.04]">
                          <p className="text-xs text-gray-500 mb-1">Hair</p>
                          <p className="text-sm text-white/85">{(character as any).hair}</p>
                        </div>
                      )}
                      {(character as any).eyes && (
                        <div className="bg-white/[0.02] rounded-lg p-3 border border-white/[0.04]">
                          <p className="text-xs text-gray-500 mb-1">Eyes</p>
                          <p className="text-sm text-white/85">{(character as any).eyes}</p>
                        </div>
                      )}
                      {(character as any).skin && (
                        <div className="bg-white/[0.02] rounded-lg p-3 border border-white/[0.04]">
                          <p className="text-xs text-gray-500 mb-1">Skin</p>
                          <p className="text-sm text-white/85">{(character as any).skin}</p>
                        </div>
                      )}
                      {(character as any).voice && (
                        <div className="bg-white/[0.02] rounded-lg p-3 border border-white/[0.04]">
                          <p className="text-xs text-gray-500 mb-1">Voice</p>
                          <p className="text-sm text-white/85">{(character as any).voice}</p>
                        </div>
                      )}
                    </div>
                    {((character as any).typical_attire || (character as any).distinguishing_marks) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                        {(character as any).typical_attire && (
                          <div className="bg-white/[0.02] rounded-lg p-3 border border-white/[0.04]">
                            <p className="text-xs text-gray-500 mb-1">Typical Attire</p>
                            <p className="text-sm text-white/85">{(character as any).typical_attire}</p>
                          </div>
                        )}
                        {(character as any).distinguishing_marks && (
                          <div className="bg-white/[0.02] rounded-lg p-3 border border-white/[0.04]">
                            <p className="text-xs text-gray-500 mb-1">Distinguishing Marks</p>
                            <p className="text-sm text-white/85">{(character as any).distinguishing_marks}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {sections.personality && character.personality && (
                  <div>
                    <FieldLabel>Personality</FieldLabel>
                    <p className="text-gray-300 whitespace-pre-wrap">{character.personality}</p>
                  </div>
                )}

                {sections.goals && character.goals && (
                  <div>
                    <FieldLabel>Goals & Motivations</FieldLabel>
                    <p className="text-gray-300 whitespace-pre-wrap">{character.goals}</p>
                  </div>
                )}

                {(character.ideals || character.bonds || character.flaws) && (
                  <div>
                    <FieldLabel>Character Values</FieldLabel>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {character.ideals && (
                        <div className="bg-white/[0.02] rounded-lg p-4 border border-white/[0.04]">
                          <p className="text-xs text-gray-500 mb-2">Ideals</p>
                          <p className="text-sm text-gray-300">{character.ideals}</p>
                        </div>
                      )}
                      {character.bonds && (
                        <div className="bg-white/[0.02] rounded-lg p-4 border border-white/[0.04]">
                          <p className="text-xs text-gray-500 mb-2">Bonds</p>
                          <p className="text-sm text-gray-300">{character.bonds}</p>
                        </div>
                      )}
                      {character.flaws && (
                        <div className="bg-white/[0.02] rounded-lg p-4 border border-white/[0.04]">
                          <p className="text-xs text-gray-500 mb-2">Flaws</p>
                          <p className="text-sm text-gray-300">{character.flaws}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {commonPhrases.length > 0 && (
                  <div>
                    <FieldLabel emoji="🗣️" count={commonPhrases.length}>Common Phrases</FieldLabel>
                    <ul className="space-y-1.5">
                      {commonPhrases.map((phrase, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                          <span className="text-purple-400 mt-0.5">•</span>
                          <span>"{phrase}"</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {sections.weaknesses && weaknesses.length > 0 && (
                  <div>
                    <FieldLabel emoji="💔" count={weaknesses.length}>Weaknesses</FieldLabel>
                    <ul className="space-y-1.5">
                      {weaknesses.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                          <span className="text-orange-400 mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {sections.fears && fears.length > 0 && (
                  <div>
                    <FieldLabel emoji="😨" count={fears.length}>Fears</FieldLabel>
                    <ul className="space-y-1.5">
                      {fears.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                          <span className="text-orange-400 mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {sections.secrets && character.secrets && (
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                    <FieldLabel emoji="🔒">Secrets</FieldLabel>
                    <p className="text-amber-200/80 whitespace-pre-wrap">{character.secrets}</p>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* PEOPLE SECTION */}
          {hasPeopleContent && (
            <Section title="People" icon={Users} count={partyMembers.length + npcs.length + companions.length}>
              <div className="space-y-8">
                {sections.partyMembers && partyMembers.length > 0 && (
                  <div>
                    <FieldLabel count={partyMembers.length}>Party Members</FieldLabel>
                    <div className="grid gap-3 md:grid-cols-2">
                      {partyMembers.map((member) => (
                        <div key={member.id} className="flex items-start gap-3 p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                          {member.related_image_url ? (
                            <Image src={member.related_image_url} alt={member.related_name || ''} width={48} height={48} className="rounded-lg object-cover" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                              <User className="w-5 h-5 text-indigo-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-white/90">{member.related_name}</p>
                              <span className="text-xs px-2 py-0.5 bg-indigo-500/15 text-indigo-400 rounded-lg border border-indigo-500/20">Party</span>
                            </div>
                            {member.occupation && <p className="text-sm text-gray-500 mt-0.5">{member.occupation}</p>}
                            {member.full_notes && <p className="text-sm text-gray-400 mt-2">{member.full_notes}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {sections.npcs && npcs.length > 0 && (
                  <div>
                    <FieldLabel count={npcs.length}>NPCs & Contacts</FieldLabel>
                    <div className="grid gap-3 md:grid-cols-2">
                      {npcs.map((npc) => {
                        const relationshipColor = RELATIONSHIP_COLORS[npc.relationship_type] || RELATIONSHIP_COLORS.other
                        return (
                          <div key={npc.id} className="flex items-start gap-3 p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                            {npc.related_image_url ? (
                              <Image src={npc.related_image_url} alt={npc.related_name || ''} width={48} height={48} className="rounded-lg object-cover" />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                <User className="w-5 h-5 text-purple-400" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-white/90">{npc.related_name}</p>
                                <span className={`text-xs px-2 py-0.5 rounded-lg border capitalize ${relationshipColor}`}>
                                  {npc.relationship_label || npc.relationship_type.replace(/_/g, ' ')}
                                </span>
                              </div>
                              {npc.occupation && <p className="text-sm text-gray-500 mt-0.5">{npc.occupation}</p>}
                              {npc.location && <p className="text-xs text-gray-600 mt-0.5">📍 {npc.location}</p>}
                              {npc.full_notes && <p className="text-sm text-gray-400 mt-2">{npc.full_notes}</p>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {sections.companions && companions.length > 0 && (
                  <div>
                    <FieldLabel count={companions.length}>Companions</FieldLabel>
                    <div className="grid gap-3 md:grid-cols-2">
                      {companions.map((companion) => {
                        const typeColor = COMPANION_TYPE_COLORS[companion.companion_type || 'pet'] || COMPANION_TYPE_COLORS.other
                        return (
                          <div key={companion.id} className="flex items-start gap-3 p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                            {companion.related_image_url ? (
                              <Image src={companion.related_image_url} alt={companion.related_name || ''} width={48} height={48} className="rounded-lg object-cover" />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-pink-500/10 flex items-center justify-center">
                                <Heart className="w-5 h-5 text-pink-400" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-white/90">{companion.related_name}</p>
                                <span className={`text-xs px-2 py-0.5 rounded-lg border capitalize ${typeColor}`}>
                                  {(companion.companion_type || 'pet').replace(/_/g, ' ')}
                                </span>
                              </div>
                              {companion.companion_species && <p className="text-sm text-gray-500 mt-0.5">{companion.companion_species}</p>}
                              {companion.description && <p className="text-sm text-gray-400 mt-2">{companion.description}</p>}
                              {companion.companion_abilities && (
                                <p className="text-sm text-purple-400/70 mt-2">✨ {companion.companion_abilities}</p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* WRITINGS SECTION */}
          {hasWritingsContent && (
            <Section title="Writings" icon={Quote} count={writings.length}>
              <div className="space-y-8">
                {sections.writings && writings.length > 0 && (
                  <div className="space-y-4">
                    {writings.map((writing) => (
                      <div key={writing.id} className="p-5 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                          <h4 className="font-medium text-white/90">{writing.title || 'Untitled'}</h4>
                          <span className="text-xs px-2 py-0.5 bg-purple-500/15 text-purple-400 rounded capitalize">
                            {(writing.writing_type || 'other').replace(/_/g, ' ')}
                          </span>
                          {writing.in_universe_date && (
                            <span className="text-xs text-gray-500">{writing.in_universe_date}</span>
                          )}
                        </div>
                        {writing.recipient && (
                          <p className="text-xs text-gray-500 mb-2">To: {writing.recipient}</p>
                        )}
                        <p className="text-sm text-gray-400 whitespace-pre-wrap">{writing.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {sections.rumors && rumors.length > 0 && (
                  <div>
                    <FieldLabel emoji="🗣️" count={rumors.length}>Rumors</FieldLabel>
                    <ul className="space-y-1.5">
                      {rumors.map((rumor, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                          <span className={rumor.is_true ? 'text-green-400' : 'text-red-400'}>
                            {rumor.is_true ? '✓' : '✗'}
                          </span>
                          <span>{rumor.statement}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {sections.dmQa && dmQa.length > 0 && (
                  <div>
                    <FieldLabel count={dmQa.length}>DM Q&A</FieldLabel>
                    <div className="space-y-3">
                      {dmQa.map((qa, i) => (
                        <div key={i} className="bg-white/[0.02] rounded-lg p-4 border border-white/[0.04]">
                          <p className="text-sm text-purple-400 font-medium mb-2">Q: {qa.question}</p>
                          <p className="text-sm text-gray-400">A: {qa.answer}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {sections.openQuestions && openQuestions.length > 0 && (
                  <div>
                    <FieldLabel emoji="❓" count={openQuestions.length}>Open Questions</FieldLabel>
                    <ul className="space-y-1.5">
                      {openQuestions.map((q, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                          <span className="text-purple-400">?</span>
                          <span>{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* GALLERY SECTION */}
          {hasGalleryContent && (
            <Section title="Gallery" icon={GalleryIcon} count={galleryImages.length}>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {galleryImages.map((image) => (
                  <div key={image.id} className="relative aspect-square rounded-xl overflow-hidden bg-white/[0.02] border border-white/[0.06]">
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
            </Section>
          )}

          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-white/10 text-center">
            <p className="text-sm text-gray-600">
              Created with Campaign Manager
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

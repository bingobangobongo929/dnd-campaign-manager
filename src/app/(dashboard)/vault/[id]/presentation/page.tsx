import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
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
  ArrowLeft,
  Edit3,
  Share2,
} from 'lucide-react'
import { getInitials } from '@/lib/utils'
import { renderMarkdown } from '@/lib/character-display'
import { sanitizeHtml } from '@/components/ui/safe-html'
import { MarkdownContent } from '@/components/ui'
import { FloatingDock } from '@/components/layout/floating-dock'
import { AttributionBanner } from '@/components/templates'

interface PresentationPageProps {
  params: Promise<{ id: string }>
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
    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
      {emoji && <span>{emoji}</span>}
      {children}
      {count !== undefined && count > 0 && (
        <span className="text-gray-600">({count})</span>
      )}
    </h4>
  )
}

// Helper to render HTML content
function HtmlContent({ html, className = '' }: { html: string; className?: string }) {
  return (
    <div
      className={`prose prose-invert max-w-none text-gray-300 prose-p:mb-6 prose-p:leading-relaxed prose-ul:my-4 prose-li:my-1 ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
    />
  )
}

// Section component
function Section({ title, icon: Icon, count, children, id }: { title: string; icon: React.ComponentType<{ className?: string }>; count?: number; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="mb-8 scroll-mt-6">
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

export default async function CharacterPresentationPage({ params }: PresentationPageProps) {
  const { id: characterId } = await params
  const supabase = await createClient()

  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Fetch character (RLS will ensure owner access)
  const { data: character, error: charError } = await supabase
    .from('vault_characters')
    .select('*')
    .eq('id', characterId)
    .single()

  if (charError || !character) {
    notFound()
  }

  // Fetch original template info if this character was created from a template
  let templateInfo: { name: string; attribution_name: string | null } | null = null
  if (character.template_id) {
    const { data: template } = await supabase
      .from('vault_characters')
      .select('name, attribution_name')
      .eq('id', character.template_id)
      .single()
    templateInfo = template
  }

  // Fetch ALL relationships (no filtering)
  const { data: relationshipsData } = await supabase
    .from('vault_character_relationships')
    .select('*')
    .eq('character_id', characterId)
    .order('display_order')
  const relationships = relationshipsData || []

  // Fetch ALL writings
  const { data: writingsData } = await supabase
    .from('vault_character_writings')
    .select('*')
    .eq('character_id', characterId)
    .order('display_order')
  const writings = writingsData || []

  // Fetch ALL gallery images
  const { data: imagesData } = await supabase
    .from('vault_character_images')
    .select('*')
    .eq('character_id', characterId)
    .order('is_primary', { ascending: false })
    .order('display_order')
  const galleryImages = imagesData || []

  // Fetch ALL sessions
  const { data: sessionsData } = await supabase
    .from('play_journal')
    .select('*')
    .eq('character_id', characterId)
    .order('session_number', { ascending: true })
  const sessions = sessionsData || []

  // Parse data - ALL content visible to owner
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

  // Check for content - ALL sections enabled
  const hasBackstoryContent = character.summary || tldr.length > 0 || character.notes || backstoryPhases.length > 0 || plotHooks.length > 0 || quotes.length > 0
  const hasDetailsContent = character.appearance || (character as any).height || character.personality || character.goals || character.secrets || weaknesses.length > 0 || fears.length > 0 || character.ideals || character.bonds || character.flaws || commonPhrases.length > 0
  const hasPeopleContent = partyMembers.length > 0 || npcs.length > 0 || companions.length > 0
  const hasWritingsContent = writings.length > 0 || rumors.length > 0 || dmQa.length > 0 || openQuestions.length > 0
  const hasGalleryContent = galleryImages.length > 0
  const hasSessionsContent = sessions.length > 0

  return (
    <>
      <FloatingDock characterId={characterId} />

      <div className="min-h-screen flex flex-col lg:flex-row">
        {/* Sidebar */}
        <aside className="w-full lg:w-[320px] xl:w-[380px] flex-shrink-0 bg-[#0f0f11] border-b lg:border-b-0 lg:border-r border-white/[0.06]">
          <div className="px-5 sm:px-6 lg:px-8 py-6 lg:py-8">
            {/* Portrait */}
            <div className="mb-6">
              {displayUrl ? (
                <div className="w-48 sm:w-56 lg:w-full mx-auto aspect-[3/4] relative rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl">
                  <Image
                    src={displayUrl}
                    alt={character.name}
                    fill
                    className="object-cover"
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
                      <div className="text-sm">
                        <span className="text-gray-500 block mb-0.5">Background</span>
                        <span className="text-white/80">{character.background}</span>
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

            {/* Navigate */}
            <div className="my-5 h-px bg-gradient-to-r from-white/[0.06] via-white/[0.04] to-transparent" />
            <div>
              <h3 className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-3">Navigate</h3>
              <nav className="space-y-1">
                {hasBackstoryContent && (
                  <a href="#backstory" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors">
                    <BookOpen className="w-4 h-4" />
                    Backstory
                  </a>
                )}
                {hasDetailsContent && (
                  <a href="#details" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors">
                    <FileText className="w-4 h-4" />
                    Details
                  </a>
                )}
                {hasPeopleContent && (
                  <a href="#people" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors">
                    <Users className="w-4 h-4" />
                    People
                  </a>
                )}
                {hasWritingsContent && (
                  <a href="#writings" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors">
                    <Quote className="w-4 h-4" />
                    Writings
                  </a>
                )}
                {hasSessionsContent && (
                  <a href="#sessions" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors">
                    <BookOpen className="w-4 h-4" />
                    Sessions
                  </a>
                )}
                {hasGalleryContent && (
                  <a href="#gallery" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors">
                    <GalleryIcon className="w-4 h-4" />
                    Gallery
                  </a>
                )}
              </nav>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-[#0d0d0f]">
          <div className="w-full max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-12 xl:px-16 py-8 lg:py-10">
            {/* Attribution banner if created from a template */}
            {templateInfo && (
              <div className="mb-8">
                <AttributionBanner
                  templateName={templateInfo.name}
                  creatorName={templateInfo.attribution_name}
                  templateId={character.template_id}
                  contentType="character"
                  version={character.saved_template_version}
                />
              </div>
            )}

            {/* Stats Grid */}
            <div className="mb-8">
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
                {npcs.length > 0 && (
                  <a href="#people" className="bg-white/[0.02] rounded-lg p-3 text-center border border-white/[0.04] hover:bg-white/[0.04] hover:border-purple-500/20 transition-all cursor-pointer">
                    <p className="text-lg font-semibold text-white">{npcs.length}</p>
                    <p className="text-xs text-gray-500">NPCs</p>
                  </a>
                )}
                {companions.length > 0 && (
                  <a href="#people" className="bg-white/[0.02] rounded-lg p-3 text-center border border-white/[0.04] hover:bg-white/[0.04] hover:border-purple-500/20 transition-all cursor-pointer">
                    <p className="text-lg font-semibold text-white">{companions.length}</p>
                    <p className="text-xs text-gray-500">Companions</p>
                  </a>
                )}
                {writings.length > 0 && (
                  <a href="#writings" className="bg-white/[0.02] rounded-lg p-3 text-center border border-white/[0.04] hover:bg-white/[0.04] hover:border-purple-500/20 transition-all cursor-pointer">
                    <p className="text-lg font-semibold text-white">{writings.length}</p>
                    <p className="text-xs text-gray-500">Writings</p>
                  </a>
                )}
                {backstoryPhases.length > 0 && (
                  <a href="#backstory" className="bg-white/[0.02] rounded-lg p-3 text-center border border-white/[0.04] hover:bg-white/[0.04] hover:border-purple-500/20 transition-all cursor-pointer">
                    <p className="text-lg font-semibold text-white">{backstoryPhases.length}</p>
                    <p className="text-xs text-gray-500">Life Phases</p>
                  </a>
                )}
                {quotes.length > 0 && (
                  <a href="#backstory" className="bg-white/[0.02] rounded-lg p-3 text-center border border-white/[0.04] hover:bg-white/[0.04] hover:border-purple-500/20 transition-all cursor-pointer">
                    <p className="text-lg font-semibold text-white">{quotes.length}</p>
                    <p className="text-xs text-gray-500">Quotes</p>
                  </a>
                )}
                {galleryImages.length > 0 && (
                  <a href="#gallery" className="bg-white/[0.02] rounded-lg p-3 text-center border border-white/[0.04] hover:bg-white/[0.04] hover:border-purple-500/20 transition-all cursor-pointer">
                    <p className="text-lg font-semibold text-white">{galleryImages.length}</p>
                    <p className="text-xs text-gray-500">Images</p>
                  </a>
                )}
              </div>
            </div>

            {/* BACKSTORY SECTION */}
            {hasBackstoryContent && (
              <Section title="Backstory" icon={BookOpen} id="backstory">
                <div className="space-y-10">
                  {character.summary && (
                    <div>
                      <FieldLabel>Summary</FieldLabel>
                      <HtmlContent html={character.summary} />
                    </div>
                  )}

                  {tldr.length > 0 && (
                    <div>
                      <FieldLabel emoji="⚡" count={tldr.length}>Quick Summary (TL;DR)</FieldLabel>
                      <ul className="space-y-1">
                        {tldr.map((item, i) => (
                          <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                            <span className="text-purple-400 flex-shrink-0">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {character.notes && (
                    <div>
                      <FieldLabel>Full Backstory</FieldLabel>
                      <HtmlContent html={character.notes} className="prose-lg" />
                    </div>
                  )}

                  {backstoryPhases.length > 0 && (
                    <div>
                      <FieldLabel emoji="📅" count={backstoryPhases.length}>Life Phases</FieldLabel>
                      <div className="space-y-3">
                        {backstoryPhases.map((phase, i) => (
                          <div key={i} className="bg-white/[0.02] rounded-lg p-4 border-l-2 border-purple-500/50">
                            <h5 className="text-sm font-medium text-purple-400 mb-2">{phase.title}</h5>
                            <div className="text-sm text-gray-400">
                              {renderMarkdown(phase.content)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {plotHooks.length > 0 && (
                    <div>
                      <FieldLabel emoji="🎯" count={plotHooks.length}>Plot Hooks</FieldLabel>
                      <ul className="space-y-1">
                        {plotHooks.map((hook, i) => (
                          <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                            <span className="text-amber-400 flex-shrink-0">•</span>
                            <span>{hook}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {quotes.length > 0 && (
                    <div>
                      <FieldLabel emoji="💬" count={quotes.length}>Memorable Quotes</FieldLabel>
                      <div className="space-y-1">
                        {quotes.map((quote, i) => (
                          <p key={i} className="text-sm text-gray-400 italic">"{quote}"</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* DETAILS SECTION */}
            {hasDetailsContent && (
              <Section title="Details" icon={FileText} id="details">
                <div className="space-y-10">
                  {character.appearance && (
                    <div>
                      <FieldLabel>Appearance</FieldLabel>
                      <MarkdownContent content={character.appearance} />
                    </div>
                  )}

                  {character.personality && (
                    <div>
                      <FieldLabel>Personality</FieldLabel>
                      <MarkdownContent content={character.personality} />
                    </div>
                  )}

                  {character.goals && (
                    <div>
                      <FieldLabel>Goals & Motivations</FieldLabel>
                      <MarkdownContent content={character.goals} />
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
                      <div className="space-y-1">
                        {commonPhrases.map((phrase, i) => (
                          <p key={i} className="text-sm text-gray-400 italic">"{phrase}"</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {weaknesses.length > 0 && (
                    <div>
                      <FieldLabel emoji="💔" count={weaknesses.length}>Weaknesses</FieldLabel>
                      <ul className="space-y-1">
                        {weaknesses.map((item, i) => (
                          <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                            <span className="text-orange-400 flex-shrink-0">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {fears.length > 0 && (
                    <div>
                      <FieldLabel emoji="😨" count={fears.length}>Fears</FieldLabel>
                      <ul className="space-y-1">
                        {fears.map((item, i) => (
                          <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                            <span className="text-orange-400 flex-shrink-0">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* SECRETS - Owner always sees this */}
                  {character.secrets && (
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                      <FieldLabel emoji="🔒">Secrets</FieldLabel>
                      <MarkdownContent content={character.secrets} className="[&_p]:text-amber-200/80 [&_strong]:text-amber-100" />
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* PEOPLE SECTION */}
            {hasPeopleContent && (
              <Section title="People" icon={Users} count={partyMembers.length + npcs.length + companions.length} id="people">
                <div className="space-y-10">
                  {partyMembers.length > 0 && (
                    <div>
                      <FieldLabel count={partyMembers.length}>Party Members</FieldLabel>
                      <div className="grid gap-3 md:grid-cols-2">
                        {partyMembers.map((member) => (
                          <div key={member.id} className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3 hover:border-white/[0.1] transition-colors">
                            <div className="flex items-center gap-2 flex-wrap">
                              {member.related_image_url && (
                                <Image src={member.related_image_url} alt={member.related_name || ''} width={40} height={40} className="rounded-lg object-cover flex-shrink-0" />
                              )}
                              <span className="font-medium text-white/90">{member.related_name}</span>
                              <span className="text-xs px-2 py-0.5 bg-indigo-500/15 text-indigo-400 rounded-md border border-indigo-500/20">Party</span>
                            </div>
                            {member.occupation && <p className="text-xs text-gray-500 mt-1">💼 {member.occupation}</p>}
                            {member.full_notes && (
                              <div className="mt-2 pt-2 border-t border-white/[0.06]">
                                <div className="text-xs text-gray-400">{renderMarkdown(member.full_notes)}</div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {npcs.length > 0 && (
                    <div>
                      <FieldLabel count={npcs.length}>NPCs & Contacts</FieldLabel>
                      <div className="grid gap-3 md:grid-cols-2">
                        {npcs.map((npc) => {
                          const relationshipColor = RELATIONSHIP_COLORS[npc.relationship_type] || RELATIONSHIP_COLORS.other
                          return (
                            <div key={npc.id} className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3 hover:border-white/[0.1] transition-colors">
                              <div className="flex items-center gap-2 flex-wrap">
                                {npc.related_image_url && (
                                  <Image src={npc.related_image_url} alt={npc.related_name || ''} width={40} height={40} className="w-10 h-10 rounded-lg object-cover" />
                                )}
                                <span className="font-medium text-white/90">{npc.related_name}</span>
                                {npc.nickname && <span className="text-sm text-gray-500 italic">"{npc.nickname}"</span>}
                                <span className={`text-xs px-2 py-0.5 rounded-md capitalize border ${relationshipColor}`}>
                                  {npc.relationship_label || npc.relationship_type.replace(/_/g, ' ')}
                                </span>
                              </div>
                              {npc.occupation && <p className="text-xs text-gray-500 mt-1">💼 {npc.occupation}</p>}
                              {npc.location && <p className="text-xs text-gray-500 mt-1">📍 {npc.location}</p>}
                              {npc.full_notes && (
                                <div className="mt-2 pt-2 border-t border-white/[0.06]">
                                  <div className="text-xs text-gray-400">{renderMarkdown(npc.full_notes)}</div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {companions.length > 0 && (
                    <div>
                      <FieldLabel count={companions.length}>Companions</FieldLabel>
                      <div className="grid gap-3 md:grid-cols-2">
                        {companions.map((companion) => {
                          const typeColor = COMPANION_TYPE_COLORS[companion.companion_type || 'pet'] || COMPANION_TYPE_COLORS.other
                          return (
                            <div key={companion.id} className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3 hover:border-white/[0.1] transition-colors">
                              <div className="flex items-center gap-2">
                                {companion.related_image_url ? (
                                  <Image src={companion.related_image_url} alt={companion.related_name || ''} width={32} height={32} className="w-8 h-8 rounded-lg object-cover" />
                                ) : (
                                  <Heart className="w-4 h-4 text-pink-400 flex-shrink-0" />
                                )}
                                <span className="font-medium text-white/90">{companion.related_name}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-md capitalize border ${typeColor}`}>
                                  {(companion.companion_type || 'pet').replace(/_/g, ' ')}
                                </span>
                              </div>
                              {companion.description && (
                                <div className="mt-2">
                                  <MarkdownContent content={companion.description} className="text-xs [&_p]:text-gray-400" />
                                </div>
                              )}
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
              <Section title="Writings" icon={Quote} count={writings.length} id="writings">
                <div className="space-y-10">
                  {writings.length > 0 && (
                    <div className="space-y-4">
                      {writings.map((writing) => (
                        <div key={writing.id} className="p-5 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                          <div className="flex items-center gap-3 mb-3 flex-wrap">
                            <h4 className="font-medium text-white/90">{writing.title || 'Untitled'}</h4>
                            <span className="text-xs px-2 py-0.5 bg-purple-500/15 text-purple-400 rounded capitalize">
                              {(writing.writing_type || 'other').replace(/_/g, ' ')}
                            </span>
                          </div>
                          <MarkdownContent content={writing.content} className="text-sm [&_p]:text-gray-400" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* RUMORS - Owner always sees this with truth values */}
                  {rumors.length > 0 && (
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

                  {/* DM Q&A - Owner always sees this */}
                  {dmQa.length > 0 && (
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

                  {/* OPEN QUESTIONS - Owner always sees this */}
                  {openQuestions.length > 0 && (
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

            {/* SESSIONS SECTION */}
            {hasSessionsContent && (
              <Section title="Session Notes" icon={BookOpen} count={sessions.length} id="sessions">
                <div className="space-y-6">
                  {sessions.map((session) => (
                    <div key={session.id} className="p-5 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <span className="text-sm font-semibold text-purple-400 bg-purple-500/15 px-2.5 py-1 rounded">
                          Session {session.session_number ?? '?'}
                        </span>
                        {session.session_date && (
                          <span className="text-sm text-gray-500">
                            {new Date(session.session_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {session.title && (
                        <h4 className="text-base font-semibold text-white/90 mb-3">{session.title}</h4>
                      )}
                      {session.summary && (
                        <div className="mb-4">
                          <HtmlContent html={session.summary} />
                        </div>
                      )}
                      {session.notes && (
                        <div className="prose prose-invert prose-sm max-w-none text-gray-400">
                          <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(session.notes) }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* GALLERY SECTION */}
            {hasGalleryContent && (
              <Section title="Gallery" icon={GalleryIcon} count={galleryImages.length} id="gallery">
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
                Viewing as owner
              </p>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}

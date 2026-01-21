'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import {
  BookOpen,
  FileText,
  Users,
  Quote,
  Image as GalleryIcon,
  ChevronDown,
  ChevronUp,
  Edit3,
  Share2,
  User,
  ExternalLink,
  Music,
  Heart,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { Button, SafeHtml, Modal, Spinner } from '@/components/ui'
import { MobileLayout } from '@/components/mobile'
import { UnifiedShareModal } from '@/components/share/UnifiedShareModal'
import { AttributionBanner } from '@/components/templates'
import { cn, getInitials } from '@/lib/utils'
import {
  BulletListDisplay,
  QuotesDisplay,
  LifePhaseDisplay,
} from '@/components/vault/display'
import type {
  VaultCharacter,
  VaultCharacterRelationship,
  VaultCharacterImage,
  CharacterLink,
} from '@/types/database'

interface TemplateInfo {
  name: string
  attribution_name: string | null
}

export interface CharacterViewPageMobileProps {
  characterId: string
  character: VaultCharacter | null
  loading: boolean
  notFound: boolean
  onNavigate: (path: string) => void
  templateInfo?: TemplateInfo | null
}

// Relationship type colors
const RELATIONSHIP_COLORS: Record<string, string> = {
  family: 'bg-red-500/15 text-red-400',
  mentor: 'bg-blue-500/15 text-blue-400',
  friend: 'bg-green-500/15 text-green-400',
  enemy: 'bg-orange-500/15 text-orange-400',
  patron: 'bg-purple-500/15 text-purple-400',
  contact: 'bg-cyan-500/15 text-cyan-400',
  ally: 'bg-emerald-500/15 text-emerald-400',
  employer: 'bg-yellow-500/15 text-yellow-400',
  love_interest: 'bg-pink-500/15 text-pink-400',
  rival: 'bg-amber-500/15 text-amber-400',
  acquaintance: 'bg-slate-500/15 text-slate-400',
  party_member: 'bg-indigo-500/15 text-indigo-400',
  other: 'bg-gray-500/15 text-gray-400',
}

const COMPANION_TYPE_COLORS: Record<string, string> = {
  familiar: 'bg-purple-500/15 text-purple-400',
  pet: 'bg-pink-500/15 text-pink-400',
  mount: 'bg-amber-500/15 text-amber-400',
  animal_companion: 'bg-green-500/15 text-green-400',
  construct: 'bg-blue-500/15 text-blue-400',
  other: 'bg-gray-500/15 text-gray-400',
}

// Mobile collapsible section
function MobileSection({
  title,
  icon: Icon,
  count,
  children,
  defaultExpanded = false,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  count?: number
  children: React.ReactNode
  defaultExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div className="border border-white/[0.06] rounded-xl overflow-hidden mb-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-3 w-full p-4 bg-white/[0.02] active:bg-white/[0.04] transition-colors text-left"
      >
        <div className="p-2 bg-purple-500/10 rounded-lg">
          <Icon className="w-4 h-4 text-purple-400" />
        </div>
        <h2 className="text-base font-semibold text-white/90 flex-1">
          {title}
          {count !== undefined && count > 0 && (
            <span className="ml-2 text-sm text-gray-500 font-normal">({count})</span>
          )}
        </h2>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>
      {expanded && (
        <div className="p-4 border-t border-white/[0.06]">
          {children}
        </div>
      )}
    </div>
  )
}

function FieldLabel({ children, emoji }: { children: React.ReactNode; emoji?: string }) {
  return (
    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
      {emoji && <span>{emoji}</span>}
      {children}
    </h3>
  )
}

export function CharacterViewPageMobile({
  characterId,
  character,
  loading,
  notFound,
  onNavigate,
  templateInfo,
}: CharacterViewPageMobileProps) {
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxImage, setLightboxImage] = useState('')

  // Related data
  const [npcs, setNpcs] = useState<VaultCharacterRelationship[]>([])
  const [companions, setCompanions] = useState<VaultCharacterRelationship[]>([])
  const [galleryImages, setGalleryImages] = useState<VaultCharacterImage[]>([])
  const [links, setLinks] = useState<CharacterLink[]>([])

  // Fetch related data
  useEffect(() => {
    if (!character?.id) return

    const supabase = createClient()

    // Fetch relationships
    supabase
      .from('vault_character_relationships')
      .select('*')
      .eq('character_id', character.id)
      .order('name')
      .then(({ data }) => {
        const allRelations = data || []
        setNpcs(allRelations.filter(r => r.relationship_category === 'npc'))
        setCompanions(allRelations.filter(r => r.relationship_category === 'companion'))
      })

    // Fetch gallery images
    supabase
      .from('vault_character_images')
      .select('*')
      .eq('character_id', character.id)
      .order('sort_order')
      .then(({ data }) => setGalleryImages(data || []))

    // Fetch links
    supabase
      .from('character_links')
      .select('*')
      .eq('character_id', character.id)
      .order('sort_order')
      .then(({ data }) => setLinks(data || []))
  }, [character?.id])

  // Parse structured data from character (using type casts as the types may be Json)
  const tldr = ((character as any)?.tldr as string[]) || []
  const backstoryPhases = ((character as any)?.backstory_phases as { title: string; content: string }[]) || []
  const plotHooks = ((character as any)?.plot_hooks as string[]) || []
  const quotes = ((character as any)?.quotes as string[]) || []
  const writings = ((character as any)?.writings as { title?: string; content: string }[]) || []
  const secrets = ((character as any)?.secrets as string[]) || []
  const goals = ((character as any)?.goals as string[]) || []
  const personalityTraits = ((character as any)?.personality_traits as string[]) || []
  const ideals = ((character as any)?.ideals as string[]) || []
  const bonds = ((character as any)?.bonds as string[]) || []
  const flaws = ((character as any)?.flaws as string[]) || []
  const fears = ((character as any)?.fears as string[]) || []
  const quirks = ((character as any)?.quirks as string[]) || []

  // Determine what content exists
  const hasBackstoryContent = character?.summary || character?.notes || tldr.length > 0 || backstoryPhases.length > 0 || plotHooks.length > 0 || quotes.length > 0
  const hasDetailsContent = character?.appearance || personalityTraits.length > 0 || ideals.length > 0 || bonds.length > 0 || flaws.length > 0 || fears.length > 0 || quirks.length > 0 || goals.length > 0 || secrets.length > 0
  const hasPeopleContent = npcs.length > 0 || companions.length > 0
  const hasWritingsContent = writings.length > 0
  const hasGalleryContent = galleryImages.length > 0

  // Display image
  const displayUrl = character?.detail_image_url || character?.image_url

  if (loading) {
    return (
      <AppLayout characterId={characterId}>
        <MobileLayout title="Character" showBackButton backHref="/vault">
          <div className="flex items-center justify-center h-[60vh]">
            <Spinner size="lg" />
          </div>
        </MobileLayout>
      </AppLayout>
    )
  }

  if (notFound || !character) {
    return (
      <AppLayout>
        <MobileLayout title="Not Found" showBackButton backHref="/vault">
          <div className="flex items-center justify-center h-[60vh] px-6">
            <div className="text-center">
              <h1 className="text-xl font-bold text-white mb-3">Character Not Found</h1>
              <p className="text-sm text-gray-400 mb-6">
                This character doesn't exist or you don't have access.
              </p>
              <Button onClick={() => onNavigate('/vault')}>
                Back to Vault
              </Button>
            </div>
          </div>
        </MobileLayout>
      </AppLayout>
    )
  }

  return (
    <AppLayout characterId={characterId}>
      <MobileLayout
        title={character.name}
        showBackButton
        backHref="/vault"
        actions={
          <div className="flex items-center gap-1">
            <button
              onClick={() => onNavigate(`/vault/${character.id}`)}
              className="p-2 rounded-lg active:bg-white/[0.1] transition-colors"
            >
              <Edit3 className="w-5 h-5 text-gray-400" />
            </button>
            <button
              onClick={() => setShareModalOpen(true)}
              className="p-2 rounded-lg active:bg-white/[0.1] transition-colors"
            >
              <Share2 className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        }
      >
        <div className="pb-24">
          {/* Attribution banner if created from a template */}
          {templateInfo && character && (
            <div className="px-4 mb-4">
              <AttributionBanner
                templateName={templateInfo.name}
                creatorName={templateInfo.attribution_name}
                templateId={character.template_id}
                contentType="character"
                version={character.saved_template_version}
                compact
              />
            </div>
          )}

          {/* Hero Image */}
          <div className="px-4 mb-4">
            {displayUrl ? (
              <button
                onClick={() => {
                  setLightboxImage(displayUrl)
                  setLightboxOpen(true)
                }}
                className="w-full aspect-[3/4] rounded-2xl overflow-hidden relative border border-white/[0.08]"
              >
                <Image
                  src={displayUrl}
                  alt={character.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 400px"
                />
              </button>
            ) : (
              <div className="w-full aspect-[3/4] rounded-2xl bg-gradient-to-br from-purple-500/10 to-gray-900 border border-white/[0.08] flex items-center justify-center">
                <span className="text-5xl font-bold text-purple-400/30">
                  {getInitials(character.name)}
                </span>
              </div>
            )}
          </div>

          {/* Character Info */}
          <div className="px-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className={cn(
                "text-xs px-2 py-1 rounded-lg font-medium",
                character.type === 'pc' ? "bg-purple-500/15 text-purple-400" : "bg-gray-500/15 text-gray-400"
              )}>
                {character.type === 'pc' ? 'Player Character' : 'NPC'}
              </span>
              {character.status && (
                <span
                  className="text-xs px-2 py-1 rounded-lg font-medium"
                  style={{
                    backgroundColor: `${character.status_color || '#888'}20`,
                    color: character.status_color || '#888',
                  }}
                >
                  {character.status}
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold text-white mb-1">{character.name}</h1>

            {(character.race || character.class) && (
              <p className="text-gray-400 mb-3">
                {[character.race, character.class].filter(Boolean).join(' • ')}
              </p>
            )}

            {/* Quick Stats */}
            <div className="flex flex-wrap gap-2 mb-4">
              {character.level && (
                <span className="text-xs px-2 py-1 bg-white/[0.04] rounded text-gray-400">
                  Level {character.level}
                </span>
              )}
              {character.pronouns && (
                <span className="text-xs px-2 py-1 bg-white/[0.04] rounded text-gray-400">
                  {character.pronouns}
                </span>
              )}
              {character.age && (
                <span className="text-xs px-2 py-1 bg-white/[0.04] rounded text-gray-400">
                  {character.age} years old
                </span>
              )}
            </div>

            {/* Links */}
            {(links.length > 0 || character.spotify_playlist || character.character_sheet_url) && (
              <div className="flex flex-wrap gap-2">
                {character.spotify_playlist && (
                  <a
                    href={character.spotify_playlist}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1DB954]/10 text-[#1DB954] text-sm active:bg-[#1DB954]/20"
                  >
                    <Music className="w-4 h-4" />
                    <span>Playlist</span>
                  </a>
                )}
                {character.character_sheet_url && (
                  <a
                    href={character.character_sheet_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.04] text-gray-300 text-sm active:bg-white/[0.08]"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Sheet</span>
                  </a>
                )}
                {links.slice(0, 3).map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.04] text-gray-300 text-sm active:bg-white/[0.08]"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>{link.title}</span>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Sections */}
          <div className="px-4">
            {/* BACKSTORY */}
            {hasBackstoryContent && (
              <MobileSection title="Backstory" icon={BookOpen} defaultExpanded>
                <div className="space-y-6">
                  {character.summary && (
                    <div>
                      <FieldLabel>Summary</FieldLabel>
                      <SafeHtml
                        html={character.summary}
                        className="prose prose-invert prose-sm max-w-none text-gray-300"
                      />
                    </div>
                  )}

                  {tldr.length > 0 && (
                    <div>
                      <FieldLabel emoji="⚡">Quick Summary</FieldLabel>
                      <BulletListDisplay items={tldr} bulletColor="purple" />
                    </div>
                  )}

                  {character.notes && (
                    <div>
                      <FieldLabel>Full Backstory</FieldLabel>
                      <SafeHtml
                        html={character.notes}
                        className="prose prose-invert prose-sm max-w-none text-gray-300"
                      />
                    </div>
                  )}

                  {backstoryPhases.length > 0 && (
                    <div>
                      <FieldLabel emoji="📅">Life Phases</FieldLabel>
                      <LifePhaseDisplay phases={backstoryPhases} />
                    </div>
                  )}

                  {plotHooks.length > 0 && (
                    <div>
                      <FieldLabel emoji="🎯">Plot Hooks</FieldLabel>
                      <BulletListDisplay items={plotHooks} bulletColor="amber" />
                    </div>
                  )}

                  {quotes.length > 0 && (
                    <div>
                      <FieldLabel emoji="💬">Quotes</FieldLabel>
                      <QuotesDisplay quotes={quotes} />
                    </div>
                  )}
                </div>
              </MobileSection>
            )}

            {/* DETAILS */}
            {hasDetailsContent && (
              <MobileSection title="Details" icon={FileText}>
                <div className="space-y-6">
                  {character.appearance && (
                    <div>
                      <FieldLabel>Appearance</FieldLabel>
                      <p className="text-gray-300 text-sm whitespace-pre-wrap">{character.appearance}</p>
                    </div>
                  )}

                  {personalityTraits.length > 0 && (
                    <div>
                      <FieldLabel emoji="🎭">Personality</FieldLabel>
                      <BulletListDisplay items={personalityTraits} bulletColor="purple" />
                    </div>
                  )}

                  {goals.length > 0 && (
                    <div>
                      <FieldLabel emoji="⭐">Goals</FieldLabel>
                      <BulletListDisplay items={goals} bulletColor="amber" />
                    </div>
                  )}

                  {secrets.length > 0 && (
                    <div>
                      <FieldLabel emoji="🔒">Secrets</FieldLabel>
                      <BulletListDisplay items={secrets} bulletColor="orange" />
                    </div>
                  )}

                  {ideals.length > 0 && (
                    <div>
                      <FieldLabel>Ideals</FieldLabel>
                      <BulletListDisplay items={ideals} bulletColor="purple" />
                    </div>
                  )}

                  {bonds.length > 0 && (
                    <div>
                      <FieldLabel>Bonds</FieldLabel>
                      <BulletListDisplay items={bonds} bulletColor="amber" />
                    </div>
                  )}

                  {flaws.length > 0 && (
                    <div>
                      <FieldLabel>Flaws</FieldLabel>
                      <BulletListDisplay items={flaws} bulletColor="orange" />
                    </div>
                  )}

                  {fears.length > 0 && (
                    <div>
                      <FieldLabel emoji="😨">Fears</FieldLabel>
                      <BulletListDisplay items={fears} bulletColor="orange" />
                    </div>
                  )}

                  {quirks.length > 0 && (
                    <div>
                      <FieldLabel>Quirks</FieldLabel>
                      <BulletListDisplay items={quirks} bulletColor="amber" />
                    </div>
                  )}
                </div>
              </MobileSection>
            )}

            {/* PEOPLE */}
            {hasPeopleContent && (
              <MobileSection title="People" icon={Users} count={npcs.length + companions.length}>
                <div className="space-y-6">
                  {npcs.length > 0 && (
                    <div>
                      <FieldLabel emoji="👥">NPCs</FieldLabel>
                      <div className="space-y-3">
                        {npcs.map((npc) => (
                          <div
                            key={npc.id}
                            className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.04]"
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                                <User className="w-5 h-5 text-gray-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium text-white text-sm">{npc.related_name}</h4>
                                  <span className={cn(
                                    "text-[10px] px-1.5 py-0.5 rounded",
                                    RELATIONSHIP_COLORS[npc.relationship_type || 'other']
                                  )}>
                                    {npc.relationship_type?.replace('_', ' ')}
                                  </span>
                                </div>
                                {npc.description && (
                                  <p className="text-xs text-gray-400 line-clamp-2">{npc.description}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {companions.length > 0 && (
                    <div>
                      <FieldLabel emoji="🐾">Companions</FieldLabel>
                      <div className="space-y-3">
                        {companions.map((companion) => (
                          <div
                            key={companion.id}
                            className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.04]"
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                                <Heart className="w-5 h-5 text-pink-400/50" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium text-white text-sm">{companion.related_name}</h4>
                                  <span className={cn(
                                    "text-[10px] px-1.5 py-0.5 rounded",
                                    COMPANION_TYPE_COLORS[companion.companion_type || 'other']
                                  )}>
                                    {companion.companion_type?.replace('_', ' ')}
                                  </span>
                                </div>
                                {companion.description && (
                                  <p className="text-xs text-gray-400 line-clamp-2">{companion.description}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </MobileSection>
            )}

            {/* WRITINGS */}
            {hasWritingsContent && (
              <MobileSection title="Writings" icon={Quote} count={writings.length}>
                <div className="space-y-4">
                  {writings.map((writing, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.04]"
                    >
                      {writing.title && (
                        <h4 className="font-medium text-white text-sm mb-2">{writing.title}</h4>
                      )}
                      <SafeHtml
                        html={writing.content}
                        className="prose prose-invert prose-sm max-w-none text-gray-300"
                      />
                    </div>
                  ))}
                </div>
              </MobileSection>
            )}

            {/* GALLERY */}
            {hasGalleryContent && (
              <MobileSection title="Gallery" icon={GalleryIcon} count={galleryImages.length}>
                <div className="grid grid-cols-2 gap-2">
                  {galleryImages.map((img) => (
                    <button
                      key={img.id}
                      onClick={() => {
                        setLightboxImage(img.image_url)
                        setLightboxOpen(true)
                      }}
                      className="aspect-square rounded-lg overflow-hidden relative"
                    >
                      <Image
                        src={img.image_url}
                        alt={img.caption || 'Gallery image'}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, 200px"
                      />
                    </button>
                  ))}
                </div>
              </MobileSection>
            )}
          </div>
        </div>

        {/* Share Modal */}
        <UnifiedShareModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          contentType="character"
          contentId={character.id}
          contentName={character.name}
          contentMode={character.content_mode || 'active'}
        />

        {/* Lightbox */}
        <Modal
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          title=""
          size="full"
        >
          <div className="flex items-center justify-center min-h-[60vh]">
            {lightboxImage && (
              <Image
                src={lightboxImage}
                alt="Full size"
                width={800}
                height={800}
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
              />
            )}
          </div>
        </Modal>
      </MobileLayout>
    </AppLayout>
  )
}

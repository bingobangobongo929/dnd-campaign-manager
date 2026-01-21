'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { cn, getInitials } from '@/lib/utils'
import { renderMarkdown } from '@/lib/character-display'
import {
  User,
  Users,
  Quote,
  BookOpen,
  FileText,
  Image as GalleryIcon,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Music,
  ExternalLink,
  Edit3,
  Share2,
  Eye,
  EyeOff,
  X,
  Heart,
} from 'lucide-react'
import { Modal, SafeHtml, MarkdownContent } from '@/components/ui'
import { UnifiedShareModal } from '@/components/share/UnifiedShareModal'
import type {
  VaultCharacter,
  VaultCharacterRelationship,
  VaultCharacterImage,
  PlayJournal,
  CharacterLink,
} from '@/types/database'
import {
  BulletListDisplay,
  QuotesDisplay,
  LifePhaseDisplay,
} from './display'

// Section types for navigation
type SectionType = 'backstory' | 'details' | 'people' | 'writings' | 'gallery'

// Navigation sections configuration
const SECTIONS: { id: SectionType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'backstory', label: 'Backstory', icon: BookOpen },
  { id: 'details', label: 'Details', icon: FileText },
  { id: 'people', label: 'People', icon: Users },
  { id: 'writings', label: 'Writings', icon: Quote },
  { id: 'gallery', label: 'Gallery', icon: GalleryIcon },
]

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

// Emoji constants
const EMOJIS = {
  occupation: '💼',
  location: '📍',
  faction: '🏛️',
  needs: '🎯',
  canProvide: '🎁',
  goals: '⭐',
  secrets: '🔒',
}

interface CharacterViewerProps {
  character: VaultCharacter
}

// CollapsibleSection for view mode
interface CollapsibleSectionProps {
  id: SectionType
  title: string
  icon: React.ComponentType<{ className?: string }>
  count?: number
  children: React.ReactNode
  isExpanded: boolean
  onToggle: () => void
}

function CollapsibleSection({
  id,
  title,
  icon: Icon,
  count,
  children,
  isExpanded,
  onToggle
}: CollapsibleSectionProps) {
  return (
    <section id={id} className="scroll-mt-8 mb-6">
      <div className="border border-white/[0.06] rounded-xl overflow-hidden">
        <button
          onClick={onToggle}
          className="flex items-center gap-4 w-full p-4 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-200 text-left"
        >
          <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
            <Icon className="w-5 h-5 text-purple-400" />
          </div>
          <h2 className="text-lg font-semibold text-white/90 tracking-wide uppercase flex-1">
            {title}
            {count !== undefined && count > 0 && (
              <span className="ml-2 text-sm text-gray-500 font-normal normal-case">({count})</span>
            )}
          </h2>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>

        {isExpanded && (
          <div className="p-6 border-t border-white/[0.06]">
            {children}
          </div>
        )}
      </div>
    </section>
  )
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

export function CharacterViewer({ character }: CharacterViewerProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Active section for navigation highlighting
  const [activeSection, setActiveSection] = useState<SectionType>('backstory')
  const [showSecrets, setShowSecrets] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [shareModalOpen, setShareModalOpen] = useState(false)

  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState<Record<SectionType, boolean>>({
    backstory: true,
    details: true,
    people: true,
    writings: true,
    gallery: true,
  })

  // Related data
  const [relationships, setRelationships] = useState<VaultCharacterRelationship[]>([])
  const [galleryImages, setGalleryImages] = useState<VaultCharacterImage[]>([])
  const [writings, setWritings] = useState<{ title: string; type: string; content: string; recipient?: string; in_universe_date?: string }[]>([])

  // Detail modal state
  const [detailModal, setDetailModal] = useState<{ type: 'npc' | 'companion'; data: VaultCharacterRelationship } | null>(null)

  // Derived data
  const partyMembers = relationships.filter(r => r.is_party_member && !r.is_companion)
  const npcs = relationships.filter(r => !r.is_companion && !r.is_party_member)
  const companions = relationships.filter(r => r.is_companion)

  // Parse character data
  const tldr = (character.tldr as string[]) || []
  const quotes = (character.quotes as string[]) || []
  const plotHooks = (character.plot_hooks as string[]) || []
  const fears = ((character as any).fears as string[]) || []
  const weaknesses = (character.weaknesses as string[]) || []
  const backstoryPhases = ((character as any).backstory_phases as { title: string; content: string }[]) || []
  const dmQa = (character.dm_qa as { question: string; answer: string }[]) || []
  const rumors = (character.rumors as { statement: string; is_true: boolean }[]) || []
  const openQuestions = ((character as any).open_questions as string[]) || []
  const secondaryCharacters = ((character as any).secondary_characters as { name: string; concept: string; notes?: string }[]) || []

  const toggleSection = (section: SectionType) => {
    const container = scrollContainerRef.current
    const scrollTop = container?.scrollTop ?? 0
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
    requestAnimationFrame(() => {
      if (container) container.scrollTop = scrollTop
    })
  }

  // Scroll to section
  const scrollToSection = useCallback((sectionId: SectionType) => {
    const element = document.getElementById(sectionId)
    if (element && scrollContainerRef.current) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  // Detect active section on scroll
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const sectionIds: SectionType[] = ['backstory', 'details', 'people', 'writings', 'gallery']
      const containerRect = container.getBoundingClientRect()

      for (const sectionId of sectionIds) {
        const element = document.getElementById(sectionId)
        if (element) {
          const rect = element.getBoundingClientRect()
          if (rect.top <= containerRect.top + 150 && rect.bottom > containerRect.top) {
            setActiveSection(sectionId)
            break
          }
        }
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  // Load related data
  useEffect(() => {
    const loadRelatedData = async () => {
      const [
        { data: rels },
        { data: images },
        { data: writingsData },
      ] = await Promise.all([
        supabase.from('vault_character_relationships').select('*').eq('character_id', character.id).order('display_order'),
        supabase.from('vault_character_images').select('*').eq('character_id', character.id).order('is_primary', { ascending: false }).order('display_order'),
        supabase.from('vault_character_writings').select('*').eq('character_id', character.id).order('display_order'),
      ])

      if (rels) setRelationships(rels)
      if (images) setGalleryImages(images)
      if (writingsData) {
        setWritings(writingsData.map(w => ({
          title: w.title,
          type: w.writing_type || 'other',
          content: w.content,
          recipient: w.recipient || undefined,
          in_universe_date: w.in_universe_date || undefined,
        })))
      }
    }

    loadRelatedData()
  }, [character.id, supabase])

  // Check if sections have content
  const hasBackstoryContent = character.summary || character.notes || tldr.length > 0 || backstoryPhases.length > 0 || plotHooks.length > 0 || quotes.length > 0
  const hasDetailsContent = character.appearance || (character as any).height || character.personality || character.goals || character.secrets || fears.length > 0 || weaknesses.length > 0
  const hasPeopleContent = partyMembers.length > 0 || npcs.length > 0 || companions.length > 0
  const hasWritingsContent = writings.length > 0 || rumors.length > 0 || dmQa.length > 0 || openQuestions.length > 0 || secondaryCharacters.length > 0
  const hasGalleryContent = galleryImages.length > 0

  // Available sections (only those with content)
  const availableSections = SECTIONS.filter(s => {
    if (s.id === 'backstory') return hasBackstoryContent
    if (s.id === 'details') return hasDetailsContent
    if (s.id === 'people') return hasPeopleContent
    if (s.id === 'writings') return hasWritingsContent
    if (s.id === 'gallery') return hasGalleryContent
    return true
  })

  const displayUrl = character.detail_image_url || character.image_url

  // NPC Detail Modal
  const NPCDetailModal = () => {
    if (!detailModal || detailModal.type !== 'npc') return null
    const npc = detailModal.data
    const relationshipColor = RELATIONSHIP_COLORS[npc.relationship_type] || RELATIONSHIP_COLORS.other

    return (
      <Modal isOpen={true} onClose={() => setDetailModal(null)} title={npc.related_name || 'Character Details'} size="lg">
        <div className="space-y-6">
          {/* Header with image */}
          <div className="flex gap-4">
            {npc.related_image_url && (
              <Image
                src={npc.related_image_url}
                alt={npc.related_name || ''}
                width={120}
                height={120}
                className="rounded-xl object-cover"
              />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <h3 className="text-xl font-semibold text-white">{npc.related_name}</h3>
                {npc.nickname && (
                  <span className="text-gray-400 italic">"{npc.nickname}"</span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-sm px-3 py-1 rounded-lg capitalize border ${relationshipColor}`}>
                  {npc.relationship_label || npc.relationship_type.replace(/_/g, ' ')}
                </span>
                {npc.relationship_status && npc.relationship_status !== 'active' && (
                  <span className="text-sm px-3 py-1 bg-gray-500/15 text-gray-400 rounded-lg capitalize">
                    {npc.relationship_status}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-4">
            {npc.occupation && (
              <div>
                <p className="text-xs text-gray-500 mb-1">{EMOJIS.occupation} Occupation</p>
                <p className="text-sm text-gray-300">{npc.occupation}</p>
              </div>
            )}
            {npc.location && (
              <div>
                <p className="text-xs text-gray-500 mb-1">{EMOJIS.location} Location</p>
                <p className="text-sm text-gray-300">{npc.location}</p>
              </div>
            )}
            {npc.origin && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Origin</p>
                <p className="text-sm text-gray-300">{npc.origin}</p>
              </div>
            )}
            {npc.faction_affiliations && npc.faction_affiliations.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1">{EMOJIS.faction} Factions</p>
                <p className="text-sm text-gray-300">{npc.faction_affiliations.join(', ')}</p>
              </div>
            )}
          </div>

          {/* Motivations */}
          {(npc.needs || npc.can_provide || npc.goals) && (
            <div className="space-y-3 pt-4 border-t border-white/10">
              {npc.needs && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">{EMOJIS.needs} Needs</p>
                  <p className="text-sm text-gray-300">{npc.needs}</p>
                </div>
              )}
              {npc.can_provide && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">{EMOJIS.canProvide} Can Provide</p>
                  <p className="text-sm text-gray-300">{npc.can_provide}</p>
                </div>
              )}
              {npc.goals && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">{EMOJIS.goals} Goals</p>
                  <p className="text-sm text-gray-300">{npc.goals}</p>
                </div>
              )}
            </div>
          )}

          {/* Secrets */}
          {npc.secrets && (
            <div className="pt-4 border-t border-white/10">
              <p className="text-xs text-amber-400/70 mb-1">{EMOJIS.secrets} Secrets</p>
              <p className="text-sm text-amber-300/80">{npc.secrets}</p>
            </div>
          )}

          {/* Personality */}
          {npc.personality_traits && npc.personality_traits.length > 0 && (
            <div className="pt-4 border-t border-white/10">
              <p className="text-xs text-gray-500 mb-2">Personality Traits</p>
              <div className="flex flex-wrap gap-2">
                {npc.personality_traits.map((trait, i) => (
                  <span key={i} className="text-sm px-3 py-1 bg-white/[0.04] text-gray-300 rounded-lg">
                    {trait}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Full Notes */}
          {npc.full_notes && (
            <div className="pt-4 border-t border-white/10">
              <p className="text-xs text-gray-500 mb-2">Notes</p>
              <div className="text-sm text-gray-400 prose prose-invert prose-sm max-w-none">
                {renderMarkdown(npc.full_notes)}
              </div>
            </div>
          )}
        </div>
      </Modal>
    )
  }

  // Companion Detail Modal
  const CompanionDetailModal = () => {
    if (!detailModal || detailModal.type !== 'companion') return null
    const companion = detailModal.data
    const typeColor = COMPANION_TYPE_COLORS[companion.companion_type || 'pet'] || COMPANION_TYPE_COLORS.other

    return (
      <Modal isOpen={true} onClose={() => setDetailModal(null)} title={companion.related_name || 'Companion Details'} size="md">
        <div className="space-y-6">
          {/* Header with image */}
          <div className="flex gap-4">
            {companion.related_image_url && (
              <Image
                src={companion.related_image_url}
                alt={companion.related_name || ''}
                width={100}
                height={100}
                className="rounded-xl object-cover"
              />
            )}
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-white mb-2">{companion.related_name}</h3>
              <div className="flex items-center gap-2">
                <span className={`text-sm px-3 py-1 rounded-lg capitalize border ${typeColor}`}>
                  {(companion.companion_type || 'pet').replace(/_/g, ' ')}
                </span>
                {companion.companion_species && (
                  <span className="text-sm text-gray-400">({companion.companion_species})</span>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {companion.description && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Description</p>
              <MarkdownContent content={companion.description} className="text-sm" />
            </div>
          )}

          {/* Abilities */}
          {companion.companion_abilities && (
            <div className="pt-4 border-t border-white/10">
              <p className="text-xs text-purple-400/70 mb-2">✨ Abilities</p>
              <p className="text-sm text-gray-300">{companion.companion_abilities}</p>
            </div>
          )}
        </div>
      </Modal>
    )
  }

  // Image Lightbox
  const Lightbox = () => {
    if (!lightboxOpen || !lightboxImage) return null

    return (
      <div
        className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-8"
        onClick={() => setLightboxOpen(false)}
      >
        <button
          className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          onClick={() => setLightboxOpen(false)}
        >
          <X className="w-6 h-6 text-white" />
        </button>
        <img
          src={lightboxImage}
          alt="Full size"
          className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    )
  }

  return (
    <>
      <div className="fixed right-0 bottom-0 z-50 bg-[#0c0c0e] flex flex-col p-2 xl:p-3 2xl:p-4" style={{ top: 'var(--topbar-height)', left: 'calc(var(--dock-width-collapsed) + 16px)' }}>
        <div className="flex-1 flex flex-col rounded-2xl border border-white/[0.06] overflow-hidden bg-[#111113]">
          {/* Header */}
          <header className="flex-shrink-0 flex items-center justify-between px-5 xl:px-6 h-14 border-b border-white/[0.06] bg-white/[0.01]">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/vault')}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.05] transition-all duration-200 text-gray-500 hover:text-gray-300"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-[13px]">Back</span>
              </button>
              <div className="w-px h-5 bg-white/[0.08]" />
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  character.type === 'pc' ? "bg-purple-500/15 text-purple-400" : "bg-gray-500/15 text-gray-400"
                )}>
                  {character.type === 'pc' ? <User className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                </div>
                <h1 className="text-[15px] font-medium text-white/90">
                  {character.name}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => router.push(`/vault/${character.id}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/[0.05] transition-all duration-200 text-gray-500 hover:text-gray-300"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="text-[13px]">Edit</span>
              </button>
              <button
                onClick={() => setShareModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/[0.05] transition-all duration-200 text-gray-500 hover:text-gray-300"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="text-[13px]">Share</span>
              </button>
            </div>
          </header>

          {/* Main Content */}
          <div className="flex-1 flex overflow-hidden min-h-0 gap-0">
            {/* Left Sidebar */}
            <aside className="w-[320px] xl:w-[360px] 2xl:w-[400px] flex-shrink-0 flex flex-col border-r border-white/[0.06] overflow-hidden bg-[#0f0f11]">
              <div className="flex-1 overflow-y-auto px-6 xl:px-8 py-6 xl:py-8">
                {/* Portrait */}
                <div className="mb-6">
                  {displayUrl ? (
                    <button
                      onClick={() => {
                        setLightboxImage(displayUrl)
                        setLightboxOpen(true)
                      }}
                      className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden border-2 border-white/[0.08] group cursor-pointer"
                    >
                      <Image
                        src={displayUrl}
                        alt={character.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 400px) 100vw, 400px"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Eye className="w-8 h-8 text-white" />
                      </div>
                    </button>
                  ) : (
                    <div className="w-full aspect-[3/4] rounded-2xl bg-gradient-to-br from-purple-500/5 to-transparent border-2 border-dashed border-white/[0.08] flex flex-col items-center justify-center">
                      <span className="text-5xl font-semibold text-gray-600">
                        {getInitials(character.name)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Name & Type */}
                <div className="mb-5">
                  <h2 className="text-xl font-semibold text-white/90 mb-1">{character.name}</h2>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-xs px-2 py-1 rounded-lg",
                      character.type === 'pc' ? "bg-purple-500/15 text-purple-400" : "bg-gray-500/15 text-gray-400"
                    )}>
                      {character.type === 'pc' ? 'Player Character' : 'NPC'}
                    </span>
                    {character.status && (
                      <span
                        className="text-xs px-2 py-1 rounded-lg"
                        style={{ backgroundColor: `${character.status_color || '#888'}20`, color: character.status_color || '#888' }}
                      >
                        {character.status}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick Details */}
                {(character.race || character.class || character.background) && (
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

                {/* Secrets Toggle */}
                <div className="my-5 h-px bg-gradient-to-r from-white/[0.06] via-white/[0.04] to-transparent" />
                <div className="mb-5">
                  <button
                    onClick={() => setShowSecrets(!showSecrets)}
                    className={cn(
                      "w-full flex items-center justify-between py-2.5 px-3.5 rounded-lg border transition-all duration-200",
                      showSecrets
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                        : "bg-white/[0.02] border-white/[0.06] text-gray-400 hover:bg-white/[0.04]"
                    )}
                  >
                    <span className="text-sm font-medium">Show Secrets</span>
                    {showSecrets ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>

                {/* Navigation */}
                <div className="my-5 h-px bg-gradient-to-r from-white/[0.06] via-white/[0.04] to-transparent" />
                <div className="mb-5">
                  <h3 className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-3">Navigate</h3>
                  <nav className="space-y-1">
                    {availableSections.map(section => (
                      <button
                        key={section.id}
                        onClick={() => scrollToSection(section.id)}
                        className={cn(
                          'w-full flex items-center gap-3 py-2 px-3 rounded-lg text-[13px] font-medium text-left transition-all duration-200',
                          activeSection === section.id
                            ? 'bg-purple-500/15 text-purple-400 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.2)]'
                            : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'
                        )}
                      >
                        <section.icon className="w-4 h-4" />
                        <span>{section.label}</span>
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Links */}
                {(character.theme_music_url || character.character_sheet_url) && (
                  <>
                    <div className="my-5 h-px bg-gradient-to-r from-white/[0.06] via-white/[0.04] to-transparent" />
                    <div>
                      <h3 className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-3">Links</h3>
                      <div className="space-y-1.5">
                        {character.theme_music_url && (
                          <a
                            href={character.theme_music_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2.5 py-2 px-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-purple-500/20 transition-all duration-200 group"
                          >
                            <Music className="w-4 h-4 text-gray-500 group-hover:text-purple-400" />
                            <span className="text-sm text-gray-400 group-hover:text-gray-200 truncate flex-1">
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
                            className="flex items-center gap-2.5 py-2 px-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-purple-500/20 transition-all duration-200 group"
                          >
                            <FileText className="w-4 h-4 text-gray-500 group-hover:text-purple-400" />
                            <span className="text-sm text-gray-400 group-hover:text-gray-200">Character Sheet</span>
                            <ExternalLink className="w-3.5 h-3.5 text-gray-600" />
                          </a>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </aside>

            {/* Main Content Area */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto bg-[#0d0d0f]">
              <div className="w-full max-w-[1400px] mx-auto px-10 xl:px-16 2xl:px-20 py-10 xl:py-12">
                {/* Stats Overview Grid - Clickable to navigate */}
                <div className="mb-8">
                  <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-7 gap-3">
                    {npcs.length > 0 && (
                      <button onClick={() => scrollToSection('people')} className="bg-white/[0.02] rounded-lg p-3 text-center border border-white/[0.04] hover:bg-white/[0.04] hover:border-purple-500/20 transition-all cursor-pointer">
                        <p className="text-lg font-semibold text-white">{npcs.length}</p>
                        <p className="text-xs text-gray-500">NPCs</p>
                      </button>
                    )}
                    {companions.length > 0 && (
                      <button onClick={() => scrollToSection('people')} className="bg-white/[0.02] rounded-lg p-3 text-center border border-white/[0.04] hover:bg-white/[0.04] hover:border-purple-500/20 transition-all cursor-pointer">
                        <p className="text-lg font-semibold text-white">{companions.length}</p>
                        <p className="text-xs text-gray-500">Companions</p>
                      </button>
                    )}
                    {writings.length > 0 && (
                      <button onClick={() => scrollToSection('writings')} className="bg-white/[0.02] rounded-lg p-3 text-center border border-white/[0.04] hover:bg-white/[0.04] hover:border-purple-500/20 transition-all cursor-pointer">
                        <p className="text-lg font-semibold text-white">{writings.length}</p>
                        <p className="text-xs text-gray-500">Writings</p>
                      </button>
                    )}
                    {backstoryPhases.length > 0 && (
                      <button onClick={() => scrollToSection('backstory')} className="bg-white/[0.02] rounded-lg p-3 text-center border border-white/[0.04] hover:bg-white/[0.04] hover:border-purple-500/20 transition-all cursor-pointer">
                        <p className="text-lg font-semibold text-white">{backstoryPhases.length}</p>
                        <p className="text-xs text-gray-500">Life Phases</p>
                      </button>
                    )}
                    {quotes.length > 0 && (
                      <button onClick={() => scrollToSection('backstory')} className="bg-white/[0.02] rounded-lg p-3 text-center border border-white/[0.04] hover:bg-white/[0.04] hover:border-purple-500/20 transition-all cursor-pointer">
                        <p className="text-lg font-semibold text-white">{quotes.length}</p>
                        <p className="text-xs text-gray-500">Quotes</p>
                      </button>
                    )}
                    {plotHooks.length > 0 && (
                      <button onClick={() => scrollToSection('backstory')} className="bg-white/[0.02] rounded-lg p-3 text-center border border-white/[0.04] hover:bg-white/[0.04] hover:border-purple-500/20 transition-all cursor-pointer">
                        <p className="text-lg font-semibold text-white">{plotHooks.length}</p>
                        <p className="text-xs text-gray-500">Plot Hooks</p>
                      </button>
                    )}
                    {galleryImages.length > 0 && (
                      <button onClick={() => scrollToSection('gallery')} className="bg-white/[0.02] rounded-lg p-3 text-center border border-white/[0.04] hover:bg-white/[0.04] hover:border-purple-500/20 transition-all cursor-pointer">
                        <p className="text-lg font-semibold text-white">{galleryImages.length}</p>
                        <p className="text-xs text-gray-500">Images</p>
                      </button>
                    )}
                  </div>
                </div>

                {/* BACKSTORY SECTION */}
                {hasBackstoryContent && (
                  <CollapsibleSection id="backstory" title="Backstory" icon={BookOpen} isExpanded={expandedSections.backstory} onToggle={() => toggleSection('backstory')}>
                    <div className="space-y-10">
                      {/* Summary */}
                      {character.summary && (
                        <div>
                          <FieldLabel>Summary</FieldLabel>
                          <SafeHtml html={character.summary} className="prose prose-invert max-w-none text-gray-300 prose-p:mb-6 prose-p:leading-relaxed prose-ul:my-4 prose-li:my-1" />
                        </div>
                      )}

                      {/* TL;DR */}
                      {tldr.length > 0 && (
                        <div>
                          <FieldLabel emoji="⚡" count={tldr.length}>Quick Summary (TL;DR)</FieldLabel>
                          <BulletListDisplay items={tldr} bulletColor="purple" />
                        </div>
                      )}

                      {/* Full Backstory */}
                      {character.notes && (
                        <div>
                          <FieldLabel>Full Backstory</FieldLabel>
                          <SafeHtml html={character.notes} className="prose prose-invert prose-lg max-w-none text-gray-300" />
                        </div>
                      )}

                      {/* Life Phases */}
                      {backstoryPhases.length > 0 && (
                        <div>
                          <FieldLabel emoji="📅" count={backstoryPhases.length}>Life Phases</FieldLabel>
                          <LifePhaseDisplay phases={backstoryPhases} />
                        </div>
                      )}

                      {/* Plot Hooks */}
                      {plotHooks.length > 0 && (
                        <div>
                          <FieldLabel emoji="🎯" count={plotHooks.length}>Plot Hooks</FieldLabel>
                          <BulletListDisplay items={plotHooks} bulletColor="amber" />
                        </div>
                      )}

                      {/* Quotes */}
                      {quotes.length > 0 && (
                        <div>
                          <FieldLabel emoji="💬" count={quotes.length}>Memorable Quotes</FieldLabel>
                          <QuotesDisplay quotes={quotes} />
                        </div>
                      )}
                    </div>
                  </CollapsibleSection>
                )}

                {/* DETAILS SECTION */}
                {hasDetailsContent && (
                  <CollapsibleSection id="details" title="Details" icon={FileText} isExpanded={expandedSections.details} onToggle={() => toggleSection('details')}>
                    <div className="space-y-8">
                      {/* Appearance */}
                      {character.appearance && (
                        <div>
                          <FieldLabel>Appearance</FieldLabel>
                          <MarkdownContent content={character.appearance} />
                        </div>
                      )}

                      {/* Physical Details */}
                      {((character as any).height || (character as any).weight || (character as any).hair || (character as any).eyes) && (
                        <div>
                          <FieldLabel>Physical Details</FieldLabel>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                          </div>
                        </div>
                      )}

                      {/* Personality */}
                      {character.personality && (
                        <div>
                          <FieldLabel>Personality</FieldLabel>
                          <MarkdownContent content={character.personality} />
                        </div>
                      )}

                      {/* Goals */}
                      {character.goals && (
                        <div>
                          <FieldLabel>Goals & Motivations</FieldLabel>
                          <MarkdownContent content={character.goals} />
                        </div>
                      )}

                      {/* Secrets - conditionally shown */}
                      {character.secrets && showSecrets && (
                        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                          <FieldLabel emoji="🔒">Secrets</FieldLabel>
                          <MarkdownContent content={character.secrets} className="[&_p]:text-amber-200/80 [&_strong]:text-amber-100" />
                        </div>
                      )}

                      {/* Weaknesses */}
                      {weaknesses.length > 0 && (
                        <div>
                          <FieldLabel emoji="💔" count={weaknesses.length}>Weaknesses</FieldLabel>
                          <BulletListDisplay items={weaknesses} bulletColor="orange" />
                        </div>
                      )}

                      {/* Fears */}
                      {fears.length > 0 && (
                        <div>
                          <FieldLabel emoji="😨" count={fears.length}>Fears</FieldLabel>
                          <BulletListDisplay items={fears} bulletColor="orange" />
                        </div>
                      )}
                    </div>
                  </CollapsibleSection>
                )}

                {/* PEOPLE SECTION */}
                {hasPeopleContent && (
                  <CollapsibleSection
                    id="people"
                    title="People"
                    icon={Users}
                    count={partyMembers.length + npcs.length + companions.length}
                    isExpanded={expandedSections.people}
                    onToggle={() => toggleSection('people')}
                  >
                    <div className="space-y-10">
                      {/* Party Members */}
                      {partyMembers.length > 0 && (
                        <div>
                          <FieldLabel count={partyMembers.length}>Party Members</FieldLabel>
                          <div className="grid gap-3 md:grid-cols-2">
                            {partyMembers.map((member) => (
                              <div
                                key={member.id}
                                className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3 hover:border-white/[0.1] transition-colors cursor-pointer"
                                onClick={() => setDetailModal({ type: 'npc', data: member })}
                              >
                                <div className="flex items-center gap-2 flex-wrap">
                                  {member.related_image_url && (
                                    <div className="relative group/avatar flex-shrink-0">
                                      <Image
                                        src={member.related_image_url}
                                        alt={member.related_name || ''}
                                        width={40}
                                        height={40}
                                        className="w-10 h-10 rounded-lg object-cover"
                                      />
                                      {/* Hover preview */}
                                      <div className="absolute bottom-full left-0 mb-2 opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200 z-[100] pointer-events-none" style={{ width: '200px', height: '200px' }}>
                                        <Image
                                          src={member.related_image_url}
                                          alt={member.related_name || ''}
                                          width={200}
                                          height={200}
                                          className="w-[200px] h-[200px] object-cover rounded-lg shadow-xl border border-white/10 bg-[#1a1a1f]"
                                        />
                                      </div>
                                    </div>
                                  )}
                                  <span className="font-medium text-white/90">{member.related_name}</span>
                                  <span className="text-xs px-2 py-0.5 bg-indigo-500/15 text-indigo-400 rounded-md border border-indigo-500/20">Party</span>
                                </div>
                                {member.occupation && <p className="text-xs text-gray-500 mt-1">{EMOJIS.occupation} {member.occupation}</p>}
                                {member.location && <p className="text-xs text-gray-500 mt-1">{EMOJIS.location} {member.location}</p>}
                                {member.full_notes && (
                                  <div className="mt-2 pt-2 border-t border-white/[0.06]">
                                    <p className="text-xs text-gray-500 mb-1">Notes:</p>
                                    <div className="text-xs text-gray-400">{renderMarkdown(member.full_notes)}</div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* NPCs */}
                      {npcs.length > 0 && (
                        <div>
                          <FieldLabel count={npcs.length}>NPCs & Contacts</FieldLabel>
                          <div className="grid gap-3 md:grid-cols-2">
                            {npcs.map((npc) => {
                              const relationshipColor = RELATIONSHIP_COLORS[npc.relationship_type] || RELATIONSHIP_COLORS.other
                              return (
                                <div
                                  key={npc.id}
                                  className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3 hover:border-white/[0.1] transition-colors cursor-pointer"
                                  onClick={() => setDetailModal({ type: 'npc', data: npc })}
                                >
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {npc.related_image_url && (
                                      <div className="relative group/avatar flex-shrink-0">
                                        <Image
                                          src={npc.related_image_url}
                                          alt={npc.related_name || ''}
                                          width={40}
                                          height={40}
                                          className="w-10 h-10 rounded-lg object-cover"
                                        />
                                        {/* Hover preview */}
                                        <div className="absolute bottom-full left-0 mb-2 opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200 z-[100] pointer-events-none" style={{ width: '200px', height: '200px' }}>
                                          <Image
                                            src={npc.related_image_url}
                                            alt={npc.related_name || ''}
                                            width={200}
                                            height={200}
                                            className="w-[200px] h-[200px] object-cover rounded-lg shadow-xl border border-white/10 bg-[#1a1a1f]"
                                          />
                                        </div>
                                      </div>
                                    )}
                                    <span className="font-medium text-white/90">{npc.related_name}</span>
                                    {npc.nickname && <span className="text-sm text-gray-500 italic">"{npc.nickname}"</span>}
                                    <span className={`text-xs px-2 py-0.5 rounded-md capitalize border ${relationshipColor}`}>
                                      {npc.relationship_label || npc.relationship_type.replace(/_/g, ' ')}
                                    </span>
                                    {npc.relationship_status && npc.relationship_status !== 'active' && (
                                      <span className="text-xs px-2 py-0.5 bg-gray-500/15 text-gray-400 rounded capitalize">
                                        {npc.relationship_status}
                                      </span>
                                    )}
                                  </div>
                                  {npc.occupation && <p className="text-xs text-gray-500 mt-1">{EMOJIS.occupation} {npc.occupation}</p>}
                                  {npc.location && <p className="text-xs text-gray-500 mt-1">{EMOJIS.location} {npc.location}</p>}
                                  {npc.faction_affiliations && npc.faction_affiliations.length > 0 && (
                                    <p className="text-xs text-gray-500 mt-1">{EMOJIS.faction} {npc.faction_affiliations.join(', ')}</p>
                                  )}
                                  {npc.needs && <p className="text-xs text-gray-500 mt-1">{EMOJIS.needs} Needs: {npc.needs}</p>}
                                  {npc.can_provide && <p className="text-xs text-gray-500 mt-1">{EMOJIS.canProvide} Can provide: {npc.can_provide}</p>}
                                  {npc.goals && <p className="text-xs text-gray-500 mt-1">{EMOJIS.goals} Goals: {npc.goals}</p>}
                                  {showSecrets && npc.secrets && (
                                    <p className="text-xs text-amber-400/70 mt-1">{EMOJIS.secrets} Secrets: {npc.secrets}</p>
                                  )}
                                  {npc.personality_traits && npc.personality_traits.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                      {npc.personality_traits.map((trait, i) => (
                                        <span key={i} className="text-xs px-2 py-0.5 bg-white/[0.04] text-gray-400 rounded-md">
                                          {trait}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {npc.full_notes && (
                                    <div className="mt-2 pt-2 border-t border-white/[0.06]">
                                      <p className="text-xs text-gray-500 mb-1">Full Notes:</p>
                                      <div className="text-xs text-gray-400">{renderMarkdown(npc.full_notes)}</div>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Companions */}
                      {companions.length > 0 && (
                        <div>
                          <FieldLabel count={companions.length}>Companions</FieldLabel>
                          <div className="grid gap-3 md:grid-cols-2">
                            {companions.map((companion) => {
                              const typeColor = COMPANION_TYPE_COLORS[companion.companion_type || 'pet'] || COMPANION_TYPE_COLORS.other
                              return (
                                <div
                                  key={companion.id}
                                  className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3 hover:border-white/[0.1] transition-colors cursor-pointer"
                                  onClick={() => setDetailModal({ type: 'companion', data: companion })}
                                >
                                  <div className="flex items-center gap-2">
                                    {companion.related_image_url ? (
                                      <Image
                                        src={companion.related_image_url}
                                        alt={companion.related_name || ''}
                                        width={32}
                                        height={32}
                                        className="rounded-lg object-cover flex-shrink-0"
                                      />
                                    ) : (
                                      <Heart className="w-4 h-4 text-pink-400 flex-shrink-0" />
                                    )}
                                    <span className="font-medium text-white/90">{companion.related_name}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-md capitalize border ${typeColor}`}>
                                      {(companion.companion_type || 'pet').replace(/_/g, ' ')}
                                    </span>
                                    {companion.companion_species && (
                                      <span className="text-xs text-gray-500">({companion.companion_species})</span>
                                    )}
                                  </div>
                                  {companion.description && (
                                    <div className="mt-2">
                                      <MarkdownContent content={companion.description} className="text-xs [&_p]:text-gray-400" />
                                    </div>
                                  )}
                                  {companion.companion_abilities && (
                                    <p className="text-xs text-purple-400/80 mt-1">✨ Abilities: {companion.companion_abilities}</p>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </CollapsibleSection>
                )}

                {/* WRITINGS SECTION */}
                {hasWritingsContent && (
                  <CollapsibleSection
                    id="writings"
                    title="Writings"
                    icon={Quote}
                    count={writings.length}
                    isExpanded={expandedSections.writings}
                    onToggle={() => toggleSection('writings')}
                  >
                    <div className="space-y-8">
                      {/* Character Writings */}
                      {writings.length > 0 && (
                        <div className="space-y-4">
                          {writings.map((writing, index) => (
                            <div key={index} className="p-5 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                              <div className="flex items-center gap-3 mb-3">
                                <h4 className="font-medium text-white/90">{writing.title || 'Untitled'}</h4>
                                <span className="text-xs px-2 py-0.5 bg-purple-500/15 text-purple-400 rounded capitalize">
                                  {writing.type.replace(/_/g, ' ')}
                                </span>
                                {writing.in_universe_date && (
                                  <span className="text-xs text-gray-500">{writing.in_universe_date}</span>
                                )}
                              </div>
                              {writing.recipient && (
                                <p className="text-xs text-gray-500 mb-2">To: {writing.recipient}</p>
                              )}
                              <MarkdownContent content={writing.content} className="text-sm [&_p]:text-gray-400" />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Rumors */}
                      {rumors.length > 0 && (
                        <div>
                          <FieldLabel emoji="🗣️" count={rumors.length}>Rumors</FieldLabel>
                          <ul className="space-y-1">
                            {rumors.map((rumor, i) => (
                              <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                                <span className={rumor.is_true ? 'text-green-400' : 'text-red-400'}>
                                  {rumor.is_true ? '✓' : '✗'}
                                </span>
                                <span>{rumor.statement}</span>
                                <span className={`text-xs ${rumor.is_true ? 'text-green-400/60' : 'text-red-400/60'}`}>
                                  ({rumor.is_true ? 'true' : 'false'})
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* DM Q&A */}
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

                      {/* Open Questions */}
                      {openQuestions.length > 0 && (
                        <div>
                          <FieldLabel emoji="❓" count={openQuestions.length}>Open Questions</FieldLabel>
                          <ul className="space-y-1">
                            {openQuestions.map((q, i) => (
                              <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                                <span className="text-purple-400">?</span>
                                <span>{q}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Secondary Characters */}
                      {secondaryCharacters.length > 0 && (
                        <div>
                          <FieldLabel count={secondaryCharacters.length}>Secondary Character Ideas</FieldLabel>
                          <div className="space-y-3">
                            {secondaryCharacters.map((char, i) => (
                              <div key={i} className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                                <div className="flex items-center gap-3 mb-2">
                                  <span className="font-medium text-white/90">{char.name}</span>
                                  <span className="text-xs text-gray-500">{char.concept}</span>
                                </div>
                                {char.notes && (
                                  <p className="text-sm text-gray-400">{char.notes}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CollapsibleSection>
                )}

                {/* GALLERY SECTION */}
                {hasGalleryContent && (
                  <CollapsibleSection id="gallery" title="Gallery" icon={GalleryIcon} count={galleryImages.length} isExpanded={expandedSections.gallery} onToggle={() => toggleSection('gallery')}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {galleryImages.map((image) => (
                        <button
                          key={image.id}
                          onClick={() => {
                            setLightboxImage(image.image_url)
                            setLightboxOpen(true)
                          }}
                          className="relative aspect-square rounded-xl overflow-hidden bg-white/[0.02] border border-white/[0.06] hover:border-purple-500/30 transition-all group"
                        >
                          <Image
                            src={image.image_url}
                            alt={image.caption || 'Gallery image'}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                          />
                          {image.caption && (
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                              <p className="text-xs text-white/80 truncate">{image.caption}</p>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </CollapsibleSection>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <Lightbox />
      <NPCDetailModal />
      <CompanionDetailModal />
      <UnifiedShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        contentType="character"
        contentId={character.id}
        contentName={character.name}
        isPublished={character.is_published}
      />
    </>
  )
}

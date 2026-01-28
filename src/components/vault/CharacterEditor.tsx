'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Highlight from '@tiptap/extension-highlight'
import TiptapImage from '@tiptap/extension-image'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Image from 'next/image'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { cn, getInitials } from '@/lib/utils'
import { logActivity } from '@/lib/activity-log'
import { useAutoSave, useIsMobile, useMembership } from '@/hooks'
import {
  X,
  User,
  Users,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Link as LinkIcon,
  Highlighter,
  Undo,
  Redo,
  ImageIcon,
  Trash2,
  Camera,
  Copy,
  Share2,
  ChevronDown,
  ChevronUp,
  Plus,
  ExternalLink,
  Music,
  FileText,
  Scroll,
  BookOpen,
  UserPlus,
  Target,
  Eye,
  EyeOff,
  Upload,
  ArrowLeft,
  Image as GalleryIcon,
  Sparkles,
  Loader2,
  Check,
  Brain,
  Edit2,
  Heart,
} from 'lucide-react'
import { useAppStore, useCanUseAI } from '@/store'
import { Modal } from '@/components/ui'
import { LimitReachedModal } from '@/components/membership'
import { UnifiedImageModal } from '@/components/ui/unified-image-modal'
import { VaultImageCropModal } from './VaultImageCropModal'
import { UnifiedShareModal } from '@/components/share/UnifiedShareModal'
import { TemplateStateBadge } from '@/components/templates/TemplateStateBadge'
import { TemplateOnboardingModal } from '@/components/templates/TemplateOnboardingModal'
import { FloatingDock } from '@/components/layout/floating-dock'
import { MobileTabBar } from '@/components/mobile/mobile-tab-bar'
import type {
  VaultCharacter,
  StoryCharacter,
  PlayJournal,
  CharacterLink,
  CharacterLearnedFact,
  CharacterStatus,
  VaultCharacterRelationship,
  VaultCharacterImage
} from '@/types/database'
import { NPCCard } from './NPCCard'
import { CompanionCard } from './CompanionCard'
import { SessionNoteCard } from './SessionNoteCard'
import { CharacterEditorMobile } from './CharacterEditorMobile'
import {
  BulletListDisplay,
  QuotesDisplay,
  LifePhaseDisplay,
} from './display'
import { v4 as uuidv4 } from 'uuid'

// Section types for navigation
type SectionType = 'backstory' | 'details' | 'people' | 'writings' | 'gallery'

interface CharacterEditorProps {
  character?: VaultCharacter | null
  mode: 'create' | 'edit'
  /** When true, renders own navigation (FloatingDock/MobileTabBar). Set to false when wrapped in AppLayout. */
  standalone?: boolean
  /** When true, hide delete button (accessed from My Templates tab) */
  fromTemplate?: boolean
}

// Default statuses
const DEFAULT_STATUSES = [
  { name: 'Concept', color: '#8B5CF6' },
  { name: 'In Progress', color: '#3B82F6' },
  { name: 'Active', color: '#10B981' },
  { name: 'Retired', color: '#6B7280' },
  { name: 'Deceased', color: '#EF4444' },
]

// Navigation sections configuration
const SECTIONS: { id: SectionType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'backstory', label: 'Backstory', icon: BookOpen },
  { id: 'details', label: 'Details', icon: FileText },
  { id: 'people', label: 'People', icon: Users },
  { id: 'writings', label: 'Writings', icon: Quote },
  { id: 'gallery', label: 'Gallery', icon: GalleryIcon },
]

// CollapsibleSection component - MUST be defined outside CharacterEditor to prevent
// recreation on every render which causes scroll/focus loss
interface CollapsibleSectionProps {
  id: SectionType
  title: string
  icon: React.ComponentType<{ className?: string }>
  count?: number
  children: React.ReactNode
  actionButton?: React.ReactNode
  isExpanded: boolean
  onToggle: () => void
}

function CollapsibleSection({
  id,
  title,
  icon: Icon,
  count,
  children,
  actionButton,
  isExpanded,
  onToggle
}: CollapsibleSectionProps) {
  return (
    <section id={id} className="scroll-mt-8 mb-6">
      <div className="border border-white/[0.06] rounded-xl overflow-hidden">
        {/* Collapsible Header */}
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

        {/* Section Content */}
        {isExpanded && (
          <div className="p-6 border-t border-white/[0.06]">
            {actionButton && (
              <div className="flex justify-end mb-6">
                {actionButton}
              </div>
            )}
            {children}
          </div>
        )}
      </div>
    </section>
  )
}

export function CharacterEditor({ character, mode, standalone = true, fromTemplate = false }: CharacterEditorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isMobile = useIsMobile()

  // Check for new template onboarding
  const isNewTemplate = searchParams.get('newTemplate') === '1'
  const [showTemplateOnboarding, setShowTemplateOnboarding] = useState(isNewTemplate)

  // Clear the newTemplate query param from URL after showing modal
  useEffect(() => {
    if (isNewTemplate) {
      const url = new URL(window.location.href)
      url.searchParams.delete('newTemplate')
      window.history.replaceState({}, '', url.toString())
    }
  }, [isNewTemplate])

  // Memoize supabase client to prevent recreation on each render
  // This is critical - without memoization, all useEffects with supabase dependency re-run every render
  const supabase = useMemo(() => createClient(), [])
  const canUseAI = useCanUseAI()
  const { canCreateCharacter } = useMembership()

  // Limit modal state
  const [limitModalOpen, setLimitModalOpen] = useState(false)
  const [limitInfo, setLimitInfo] = useState({ current: 0, limit: 0 })
  const imageInputRef = useRef<HTMLInputElement>(null)
  const portraitInputRef = useRef<HTMLInputElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isCreateMode = mode === 'create'

  // Mobile-specific state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  // Active section for navigation highlighting
  const [activeSection, setActiveSection] = useState<SectionType>('backstory')

  // Basic form data
  const [formData, setFormData] = useState({
    name: character?.name || '',
    summary: character?.summary || '',
    notes: (character as any)?.backstory || character?.notes || '',
    type: (character?.type || 'npc') as 'pc' | 'npc',
    image_url: character?.image_url || null as string | null,
    detail_image_url: character?.detail_image_url || null as string | null,
    status: character?.status || 'Concept',
    status_color: character?.status_color || '#8B5CF6',
    race: character?.race || '',
    class: character?.class || '',
    subclass: (character as any)?.subclass || '',
    level: (character as any)?.level || null as number | null,
    background: character?.background || '',
    alignment: (character as any)?.alignment || '',
    age: (character as any)?.age || '',
    pronouns: (character as any)?.pronouns || '',
    deity: (character as any)?.deity || '',
    appearance: character?.appearance || '',
    personality: character?.personality || '',
    ideals: (character as any)?.ideals || '',
    bonds: (character as any)?.bonds || '',
    flaws: (character as any)?.flaws || '',
    goals: character?.goals || '',
    secrets: character?.secrets || '',
    fears: (character as any)?.fears || [] as string[],
    quotes: character?.quotes || [] as string[],
    common_phrases: character?.common_phrases || [] as string[],
    plot_hooks: character?.plot_hooks || [] as string[],
    tldr: character?.tldr || [] as string[],
    pre_session_hook: (character as any)?.pre_session_hook || '',
    backstory_phases: (character as any)?.backstory_phases || [] as { title: string; content: string }[],
    theme_music_url: character?.theme_music_url || '',
    theme_music_title: character?.theme_music_title || '',
    character_sheet_url: character?.character_sheet_url || '',
    external_links: (character as any)?.external_links || [] as { url: string; label: string; type: string }[],
    game_system: character?.game_system || '',
    external_campaign: character?.external_campaign || '',
    dm_name: character?.dm_name || '',
    campaign_started: character?.campaign_started || '',
    quick_stats: character?.quick_stats || null,
    inventory: character?.inventory || null,
    gold: character?.gold || 0,
    possessions: (character as any)?.possessions || [] as { name: string; quantity: number; notes?: string }[],
    // Physical appearance fields
    height: (character as any)?.height || '',
    weight: (character as any)?.weight || '',
    hair: (character as any)?.hair || '',
    eyes: (character as any)?.eyes || '',
    skin: (character as any)?.skin || '',
    voice: (character as any)?.voice || '',
    distinguishing_marks: (character as any)?.distinguishing_marks || '',
    typical_attire: (character as any)?.typical_attire || '',
    // New fields from migration 018
    character_writings: (character?.character_writings as { title: string; type: string; content: string; recipient?: string; in_universe_date?: string }[]) || [],
    rumors: (character?.rumors as { statement: string; is_true: boolean }[]) || [],
    dm_qa: (character?.dm_qa as { question: string; answer: string }[]) || [],
    player_discord: (character as any)?.player_discord || '',
    player_timezone: (character as any)?.player_timezone || '',
    player_experience: (character as any)?.player_experience || '',
    player_preferences: (character?.player_preferences as { fun_in_dnd?: string; annoys_me?: string; ideal_party?: string; ideal_dm?: string }) || null,
    gameplay_tips: (character as any)?.gameplay_tips || [] as string[],
    party_relations: (character?.party_relations as { name: string; notes: string; relationship?: string }[]) || [],
    combat_stats: (character?.combat_stats as { kills?: number; deaths?: number; unconscious?: number; last_updated_session?: number }) || null,
    open_questions: (character as any)?.open_questions || [] as string[],
    secondary_characters: (character as any)?.secondary_characters || [] as { name: string; concept: string; notes?: string }[],
    reference_tables: (character as any)?.reference_tables || [] as { title: string; headers: string[]; rows: string[][] }[],
  })

  const [characterId, setCharacterId] = useState<string | null>(character?.id || null)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
  const [showSecrets, setShowSecrets] = useState(false)

  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState<Record<SectionType, boolean>>({
    backstory: true,
    details: true,
    people: true,
    writings: true,
    gallery: true,
  })

  const toggleSection = (section: SectionType) => {
    const container = scrollContainerRef.current
    const scrollTop = container?.scrollTop ?? 0
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
    // Preserve scroll position after state update
    requestAnimationFrame(() => {
      if (container) container.scrollTop = scrollTop
    })
  }

  // Related data
  const [relationships, setRelationships] = useState<VaultCharacterRelationship[]>([])
  const [journalEntries, setJournalEntries] = useState<PlayJournal[]>([])
  const [links, setLinks] = useState<CharacterLink[]>([])
  const [learnedFacts, setLearnedFacts] = useState<CharacterLearnedFact[]>([])
  const [customStatuses, setCustomStatuses] = useState<CharacterStatus[]>([])
  const [writingsLoaded, setWritingsLoaded] = useState(false)
  const [galleryImages, setGalleryImages] = useState<VaultCharacterImage[]>([])

  // Derived: separate Party Members, NPCs, and Companions
  const partyMembers = relationships.filter(r => r.is_party_member && !r.is_companion)
  const npcs = relationships.filter(r => !r.is_companion && !r.is_party_member)
  const companions = relationships.filter(r => r.is_companion)

  // Modals
  const [addLinkModalOpen, setAddLinkModalOpen] = useState(false)
  const [addStoryCharacterModalOpen, setAddStoryCharacterModalOpen] = useState(false)
  const [editNPCModalOpen, setEditNPCModalOpen] = useState(false)
  const [editingNPC, setEditingNPC] = useState<VaultCharacterRelationship | null>(null)
  const [npcImageModalOpen, setNpcImageModalOpen] = useState(false)
  const [addCompanionModalOpen, setAddCompanionModalOpen] = useState(false)
  const [editCompanionModalOpen, setEditCompanionModalOpen] = useState(false)
  const [editingCompanion, setEditingCompanion] = useState<VaultCharacterRelationship | null>(null)
  const [companionImageModalOpen, setCompanionImageModalOpen] = useState(false)
  const [addJournalModalOpen, setAddJournalModalOpen] = useState(false)
  const [editJournalModalOpen, setEditJournalModalOpen] = useState(false)
  const [editingJournal, setEditingJournal] = useState<PlayJournal | null>(null)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [localIsPublished, setLocalIsPublished] = useState(character?.is_published || false)
  const [localTemplateVersion, setLocalTemplateVersion] = useState(character?.template_version || 0)
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false)
  const [galleryImageModalOpen, setGalleryImageModalOpen] = useState(false)

  // Modal form state
  const [linkForm, setLinkForm] = useState({ type: 'other' as string, title: '', url: '' })
  const [npcForm, setNpcForm] = useState({
    related_name: '',
    nickname: '',
    relationship_type: 'friend',
    relationship_label: '',
    faction_affiliations: [] as string[],
    location: '',
    occupation: '',
    origin: '',
    needs: '',
    can_provide: '',
    goals: '',
    secrets: '',
    personality_traits: [] as string[],
    full_notes: '',
    relationship_status: 'active',
    related_image_url: null as string | null,
    is_party_member: false,
  })
  const [companionForm, setCompanionForm] = useState({
    related_name: '',
    companion_type: 'familiar',
    companion_species: '',
    description: '',
    companion_abilities: '',
    related_image_url: null as string | null,
  })
  const [journalForm, setJournalForm] = useState({
    session_number: '',
    session_date: '',
    title: '',
    notes: '',
    campaign_name: '',
    summary: '',
    kill_count: '',
    loot: '',
    thoughts_for_next: '',
    npcs_met: [] as string[],
    locations_visited: [] as string[],
  })

  // Crop modal state
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [pendingImageSrc, setPendingImageSrc] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // AI prompt modal state
  const [aiPromptModalOpen, setAiPromptModalOpen] = useState(false)
  const [generatingPrompt, setGeneratingPrompt] = useState(false)
  const [generatedPrompt, setGeneratedPrompt] = useState({ prompt: '', shortPrompt: '' })
  const [promptCopied, setPromptCopied] = useState(false)

  // Scroll to section when clicking nav
  const scrollToSection = useCallback((sectionId: SectionType) => {
    const element = document.getElementById(sectionId)
    if (element && scrollContainerRef.current) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  // Expand section and scroll to it (for clickable overview counts)
  const expandAndScrollToSection = useCallback((sectionId: SectionType) => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: true }))
    // Small delay to let section expand before scrolling
    setTimeout(() => {
      const element = document.getElementById(sectionId)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 50)
  }, [])

  // Detect which section is in view
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
          // If section top is near the top of the container
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

  // Sync local template state when character changes
  useEffect(() => {
    if (character) {
      setLocalIsPublished(character.is_published || false)
      setLocalTemplateVersion(character.template_version || 0)
    }
  }, [character?.is_published, character?.template_version])

  // Handle successful publish from UnifiedShareModal
  const handlePublished = () => {
    setLocalIsPublished(true)
    setLocalTemplateVersion(prev => prev + 1)
    toast.success('Template published successfully')
  }

  const isPublished = localIsPublished

  // Load related data
  useEffect(() => {
    if (!characterId) return

    const loadRelatedData = async () => {
      // Load core data that definitely exists
      const [
        { data: rels },
        { data: journal },
        { data: charLinks },
        { data: writings },
        { data: images },
      ] = await Promise.all([
        supabase.from('vault_character_relationships').select('*').eq('character_id', characterId).order('display_order'),
        supabase.from('play_journal').select('*').eq('character_id', characterId).order('session_number', { ascending: true }),
        supabase.from('character_links').select('*').eq('character_id', characterId).order('sort_order'),
        supabase.from('vault_character_writings').select('*').eq('character_id', characterId).order('display_order'),
        supabase.from('vault_character_images').select('*').eq('character_id', characterId).order('is_primary', { ascending: false }).order('display_order'),
      ])

      if (rels) setRelationships(rels)
      if (journal) setJournalEntries(journal)
      if (charLinks) setLinks(charLinks)
      if (images) setGalleryImages(images)

      // Load writings from table and sync to formData
      if (writings && writings.length > 0) {
        const formattedWritings = writings.map(w => ({
          title: w.title,
          type: w.writing_type || 'other',
          content: w.content,
          recipient: w.recipient || undefined,
          in_universe_date: w.in_universe_date || undefined,
        }))
        setFormData(prev => ({ ...prev, character_writings: formattedWritings }))
      }
      setWritingsLoaded(true)

      // Try to load learned facts (table may not exist yet)
      try {
        const { data: facts, error } = await supabase.from('character_learned_facts').select('*').eq('character_id', characterId)
        if (!error && facts) setLearnedFacts(facts)
      } catch {
        // Table doesn't exist, silently ignore
      }
    }

    loadRelatedData()
  }, [characterId, supabase])

  // Load custom statuses (table may not exist yet)
  useEffect(() => {
    const loadStatuses = async () => {
      try {
        const { data, error } = await supabase.from('character_statuses').select('*').order('sort_order')
        if (!error && data) setCustomStatuses(data)
      } catch {
        // Table doesn't exist, silently ignore
      }
    }
    loadStatuses()
  }, [supabase])

  // Process inline formatting (bold, italic) - must be defined before textToHtml
  const processInlineFormatting = (text: string): string => {
    return text
      // Bold: **text** or __text__
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_]+)__/g, '<strong>$1</strong>')
      // Italic: *text* or _text_ (but not if it's inside a word)
      .replace(/(?<![a-zA-Z])\*([^*]+)\*(?![a-zA-Z])/g, '<em>$1</em>')
      .replace(/(?<![a-zA-Z])_([^_]+)_(?![a-zA-Z])/g, '<em>$1</em>')
  }

  // Convert plain text/markdown to HTML for TipTap
  const textToHtml = (text: string): string => {
    if (!text) return ''
    // If it already looks like HTML, return as-is
    if (text.startsWith('<') && (text.includes('<p>') || text.includes('<div>'))) {
      return text
    }

    // First, normalize the text
    let normalized = text
      // CRITICAL: Split heading from content on same line
      // Pattern: ## Heading Title followed by sentence content (capital letter starting a sentence)
      // This handles cases like "## Backstory The smoke..." -> "## Backstory\n\nThe smoke..."
      .replace(/^(#{1,2}\s+[A-Z][a-z]*(?:\s+(?:&|and|or|of|the|in|to|for|[A-Z][a-z]*)){0,3})\s+([A-Z][a-z])/gm, '$1\n\n$2')
      // Also split if heading is followed by a quote or other content marker
      .replace(/^(#{1,2}\s+[A-Z][^\n]{0,30}?)\s+(["'\*\-])/gm, '$1\n\n$2')
      // Ensure --- has newlines around it
      .replace(/([^\n])\n?---\n?([^\n])/g, '$1\n\n---\n\n$2')
      // Make sure bullet points have proper newlines
      .replace(/([.!?])\s*\n?-\s+/g, '$1\n\n- ')

    // Split on double newlines
    const blocks = normalized.split(/\n\n+/).filter(b => b.trim())
    const htmlBlocks: string[] = []

    for (const block of blocks) {
      const trimmedBlock = block.trim()
      if (!trimmedBlock || trimmedBlock === '---') {
        if (trimmedBlock === '---') htmlBlocks.push('<hr>')
        continue
      }

      // Check if this block is a list (starts with - or • or *)
      const lines = trimmedBlock.split('\n')
      const nonEmptyLines = lines.filter(l => l.trim())
      const isListBlock = nonEmptyLines.length > 0 &&
        nonEmptyLines.every(line => /^[\-\•\*]\s/.test(line.trim()))

      if (isListBlock) {
        // Convert to unordered list
        const listItems = nonEmptyLines
          .map(line => `<li>${processInlineFormatting(line.replace(/^[\-\•\*]\s*/, '').trim())}</li>`)
          .join('')
        htmlBlocks.push(`<ul>${listItems}</ul>`)
      } else if (/^##\s+/.test(trimmedBlock)) {
        // H2 heading - extract heading vs content if on same line
        // First try to split on sentence boundary (heading words followed by sentence)
        const splitMatch = trimmedBlock.match(/^##\s+([A-Z][a-z]*(?:\s+(?:&|and|or|of|the|in|to|for|[A-Z][a-z]*)){0,3})\s+([A-Z][\s\S]*)$/)
        if (splitMatch) {
          htmlBlocks.push(`<h2>${processInlineFormatting(splitMatch[1])}</h2>`)
          htmlBlocks.push(`<p>${processInlineFormatting(splitMatch[2].replace(/\n/g, '<br>'))}</p>`)
        } else {
          // Standard heading with newline separation
          const headingMatch = trimmedBlock.match(/^##\s+(.+?)(?:\n|$)/)
          if (headingMatch) {
            htmlBlocks.push(`<h2>${processInlineFormatting(headingMatch[1])}</h2>`)
            const remaining = trimmedBlock.slice(headingMatch[0].length).trim()
            if (remaining) {
              htmlBlocks.push(`<p>${processInlineFormatting(remaining.replace(/\n/g, '<br>'))}</p>`)
            }
          }
        }
      } else if (/^#\s+/.test(trimmedBlock)) {
        // H1 heading
        const splitMatch = trimmedBlock.match(/^#\s+([A-Z][a-z]*(?:\s+(?:&|and|or|of|the|in|to|for|[A-Z][a-z]*)){0,3})\s+([A-Z][\s\S]*)$/)
        if (splitMatch) {
          htmlBlocks.push(`<h1>${processInlineFormatting(splitMatch[1])}</h1>`)
          htmlBlocks.push(`<p>${processInlineFormatting(splitMatch[2].replace(/\n/g, '<br>'))}</p>`)
        } else {
          const headingMatch = trimmedBlock.match(/^#\s+(.+?)(?:\n|$)/)
          if (headingMatch) {
            htmlBlocks.push(`<h1>${processInlineFormatting(headingMatch[1])}</h1>`)
            const remaining = trimmedBlock.slice(headingMatch[0].length).trim()
            if (remaining) {
              htmlBlocks.push(`<p>${processInlineFormatting(remaining.replace(/\n/g, '<br>'))}</p>`)
            }
          }
        }
      } else {
        // Regular paragraph - convert single newlines to <br>
        const processed = lines.map(line => processInlineFormatting(line)).join('<br>')
        htmlBlocks.push(`<p>${processed}</p>`)
      }
    }

    return htmlBlocks.join('')
  }

  // Summary editor
  const summaryEditor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2] } }),
      Placeholder.configure({ placeholder: 'Brief description - role, personality, key traits...' }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-purple-400 underline' } }),
      Highlight.configure({ HTMLAttributes: { class: 'bg-yellow-500/30 px-1 rounded' } }),
      Underline,
    ],
    content: textToHtml(formData.summary),
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-sm max-w-none focus:outline-none min-h-[60px] prose-p:text-gray-300 prose-p:my-2',
      },
    },
    onUpdate: ({ editor }) => {
      setFormData(prev => ({ ...prev, summary: editor.getHTML() }))
    },
  })

  // Notes/Backstory editor
  const notesEditor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2] } }),
      Placeholder.configure({ placeholder: 'Write the full backstory, history, and narrative...' }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-purple-400 underline' } }),
      Highlight.configure({ HTMLAttributes: { class: 'bg-yellow-500/30 px-1 rounded' } }),
      TiptapImage.configure({ HTMLAttributes: { class: 'rounded-lg max-w-full' } }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: textToHtml(formData.notes),
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[350px] prose-headings:text-white prose-p:text-gray-300 prose-p:my-2 prose-ul:text-gray-300 prose-li:text-gray-300 prose-blockquote:border-l-purple-500 prose-blockquote:text-gray-400',
      },
    },
    onUpdate: ({ editor }) => {
      setFormData(prev => ({ ...prev, notes: editor.getHTML() }))
    },
  })

  // Sync editor content when character data loads (for async loading)
  useEffect(() => {
    if (character && notesEditor && !notesEditor.isDestroyed) {
      const backstory = (character as any)?.backstory || character?.notes || ''
      // Only update if content is different and editor is empty
      if (backstory && notesEditor.isEmpty) {
        notesEditor.commands.setContent(textToHtml(backstory))
      }
    }
  }, [character, notesEditor])

  useEffect(() => {
    if (character && summaryEditor && !summaryEditor.isDestroyed) {
      const summary = character?.summary || ''
      if (summary && summaryEditor.isEmpty) {
        summaryEditor.commands.setContent(textToHtml(summary))
      }
    }
  }, [character, summaryEditor])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxOpen) {
          e.preventDefault()
          setLightboxOpen(false)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxOpen])

  // Handle portrait file selection
  const handlePortraitSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be less than 10MB')
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setPendingImageSrc(objectUrl)
    setCropModalOpen(true)

    if (portraitInputRef.current) {
      portraitInputRef.current.value = ''
    }
  }, [])

  // Generate AI prompt for character portrait
  const handleGenerateAiPrompt = useCallback(async () => {
    if (!formData.name.trim()) {
      alert('Please add a name first')
      return
    }

    setGeneratingPrompt(true)
    try {
      const res = await fetch('/api/ai/generate-character-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          race: formData.race,
          class: formData.class,
          backstory: formData.notes,
          personality: formData.personality,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to generate prompt')
      }

      const data = await res.json()
      setGeneratedPrompt({ prompt: data.prompt, shortPrompt: data.shortPrompt })
      setAiPromptModalOpen(true)
    } catch (err: any) {
      console.error('Generate prompt error:', err)
      alert(err.message || 'Failed to generate prompt')
    } finally {
      setGeneratingPrompt(false)
    }
  }, [formData.name, formData.type, formData.race, formData.class, formData.notes, formData.personality])

  const copyPromptToClipboard = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text)
    setPromptCopied(true)
    setTimeout(() => setPromptCopied(false), 2000)
  }, [])

  // Handle crop save
  const handleCropSave = useCallback(async (cardBlob: Blob, detailBlob: Blob) => {
    setIsUploading(true)

    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Not authenticated')

      const timestamp = Date.now()
      const uniqueId = uuidv4().slice(0, 8)
      const basePath = `${userData.user.id}/vault/${characterId || 'new'}-${timestamp}-${uniqueId}`

      const cardPath = `${basePath}-card.jpg`
      const { error: cardError } = await supabase.storage
        .from('vault-images')
        .upload(cardPath, cardBlob, { contentType: 'image/jpeg', upsert: true })
      if (cardError) throw cardError

      const detailPath = `${basePath}-detail.jpg`
      const { error: detailError } = await supabase.storage
        .from('vault-images')
        .upload(detailPath, detailBlob, { contentType: 'image/jpeg', upsert: true })
      if (detailError) throw detailError

      const { data: cardUrlData } = supabase.storage.from('vault-images').getPublicUrl(cardPath)
      const { data: detailUrlData } = supabase.storage.from('vault-images').getPublicUrl(detailPath)

      setFormData(prev => ({
        ...prev,
        image_url: cardUrlData.publicUrl,
        detail_image_url: detailUrlData.publicUrl,
      }))

      setCropModalOpen(false)
      if (pendingImageSrc?.startsWith('blob:')) URL.revokeObjectURL(pendingImageSrc)
      setPendingImageSrc(null)
    } catch (err) {
      console.error('Upload error:', err)
      alert('Failed to upload image')
    } finally {
      setIsUploading(false)
    }
  }, [characterId, supabase, pendingImageSrc])

  const handleCropClose = useCallback(() => {
    setCropModalOpen(false)
    if (pendingImageSrc?.startsWith('blob:')) URL.revokeObjectURL(pendingImageSrc)
    setPendingImageSrc(null)
  }, [pendingImageSrc])

  // Auto-save - receives data from useAutoSave hook
  const saveCharacter = useCallback(async (dataToSave: typeof formData) => {
    if (!dataToSave.name.trim()) return

    const characterData = {
      name: dataToSave.name.trim(),
      summary: dataToSave.summary.trim() || null,
      type: dataToSave.type,
      image_url: dataToSave.image_url,
      detail_image_url: dataToSave.detail_image_url,
      notes: dataToSave.notes,
      backstory: dataToSave.notes,
      status: dataToSave.status,
      status_color: dataToSave.status_color,
      race: dataToSave.race || null,
      class: dataToSave.class || null,
      subclass: dataToSave.subclass || null,
      level: dataToSave.level,
      background: dataToSave.background || null,
      alignment: dataToSave.alignment || null,
      age: dataToSave.age || null,
      pronouns: dataToSave.pronouns || null,
      deity: dataToSave.deity || null,
      appearance: dataToSave.appearance || null,
      personality: dataToSave.personality || null,
      ideals: dataToSave.ideals || null,
      bonds: dataToSave.bonds || null,
      flaws: dataToSave.flaws || null,
      goals: dataToSave.goals || null,
      secrets: dataToSave.secrets || null,
      fears: dataToSave.fears.length > 0 ? dataToSave.fears : null,
      quotes: dataToSave.quotes.length > 0 ? dataToSave.quotes : null,
      common_phrases: dataToSave.common_phrases.length > 0 ? dataToSave.common_phrases : null,
      plot_hooks: dataToSave.plot_hooks.length > 0 ? dataToSave.plot_hooks : null,
      tldr: dataToSave.tldr.length > 0 ? dataToSave.tldr : null,
      backstory_phases: dataToSave.backstory_phases.length > 0 ? dataToSave.backstory_phases : null,
      theme_music_url: dataToSave.theme_music_url || null,
      theme_music_title: dataToSave.theme_music_title || null,
      character_sheet_url: dataToSave.character_sheet_url || null,
      game_system: dataToSave.game_system || null,
      external_campaign: dataToSave.external_campaign || null,
      dm_name: dataToSave.dm_name || null,
      campaign_started: dataToSave.campaign_started || null,
      gold: dataToSave.gold,
      possessions: dataToSave.possessions.length > 0 ? dataToSave.possessions : null,
      // Physical appearance fields
      height: dataToSave.height || null,
      weight: dataToSave.weight || null,
      hair: dataToSave.hair || null,
      eyes: dataToSave.eyes || null,
      skin: dataToSave.skin || null,
      voice: dataToSave.voice || null,
      distinguishing_marks: dataToSave.distinguishing_marks || null,
      typical_attire: dataToSave.typical_attire || null,
      // New fields from migration 018 (character_writings saved to separate table)
      rumors: dataToSave.rumors.length > 0 ? dataToSave.rumors : null,
      dm_qa: dataToSave.dm_qa.length > 0 ? dataToSave.dm_qa : null,
      player_discord: dataToSave.player_discord || null,
      player_timezone: dataToSave.player_timezone || null,
      player_experience: dataToSave.player_experience || null,
      player_preferences: dataToSave.player_preferences,
      gameplay_tips: dataToSave.gameplay_tips.length > 0 ? dataToSave.gameplay_tips : null,
      party_relations: dataToSave.party_relations.length > 0 ? dataToSave.party_relations : null,
      combat_stats: dataToSave.combat_stats,
      open_questions: dataToSave.open_questions.length > 0 ? dataToSave.open_questions : null,
      secondary_characters: dataToSave.secondary_characters.length > 0 ? dataToSave.secondary_characters : null,
      reference_tables: dataToSave.reference_tables.length > 0 ? dataToSave.reference_tables : null,
      pre_session_hook: dataToSave.pre_session_hook || null,
      external_links: dataToSave.external_links.length > 0 ? dataToSave.external_links : null,
      updated_at: new Date().toISOString(),
    }

    let savedCharId = characterId

    if (characterId) {
      const { error } = await supabase.from('vault_characters').update(characterData).eq('id', characterId)
      if (error) {
        console.error('Save error details:', error)
        console.error('Attempted to save:', characterData)
        toast.error(`Save failed: ${error.message || error.code || 'Unknown error'}`)
        return
      }
    } else {
      // Check character limit before creating
      const limitCheck = canCreateCharacter()
      if (!limitCheck.allowed) {
        setLimitInfo({ current: limitCheck.current, limit: limitCheck.limit })
        setLimitModalOpen(true)
        return
      }

      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('vault_characters')
        .insert({ ...characterData, user_id: userData.user.id })
        .select()
        .single()

      if (error) {
        console.error('Create error details:', error)
        console.error('Attempted to create:', characterData)
        toast.error(`Create failed: ${error.message || error.code || 'Unknown error'}`)
        return
      } else if (data) {
        savedCharId = data.id
        setCharacterId(data.id)
        window.history.replaceState(null, '', `/vault/${data.id}`)

        // Log activity for new character creation
        await logActivity(supabase, userData.user.id, {
          action: 'character.create',
          entity_type: 'character',
          entity_id: data.id,
          entity_name: data.name,
          metadata: {
            type: data.type,
            race: data.race,
            class: data.class,
          },
        })
      }
    }

    // Save writings to vault_character_writings table
    if (savedCharId && writingsLoaded) {
      const { data: userData } = await supabase.auth.getUser()
      if (userData.user) {
        // Delete existing writings and insert new ones
        await supabase.from('vault_character_writings').delete().eq('character_id', savedCharId)

        if (dataToSave.character_writings.length > 0) {
          const writingsToInsert = dataToSave.character_writings.map((w, idx) => ({
            user_id: userData.user!.id,
            character_id: savedCharId,
            title: w.title,
            writing_type: w.type || 'other',
            content: w.content,
            recipient: w.recipient || null,
            in_universe_date: w.in_universe_date || null,
            display_order: idx,
          }))

          const { error: writingsError } = await supabase
            .from('vault_character_writings')
            .insert(writingsToInsert)

          if (writingsError) {
            console.error('Error saving writings:', writingsError)
          }
        }
      }
    }

    // Sync status with content_mode (Retired/Deceased -> inactive, Active/In Progress -> active)
    if (savedCharId) {
      const inactiveStatuses = ['Retired', 'Deceased']
      const activeStatuses = ['Active', 'In Progress']

      if (inactiveStatuses.includes(dataToSave.status)) {
        // Set content to inactive
        const reason = dataToSave.status.toLowerCase() // 'retired' or 'deceased'
        await fetch('/api/content/set-inactive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contentType: 'character',
            contentId: savedCharId,
            reason,
          }),
        })
      } else if (activeStatuses.includes(dataToSave.status)) {
        // Reactivate content if it was inactive
        await fetch('/api/content/reactivate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contentType: 'character',
            contentId: savedCharId,
          }),
        })
      }
    }
  }, [characterId, supabase, writingsLoaded])

  const { status } = useAutoSave({
    data: formData,
    onSave: saveCharacter,
    delay: 1500,
    enabled: !!formData.name.trim(),
  })

  // Handle inline image upload for notes editor
  const handleEditorImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !notesEditor) return

    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      alert('Please select an image under 5MB')
      return
    }

    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Not authenticated')

      const fileExt = file.name.split('.').pop()
      const fileName = `${userData.user.id}/content/${Date.now()}.${fileExt}`

      const { data, error } = await supabase.storage
        .from('vault-images')
        .upload(fileName, file, { upsert: true })

      if (error) throw error

      if (data) {
        const { data: urlData } = supabase.storage.from('vault-images').getPublicUrl(data.path)
        notesEditor.chain().focus().setImage({ src: urlData.publicUrl }).run()
      }
    } catch (error) {
      console.error('Image upload error:', error)
      alert('Failed to upload image')
    }
  }, [notesEditor, supabase])

  const setLink = useCallback((editor: any) => {
    if (!editor) return
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('Enter URL', previousUrl)
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
  }, [])

  const handleDelete = async () => {
    if (!characterId) return
    await supabase
      .from('vault_characters')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', characterId)
    router.push('/vault')
  }

  const handleClose = () => {
    router.push('/vault')
  }

  const handleDuplicate = async () => {
    if (!characterId) return

    try {
      const response = await fetch('/api/vault/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId }),
      })

      if (response.ok) {
        const { id } = await response.json()
        router.push(`/vault/${id}`)
      }
    } catch (error) {
      console.error('Duplicate error:', error)
    }

    setDuplicateModalOpen(false)
  }

  // Handle adding a link
  const handleAddLink = async () => {
    if (!characterId || !linkForm.url.trim()) return

    try {
      // Handle special link types
      if (linkForm.type === 'theme_music') {
        setFormData(prev => ({
          ...prev,
          theme_music_url: linkForm.url.trim(),
          theme_music_title: linkForm.title.trim() || 'Theme Music'
        }))
      } else if (linkForm.type === 'character_sheet') {
        setFormData(prev => ({
          ...prev,
          character_sheet_url: linkForm.url.trim()
        }))
      } else {
        const { data, error } = await supabase
          .from('character_links')
          .insert({
            character_id: characterId,
            title: linkForm.title.trim() || 'Link',
            url: linkForm.url.trim(),
            link_type: linkForm.type,
            sort_order: links.length
          })
          .select()
          .single()

        if (error) throw error
        if (data) setLinks(prev => [...prev, data])
      }

      setLinkForm({ type: 'other', title: '', url: '' })
      setAddLinkModalOpen(false)
    } catch (error) {
      console.error('Add link error:', error)
    }
  }

  // Handle adding an NPC/relationship
  const handleAddStoryCharacter = async () => {
    if (!characterId || !npcForm.related_name.trim()) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('vault_character_relationships')
        .insert({
          user_id: user.id,
          character_id: characterId,
          related_name: npcForm.related_name.trim(),
          nickname: npcForm.nickname.trim() || null,
          relationship_type: npcForm.relationship_type,
          relationship_label: npcForm.relationship_label.trim() || null,
          faction_affiliations: npcForm.faction_affiliations.length > 0 ? npcForm.faction_affiliations : null,
          location: npcForm.location.trim() || null,
          occupation: npcForm.occupation.trim() || null,
          origin: npcForm.origin.trim() || null,
          needs: npcForm.needs.trim() || null,
          can_provide: npcForm.can_provide.trim() || null,
          goals: npcForm.goals.trim() || null,
          secrets: npcForm.secrets.trim() || null,
          personality_traits: npcForm.personality_traits.length > 0 ? npcForm.personality_traits : null,
          full_notes: npcForm.full_notes.trim() || null,
          relationship_status: npcForm.relationship_status,
          related_image_url: npcForm.related_image_url || null,
          display_order: relationships.length,
          is_companion: false,
          is_party_member: npcForm.is_party_member,
        })
        .select()
        .single()

      if (error) throw error
      if (data) setRelationships(prev => [...prev, data])

      // Reset the form
      setNpcForm({
        related_name: '',
        nickname: '',
        relationship_type: 'friend',
        relationship_label: '',
        faction_affiliations: [],
        location: '',
        occupation: '',
        origin: '',
        needs: '',
        can_provide: '',
        goals: '',
        secrets: '',
        personality_traits: [],
        full_notes: '',
        relationship_status: 'active',
        related_image_url: null,
        is_party_member: false,
      })
      setAddStoryCharacterModalOpen(false)
    } catch (error) {
      console.error('Add NPC error:', error)
    }
  }

  // Handle adding a journal entry
  const handleAddJournalEntry = async () => {
    if (!characterId || !journalForm.notes.trim()) return

    try {
      const { data, error } = await supabase
        .from('play_journal')
        .insert({
          character_id: characterId,
          session_number: journalForm.session_number ? parseInt(journalForm.session_number) : null,
          session_date: journalForm.session_date || null,
          title: journalForm.title.trim() || null,
          notes: journalForm.notes.trim(),
          campaign_name: journalForm.campaign_name.trim() || null,
          summary: journalForm.summary.trim() || null,
          kill_count: journalForm.kill_count ? parseInt(journalForm.kill_count) : null,
          loot: journalForm.loot.trim() || null,
          thoughts_for_next: journalForm.thoughts_for_next.trim() || null,
          npcs_met: journalForm.npcs_met.length > 0 ? journalForm.npcs_met : null,
          locations_visited: journalForm.locations_visited.length > 0 ? journalForm.locations_visited : null,
        })
        .select()
        .single()

      if (error) throw error
      if (data) setJournalEntries(prev => [data, ...prev].sort((a, b) => (a.session_number || 0) - (b.session_number || 0)))

      setJournalForm({ session_number: '', session_date: '', title: '', notes: '', campaign_name: '', summary: '', kill_count: '', loot: '', thoughts_for_next: '', npcs_met: [], locations_visited: [] })
      setAddJournalModalOpen(false)
    } catch (error) {
      console.error('Add journal entry error:', error)
    }
  }

  // Open NPC edit modal
  const openEditNPC = (npc: VaultCharacterRelationship) => {
    setEditingNPC(npc)
    setNpcForm({
      related_name: npc.related_name || '',
      nickname: npc.nickname || '',
      relationship_type: npc.relationship_type || 'friend',
      relationship_label: npc.relationship_label || '',
      faction_affiliations: npc.faction_affiliations || [],
      location: npc.location || '',
      occupation: npc.occupation || '',
      origin: npc.origin || '',
      needs: npc.needs || '',
      can_provide: npc.can_provide || '',
      goals: npc.goals || '',
      secrets: npc.secrets || '',
      personality_traits: npc.personality_traits || [],
      full_notes: npc.full_notes || '',
      relationship_status: npc.relationship_status || 'active',
      related_image_url: npc.related_image_url || null,
      is_party_member: npc.is_party_member || false,
    })
    setEditNPCModalOpen(true)
  }

  // Save NPC edits
  const handleSaveNPC = async () => {
    if (!editingNPC || !npcForm.related_name.trim()) return

    try {
      const { data, error } = await supabase
        .from('vault_character_relationships')
        .update({
          related_name: npcForm.related_name.trim(),
          nickname: npcForm.nickname.trim() || null,
          relationship_type: npcForm.relationship_type,
          relationship_label: npcForm.relationship_label.trim() || null,
          faction_affiliations: npcForm.faction_affiliations.length > 0 ? npcForm.faction_affiliations : null,
          location: npcForm.location.trim() || null,
          occupation: npcForm.occupation.trim() || null,
          origin: npcForm.origin.trim() || null,
          needs: npcForm.needs.trim() || null,
          can_provide: npcForm.can_provide.trim() || null,
          goals: npcForm.goals.trim() || null,
          secrets: npcForm.secrets.trim() || null,
          personality_traits: npcForm.personality_traits.length > 0 ? npcForm.personality_traits : null,
          full_notes: npcForm.full_notes.trim() || null,
          relationship_status: npcForm.relationship_status,
          related_image_url: npcForm.related_image_url,
          is_party_member: npcForm.is_party_member,
        })
        .eq('id', editingNPC.id)
        .select()
        .single()

      if (error) throw error
      if (data) {
        setRelationships(prev => prev.map(r => r.id === data.id ? data : r))
      }

      setEditNPCModalOpen(false)
      setEditingNPC(null)
    } catch (error) {
      console.error('Save NPC error:', error)
    }
  }

  // Handle adding a companion
  const handleAddCompanion = async () => {
    if (!characterId || !companionForm.related_name.trim()) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('vault_character_relationships')
        .insert({
          user_id: user.id,
          character_id: characterId,
          related_name: companionForm.related_name.trim(),
          companion_type: companionForm.companion_type,
          companion_species: companionForm.companion_species.trim() || null,
          description: companionForm.description.trim() || null,
          companion_abilities: companionForm.companion_abilities.trim() || null,
          related_image_url: companionForm.related_image_url,
          relationship_type: 'companion',
          is_companion: true,
          display_order: companions.length,
        })
        .select()
        .single()

      if (error) throw error
      if (data) setRelationships(prev => [...prev, data])

      setCompanionForm({ related_name: '', companion_type: 'familiar', companion_species: '', description: '', companion_abilities: '', related_image_url: null })
      setAddCompanionModalOpen(false)
    } catch (error) {
      console.error('Add companion error:', error)
    }
  }

  // Open companion edit modal
  const openEditCompanion = (companion: VaultCharacterRelationship) => {
    setEditingCompanion(companion)
    setCompanionForm({
      related_name: companion.related_name || '',
      companion_type: companion.companion_type || 'familiar',
      companion_species: companion.companion_species || '',
      description: companion.description || '',
      companion_abilities: companion.companion_abilities || '',
      related_image_url: companion.related_image_url || null,
    })
    setEditCompanionModalOpen(true)
  }

  // Save companion edits
  const handleSaveCompanion = async () => {
    if (!editingCompanion || !companionForm.related_name.trim()) return

    try {
      const { data, error } = await supabase
        .from('vault_character_relationships')
        .update({
          related_name: companionForm.related_name.trim(),
          companion_type: companionForm.companion_type,
          companion_species: companionForm.companion_species.trim() || null,
          description: companionForm.description.trim() || null,
          companion_abilities: companionForm.companion_abilities.trim() || null,
          related_image_url: companionForm.related_image_url,
        })
        .eq('id', editingCompanion.id)
        .select()
        .single()

      if (error) throw error
      if (data) {
        setRelationships(prev => prev.map(r => r.id === data.id ? data : r))
      }

      setEditCompanionModalOpen(false)
      setEditingCompanion(null)
    } catch (error) {
      console.error('Save companion error:', error)
    }
  }

  // Upload relationship image (NPC/Companion)
  const uploadRelationshipImage = async (blob: Blob): Promise<string> => {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) throw new Error('Not authenticated')

    const timestamp = Date.now()
    const uniqueId = uuidv4().slice(0, 8)
    const path = `${userData.user.id}/relationships/${timestamp}-${uniqueId}.webp`

    const { error } = await supabase.storage
      .from('vault-images')
      .upload(path, blob, {
        contentType: 'image/webp',
        upsert: true,
      })

    if (error) throw error

    const { data: urlData } = supabase.storage
      .from('vault-images')
      .getPublicUrl(path)

    return urlData.publicUrl
  }

  // Upload gallery image
  const uploadGalleryImage = async (blob: Blob): Promise<string> => {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) throw new Error('Not authenticated')

    const timestamp = Date.now()
    const uniqueId = uuidv4().slice(0, 8)
    const path = `${userData.user.id}/gallery/${timestamp}-${uniqueId}.webp`

    const { error } = await supabase.storage
      .from('vault-images')
      .upload(path, blob, {
        contentType: 'image/webp',
        upsert: true,
      })

    if (error) throw error

    const { data: urlData } = supabase.storage
      .from('vault-images')
      .getPublicUrl(path)

    return urlData.publicUrl
  }

  // Handle adding a gallery image
  const handleAddGalleryImage = async (imageUrl: string | null) => {
    if (!characterId || !imageUrl) return

    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Not authenticated')

      const maxOrder = Math.max(0, ...galleryImages.map(i => i.display_order || 0))

      const { data, error } = await supabase
        .from('vault_character_images')
        .insert({
          user_id: userData.user.id,
          character_id: characterId,
          image_url: imageUrl,
          is_primary: galleryImages.length === 0,
          display_order: maxOrder + 1,
        })
        .select()
        .single()

      if (error) throw error
      if (data) {
        setGalleryImages(prev => [...prev, data])
      }

      setGalleryImageModalOpen(false)
    } catch (error) {
      console.error('Add gallery image error:', error)
    }
  }

  // Open journal edit modal
  const openEditJournal = (entry: PlayJournal) => {
    setEditingJournal(entry)
    setJournalForm({
      session_number: entry.session_number?.toString() || '',
      session_date: entry.session_date || '',
      title: entry.title || '',
      notes: entry.notes || '',
      campaign_name: entry.campaign_name || '',
      summary: entry.summary || '',
      kill_count: entry.kill_count?.toString() || '',
      loot: entry.loot || '',
      thoughts_for_next: entry.thoughts_for_next || '',
      npcs_met: entry.npcs_met || [],
      locations_visited: entry.locations_visited || [],
    })
    setEditJournalModalOpen(true)
  }

  // Save journal edits
  const handleSaveJournal = async () => {
    if (!editingJournal || !journalForm.notes.trim()) return

    try {
      const { data, error } = await supabase
        .from('play_journal')
        .update({
          session_number: journalForm.session_number ? parseInt(journalForm.session_number) : null,
          session_date: journalForm.session_date || null,
          title: journalForm.title.trim() || null,
          notes: journalForm.notes.trim(),
          campaign_name: journalForm.campaign_name.trim() || null,
          summary: journalForm.summary.trim() || null,
          kill_count: journalForm.kill_count ? parseInt(journalForm.kill_count) : null,
          loot: journalForm.loot.trim() || null,
          thoughts_for_next: journalForm.thoughts_for_next.trim() || null,
          npcs_met: journalForm.npcs_met.length > 0 ? journalForm.npcs_met : null,
          locations_visited: journalForm.locations_visited.length > 0 ? journalForm.locations_visited : null,
        })
        .eq('id', editingJournal.id)
        .select()
        .single()

      if (error) throw error
      if (data) {
        setJournalEntries(prev => prev.map(e => e.id === data.id ? data : e).sort((a, b) => (a.session_number || 0) - (b.session_number || 0)))
      }

      setEditJournalModalOpen(false)
      setEditingJournal(null)
      setJournalForm({ session_number: '', session_date: '', title: '', notes: '', campaign_name: '', summary: '', kill_count: '', loot: '', thoughts_for_next: '', npcs_met: [], locations_visited: [] })
    } catch (error) {
      console.error('Save journal error:', error)
    }
  }

  // Delete journal entry
  const handleDeleteJournal = async (entry: PlayJournal) => {
    if (!confirm(`Delete session ${entry.session_number || 'entry'}?`)) return

    try {
      await supabase.from('play_journal').delete().eq('id', entry.id)
      setJournalEntries(prev => prev.filter(e => e.id !== entry.id))
    } catch (error) {
      console.error('Delete journal error:', error)
    }
  }


  // =====================================================
  // STYLED COMPONENTS
  // =====================================================

  // Toolbar button component - refined hover/active states
  const ToolbarButton = ({ onClick, active, disabled, children, title }: {
    onClick: () => void
    active?: boolean
    disabled?: boolean
    children: React.ReactNode
    title?: string
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'p-2.5 rounded-lg transition-all duration-200 ease-out',
        active
          ? 'bg-purple-500/20 text-purple-400 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.3)]'
          : 'text-gray-500 hover:text-gray-200 hover:bg-white/[0.06]',
        disabled && 'opacity-30 cursor-not-allowed hover:bg-transparent hover:text-gray-500'
      )}
    >
      {children}
    </button>
  )

  // Editor toolbar - clean, minimal aesthetic
  const EditorToolbar = ({ editor, minimal = false }: { editor: any; minimal?: boolean }) => (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.015] flex-wrap">
      {/* Undo/Redo */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton onClick={() => editor?.chain().focus().undo().run()} disabled={!editor?.can().undo()} title="Undo">
          <Undo className="w-5 h-5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().redo().run()} disabled={!editor?.can().redo()} title="Redo">
          <Redo className="w-5 h-5" />
        </ToolbarButton>
      </div>
      {!minimal && (
        <>
          <div className="w-px h-5 bg-white/10 mx-1.5" />
          {/* Headings */}
          <div className="flex items-center gap-0.5">
            <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive('heading', { level: 1 })} title="Heading 1">
              <Heading1 className="w-5 h-5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })} title="Heading 2">
              <Heading2 className="w-5 h-5" />
            </ToolbarButton>
          </div>
        </>
      )}
      <div className="w-px h-5 bg-white/10 mx-1.5" />
      {/* Text formatting */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')} title="Bold">
          <Bold className="w-5 h-5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')} title="Italic">
          <Italic className="w-5 h-5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive('underline')} title="Underline">
          <UnderlineIcon className="w-5 h-5" />
        </ToolbarButton>
        {!minimal && (
          <>
            <ToolbarButton onClick={() => editor?.chain().focus().toggleStrike().run()} active={editor?.isActive('strike')} title="Strikethrough">
              <Strikethrough className="w-5 h-5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor?.chain().focus().toggleHighlight().run()} active={editor?.isActive('highlight')} title="Highlight">
              <Highlighter className="w-5 h-5" />
            </ToolbarButton>
          </>
        )}
      </div>
      {!minimal && (
        <>
          <div className="w-px h-5 bg-white/10 mx-1.5" />
          {/* Lists */}
          <div className="flex items-center gap-0.5">
            <ToolbarButton onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')} title="Bullet List">
              <List className="w-5 h-5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')} title="Numbered List">
              <ListOrdered className="w-5 h-5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive('blockquote')} title="Quote">
              <Quote className="w-5 h-5" />
            </ToolbarButton>
          </div>
          <div className="w-px h-5 bg-white/10 mx-1.5" />
          {/* Insert */}
          <div className="flex items-center gap-0.5">
            <ToolbarButton onClick={() => setLink(editor)} active={editor?.isActive('link')} title="Link">
              <LinkIcon className="w-5 h-5" />
            </ToolbarButton>
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleEditorImageUpload} />
            <ToolbarButton onClick={() => imageInputRef.current?.click()} title="Insert Image">
              <ImageIcon className="w-5 h-5" />
            </ToolbarButton>
          </div>
        </>
      )}
    </div>
  )

  // Legacy Section header for inline use (non-collapsible)
  const SectionHeader = ({ title, icon: Icon }: { title: string; icon: React.ComponentType<{ className?: string }> }) => (
    <div className="flex items-center gap-5 mb-8">
      <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20">
        <Icon className="w-5 h-5 text-purple-400" />
      </div>
      <h2 className="text-lg font-semibold text-white/90 tracking-wide uppercase">
        {title}
      </h2>
      <div className="flex-1 h-px bg-gradient-to-r from-white/[0.08] to-transparent" />
    </div>
  )

  // Simple label for fields within sections - supports emoji and count
  const FieldLabel = ({ children, emoji, count }: { children: React.ReactNode; emoji?: string; count?: number }) => (
    <label className="block text-[13px] font-medium text-gray-400/90 mb-2.5 tracking-wide flex items-center gap-2">
      {emoji && <span>{emoji}</span>}
      {children}
      {count !== undefined && count > 0 && <span className="text-gray-500 font-normal">({count})</span>}
    </label>
  )

  // Form label component for sidebar
  const FormLabel = ({ children }: { children: React.ReactNode }) => (
    <label className="text-[13px] font-medium text-gray-400/80 mb-2 block tracking-wide">
      {children}
    </label>
  )

  // Form input styles - refined with better focus states
  const inputStyles = "w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-[15px] text-white/90 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.05] focus:border-purple-500/40 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.1)] transition-all duration-200"
  const textareaStyles = cn(inputStyles, "min-h-[150px] resize-none leading-relaxed")

  // Status dropdown - refined with subtle depth
  const StatusDropdown = () => {
    const allStatuses = [...DEFAULT_STATUSES, ...customStatuses.map(s => ({ name: s.name, color: s.color }))]

    return (
      <div className="relative">
        <button
          onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
          className="flex items-center gap-3 w-full px-4 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl hover:bg-white/[0.05] hover:border-white/[0.12] transition-all duration-200 group"
        >
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: formData.status_color, boxShadow: `0 0 10px ${formData.status_color}50` }}
          />
          <span className="text-white/90 flex-1 text-left text-[15px]">{formData.status}</span>
          <ChevronDown className={cn("w-4 h-4 text-gray-500 group-hover:text-gray-400 transition-all duration-200", statusDropdownOpen && "rotate-180")} />
        </button>

        {statusDropdownOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setStatusDropdownOpen(false)} />
            <div className="absolute top-full left-0 mt-1.5 w-full bg-[#1a1a1f] border border-white/[0.08] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] z-50 py-1.5 overflow-hidden">
              {allStatuses.map((s) => (
                <button
                  key={s.name}
                  onClick={() => {
                    setFormData(prev => ({ ...prev, status: s.name, status_color: s.color }))
                    setStatusDropdownOpen(false)
                  }}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 w-full hover:bg-white/[0.05] transition-all duration-150",
                    formData.status === s.name && "bg-purple-500/10"
                  )}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: s.color, boxShadow: `0 0 8px ${s.color}40` }}
                  />
                  <span className="text-white/85 text-[14px]">{s.name}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  // Array field editor for lists - clean, minimal design
  const ArrayFieldEditor = ({
    label,
    items,
    placeholder,
    onChange,
    bulletChar = '•'
  }: {
    label: string
    items: string[]
    placeholder: string
    onChange: (items: string[]) => void
    bulletChar?: string
  }) => {
    const [newItem, setNewItem] = useState('')

    const addItem = () => {
      if (newItem.trim()) {
        onChange([...items, newItem.trim()])
        setNewItem('')
      }
    }

    const removeItem = (index: number) => {
      onChange(items.filter((_, i) => i !== index))
    }

    return (
      <div>
        <FieldLabel>{label}</FieldLabel>
        <div className="space-y-2 mb-3">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-3 group">
              <span className="text-purple-400/70 text-sm w-4 flex-shrink-0 text-center">{bulletChar}</span>
              <input
                value={item}
                onChange={(e) => {
                  const newItems = [...items]
                  newItems[index] = e.target.value
                  onChange(newItems)
                }}
                className="flex-1 py-2.5 px-3.5 bg-white/[0.02] border border-white/[0.06] rounded-lg text-white/80 text-[14px] focus:outline-none focus:bg-white/[0.04] focus:border-purple-500/30 transition-all duration-200"
              />
              <button
                onClick={() => removeItem(index)}
                className="p-1.5 text-gray-600 hover:text-red-400/80 opacity-0 group-hover:opacity-100 transition-all duration-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem())}
            placeholder={placeholder}
            className="flex-1 py-2.5 px-3.5 bg-white/[0.02] border border-white/[0.06] rounded-lg text-white/90 text-[14px] placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.04] focus:border-purple-500/30 transition-all duration-200"
          />
          <button
            onClick={addItem}
            disabled={!newItem.trim()}
            className="px-3.5 py-2.5 bg-purple-500/15 text-purple-400 rounded-lg hover:bg-purple-500/25 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  // Portrait display - premium card with subtle glow effect
  const PortraitDisplay = () => {
    const displayUrl = formData.detail_image_url || formData.image_url

    return (
      <div className="relative">
        <input
          ref={portraitInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handlePortraitSelect}
        />

        {displayUrl ? (
          <div className="relative group">
            {/* Subtle glow behind portrait */}
            <div className="absolute -inset-1 bg-gradient-to-b from-purple-500/20 via-purple-500/5 to-transparent rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
            <div
              className="relative w-full aspect-[3/4] overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a0c] transition-all duration-300 group-hover:border-purple-500/30"
              style={{ boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)' }}
            >
              <Image
                src={displayUrl}
                alt={formData.name || 'Character portrait'}
                fill
                className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                sizes="320px"
              />
              {/* Hover overlay with View and Upload icons */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-6">
                <button
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  className="p-3 bg-white/10 backdrop-blur-sm rounded-xl text-white hover:bg-white/20 transition-all duration-200"
                  title="View full size"
                >
                  <Eye className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={() => portraitInputRef.current?.click()}
                  disabled={isUploading}
                  className="p-3 bg-white/10 backdrop-blur-sm rounded-xl text-white hover:bg-white/20 transition-all duration-200"
                  title="Upload new image"
                >
                  <Upload className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full aspect-[3/4] rounded-xl bg-white/[0.02] border border-dashed border-white/[0.1] flex flex-col items-center justify-center gap-3 transition-all duration-300 hover:border-purple-500/40 hover:bg-purple-500/[0.03] group">
            <button
              type="button"
              onClick={() => portraitInputRef.current?.click()}
              className="flex flex-col items-center gap-3 cursor-pointer"
            >
              {formData.name ? (
                <span className="text-4xl font-semibold text-gray-600 group-hover:text-gray-500 transition-colors duration-200">
                  {getInitials(formData.name)}
                </span>
              ) : (
                <Camera className="w-8 h-8 text-gray-600 group-hover:text-purple-400/80 transition-colors duration-200" />
              )}
              <span className="text-[13px] text-gray-500 group-hover:text-gray-400 transition-colors duration-200">
                Upload portrait
              </span>
            </button>
            {canUseAI && (
              <button
                type="button"
                onClick={handleGenerateAiPrompt}
                disabled={generatingPrompt}
                className="flex items-center gap-1.5 text-[12px] text-purple-400/70 hover:text-purple-300 transition-colors"
              >
                {generatingPrompt ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                Generate AI prompt
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  // Lightbox
  const Lightbox = () => {
    const displayUrl = formData.detail_image_url || formData.image_url
    if (!lightboxOpen || !displayUrl) return null

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
          src={displayUrl}
          alt={formData.name || 'Character portrait'}
          className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    )
  }

  if (!notesEditor || !summaryEditor) return null

  // ============ MOBILE LAYOUT ============
  if (isMobile) {
    return (
      <>
      <CharacterEditorMobile
        mode={mode}
        characterId={characterId}
        formData={formData}
        setFormData={setFormData}
        status={status}
        summaryEditor={summaryEditor}
        notesEditor={notesEditor}
        expandedSections={expandedSections}
        toggleSection={toggleSection}
        activeSection={activeSection}
        scrollToSection={scrollToSection}
        scrollContainerRef={scrollContainerRef}
        portraitInputRef={portraitInputRef}
        isUploading={isUploading}
        handlePortraitSelect={handlePortraitSelect}
        npcs={npcs}
        companions={companions}
        galleryImages={galleryImages}
        links={links}
        isDeleteConfirmOpen={isDeleteConfirmOpen}
        setIsDeleteConfirmOpen={setIsDeleteConfirmOpen}
        duplicateModalOpen={duplicateModalOpen}
        setDuplicateModalOpen={setDuplicateModalOpen}
        shareModalOpen={shareModalOpen}
        setShareModalOpen={setShareModalOpen}
        handleClose={handleClose}
        handleDelete={handleDelete}
        handleDuplicate={handleDuplicate}
        showSecrets={showSecrets}
        setShowSecrets={setShowSecrets}
        canUseAI={canUseAI}
        generatingPrompt={generatingPrompt}
        handleGenerateAiPrompt={handleGenerateAiPrompt}
      />
      {standalone && <MobileTabBar />}
      </>
    )
  }

  // ============ DESKTOP LAYOUT ============
  return (
    <>
      <div
        className={cn(
          "z-50 bg-[#0c0c0e] flex flex-col",
          isMobile
            ? "fixed inset-0 p-0"
            : "fixed right-0 bottom-0 p-2 xl:p-3 2xl:p-4"
        )}
        style={isMobile ? {} : { top: 'var(--topbar-height)', left: 'calc(var(--dock-width-collapsed) + 16px)' }}
      >
        <div className={cn(
          "flex-1 flex flex-col overflow-hidden bg-[#111113]",
          isMobile ? "" : "rounded-2xl border border-white/[0.06]"
        )}>
        {/* Header - Mobile optimized */}
        <header className={cn(
          "flex-shrink-0 flex items-center justify-between border-b border-white/[0.06] bg-white/[0.01]",
          isMobile ? "px-4 h-[calc(44px+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)]" : "px-5 xl:px-6 h-14"
        )}>
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className={cn(
                "flex items-center gap-2 rounded-lg hover:bg-white/[0.05] transition-all duration-200 text-gray-500 hover:text-gray-300",
                isMobile ? "px-2 py-2" : "px-2.5 py-1.5"
              )}
            >
              <ArrowLeft className={isMobile ? "w-5 h-5" : "w-4 h-4"} />
              {!isMobile && <span className="text-[13px]">Back</span>}
            </button>
            <div className={cn("w-px h-5 bg-white/[0.08]", isMobile && "hidden")} />
            <div className="flex items-center gap-2.5">
              <div className={cn(
                "rounded-lg flex items-center justify-center",
                isMobile ? "w-7 h-7" : "w-8 h-8",
                formData.type === 'pc' ? "bg-purple-500/15 text-purple-400" : "bg-gray-500/15 text-gray-400"
              )}>
                {formData.type === 'pc' ? <User className="w-4 h-4" /> : <Users className="w-4 h-4" />}
              </div>
              <h1 className={cn(
                "font-medium text-white/90 truncate",
                isMobile ? "text-[16px] max-w-[160px]" : "text-[15px]"
              )}>
                {status === 'saving' ? 'Saving...' : formData.name || (isCreateMode ? 'New Character' : 'Enter a name to start')}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {characterId && (
              <>
                {/* State Badge */}
                {!isMobile && character && (
                  <TemplateStateBadge
                    mode={character.content_mode || 'active'}
                    inactiveReason={character.inactive_reason}
                    size="sm"
                    className="mr-1"
                  />
                )}

                {/* Published indicator */}
                {isPublished && (
                  <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-purple-400 bg-purple-500/10 rounded-full border border-purple-500/30">
                    <Sparkles className="w-3 h-3" />
                    Published
                  </span>
                )}
                {/* Share/Duplicate/Delete buttons moved to TopBar */}
              </>
            )}
          </div>
        </header>

        {/* Mobile Section Tabs */}
        {isMobile && (
          <div className="mobile-section-tabs">
            {SECTIONS.map(section => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={cn(
                  'mobile-section-tab',
                  activeSection === section.id && 'mobile-section-tab-active'
                )}
              >
                {section.label}
              </button>
            ))}
          </div>
        )}

        {/* Main Content */}
        <div className={cn(
          "flex-1 flex overflow-hidden min-h-0 gap-0",
          isMobile && "flex-col"
        )}>
          {/* Left Sidebar - Desktop only */}
          <aside className={cn(
            "flex-shrink-0 flex flex-col border-r border-white/[0.06] overflow-hidden bg-[#0f0f11]",
            isMobile ? "hidden" : "w-[320px] xl:w-[360px] 2xl:w-[400px]"
          )}>
            <div className="flex-1 overflow-y-auto px-6 xl:px-8 py-6 xl:py-8">
              {/* Portrait */}
              <div className="mb-6">
                <PortraitDisplay />
              </div>

              {/* Name */}
              <div className="mb-5">
                <label className="block text-[12px] font-medium text-gray-500 mb-2 uppercase tracking-wider">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter name..."
                  className="w-full py-3 px-4 text-[15px] bg-white/[0.03] border border-white/[0.08] rounded-xl text-white/90 placeholder:text-gray-600 focus:bg-white/[0.05] focus:border-purple-500/40 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.1)] focus:outline-none transition-all duration-200"
                />
              </div>

              {/* Type Toggle */}
              <div className="mb-5">
                <label className="block text-[12px] font-medium text-gray-500 mb-2 uppercase tracking-wider">Type</label>
                <div className="flex bg-white/[0.02] rounded-xl p-1 border border-white/[0.06]">
                  <button
                    onClick={() => setFormData(prev => ({ ...prev, type: 'pc' }))}
                    className={cn(
                      'flex-1 py-2.5 px-4 rounded-lg text-[13px] font-medium transition-all duration-200',
                      formData.type === 'pc'
                        ? 'bg-purple-500/20 text-purple-400 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.3)]'
                        : 'text-gray-500 hover:text-gray-300'
                    )}
                  >
                    Player Character
                  </button>
                  <button
                    onClick={() => setFormData(prev => ({ ...prev, type: 'npc' }))}
                    className={cn(
                      'flex-1 py-2.5 px-4 rounded-lg text-[13px] font-medium transition-all duration-200',
                      formData.type === 'npc'
                        ? 'bg-gray-500/20 text-gray-300 shadow-[inset_0_0_0_1px_rgba(156,163,175,0.2)]'
                        : 'text-gray-500 hover:text-gray-300'
                    )}
                  >
                    NPC
                  </button>
                </div>
              </div>

              {/* Status */}
              <div className="mb-6">
                <label className="block text-[12px] font-medium text-gray-500 mb-2 uppercase tracking-wider">Status</label>
                <StatusDropdown />
              </div>

              {/* Divider */}
              <div className="my-5">
                <div className="h-px bg-gradient-to-r from-white/[0.06] via-white/[0.04] to-transparent" />
              </div>

              {/* NAVIGATION - Quick jump to sections */}
              <div className="mb-5">
                <h3 className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-3">Navigate</h3>
                <nav className="space-y-1">
                  {SECTIONS.map(section => (
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

              {/* Divider */}
              <div className="my-5">
                <div className="h-px bg-gradient-to-r from-white/[0.06] via-white/[0.04] to-transparent" />
              </div>

              {/* Quick Details */}
              <div className="mb-5">
                <h3 className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-3">Quick Details</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[12px] text-gray-500 mb-1.5">Race</label>
                    <input
                      type="text"
                      value={formData.race}
                      onChange={(e) => setFormData(prev => ({ ...prev, race: e.target.value }))}
                      placeholder="Human, Elf, Dwarf..."
                      className="w-full py-2.5 px-3.5 text-[14px] bg-white/[0.03] border border-white/[0.06] rounded-lg text-white/85 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.05] focus:border-purple-500/30 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] text-gray-500 mb-1.5">Class</label>
                    <input
                      type="text"
                      value={formData.class}
                      onChange={(e) => setFormData(prev => ({ ...prev, class: e.target.value }))}
                      placeholder="Fighter, Wizard, Rogue..."
                      className="w-full py-2.5 px-3.5 text-[14px] bg-white/[0.03] border border-white/[0.06] rounded-lg text-white/85 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.05] focus:border-purple-500/30 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] text-gray-500 mb-1.5">Background</label>
                    <input
                      type="text"
                      value={formData.background}
                      onChange={(e) => setFormData(prev => ({ ...prev, background: e.target.value }))}
                      placeholder="Noble, Criminal, Sage..."
                      className="w-full py-2.5 px-3.5 text-[14px] bg-white/[0.03] border border-white/[0.06] rounded-lg text-white/85 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.05] focus:border-purple-500/30 transition-all duration-200"
                    />
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="my-5">
                <div className="h-px bg-gradient-to-r from-white/[0.06] via-white/[0.04] to-transparent" />
              </div>

              {/* Links */}
              <div>
                <h3 className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-3">Links</h3>
                <div className="space-y-1.5">
                  {formData.theme_music_url && (
                    <a
                      href={formData.theme_music_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 py-2 px-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-purple-500/20 transition-all duration-200 group"
                    >
                      <Music className="w-4 h-4 text-purple-400/80" />
                      <span className="text-[13px] text-gray-400 flex-1 truncate group-hover:text-gray-300 transition-colors">
                        {formData.theme_music_title || 'Theme Music'}
                      </span>
                      <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-purple-400 transition-colors" />
                    </a>
                  )}

                  {formData.character_sheet_url && (
                    <a
                      href={formData.character_sheet_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 py-2 px-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-yellow-500/20 transition-all duration-200 group"
                    >
                      <FileText className="w-4 h-4 text-yellow-400/80" />
                      <span className="text-[13px] text-gray-400 flex-1 truncate group-hover:text-gray-300 transition-colors">Character Sheet</span>
                      <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-yellow-400 transition-colors" />
                    </a>
                  )}

                  {links.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 py-2 px-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-200 group"
                    >
                      <ExternalLink className="w-4 h-4 text-gray-500" />
                      <span className="text-[13px] text-gray-400 flex-1 truncate group-hover:text-gray-300 transition-colors">{link.title}</span>
                    </a>
                  ))}
                </div>

                <button
                  onClick={() => setAddLinkModalOpen(true)}
                  className="w-full mt-2 py-2.5 px-4 border border-dashed border-white/[0.1] rounded-lg text-[13px] text-gray-500 hover:border-purple-500/30 hover:text-purple-400 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Link
                </button>
              </div>
            </div>

          </aside>

          {/* Main Content Area - Single Scrollable Page */}
          <main className="flex-1 overflow-y-auto bg-[#131316]" ref={scrollContainerRef}>
            <div className={cn(
              "w-full max-w-[1400px] mx-auto",
              isMobile ? "px-4 py-4 pb-24" : "px-10 xl:px-16 2xl:px-20 py-10 xl:py-12"
            )}>
              <div>

              {/* Mobile Quick Details Card - Only visible on mobile */}
              {isMobile && (
                <div className="mb-6 p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                  {/* Portrait and Name Row */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-gradient-to-br from-purple-500/20 to-gray-900 flex-shrink-0">
                      {formData.detail_image_url || formData.image_url ? (
                        <Image
                          src={formData.detail_image_url || formData.image_url!}
                          alt={formData.name || 'Character'}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-purple-400/50">
                          {getInitials(formData.name || 'CH')}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Character Name"
                        className="w-full text-xl font-semibold bg-transparent text-white placeholder:text-gray-600 focus:outline-none"
                      />
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn(
                          "text-xs font-medium px-2 py-0.5 rounded",
                          formData.type === 'pc' ? "bg-purple-500/20 text-purple-400" : "bg-gray-500/20 text-gray-400"
                        )}>
                          {formData.type === 'pc' ? 'PC' : 'NPC'}
                        </span>
                        {formData.status && (
                          <span
                            className="text-xs font-medium px-2 py-0.5 rounded"
                            style={{
                              backgroundColor: `${formData.status_color}20`,
                              color: formData.status_color,
                            }}
                          >
                            {formData.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick Detail Fields */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1 uppercase">Race</label>
                      <input
                        type="text"
                        value={formData.race}
                        onChange={(e) => setFormData(prev => ({ ...prev, race: e.target.value }))}
                        placeholder="Race..."
                        className="w-full py-2 px-3 text-sm bg-white/[0.03] border border-white/[0.06] rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/30"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1 uppercase">Class</label>
                      <input
                        type="text"
                        value={formData.class}
                        onChange={(e) => setFormData(prev => ({ ...prev, class: e.target.value }))}
                        placeholder="Class..."
                        className="w-full py-2 px-3 text-sm bg-white/[0.03] border border-white/[0.06] rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/30"
                      />
                    </div>
                  </div>

                  {/* Type Toggle */}
                  <div className="mt-3">
                    <div className="flex bg-white/[0.02] rounded-lg p-1 border border-white/[0.06]">
                      <button
                        onClick={() => setFormData(prev => ({ ...prev, type: 'pc' }))}
                        className={cn(
                          'flex-1 py-2 px-3 rounded text-xs font-medium transition-all',
                          formData.type === 'pc'
                            ? 'bg-purple-500/20 text-purple-400'
                            : 'text-gray-500'
                        )}
                      >
                        Player Character
                      </button>
                      <button
                        onClick={() => setFormData(prev => ({ ...prev, type: 'npc' }))}
                        className={cn(
                          'flex-1 py-2 px-3 rounded text-xs font-medium transition-all',
                          formData.type === 'npc'
                            ? 'bg-gray-500/20 text-gray-300'
                            : 'text-gray-500'
                        )}
                      >
                        NPC
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══════════════ STATS OVERVIEW GRID ═══════════════ */}
              {!isCreateMode && characterId && (
                <div className="mb-8">
                  <div className={cn(
                    "grid gap-3",
                    isMobile ? "grid-cols-3" : "grid-cols-4 sm:grid-cols-5 lg:grid-cols-7"
                  )}>
                    <button
                      onClick={() => expandAndScrollToSection('people')}
                      className="bg-white/[0.02] rounded-lg p-3 text-center border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08] transition-colors cursor-pointer"
                    >
                      <p className="text-lg font-semibold text-white">{npcs.length}</p>
                      <p className="text-xs text-gray-500">NPCs</p>
                    </button>
                    <button
                      onClick={() => expandAndScrollToSection('people')}
                      className="bg-white/[0.02] rounded-lg p-3 text-center border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08] transition-colors cursor-pointer"
                    >
                      <p className="text-lg font-semibold text-white">{companions.length}</p>
                      <p className="text-xs text-gray-500">Companions</p>
                    </button>
                    <button
                      onClick={() => expandAndScrollToSection('writings')}
                      className="bg-white/[0.02] rounded-lg p-3 text-center border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08] transition-colors cursor-pointer"
                    >
                      <p className="text-lg font-semibold text-white">{formData.character_writings.length}</p>
                      <p className="text-xs text-gray-500">Writings</p>
                    </button>
                    <button
                      onClick={() => expandAndScrollToSection('backstory')}
                      className="bg-white/[0.02] rounded-lg p-3 text-center border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08] transition-colors cursor-pointer"
                    >
                      <p className="text-lg font-semibold text-white">{formData.backstory_phases.length}</p>
                      <p className="text-xs text-gray-500">Life Phases</p>
                    </button>
                    <button
                      onClick={() => expandAndScrollToSection('backstory')}
                      className="bg-white/[0.02] rounded-lg p-3 text-center border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08] transition-colors cursor-pointer"
                    >
                      <p className="text-lg font-semibold text-white">{formData.quotes.length}</p>
                      <p className="text-xs text-gray-500">Quotes</p>
                    </button>
                    <button
                      onClick={() => expandAndScrollToSection('backstory')}
                      className="bg-white/[0.02] rounded-lg p-3 text-center border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08] transition-colors cursor-pointer"
                    >
                      <p className="text-lg font-semibold text-white">{formData.plot_hooks.length}</p>
                      <p className="text-xs text-gray-500">Plot Hooks</p>
                    </button>
                    <button
                      onClick={() => expandAndScrollToSection('backstory')}
                      className="bg-white/[0.02] rounded-lg p-3 text-center border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08] transition-colors cursor-pointer"
                    >
                      <p className="text-lg font-semibold text-white">{formData.tldr.length}</p>
                      <p className="text-xs text-gray-500">TL;DR</p>
                    </button>
                  </div>
                </div>
              )}

              {/* ═══════════════ BACKSTORY SECTION ═══════════════ */}
              <CollapsibleSection id="backstory" title="Backstory" icon={BookOpen} isExpanded={expandedSections.backstory} onToggle={() => toggleSection('backstory')}>
                <div className="space-y-10">
                  {/* Summary */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400/90 mb-3">Summary</label>
                    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden focus-within:border-purple-500/30 focus-within:bg-white/[0.03] transition-all duration-200">
                      <EditorToolbar editor={summaryEditor} minimal />
                      <div className="px-6 py-5 min-h-[140px]">
                        <EditorContent editor={summaryEditor} className="prose prose-invert max-w-none" />
                      </div>
                    </div>
                  </div>

                  {/* Quick Summary bullets (TL;DR) */}
                  <div>
                    <FieldLabel emoji="⚡" count={formData.tldr.length}>Quick Summary (TL;DR)</FieldLabel>
                    <BulletListDisplay
                      items={formData.tldr}
                      bulletColor="purple"
                      emptyMessage="No quick summary points"
                      placeholder="Add a quick fact..."
                      editable
                      onSave={(items) => setFormData(prev => ({ ...prev, tldr: items }))}
                    />
                  </div>

                  {/* Full Backstory */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400/90 mb-3">Full Backstory</label>
                    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden focus-within:border-purple-500/30 focus-within:bg-white/[0.03] transition-all duration-200">
                      <EditorToolbar editor={notesEditor} />
                      <div className="px-8 py-6 min-h-[400px]">
                        <EditorContent editor={notesEditor} className="prose prose-invert prose-lg max-w-none" />
                      </div>
                    </div>
                  </div>

                  {/* Backstory Life Phases */}
                  <div>
                    <FieldLabel emoji="📅" count={formData.backstory_phases.length}>Life Phases</FieldLabel>
                    <LifePhaseDisplay
                      phases={formData.backstory_phases}
                      editable
                      onSave={(phases) => setFormData(prev => ({ ...prev, backstory_phases: phases }))}
                    />
                  </div>

                  {/* Plot Hooks */}
                  <div>
                    <FieldLabel emoji="🎯" count={formData.plot_hooks.length}>Plot Hooks</FieldLabel>
                    <BulletListDisplay
                      items={formData.plot_hooks}
                      bulletColor="amber"
                      emptyMessage="No plot hooks"
                      placeholder="Add a story hook for the DM..."
                      editable
                      onSave={(items) => setFormData(prev => ({ ...prev, plot_hooks: items }))}
                    />
                  </div>

                  {/* Quotes */}
                  <div>
                    <FieldLabel emoji="💬" count={formData.quotes.length}>Memorable Quotes</FieldLabel>
                    <QuotesDisplay
                      quotes={formData.quotes}
                      emptyMessage="No memorable quotes"
                      editable
                      onSave={(quotes) => setFormData(prev => ({ ...prev, quotes: quotes }))}
                    />
                  </div>
                </div>
              </CollapsibleSection>

              {/* ═══════════════ DETAILS SECTION ═══════════════ */}
              <CollapsibleSection id="details" title="Details" icon={FileText} isExpanded={expandedSections.details} onToggle={() => toggleSection('details')}>
                <div className="space-y-8">
                  {/* Appearance */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400/90 mb-3">Appearance</label>
                    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden focus-within:border-purple-500/30 focus-within:bg-white/[0.03] transition-all duration-200">
                      <textarea
                        value={formData.appearance}
                        onChange={(e) => setFormData(prev => ({ ...prev, appearance: e.target.value }))}
                        placeholder="Physical description, distinguishing features, typical attire..."
                        className="w-full px-6 py-5 min-h-[160px] text-[15px] bg-transparent text-white/80 placeholder:text-gray-600 focus:outline-none resize-none leading-relaxed"
                      />
                    </div>
                  </div>

                  {/* Physical Details Grid */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400/90 mb-4">Physical Details</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-2">Height</label>
                        <input
                          type="text"
                          value={formData.height}
                          onChange={(e) => setFormData(prev => ({ ...prev, height: e.target.value }))}
                          placeholder="175 cm"
                          className="w-full py-2.5 px-3 text-[14px] bg-white/[0.02] border border-white/[0.06] rounded-lg text-white/85 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.04] focus:border-purple-500/30 transition-all duration-200"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-2">Weight</label>
                        <input
                          type="text"
                          value={formData.weight}
                          onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                          placeholder="70 kg"
                          className="w-full py-2.5 px-3 text-[14px] bg-white/[0.02] border border-white/[0.06] rounded-lg text-white/85 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.04] focus:border-purple-500/30 transition-all duration-200"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-2">Hair</label>
                        <input
                          type="text"
                          value={formData.hair}
                          onChange={(e) => setFormData(prev => ({ ...prev, hair: e.target.value }))}
                          placeholder="Black, curly"
                          className="w-full py-2.5 px-3 text-[14px] bg-white/[0.02] border border-white/[0.06] rounded-lg text-white/85 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.04] focus:border-purple-500/30 transition-all duration-200"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-2">Eyes</label>
                        <input
                          type="text"
                          value={formData.eyes}
                          onChange={(e) => setFormData(prev => ({ ...prev, eyes: e.target.value }))}
                          placeholder="Green"
                          className="w-full py-2.5 px-3 text-[14px] bg-white/[0.02] border border-white/[0.06] rounded-lg text-white/85 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.04] focus:border-purple-500/30 transition-all duration-200"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-2">Skin</label>
                        <input
                          type="text"
                          value={formData.skin}
                          onChange={(e) => setFormData(prev => ({ ...prev, skin: e.target.value }))}
                          placeholder="Tan, weathered"
                          className="w-full py-2.5 px-3 text-[14px] bg-white/[0.02] border border-white/[0.06] rounded-lg text-white/85 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.04] focus:border-purple-500/30 transition-all duration-200"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-2">Voice</label>
                        <input
                          type="text"
                          value={formData.voice}
                          onChange={(e) => setFormData(prev => ({ ...prev, voice: e.target.value }))}
                          placeholder="Deep, gravelly"
                          className="w-full py-2.5 px-3 text-[14px] bg-white/[0.02] border border-white/[0.06] rounded-lg text-white/85 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.04] focus:border-purple-500/30 transition-all duration-200"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs text-gray-500 mb-2">Typical Attire</label>
                        <input
                          type="text"
                          value={formData.typical_attire}
                          onChange={(e) => setFormData(prev => ({ ...prev, typical_attire: e.target.value }))}
                          placeholder="Worn leather armor, dusty cloak"
                          className="w-full py-2.5 px-3 text-[14px] bg-white/[0.02] border border-white/[0.06] rounded-lg text-white/85 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.04] focus:border-purple-500/30 transition-all duration-200"
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-xs text-gray-500 mb-2">Distinguishing Marks</label>
                      <input
                        type="text"
                        value={formData.distinguishing_marks}
                        onChange={(e) => setFormData(prev => ({ ...prev, distinguishing_marks: e.target.value }))}
                        placeholder="Scar across left cheek, burn marks on hands, tribal tattoo"
                        className="w-full py-2.5 px-3 text-[14px] bg-white/[0.02] border border-white/[0.06] rounded-lg text-white/85 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.04] focus:border-purple-500/30 transition-all duration-200"
                      />
                    </div>
                  </div>

                  {/* Personality */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400/90 mb-3">Personality</label>
                    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden focus-within:border-purple-500/30 focus-within:bg-white/[0.03] transition-all duration-200">
                      <textarea
                        value={formData.personality}
                        onChange={(e) => setFormData(prev => ({ ...prev, personality: e.target.value }))}
                        placeholder="Temperament, quirks, mannerisms, how they interact with others..."
                        className="w-full px-6 py-5 min-h-[160px] text-[15px] bg-transparent text-white/80 placeholder:text-gray-600 focus:outline-none resize-none leading-relaxed"
                      />
                    </div>
                  </div>

                  {/* Goals */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400/90 mb-3">Goals & Motivations</label>
                    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden focus-within:border-purple-500/30 focus-within:bg-white/[0.03] transition-all duration-200">
                      <textarea
                        value={formData.goals}
                        onChange={(e) => setFormData(prev => ({ ...prev, goals: e.target.value }))}
                        placeholder="What drives this character? What do they want to achieve?"
                        className="w-full px-6 py-5 min-h-[160px] text-[15px] bg-transparent text-white/80 placeholder:text-gray-600 focus:outline-none resize-none leading-relaxed"
                      />
                    </div>
                  </div>

                  {/* Ideals, Bonds, Flaws Grid */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400/90 mb-4">Character Values</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-2">Ideals</label>
                        <textarea
                          value={formData.ideals}
                          onChange={(e) => setFormData(prev => ({ ...prev, ideals: e.target.value }))}
                          placeholder="What principles guide this character?"
                          className="w-full py-3 px-4 min-h-[100px] text-[14px] bg-white/[0.02] border border-white/[0.06] rounded-lg text-white/85 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.04] focus:border-purple-500/30 transition-all duration-200 resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-2">Bonds</label>
                        <textarea
                          value={formData.bonds}
                          onChange={(e) => setFormData(prev => ({ ...prev, bonds: e.target.value }))}
                          placeholder="What people, places, or things are they connected to?"
                          className="w-full py-3 px-4 min-h-[100px] text-[14px] bg-white/[0.02] border border-white/[0.06] rounded-lg text-white/85 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.04] focus:border-purple-500/30 transition-all duration-200 resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-2">Flaws</label>
                        <textarea
                          value={formData.flaws}
                          onChange={(e) => setFormData(prev => ({ ...prev, flaws: e.target.value }))}
                          placeholder="What shortcomings or vices do they have?"
                          className="w-full py-3 px-4 min-h-[100px] text-[14px] bg-white/[0.02] border border-white/[0.06] rounded-lg text-white/85 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.04] focus:border-purple-500/30 transition-all duration-200 resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Fears */}
                  <div>
                    <FieldLabel emoji="😨" count={formData.fears.length}>Fears</FieldLabel>
                    <BulletListDisplay
                      items={formData.fears}
                      bulletColor="orange"
                      emptyMessage="No fears listed"
                      placeholder="Add something this character fears..."
                      editable
                      onSave={(items) => setFormData(prev => ({ ...prev, fears: items }))}
                    />
                  </div>

                  {/* Secrets */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-400/90">
                        Secrets
                        <span className="text-xs bg-purple-500/15 text-purple-400 px-2.5 py-1 rounded-md border border-purple-500/20">Private</span>
                      </label>
                      <button
                        onClick={() => setShowSecrets(!showSecrets)}
                        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-purple-400 transition-all duration-200"
                      >
                        {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        {showSecrets ? 'Hide' : 'Reveal'}
                      </button>
                    </div>
                    {showSecrets ? (
                      <div className="bg-white/[0.02] border border-red-500/20 rounded-xl overflow-hidden focus-within:border-red-500/40 transition-all duration-200">
                        <textarea
                          value={formData.secrets}
                          onChange={(e) => setFormData(prev => ({ ...prev, secrets: e.target.value }))}
                          placeholder="Hidden information, true motivations, dark secrets..."
                          className="w-full px-6 py-5 min-h-[160px] text-[15px] bg-transparent text-white/80 placeholder:text-gray-600 focus:outline-none resize-none leading-relaxed"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 bg-white/[0.015] border border-dashed border-white/[0.08] rounded-xl">
                        <p className="text-sm text-gray-500">Click "Reveal" to show secrets</p>
                      </div>
                    )}
                  </div>

                  {/* Common Phrases */}
                  <div>
                    <ArrayFieldEditor
                      label="Common Phrases"
                      items={formData.common_phrases}
                      placeholder="Add a catchphrase or common saying..."
                      onChange={(items) => setFormData(prev => ({ ...prev, common_phrases: items }))}
                    />
                  </div>

                  {/* Campaign Info */}
                  <div className="pt-4">
                    <label className="block text-sm font-medium text-gray-400/90 mb-4">Campaign Information</label>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm text-gray-500 mb-2">Game System</label>
                        <input
                          type="text"
                          value={formData.game_system}
                          onChange={(e) => setFormData(prev => ({ ...prev, game_system: e.target.value }))}
                          placeholder="D&D 5e, Pathfinder 2e..."
                          className="w-full py-3 px-4 text-[15px] bg-white/[0.02] border border-white/[0.06] rounded-xl text-white/85 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.04] focus:border-purple-500/30 transition-all duration-200"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-500 mb-2">Campaign Name</label>
                        <input
                          type="text"
                          value={formData.external_campaign}
                          onChange={(e) => setFormData(prev => ({ ...prev, external_campaign: e.target.value }))}
                          placeholder="The Lost Mines..."
                          className="w-full py-3 px-4 text-[15px] bg-white/[0.02] border border-white/[0.06] rounded-xl text-white/85 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.04] focus:border-purple-500/30 transition-all duration-200"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-500 mb-2">DM Name</label>
                        <input
                          type="text"
                          value={formData.dm_name}
                          onChange={(e) => setFormData(prev => ({ ...prev, dm_name: e.target.value }))}
                          placeholder="Who runs this game?"
                          className="w-full py-3 px-4 text-[15px] bg-white/[0.02] border border-white/[0.06] rounded-xl text-white/85 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.04] focus:border-purple-500/30 transition-all duration-200"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-500 mb-2">Campaign Started</label>
                        <input
                          type="text"
                          value={formData.campaign_started}
                          onChange={(e) => setFormData(prev => ({ ...prev, campaign_started: e.target.value }))}
                          placeholder="January 2024..."
                          className="w-full py-3 px-4 text-[15px] bg-white/[0.02] border border-white/[0.06] rounded-xl text-white/85 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.04] focus:border-purple-500/30 transition-all duration-200"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CollapsibleSection>

              {/* ═══════════════ PEOPLE SECTION ═══════════════ */}
              <CollapsibleSection
                id="people"
                title="People"
                icon={Users}
                count={partyMembers.length + npcs.length + companions.length}
                isExpanded={expandedSections.people}
                onToggle={() => toggleSection('people')}
              >
                <div className="space-y-10">
                  {/* Party Members Section */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-sm font-medium text-gray-400/90">Party Members ({partyMembers.length})</label>
                      <button
                        onClick={() => {
                          // Reset form and set party member flag
                          setNpcForm({
                            related_name: '',
                            nickname: '',
                            relationship_type: 'party_member',
                            relationship_label: '',
                            faction_affiliations: [],
                            location: '',
                            occupation: '',
                            origin: '',
                            needs: '',
                            can_provide: '',
                            goals: '',
                            secrets: '',
                            personality_traits: [],
                            full_notes: '',
                            relationship_status: 'active',
                            related_image_url: null,
                            is_party_member: true,
                          })
                          setAddStoryCharacterModalOpen(true)
                        }}
                        className="flex items-center gap-2 py-2 px-4 text-sm text-indigo-400 bg-indigo-500/10 rounded-lg hover:bg-indigo-500/20 transition-all duration-200 border border-indigo-500/20"
                      >
                        <Plus className="w-4 h-4" />
                        Add Party Member
                      </button>
                    </div>

                    {partyMembers.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 bg-white/[0.015] border border-dashed border-white/[0.08] rounded-xl">
                        <Users className="w-8 h-8 mb-3 text-gray-600" />
                        <p className="text-sm text-gray-500">No party members yet</p>
                        <p className="text-xs text-gray-600 mt-1">Add other PCs you play with in your campaign</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {partyMembers.map((member) => (
                          <NPCCard
                            key={member.id}
                            npc={member}
                            onEdit={() => openEditNPC(member)}
                            onDelete={async () => {
                              if (confirm(`Delete ${member.related_name}?`)) {
                                await supabase.from('vault_character_relationships').delete().eq('id', member.id)
                                setRelationships(prev => prev.filter(r => r.id !== member.id))
                              }
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* NPCs Section */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-sm font-medium text-gray-400/90">NPCs & Contacts ({npcs.length})</label>
                      <button
                        onClick={() => {
                          // Reset form for regular NPC
                          setNpcForm({
                            related_name: '',
                            nickname: '',
                            relationship_type: 'friend',
                            relationship_label: '',
                            faction_affiliations: [],
                            location: '',
                            occupation: '',
                            origin: '',
                            needs: '',
                            can_provide: '',
                            goals: '',
                            secrets: '',
                            personality_traits: [],
                            full_notes: '',
                            relationship_status: 'active',
                            related_image_url: null,
                            is_party_member: false,
                          })
                          setAddStoryCharacterModalOpen(true)
                        }}
                        className="flex items-center gap-2 py-2 px-4 text-sm text-purple-400 bg-purple-500/10 rounded-lg hover:bg-purple-500/20 transition-all duration-200 border border-purple-500/20"
                      >
                        <Plus className="w-4 h-4" />
                        Add NPC
                      </button>
                    </div>

                    {npcs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 bg-white/[0.015] border border-dashed border-white/[0.08] rounded-xl">
                        <Users className="w-10 h-10 mb-4 text-gray-600" />
                        <p className="text-sm text-gray-500">No NPCs yet</p>
                        <p className="text-xs text-gray-600 mt-1">Add mentors, family, contacts, allies, and enemies</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {npcs.map((npc) => (
                          <NPCCard
                            key={npc.id}
                            npc={npc}
                            onEdit={() => openEditNPC(npc)}
                            onDelete={async () => {
                              if (confirm(`Delete ${npc.related_name}?`)) {
                                await supabase.from('vault_character_relationships').delete().eq('id', npc.id)
                                setRelationships(prev => prev.filter(r => r.id !== npc.id))
                              }
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Companions Section */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-sm font-medium text-gray-400/90">Companions ({companions.length})</label>
                      <button
                        onClick={() => setAddCompanionModalOpen(true)}
                        className="flex items-center gap-2 py-2 px-4 text-sm text-purple-400 bg-purple-500/10 rounded-lg hover:bg-purple-500/20 transition-all duration-200 border border-purple-500/20"
                      >
                        <Plus className="w-4 h-4" />
                        Add Companion
                      </button>
                    </div>

                    {companions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 bg-white/[0.015] border border-dashed border-white/[0.08] rounded-xl">
                        <User className="w-8 h-8 mb-3 text-gray-600" />
                        <p className="text-sm text-gray-500">No companions yet</p>
                        <p className="text-xs text-gray-600 mt-1">Add familiars, pets, mounts, or animal companions</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {companions.map((companion) => (
                          <CompanionCard
                            key={companion.id}
                            companion={companion}
                            onEdit={() => openEditCompanion(companion)}
                            onDelete={async () => {
                              if (confirm(`Delete ${companion.related_name}?`)) {
                                await supabase.from('vault_character_relationships').delete().eq('id', companion.id)
                                setRelationships(prev => prev.filter(r => r.id !== companion.id))
                              }
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* What I've Learned */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400/90 mb-4">Learned Facts</label>
                    {learnedFacts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 bg-white/[0.015] border border-dashed border-white/[0.08] rounded-xl">
                        <BookOpen className="w-8 h-8 mb-3 text-gray-600" />
                        <p className="text-sm text-gray-500">No learned facts recorded</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {learnedFacts.map((fact) => (
                          <div key={fact.id} className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                            <h4 className="text-sm font-medium text-white/90 mb-3">{fact.about_name}</h4>
                            <ul className="space-y-2">
                              {fact.facts?.map((f, i) => (
                                <li key={i} className="text-sm text-gray-500 flex items-start gap-2">
                                  <span className="text-purple-400/70 mt-0.5">•</span>
                                  {f}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CollapsibleSection>

              {/* ═══════════════ WRITINGS SECTION ═══════════════ */}
              <CollapsibleSection
                id="writings"
                title="Writings"
                icon={Quote}
                count={formData.character_writings.length}
                isExpanded={expandedSections.writings}
                onToggle={() => toggleSection('writings')}
              >
                <div className="space-y-8">
                  {/* Character Writings (Letters, Stories, Poems) */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-sm font-medium text-gray-400/90">Letters, Stories & Poems</label>
                      <button
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            character_writings: [...prev.character_writings, { title: '', type: 'letter', content: '' }]
                          }))
                        }}
                        className="flex items-center gap-2 py-2 px-4 text-sm text-purple-400 bg-purple-500/10 rounded-lg hover:bg-purple-500/20 transition-all duration-200 border border-purple-500/20"
                      >
                        <Plus className="w-4 h-4" />
                        Add Writing
                      </button>
                    </div>

                    {formData.character_writings.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 bg-white/[0.015] border border-dashed border-white/[0.08] rounded-xl">
                        <Quote className="w-10 h-10 mb-4 text-gray-600" />
                        <p className="text-sm text-gray-500">No character writings yet</p>
                        <p className="text-xs text-gray-600 mt-1">Add letters, campfire stories, poems, or diary entries</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {formData.character_writings.map((writing, index) => (
                          <div key={index} className="p-5 bg-white/[0.02] rounded-xl border border-white/[0.04] hover:border-purple-500/20 transition-all duration-200">
                            <div className="flex items-start gap-4 mb-4">
                              <div className="flex-1 grid grid-cols-2 gap-4">
                                <input
                                  type="text"
                                  value={writing.title}
                                  onChange={(e) => {
                                    const newWritings = [...formData.character_writings]
                                    newWritings[index] = { ...writing, title: e.target.value }
                                    setFormData(prev => ({ ...prev, character_writings: newWritings }))
                                  }}
                                  placeholder="Title..."
                                  className="py-2.5 px-3.5 text-[14px] bg-white/[0.03] border border-white/[0.06] rounded-lg text-white/85 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.05] focus:border-purple-500/30 transition-all duration-200"
                                />
                                <select
                                  value={writing.type}
                                  onChange={(e) => {
                                    const newWritings = [...formData.character_writings]
                                    newWritings[index] = { ...writing, type: e.target.value }
                                    setFormData(prev => ({ ...prev, character_writings: newWritings }))
                                  }}
                                  className="py-2.5 px-3.5 text-[14px] bg-white/[0.03] border border-white/[0.06] rounded-lg text-white/85 focus:outline-none focus:bg-white/[0.05] focus:border-purple-500/30 transition-all duration-200"
                                >
                                  <option value="letter">Letter</option>
                                  <option value="story">Story</option>
                                  <option value="poem">Poem</option>
                                  <option value="diary">Diary</option>
                                  <option value="journal">Journal</option>
                                  <option value="speech">Speech</option>
                                  <option value="song">Song</option>
                                  <option value="note">Note</option>
                                  <option value="campfire_story">Campfire Story</option>
                                  <option value="meeting_story">Meeting Story</option>
                                  <option value="recap">Recap</option>
                                  <option value="conversation">Conversation</option>
                                  <option value="other">Other</option>
                                </select>
                              </div>
                              <button
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    character_writings: prev.character_writings.filter((_, i) => i !== index)
                                  }))
                                }}
                                className="p-2 text-gray-600 hover:text-red-400/80 transition-all duration-200"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="flex gap-3 mb-3">
                              {writing.type === 'letter' && (
                                <input
                                  type="text"
                                  value={writing.recipient || ''}
                                  onChange={(e) => {
                                    const newWritings = [...formData.character_writings]
                                    newWritings[index] = { ...writing, recipient: e.target.value }
                                    setFormData(prev => ({ ...prev, character_writings: newWritings }))
                                  }}
                                  placeholder="Recipient..."
                                  className="flex-1 py-2.5 px-3.5 text-[14px] bg-white/[0.03] border border-white/[0.06] rounded-lg text-white/85 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.05] focus:border-purple-500/30 transition-all duration-200"
                                />
                              )}
                              <input
                                type="text"
                                value={writing.in_universe_date || ''}
                                onChange={(e) => {
                                  const newWritings = [...formData.character_writings]
                                  newWritings[index] = { ...writing, in_universe_date: e.target.value }
                                  setFormData(prev => ({ ...prev, character_writings: newWritings }))
                                }}
                                placeholder="In-universe date (e.g. '15th of Hammer')"
                                className={cn(
                                  "py-2.5 px-3.5 text-[14px] bg-white/[0.03] border border-white/[0.06] rounded-lg text-white/85 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.05] focus:border-purple-500/30 transition-all duration-200",
                                  writing.type === 'letter' ? 'w-48' : 'flex-1'
                                )}
                              />
                            </div>
                            <textarea
                              value={writing.content}
                              onChange={(e) => {
                                const newWritings = [...formData.character_writings]
                                newWritings[index] = { ...writing, content: e.target.value }
                                setFormData(prev => ({ ...prev, character_writings: newWritings }))
                              }}
                              placeholder="Content..."
                              className="w-full min-h-[150px] py-3 px-4 text-[14px] bg-white/[0.02] border border-white/[0.06] rounded-lg text-white/80 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.04] focus:border-purple-500/30 transition-all duration-200 resize-none leading-relaxed"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Rumors */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-sm font-medium text-gray-400/90">Rumors</label>
                      <button
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            rumors: [...prev.rumors, { statement: '', is_true: false }]
                          }))
                        }}
                        className="flex items-center gap-2 py-2 px-4 text-sm text-purple-400 bg-purple-500/10 rounded-lg hover:bg-purple-500/20 transition-all duration-200 border border-purple-500/20"
                      >
                        <Plus className="w-4 h-4" />
                        Add Rumor
                      </button>
                    </div>

                    {formData.rumors.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 bg-white/[0.015] border border-dashed border-white/[0.08] rounded-xl">
                        <p className="text-sm text-gray-500">No rumors yet</p>
                        <p className="text-xs text-gray-600 mt-1">Add things people say about this character (true or false)</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {formData.rumors.map((rumor, index) => (
                          <div key={index} className="flex items-center gap-4 p-4 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                            <button
                              onClick={() => {
                                const newRumors = [...formData.rumors]
                                newRumors[index] = { ...rumor, is_true: !rumor.is_true }
                                setFormData(prev => ({ ...prev, rumors: newRumors }))
                              }}
                              className={cn(
                                "flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-md border transition-all duration-200",
                                rumor.is_true
                                  ? "bg-green-500/15 text-green-400 border-green-500/20"
                                  : "bg-red-500/15 text-red-400 border-red-500/20"
                              )}
                            >
                              {rumor.is_true ? 'TRUE' : 'FALSE'}
                            </button>
                            <input
                              type="text"
                              value={rumor.statement}
                              onChange={(e) => {
                                const newRumors = [...formData.rumors]
                                newRumors[index] = { ...rumor, statement: e.target.value }
                                setFormData(prev => ({ ...prev, rumors: newRumors }))
                              }}
                              placeholder="What do people say about this character?"
                              className="flex-1 py-2.5 px-3.5 text-[14px] bg-transparent border-0 text-white/85 placeholder:text-gray-600 focus:outline-none"
                            />
                            <button
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  rumors: prev.rumors.filter((_, i) => i !== index)
                                }))
                              }}
                              className="p-1.5 text-gray-600 hover:text-red-400/80 transition-all duration-200"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* DM Q&A */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-sm font-medium text-gray-400/90">DM Q&A</label>
                      <button
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            dm_qa: [...prev.dm_qa, { question: '', answer: '' }]
                          }))
                        }}
                        className="flex items-center gap-2 py-2 px-4 text-sm text-purple-400 bg-purple-500/10 rounded-lg hover:bg-purple-500/20 transition-all duration-200 border border-purple-500/20"
                      >
                        <Plus className="w-4 h-4" />
                        Add Q&A
                      </button>
                    </div>

                    {formData.dm_qa.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 bg-white/[0.015] border border-dashed border-white/[0.08] rounded-xl">
                        <p className="text-sm text-gray-500">No DM Q&A yet</p>
                        <p className="text-xs text-gray-600 mt-1">Questions and answers from DM questionnaires</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {formData.dm_qa.map((qa, index) => (
                          <div key={index} className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                            <div className="flex items-start gap-3 mb-3">
                              <span className="text-purple-400 font-medium text-sm mt-2.5">Q:</span>
                              <input
                                type="text"
                                value={qa.question}
                                onChange={(e) => {
                                  const newQA = [...formData.dm_qa]
                                  newQA[index] = { ...qa, question: e.target.value }
                                  setFormData(prev => ({ ...prev, dm_qa: newQA }))
                                }}
                                placeholder="Question from DM..."
                                className="flex-1 py-2.5 px-3.5 text-[14px] bg-white/[0.03] border border-white/[0.06] rounded-lg text-white/85 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.05] focus:border-purple-500/30 transition-all duration-200"
                              />
                              <button
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    dm_qa: prev.dm_qa.filter((_, i) => i !== index)
                                  }))
                                }}
                                className="p-1.5 text-gray-600 hover:text-red-400/80 transition-all duration-200"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="flex items-start gap-3">
                              <span className="text-green-400 font-medium text-sm mt-3">A:</span>
                              <textarea
                                value={qa.answer}
                                onChange={(e) => {
                                  const newQA = [...formData.dm_qa]
                                  newQA[index] = { ...qa, answer: e.target.value }
                                  setFormData(prev => ({ ...prev, dm_qa: newQA }))
                                }}
                                placeholder="Your answer..."
                                className="flex-1 min-h-[80px] py-3 px-4 text-[14px] bg-white/[0.02] border border-white/[0.06] rounded-lg text-white/80 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.04] focus:border-purple-500/30 transition-all duration-200 resize-none leading-relaxed"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Open Questions */}
                  <div>
                    <ArrayFieldEditor
                      label="Open Questions"
                      items={formData.open_questions}
                      placeholder="Add an unanswered question from backstory..."
                      onChange={(items) => setFormData(prev => ({ ...prev, open_questions: items }))}
                      bulletChar="?"
                    />
                  </div>

                  {/* Secondary Characters */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-sm font-medium text-gray-400/90">Secondary Character Ideas</label>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            secondary_characters: [...prev.secondary_characters, { name: '', concept: '', notes: '' }]
                          }))
                        }}
                        className="flex items-center gap-2 py-2 px-4 text-sm text-purple-400 bg-purple-500/10 rounded-lg hover:bg-purple-500/20 transition-all duration-200 border border-purple-500/20"
                      >
                        <Plus className="w-4 h-4" />
                        Add Character Idea
                      </button>
                    </div>

                    {formData.secondary_characters.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 bg-white/[0.015] border border-dashed border-white/[0.08] rounded-xl">
                        <Users className="w-8 h-8 mb-3 text-gray-600" />
                        <p className="text-sm text-gray-500">No secondary character ideas yet</p>
                        <p className="text-xs text-gray-600 mt-1">Store backup or alternate character concepts</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {formData.secondary_characters.map((char: { name: string; concept: string; notes?: string }, index: number) => (
                          <div key={index} className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.04] hover:border-purple-500/20 transition-all">
                            <div className="flex items-start gap-3">
                              <div className="flex-1 grid grid-cols-2 gap-3">
                                <input
                                  type="text"
                                  value={char.name}
                                  onChange={(e) => {
                                    const newChars = [...formData.secondary_characters]
                                    newChars[index] = { ...char, name: e.target.value }
                                    setFormData(prev => ({ ...prev, secondary_characters: newChars }))
                                  }}
                                  placeholder="Character name..."
                                  className="py-2 px-3 text-sm bg-white/[0.03] border border-white/[0.06] rounded-lg text-white/85 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.05] focus:border-purple-500/30"
                                />
                                <input
                                  type="text"
                                  value={char.concept}
                                  onChange={(e) => {
                                    const newChars = [...formData.secondary_characters]
                                    newChars[index] = { ...char, concept: e.target.value }
                                    setFormData(prev => ({ ...prev, secondary_characters: newChars }))
                                  }}
                                  placeholder="Concept (e.g. 'Tiefling warlock')"
                                  className="py-2 px-3 text-sm bg-white/[0.03] border border-white/[0.06] rounded-lg text-white/85 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.05] focus:border-purple-500/30"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    secondary_characters: prev.secondary_characters.filter((_: { name: string; concept: string; notes?: string }, i: number) => i !== index)
                                  }))
                                }}
                                className="p-2 text-gray-600 hover:text-red-400/80 transition-all"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <textarea
                              value={char.notes || ''}
                              onChange={(e) => {
                                const newChars = [...formData.secondary_characters]
                                newChars[index] = { ...char, notes: e.target.value }
                                setFormData(prev => ({ ...prev, secondary_characters: newChars }))
                              }}
                              placeholder="Notes about this character idea..."
                              className="w-full mt-3 py-2 px-3 text-sm bg-white/[0.02] border border-white/[0.06] rounded-lg text-white/80 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.04] focus:border-purple-500/30 resize-none min-h-[60px]"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CollapsibleSection>

              {/* ═══════════════ GALLERY SECTION ═══════════════ */}
              <CollapsibleSection id="gallery" title="Gallery" icon={GalleryIcon} count={galleryImages.length} isExpanded={expandedSections.gallery} onToggle={() => toggleSection('gallery')}>
                {galleryImages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 bg-white/[0.015] border border-dashed border-white/[0.08] rounded-xl">
                    <GalleryIcon className="w-10 h-10 mb-4 text-gray-600" />
                    <p className="text-sm text-gray-500 mb-2">No images yet</p>
                    <p className="text-xs text-gray-600 mb-4">Add portraits, art, and reference images</p>
                    <button
                      onClick={() => setGalleryImageModalOpen(true)}
                      className="flex items-center gap-2 py-2 px-4 text-sm text-purple-400 bg-purple-500/10 rounded-lg hover:bg-purple-500/20 transition-all duration-200 border border-purple-500/20"
                    >
                      <Plus className="w-4 h-4" />
                      Add Image
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Mini gallery grid - show first 6 images */}
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                      {galleryImages.slice(0, 6).map((image) => (
                        <div
                          key={image.id}
                          className="relative group aspect-square rounded-lg overflow-hidden bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-colors"
                        >
                          <Image
                            src={image.image_url}
                            alt={image.caption || 'Gallery image'}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 16vw"
                          />
                          {image.is_primary && (
                            <div className="absolute top-1 right-1 p-1 bg-yellow-500/80 rounded-md">
                              <Sparkles className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2">
                      <button
                        onClick={() => router.push(`/vault/${characterId}/gallery`)}
                        className="text-sm text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
                      >
                        View All ({galleryImages.length})
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setGalleryImageModalOpen(true)}
                        className="flex items-center gap-2 py-2 px-4 text-sm text-purple-400 bg-purple-500/10 rounded-lg hover:bg-purple-500/20 transition-all duration-200 border border-purple-500/20"
                      >
                        <Plus className="w-4 h-4" />
                        Add Image
                      </button>
                    </div>
                  </div>
                )}
              </CollapsibleSection>

              </div>

              {/* Bottom padding */}
              <div className="h-24" />

            </div>
          </main>
        </div>
      </div>
      </div>

      {/* Lightbox */}
      <Lightbox />

      {/* Crop Modal */}
      {pendingImageSrc && (
        <VaultImageCropModal
          isOpen={cropModalOpen}
          imageSrc={pendingImageSrc}
          onClose={handleCropClose}
          onSave={handleCropSave}
        />
      )}

      {/* Delete Confirmation */}
      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        title="Delete Character"
        description="This will move the character to your recycle bin. You can restore it within 30 days."
        size="sm"
      >
        <div className="flex justify-end gap-3 pt-4">
          <button className="btn btn-secondary" onClick={() => setIsDeleteConfirmOpen(false)}>Cancel</button>
          <button className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors" onClick={handleDelete}>Delete</button>
        </div>
      </Modal>

      {/* Duplicate Confirmation */}
      <Modal
        isOpen={duplicateModalOpen}
        onClose={() => setDuplicateModalOpen(false)}
        title="Duplicate Character"
        description="Create a copy of this character with all its data?"
      >
        <div className="flex justify-end gap-3 pt-4">
          <button className="btn btn-secondary" onClick={() => setDuplicateModalOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleDuplicate}>Duplicate</button>
        </div>
      </Modal>

      {/* Unified Share Modal */}
      {characterId && (
        <UnifiedShareModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          contentType="character"
          contentId={characterId}
          contentName={formData.name || 'Untitled Character'}
          contentMode={character?.content_mode || 'active'}
          onTemplateCreated={handlePublished}
        />
      )}

      {/* Template Onboarding Modal */}
      <TemplateOnboardingModal
        isOpen={showTemplateOnboarding}
        onClose={() => setShowTemplateOnboarding(false)}
        onOpenShareModal={() => setShareModalOpen(true)}
        contentName={formData.name || 'Untitled Character'}
      />

      {/* Add Link Modal */}
      <Modal
        isOpen={addLinkModalOpen}
        onClose={() => setAddLinkModalOpen(false)}
        title="Add Link"
        description="Add a reference link to this character"
      >
        <div className="space-y-4 py-4">
          <div>
            <FormLabel>Link Type</FormLabel>
            <select
              value={linkForm.type}
              onChange={(e) => setLinkForm(prev => ({ ...prev, type: e.target.value }))}
              className={inputStyles}
            >
              <option value="theme_music">Theme Music</option>
              <option value="character_sheet">Character Sheet</option>
              <option value="art_reference">Art Reference</option>
              <option value="inspiration">Inspiration</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <FormLabel>Title</FormLabel>
            <input
              type="text"
              placeholder="Link title"
              value={linkForm.title}
              onChange={(e) => setLinkForm(prev => ({ ...prev, title: e.target.value }))}
              className={inputStyles}
            />
          </div>
          <div>
            <FormLabel>URL</FormLabel>
            <input
              type="url"
              placeholder="https://..."
              value={linkForm.url}
              onChange={(e) => setLinkForm(prev => ({ ...prev, url: e.target.value }))}
              className={inputStyles}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button className="btn btn-secondary" onClick={() => setAddLinkModalOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddLink}>Add Link</button>
        </div>
      </Modal>

      {/* Add Story Character Modal - Fullscreen with all fields */}
      <Modal
        isOpen={addStoryCharacterModalOpen}
        onClose={() => setAddStoryCharacterModalOpen(false)}
        title={npcForm.is_party_member ? "Add Party Member" : "Add NPC"}
        description={npcForm.is_party_member ? "Add a fellow player character you adventure with" : "Add an NPC related to this character"}
        size="fullscreen"
      >
        <div className="flex flex-col h-full max-h-[calc(100vh-180px)]">
          <div className="flex-1 overflow-y-auto py-6 px-2">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Avatar & Identity */}
              <div className="space-y-6">
                {/* Avatar Section */}
                <div className="bg-white/[0.02] rounded-xl p-5 border border-white/[0.06]">
                  <h3 className="text-sm font-semibold text-white/80 mb-4 flex items-center gap-2">
                    <User className="w-4 h-4 text-purple-400" />
                    Portrait
                  </h3>
                  <button
                    type="button"
                    onClick={() => setNpcImageModalOpen(true)}
                    className="relative w-full aspect-square max-w-[200px] mx-auto rounded-xl overflow-hidden border-2 border-dashed border-white/[0.08] hover:border-purple-500/40 transition-all group bg-white/[0.02]"
                  >
                    {npcForm.related_image_url ? (
                      <>
                        <Image
                          src={npcForm.related_image_url}
                          alt={npcForm.related_name || 'NPC'}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Camera className="w-8 h-8 text-white" />
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 group-hover:text-purple-400 transition-colors">
                        <User className="w-12 h-12 mb-2" />
                        <span className="text-sm">Add Portrait</span>
                      </div>
                    )}
                  </button>
                </div>

                {/* Identity Section */}
                <div className="bg-white/[0.02] rounded-xl p-5 border border-white/[0.06]">
                  <h3 className="text-sm font-semibold text-white/80 mb-4">Identity</h3>
                  <div className="space-y-4">
                    <div>
                      <FormLabel>Name *</FormLabel>
                      <input
                        type="text"
                        placeholder="Character name"
                        value={npcForm.related_name}
                        onChange={(e) => setNpcForm(prev => ({ ...prev, related_name: e.target.value }))}
                        className={inputStyles}
                      />
                    </div>
                    <div>
                      <FormLabel>Nickname / Alias</FormLabel>
                      <input
                        type="text"
                        placeholder="'Big Al', 'The Shadow'"
                        value={npcForm.nickname}
                        onChange={(e) => setNpcForm(prev => ({ ...prev, nickname: e.target.value }))}
                        className={inputStyles}
                      />
                    </div>
                  </div>
                </div>

                {/* Relationship Section */}
                <div className="bg-white/[0.02] rounded-xl p-5 border border-white/[0.06]">
                  <h3 className="text-sm font-semibold text-white/80 mb-4">Relationship</h3>
                  <div className="space-y-4">
                    <div>
                      <FormLabel>Type</FormLabel>
                      <select
                        value={npcForm.relationship_type}
                        onChange={(e) => setNpcForm(prev => ({ ...prev, relationship_type: e.target.value }))}
                        className={inputStyles}
                      >
                        <option value="family">Family</option>
                        <option value="mentor">Mentor</option>
                        <option value="friend">Friend</option>
                        <option value="enemy">Enemy</option>
                        <option value="patron">Patron</option>
                        <option value="contact">Contact</option>
                        <option value="ally">Ally</option>
                        <option value="employer">Employer</option>
                        <option value="love_interest">Love Interest</option>
                        <option value="rival">Rival</option>
                        <option value="acquaintance">Acquaintance</option>
                        <option value="party_member">Party Member</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <FormLabel>Label</FormLabel>
                      <input
                        type="text"
                        placeholder="e.g. 'Father', 'Old Friend'"
                        value={npcForm.relationship_label}
                        onChange={(e) => setNpcForm(prev => ({ ...prev, relationship_label: e.target.value }))}
                        className={inputStyles}
                      />
                    </div>
                    <div>
                      <FormLabel>Status</FormLabel>
                      <select
                        value={npcForm.relationship_status}
                        onChange={(e) => setNpcForm(prev => ({ ...prev, relationship_status: e.target.value }))}
                        className={inputStyles}
                      >
                        <option value="active">Active</option>
                        <option value="deceased">Deceased</option>
                        <option value="estranged">Estranged</option>
                        <option value="missing">Missing</option>
                        <option value="complicated">Complicated</option>
                        <option value="unknown">Unknown</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Middle Column - Details with Emoji Fields */}
              <div className="space-y-6">
                <div className="bg-white/[0.02] rounded-xl p-5 border border-white/[0.06]">
                  <h3 className="text-sm font-semibold text-white/80 mb-4">Details</h3>
                  <div className="space-y-4">
                    <div>
                      <FormLabel>💼 Occupation</FormLabel>
                      <input
                        type="text"
                        placeholder="Job, role, or profession"
                        value={npcForm.occupation}
                        onChange={(e) => setNpcForm(prev => ({ ...prev, occupation: e.target.value }))}
                        className={inputStyles}
                      />
                    </div>
                    <div>
                      <FormLabel>📍 Location</FormLabel>
                      <input
                        type="text"
                        placeholder="Where they can be found"
                        value={npcForm.location}
                        onChange={(e) => setNpcForm(prev => ({ ...prev, location: e.target.value }))}
                        className={inputStyles}
                      />
                    </div>
                    <div>
                      <FormLabel>Origin</FormLabel>
                      <input
                        type="text"
                        placeholder="Where they're from"
                        value={npcForm.origin}
                        onChange={(e) => setNpcForm(prev => ({ ...prev, origin: e.target.value }))}
                        className={inputStyles}
                      />
                    </div>
                    <div>
                      <FormLabel>🏛️ Faction Affiliations</FormLabel>
                      <input
                        type="text"
                        placeholder="Guilds, organizations (comma-separated)"
                        value={npcForm.faction_affiliations?.join(', ') || ''}
                        onChange={(e) => setNpcForm(prev => ({
                          ...prev,
                          faction_affiliations: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                        }))}
                        className={inputStyles}
                      />
                    </div>
                    <div>
                      <FormLabel>Personality Traits</FormLabel>
                      <input
                        type="text"
                        placeholder="Brave, cunning, loyal (comma-separated)"
                        value={npcForm.personality_traits?.join(', ') || ''}
                        onChange={(e) => setNpcForm(prev => ({
                          ...prev,
                          personality_traits: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                        }))}
                        className={inputStyles}
                      />
                    </div>
                  </div>
                </div>

                {/* Motivations Section */}
                <div className="bg-white/[0.02] rounded-xl p-5 border border-white/[0.06]">
                  <h3 className="text-sm font-semibold text-white/80 mb-4">Motivations</h3>
                  <div className="space-y-4">
                    <div>
                      <FormLabel>🎯 Needs (from PC)</FormLabel>
                      <textarea
                        placeholder="What they need from the character"
                        value={npcForm.needs}
                        onChange={(e) => setNpcForm(prev => ({ ...prev, needs: e.target.value }))}
                        className={cn(inputStyles, "min-h-[80px] resize-none")}
                      />
                    </div>
                    <div>
                      <FormLabel>🎁 Can Provide</FormLabel>
                      <textarea
                        placeholder="What help or resources they can offer"
                        value={npcForm.can_provide}
                        onChange={(e) => setNpcForm(prev => ({ ...prev, can_provide: e.target.value }))}
                        className={cn(inputStyles, "min-h-[80px] resize-none")}
                      />
                    </div>
                    <div>
                      <FormLabel>⭐ Goals</FormLabel>
                      <textarea
                        placeholder="Their personal goals and ambitions"
                        value={npcForm.goals}
                        onChange={(e) => setNpcForm(prev => ({ ...prev, goals: e.target.value }))}
                        className={cn(inputStyles, "min-h-[80px] resize-none")}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Secrets & Notes */}
              <div className="space-y-6">
                <div className="bg-amber-500/5 rounded-xl p-5 border border-amber-500/20">
                  <h3 className="text-sm font-semibold text-amber-400 mb-4 flex items-center gap-2">
                    🔒 Secrets
                  </h3>
                  <textarea
                    placeholder="Hidden information, things the PC doesn't know yet..."
                    value={npcForm.secrets}
                    onChange={(e) => setNpcForm(prev => ({ ...prev, secrets: e.target.value }))}
                    className={cn(inputStyles, "min-h-[120px] resize-none bg-amber-500/5 border-amber-500/20 focus:border-amber-500/40")}
                  />
                </div>

                <div className="bg-white/[0.02] rounded-xl p-5 border border-white/[0.06]">
                  <h3 className="text-sm font-semibold text-white/80 mb-4">Full Notes</h3>
                  <textarea
                    placeholder="All additional details - backstory, quirks, important events, anything else..."
                    value={npcForm.full_notes}
                    onChange={(e) => setNpcForm(prev => ({ ...prev, full_notes: e.target.value }))}
                    className={cn(textareaStyles, "min-h-[300px]")}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 border-t border-white/[0.06] px-6 py-4 bg-[--bg-surface] flex justify-end gap-3">
            <button className="btn btn-secondary" onClick={() => setAddStoryCharacterModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAddStoryCharacter}>Add Character</button>
          </div>
        </div>
      </Modal>

      {/* Edit NPC Modal - Fullscreen with all fields */}
      <Modal
        isOpen={editNPCModalOpen}
        onClose={() => { setEditNPCModalOpen(false); setEditingNPC(null); }}
        title="Edit NPC"
        description="Update NPC details and information"
        size="fullscreen"
      >
        <div className="flex flex-col h-full max-h-[calc(100vh-180px)]">
          <div className="flex-1 overflow-y-auto py-6 px-2">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Avatar & Identity */}
              <div className="space-y-6">
                {/* Avatar Section */}
                <div className="bg-white/[0.02] rounded-xl p-5 border border-white/[0.06]">
                  <h3 className="text-sm font-semibold text-white/80 mb-4 flex items-center gap-2">
                    <User className="w-4 h-4 text-purple-400" />
                    Portrait
                  </h3>
                  <button
                    type="button"
                    onClick={() => setNpcImageModalOpen(true)}
                    className="relative w-full aspect-square max-w-[200px] mx-auto rounded-xl overflow-hidden border-2 border-dashed border-white/[0.08] hover:border-purple-500/40 transition-all group bg-white/[0.02]"
                  >
                    {npcForm.related_image_url ? (
                      <>
                        <Image
                          src={npcForm.related_image_url}
                          alt={npcForm.related_name || 'NPC'}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Camera className="w-8 h-8 text-white" />
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 group-hover:text-purple-400 transition-colors">
                        <User className="w-12 h-12 mb-2" />
                        <span className="text-sm">Add Portrait</span>
                      </div>
                    )}
                  </button>
                </div>

                {/* Identity Section */}
                <div className="bg-white/[0.02] rounded-xl p-5 border border-white/[0.06]">
                  <h3 className="text-sm font-semibold text-white/80 mb-4">Identity</h3>
                  <div className="space-y-4">
                    <div>
                      <FormLabel>Name *</FormLabel>
                      <input
                        type="text"
                        placeholder="NPC name"
                        value={npcForm.related_name}
                        onChange={(e) => setNpcForm(prev => ({ ...prev, related_name: e.target.value }))}
                        className={inputStyles}
                      />
                    </div>
                    <div>
                      <FormLabel>Nickname / Alias</FormLabel>
                      <input
                        type="text"
                        placeholder="'Big Al', 'The Shadow'"
                        value={npcForm.nickname}
                        onChange={(e) => setNpcForm(prev => ({ ...prev, nickname: e.target.value }))}
                        className={inputStyles}
                      />
                    </div>
                  </div>
                </div>

                {/* Relationship Section */}
                <div className="bg-white/[0.02] rounded-xl p-5 border border-white/[0.06]">
                  <h3 className="text-sm font-semibold text-white/80 mb-4">Relationship</h3>
                  <div className="space-y-4">
                    <div>
                      <FormLabel>Type</FormLabel>
                      <select
                        value={npcForm.relationship_type}
                        onChange={(e) => setNpcForm(prev => ({ ...prev, relationship_type: e.target.value }))}
                        className={inputStyles}
                      >
                        <option value="family">Family</option>
                        <option value="mentor">Mentor</option>
                        <option value="friend">Friend</option>
                        <option value="enemy">Enemy</option>
                        <option value="patron">Patron</option>
                        <option value="contact">Contact</option>
                        <option value="ally">Ally</option>
                        <option value="employer">Employer</option>
                        <option value="love_interest">Love Interest</option>
                        <option value="rival">Rival</option>
                        <option value="acquaintance">Acquaintance</option>
                        <option value="party_member">Party Member</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <FormLabel>Label</FormLabel>
                      <input
                        type="text"
                        placeholder="e.g. 'Father', 'Old Friend'"
                        value={npcForm.relationship_label}
                        onChange={(e) => setNpcForm(prev => ({ ...prev, relationship_label: e.target.value }))}
                        className={inputStyles}
                      />
                    </div>
                    <div>
                      <FormLabel>Status</FormLabel>
                      <select
                        value={npcForm.relationship_status}
                        onChange={(e) => setNpcForm(prev => ({ ...prev, relationship_status: e.target.value }))}
                        className={inputStyles}
                      >
                        <option value="active">Active</option>
                        <option value="deceased">Deceased</option>
                        <option value="estranged">Estranged</option>
                        <option value="missing">Missing</option>
                        <option value="complicated">Complicated</option>
                        <option value="unknown">Unknown</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Middle Column - Details with Emoji Fields */}
              <div className="space-y-6">
                <div className="bg-white/[0.02] rounded-xl p-5 border border-white/[0.06]">
                  <h3 className="text-sm font-semibold text-white/80 mb-4">Details</h3>
                  <div className="space-y-4">
                    <div>
                      <FormLabel>💼 Occupation</FormLabel>
                      <input
                        type="text"
                        placeholder="Job, role, or profession"
                        value={npcForm.occupation}
                        onChange={(e) => setNpcForm(prev => ({ ...prev, occupation: e.target.value }))}
                        className={inputStyles}
                      />
                    </div>
                    <div>
                      <FormLabel>📍 Location</FormLabel>
                      <input
                        type="text"
                        placeholder="Where they can be found"
                        value={npcForm.location}
                        onChange={(e) => setNpcForm(prev => ({ ...prev, location: e.target.value }))}
                        className={inputStyles}
                      />
                    </div>
                    <div>
                      <FormLabel>Origin</FormLabel>
                      <input
                        type="text"
                        placeholder="Where they're from"
                        value={npcForm.origin}
                        onChange={(e) => setNpcForm(prev => ({ ...prev, origin: e.target.value }))}
                        className={inputStyles}
                      />
                    </div>
                    <div>
                      <FormLabel>🏛️ Faction Affiliations</FormLabel>
                      <input
                        type="text"
                        placeholder="Guilds, organizations (comma-separated)"
                        value={npcForm.faction_affiliations?.join(', ') || ''}
                        onChange={(e) => setNpcForm(prev => ({
                          ...prev,
                          faction_affiliations: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                        }))}
                        className={inputStyles}
                      />
                    </div>
                    <div>
                      <FormLabel>Personality Traits</FormLabel>
                      <input
                        type="text"
                        placeholder="Brave, cunning, loyal (comma-separated)"
                        value={npcForm.personality_traits?.join(', ') || ''}
                        onChange={(e) => setNpcForm(prev => ({
                          ...prev,
                          personality_traits: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                        }))}
                        className={inputStyles}
                      />
                    </div>
                  </div>
                </div>

                {/* Motivations Section */}
                <div className="bg-white/[0.02] rounded-xl p-5 border border-white/[0.06]">
                  <h3 className="text-sm font-semibold text-white/80 mb-4">Motivations</h3>
                  <div className="space-y-4">
                    <div>
                      <FormLabel>🎯 Needs (from PC)</FormLabel>
                      <textarea
                        placeholder="What they need from the character"
                        value={npcForm.needs}
                        onChange={(e) => setNpcForm(prev => ({ ...prev, needs: e.target.value }))}
                        className={cn(inputStyles, "min-h-[80px] resize-none")}
                      />
                    </div>
                    <div>
                      <FormLabel>🎁 Can Provide</FormLabel>
                      <textarea
                        placeholder="What help or resources they can offer"
                        value={npcForm.can_provide}
                        onChange={(e) => setNpcForm(prev => ({ ...prev, can_provide: e.target.value }))}
                        className={cn(inputStyles, "min-h-[80px] resize-none")}
                      />
                    </div>
                    <div>
                      <FormLabel>⭐ Goals</FormLabel>
                      <textarea
                        placeholder="Their personal goals and ambitions"
                        value={npcForm.goals}
                        onChange={(e) => setNpcForm(prev => ({ ...prev, goals: e.target.value }))}
                        className={cn(inputStyles, "min-h-[80px] resize-none")}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Secrets & Notes */}
              <div className="space-y-6">
                <div className="bg-amber-500/5 rounded-xl p-5 border border-amber-500/20">
                  <h3 className="text-sm font-semibold text-amber-400 mb-4 flex items-center gap-2">
                    🔒 Secrets
                  </h3>
                  <textarea
                    placeholder="Hidden information, things the PC doesn't know yet..."
                    value={npcForm.secrets}
                    onChange={(e) => setNpcForm(prev => ({ ...prev, secrets: e.target.value }))}
                    className={cn(inputStyles, "min-h-[120px] resize-none bg-amber-500/5 border-amber-500/20 focus:border-amber-500/40")}
                  />
                </div>

                <div className="bg-white/[0.02] rounded-xl p-5 border border-white/[0.06]">
                  <h3 className="text-sm font-semibold text-white/80 mb-4">Full Notes</h3>
                  <textarea
                    placeholder="All additional details about this NPC - backstory, quirks, important events, anything else..."
                    value={npcForm.full_notes}
                    onChange={(e) => setNpcForm(prev => ({ ...prev, full_notes: e.target.value }))}
                    className={cn(textareaStyles, "min-h-[300px]")}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 border-t border-white/[0.06] px-6 py-4 bg-[--bg-surface] flex justify-end gap-3">
            <button className="btn btn-secondary" onClick={() => { setEditNPCModalOpen(false); setEditingNPC(null); }}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSaveNPC}>Save Changes</button>
          </div>
        </div>
      </Modal>

      {/* Add Companion Modal - Fullscreen */}
      <Modal
        isOpen={addCompanionModalOpen}
        onClose={() => setAddCompanionModalOpen(false)}
        title="Add Companion"
        description="Add a familiar, pet, mount, or other companion"
        size="fullscreen"
      >
        <div className="flex flex-col h-full max-h-[calc(100vh-180px)]">
          <div className="flex-1 overflow-y-auto py-6 px-2">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Left Column - Portrait & Basic Info */}
              <div className="space-y-6">
                {/* Portrait Section */}
                <div className="bg-white/[0.02] rounded-xl p-5 border border-white/[0.06]">
                  <h3 className="text-sm font-semibold text-white/80 mb-4 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-pink-400" />
                    Portrait
                  </h3>
                  <button
                    type="button"
                    onClick={() => setCompanionImageModalOpen(true)}
                    className="relative w-full aspect-square max-w-[200px] mx-auto rounded-xl overflow-hidden border-2 border-dashed border-white/[0.08] hover:border-pink-500/40 transition-all group bg-white/[0.02]"
                  >
                    {companionForm.related_image_url ? (
                      <>
                        <Image
                          src={companionForm.related_image_url}
                          alt={companionForm.related_name || 'Companion'}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Camera className="w-8 h-8 text-white" />
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 group-hover:text-pink-400 transition-colors">
                        <Heart className="w-12 h-12 mb-2" />
                        <span className="text-sm">Add Portrait</span>
                      </div>
                    )}
                  </button>
                </div>

                {/* Identity Section */}
                <div className="bg-white/[0.02] rounded-xl p-5 border border-white/[0.06]">
                  <h3 className="text-sm font-semibold text-white/80 mb-4">Identity</h3>
                  <div className="space-y-4">
                    <div>
                      <FormLabel>Name *</FormLabel>
                      <input
                        type="text"
                        placeholder="Companion name"
                        value={companionForm.related_name}
                        onChange={(e) => setCompanionForm(prev => ({ ...prev, related_name: e.target.value }))}
                        className={inputStyles}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <FormLabel>Type</FormLabel>
                        <select
                          value={companionForm.companion_type}
                          onChange={(e) => setCompanionForm(prev => ({ ...prev, companion_type: e.target.value }))}
                          className={inputStyles}
                        >
                          <option value="familiar">Familiar</option>
                          <option value="pet">Pet</option>
                          <option value="mount">Mount</option>
                          <option value="animal_companion">Animal Companion</option>
                          <option value="construct">Construct</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <FormLabel>Species</FormLabel>
                        <input
                          type="text"
                          placeholder="e.g. Ferret, Horse, Owl"
                          value={companionForm.companion_species}
                          onChange={(e) => setCompanionForm(prev => ({ ...prev, companion_species: e.target.value }))}
                          className={inputStyles}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Description & Abilities */}
              <div className="space-y-6">
                <div className="bg-white/[0.02] rounded-xl p-5 border border-white/[0.06]">
                  <h3 className="text-sm font-semibold text-white/80 mb-4">Description</h3>
                  <textarea
                    placeholder="Appearance, personality, quirks, backstory..."
                    value={companionForm.description}
                    onChange={(e) => setCompanionForm(prev => ({ ...prev, description: e.target.value }))}
                    className={cn(textareaStyles, "min-h-[200px]")}
                  />
                </div>

                <div className="bg-purple-500/5 rounded-xl p-5 border border-purple-500/20">
                  <h3 className="text-sm font-semibold text-purple-400 mb-4 flex items-center gap-2">
                    ✨ Abilities
                  </h3>
                  <textarea
                    placeholder="Special abilities, skills, or traits..."
                    value={companionForm.companion_abilities}
                    onChange={(e) => setCompanionForm(prev => ({ ...prev, companion_abilities: e.target.value }))}
                    className={cn(textareaStyles, "min-h-[200px] bg-purple-500/5 border-purple-500/20 focus:border-purple-500/40")}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 border-t border-white/[0.06] px-6 py-4 bg-[--bg-surface] flex justify-end gap-3">
            <button className="btn btn-secondary" onClick={() => setAddCompanionModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAddCompanion}>Add Companion</button>
          </div>
        </div>
      </Modal>

      {/* Edit Companion Modal - Fullscreen */}
      <Modal
        isOpen={editCompanionModalOpen}
        onClose={() => { setEditCompanionModalOpen(false); setEditingCompanion(null); }}
        title="Edit Companion"
        description="Update companion details"
        size="fullscreen"
      >
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto py-6 px-2">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Left Column - Portrait & Basic Info */}
              <div className="space-y-6">
                {/* Portrait Section */}
                <div className="bg-white/[0.02] rounded-xl p-5 border border-white/[0.06]">
                  <h3 className="text-sm font-semibold text-white/80 mb-4 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-pink-400" />
                    Portrait
                  </h3>
                  <button
                    type="button"
                    onClick={() => setCompanionImageModalOpen(true)}
                    className="relative w-full aspect-square max-w-[200px] mx-auto rounded-xl overflow-hidden border-2 border-dashed border-white/[0.08] hover:border-pink-500/40 transition-all group bg-white/[0.02]"
                  >
                    {companionForm.related_image_url ? (
                      <>
                        <Image
                          src={companionForm.related_image_url}
                          alt={companionForm.related_name || 'Companion'}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Camera className="w-8 h-8 text-white" />
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 group-hover:text-pink-400 transition-colors">
                        <Heart className="w-12 h-12 mb-2" />
                        <span className="text-sm">Add Portrait</span>
                      </div>
                    )}
                  </button>
                </div>

                {/* Identity Section */}
                <div className="bg-white/[0.02] rounded-xl p-5 border border-white/[0.06]">
                  <h3 className="text-sm font-semibold text-white/80 mb-4">Identity</h3>
                  <div className="space-y-4">
                    <div>
                      <FormLabel>Name *</FormLabel>
                      <input
                        type="text"
                        placeholder="Companion name"
                        value={companionForm.related_name}
                        onChange={(e) => setCompanionForm(prev => ({ ...prev, related_name: e.target.value }))}
                        className={inputStyles}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <FormLabel>Type</FormLabel>
                        <select
                          value={companionForm.companion_type}
                          onChange={(e) => setCompanionForm(prev => ({ ...prev, companion_type: e.target.value }))}
                          className={inputStyles}
                        >
                          <option value="familiar">Familiar</option>
                          <option value="pet">Pet</option>
                          <option value="mount">Mount</option>
                          <option value="animal_companion">Animal Companion</option>
                          <option value="construct">Construct</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <FormLabel>Species</FormLabel>
                        <input
                          type="text"
                          placeholder="e.g. Ferret, Horse, Owl"
                          value={companionForm.companion_species}
                          onChange={(e) => setCompanionForm(prev => ({ ...prev, companion_species: e.target.value }))}
                          className={inputStyles}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Description & Abilities */}
              <div className="space-y-6">
                <div className="bg-white/[0.02] rounded-xl p-5 border border-white/[0.06]">
                  <h3 className="text-sm font-semibold text-white/80 mb-4">Description</h3>
                  <textarea
                    placeholder="Appearance, personality, quirks, backstory..."
                    value={companionForm.description}
                    onChange={(e) => setCompanionForm(prev => ({ ...prev, description: e.target.value }))}
                    className={cn(textareaStyles, "min-h-[200px]")}
                  />
                </div>

                <div className="bg-purple-500/5 rounded-xl p-5 border border-purple-500/20">
                  <h3 className="text-sm font-semibold text-purple-400 mb-4 flex items-center gap-2">
                    ✨ Abilities
                  </h3>
                  <textarea
                    placeholder="Special abilities, skills, or traits..."
                    value={companionForm.companion_abilities}
                    onChange={(e) => setCompanionForm(prev => ({ ...prev, companion_abilities: e.target.value }))}
                    className={cn(textareaStyles, "min-h-[200px] bg-purple-500/5 border-purple-500/20 focus:border-purple-500/40")}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 border-t border-white/[0.06] px-6 py-4 bg-[--bg-surface] flex justify-end gap-3">
            <button className="btn btn-secondary" onClick={() => { setEditCompanionModalOpen(false); setEditingCompanion(null); }}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSaveCompanion}>Save Changes</button>
          </div>
        </div>
      </Modal>

      {/* AI Prompt Modal */}
      <Modal
        isOpen={aiPromptModalOpen}
        onClose={() => setAiPromptModalOpen(false)}
        title="AI Image Prompt"
        description="Copy this prompt to use with Midjourney, DALL-E, or other AI image tools"
      >
        <div className="space-y-4 py-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-300">Full Prompt</span>
              <button
                onClick={() => copyPromptToClipboard(generatedPrompt.prompt)}
                className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
              >
                {promptCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {promptCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="p-3 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-gray-300 max-h-48 overflow-y-auto">
              {generatedPrompt.prompt}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-300">Short Version</span>
              <button
                onClick={() => copyPromptToClipboard(generatedPrompt.shortPrompt)}
                className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            </div>
            <div className="p-3 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-gray-300">
              {generatedPrompt.shortPrompt}
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Optimized for character portraits with centered composition that works for both 1:1 avatars and 2:3 detail crops.
          </p>
        </div>
        <div className="flex justify-end">
          <button className="btn btn-secondary" onClick={() => setAiPromptModalOpen(false)}>Close</button>
        </div>
      </Modal>

      {/* NPC Image Upload Modal */}
      <UnifiedImageModal
        isOpen={npcImageModalOpen}
        onClose={() => setNpcImageModalOpen(false)}
        imageType="npc"
        currentImageUrl={npcForm.related_image_url}
        onImageChange={(url) => setNpcForm(prev => ({ ...prev, related_image_url: url }))}
        onUpload={uploadRelationshipImage}
        promptData={{
          type: 'npc',
          name: npcForm.related_name,
          relationship_type: npcForm.relationship_type,
          relationship_label: npcForm.relationship_label,
          occupation: npcForm.occupation,
          location: npcForm.location,
          personality_traits: npcForm.personality_traits,
          full_notes: npcForm.full_notes,
          parentCharacter: {
            name: formData.name,
            race: formData.race,
            class: formData.class,
          }
        }}
        title="NPC Avatar"
      />

      {/* Companion Image Upload Modal */}
      <UnifiedImageModal
        isOpen={companionImageModalOpen}
        onClose={() => setCompanionImageModalOpen(false)}
        imageType="companion"
        currentImageUrl={companionForm.related_image_url}
        onImageChange={(url) => setCompanionForm(prev => ({ ...prev, related_image_url: url }))}
        onUpload={uploadRelationshipImage}
        promptData={{
          type: 'companion',
          name: companionForm.related_name,
          companion_type: companionForm.companion_type,
          companion_species: companionForm.companion_species,
          description: companionForm.description,
          companion_abilities: companionForm.companion_abilities,
          parentCharacter: {
            name: formData.name,
            race: formData.race,
            class: formData.class,
          }
        }}
        title="Companion Avatar"
      />

      {/* Gallery Image Upload Modal */}
      <UnifiedImageModal
        isOpen={galleryImageModalOpen}
        onClose={() => setGalleryImageModalOpen(false)}
        imageType="gallery"
        currentImageUrl={null}
        onImageChange={handleAddGalleryImage}
        onUpload={uploadGalleryImage}
        promptData={{
          type: 'gallery',
          name: formData.name,
          race: formData.race,
          class: formData.class,
          appearance: formData.appearance,
        }}
        title="Add Gallery Image"
      />

      {/* Limit Reached Modal */}
      <LimitReachedModal
        isOpen={limitModalOpen}
        onClose={() => setLimitModalOpen(false)}
        limitType="vaultCharacters"
        current={limitInfo.current}
        limit={limitInfo.limit}
        onManage={() => router.push('/vault')}
      />

      {/* Floating Dock Navigation */}
      {standalone && <FloatingDock characterId={characterId || undefined} />}
    </>
  )
}

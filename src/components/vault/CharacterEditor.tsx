'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Highlight from '@tiptap/extension-highlight'
import TiptapImage from '@tiptap/extension-image'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { cn, getInitials } from '@/lib/utils'
import { useAutoSave } from '@/hooks'
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
  ArrowLeft,
  BarChart3,
  Image as GalleryIcon,
  Sparkles,
  Loader2,
  Check,
  Brain,
  Edit2,
} from 'lucide-react'
import { useAppStore } from '@/store'
import { Modal } from '@/components/ui'
import { VaultImageCropModal } from './VaultImageCropModal'
import { ShareCharacterModal } from './ShareCharacterModal'
import type {
  VaultCharacter,
  StoryCharacter,
  PlayJournal,
  CharacterLink,
  CharacterLearnedFact,
  CharacterStatus,
  VaultCharacterRelationship
} from '@/types/database'
import { NPCCard } from './NPCCard'
import { CompanionCard } from './CompanionCard'
import { SessionNoteCard } from './SessionNoteCard'
import { v4 as uuidv4 } from 'uuid'

// Section types for navigation
type SectionType = 'backstory' | 'details' | 'people' | 'journal' | 'writings' | 'stats' | 'player' | 'gallery'

interface CharacterEditorProps {
  character?: VaultCharacter | null
  mode: 'create' | 'edit'
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
  { id: 'journal', label: 'Journal', icon: Scroll },
  { id: 'writings', label: 'Writings', icon: Quote },
  { id: 'stats', label: 'Stats', icon: BarChart3 },
  { id: 'player', label: 'Player', icon: User },
  { id: 'gallery', label: 'Gallery', icon: GalleryIcon },
]

export function CharacterEditor({ character, mode }: CharacterEditorProps) {
  const router = useRouter()
  const supabase = createClient()
  const { aiEnabled } = useAppStore()
  const imageInputRef = useRef<HTMLInputElement>(null)
  const portraitInputRef = useRef<HTMLInputElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isCreateMode = mode === 'create'

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
    weaknesses: character?.weaknesses || [] as string[],
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

  // Related data
  const [relationships, setRelationships] = useState<VaultCharacterRelationship[]>([])
  const [journalEntries, setJournalEntries] = useState<PlayJournal[]>([])
  const [links, setLinks] = useState<CharacterLink[]>([])
  const [learnedFacts, setLearnedFacts] = useState<CharacterLearnedFact[]>([])
  const [customStatuses, setCustomStatuses] = useState<CharacterStatus[]>([])

  // Derived: separate NPCs from Companions
  const npcs = relationships.filter(r => !r.is_companion)
  const companions = relationships.filter(r => r.is_companion)

  // Modals
  const [addLinkModalOpen, setAddLinkModalOpen] = useState(false)
  const [addStoryCharacterModalOpen, setAddStoryCharacterModalOpen] = useState(false)
  const [editNPCModalOpen, setEditNPCModalOpen] = useState(false)
  const [editingNPC, setEditingNPC] = useState<VaultCharacterRelationship | null>(null)
  const [addCompanionModalOpen, setAddCompanionModalOpen] = useState(false)
  const [editCompanionModalOpen, setEditCompanionModalOpen] = useState(false)
  const [editingCompanion, setEditingCompanion] = useState<VaultCharacterRelationship | null>(null)
  const [addJournalModalOpen, setAddJournalModalOpen] = useState(false)
  const [editJournalModalOpen, setEditJournalModalOpen] = useState(false)
  const [editingJournal, setEditingJournal] = useState<PlayJournal | null>(null)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false)

  // Modal form state
  const [linkForm, setLinkForm] = useState({ type: 'other' as string, title: '', url: '' })
  const [storyCharForm, setStoryCharForm] = useState({ name: '', relationship: 'friend', tagline: '', notes: '' })
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

  // Detect which section is in view
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const sectionIds: SectionType[] = ['backstory', 'details', 'people', 'journal', 'writings', 'stats', 'player', 'gallery']
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

  // Load related data
  useEffect(() => {
    if (!characterId) return

    const loadRelatedData = async () => {
      const [
        { data: rels },
        { data: journal },
        { data: charLinks },
        { data: facts },
      ] = await Promise.all([
        supabase.from('vault_character_relationships').select('*').eq('character_id', characterId).order('display_order'),
        supabase.from('play_journal').select('*').eq('character_id', characterId).order('session_number', { ascending: true }),
        supabase.from('character_links').select('*').eq('character_id', characterId).order('sort_order'),
        supabase.from('character_learned_facts').select('*').eq('character_id', characterId),
      ])

      if (rels) setRelationships(rels)
      if (journal) setJournalEntries(journal)
      if (charLinks) setLinks(charLinks)
      if (facts) setLearnedFacts(facts)
    }

    loadRelatedData()
  }, [characterId, supabase])

  // Load custom statuses
  useEffect(() => {
    const loadStatuses = async () => {
      const { data } = await supabase.from('character_statuses').select('*').order('sort_order')
      if (data) setCustomStatuses(data)
    }
    loadStatuses()
  }, [supabase])

  // Summary editor
  const summaryEditor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2] } }),
      Placeholder.configure({ placeholder: 'Brief description - role, personality, key traits...' }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-purple-400 underline' } }),
      Highlight.configure({ HTMLAttributes: { class: 'bg-yellow-500/30 px-1 rounded' } }),
      Underline,
    ],
    content: formData.summary || '',
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
    content: formData.notes,
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[350px] prose-headings:text-white prose-p:text-gray-300 prose-p:my-2 prose-ul:text-gray-300 prose-li:text-gray-300 prose-blockquote:border-l-purple-500 prose-blockquote:text-gray-400',
      },
    },
    onUpdate: ({ editor }) => {
      setFormData(prev => ({ ...prev, notes: editor.getHTML() }))
    },
  })

  // Convert plain text/markdown to HTML for TipTap
  const textToHtml = (text: string): string => {
    if (!text) return ''
    // If it already looks like HTML, return as-is
    if (text.startsWith('<') && (text.includes('<p>') || text.includes('<div>'))) {
      return text
    }

    // Process the text block by block (split on double newlines)
    const blocks = text.split(/\n\n+/)
    const htmlBlocks: string[] = []

    for (const block of blocks) {
      const trimmedBlock = block.trim()
      if (!trimmedBlock) continue

      // Check if this block is a list (starts with - or • or *)
      const lines = trimmedBlock.split('\n')
      const isListBlock = lines.every(line => /^[\-\•\*]\s/.test(line.trim()) || line.trim() === '')

      if (isListBlock) {
        // Convert to unordered list
        const listItems = lines
          .filter(line => line.trim())
          .map(line => `<li>${processInlineFormatting(line.replace(/^[\-\•\*]\s*/, ''))}</li>`)
          .join('')
        htmlBlocks.push(`<ul>${listItems}</ul>`)
      } else if (trimmedBlock.startsWith('## ')) {
        // H2 heading
        htmlBlocks.push(`<h2>${processInlineFormatting(trimmedBlock.slice(3))}</h2>`)
      } else if (trimmedBlock.startsWith('# ')) {
        // H1 heading
        htmlBlocks.push(`<h1>${processInlineFormatting(trimmedBlock.slice(2))}</h1>`)
      } else {
        // Regular paragraph - convert single newlines to <br>
        const processed = lines.map(line => processInlineFormatting(line)).join('<br>')
        htmlBlocks.push(`<p>${processed}</p>`)
      }
    }

    return htmlBlocks.join('')
  }

  // Process inline formatting (bold, italic)
  const processInlineFormatting = (text: string): string => {
    return text
      // Bold: **text** or __text__
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_]+)__/g, '<strong>$1</strong>')
      // Italic: *text* or _text_
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/_([^_]+)_/g, '<em>$1</em>')
  }

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
      weaknesses: dataToSave.weaknesses.length > 0 ? dataToSave.weaknesses : null,
      plot_hooks: dataToSave.plot_hooks.length > 0 ? dataToSave.plot_hooks : null,
      tldr: dataToSave.tldr.length > 0 ? dataToSave.tldr : null,
      pre_session_hook: dataToSave.pre_session_hook || null,
      backstory_phases: dataToSave.backstory_phases.length > 0 ? dataToSave.backstory_phases : null,
      theme_music_url: dataToSave.theme_music_url || null,
      theme_music_title: dataToSave.theme_music_title || null,
      character_sheet_url: dataToSave.character_sheet_url || null,
      external_links: dataToSave.external_links.length > 0 ? dataToSave.external_links : null,
      game_system: dataToSave.game_system || null,
      external_campaign: dataToSave.external_campaign || null,
      dm_name: dataToSave.dm_name || null,
      campaign_started: dataToSave.campaign_started || null,
      quick_stats: dataToSave.quick_stats,
      inventory: dataToSave.inventory,
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
      // New fields from migration 018
      character_writings: dataToSave.character_writings.length > 0 ? dataToSave.character_writings : null,
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
      updated_at: new Date().toISOString(),
    }

    if (characterId) {
      await supabase.from('vault_characters').update(characterData).eq('id', characterId)
    } else {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Not authenticated')

      const { data } = await supabase
        .from('vault_characters')
        .insert({ ...characterData, user_id: userData.user.id })
        .select()
        .single()

      if (data) {
        setCharacterId(data.id)
        window.history.replaceState(null, '', `/vault/${data.id}`)
      }
    }
  }, [characterId, supabase])

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
    await supabase.from('vault_characters').delete().eq('id', characterId)
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
    if (!characterId || !storyCharForm.name.trim()) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('vault_character_relationships')
        .insert({
          user_id: user.id,
          character_id: characterId,
          related_name: storyCharForm.name.trim(),
          relationship_type: storyCharForm.relationship,
          relationship_label: storyCharForm.relationship,
          description: storyCharForm.tagline.trim() || null,
          full_notes: storyCharForm.notes.trim() || null,
          display_order: relationships.length,
          is_companion: false,
        })
        .select()
        .single()

      if (error) throw error
      if (data) setRelationships(prev => [...prev, data])

      setStoryCharForm({ name: '', relationship: 'friend', tagline: '', notes: '' })
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

  // Section header component - minimal with subtle accent
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

  // Simple label for fields within sections
  const FieldLabel = ({ children }: { children: React.ReactNode }) => (
    <label className="block text-[13px] font-medium text-gray-400/90 mb-2.5 tracking-wide">{children}</label>
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
              className="relative w-full aspect-[3/4] overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a0c] cursor-pointer transition-all duration-300 group-hover:border-purple-500/30"
              style={{ boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)' }}
              onClick={() => setLightboxOpen(true)}
            >
              <Image
                src={displayUrl}
                alt={formData.name || 'Character portrait'}
                fill
                className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                sizes="320px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                <span className="text-white/90 text-[13px] font-medium px-3 py-1.5 bg-black/40 backdrop-blur-sm rounded-lg">View Full Size</span>
              </div>
            </div>
            <div className="absolute bottom-2.5 right-2.5 flex gap-1.5">
              {aiEnabled && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleGenerateAiPrompt() }}
                  disabled={generatingPrompt}
                  className="p-2 bg-black/60 backdrop-blur-sm rounded-lg text-white/80 hover:text-purple-300 hover:bg-black/80 transition-all duration-200 border border-white/[0.08]"
                  title="Generate AI image prompt"
                >
                  {generatingPrompt ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                </button>
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); portraitInputRef.current?.click() }}
                disabled={isUploading}
                className="p-2 bg-black/60 backdrop-blur-sm rounded-lg text-white/80 hover:text-white hover:bg-black/80 transition-all duration-200 border border-white/[0.08]"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
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
            {aiEnabled && (
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

  // =====================================================
  // MAIN RENDER
  // =====================================================

  return (
    <>
      <div className="fixed inset-0 z-50 bg-[#0c0c0e] flex flex-col p-2 xl:p-3 2xl:p-4">
        <div className="flex-1 flex flex-col rounded-2xl border border-white/[0.06] overflow-hidden bg-[#111113]">
        {/* Header */}
        <header className="flex-shrink-0 flex items-center justify-between px-5 xl:px-6 h-14 border-b border-white/[0.06] bg-white/[0.01]">
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.05] transition-all duration-200 text-gray-500 hover:text-gray-300"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-[13px]">Back</span>
            </button>
            <div className="w-px h-5 bg-white/[0.08]" />
            <div className="flex items-center gap-2.5">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                formData.type === 'pc' ? "bg-purple-500/15 text-purple-400" : "bg-gray-500/15 text-gray-400"
              )}>
                {formData.type === 'pc' ? <User className="w-4 h-4" /> : <Users className="w-4 h-4" />}
              </div>
              <div>
                <h1 className="text-[15px] font-medium text-white/90">
                  {formData.name || (isCreateMode ? 'New Character' : 'Edit Character')}
                </h1>
                <p className="text-[11px] text-gray-500">
                  {status === 'saving' ? 'Saving...' : status === 'saved' ? 'All changes saved' : 'Enter a name to start'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {characterId && (
              <>
                {aiEnabled && (
                  <button
                    onClick={() => router.push(`/vault/${characterId}/intelligence`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-purple-500/10 transition-all duration-200 text-purple-400 hover:text-purple-300"
                  >
                    <Brain className="w-3.5 h-3.5" />
                    <span className="text-[13px]">Intelligence</span>
                  </button>
                )}
                <button
                  onClick={() => setShareModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/[0.05] transition-all duration-200 text-gray-500 hover:text-gray-300"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="text-[13px]">Share</span>
                </button>
                <button
                  onClick={() => setDuplicateModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/[0.05] transition-all duration-200 text-gray-500 hover:text-gray-300"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span className="text-[13px]">Duplicate</span>
                </button>
              </>
            )}
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden min-h-0 gap-0">
          {/* Left Sidebar */}
          <aside className="w-[320px] xl:w-[360px] 2xl:w-[400px] flex-shrink-0 flex flex-col border-r border-white/[0.06] overflow-hidden bg-[#0f0f11]">
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

            {/* Delete at bottom */}
            {characterId && (
              <div className="flex-shrink-0 px-6 py-4 border-t border-white/[0.06]">
                <button
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  className="flex items-center gap-2 text-[13px] text-gray-600 hover:text-red-400/80 transition-all duration-200"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Character
                </button>
              </div>
            )}
          </aside>

          {/* Main Content Area - Single Scrollable Page */}
          <main className="flex-1 overflow-y-auto bg-[#131316]" ref={scrollContainerRef}>
            <div className="w-full max-w-[1400px] mx-auto px-10 xl:px-16 2xl:px-20 py-10 xl:py-12">
              <div>

              {/* ═══════════════ BACKSTORY SECTION ═══════════════ */}
              <section id="backstory" className="scroll-mt-8 mb-20">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-2.5 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <BookOpen className="w-5 h-5 text-purple-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-white/90 uppercase tracking-wider">Backstory</h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-white/[0.06] to-transparent" />
                </div>

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

                  {/* Quick Summary bullets */}
                  <div>
                    <ArrayFieldEditor
                      label="Quick Summary"
                      items={formData.tldr}
                      placeholder="Add a quick fact about this character..."
                      onChange={(items) => setFormData(prev => ({ ...prev, tldr: items }))}
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

                  {/* Plot Hooks */}
                  <div>
                    <ArrayFieldEditor
                      label="Plot Hooks"
                      items={formData.plot_hooks}
                      placeholder="Add a story hook for the DM..."
                      onChange={(items) => setFormData(prev => ({ ...prev, plot_hooks: items }))}
                    />
                  </div>

                  {/* Quotes */}
                  <div>
                    <ArrayFieldEditor
                      label="Memorable Quotes"
                      items={formData.quotes}
                      placeholder="Add a memorable quote..."
                      onChange={(items) => setFormData(prev => ({ ...prev, quotes: items }))}
                      bulletChar='"'
                    />
                  </div>
                </div>
              </section>

              {/* Section Divider */}
              <div className="flex items-center gap-6 my-14">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
              </div>

              {/* ═══════════════ DETAILS SECTION ═══════════════ */}
              <section id="details" className="scroll-mt-8 mb-20">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-2.5 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <FileText className="w-5 h-5 text-purple-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-white/90 uppercase tracking-wider">Details</h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-white/[0.06] to-transparent" />
                </div>

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
                          placeholder="5'10&quot;"
                          className="w-full py-2.5 px-3 text-[14px] bg-white/[0.02] border border-white/[0.06] rounded-lg text-white/85 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.04] focus:border-purple-500/30 transition-all duration-200"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-2">Weight</label>
                        <input
                          type="text"
                          value={formData.weight}
                          onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                          placeholder="170 lbs"
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
                    <ArrayFieldEditor
                      label="Fears"
                      items={formData.fears}
                      placeholder="Add something this character fears..."
                      onChange={(items) => setFormData(prev => ({ ...prev, fears: items }))}
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

                  {/* Weaknesses */}
                  <div>
                    <ArrayFieldEditor
                      label="Weaknesses & Flaws"
                      items={formData.weaknesses}
                      placeholder="Add a weakness or character flaw..."
                      onChange={(items) => setFormData(prev => ({ ...prev, weaknesses: items }))}
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
              </section>

              {/* Section Divider */}
              <div className="flex items-center gap-6 my-14">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
              </div>

              {/* ═══════════════ PEOPLE SECTION ═══════════════ */}
              <section id="people" className="scroll-mt-8 mb-20">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-2.5 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <Users className="w-5 h-5 text-purple-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-white/90 uppercase tracking-wider">People</h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-white/[0.06] to-transparent" />
                </div>

                <div className="space-y-10">
                  {/* NPCs Section */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-sm font-medium text-gray-400/90">NPCs & Contacts ({npcs.length})</label>
                      <button
                        onClick={() => setAddStoryCharacterModalOpen(true)}
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
              </section>

              {/* Section Divider */}
              <div className="flex items-center gap-6 my-14">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
              </div>

              {/* ═══════════════ JOURNAL SECTION ═══════════════ */}
              <section id="journal" className="scroll-mt-8 mb-20">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-2.5 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <Scroll className="w-5 h-5 text-purple-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-white/90 uppercase tracking-wider">Journal</h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-white/[0.06] to-transparent" />
                  <button
                    onClick={() => setAddJournalModalOpen(true)}
                    className="flex items-center gap-2 py-2 px-4 text-sm text-purple-400 bg-purple-500/10 rounded-lg hover:bg-purple-500/20 transition-all duration-200 border border-purple-500/20"
                  >
                    <Plus className="w-4 h-4" />
                    Add Entry
                  </button>
                </div>

                {journalEntries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 bg-white/[0.015] border border-dashed border-white/[0.08] rounded-xl">
                    <Scroll className="w-10 h-10 mb-4 text-gray-600" />
                    <p className="text-sm text-gray-500">No journal entries yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {journalEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="p-5 bg-white/[0.02] rounded-xl border border-white/[0.04] hover:border-purple-500/20 transition-all duration-200"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {entry.session_number && (
                              <span className="text-xs px-2.5 py-1 bg-yellow-500/15 text-yellow-400 rounded-md font-medium border border-yellow-500/20">
                                Session {entry.session_number}
                              </span>
                            )}
                            {entry.title && <span className="text-sm font-medium text-white/90">{entry.title}</span>}
                            {entry.campaign_name && <span className="text-xs text-gray-500">• {entry.campaign_name}</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            {entry.session_date && (
                              <span className="text-xs text-gray-500">
                                {new Date(entry.session_date).toLocaleDateString()}
                              </span>
                            )}
                            <button
                              onClick={() => openEditJournal(entry)}
                              className="p-1.5 text-gray-500 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-all"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteJournal(entry)}
                              className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {entry.summary && <p className="text-sm text-gray-300 mb-2">{entry.summary}</p>}
                        <p className="text-sm text-gray-400 whitespace-pre-wrap leading-relaxed">{entry.notes}</p>
                        {(entry.kill_count || entry.loot || entry.thoughts_for_next) && (
                          <div className="mt-3 pt-3 border-t border-white/[0.04] flex flex-wrap gap-4 text-xs text-gray-500">
                            {entry.kill_count !== null && entry.kill_count > 0 && <span>Kills: {entry.kill_count}</span>}
                            {entry.loot && <span>Loot: {entry.loot}</span>}
                            {entry.thoughts_for_next && <span className="text-purple-400">Next: {entry.thoughts_for_next}</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Section Divider */}
              <div className="flex items-center gap-6 my-14">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
              </div>

              {/* ═══════════════ WRITINGS SECTION ═══════════════ */}
              <section id="writings" className="scroll-mt-8 mb-20">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-2.5 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <Quote className="w-5 h-5 text-purple-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-white/90 uppercase tracking-wider">Writings</h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-white/[0.06] to-transparent" />
                </div>

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
                                  <option value="speech">Speech</option>
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
              </section>

              {/* Section Divider */}
              <div className="flex items-center gap-6 my-14">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
              </div>

              {/* ═══════════════ STATS SECTION ═══════════════ */}
              <section id="stats" className="scroll-mt-8 mb-20">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-2.5 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <BarChart3 className="w-5 h-5 text-purple-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-white/90 uppercase tracking-wider">Stats</h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-white/[0.06] to-transparent" />
                </div>

                <div className="space-y-8">
                  {/* Gold */}
                  <div>
                    <label className="block text-sm text-gray-500 mb-2">Gold</label>
                    <input
                      type="number"
                      value={formData.gold}
                      onChange={(e) => setFormData(prev => ({ ...prev, gold: parseInt(e.target.value) || 0 }))}
                      className="w-40 py-3 px-4 text-lg bg-white/[0.02] border border-white/[0.06] rounded-xl text-yellow-400 font-medium focus:outline-none focus:bg-white/[0.04] focus:border-yellow-500/30 transition-all duration-200"
                    />
                  </div>

                  {/* Combat Stats */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400/90 mb-4">Combat Statistics</label>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                        <label className="block text-xs text-gray-500 mb-2">Kills</label>
                        <input
                          type="number"
                          value={formData.combat_stats?.kills || 0}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            combat_stats: { ...prev.combat_stats, kills: parseInt(e.target.value) || 0 }
                          }))}
                          className="w-full py-2 px-3 text-lg bg-transparent border border-white/[0.06] rounded-lg text-red-400 font-medium focus:outline-none focus:border-red-500/30 transition-all duration-200"
                        />
                      </div>
                      <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                        <label className="block text-xs text-gray-500 mb-2">Deaths</label>
                        <input
                          type="number"
                          value={formData.combat_stats?.deaths || 0}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            combat_stats: { ...prev.combat_stats, deaths: parseInt(e.target.value) || 0 }
                          }))}
                          className="w-full py-2 px-3 text-lg bg-transparent border border-white/[0.06] rounded-lg text-gray-400 font-medium focus:outline-none focus:border-gray-500/30 transition-all duration-200"
                        />
                      </div>
                      <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                        <label className="block text-xs text-gray-500 mb-2">Unconscious</label>
                        <input
                          type="number"
                          value={formData.combat_stats?.unconscious || 0}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            combat_stats: { ...prev.combat_stats, unconscious: parseInt(e.target.value) || 0 }
                          }))}
                          className="w-full py-2 px-3 text-lg bg-transparent border border-white/[0.06] rounded-lg text-orange-400 font-medium focus:outline-none focus:border-orange-500/30 transition-all duration-200"
                        />
                      </div>
                      <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                        <label className="block text-xs text-gray-500 mb-2">Last Session</label>
                        <input
                          type="number"
                          value={formData.combat_stats?.last_updated_session || 0}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            combat_stats: { ...prev.combat_stats, last_updated_session: parseInt(e.target.value) || 0 }
                          }))}
                          className="w-full py-2 px-3 text-lg bg-transparent border border-white/[0.06] rounded-lg text-purple-400 font-medium focus:outline-none focus:border-purple-500/30 transition-all duration-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Party Relations */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-sm font-medium text-gray-400/90">Party Relations</label>
                      <button
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            party_relations: [...prev.party_relations, { name: '', notes: '', relationship: '' }]
                          }))
                        }}
                        className="flex items-center gap-2 py-2 px-4 text-sm text-purple-400 bg-purple-500/10 rounded-lg hover:bg-purple-500/20 transition-all duration-200 border border-purple-500/20"
                      >
                        <Plus className="w-4 h-4" />
                        Add Relation
                      </button>
                    </div>

                    {formData.party_relations.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 bg-white/[0.015] border border-dashed border-white/[0.08] rounded-xl">
                        <Users className="w-10 h-10 mb-4 text-gray-600" />
                        <p className="text-sm text-gray-500">No party relations yet</p>
                        <p className="text-xs text-gray-600 mt-1">Add notes about relationships with other party members</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {formData.party_relations.map((relation, index) => (
                          <div key={index} className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                            <div className="flex items-center gap-4 mb-3">
                              <input
                                type="text"
                                value={relation.name}
                                onChange={(e) => {
                                  const newRelations = [...formData.party_relations]
                                  newRelations[index] = { ...relation, name: e.target.value }
                                  setFormData(prev => ({ ...prev, party_relations: newRelations }))
                                }}
                                placeholder="Character name..."
                                className="flex-1 py-2.5 px-3.5 text-[14px] bg-white/[0.03] border border-white/[0.06] rounded-lg text-white/85 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.05] focus:border-purple-500/30 transition-all duration-200"
                              />
                              <input
                                type="text"
                                value={relation.relationship || ''}
                                onChange={(e) => {
                                  const newRelations = [...formData.party_relations]
                                  newRelations[index] = { ...relation, relationship: e.target.value }
                                  setFormData(prev => ({ ...prev, party_relations: newRelations }))
                                }}
                                placeholder="Relationship (friend, rival...)"
                                className="w-48 py-2.5 px-3.5 text-[14px] bg-white/[0.03] border border-white/[0.06] rounded-lg text-white/85 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.05] focus:border-purple-500/30 transition-all duration-200"
                              />
                              <button
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    party_relations: prev.party_relations.filter((_, i) => i !== index)
                                  }))
                                }}
                                className="p-1.5 text-gray-600 hover:text-red-400/80 transition-all duration-200"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <textarea
                              value={relation.notes}
                              onChange={(e) => {
                                const newRelations = [...formData.party_relations]
                                newRelations[index] = { ...relation, notes: e.target.value }
                                setFormData(prev => ({ ...prev, party_relations: newRelations }))
                              }}
                              placeholder="Notes about this relationship..."
                              className="w-full min-h-[80px] py-3 px-4 text-[14px] bg-white/[0.02] border border-white/[0.06] rounded-lg text-white/80 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.04] focus:border-purple-500/30 transition-all duration-200 resize-none leading-relaxed"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Gameplay Tips */}
                  <div>
                    <ArrayFieldEditor
                      label="Gameplay Tips"
                      items={formData.gameplay_tips}
                      placeholder="Add a combat tip or mechanical reminder..."
                      onChange={(items) => setFormData(prev => ({ ...prev, gameplay_tips: items }))}
                      bulletChar="→"
                    />
                  </div>

                  {/* Reference Tables */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-sm font-medium text-gray-400/90">Reference Tables</label>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            reference_tables: [...prev.reference_tables, { title: '', headers: ['Column 1', 'Column 2'], rows: [['', '']] }]
                          }))
                        }}
                        className="flex items-center gap-2 py-2 px-4 text-sm text-purple-400 bg-purple-500/10 rounded-lg hover:bg-purple-500/20 transition-all duration-200 border border-purple-500/20"
                      >
                        <Plus className="w-4 h-4" />
                        Add Table
                      </button>
                    </div>

                    {formData.reference_tables.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 bg-white/[0.015] border border-dashed border-white/[0.08] rounded-xl">
                        <BarChart3 className="w-8 h-8 mb-3 text-gray-600" />
                        <p className="text-sm text-gray-500">No reference tables yet</p>
                        <p className="text-xs text-gray-600 mt-1">Store potion inventories, known locations, etc.</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {formData.reference_tables.map((table: { title: string; headers: string[]; rows: string[][] }, tableIndex: number) => (
                          <div key={tableIndex} className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                            <div className="flex items-center gap-3 mb-4">
                              <input
                                type="text"
                                value={table.title}
                                onChange={(e) => {
                                  const newTables = [...formData.reference_tables]
                                  newTables[tableIndex] = { ...table, title: e.target.value }
                                  setFormData(prev => ({ ...prev, reference_tables: newTables }))
                                }}
                                placeholder="Table title..."
                                className="flex-1 py-2 px-3 text-sm font-medium bg-white/[0.03] border border-white/[0.06] rounded-lg text-white/85 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.05] focus:border-purple-500/30"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const newTables = [...formData.reference_tables]
                                  newTables[tableIndex] = {
                                    ...table,
                                    headers: [...table.headers, `Column ${table.headers.length + 1}`],
                                    rows: table.rows.map((row: string[]) => [...row, ''])
                                  }
                                  setFormData(prev => ({ ...prev, reference_tables: newTables }))
                                }}
                                className="p-2 text-gray-500 hover:text-purple-400 transition-all"
                                title="Add column"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    reference_tables: prev.reference_tables.filter((_: { title: string; headers: string[]; rows: string[][] }, i: number) => i !== tableIndex)
                                  }))
                                }}
                                className="p-2 text-gray-600 hover:text-red-400/80 transition-all"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr>
                                    {table.headers.map((header: string, colIndex: number) => (
                                      <th key={colIndex} className="p-2 text-left">
                                        <input
                                          type="text"
                                          value={header}
                                          onChange={(e) => {
                                            const newTables = [...formData.reference_tables]
                                            const newHeaders = [...table.headers]
                                            newHeaders[colIndex] = e.target.value
                                            newTables[tableIndex] = { ...table, headers: newHeaders }
                                            setFormData(prev => ({ ...prev, reference_tables: newTables }))
                                          }}
                                          className="w-full py-1.5 px-2 text-xs font-medium bg-purple-500/10 border border-purple-500/20 rounded text-purple-300 placeholder:text-gray-600 focus:outline-none focus:border-purple-500/40"
                                        />
                                      </th>
                                    ))}
                                    <th className="w-8"></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {table.rows.map((row: string[], rowIndex: number) => (
                                    <tr key={rowIndex}>
                                      {row.map((cell: string, cellIndex: number) => (
                                        <td key={cellIndex} className="p-1">
                                          <input
                                            type="text"
                                            value={cell}
                                            onChange={(e) => {
                                              const newTables = [...formData.reference_tables]
                                              const newRows = table.rows.map((r: string[], ri: number) =>
                                                ri === rowIndex
                                                  ? r.map((c: string, ci: number) => ci === cellIndex ? e.target.value : c)
                                                  : r
                                              )
                                              newTables[tableIndex] = { ...table, rows: newRows }
                                              setFormData(prev => ({ ...prev, reference_tables: newTables }))
                                            }}
                                            className="w-full py-1.5 px-2 text-xs bg-white/[0.02] border border-white/[0.06] rounded text-white/80 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.04] focus:border-purple-500/30"
                                          />
                                        </td>
                                      ))}
                                      <td className="w-8 p-1">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newTables = [...formData.reference_tables]
                                            newTables[tableIndex] = {
                                              ...table,
                                              rows: table.rows.filter((_: string[], i: number) => i !== rowIndex)
                                            }
                                            setFormData(prev => ({ ...prev, reference_tables: newTables }))
                                          }}
                                          className="p-1 text-gray-600 hover:text-red-400/80 transition-all"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const newTables = [...formData.reference_tables]
                                newTables[tableIndex] = {
                                  ...table,
                                  rows: [...table.rows, table.headers.map(() => '')]
                                }
                                setFormData(prev => ({ ...prev, reference_tables: newTables }))
                              }}
                              className="mt-2 w-full py-1.5 text-xs text-gray-500 hover:text-purple-400 bg-white/[0.02] hover:bg-white/[0.04] border border-dashed border-white/[0.08] rounded transition-all"
                            >
                              + Add Row
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Section Divider */}
              <div className="flex items-center gap-6 my-14">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
              </div>

              {/* ═══════════════ PLAYER SECTION (OOC) ═══════════════ */}
              <section id="player" className="scroll-mt-8 mb-20">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-2.5 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <User className="w-5 h-5 text-purple-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-white/90 uppercase tracking-wider">Player Info</h2>
                  <span className="text-xs bg-gray-500/15 text-gray-400 px-2.5 py-1 rounded-md border border-gray-500/20">OOC</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-white/[0.06] to-transparent" />
                </div>

                <div className="space-y-6">
                  {/* Basic Player Info */}
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm text-gray-500 mb-2">Discord</label>
                      <input
                        type="text"
                        value={formData.player_discord}
                        onChange={(e) => setFormData(prev => ({ ...prev, player_discord: e.target.value }))}
                        placeholder="username#1234"
                        className="w-full py-3 px-4 text-[15px] bg-white/[0.02] border border-white/[0.06] rounded-xl text-white/85 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.04] focus:border-purple-500/30 transition-all duration-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-500 mb-2">Timezone</label>
                      <input
                        type="text"
                        value={formData.player_timezone}
                        onChange={(e) => setFormData(prev => ({ ...prev, player_timezone: e.target.value }))}
                        placeholder="GMT+2, EST..."
                        className="w-full py-3 px-4 text-[15px] bg-white/[0.02] border border-white/[0.06] rounded-xl text-white/85 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.04] focus:border-purple-500/30 transition-all duration-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-500 mb-2">TTRPG Experience</label>
                      <input
                        type="text"
                        value={formData.player_experience}
                        onChange={(e) => setFormData(prev => ({ ...prev, player_experience: e.target.value }))}
                        placeholder="5+ years, new player..."
                        className="w-full py-3 px-4 text-[15px] bg-white/[0.02] border border-white/[0.06] rounded-xl text-white/85 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.04] focus:border-purple-500/30 transition-all duration-200"
                      />
                    </div>
                  </div>

                  {/* Player Preferences */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400/90 mb-4">Player Preferences</label>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs text-gray-500 mb-2">What is fun in D&D for you?</label>
                        <textarea
                          value={formData.player_preferences?.fun_in_dnd || ''}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            player_preferences: { ...prev.player_preferences, fun_in_dnd: e.target.value }
                          }))}
                          placeholder="What do you enjoy most about tabletop RPGs?"
                          className="w-full min-h-[100px] py-3 px-4 text-[14px] bg-white/[0.02] border border-white/[0.06] rounded-xl text-white/80 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.04] focus:border-purple-500/30 transition-all duration-200 resize-none leading-relaxed"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-2">What annoys you?</label>
                        <textarea
                          value={formData.player_preferences?.annoys_me || ''}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            player_preferences: { ...prev.player_preferences, annoys_me: e.target.value }
                          }))}
                          placeholder="What frustrates you or breaks immersion?"
                          className="w-full min-h-[100px] py-3 px-4 text-[14px] bg-white/[0.02] border border-white/[0.06] rounded-xl text-white/80 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.04] focus:border-purple-500/30 transition-all duration-200 resize-none leading-relaxed"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-2">Ideal party</label>
                        <textarea
                          value={formData.player_preferences?.ideal_party || ''}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            player_preferences: { ...prev.player_preferences, ideal_party: e.target.value }
                          }))}
                          placeholder="What makes a great group for you?"
                          className="w-full min-h-[100px] py-3 px-4 text-[14px] bg-white/[0.02] border border-white/[0.06] rounded-xl text-white/80 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.04] focus:border-purple-500/30 transition-all duration-200 resize-none leading-relaxed"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-2">Ideal DM</label>
                        <textarea
                          value={formData.player_preferences?.ideal_dm || ''}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            player_preferences: { ...prev.player_preferences, ideal_dm: e.target.value }
                          }))}
                          placeholder="What DM style works best for you?"
                          className="w-full min-h-[100px] py-3 px-4 text-[14px] bg-white/[0.02] border border-white/[0.06] rounded-xl text-white/80 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.04] focus:border-purple-500/30 transition-all duration-200 resize-none leading-relaxed"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section Divider */}
              <div className="flex items-center gap-6 my-14">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
              </div>

              {/* ═══════════════ GALLERY SECTION ═══════════════ */}
              <section id="gallery" className="scroll-mt-8">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-2.5 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <GalleryIcon className="w-5 h-5 text-purple-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-white/90 uppercase tracking-wider">Gallery</h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-white/[0.06] to-transparent" />
                </div>

                <div className="flex flex-col items-center justify-center py-16 bg-white/[0.015] border border-dashed border-white/[0.08] rounded-xl">
                  <GalleryIcon className="w-10 h-10 mb-4 text-gray-600" />
                  <p className="text-sm text-gray-500">Gallery coming soon</p>
                </div>
              </section>

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
        description="Are you sure? This will permanently delete this character and all related data."
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

      {/* Share Modal */}
      {characterId && (
        <ShareCharacterModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          characterId={characterId}
          characterName={formData.name || 'Untitled Character'}
        />
      )}

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

      {/* Add Story Character Modal */}
      <Modal
        isOpen={addStoryCharacterModalOpen}
        onClose={() => setAddStoryCharacterModalOpen(false)}
        title="Add Story Character"
        description="Add an NPC related to this character"
      >
        <div className="space-y-4 py-4">
          <div>
            <FormLabel>Name</FormLabel>
            <input
              type="text"
              placeholder="Character name"
              value={storyCharForm.name}
              onChange={(e) => setStoryCharForm(prev => ({ ...prev, name: e.target.value }))}
              className={inputStyles}
            />
          </div>
          <div>
            <FormLabel>Relationship</FormLabel>
            <select
              value={storyCharForm.relationship}
              onChange={(e) => setStoryCharForm(prev => ({ ...prev, relationship: e.target.value }))}
              className={inputStyles}
            >
              <option value="mentor">Mentor</option>
              <option value="father">Father</option>
              <option value="mother">Mother</option>
              <option value="sibling">Sibling</option>
              <option value="rival">Rival</option>
              <option value="familiar">Familiar</option>
              <option value="love_interest">Love Interest</option>
              <option value="criminal_contact">Criminal Contact</option>
              <option value="friend">Friend</option>
              <option value="enemy">Enemy</option>
              <option value="employer">Employer</option>
              <option value="family">Family</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <FormLabel>Tagline</FormLabel>
            <input
              type="text"
              placeholder="Brief description"
              value={storyCharForm.tagline}
              onChange={(e) => setStoryCharForm(prev => ({ ...prev, tagline: e.target.value }))}
              className={inputStyles}
            />
          </div>
          <div>
            <FormLabel>Notes</FormLabel>
            <textarea
              placeholder="Additional notes..."
              value={storyCharForm.notes}
              onChange={(e) => setStoryCharForm(prev => ({ ...prev, notes: e.target.value }))}
              className={textareaStyles}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button className="btn btn-secondary" onClick={() => setAddStoryCharacterModalOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddStoryCharacter}>Add Character</button>
        </div>
      </Modal>

      {/* Add Journal Entry Modal */}
      <Modal
        isOpen={addJournalModalOpen}
        onClose={() => setAddJournalModalOpen(false)}
        title="Add Journal Entry"
        description="Record a new adventure or experience"
      >
        <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FormLabel>Session Number</FormLabel>
              <input
                type="number"
                placeholder="1, 2, 3..."
                value={journalForm.session_number}
                onChange={(e) => setJournalForm(prev => ({ ...prev, session_number: e.target.value }))}
                className={inputStyles}
              />
            </div>
            <div>
              <FormLabel>Date</FormLabel>
              <input
                type="date"
                value={journalForm.session_date}
                onChange={(e) => setJournalForm(prev => ({ ...prev, session_date: e.target.value }))}
                className={inputStyles}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FormLabel>Title</FormLabel>
              <input
                type="text"
                placeholder="Entry title (optional)"
                value={journalForm.title}
                onChange={(e) => setJournalForm(prev => ({ ...prev, title: e.target.value }))}
                className={inputStyles}
              />
            </div>
            <div>
              <FormLabel>Campaign</FormLabel>
              <input
                type="text"
                placeholder="Campaign name"
                value={journalForm.campaign_name}
                onChange={(e) => setJournalForm(prev => ({ ...prev, campaign_name: e.target.value }))}
                className={inputStyles}
              />
            </div>
          </div>
          <div>
            <FormLabel>Summary</FormLabel>
            <input
              type="text"
              placeholder="Brief summary of the session"
              value={journalForm.summary}
              onChange={(e) => setJournalForm(prev => ({ ...prev, summary: e.target.value }))}
              className={inputStyles}
            />
          </div>
          <div>
            <FormLabel>Notes</FormLabel>
            <textarea
              placeholder="What happened this session?"
              value={journalForm.notes}
              onChange={(e) => setJournalForm(prev => ({ ...prev, notes: e.target.value }))}
              className={cn(textareaStyles, "min-h-[120px]")}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FormLabel>Kill Count</FormLabel>
              <input
                type="number"
                placeholder="0"
                value={journalForm.kill_count}
                onChange={(e) => setJournalForm(prev => ({ ...prev, kill_count: e.target.value }))}
                className={inputStyles}
              />
            </div>
            <div>
              <FormLabel>Loot</FormLabel>
              <input
                type="text"
                placeholder="Items found..."
                value={journalForm.loot}
                onChange={(e) => setJournalForm(prev => ({ ...prev, loot: e.target.value }))}
                className={inputStyles}
              />
            </div>
          </div>
          <div>
            <FormLabel>Thoughts for Next Session</FormLabel>
            <textarea
              placeholder="Plans, questions, things to follow up on..."
              value={journalForm.thoughts_for_next}
              onChange={(e) => setJournalForm(prev => ({ ...prev, thoughts_for_next: e.target.value }))}
              className={textareaStyles}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button className="btn btn-secondary" onClick={() => setAddJournalModalOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddJournalEntry}>Add Entry</button>
        </div>
      </Modal>

      {/* Edit Journal Entry Modal */}
      <Modal
        isOpen={editJournalModalOpen}
        onClose={() => { setEditJournalModalOpen(false); setEditingJournal(null); }}
        title="Edit Journal Entry"
        description="Update this session entry"
      >
        <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FormLabel>Session Number</FormLabel>
              <input
                type="number"
                placeholder="1, 2, 3..."
                value={journalForm.session_number}
                onChange={(e) => setJournalForm(prev => ({ ...prev, session_number: e.target.value }))}
                className={inputStyles}
              />
            </div>
            <div>
              <FormLabel>Date</FormLabel>
              <input
                type="date"
                value={journalForm.session_date}
                onChange={(e) => setJournalForm(prev => ({ ...prev, session_date: e.target.value }))}
                className={inputStyles}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FormLabel>Title</FormLabel>
              <input
                type="text"
                placeholder="Entry title (optional)"
                value={journalForm.title}
                onChange={(e) => setJournalForm(prev => ({ ...prev, title: e.target.value }))}
                className={inputStyles}
              />
            </div>
            <div>
              <FormLabel>Campaign</FormLabel>
              <input
                type="text"
                placeholder="Campaign name"
                value={journalForm.campaign_name}
                onChange={(e) => setJournalForm(prev => ({ ...prev, campaign_name: e.target.value }))}
                className={inputStyles}
              />
            </div>
          </div>
          <div>
            <FormLabel>Summary</FormLabel>
            <input
              type="text"
              placeholder="Brief summary of the session"
              value={journalForm.summary}
              onChange={(e) => setJournalForm(prev => ({ ...prev, summary: e.target.value }))}
              className={inputStyles}
            />
          </div>
          <div>
            <FormLabel>Notes</FormLabel>
            <textarea
              placeholder="What happened this session?"
              value={journalForm.notes}
              onChange={(e) => setJournalForm(prev => ({ ...prev, notes: e.target.value }))}
              className={cn(textareaStyles, "min-h-[120px]")}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FormLabel>Kill Count</FormLabel>
              <input
                type="number"
                placeholder="0"
                value={journalForm.kill_count}
                onChange={(e) => setJournalForm(prev => ({ ...prev, kill_count: e.target.value }))}
                className={inputStyles}
              />
            </div>
            <div>
              <FormLabel>Loot</FormLabel>
              <input
                type="text"
                placeholder="Items found..."
                value={journalForm.loot}
                onChange={(e) => setJournalForm(prev => ({ ...prev, loot: e.target.value }))}
                className={inputStyles}
              />
            </div>
          </div>
          <div>
            <FormLabel>Thoughts for Next Session</FormLabel>
            <textarea
              placeholder="Plans, questions, things to follow up on..."
              value={journalForm.thoughts_for_next}
              onChange={(e) => setJournalForm(prev => ({ ...prev, thoughts_for_next: e.target.value }))}
              className={textareaStyles}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button className="btn btn-secondary" onClick={() => { setEditJournalModalOpen(false); setEditingJournal(null); }}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSaveJournal}>Save Changes</button>
        </div>
      </Modal>

      {/* Edit NPC Modal */}
      <Modal
        isOpen={editNPCModalOpen}
        onClose={() => { setEditNPCModalOpen(false); setEditingNPC(null); }}
        title="Edit NPC"
        description="Update NPC details"
      >
        <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FormLabel>Name</FormLabel>
              <input
                type="text"
                placeholder="NPC name"
                value={npcForm.related_name}
                onChange={(e) => setNpcForm(prev => ({ ...prev, related_name: e.target.value }))}
                className={inputStyles}
              />
            </div>
            <div>
              <FormLabel>Nickname</FormLabel>
              <input
                type="text"
                placeholder="Alias or nickname"
                value={npcForm.nickname}
                onChange={(e) => setNpcForm(prev => ({ ...prev, nickname: e.target.value }))}
                className={inputStyles}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FormLabel>Relationship Type</FormLabel>
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
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <FormLabel>Relationship Label</FormLabel>
              <input
                type="text"
                placeholder="e.g. 'Father', 'Old Friend'"
                value={npcForm.relationship_label}
                onChange={(e) => setNpcForm(prev => ({ ...prev, relationship_label: e.target.value }))}
                className={inputStyles}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FormLabel>Location</FormLabel>
              <input
                type="text"
                placeholder="Where they can be found"
                value={npcForm.location}
                onChange={(e) => setNpcForm(prev => ({ ...prev, location: e.target.value }))}
                className={inputStyles}
              />
            </div>
            <div>
              <FormLabel>Occupation</FormLabel>
              <input
                type="text"
                placeholder="Job or role"
                value={npcForm.occupation}
                onChange={(e) => setNpcForm(prev => ({ ...prev, occupation: e.target.value }))}
                className={inputStyles}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
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
          <div>
            <FormLabel>Needs (from PC)</FormLabel>
            <input
              type="text"
              placeholder="What they need from the character"
              value={npcForm.needs}
              onChange={(e) => setNpcForm(prev => ({ ...prev, needs: e.target.value }))}
              className={inputStyles}
            />
          </div>
          <div>
            <FormLabel>Can Provide</FormLabel>
            <input
              type="text"
              placeholder="What help or resources they can offer"
              value={npcForm.can_provide}
              onChange={(e) => setNpcForm(prev => ({ ...prev, can_provide: e.target.value }))}
              className={inputStyles}
            />
          </div>
          <div>
            <FormLabel>Goals</FormLabel>
            <input
              type="text"
              placeholder="Their personal goals"
              value={npcForm.goals}
              onChange={(e) => setNpcForm(prev => ({ ...prev, goals: e.target.value }))}
              className={inputStyles}
            />
          </div>
          <div>
            <FormLabel>Secrets</FormLabel>
            <input
              type="text"
              placeholder="Secrets about this NPC"
              value={npcForm.secrets}
              onChange={(e) => setNpcForm(prev => ({ ...prev, secrets: e.target.value }))}
              className={inputStyles}
            />
          </div>
          <div>
            <FormLabel>Full Notes</FormLabel>
            <textarea
              placeholder="All additional details about this NPC..."
              value={npcForm.full_notes}
              onChange={(e) => setNpcForm(prev => ({ ...prev, full_notes: e.target.value }))}
              className={cn(textareaStyles, "min-h-[120px]")}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button className="btn btn-secondary" onClick={() => { setEditNPCModalOpen(false); setEditingNPC(null); }}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSaveNPC}>Save Changes</button>
        </div>
      </Modal>

      {/* Add Companion Modal */}
      <Modal
        isOpen={addCompanionModalOpen}
        onClose={() => setAddCompanionModalOpen(false)}
        title="Add Companion"
        description="Add a familiar, pet, mount, or other companion"
      >
        <div className="space-y-4 py-4">
          <div>
            <FormLabel>Name</FormLabel>
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
          <div>
            <FormLabel>Description</FormLabel>
            <textarea
              placeholder="Appearance and personality..."
              value={companionForm.description}
              onChange={(e) => setCompanionForm(prev => ({ ...prev, description: e.target.value }))}
              className={textareaStyles}
            />
          </div>
          <div>
            <FormLabel>Abilities</FormLabel>
            <textarea
              placeholder="Special abilities, skills, or traits..."
              value={companionForm.companion_abilities}
              onChange={(e) => setCompanionForm(prev => ({ ...prev, companion_abilities: e.target.value }))}
              className={textareaStyles}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button className="btn btn-secondary" onClick={() => setAddCompanionModalOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddCompanion}>Add Companion</button>
        </div>
      </Modal>

      {/* Edit Companion Modal */}
      <Modal
        isOpen={editCompanionModalOpen}
        onClose={() => { setEditCompanionModalOpen(false); setEditingCompanion(null); }}
        title="Edit Companion"
        description="Update companion details"
      >
        <div className="space-y-4 py-4">
          <div>
            <FormLabel>Name</FormLabel>
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
          <div>
            <FormLabel>Description</FormLabel>
            <textarea
              placeholder="Appearance and personality..."
              value={companionForm.description}
              onChange={(e) => setCompanionForm(prev => ({ ...prev, description: e.target.value }))}
              className={textareaStyles}
            />
          </div>
          <div>
            <FormLabel>Abilities</FormLabel>
            <textarea
              placeholder="Special abilities, skills, or traits..."
              value={companionForm.companion_abilities}
              onChange={(e) => setCompanionForm(prev => ({ ...prev, companion_abilities: e.target.value }))}
              className={textareaStyles}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button className="btn btn-secondary" onClick={() => { setEditCompanionModalOpen(false); setEditingCompanion(null); }}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSaveCompanion}>Save Changes</button>
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
    </>
  )
}

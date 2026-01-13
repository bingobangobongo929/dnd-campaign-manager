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
} from 'lucide-react'
import { Modal } from '@/components/ui'
import { VaultImageCropModal } from './VaultImageCropModal'
import { ShareCharacterModal } from './ShareCharacterModal'
import type {
  VaultCharacter,
  StoryCharacter,
  PlayJournal,
  CharacterLink,
  CharacterLearnedFact,
  CharacterStatus
} from '@/types/database'
import { v4 as uuidv4 } from 'uuid'

// Section types for navigation
type SectionType = 'backstory' | 'details' | 'people' | 'journal' | 'stats' | 'gallery'

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
  { id: 'stats', label: 'Stats', icon: BarChart3 },
  { id: 'gallery', label: 'Gallery', icon: GalleryIcon },
]

export function CharacterEditor({ character, mode }: CharacterEditorProps) {
  const router = useRouter()
  const supabase = createClient()
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
    notes: character?.notes || '',
    type: (character?.type || 'npc') as 'pc' | 'npc',
    image_url: character?.image_url || null as string | null,
    detail_image_url: character?.detail_image_url || null as string | null,
    status: character?.status || 'Concept',
    status_color: character?.status_color || '#8B5CF6',
    race: character?.race || '',
    class: character?.class || '',
    background: character?.background || '',
    appearance: character?.appearance || '',
    personality: character?.personality || '',
    goals: character?.goals || '',
    secrets: character?.secrets || '',
    quotes: character?.quotes || [] as string[],
    common_phrases: character?.common_phrases || [] as string[],
    weaknesses: character?.weaknesses || [] as string[],
    plot_hooks: character?.plot_hooks || [] as string[],
    tldr: character?.tldr || [] as string[],
    theme_music_url: character?.theme_music_url || '',
    theme_music_title: character?.theme_music_title || '',
    character_sheet_url: character?.character_sheet_url || '',
    game_system: character?.game_system || '',
    external_campaign: character?.external_campaign || '',
    dm_name: character?.dm_name || '',
    campaign_started: character?.campaign_started || '',
    quick_stats: character?.quick_stats || null,
    inventory: character?.inventory || null,
    gold: character?.gold || 0,
  })

  const [characterId, setCharacterId] = useState<string | null>(character?.id || null)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
  const [showSecrets, setShowSecrets] = useState(false)

  // Related data
  const [storyCharacters, setStoryCharacters] = useState<StoryCharacter[]>([])
  const [journalEntries, setJournalEntries] = useState<PlayJournal[]>([])
  const [links, setLinks] = useState<CharacterLink[]>([])
  const [learnedFacts, setLearnedFacts] = useState<CharacterLearnedFact[]>([])
  const [customStatuses, setCustomStatuses] = useState<CharacterStatus[]>([])

  // Modals
  const [addLinkModalOpen, setAddLinkModalOpen] = useState(false)
  const [addStoryCharacterModalOpen, setAddStoryCharacterModalOpen] = useState(false)
  const [addJournalModalOpen, setAddJournalModalOpen] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false)

  // Crop modal state
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [pendingImageSrc, setPendingImageSrc] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

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
      const sectionIds: SectionType[] = ['backstory', 'details', 'people', 'journal', 'stats', 'gallery']
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
        { data: storyChars },
        { data: journal },
        { data: charLinks },
        { data: facts },
      ] = await Promise.all([
        supabase.from('story_characters').select('*').eq('character_id', characterId).order('sort_order'),
        supabase.from('play_journal').select('*').eq('character_id', characterId).order('session_date', { ascending: false }),
        supabase.from('character_links').select('*').eq('character_id', characterId).order('sort_order'),
        supabase.from('character_learned_facts').select('*').eq('character_id', characterId),
      ])

      if (storyChars) setStoryCharacters(storyChars)
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

  // Auto-save
  const saveCharacter = useCallback(async () => {
    if (!formData.name.trim()) return

    const characterData = {
      name: formData.name.trim(),
      summary: formData.summary.trim() || null,
      type: formData.type,
      image_url: formData.image_url,
      detail_image_url: formData.detail_image_url,
      notes: formData.notes,
      status: formData.status,
      status_color: formData.status_color,
      race: formData.race || null,
      class: formData.class || null,
      background: formData.background || null,
      appearance: formData.appearance || null,
      personality: formData.personality || null,
      goals: formData.goals || null,
      secrets: formData.secrets || null,
      quotes: formData.quotes.length > 0 ? formData.quotes : null,
      common_phrases: formData.common_phrases.length > 0 ? formData.common_phrases : null,
      weaknesses: formData.weaknesses.length > 0 ? formData.weaknesses : null,
      plot_hooks: formData.plot_hooks.length > 0 ? formData.plot_hooks : null,
      tldr: formData.tldr.length > 0 ? formData.tldr : null,
      theme_music_url: formData.theme_music_url || null,
      theme_music_title: formData.theme_music_title || null,
      character_sheet_url: formData.character_sheet_url || null,
      game_system: formData.game_system || null,
      external_campaign: formData.external_campaign || null,
      dm_name: formData.dm_name || null,
      campaign_started: formData.campaign_started || null,
      quick_stats: formData.quick_stats,
      inventory: formData.inventory,
      gold: formData.gold,
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
  }, [formData, characterId, supabase])

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
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); portraitInputRef.current?.click() }}
              disabled={isUploading}
              className="absolute bottom-2.5 right-2.5 p-2 bg-black/60 backdrop-blur-sm rounded-lg text-white/80 hover:text-white hover:bg-black/80 transition-all duration-200 border border-white/[0.08]"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => portraitInputRef.current?.click()}
            className="w-full aspect-[3/4] rounded-xl bg-white/[0.02] border border-dashed border-white/[0.1] flex flex-col items-center justify-center gap-3 transition-all duration-300 hover:border-purple-500/40 hover:bg-purple-500/[0.03] group cursor-pointer"
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
          <aside className="w-80 2xl:w-[340px] flex-shrink-0 flex flex-col border-r border-white/[0.06] overflow-hidden bg-[#0f0f11]">
            <div className="flex-1 overflow-y-auto px-6 py-6">
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
            <div className="max-w-4xl mx-auto px-8 xl:px-12 py-10">
              <div>

              {/* ═══════════════ BACKSTORY SECTION ═══════════════ */}
              <section id="backstory" className="scroll-mt-8 mb-16">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <BookOpen className="w-5 h-5 text-purple-400" />
                  </div>
                  <h2 className="text-base font-semibold text-white/90 uppercase tracking-wider">Backstory</h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-white/[0.06] to-transparent" />
                </div>

                <div className="space-y-8">
                  {/* Summary */}
                  <div>
                    <label className="block text-[13px] font-medium text-gray-400/90 mb-2.5">Summary</label>
                    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden focus-within:border-purple-500/30 focus-within:bg-white/[0.03] transition-all duration-200">
                      <EditorToolbar editor={summaryEditor} minimal />
                      <div className="px-5 py-4 min-h-[100px]">
                        <EditorContent editor={summaryEditor} className="prose prose-invert prose-sm max-w-none" />
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
                    <label className="block text-[13px] font-medium text-gray-400/90 mb-2.5">Full Backstory</label>
                    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden focus-within:border-purple-500/30 focus-within:bg-white/[0.03] transition-all duration-200">
                      <EditorToolbar editor={notesEditor} />
                      <div className="px-6 py-5 min-h-[350px]">
                        <EditorContent editor={notesEditor} className="prose prose-invert max-w-none" />
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
              <div className="flex items-center gap-6 my-10">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
              </div>

              {/* ═══════════════ DETAILS SECTION ═══════════════ */}
              <section id="details" className="scroll-mt-8 mb-16">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <FileText className="w-5 h-5 text-purple-400" />
                  </div>
                  <h2 className="text-base font-semibold text-white/90 uppercase tracking-wider">Details</h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-white/[0.06] to-transparent" />
                </div>

                <div className="space-y-6">
                  {/* Appearance */}
                  <div>
                    <label className="block text-[13px] font-medium text-gray-400/90 mb-2.5">Appearance</label>
                    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden focus-within:border-purple-500/30 focus-within:bg-white/[0.03] transition-all duration-200">
                      <textarea
                        value={formData.appearance}
                        onChange={(e) => setFormData(prev => ({ ...prev, appearance: e.target.value }))}
                        placeholder="Physical description, distinguishing features, typical attire..."
                        className="w-full px-5 py-4 min-h-[120px] text-[14px] bg-transparent text-white/80 placeholder:text-gray-600 focus:outline-none resize-none leading-relaxed"
                      />
                    </div>
                  </div>

                  {/* Personality */}
                  <div>
                    <label className="block text-[13px] font-medium text-gray-400/90 mb-2.5">Personality</label>
                    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden focus-within:border-purple-500/30 focus-within:bg-white/[0.03] transition-all duration-200">
                      <textarea
                        value={formData.personality}
                        onChange={(e) => setFormData(prev => ({ ...prev, personality: e.target.value }))}
                        placeholder="Temperament, quirks, mannerisms, how they interact with others..."
                        className="w-full px-5 py-4 min-h-[120px] text-[14px] bg-transparent text-white/80 placeholder:text-gray-600 focus:outline-none resize-none leading-relaxed"
                      />
                    </div>
                  </div>

                  {/* Goals */}
                  <div>
                    <label className="block text-[13px] font-medium text-gray-400/90 mb-2.5">Goals & Motivations</label>
                    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden focus-within:border-purple-500/30 focus-within:bg-white/[0.03] transition-all duration-200">
                      <textarea
                        value={formData.goals}
                        onChange={(e) => setFormData(prev => ({ ...prev, goals: e.target.value }))}
                        placeholder="What drives this character? What do they want to achieve?"
                        className="w-full px-5 py-4 min-h-[120px] text-[14px] bg-transparent text-white/80 placeholder:text-gray-600 focus:outline-none resize-none leading-relaxed"
                      />
                    </div>
                  </div>

                  {/* Secrets */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <label className="flex items-center gap-2 text-[13px] font-medium text-gray-400/90">
                        Secrets
                        <span className="text-[11px] bg-purple-500/15 text-purple-400 px-2 py-0.5 rounded-md border border-purple-500/20">Private</span>
                      </label>
                      <button
                        onClick={() => setShowSecrets(!showSecrets)}
                        className="flex items-center gap-1.5 text-[12px] text-gray-500 hover:text-purple-400 transition-all duration-200"
                      >
                        {showSecrets ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {showSecrets ? 'Hide' : 'Reveal'}
                      </button>
                    </div>
                    {showSecrets ? (
                      <div className="bg-white/[0.02] border border-red-500/20 rounded-xl overflow-hidden focus-within:border-red-500/40 transition-all duration-200">
                        <textarea
                          value={formData.secrets}
                          onChange={(e) => setFormData(prev => ({ ...prev, secrets: e.target.value }))}
                          placeholder="Hidden information, true motivations, dark secrets..."
                          className="w-full px-5 py-4 min-h-[120px] text-[14px] bg-transparent text-white/80 placeholder:text-gray-600 focus:outline-none resize-none leading-relaxed"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 bg-white/[0.015] border border-dashed border-white/[0.08] rounded-xl">
                        <p className="text-[13px] text-gray-500">Click "Reveal" to show secrets</p>
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
                  <div className="pt-2">
                    <label className="block text-[13px] font-medium text-gray-400/90 mb-3">Campaign Information</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[12px] text-gray-500 mb-1.5">Game System</label>
                        <input
                          type="text"
                          value={formData.game_system}
                          onChange={(e) => setFormData(prev => ({ ...prev, game_system: e.target.value }))}
                          placeholder="D&D 5e, Pathfinder 2e..."
                          className="w-full py-2.5 px-3.5 text-[14px] bg-white/[0.02] border border-white/[0.06] rounded-lg text-white/85 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.04] focus:border-purple-500/30 transition-all duration-200"
                        />
                      </div>
                      <div>
                        <label className="block text-[12px] text-gray-500 mb-1.5">Campaign Name</label>
                        <input
                          type="text"
                          value={formData.external_campaign}
                          onChange={(e) => setFormData(prev => ({ ...prev, external_campaign: e.target.value }))}
                          placeholder="The Lost Mines..."
                          className="w-full py-2.5 px-3.5 text-[14px] bg-white/[0.02] border border-white/[0.06] rounded-lg text-white/85 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.04] focus:border-purple-500/30 transition-all duration-200"
                        />
                      </div>
                      <div>
                        <label className="block text-[12px] text-gray-500 mb-1.5">DM Name</label>
                        <input
                          type="text"
                          value={formData.dm_name}
                          onChange={(e) => setFormData(prev => ({ ...prev, dm_name: e.target.value }))}
                          placeholder="Who runs this game?"
                          className="w-full py-2.5 px-3.5 text-[14px] bg-white/[0.02] border border-white/[0.06] rounded-lg text-white/85 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.04] focus:border-purple-500/30 transition-all duration-200"
                        />
                      </div>
                      <div>
                        <label className="block text-[12px] text-gray-500 mb-1.5">Campaign Started</label>
                        <input
                          type="text"
                          value={formData.campaign_started}
                          onChange={(e) => setFormData(prev => ({ ...prev, campaign_started: e.target.value }))}
                          placeholder="January 2024..."
                          className="w-full py-2.5 px-3.5 text-[14px] bg-white/[0.02] border border-white/[0.06] rounded-lg text-white/85 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.04] focus:border-purple-500/30 transition-all duration-200"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section Divider */}
              <div className="flex items-center gap-6 my-10">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
              </div>

              {/* ═══════════════ PEOPLE SECTION ═══════════════ */}
              <section id="people" className="scroll-mt-8 mb-16">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <Users className="w-5 h-5 text-purple-400" />
                  </div>
                  <h2 className="text-base font-semibold text-white/90 uppercase tracking-wider">People</h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-white/[0.06] to-transparent" />
                </div>

                <div className="space-y-6">
                  {/* Story Characters */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-[13px] font-medium text-gray-400/90">Story Characters</label>
                      <button
                        onClick={() => setAddStoryCharacterModalOpen(true)}
                        className="flex items-center gap-1.5 py-1.5 px-3 text-[12px] text-purple-400 bg-purple-500/10 rounded-lg hover:bg-purple-500/20 transition-all duration-200 border border-purple-500/20"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add
                      </button>
                    </div>

                    {storyCharacters.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 bg-white/[0.015] border border-dashed border-white/[0.08] rounded-xl">
                        <Users className="w-8 h-8 mb-3 text-gray-600" />
                        <p className="text-[13px] text-gray-500">No story characters yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {storyCharacters.map((char) => (
                          <div
                            key={char.id}
                            className="flex items-start gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/[0.04] hover:border-purple-500/20 transition-all duration-200"
                          >
                            {char.image_url ? (
                              <Image src={char.image_url} alt={char.name} width={40} height={40} className="rounded-lg object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-white/[0.04] flex items-center justify-center">
                                <User className="w-4 h-4 text-gray-500" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-[13px] font-medium text-white/90">{char.name}</span>
                                <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/15 text-purple-400 rounded-md capitalize border border-purple-500/20">
                                  {char.relationship.replace(/_/g, ' ')}
                                </span>
                              </div>
                              {char.tagline && <p className="text-[12px] text-gray-500">{char.tagline}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* What I've Learned */}
                  <div>
                    <label className="block text-[13px] font-medium text-gray-400/90 mb-3">Learned Facts</label>
                    {learnedFacts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 bg-white/[0.015] border border-dashed border-white/[0.08] rounded-xl">
                        <BookOpen className="w-8 h-8 mb-3 text-gray-600" />
                        <p className="text-[13px] text-gray-500">No learned facts recorded</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {learnedFacts.map((fact) => (
                          <div key={fact.id} className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                            <h4 className="text-[13px] font-medium text-white/90 mb-2">{fact.about_name}</h4>
                            <ul className="space-y-1">
                              {fact.facts?.map((f, i) => (
                                <li key={i} className="text-[12px] text-gray-500 flex items-start gap-2">
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
              <div className="flex items-center gap-6 my-10">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
              </div>

              {/* ═══════════════ JOURNAL SECTION ═══════════════ */}
              <section id="journal" className="scroll-mt-8 mb-16">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <Scroll className="w-5 h-5 text-purple-400" />
                  </div>
                  <h2 className="text-base font-semibold text-white/90 uppercase tracking-wider">Journal</h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-white/[0.06] to-transparent" />
                  <button
                    onClick={() => setAddJournalModalOpen(true)}
                    className="flex items-center gap-1.5 py-1.5 px-3 text-[12px] text-purple-400 bg-purple-500/10 rounded-lg hover:bg-purple-500/20 transition-all duration-200 border border-purple-500/20"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Entry
                  </button>
                </div>

                {journalEntries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 bg-white/[0.015] border border-dashed border-white/[0.08] rounded-xl">
                    <Scroll className="w-8 h-8 mb-3 text-gray-600" />
                    <p className="text-[13px] text-gray-500">No journal entries yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {journalEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.04] hover:border-purple-500/20 transition-all duration-200"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {entry.session_number && (
                              <span className="text-[11px] px-2 py-0.5 bg-yellow-500/15 text-yellow-400 rounded-md font-medium border border-yellow-500/20">
                                Session {entry.session_number}
                              </span>
                            )}
                            {entry.title && <span className="text-[13px] font-medium text-white/90">{entry.title}</span>}
                          </div>
                          {entry.session_date && (
                            <span className="text-[11px] text-gray-500">
                              {new Date(entry.session_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <p className="text-[13px] text-gray-400 whitespace-pre-wrap leading-relaxed">{entry.notes}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Section Divider */}
              <div className="flex items-center gap-6 my-10">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
              </div>

              {/* ═══════════════ STATS SECTION ═══════════════ */}
              <section id="stats" className="scroll-mt-8 mb-16">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <BarChart3 className="w-5 h-5 text-purple-400" />
                  </div>
                  <h2 className="text-base font-semibold text-white/90 uppercase tracking-wider">Stats</h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-white/[0.06] to-transparent" />
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[12px] text-gray-500 mb-1.5">Gold</label>
                    <input
                      type="number"
                      value={formData.gold}
                      onChange={(e) => setFormData(prev => ({ ...prev, gold: parseInt(e.target.value) || 0 }))}
                      className="w-32 py-2.5 px-3.5 text-[14px] bg-white/[0.02] border border-white/[0.06] rounded-lg text-yellow-400 font-medium focus:outline-none focus:bg-white/[0.04] focus:border-yellow-500/30 transition-all duration-200"
                    />
                  </div>

                  <div className="flex flex-col items-center justify-center py-12 bg-white/[0.015] border border-dashed border-white/[0.08] rounded-xl">
                    <BarChart3 className="w-8 h-8 mb-3 text-gray-600" />
                    <p className="text-[13px] text-gray-500">More stats coming soon</p>
                  </div>
                </div>
              </section>

              {/* Section Divider */}
              <div className="flex items-center gap-6 my-10">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
              </div>

              {/* ═══════════════ GALLERY SECTION ═══════════════ */}
              <section id="gallery" className="scroll-mt-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <GalleryIcon className="w-5 h-5 text-purple-400" />
                  </div>
                  <h2 className="text-base font-semibold text-white/90 uppercase tracking-wider">Gallery</h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-white/[0.06] to-transparent" />
                </div>

                <div className="flex flex-col items-center justify-center py-12 bg-white/[0.015] border border-dashed border-white/[0.08] rounded-xl">
                  <GalleryIcon className="w-8 h-8 mb-3 text-gray-600" />
                  <p className="text-[13px] text-gray-500">Gallery coming soon</p>
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
            <select className={inputStyles}>
              <option value="theme_music">Theme Music</option>
              <option value="character_sheet">Character Sheet</option>
              <option value="art_reference">Art Reference</option>
              <option value="inspiration">Inspiration</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <FormLabel>Title</FormLabel>
            <input type="text" placeholder="Link title" className={inputStyles} />
          </div>
          <div>
            <FormLabel>URL</FormLabel>
            <input type="url" placeholder="https://..." className={inputStyles} />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button className="btn btn-secondary" onClick={() => setAddLinkModalOpen(false)}>Cancel</button>
          <button className="btn btn-primary">Add Link</button>
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
            <input type="text" placeholder="Character name" className={inputStyles} />
          </div>
          <div>
            <FormLabel>Relationship</FormLabel>
            <select className={inputStyles}>
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
            <input type="text" placeholder="Brief description" className={inputStyles} />
          </div>
          <div>
            <FormLabel>Notes</FormLabel>
            <textarea placeholder="Additional notes..." className={textareaStyles} />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button className="btn btn-secondary" onClick={() => setAddStoryCharacterModalOpen(false)}>Cancel</button>
          <button className="btn btn-primary">Add Character</button>
        </div>
      </Modal>

      {/* Add Journal Entry Modal */}
      <Modal
        isOpen={addJournalModalOpen}
        onClose={() => setAddJournalModalOpen(false)}
        title="Add Journal Entry"
        description="Record a new adventure or experience"
      >
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FormLabel>Session Number</FormLabel>
              <input type="number" placeholder="1, 2, 3..." className={inputStyles} />
            </div>
            <div>
              <FormLabel>Date</FormLabel>
              <input type="date" className={inputStyles} />
            </div>
          </div>
          <div>
            <FormLabel>Title</FormLabel>
            <input type="text" placeholder="Entry title (optional)" className={inputStyles} />
          </div>
          <div>
            <FormLabel>Notes</FormLabel>
            <textarea placeholder="What happened this session?" className={cn(textareaStyles, "min-h-[180px]")} />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button className="btn btn-secondary" onClick={() => setAddJournalModalOpen(false)}>Cancel</button>
          <button className="btn btn-primary">Add Entry</button>
        </div>
      </Modal>
    </>
  )
}

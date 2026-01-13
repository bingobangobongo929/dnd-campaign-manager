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
  MoreHorizontal,
  Scroll,
  BookOpen,
  UserPlus,
  Target,
  Eye,
  EyeOff,
  ArrowLeft,
} from 'lucide-react'
import { Modal } from '@/components/ui'
import { VaultImageCropModal } from './VaultImageCropModal'
import type {
  VaultCharacter,
  StoryCharacter,
  PlayJournal,
  CharacterLink,
  CharacterLearnedFact,
  CharacterStatus
} from '@/types/database'
import { v4 as uuidv4 } from 'uuid'

// Tab types
type TabType = 'backstory' | 'details' | 'people' | 'journal' | 'more'

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

export function CharacterEditor({ character, mode }: CharacterEditorProps) {
  const router = useRouter()
  const supabase = createClient()
  const imageInputRef = useRef<HTMLInputElement>(null)
  const portraitInputRef = useRef<HTMLInputElement>(null)
  const isCreateMode = mode === 'create'

  // Active tab
  const [activeTab, setActiveTab] = useState<TabType>('backstory')

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
        class: 'prose prose-invert prose-sm max-w-none focus:outline-none min-h-[150px] p-5 prose-p:text-gray-300 prose-p:my-2',
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
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[300px] p-5 prose-headings:text-white prose-p:text-gray-300 prose-p:my-2 prose-ul:text-gray-300 prose-li:text-gray-300 prose-blockquote:border-l-purple-500 prose-blockquote:text-gray-400',
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

  // Toolbar button component - subtle, modern
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
        'p-2 rounded-md transition-colors',
        active
          ? 'bg-purple-500/20 text-purple-400'
          : 'text-gray-500 hover:text-white hover:bg-white/10',
        disabled && 'opacity-30 cursor-not-allowed hover:bg-transparent hover:text-gray-500'
      )}
    >
      {children}
    </button>
  )

  // Editor toolbar - subtle, Google Docs style
  const EditorToolbar = ({ editor }: { editor: any }) => (
    <div className="flex items-center px-3 py-2 border-b border-white/5 bg-white/[0.02]">
      <div className="flex items-center">
        <ToolbarButton onClick={() => editor?.chain().focus().undo().run()} disabled={!editor?.can().undo()} title="Undo">
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().redo().run()} disabled={!editor?.can().redo()} title="Redo">
          <Redo className="h-4 w-4" />
        </ToolbarButton>
      </div>
      <div className="w-px h-5 bg-white/10 mx-2" />
      <div className="flex items-center">
        <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive('heading', { level: 1 })} title="Heading 1">
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })} title="Heading 2">
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
      </div>
      <div className="w-px h-5 bg-white/10 mx-2" />
      <div className="flex items-center">
        <ToolbarButton onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')} title="Bold">
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')} title="Italic">
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive('underline')} title="Underline">
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleStrike().run()} active={editor?.isActive('strike')} title="Strikethrough">
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleHighlight().run()} active={editor?.isActive('highlight')} title="Highlight">
          <Highlighter className="h-4 w-4" />
        </ToolbarButton>
      </div>
      <div className="w-px h-5 bg-white/10 mx-2" />
      <div className="flex items-center">
        <ToolbarButton onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')} title="Bullet List">
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')} title="Numbered List">
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive('blockquote')} title="Quote">
          <Quote className="h-4 w-4" />
        </ToolbarButton>
      </div>
      <div className="w-px h-5 bg-white/10 mx-2" />
      <div className="flex items-center">
        <ToolbarButton onClick={() => setLink(editor)} active={editor?.isActive('link')} title="Link">
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleEditorImageUpload} />
        <ToolbarButton onClick={() => imageInputRef.current?.click()} title="Insert Image">
          <ImageIcon className="h-4 w-4" />
        </ToolbarButton>
      </div>
    </div>
  )

  // Section header component - subtle, Notion-style
  const SectionHeader = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-center gap-3 mb-3">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
        {children}
      </span>
      <div className="flex-1 h-px bg-white/5" />
    </div>
  )

  // Form label component
  const FormLabel = ({ children }: { children: React.ReactNode }) => (
    <label className="text-sm font-medium text-gray-400 mb-2 block">
      {children}
    </label>
  )

  // Form input styles - larger, more comfortable
  const inputStyles = "w-full px-4 py-3 min-h-[48px] bg-white/5 border border-white/10 rounded-lg text-base text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/25 transition-all"
  const textareaStyles = cn(inputStyles, "min-h-[140px] resize-none")

  // Status dropdown
  const StatusDropdown = () => {
    const allStatuses = [...DEFAULT_STATUSES, ...customStatuses.map(s => ({ name: s.name, color: s.color }))]

    return (
      <div className="relative">
        <button
          onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
          className="flex items-center gap-3 w-full px-4 py-3 min-h-[48px] bg-white/5 border border-white/10 rounded-lg hover:border-purple-500/30 transition-all"
        >
          <div
            className="w-3 h-3 rounded-full ring-2 ring-offset-1 ring-offset-transparent"
            style={{ backgroundColor: formData.status_color, boxShadow: `0 0 8px ${formData.status_color}40` }}
          />
          <span className="text-white flex-1 text-left">{formData.status}</span>
          <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", statusDropdownOpen && "rotate-180")} />
        </button>

        {statusDropdownOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setStatusDropdownOpen(false)} />
            <div className="absolute top-full left-0 mt-2 w-full bg-[#1a1a24] border border-white/10 rounded-lg shadow-xl z-50 py-2 overflow-hidden">
              {allStatuses.map((s) => (
                <button
                  key={s.name}
                  onClick={() => {
                    setFormData(prev => ({ ...prev, status: s.name, status_color: s.color }))
                    setStatusDropdownOpen(false)
                  }}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 w-full hover:bg-white/5 transition-colors",
                    formData.status === s.name && "bg-purple-500/10"
                  )}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: s.color, boxShadow: `0 0 6px ${s.color}60` }}
                  />
                  <span className="text-white">{s.name}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  // Array field editor
  const ArrayFieldEditor = ({
    label,
    items,
    placeholder,
    onChange
  }: {
    label: string
    items: string[]
    placeholder: string
    onChange: (items: string[]) => void
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
      <div className="space-y-4">
        <SectionHeader>{label}</SectionHeader>
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="flex items-start gap-3 group">
              <span className="text-purple-400 mt-3.5">•</span>
              <div className="flex-1 px-4 py-3 bg-white/[0.03] border border-white/10 rounded-lg text-base text-gray-300">
                {item}
              </div>
              <button
                onClick={() => removeItem(index)}
                className="p-2.5 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all mt-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem())}
            placeholder={placeholder}
            className={inputStyles}
          />
          <button
            onClick={addItem}
            disabled={!newItem.trim()}
            className="px-5 py-3 min-h-[48px] bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors disabled:opacity-50 disabled:hover:bg-purple-500/20 flex items-center justify-center"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
    )
  }

  // Portrait display
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
            <div
              className="relative w-full aspect-[3/4] overflow-hidden rounded-xl border border-purple-500/30 bg-black cursor-pointer transition-all hover:border-purple-500/50"
              style={{ boxShadow: '0 0 20px rgba(139, 92, 246, 0.1)' }}
              onClick={() => setLightboxOpen(true)}
            >
              <Image
                src={displayUrl}
                alt={formData.name || 'Character portrait'}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="320px"
              />
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-sm font-medium">View Full Size</span>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); portraitInputRef.current?.click() }}
              disabled={isUploading}
              className="absolute bottom-3 right-3 p-2.5 bg-black/70 backdrop-blur-sm rounded-lg text-white hover:bg-black/90 transition-colors border border-white/10"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => portraitInputRef.current?.click()}
            className="w-full aspect-[3/4] rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-3 transition-all hover:border-purple-500/50 hover:bg-white/[0.08] group cursor-pointer"
          >
            {formData.name ? (
              <span className="text-5xl font-bold text-gray-600 group-hover:text-gray-500 transition-colors">
                {getInitials(formData.name)}
              </span>
            ) : (
              <Camera className="w-10 h-10 text-gray-600 group-hover:text-purple-400 transition-colors" />
            )}
            <span className="text-sm text-gray-500 group-hover:text-gray-400 transition-colors">
              Click to upload portrait
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

  // =====================================================
  // TAB CONTENT
  // =====================================================

  const BackstoryTab = () => (
    <div className="space-y-8">
      {/* Summary */}
      <div>
        <SectionHeader>Summary</SectionHeader>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden focus-within:border-purple-500/20 transition-colors">
          <EditorToolbar editor={summaryEditor} />
          <div className="p-5 min-h-[150px]">
            <EditorContent editor={summaryEditor} />
          </div>
        </div>
      </div>

      {/* Quick Summary */}
      <ArrayFieldEditor
        label="Quick Summary"
        items={formData.tldr}
        placeholder="Add a quick fact about this character..."
        onChange={(items) => setFormData(prev => ({ ...prev, tldr: items }))}
      />

      {/* Full Backstory - This is the main content, should be tall */}
      <div>
        <SectionHeader>Full Backstory</SectionHeader>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden focus-within:border-purple-500/20 transition-colors">
          <EditorToolbar editor={notesEditor} />
          <div className="p-6 min-h-[400px] lg:min-h-[500px] xl:min-h-[600px]">
            <EditorContent editor={notesEditor} />
          </div>
        </div>
      </div>

      {/* Plot Hooks */}
      <ArrayFieldEditor
        label="Plot Hooks"
        items={formData.plot_hooks}
        placeholder="Add a story hook for the DM..."
        onChange={(items) => setFormData(prev => ({ ...prev, plot_hooks: items }))}
      />

      {/* Quotes */}
      <ArrayFieldEditor
        label="Memorable Quotes"
        items={formData.quotes}
        placeholder="Add a memorable quote..."
        onChange={(items) => setFormData(prev => ({ ...prev, quotes: items }))}
      />
    </div>
  )

  const DetailsTab = () => (
    <div className="space-y-8">
      {/* Appearance */}
      <div>
        <SectionHeader>Appearance</SectionHeader>
        <textarea
          value={formData.appearance}
          onChange={(e) => setFormData(prev => ({ ...prev, appearance: e.target.value }))}
          placeholder="Physical description, distinguishing features, typical attire..."
          className={textareaStyles}
        />
      </div>

      {/* Personality */}
      <div>
        <SectionHeader>Personality</SectionHeader>
        <textarea
          value={formData.personality}
          onChange={(e) => setFormData(prev => ({ ...prev, personality: e.target.value }))}
          placeholder="Temperament, quirks, mannerisms, how they interact with others..."
          className={textareaStyles}
        />
      </div>

      {/* Goals */}
      <div>
        <SectionHeader>Goals & Motivations</SectionHeader>
        <textarea
          value={formData.goals}
          onChange={(e) => setFormData(prev => ({ ...prev, goals: e.target.value }))}
          placeholder="What drives this character? What do they want to achieve?"
          className={textareaStyles}
        />
      </div>

      {/* Secrets */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
            Secrets (DM Eyes Only)
          </h2>
          <button
            onClick={() => setShowSecrets(!showSecrets)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-purple-400 transition-colors"
          >
            {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showSecrets ? 'Hide' : 'Reveal'}
          </button>
        </div>
        <div className="h-px bg-gradient-to-r from-red-500/50 to-transparent mb-4" />
        {showSecrets ? (
          <textarea
            value={formData.secrets}
            onChange={(e) => setFormData(prev => ({ ...prev, secrets: e.target.value }))}
            placeholder="Hidden information, true motivations, dark secrets..."
            className={cn(textareaStyles, "border-red-500/30 focus:border-red-500/50 focus:ring-red-500/25")}
          />
        ) : (
          <div className="px-4 py-6 bg-white/[0.02] border border-white/10 rounded-xl text-gray-500 text-center italic">
            Click "Reveal" to show secret information
          </div>
        )}
      </div>

      {/* Common Phrases */}
      <ArrayFieldEditor
        label="Common Phrases"
        items={formData.common_phrases}
        placeholder="Add a catchphrase or common saying..."
        onChange={(items) => setFormData(prev => ({ ...prev, common_phrases: items }))}
      />

      {/* Weaknesses */}
      <ArrayFieldEditor
        label="Weaknesses & Flaws"
        items={formData.weaknesses}
        placeholder="Add a weakness or character flaw..."
        onChange={(items) => setFormData(prev => ({ ...prev, weaknesses: items }))}
      />

      {/* Campaign Info */}
      <div>
        <SectionHeader>Campaign Information</SectionHeader>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FormLabel>Game System</FormLabel>
            <input
              type="text"
              value={formData.game_system}
              onChange={(e) => setFormData(prev => ({ ...prev, game_system: e.target.value }))}
              placeholder="D&D 5e, Pathfinder 2e..."
              className={inputStyles}
            />
          </div>
          <div>
            <FormLabel>Campaign Name</FormLabel>
            <input
              type="text"
              value={formData.external_campaign}
              onChange={(e) => setFormData(prev => ({ ...prev, external_campaign: e.target.value }))}
              placeholder="The Lost Mines..."
              className={inputStyles}
            />
          </div>
          <div>
            <FormLabel>DM Name</FormLabel>
            <input
              type="text"
              value={formData.dm_name}
              onChange={(e) => setFormData(prev => ({ ...prev, dm_name: e.target.value }))}
              placeholder="Who runs this game?"
              className={inputStyles}
            />
          </div>
          <div>
            <FormLabel>Campaign Started</FormLabel>
            <input
              type="text"
              value={formData.campaign_started}
              onChange={(e) => setFormData(prev => ({ ...prev, campaign_started: e.target.value }))}
              placeholder="January 2024..."
              className={inputStyles}
            />
          </div>
        </div>
      </div>
    </div>
  )

  const PeopleTab = () => (
    <div className="space-y-8">
      {/* Story Characters */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <SectionHeader>Story Characters</SectionHeader>
          <button
            onClick={() => setAddStoryCharacterModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors text-sm font-medium"
          >
            <UserPlus className="w-4 h-4" />
            Add Character
          </button>
        </div>

        {storyCharacters.length === 0 ? (
          <div className="text-center py-12 bg-white/[0.02] rounded-xl border border-white/5">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p className="text-gray-400 mb-1">No story characters yet</p>
            <p className="text-sm text-gray-500">Add NPCs connected to this character's story</p>
          </div>
        ) : (
          <div className="space-y-3">
            {storyCharacters.map((char) => (
              <div
                key={char.id}
                className="flex items-start gap-4 p-4 bg-white/[0.03] rounded-xl border border-white/5 hover:border-purple-500/20 transition-colors"
              >
                {char.image_url ? (
                  <Image src={char.image_url} alt={char.name} width={56} height={56} className="rounded-lg object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-white/5 flex items-center justify-center">
                    <User className="w-6 h-6 text-gray-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-white">{char.name}</span>
                    <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full capitalize">
                      {char.relationship.replace(/_/g, ' ')}
                    </span>
                  </div>
                  {char.tagline && <p className="text-sm text-gray-400">{char.tagline}</p>}
                  {char.notes && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{char.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Learned Facts */}
      <div>
        <SectionHeader>What I've Learned About Others</SectionHeader>
        {learnedFacts.length === 0 ? (
          <div className="text-center py-12 bg-white/[0.02] rounded-xl border border-white/5">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p className="text-gray-400">No learned facts recorded</p>
          </div>
        ) : (
          <div className="space-y-4">
            {learnedFacts.map((fact) => (
              <div key={fact.id} className="p-4 bg-white/[0.03] rounded-xl border border-white/5">
                <h4 className="font-medium text-white mb-3">{fact.about_name}</h4>
                <ul className="space-y-2">
                  {fact.facts?.map((f, i) => (
                    <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                      <span className="text-purple-400 mt-0.5">•</span>
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
  )

  const JournalTab = () => (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <SectionHeader>Play Journal</SectionHeader>
        <button
          onClick={() => setAddJournalModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Entry
        </button>
      </div>

      {journalEntries.length === 0 ? (
        <div className="text-center py-16 bg-white/[0.02] rounded-xl border border-white/5">
          <Scroll className="w-12 h-12 mx-auto mb-3 text-gray-600" />
          <p className="text-gray-400 mb-1">No journal entries yet</p>
          <p className="text-sm text-gray-500">Record your adventures and experiences</p>
        </div>
      ) : (
        <div className="space-y-4">
          {journalEntries.map((entry) => (
            <div
              key={entry.id}
              className="p-5 bg-white/[0.03] rounded-xl border border-white/5 hover:border-purple-500/20 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {entry.session_number && (
                    <span className="text-xs px-2.5 py-1 bg-yellow-500/20 text-yellow-400 rounded-full font-medium">
                      Session {entry.session_number}
                    </span>
                  )}
                  {entry.title && <span className="font-medium text-white">{entry.title}</span>}
                </div>
                {entry.session_date && (
                  <span className="text-sm text-gray-500">
                    {new Date(entry.session_date).toLocaleDateString()}
                  </span>
                )}
              </div>
              <p className="text-gray-400 whitespace-pre-wrap leading-relaxed">{entry.notes}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const MoreTab = () => (
    <div className="space-y-8">
      {/* Quick Stats */}
      <div>
        <SectionHeader>Quick Stats</SectionHeader>
        <p className="text-sm text-gray-500 mb-4">Configure your stat block for quick reference during play.</p>
        <div className="p-8 bg-white/[0.02] rounded-xl border border-white/5 text-center">
          <Target className="w-10 h-10 mx-auto mb-3 text-gray-600" />
          <p className="text-gray-400">Quick Stats coming soon</p>
        </div>
      </div>

      {/* Inventory */}
      <div>
        <SectionHeader>Inventory</SectionHeader>
        <div className="flex items-center gap-4 mb-4">
          <FormLabel>Gold</FormLabel>
          <input
            type="number"
            value={formData.gold}
            onChange={(e) => setFormData(prev => ({ ...prev, gold: parseInt(e.target.value) || 0 }))}
            className="w-32 px-4 py-2 bg-white/5 border border-yellow-500/30 rounded-lg text-yellow-400 font-medium focus:outline-none focus:border-yellow-500/50"
          />
        </div>
        <div className="p-8 bg-white/[0.02] rounded-xl border border-white/5 text-center">
          <p className="text-gray-400">Inventory tracking coming soon</p>
        </div>
      </div>
    </div>
  )

  if (!notesEditor || !summaryEditor) return null

  // Tab configuration
  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'backstory', label: 'Backstory', icon: <Scroll className="w-4 h-4" /> },
    { id: 'details', label: 'Details', icon: <FileText className="w-4 h-4" /> },
    { id: 'people', label: 'People', icon: <Users className="w-4 h-4" /> },
    { id: 'journal', label: 'Journal', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'more', label: 'More', icon: <MoreHorizontal className="w-4 h-4" /> },
  ]

  // =====================================================
  // MAIN RENDER
  // =====================================================

  return (
    <>
      <div className="fixed inset-0 z-50 bg-[#0a0a0f] flex flex-col">
        {/* Header */}
        <header className="flex-shrink-0 flex items-center justify-between px-4 h-14 border-b border-white/10 bg-[#0d0d14]">
          <div className="flex items-center gap-4">
            <button
              onClick={handleClose}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back to Vault</span>
            </button>
            <div className="w-px h-6 bg-white/10" />
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                formData.type === 'pc' ? "bg-purple-500/20 text-purple-400" : "bg-gray-500/20 text-gray-400"
              )}>
                {formData.type === 'pc' ? <User className="w-5 h-5" /> : <Users className="w-5 h-5" />}
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">
                  {formData.name || (isCreateMode ? 'New Character' : 'Edit Character')}
                </h1>
                <p className="text-xs text-gray-500">
                  {status === 'saving' ? 'Saving...' : status === 'saved' ? 'All changes saved' : 'Enter a name to start'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {characterId && (
              <>
                <button
                  onClick={() => setShareModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-white/5 transition-colors text-gray-400 hover:text-white"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="text-sm">Share</span>
                </button>
                <button
                  onClick={() => setDuplicateModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-white/5 transition-colors text-gray-400 hover:text-white"
                >
                  <Copy className="w-4 h-4" />
                  <span className="text-sm">Duplicate</span>
                </button>
              </>
            )}
          </div>
        </header>

        {/* Main Content - Fills ALL remaining space */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Left Sidebar - responsive width */}
          <aside className="w-80 xl:w-96 flex-shrink-0 border-r border-white/10 p-6 overflow-y-auto bg-[#0d0d14]">
            <div className="space-y-6">
              {/* Portrait */}
              <div className="mb-8">
                <PortraitDisplay />
              </div>

              {/* Name */}
              <div>
                <FormLabel>Character Name</FormLabel>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter name..."
                  className={inputStyles}
                />
              </div>

              {/* Type Toggle */}
              <div>
                <FormLabel>Character Type</FormLabel>
                <div className="flex bg-white/5 rounded-lg p-1.5">
                  <button
                    onClick={() => setFormData(prev => ({ ...prev, type: 'pc' }))}
                    className={cn(
                      'flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all',
                      formData.type === 'pc'
                        ? 'bg-purple-600 text-white shadow-lg'
                        : 'text-gray-400 hover:text-white'
                    )}
                  >
                    Player Character
                  </button>
                  <button
                    onClick={() => setFormData(prev => ({ ...prev, type: 'npc' }))}
                    className={cn(
                      'flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all',
                      formData.type === 'npc'
                        ? 'bg-gray-600 text-white shadow-lg'
                        : 'text-gray-400 hover:text-white'
                    )}
                  >
                    NPC
                  </button>
                </div>
              </div>

              {/* Status */}
              <div>
                <FormLabel>Status</FormLabel>
                <StatusDropdown />
              </div>

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-purple-500/30 via-white/10 to-transparent" />

              {/* Details Section */}
              <div className="space-y-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</p>
                <div>
                  <FormLabel>Race</FormLabel>
                  <input
                    type="text"
                    value={formData.race}
                    onChange={(e) => setFormData(prev => ({ ...prev, race: e.target.value }))}
                    placeholder="Human, Elf, Dwarf..."
                    className={inputStyles}
                  />
                </div>
                <div>
                  <FormLabel>Class</FormLabel>
                  <input
                    type="text"
                    value={formData.class}
                    onChange={(e) => setFormData(prev => ({ ...prev, class: e.target.value }))}
                    placeholder="Fighter, Wizard, Rogue..."
                    className={inputStyles}
                  />
                </div>
                <div>
                  <FormLabel>Background</FormLabel>
                  <input
                    type="text"
                    value={formData.background}
                    onChange={(e) => setFormData(prev => ({ ...prev, background: e.target.value }))}
                    placeholder="Noble, Criminal, Sage..."
                    className={inputStyles}
                  />
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-purple-500/30 via-white/10 to-transparent" />

              {/* Links Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Links</p>
                  <button
                    onClick={() => setAddLinkModalOpen(true)}
                    className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-gray-500 hover:text-purple-400"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {formData.theme_music_url && (
                  <a
                    href={formData.theme_music_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/5 hover:border-purple-500/30 transition-all group"
                  >
                    <Music className="w-5 h-5 text-purple-400" />
                    <span className="text-sm text-gray-300 flex-1 truncate group-hover:text-white transition-colors">
                      {formData.theme_music_title || 'Theme Music'}
                    </span>
                    <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-purple-400 transition-colors" />
                  </a>
                )}

                {formData.character_sheet_url && (
                  <a
                    href={formData.character_sheet_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/5 hover:border-yellow-500/30 transition-all group"
                  >
                    <FileText className="w-5 h-5 text-yellow-400" />
                    <span className="text-sm text-gray-300 flex-1 truncate group-hover:text-white transition-colors">Character Sheet</span>
                    <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-yellow-400 transition-colors" />
                  </a>
                )}

                {links.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/5 hover:border-white/20 transition-all group"
                  >
                    <ExternalLink className="w-5 h-5 text-gray-500" />
                    <span className="text-sm text-gray-300 flex-1 truncate group-hover:text-white transition-colors">{link.title}</span>
                  </a>
                ))}

                {!formData.theme_music_url && !formData.character_sheet_url && links.length === 0 && (
                  <button
                    onClick={() => setAddLinkModalOpen(true)}
                    className="w-full py-3 px-4 border border-dashed border-white/20 rounded-lg text-gray-400 hover:border-purple-500/50 hover:text-purple-400 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Link
                  </button>
                )}
              </div>

              {/* Delete Button */}
              {characterId && (
                <>
                  <div className="h-px bg-white/5" />
                  <button
                    onClick={() => setIsDeleteConfirmOpen(true)}
                    className="flex items-center gap-2 w-full px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="text-sm font-medium">Delete Character</span>
                  </button>
                </>
              )}
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 flex flex-col overflow-hidden min-h-0">
            {/* Tabs - Fixed height */}
            <div className="flex-shrink-0 border-b border-white/10 bg-[#0d0d14]/50">
              <nav className="flex px-6 gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg transition-all',
                      activeTab === tab.id
                        ? 'bg-white/5 text-white border-b-2 border-purple-500 -mb-px'
                        : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.02]'
                    )}
                  >
                    {tab.icon}
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content - Fills ALL remaining space, NO max-width */}
            <div className="flex-1 overflow-y-auto p-6 lg:p-8 xl:p-10">
              {activeTab === 'backstory' && <BackstoryTab />}
              {activeTab === 'details' && <DetailsTab />}
              {activeTab === 'people' && <PeopleTab />}
              {activeTab === 'journal' && <JournalTab />}
              {activeTab === 'more' && <MoreTab />}
            </div>
          </main>
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
      <Modal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        title="Share Character"
        description="Generate a shareable link for this character"
      >
        <div className="py-8 text-center">
          <Share2 className="w-12 h-12 mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400">Share functionality coming soon</p>
        </div>
        <div className="flex justify-end gap-3">
          <button className="btn btn-secondary" onClick={() => setShareModalOpen(false)}>Close</button>
        </div>
      </Modal>

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

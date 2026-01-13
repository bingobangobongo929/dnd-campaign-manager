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
  Maximize2,
  Minimize2,
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
  Upload,
  Camera,
  Copy,
  Share2,
  ChevronDown,
  Plus,
  ExternalLink,
  Music,
  FileText,
  Palette,
  Lightbulb,
  MoreHorizontal,
  Heart,
  Swords,
  Crown,
  Scroll,
  BookOpen,
  UserPlus,
  MessageSquare,
  Target,
  Eye,
  EyeOff,
  Sparkles,
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
    // New fields
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
  const [isFullscreen, setIsFullscreen] = useState(true) // Default to fullscreen for new editor
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
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-[--arcane-purple] underline' } }),
      Highlight.configure({ HTMLAttributes: { class: 'bg-[--arcane-gold]/30 px-1 rounded' } }),
      Underline,
    ],
    content: formData.summary || '',
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-invert prose-sm max-w-none',
          'focus:outline-none min-h-[100px] p-4',
          'prose-headings:text-[--text-primary] prose-headings:font-semibold',
          'prose-p:text-[--text-primary] prose-p:my-1',
          'prose-strong:text-[--text-primary]',
        ),
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
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-[--arcane-purple] underline' } }),
      Highlight.configure({ HTMLAttributes: { class: 'bg-[--arcane-gold]/30 px-1 rounded' } }),
      TiptapImage.configure({ HTMLAttributes: { class: 'rounded-lg max-w-full' } }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: formData.notes,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-invert max-w-none',
          'focus:outline-none min-h-[300px] p-4',
          'prose-headings:text-[--text-primary] prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2',
          'prose-p:text-[--text-primary] prose-p:my-2',
          'prose-strong:text-[--text-primary]',
          'prose-ul:text-[--text-primary] prose-ol:text-[--text-primary]',
          'prose-li:text-[--text-primary]',
          'prose-blockquote:border-l-[--arcane-purple] prose-blockquote:text-[--text-secondary]',
          'prose-img:rounded-lg prose-img:my-4'
        ),
      },
    },
    onUpdate: ({ editor }) => {
      setFormData(prev => ({ ...prev, notes: editor.getHTML() }))
    },
  })

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'f') {
        e.preventDefault()
        setIsFullscreen(prev => !prev)
      }
      if (e.key === 'Escape') {
        if (lightboxOpen) {
          e.preventDefault()
          setLightboxOpen(false)
        } else if (isFullscreen) {
          e.preventDefault()
          setIsFullscreen(false)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen, lightboxOpen])

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

  // Toolbar button component
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
        'h-9 w-9 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors',
        active && 'bg-[--arcane-purple]/20 text-[--arcane-purple]',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {children}
    </button>
  )

  // Full toolbar for editors
  const EditorToolbar = ({ editor }: { editor: any }) => (
    <div className="border-b border-white/10 px-3 py-2 flex items-center gap-1 flex-wrap bg-[--bg-elevated]/50">
      <ToolbarButton onClick={() => editor?.chain().focus().undo().run()} disabled={!editor?.can().undo()} title="Undo">
        <Undo className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor?.chain().focus().redo().run()} disabled={!editor?.can().redo()} title="Redo">
        <Redo className="h-4 w-4" />
      </ToolbarButton>
      <div className="w-px h-6 bg-white/10 mx-1" />
      <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive('heading', { level: 1 })} title="Heading 1">
        <Heading1 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })} title="Heading 2">
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <div className="w-px h-6 bg-white/10 mx-1" />
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
      <div className="w-px h-6 bg-white/10 mx-1" />
      <ToolbarButton onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')} title="Bullet List">
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')} title="Numbered List">
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive('blockquote')} title="Quote">
        <Quote className="h-4 w-4" />
      </ToolbarButton>
      <div className="w-px h-6 bg-white/10 mx-1" />
      <ToolbarButton onClick={() => setLink(editor)} active={editor?.isActive('link')} title="Link">
        <LinkIcon className="h-4 w-4" />
      </ToolbarButton>
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleEditorImageUpload} />
      <ToolbarButton onClick={() => imageInputRef.current?.click()} title="Insert Image">
        <ImageIcon className="h-4 w-4" />
      </ToolbarButton>
    </div>
  )

  // Status dropdown
  const StatusDropdown = () => {
    const allStatuses = [...DEFAULT_STATUSES, ...customStatuses.map(s => ({ name: s.name, color: s.color }))]

    return (
      <div className="relative">
        <button
          onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 hover:border-white/20 transition-colors w-full"
        >
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: formData.status_color }} />
          <span className="text-sm text-[--text-primary] flex-1 text-left">{formData.status}</span>
          <ChevronDown className="w-4 h-4 text-[--text-tertiary]" />
        </button>

        {statusDropdownOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setStatusDropdownOpen(false)} />
            <div className="absolute top-full left-0 mt-1 w-full bg-[--bg-elevated] border border-white/10 rounded-lg shadow-xl z-50 py-1">
              {allStatuses.map((s) => (
                <button
                  key={s.name}
                  onClick={() => {
                    setFormData(prev => ({ ...prev, status: s.name, status_color: s.color }))
                    setStatusDropdownOpen(false)
                  }}
                  className="flex items-center gap-2 px-3 py-2 w-full hover:bg-white/5 transition-colors"
                >
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-sm text-[--text-primary]">{s.name}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  // Array field editor (for quotes, phrases, etc.)
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
      <div className="space-y-2">
        <label className="text-sm font-medium text-[--text-secondary]">{label}</label>
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="flex items-start gap-2 group">
              <div className="flex-1 px-3 py-2 bg-[--bg-elevated] rounded-lg text-sm text-[--text-primary]">
                {item}
              </div>
              <button
                onClick={() => removeItem(index)}
                className="p-2 text-[--text-tertiary] hover:text-[--arcane-ember] opacity-0 group-hover:opacity-100 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
            placeholder={placeholder}
            className="flex-1 px-3 py-2 bg-[--bg-elevated] border border-white/10 rounded-lg text-sm text-[--text-primary] placeholder:text-[--text-tertiary] focus:outline-none focus:border-[--arcane-purple]"
          />
          <button
            onClick={addItem}
            className="px-3 py-2 bg-[--arcane-purple]/20 text-[--arcane-purple] rounded-lg hover:bg-[--arcane-purple]/30 transition-colors"
          >
            <Plus className="w-4 h-4" />
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
              className="relative w-full aspect-square overflow-hidden rounded-xl border-2 border-white/10 bg-[--bg-base] cursor-pointer"
              onClick={() => setLightboxOpen(true)}
            >
              <Image
                src={displayUrl}
                alt={formData.name || 'Character portrait'}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="200px"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-sm font-medium">View</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => portraitInputRef.current?.click()}
              disabled={isUploading}
              className="absolute bottom-2 right-2 p-2 bg-black/60 rounded-lg text-white hover:bg-black/80 transition-colors"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => portraitInputRef.current?.click()}
            className="w-full aspect-square rounded-xl border-2 border-dashed border-[--text-tertiary] hover:border-[--arcane-purple] bg-[--bg-elevated] flex flex-col items-center justify-center gap-2 transition-colors"
          >
            {formData.name ? (
              <span className="text-4xl font-bold text-[--text-tertiary]">
                {getInitials(formData.name)}
              </span>
            ) : (
              <Camera className="w-8 h-8 text-[--text-tertiary]" />
            )}
            <span className="text-xs text-[--text-tertiary]">Upload portrait</span>
          </button>
        )}
      </div>
    )
  }

  // Lightbox component
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

  // Tab content components
  const BackstoryTab = () => (
    <div className="space-y-6">
      {/* Summary */}
      <div>
        <label className="text-sm font-medium text-[--text-secondary] mb-2 block">Summary</label>
        <div className="border border-white/10 rounded-xl overflow-hidden bg-[--bg-surface]">
          <EditorToolbar editor={summaryEditor} />
          <EditorContent editor={summaryEditor} />
        </div>
      </div>

      {/* TL;DR */}
      <ArrayFieldEditor
        label="TL;DR (Quick bullet points)"
        items={formData.tldr}
        placeholder="Add a quick fact..."
        onChange={(items) => setFormData(prev => ({ ...prev, tldr: items }))}
      />

      {/* Full Backstory */}
      <div>
        <label className="text-sm font-medium text-[--text-secondary] mb-2 block">Full Backstory</label>
        <div className="border border-white/10 rounded-xl overflow-hidden bg-[--bg-surface]">
          <EditorToolbar editor={notesEditor} />
          <div className="max-h-[400px] overflow-y-auto">
            <EditorContent editor={notesEditor} />
          </div>
        </div>
      </div>

      {/* Plot Hooks */}
      <ArrayFieldEditor
        label="Plot Hooks"
        items={formData.plot_hooks}
        placeholder="Add a plot hook..."
        onChange={(items) => setFormData(prev => ({ ...prev, plot_hooks: items }))}
      />

      {/* Quotes */}
      <ArrayFieldEditor
        label="Memorable Quotes"
        items={formData.quotes}
        placeholder="Add a quote..."
        onChange={(items) => setFormData(prev => ({ ...prev, quotes: items }))}
      />
    </div>
  )

  const DetailsTab = () => (
    <div className="space-y-6">
      {/* Appearance */}
      <div>
        <label className="text-sm font-medium text-[--text-secondary] mb-2 block">Appearance</label>
        <textarea
          value={formData.appearance}
          onChange={(e) => setFormData(prev => ({ ...prev, appearance: e.target.value }))}
          placeholder="Physical description, distinguishing features..."
          className="w-full px-4 py-3 bg-[--bg-elevated] border border-white/10 rounded-xl text-[--text-primary] placeholder:text-[--text-tertiary] focus:outline-none focus:border-[--arcane-purple] min-h-[100px] resize-none"
        />
      </div>

      {/* Personality */}
      <div>
        <label className="text-sm font-medium text-[--text-secondary] mb-2 block">Personality</label>
        <textarea
          value={formData.personality}
          onChange={(e) => setFormData(prev => ({ ...prev, personality: e.target.value }))}
          placeholder="Temperament, quirks, mannerisms..."
          className="w-full px-4 py-3 bg-[--bg-elevated] border border-white/10 rounded-xl text-[--text-primary] placeholder:text-[--text-tertiary] focus:outline-none focus:border-[--arcane-purple] min-h-[100px] resize-none"
        />
      </div>

      {/* Goals */}
      <div>
        <label className="text-sm font-medium text-[--text-secondary] mb-2 block">Goals & Motivations</label>
        <textarea
          value={formData.goals}
          onChange={(e) => setFormData(prev => ({ ...prev, goals: e.target.value }))}
          placeholder="What drives this character?"
          className="w-full px-4 py-3 bg-[--bg-elevated] border border-white/10 rounded-xl text-[--text-primary] placeholder:text-[--text-tertiary] focus:outline-none focus:border-[--arcane-purple] min-h-[100px] resize-none"
        />
      </div>

      {/* Secrets (DM Eyes Only) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-[--text-secondary]">Secrets (DM Eyes Only)</label>
          <button
            onClick={() => setShowSecrets(!showSecrets)}
            className="flex items-center gap-1 text-xs text-[--text-tertiary] hover:text-[--text-secondary] transition-colors"
          >
            {showSecrets ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {showSecrets ? 'Hide' : 'Show'}
          </button>
        </div>
        {showSecrets ? (
          <textarea
            value={formData.secrets}
            onChange={(e) => setFormData(prev => ({ ...prev, secrets: e.target.value }))}
            placeholder="Hidden information, true motivations..."
            className="w-full px-4 py-3 bg-[--bg-elevated] border border-[--arcane-ember]/30 rounded-xl text-[--text-primary] placeholder:text-[--text-tertiary] focus:outline-none focus:border-[--arcane-ember] min-h-[100px] resize-none"
          />
        ) : (
          <div className="px-4 py-3 bg-[--bg-elevated] border border-white/10 rounded-xl text-[--text-tertiary] text-sm italic">
            Click "Show" to reveal secrets
          </div>
        )}
      </div>

      {/* Common Phrases */}
      <ArrayFieldEditor
        label="Common Phrases"
        items={formData.common_phrases}
        placeholder="Add a catchphrase..."
        onChange={(items) => setFormData(prev => ({ ...prev, common_phrases: items }))}
      />

      {/* Weaknesses */}
      <ArrayFieldEditor
        label="Weaknesses & Flaws"
        items={formData.weaknesses}
        placeholder="Add a weakness..."
        onChange={(items) => setFormData(prev => ({ ...prev, weaknesses: items }))}
      />

      {/* Game Info Section */}
      <div className="pt-4 border-t border-white/10">
        <h3 className="text-sm font-semibold text-[--text-secondary] mb-4">Campaign Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-[--text-tertiary] mb-1 block">Game System</label>
            <input
              type="text"
              value={formData.game_system}
              onChange={(e) => setFormData(prev => ({ ...prev, game_system: e.target.value }))}
              placeholder="D&D 5e, Pathfinder..."
              className="w-full px-3 py-2 bg-[--bg-elevated] border border-white/10 rounded-lg text-sm text-[--text-primary] placeholder:text-[--text-tertiary] focus:outline-none focus:border-[--arcane-purple]"
            />
          </div>
          <div>
            <label className="text-xs text-[--text-tertiary] mb-1 block">Campaign Name</label>
            <input
              type="text"
              value={formData.external_campaign}
              onChange={(e) => setFormData(prev => ({ ...prev, external_campaign: e.target.value }))}
              placeholder="Campaign name..."
              className="w-full px-3 py-2 bg-[--bg-elevated] border border-white/10 rounded-lg text-sm text-[--text-primary] placeholder:text-[--text-tertiary] focus:outline-none focus:border-[--arcane-purple]"
            />
          </div>
          <div>
            <label className="text-xs text-[--text-tertiary] mb-1 block">DM Name</label>
            <input
              type="text"
              value={formData.dm_name}
              onChange={(e) => setFormData(prev => ({ ...prev, dm_name: e.target.value }))}
              placeholder="Dungeon Master..."
              className="w-full px-3 py-2 bg-[--bg-elevated] border border-white/10 rounded-lg text-sm text-[--text-primary] placeholder:text-[--text-tertiary] focus:outline-none focus:border-[--arcane-purple]"
            />
          </div>
          <div>
            <label className="text-xs text-[--text-tertiary] mb-1 block">Campaign Started</label>
            <input
              type="text"
              value={formData.campaign_started}
              onChange={(e) => setFormData(prev => ({ ...prev, campaign_started: e.target.value }))}
              placeholder="January 2024..."
              className="w-full px-3 py-2 bg-[--bg-elevated] border border-white/10 rounded-lg text-sm text-[--text-primary] placeholder:text-[--text-tertiary] focus:outline-none focus:border-[--arcane-purple]"
            />
          </div>
        </div>
      </div>
    </div>
  )

  const PeopleTab = () => (
    <div className="space-y-6">
      {/* Story Characters */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[--text-secondary]">Story Characters</h3>
          <button
            onClick={() => setAddStoryCharacterModalOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-[--arcane-purple]/20 text-[--arcane-purple] rounded-lg hover:bg-[--arcane-purple]/30 transition-colors"
          >
            <UserPlus className="w-3 h-3" />
            Add Character
          </button>
        </div>

        {storyCharacters.length === 0 ? (
          <div className="text-center py-8 text-[--text-tertiary]">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No story characters yet</p>
            <p className="text-xs mt-1">Add NPCs related to this character</p>
          </div>
        ) : (
          <div className="space-y-3">
            {storyCharacters.map((char) => (
              <div
                key={char.id}
                className="flex items-start gap-3 p-3 bg-[--bg-elevated] rounded-xl border border-white/5 hover:border-white/10 transition-colors"
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
                  {char.notes && (
                    <p className="text-xs text-[--text-tertiary] mt-1 line-clamp-2">{char.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Learned Facts */}
      <div className="pt-4 border-t border-white/10">
        <h3 className="text-sm font-semibold text-[--text-secondary] mb-4">What I've Learned About Others</h3>

        {learnedFacts.length === 0 ? (
          <div className="text-center py-8 text-[--text-tertiary]">
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No learned facts yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {learnedFacts.map((fact) => (
              <div key={fact.id} className="p-3 bg-[--bg-elevated] rounded-xl">
                <h4 className="font-medium text-[--text-primary] mb-2">{fact.about_name}</h4>
                <ul className="space-y-1">
                  {fact.facts?.map((f, i) => (
                    <li key={i} className="text-sm text-[--text-secondary] flex items-start gap-2">
                      <span className="text-[--arcane-purple]">•</span>
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[--text-secondary]">Play Journal</h3>
        <button
          onClick={() => setAddJournalModalOpen(true)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-[--arcane-purple]/20 text-[--arcane-purple] rounded-lg hover:bg-[--arcane-purple]/30 transition-colors"
        >
          <Plus className="w-3 h-3" />
          Add Entry
        </button>
      </div>

      {journalEntries.length === 0 ? (
        <div className="text-center py-12 text-[--text-tertiary]">
          <Scroll className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No journal entries yet</p>
          <p className="text-xs mt-1">Record your adventures and experiences</p>
        </div>
      ) : (
        <div className="space-y-3">
          {journalEntries.map((entry) => (
            <div
              key={entry.id}
              className="p-4 bg-[--bg-elevated] rounded-xl border border-white/5 hover:border-white/10 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {entry.session_number && (
                    <span className="text-xs px-2 py-0.5 bg-[--arcane-gold]/20 text-[--arcane-gold] rounded-full">
                      Session {entry.session_number}
                    </span>
                  )}
                  {entry.title && (
                    <span className="font-medium text-[--text-primary]">{entry.title}</span>
                  )}
                </div>
                {entry.session_date && (
                  <span className="text-xs text-[--text-tertiary]">
                    {new Date(entry.session_date).toLocaleDateString()}
                  </span>
                )}
              </div>
              <p className="text-sm text-[--text-secondary] whitespace-pre-wrap">{entry.notes}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const MoreTab = () => (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div>
        <h3 className="text-sm font-semibold text-[--text-secondary] mb-3">Quick Stats</h3>
        <p className="text-xs text-[--text-tertiary] mb-4">Configure your stat block for quick reference during play.</p>
        {/* Quick stats editor would go here */}
        <div className="p-4 bg-[--bg-elevated] rounded-xl border border-white/10 text-center text-[--text-tertiary]">
          <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Quick Stats coming soon</p>
        </div>
      </div>

      {/* Inventory */}
      <div className="pt-4 border-t border-white/10">
        <h3 className="text-sm font-semibold text-[--text-secondary] mb-3">Inventory</h3>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[--text-tertiary]">Gold:</span>
            <input
              type="number"
              value={formData.gold}
              onChange={(e) => setFormData(prev => ({ ...prev, gold: parseInt(e.target.value) || 0 }))}
              className="w-24 px-3 py-1.5 bg-[--bg-elevated] border border-white/10 rounded-lg text-sm text-[--arcane-gold] font-medium focus:outline-none focus:border-[--arcane-gold]"
            />
          </div>
        </div>
        <div className="p-4 bg-[--bg-elevated] rounded-xl border border-white/10 text-center text-[--text-tertiary]">
          <p className="text-sm">Inventory tracking coming soon</p>
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

  return (
    <>
      <div className="fixed inset-0 z-50 bg-[--bg-base]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 h-16 border-b border-white/10 bg-[--bg-surface]">
          <div className="flex items-center gap-4">
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-[--text-secondary]" />
            </button>
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                formData.type === 'pc' ? "bg-purple-600/20 text-purple-400" : "bg-gray-600/20 text-gray-400"
              )}>
                {formData.type === 'pc' ? <User className="w-5 h-5" /> : <Users className="w-5 h-5" />}
              </div>
              <div>
                <h1 className="text-lg font-semibold text-[--text-primary]">
                  {formData.name || (isCreateMode ? 'New Character' : 'Edit Character')}
                </h1>
                <p className="text-xs text-[--text-tertiary]">
                  {status === 'saving' ? 'Saving...' : status === 'saved' ? 'All changes saved' : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {characterId && (
              <>
                <button
                  onClick={() => setShareModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-[--text-secondary]"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="text-sm">Share</span>
                </button>
                <button
                  onClick={() => setDuplicateModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-[--text-secondary]"
                >
                  <Copy className="w-4 h-4" />
                  <span className="text-sm">Duplicate</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex h-[calc(100vh-64px)]">
          {/* Left Sidebar */}
          <div className="w-72 border-r border-white/10 p-6 overflow-y-auto bg-[--bg-surface]/50">
            {/* Portrait */}
            <PortraitDisplay />

            {/* Character Name */}
            <div className="mt-6">
              <label className="text-xs font-medium text-[--text-tertiary] mb-1.5 block">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Character name"
                className="w-full px-3 py-2.5 bg-[--bg-elevated] border border-white/10 rounded-lg text-[--text-primary] font-medium placeholder:text-[--text-tertiary] focus:outline-none focus:border-[--arcane-purple]"
              />
            </div>

            {/* Type */}
            <div className="mt-4">
              <label className="text-xs font-medium text-[--text-tertiary] mb-1.5 block">Type</label>
              <div className="flex rounded-lg overflow-hidden border border-white/10">
                <button
                  onClick={() => setFormData(prev => ({ ...prev, type: 'pc' }))}
                  className={cn(
                    'flex-1 py-2 text-sm font-medium transition-colors',
                    formData.type === 'pc' ? 'bg-purple-600 text-white' : 'bg-transparent text-[--text-tertiary] hover:text-white'
                  )}
                >
                  PC
                </button>
                <button
                  onClick={() => setFormData(prev => ({ ...prev, type: 'npc' }))}
                  className={cn(
                    'flex-1 py-2 text-sm font-medium transition-colors',
                    formData.type === 'npc' ? 'bg-gray-600 text-white' : 'bg-transparent text-[--text-tertiary] hover:text-white'
                  )}
                >
                  NPC
                </button>
              </div>
            </div>

            {/* Status */}
            <div className="mt-4">
              <label className="text-xs font-medium text-[--text-tertiary] mb-1.5 block">Status</label>
              <StatusDropdown />
            </div>

            {/* Race/Class/Background */}
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-[--text-tertiary] mb-1.5 block">Race</label>
                <input
                  type="text"
                  value={formData.race}
                  onChange={(e) => setFormData(prev => ({ ...prev, race: e.target.value }))}
                  placeholder="Human, Elf, Dwarf..."
                  className="w-full px-3 py-2 bg-[--bg-elevated] border border-white/10 rounded-lg text-sm text-[--text-primary] placeholder:text-[--text-tertiary] focus:outline-none focus:border-[--arcane-purple]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[--text-tertiary] mb-1.5 block">Class</label>
                <input
                  type="text"
                  value={formData.class}
                  onChange={(e) => setFormData(prev => ({ ...prev, class: e.target.value }))}
                  placeholder="Fighter, Wizard..."
                  className="w-full px-3 py-2 bg-[--bg-elevated] border border-white/10 rounded-lg text-sm text-[--text-primary] placeholder:text-[--text-tertiary] focus:outline-none focus:border-[--arcane-purple]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[--text-tertiary] mb-1.5 block">Background</label>
                <input
                  type="text"
                  value={formData.background}
                  onChange={(e) => setFormData(prev => ({ ...prev, background: e.target.value }))}
                  placeholder="Noble, Criminal..."
                  className="w-full px-3 py-2 bg-[--bg-elevated] border border-white/10 rounded-lg text-sm text-[--text-primary] placeholder:text-[--text-tertiary] focus:outline-none focus:border-[--arcane-purple]"
                />
              </div>
            </div>

            {/* Links */}
            <div className="mt-6 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-medium text-[--text-tertiary]">Links</label>
                <button
                  onClick={() => setAddLinkModalOpen(true)}
                  className="p-1 rounded hover:bg-white/10 transition-colors"
                >
                  <Plus className="w-4 h-4 text-[--text-tertiary]" />
                </button>
              </div>

              {/* Theme Music */}
              {formData.theme_music_url && (
                <a
                  href={formData.theme_music_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 rounded-lg bg-[--bg-elevated] hover:bg-white/10 transition-colors mb-2"
                >
                  <Music className="w-4 h-4 text-[--arcane-purple]" />
                  <span className="text-sm text-[--text-primary] truncate flex-1">
                    {formData.theme_music_title || 'Theme Music'}
                  </span>
                  <ExternalLink className="w-3 h-3 text-[--text-tertiary]" />
                </a>
              )}

              {/* Character Sheet */}
              {formData.character_sheet_url && (
                <a
                  href={formData.character_sheet_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 rounded-lg bg-[--bg-elevated] hover:bg-white/10 transition-colors mb-2"
                >
                  <FileText className="w-4 h-4 text-[--arcane-gold]" />
                  <span className="text-sm text-[--text-primary] truncate flex-1">Character Sheet</span>
                  <ExternalLink className="w-3 h-3 text-[--text-tertiary]" />
                </a>
              )}

              {/* Other Links */}
              {links.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 rounded-lg bg-[--bg-elevated] hover:bg-white/10 transition-colors mb-2"
                >
                  <ExternalLink className="w-4 h-4 text-[--text-tertiary]" />
                  <span className="text-sm text-[--text-primary] truncate flex-1">{link.title}</span>
                </a>
              ))}

              {!formData.theme_music_url && !formData.character_sheet_url && links.length === 0 && (
                <p className="text-xs text-[--text-tertiary] text-center py-2">No links added</p>
              )}
            </div>

            {/* Delete Button */}
            {characterId && (
              <div className="mt-6 pt-4 border-t border-white/10">
                <button
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-[--arcane-ember] hover:bg-[--arcane-ember]/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="text-sm">Delete Character</span>
                </button>
              </div>
            )}
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tabs */}
            <div className="flex items-center gap-1 px-6 py-3 border-b border-white/10 bg-[--bg-surface]/30">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    activeTab === tab.id
                      ? 'bg-[--arcane-purple]/20 text-[--arcane-purple]'
                      : 'text-[--text-secondary] hover:text-[--text-primary] hover:bg-white/5'
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-3xl mx-auto">
                {activeTab === 'backstory' && <BackstoryTab />}
                {activeTab === 'details' && <DetailsTab />}
                {activeTab === 'people' && <PeopleTab />}
                {activeTab === 'journal' && <JournalTab />}
                {activeTab === 'more' && <MoreTab />}
              </div>
            </div>
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
          <button className="btn bg-[--arcane-ember] hover:bg-[--arcane-ember]/80 text-white" onClick={handleDelete}>Delete</button>
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
        <div className="py-4 text-center text-[--text-tertiary]">
          <Share2 className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Share functionality coming soon</p>
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
            <label className="text-sm text-[--text-secondary] mb-1.5 block">Link Type</label>
            <select className="w-full px-3 py-2 bg-[--bg-elevated] border border-white/10 rounded-lg text-[--text-primary]">
              <option value="theme_music">Theme Music</option>
              <option value="character_sheet">Character Sheet</option>
              <option value="art_reference">Art Reference</option>
              <option value="inspiration">Inspiration</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-[--text-secondary] mb-1.5 block">Title</label>
            <input
              type="text"
              placeholder="Link title"
              className="w-full px-3 py-2 bg-[--bg-elevated] border border-white/10 rounded-lg text-[--text-primary] placeholder:text-[--text-tertiary]"
            />
          </div>
          <div>
            <label className="text-sm text-[--text-secondary] mb-1.5 block">URL</label>
            <input
              type="url"
              placeholder="https://..."
              className="w-full px-3 py-2 bg-[--bg-elevated] border border-white/10 rounded-lg text-[--text-primary] placeholder:text-[--text-tertiary]"
            />
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
            <label className="text-sm text-[--text-secondary] mb-1.5 block">Name</label>
            <input
              type="text"
              placeholder="Character name"
              className="w-full px-3 py-2 bg-[--bg-elevated] border border-white/10 rounded-lg text-[--text-primary] placeholder:text-[--text-tertiary]"
            />
          </div>
          <div>
            <label className="text-sm text-[--text-secondary] mb-1.5 block">Relationship</label>
            <select className="w-full px-3 py-2 bg-[--bg-elevated] border border-white/10 rounded-lg text-[--text-primary]">
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
            <label className="text-sm text-[--text-secondary] mb-1.5 block">Tagline</label>
            <input
              type="text"
              placeholder="Brief description"
              className="w-full px-3 py-2 bg-[--bg-elevated] border border-white/10 rounded-lg text-[--text-primary] placeholder:text-[--text-tertiary]"
            />
          </div>
          <div>
            <label className="text-sm text-[--text-secondary] mb-1.5 block">Notes</label>
            <textarea
              placeholder="Additional notes..."
              className="w-full px-3 py-2 bg-[--bg-elevated] border border-white/10 rounded-lg text-[--text-primary] placeholder:text-[--text-tertiary] min-h-[80px] resize-none"
            />
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
              <label className="text-sm text-[--text-secondary] mb-1.5 block">Session Number</label>
              <input
                type="number"
                placeholder="1, 2, 3..."
                className="w-full px-3 py-2 bg-[--bg-elevated] border border-white/10 rounded-lg text-[--text-primary] placeholder:text-[--text-tertiary]"
              />
            </div>
            <div>
              <label className="text-sm text-[--text-secondary] mb-1.5 block">Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 bg-[--bg-elevated] border border-white/10 rounded-lg text-[--text-primary]"
              />
            </div>
          </div>
          <div>
            <label className="text-sm text-[--text-secondary] mb-1.5 block">Title</label>
            <input
              type="text"
              placeholder="Entry title (optional)"
              className="w-full px-3 py-2 bg-[--bg-elevated] border border-white/10 rounded-lg text-[--text-primary] placeholder:text-[--text-tertiary]"
            />
          </div>
          <div>
            <label className="text-sm text-[--text-secondary] mb-1.5 block">Notes</label>
            <textarea
              placeholder="What happened this session?"
              className="w-full px-3 py-2 bg-[--bg-elevated] border border-white/10 rounded-lg text-[--text-primary] placeholder:text-[--text-tertiary] min-h-[150px] resize-none"
            />
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

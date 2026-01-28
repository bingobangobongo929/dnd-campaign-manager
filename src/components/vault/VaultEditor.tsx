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
import { useVersionedAutoSave } from '@/hooks/useAutoSave'
import { logActivity, diffChanges } from '@/lib/activity-log'
import { AlertTriangle, RefreshCw } from 'lucide-react'
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
} from 'lucide-react'
import { Modal } from '@/components/ui'
import { VaultImageCropModal } from './VaultImageCropModal'
import type { VaultCharacter } from '@/types/database'
import { v4 as uuidv4 } from 'uuid'

interface VaultEditorProps {
  character?: VaultCharacter | null
  mode: 'create' | 'edit'
}

export function VaultEditor({ character, mode }: VaultEditorProps) {
  const router = useRouter()
  const supabase = createClient()
  const imageInputRef = useRef<HTMLInputElement>(null)
  const portraitInputRef = useRef<HTMLInputElement>(null)
  const isCreateMode = mode === 'create'

  const [formData, setFormData] = useState({
    name: character?.name || '',
    summary: character?.summary || '',
    notes: character?.notes || '',
    type: (character?.type || 'npc') as 'pc' | 'npc',
    image_url: character?.image_url || null as string | null,
    detail_image_url: (character as any)?.detail_image_url || null as string | null,
  })

  const [characterId, setCharacterId] = useState<string | null>(character?.id || null)
  const [characterVersion, setCharacterVersion] = useState((character as any)?.version || 1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [originalData, setOriginalData] = useState(character) // For diff tracking

  // Crop modal state
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [pendingImageSrc, setPendingImageSrc] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // Summary editor
  const summaryEditor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
      }),
      Placeholder.configure({
        placeholder: 'Brief description - role, personality, key traits...',
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-[--arcane-purple] underline' },
      }),
      Highlight.configure({
        HTMLAttributes: { class: 'bg-[--arcane-gold]/30 px-1 rounded' },
      }),
      Underline,
    ],
    content: formData.summary || '',
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-invert prose-sm max-w-none',
          'focus:outline-none min-h-[120px] p-4',
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

  // Notes editor
  const notesEditor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
      }),
      Placeholder.configure({
        placeholder: 'Write backstory, notes, relationships...',
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-[--arcane-purple] underline' },
      }),
      Highlight.configure({
        HTMLAttributes: { class: 'bg-[--arcane-gold]/30 px-1 rounded' },
      }),
      TiptapImage.configure({
        HTMLAttributes: { class: 'rounded-lg max-w-full' },
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: formData.notes,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-invert max-w-none',
          'focus:outline-none min-h-[250px] p-4',
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

  // Auto-save with version checking
  const saveCharacter = useCallback(async (data: typeof formData, expectedVersion: number): Promise<{ success: boolean; conflict?: boolean; newVersion?: number; error?: string }> => {
    if (!data.name.trim()) return { success: false, error: 'Name required' }

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return { success: false, error: 'Not authenticated' }

    const characterData = {
      name: data.name.trim(),
      summary: data.summary.trim() || null,
      type: data.type,
      image_url: data.image_url,
      detail_image_url: data.detail_image_url,
      notes: data.notes,
      updated_at: new Date().toISOString(),
    }

    if (characterId) {
      // Check version before update
      const { data: current } = await supabase
        .from('vault_characters')
        .select('version')
        .eq('id', characterId)
        .single()

      if (current && current.version !== expectedVersion) {
        return {
          success: false,
          conflict: true,
          newVersion: current.version,
          error: `This character was edited elsewhere. Your version: ${expectedVersion}, Server version: ${current.version}`,
        }
      }

      const newVersion = expectedVersion + 1
      const { error } = await supabase
        .from('vault_characters')
        .update({ ...characterData, version: newVersion })
        .eq('id', characterId)
        .eq('version', expectedVersion) // Ensure version matches

      if (error) {
        return { success: false, error: error.message }
      }

      // Log activity only if there are actual changes from original
      const changes = diffChanges(originalData as any, characterData, ['name', 'summary', 'notes', 'type'])
      if (changes && Object.keys(changes).length > 0) {
        logActivity(supabase, userData.user.id, {
          action: 'character.edit',
          entity_type: 'character',
          entity_id: characterId,
          entity_name: data.name.trim(),
          changes,
        })
        // Update originalData so we don't log the same changes again
        if (originalData) {
          setOriginalData({ ...originalData, ...characterData } as typeof originalData)
        }
      }

      setCharacterVersion(newVersion)
      return { success: true, newVersion }
    } else {
      // Create new character
      const { data: newChar, error } = await supabase
        .from('vault_characters')
        .insert({ ...characterData, user_id: userData.user.id, version: 1 })
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      if (newChar) {
        setCharacterId(newChar.id)
        setCharacterVersion(1)
        setOriginalData(newChar)
        window.history.replaceState(null, '', `/vault/${newChar.id}`)

        // Log activity
        logActivity(supabase, userData.user.id, {
          action: 'character.create',
          entity_type: 'character',
          entity_id: newChar.id,
          entity_name: data.name.trim(),
        })
      }

      return { success: true, newVersion: 1 }
    }
  }, [characterId, supabase, originalData])

  const { status, hasConflict, conflictInfo } = useVersionedAutoSave({
    data: formData,
    version: characterVersion,
    onSave: saveCharacter,
    delay: 1500,
    enabled: !!formData.name.trim(),
    showToast: true,
    toastMessage: 'Character saved',
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
    if (isFullscreen) {
      setIsFullscreen(false)
    } else {
      router.push('/vault')
    }
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
        'h-8 w-8 flex items-center justify-center rounded hover:bg-[--bg-hover] transition-colors',
        active && 'bg-[--arcane-purple]/20 text-[--arcane-purple]',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {children}
    </button>
  )

  // Compact toolbar for Summary editor
  const CompactToolbar = ({ editor }: { editor: any }) => (
    <div className="border-b border-[--border] px-2 py-1 flex items-center gap-0.5 bg-[--bg-hover]/30">
      <ToolbarButton onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')} title="Bold">
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')} title="Italic">
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive('underline')} title="Underline">
        <UnderlineIcon className="h-4 w-4" />
      </ToolbarButton>
      <div className="w-px h-4 bg-[--border] mx-1" />
      <ToolbarButton onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')} title="Bullet List">
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => setLink(editor)} active={editor?.isActive('link')} title="Link">
        <LinkIcon className="h-4 w-4" />
      </ToolbarButton>
    </div>
  )

  // Full toolbar for Notes editor
  const FullToolbar = ({ editor }: { editor: any }) => (
    <div className="border-b border-[--border] px-2 py-1.5 flex items-center gap-0.5 flex-wrap bg-[--bg-hover]/30">
      <ToolbarButton onClick={() => editor?.chain().focus().undo().run()} disabled={!editor?.can().undo()} title="Undo">
        <Undo className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor?.chain().focus().redo().run()} disabled={!editor?.can().redo()} title="Redo">
        <Redo className="h-4 w-4" />
      </ToolbarButton>
      <div className="w-px h-5 bg-[--border] mx-1" />
      <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive('heading', { level: 1 })} title="Heading 1">
        <Heading1 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })} title="Heading 2">
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <div className="w-px h-5 bg-[--border] mx-1" />
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
      <div className="w-px h-5 bg-[--border] mx-1" />
      <ToolbarButton onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')} title="Bullet List">
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')} title="Numbered List">
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive('blockquote')} title="Quote">
        <Quote className="h-4 w-4" />
      </ToolbarButton>
      <div className="w-px h-5 bg-[--border] mx-1" />
      <ToolbarButton onClick={() => setLink(editor)} active={editor?.isActive('link')} title="Link">
        <LinkIcon className="h-4 w-4" />
      </ToolbarButton>
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleEditorImageUpload} />
      <ToolbarButton onClick={() => imageInputRef.current?.click()} title="Insert Image">
        <ImageIcon className="h-4 w-4" />
      </ToolbarButton>
    </div>
  )

  // Type selector component - larger version
  const TypeSelector = ({ large = false }: { large?: boolean }) => (
    <div className="flex rounded-lg overflow-hidden border border-white/20">
      <button
        type="button"
        onClick={() => setFormData({ ...formData, type: 'pc' })}
        className={cn(
          'flex-1 font-medium transition-colors',
          large ? 'py-3 px-6 text-base' : 'px-4 py-2 text-sm',
          formData.type === 'pc'
            ? 'bg-purple-600 text-white'
            : 'bg-transparent text-[--text-muted] hover:text-white'
        )}
      >
        Player Character
      </button>
      <button
        type="button"
        onClick={() => setFormData({ ...formData, type: 'npc' })}
        className={cn(
          'flex-1 font-medium transition-colors',
          large ? 'py-3 px-6 text-base' : 'px-4 py-2 text-sm',
          formData.type === 'npc'
            ? 'bg-gray-600 text-white'
            : 'bg-transparent text-[--text-muted] hover:text-white'
        )}
      >
        NPC
      </button>
    </div>
  )

  // Portrait display component - clicks open LIGHTBOX
  const PortraitDisplay = ({ size = 'normal' }: { size?: 'normal' | 'large' }) => {
    const displayUrl = formData.detail_image_url || formData.image_url
    const isLarge = size === 'large'

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
              className={cn(
                'relative overflow-hidden rounded-xl border-2 border-[--border] bg-[--bg-base] cursor-pointer',
                isLarge ? 'w-full aspect-[2/3]' : 'w-44 aspect-[2/3]'
              )}
              onClick={() => setLightboxOpen(true)}
            >
              <Image
                src={displayUrl}
                alt={formData.name || 'Character portrait'}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes={isLarge ? '350px' : '176px'}
              />
              {/* Hover overlay - click to view full size */}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-sm font-medium">View Full Size</span>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => portraitInputRef.current?.click()}
            className={cn(
              'relative overflow-hidden rounded-xl transition-all',
              'focus:outline-none focus:ring-2 focus:ring-[--arcane-purple] focus:ring-offset-2 focus:ring-offset-[--bg-surface]',
              'border-2 border-dashed border-[--text-tertiary] hover:border-[--arcane-purple]',
              isLarge ? 'w-full aspect-[2/3]' : 'w-44 aspect-[2/3]'
            )}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[--bg-hover] gap-2">
              {formData.name ? (
                <span className={cn('font-bold text-[--text-tertiary]', isLarge ? 'text-5xl' : 'text-3xl')}>
                  {getInitials(formData.name)}
                </span>
              ) : (
                <Camera className={cn('text-[--text-tertiary]', isLarge ? 'w-12 h-12' : 'w-8 h-8')} />
              )}
              <span className="text-sm text-[--text-muted]">Click to upload</span>
            </div>
          </button>
        )}

        {/* Change button */}
        <button
          type="button"
          onClick={() => portraitInputRef.current?.click()}
          disabled={isUploading}
          className="mt-3 flex items-center gap-2 text-sm text-[--text-muted] hover:text-white transition-colors"
        >
          <Upload className="w-4 h-4" />
          {displayUrl ? 'Change' : 'Upload'}
        </button>
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

  if (!notesEditor || !summaryEditor) return null

  return (
    <>
      <div className="modal-backdrop" onClick={handleClose}>
        <div
          className={cn('character-modal', isFullscreen && 'character-modal-fullscreen')}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10" style={{ height: '60px' }}>
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                formData.type === 'pc'
                  ? "bg-purple-600/20 text-purple-400"
                  : "bg-gray-600/20 text-gray-400"
              )}>
                {formData.type === 'pc' ? <User className="w-5 h-5" /> : <Users className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[--text-primary]">
                  {formData.name || (isCreateMode ? 'New Character' : 'Edit Character')}
                </h2>
                <p className="text-xs text-[--text-tertiary]">
                  {status === 'conflict' ? (
                    <span className="text-amber-400">Conflict detected - reload required</span>
                  ) : status === 'saving' ? 'Saving...' : status === 'saved' ? 'All changes saved' : isCreateMode && !characterId ? 'Enter a name to start' : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen (Ctrl+Shift+F)'}
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5 text-[--text-secondary]" /> : <Maximize2 className="w-5 h-5 text-[--text-secondary]" />}
              </button>
              <button
                className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                onClick={handleClose}
              >
                <X className="w-5 h-5 text-[--text-secondary]" />
              </button>
            </div>
          </div>

          {/* Conflict Warning Banner */}
          {hasConflict && (
            <div className="px-6 py-3 bg-amber-500/10 border-b border-amber-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <div>
                  <p className="text-sm font-medium text-amber-400">This character was modified elsewhere</p>
                  <p className="text-xs text-amber-400/70">Your changes may conflict with the latest version. Reload to see updates.</p>
                </div>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reload
              </button>
            </div>
          )}

          {/* Body - Different layouts for normal vs fullscreen */}
          {isFullscreen ? (
            // FULLSCREEN LAYOUT
            <div className="flex-1 flex gap-8 overflow-hidden">
              {/* Left Sidebar - 350px wide */}
              <div className="w-[350px] flex-shrink-0 p-8 overflow-y-auto space-y-6">
                {/* Portrait - clickable for lightbox */}
                <PortraitDisplay size="large" />

                {/* Character Name */}
                <div>
                  <label className="text-lg font-semibold text-[--text-primary] mb-3 block">Character Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter character name"
                    className="w-full bg-[--bg-elevated] border border-[--border] rounded-lg text-lg py-3 px-4 text-[--text-primary] placeholder:text-[--text-muted] focus:outline-none focus:ring-2 focus:ring-[--arcane-purple] focus:border-transparent"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="text-lg font-semibold text-[--text-primary] mb-3 block">Type</label>
                  <TypeSelector large />
                </div>
              </div>

              {/* Right: Summary + Notes */}
              <div className="flex-1 p-8 flex flex-col min-h-0 gap-6 overflow-y-auto">
                {/* Summary with Tiptap */}
                <div className="flex-shrink-0">
                  <label className="text-xl font-bold text-[--text-primary] mb-4 block">Summary</label>
                  <div className="border border-[--border] rounded-lg overflow-hidden bg-[--bg-surface]" style={{ minHeight: '150px', maxHeight: '220px' }}>
                    <CompactToolbar editor={summaryEditor} />
                    <div className="overflow-y-auto" style={{ maxHeight: '170px' }}>
                      <EditorContent editor={summaryEditor} />
                    </div>
                  </div>
                </div>

                {/* Notes with Tiptap */}
                <div className="flex-1 flex flex-col min-h-[300px]">
                  <label className="text-xl font-bold text-[--text-primary] mb-4 block">Notes</label>
                  <div className="flex-1 border border-[--border] rounded-lg overflow-hidden bg-[--bg-surface] flex flex-col">
                    <FullToolbar editor={notesEditor} />
                    <div className="flex-1 overflow-y-auto">
                      <EditorContent editor={notesEditor} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // NORMAL MODAL LAYOUT
            <div className="character-modal-body">
              {/* Top Section: Portrait + Basic Info */}
              <div className="flex gap-6">
                {/* Portrait - clickable for lightbox */}
                <PortraitDisplay size="normal" />

                <div className="flex-1 space-y-4">
                  <div className="form-group">
                    <label className="form-label">Character Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter character name"
                      className="form-input text-lg font-semibold"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <TypeSelector />
                  </div>
                </div>
              </div>

              {/* Summary with Tiptap */}
              <div className="form-group">
                <label className="form-label">Summary</label>
                <div className="border border-[--border] rounded-lg overflow-hidden bg-[--bg-surface]">
                  <CompactToolbar editor={summaryEditor} />
                  <EditorContent editor={summaryEditor} />
                </div>
              </div>

              {/* Notes */}
              <div className="form-group flex-1 flex flex-col min-h-0">
                <label className="form-label">Notes</label>
                <div className="flex-1 min-h-[200px] border border-[--border] rounded-lg overflow-hidden bg-[--bg-surface]">
                  <FullToolbar editor={notesEditor} />
                  <EditorContent editor={notesEditor} />
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between px-8 py-4 border-t border-white/10">
            {characterId ? (
              <button
                className="flex items-center gap-2 px-4 py-2 text-[--arcane-ember] hover:bg-[--arcane-ember]/10 rounded-lg transition-colors"
                onClick={() => setIsDeleteConfirmOpen(true)}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            ) : (
              <div />
            )}
            <button className="btn btn-primary" onClick={() => router.push('/vault')}>
              Done
            </button>
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
          <button className="btn bg-[--arcane-ember] hover:bg-[--arcane-ember]/80 text-white" onClick={handleDelete}>Delete</button>
        </div>
      </Modal>
    </>
  )
}

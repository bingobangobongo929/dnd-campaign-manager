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
import { createClient } from '@/lib/supabase/client'
import { cn, getInitials } from '@/lib/utils'
import Image from 'next/image'
import {
  ArrowLeft,
  Camera,
  Loader2,
  Check,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Link as LinkIcon,
  Highlighter,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ImageIcon,
} from 'lucide-react'
import type { VaultCharacter } from '@/types/database'

interface VaultEditorProps {
  character?: VaultCharacter | null
  campaignId?: string
  mode: 'create' | 'edit'
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function VaultEditor({ character, campaignId, mode }: VaultEditorProps) {
  const router = useRouter()
  const supabase = createClient()
  const imageInputRef = useRef<HTMLInputElement>(null)
  const portraitInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [name, setName] = useState(character?.name || '')
  const [summary, setSummary] = useState(character?.summary || '')
  const [type, setType] = useState<'pc' | 'npc'>(character?.type || 'npc')
  const [imageUrl, setImageUrl] = useState<string | null>(character?.image_url || null)
  const [content, setContent] = useState(character?.notes || '')

  // Auto-save state
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [characterId, setCharacterId] = useState<string | null>(character?.id || null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // Track if we've made any changes
  const [hasChanges, setHasChanges] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: 'Write your character backstory, notes, relationships, and more...',
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
    content,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-invert max-w-none',
          'focus:outline-none min-h-[400px] p-6',
          'prose-headings:text-[--text-primary] prose-headings:font-semibold',
          'prose-p:text-[--text-primary] prose-p:my-3',
          'prose-strong:text-[--text-primary]',
          'prose-em:text-[--text-primary]',
          'prose-ul:text-[--text-primary] prose-ol:text-[--text-primary]',
          'prose-li:text-[--text-primary]',
          'prose-blockquote:border-l-[--arcane-purple] prose-blockquote:text-[--text-secondary]',
          'prose-code:text-[--arcane-purple] prose-code:bg-[--bg-hover] prose-code:px-1 prose-code:rounded',
          'prose-img:rounded-lg prose-img:my-4'
        ),
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      setContent(html)
      setHasChanges(true)
    },
  })

  // Auto-save logic
  const saveCharacter = useCallback(async () => {
    if (!name.trim()) return // Don't save without a name

    setSaveStatus('saving')

    try {
      const characterData = {
        name: name.trim(),
        summary: summary.trim() || null,
        type,
        image_url: imageUrl,
        notes: content,
        updated_at: new Date().toISOString(),
      }

      if (characterId) {
        // Update existing
        const { error } = await supabase
          .from('vault_characters')
          .update(characterData)
          .eq('id', characterId)

        if (error) throw error
      } else {
        // Create new
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) throw new Error('Not authenticated')

        const { data, error } = await supabase
          .from('vault_characters')
          .insert({
            ...characterData,
            user_id: userData.user.id,
          })
          .select()
          .single()

        if (error) throw error
        if (data) {
          setCharacterId(data.id)
          // Update URL without full navigation
          window.history.replaceState(null, '', `/vault/${data.id}`)
        }
      }

      setSaveStatus('saved')
      setHasChanges(false)

      // Reset to idle after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      console.error('Save error:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }, [name, summary, type, imageUrl, content, characterId, supabase])

  // Debounced auto-save
  useEffect(() => {
    if (!hasChanges || !name.trim()) return

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveCharacter()
    }, 2000) // 2 second debounce

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [name, summary, type, imageUrl, content, hasChanges, saveCharacter])

  // Handle portrait upload
  const handlePortraitUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB')
      return
    }

    setIsUploading(true)

    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Not authenticated')

      // Create unique filename with user ID prefix for RLS
      const fileExt = file.name.split('.').pop()
      const fileName = `${userData.user.id}/portraits/${Date.now()}.${fileExt}`

      const { data, error } = await supabase.storage
        .from('vault-images')
        .upload(fileName, file, { upsert: true })

      if (error) throw error

      if (data) {
        const { data: urlData } = supabase.storage
          .from('vault-images')
          .getPublicUrl(data.path)

        setImageUrl(urlData.publicUrl)
        setHasChanges(true)
      }
    } catch (error) {
      console.error('Portrait upload error:', error)
      alert('Failed to upload image')
    } finally {
      setIsUploading(false)
    }
  }, [supabase])

  // Handle inline image upload for editor
  const handleEditorImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editor) return

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB')
      return
    }

    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Not authenticated')

      // Create unique filename with user ID prefix for RLS
      const fileExt = file.name.split('.').pop()
      const fileName = `${userData.user.id}/content/${Date.now()}.${fileExt}`

      const { data, error } = await supabase.storage
        .from('vault-images')
        .upload(fileName, file, { upsert: true })

      if (error) throw error

      if (data) {
        const { data: urlData } = supabase.storage
          .from('vault-images')
          .getPublicUrl(data.path)

        editor.chain().focus().setImage({ src: urlData.publicUrl }).run()
      }
    } catch (error) {
      console.error('Image upload error:', error)
      alert('Failed to upload image')
    }
  }, [editor, supabase])

  const setLink = useCallback(() => {
    if (!editor) return

    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('Enter URL', previousUrl)

    if (url === null) return

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  const ToolbarButton = ({
    onClick,
    active,
    disabled,
    children,
    title,
  }: {
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
        'h-9 w-9 flex items-center justify-center rounded-lg hover:bg-[--bg-hover] transition-colors',
        active && 'bg-[--arcane-purple]/20 text-[--arcane-purple]',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {children}
    </button>
  )

  if (!editor) return null

  return (
    <div className="min-h-screen bg-[--bg-base]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[--border] bg-[--bg-base]/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => router.push('/vault')}
            className="flex items-center gap-2 text-[--text-secondary] hover:text-[--text-primary] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Vault</span>
          </button>

          {/* Save status */}
          <div className="flex items-center gap-3">
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-2 text-sm text-[--text-secondary]">
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-2 text-sm text-emerald-400">
                <Check className="w-4 h-4" />
                Saved
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="text-sm text-red-400">
                Failed to save
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Top section: Portrait + Name/Summary/Type */}
        <div className="flex gap-10 mb-12">
          {/* Portrait */}
          <div className="flex-shrink-0">
            <input
              ref={portraitInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePortraitUpload}
            />
            <button
              type="button"
              onClick={() => portraitInputRef.current?.click()}
              disabled={isUploading}
              className={cn(
                'relative w-[220px] h-[220px] rounded-2xl overflow-hidden transition-all group',
                'border-2 border-dashed',
                imageUrl
                  ? 'border-transparent'
                  : 'border-[--text-tertiary] hover:border-[--arcane-purple]',
                'focus:outline-none focus:ring-2 focus:ring-[--arcane-purple] focus:ring-offset-2 focus:ring-offset-[--bg-base]'
              )}
            >
              {imageUrl ? (
                <>
                  <Image
                    src={imageUrl}
                    alt={name || 'Character portrait'}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-10 h-10 text-white" />
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 bg-[#12121a] flex flex-col items-center justify-center gap-3">
                  {isUploading ? (
                    <Loader2 className="w-10 h-10 text-[--text-tertiary] animate-spin" />
                  ) : (
                    <>
                      {name ? (
                        <span className="text-6xl font-bold text-[#2a2a3a]">
                          {getInitials(name)}
                        </span>
                      ) : (
                        <Camera className="w-10 h-10 text-[--text-tertiary] group-hover:text-[--arcane-purple] transition-colors" />
                      )}
                      <span className="text-sm text-[--text-tertiary] group-hover:text-[--arcane-purple] transition-colors">
                        Click to upload
                      </span>
                    </>
                  )}
                </div>
              )}
            </button>
          </div>

          {/* Name, Summary, Type */}
          <div className="flex-1 space-y-6">
            {/* Name */}
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setHasChanges(true)
              }}
              placeholder="Character Name"
              className={cn(
                'w-full bg-transparent border-none outline-none',
                'text-4xl font-bold text-[--text-primary] placeholder:text-[--text-tertiary]',
                'focus:ring-0'
              )}
            />

            {/* Type toggle */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setType('pc')
                  setHasChanges(true)
                }}
                className={cn(
                  'px-4 py-2 rounded-lg font-semibold text-sm transition-all',
                  type === 'pc'
                    ? 'bg-[--arcane-purple] text-white'
                    : 'bg-[#1a1a24] text-[--text-secondary] hover:bg-[#222230]'
                )}
              >
                Player Character
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('npc')
                  setHasChanges(true)
                }}
                className={cn(
                  'px-4 py-2 rounded-lg font-semibold text-sm transition-all',
                  type === 'npc'
                    ? 'bg-[--arcane-gold] text-[#12121a]'
                    : 'bg-[#1a1a24] text-[--text-secondary] hover:bg-[#222230]'
                )}
              >
                NPC
              </button>
            </div>

            {/* Summary */}
            <div>
              <label className="block text-sm font-medium text-[--text-tertiary] mb-2">
                Summary
              </label>
              <textarea
                value={summary}
                onChange={(e) => {
                  setSummary(e.target.value)
                  setHasChanges(true)
                }}
                placeholder="A brief description of this character..."
                rows={3}
                className={cn(
                  'w-full px-4 py-3 rounded-xl resize-none',
                  'bg-[#12121a] border border-[--border]',
                  'text-[--text-primary] placeholder:text-[--text-tertiary]',
                  'focus:outline-none focus:border-[--arcane-purple]'
                )}
              />
            </div>
          </div>
        </div>

        {/* Editor section */}
        <div className="rounded-2xl border border-[--border] bg-[#12121a] overflow-hidden">
          {/* Toolbar */}
          <div className="border-b border-[--border] px-4 py-2 flex items-center gap-1 flex-wrap bg-[--bg-hover]/30">
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Undo"
            >
              <Undo className="h-5 w-5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Redo"
            >
              <Redo className="h-5 w-5" />
            </ToolbarButton>

            <div className="w-px h-6 bg-[--border] mx-2" />

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              active={editor.isActive('heading', { level: 1 })}
              title="Heading 1"
            >
              <Heading1 className="h-5 w-5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              active={editor.isActive('heading', { level: 2 })}
              title="Heading 2"
            >
              <Heading2 className="h-5 w-5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              active={editor.isActive('heading', { level: 3 })}
              title="Heading 3"
            >
              <Heading3 className="h-5 w-5" />
            </ToolbarButton>

            <div className="w-px h-6 bg-[--border] mx-2" />

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              active={editor.isActive('bold')}
              title="Bold"
            >
              <Bold className="h-5 w-5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              active={editor.isActive('italic')}
              title="Italic"
            >
              <Italic className="h-5 w-5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              active={editor.isActive('underline')}
              title="Underline"
            >
              <UnderlineIcon className="h-5 w-5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              active={editor.isActive('strike')}
              title="Strikethrough"
            >
              <Strikethrough className="h-5 w-5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCode().run()}
              active={editor.isActive('code')}
              title="Code"
            >
              <Code className="h-5 w-5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              active={editor.isActive('highlight')}
              title="Highlight"
            >
              <Highlighter className="h-5 w-5" />
            </ToolbarButton>

            <div className="w-px h-6 bg-[--border] mx-2" />

            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              active={editor.isActive({ textAlign: 'left' })}
              title="Align Left"
            >
              <AlignLeft className="h-5 w-5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              active={editor.isActive({ textAlign: 'center' })}
              title="Align Center"
            >
              <AlignCenter className="h-5 w-5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              active={editor.isActive({ textAlign: 'right' })}
              title="Align Right"
            >
              <AlignRight className="h-5 w-5" />
            </ToolbarButton>

            <div className="w-px h-6 bg-[--border] mx-2" />

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              active={editor.isActive('bulletList')}
              title="Bullet List"
            >
              <List className="h-5 w-5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              active={editor.isActive('orderedList')}
              title="Numbered List"
            >
              <ListOrdered className="h-5 w-5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              active={editor.isActive('blockquote')}
              title="Quote"
            >
              <Quote className="h-5 w-5" />
            </ToolbarButton>

            <div className="w-px h-6 bg-[--border] mx-2" />

            <ToolbarButton
              onClick={setLink}
              active={editor.isActive('link')}
              title="Add Link"
            >
              <LinkIcon className="h-5 w-5" />
            </ToolbarButton>

            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleEditorImageUpload}
            />
            <ToolbarButton
              onClick={() => imageInputRef.current?.click()}
              title="Insert Image"
            >
              <ImageIcon className="h-5 w-5" />
            </ToolbarButton>
          </div>

          {/* Editor content */}
          <EditorContent editor={editor} />
        </div>
      </main>
    </div>
  )
}

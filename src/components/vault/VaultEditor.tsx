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
import { useAutoSave } from '@/hooks'
import Image from 'next/image'
import {
  X,
  Camera,
  Loader2,
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
} from 'lucide-react'
import { Modal } from '@/components/ui'
import type { VaultCharacter } from '@/types/database'

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
  })

  const [characterId, setCharacterId] = useState<string | null>(character?.id || null)
  const [isUploading, setIsUploading] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)

  const editor = useEditor({
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
          'focus:outline-none min-h-[200px] p-4',
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
        if (isFullscreen) {
          e.preventDefault()
          setIsFullscreen(false)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen])

  // Auto-save
  const saveCharacter = useCallback(async () => {
    if (!formData.name.trim()) return

    const characterData = {
      name: formData.name.trim(),
      summary: formData.summary.trim() || null,
      type: formData.type,
      image_url: formData.image_url,
      notes: formData.notes,
      updated_at: new Date().toISOString(),
    }

    if (characterId) {
      await supabase
        .from('vault_characters')
        .update(characterData)
        .eq('id', characterId)
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

  // Handle portrait upload
  const handlePortraitUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      alert('Please select an image under 5MB')
      return
    }

    setIsUploading(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Not authenticated')

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
        setFormData(prev => ({ ...prev, image_url: urlData.publicUrl }))
      }
    } catch (error) {
      console.error('Portrait upload error:', error)
      alert('Failed to upload image')
    } finally {
      setIsUploading(false)
    }
  }, [supabase])

  // Handle inline image upload
  const handleEditorImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editor) return

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
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
  }, [editor])

  const handleDelete = async () => {
    if (!characterId) return
    await supabase.from('vault_characters').delete().eq('id', characterId)
    router.push('/vault')
  }

  const handleClose = () => {
    if (isFullscreen) {
      setIsFullscreen(false)
    } else {
      router.push('/vault')
    }
  }

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

  if (!editor) return null

  return (
    <>
      <div className="modal-backdrop" onClick={handleClose}>
        <div
          className={cn('character-modal', isFullscreen && 'character-modal-fullscreen')}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="character-modal-header">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                formData.type === 'pc'
                  ? "bg-[--arcane-purple]/20 text-[--arcane-purple]"
                  : "bg-[--arcane-gold]/20 text-[--arcane-gold]"
              )}>
                {formData.type === 'pc' ? <User className="w-5 h-5" /> : <Users className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="modal-title">{formData.name || (isCreateMode ? 'New Character' : 'Edit Character')}</h2>
                <p className="text-xs text-[--text-tertiary]">
                  {status === 'saving' ? 'Saving...' : status === 'saved' ? 'All changes saved' : isCreateMode && !characterId ? 'Enter a name to start' : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                className="btn-ghost btn-icon w-9 h-9"
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen (Ctrl+Shift+F)'}
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
              <button className="btn-ghost btn-icon w-9 h-9" onClick={handleClose}>
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className={cn('character-modal-body', isFullscreen && 'character-modal-body-fullscreen')}>
            {/* Top Section: Avatar + Basic Info */}
            <div className="character-modal-top">
              {/* Portrait Upload */}
              <input ref={portraitInputRef} type="file" accept="image/*" className="hidden" onChange={handlePortraitUpload} />
              <button
                type="button"
                onClick={() => portraitInputRef.current?.click()}
                disabled={isUploading}
                className={cn(
                  'relative w-28 h-28 rounded-xl overflow-hidden flex-shrink-0 transition-all group',
                  'border-2',
                  formData.image_url ? 'border-transparent' : 'border-dashed border-[--text-tertiary] hover:border-[--arcane-purple]',
                  'focus:outline-none focus:ring-2 focus:ring-[--arcane-purple]'
                )}
              >
                {formData.image_url ? (
                  <>
                    <Image src={formData.image_url} alt={formData.name || 'Portrait'} fill className="object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 bg-[--bg-hover] flex flex-col items-center justify-center">
                    {isUploading ? (
                      <Loader2 className="w-6 h-6 text-[--text-tertiary] animate-spin" />
                    ) : formData.name ? (
                      <span className="text-3xl font-bold text-[--text-tertiary]">{getInitials(formData.name)}</span>
                    ) : (
                      <Camera className="w-6 h-6 text-[--text-tertiary] group-hover:text-[--arcane-purple]" />
                    )}
                  </div>
                )}
              </button>

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
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'pc' })}
                      className={cn(
                        'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                        formData.type === 'pc'
                          ? 'bg-[--arcane-purple] text-white'
                          : 'bg-[--bg-hover] text-[--text-secondary] hover:bg-[--bg-elevated]'
                      )}
                    >
                      Player Character
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'npc' })}
                      className={cn(
                        'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                        formData.type === 'npc'
                          ? 'bg-[--arcane-gold] text-[#12121a]'
                          : 'bg-[--bg-hover] text-[--text-secondary] hover:bg-[--bg-elevated]'
                      )}
                    >
                      NPC
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="form-group">
              <label className="form-label">Summary</label>
              <textarea
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                placeholder="Brief description - role, personality, or key traits..."
                rows={2}
                className="form-textarea"
              />
            </div>

            {/* Notes - Rich Text Editor */}
            <div className="form-group flex-1 flex flex-col min-h-0">
              <label className="form-label">Notes</label>
              <div className="flex-1 min-h-[200px] border border-[--border] rounded-lg overflow-hidden bg-[--bg-surface]">
                {/* Toolbar */}
                <div className="border-b border-[--border] px-2 py-1.5 flex items-center gap-0.5 flex-wrap bg-[--bg-hover]/30">
                  <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">
                    <Undo className="h-4 w-4" />
                  </ToolbarButton>
                  <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">
                    <Redo className="h-4 w-4" />
                  </ToolbarButton>
                  <div className="w-px h-5 bg-[--border] mx-1" />
                  <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1">
                    <Heading1 className="h-4 w-4" />
                  </ToolbarButton>
                  <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">
                    <Heading2 className="h-4 w-4" />
                  </ToolbarButton>
                  <div className="w-px h-5 bg-[--border] mx-1" />
                  <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
                    <Bold className="h-4 w-4" />
                  </ToolbarButton>
                  <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
                    <Italic className="h-4 w-4" />
                  </ToolbarButton>
                  <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline">
                    <UnderlineIcon className="h-4 w-4" />
                  </ToolbarButton>
                  <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
                    <Strikethrough className="h-4 w-4" />
                  </ToolbarButton>
                  <ToolbarButton onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="Highlight">
                    <Highlighter className="h-4 w-4" />
                  </ToolbarButton>
                  <div className="w-px h-5 bg-[--border] mx-1" />
                  <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List">
                    <List className="h-4 w-4" />
                  </ToolbarButton>
                  <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered List">
                    <ListOrdered className="h-4 w-4" />
                  </ToolbarButton>
                  <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Quote">
                    <Quote className="h-4 w-4" />
                  </ToolbarButton>
                  <div className="w-px h-5 bg-[--border] mx-1" />
                  <ToolbarButton onClick={setLink} active={editor.isActive('link')} title="Link">
                    <LinkIcon className="h-4 w-4" />
                  </ToolbarButton>
                  <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleEditorImageUpload} />
                  <ToolbarButton onClick={() => imageInputRef.current?.click()} title="Insert Image">
                    <ImageIcon className="h-4 w-4" />
                  </ToolbarButton>
                </div>
                <EditorContent editor={editor} />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="character-modal-footer">
            {characterId ? (
              <button className="btn btn-ghost text-[--arcane-ember]" onClick={() => setIsDeleteConfirmOpen(true)}>
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

      {/* Delete Confirmation */}
      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        title="Delete Character"
        description="Are you sure? This cannot be undone."
      >
        <div className="flex justify-end gap-3 pt-4">
          <button className="btn btn-secondary" onClick={() => setIsDeleteConfirmOpen(false)}>Cancel</button>
          <button className="btn bg-[--arcane-ember] hover:bg-[--arcane-ember]/80 text-white" onClick={handleDelete}>Delete</button>
        </div>
      </Modal>
    </>
  )
}

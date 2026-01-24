'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Highlight from '@tiptap/extension-highlight'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import TiptapImage from '@tiptap/extension-image'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { cn } from '@/lib/utils'
import {
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
  CheckSquare,
  Undo,
  Redo,
  Sparkles,
  Loader2,
  ImageIcon,
} from 'lucide-react'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  className?: string
  editable?: boolean
  enableAI?: boolean
  aiContext?: string
  enableImageUpload?: boolean
  onImageUpload?: (file: File) => Promise<string | null>
  minHeight?: number
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start writing...',
  className,
  editable = true,
  enableAI = false,
  aiContext = '',
  enableImageUpload = false,
  onImageUpload,
  minHeight = 200,
}: RichTextEditorProps) {
  const [isAiLoading, setIsAiLoading] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const handleAiExpand = useCallback(async () => {
    if (!content.trim() || isAiLoading) return

    const confirmed = window.confirm('Expand this content into a more detailed narrative using AI?')
    if (!confirmed) return

    setIsAiLoading(true)

    try {
      const response = await fetch('/api/ai/expand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: content,
          context: aiContext,
          provider: 'anthropic',
        }),
      })

      if (!response.ok) throw new Error('AI expansion failed')

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response stream')

      let expandedContent = ''
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        expandedContent += decoder.decode(value, { stream: true })
      }

      // Append the expanded content after the original
      const newContent = `${content}\n\n---\n\n**AI Expanded:**\n\n${expandedContent}`
      onChange(newContent)
    } catch (error) {
      console.error('AI expand error:', error)
      alert('Failed to expand content. Please try again.')
    } finally {
      setIsAiLoading(false)
    }
  }, [content, aiContext, isAiLoading, onChange])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-purple-400 underline',
        },
      }),
      Highlight.configure({
        HTMLAttributes: {
          class: 'bg-[--arcane-gold]/30 px-1 rounded',
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      TiptapImage.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full',
        },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-invert prose-sm max-w-none',
          'focus:outline-none p-4',
          // Headings - match the preview styling
          'prose-headings:text-white prose-headings:font-semibold',
          '[&>h3]:mt-6 [&>h3:first-child]:mt-0 [&>h3]:mb-2 [&>h3]:text-base [&>h3]:font-semibold',
          // Paragraphs
          'prose-p:text-gray-300 prose-p:my-2 [&>p]:mb-4',
          // Strong/emphasis - make bold stand out more
          'prose-strong:text-white prose-strong:font-semibold',
          'prose-em:text-purple-300 prose-em:not-italic',
          // Lists - proper spacing and bullet markers
          'prose-ul:text-gray-300 prose-ol:text-gray-300',
          'prose-ul:list-disc prose-ul:pl-5 prose-ol:list-decimal prose-ol:pl-5',
          '[&>ul]:mt-1 [&>ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5',
          'prose-li:text-gray-300 prose-li:my-0.5',
          // Other elements
          'prose-blockquote:border-l-purple-500 prose-blockquote:text-gray-400',
          'prose-code:text-purple-400 prose-code:bg-white/10 prose-code:px-1 prose-code:rounded',
          'prose-img:rounded-lg prose-img:my-4',
          className
        ),
      },
    },
  })

  // Update editor content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

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

  const handleImageUploadClick = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editor || !onImageUpload) return

    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      alert('Please select an image under 5MB')
      return
    }

    try {
      const url = await onImageUpload(file)
      if (url) {
        editor.chain().focus().setImage({ src: url }).run()
      }
    } catch (error) {
      console.error('Image upload error:', error)
      alert('Failed to upload image')
    }

    // Reset input
    if (imageInputRef.current) {
      imageInputRef.current.value = ''
    }
  }, [editor, onImageUpload])

  if (!editor) {
    return null
  }

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
        'p-2 rounded-lg transition-all duration-200',
        active
          ? 'bg-purple-500/20 text-purple-400 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.3)]'
          : 'text-gray-500 hover:text-gray-200 hover:bg-white/[0.06]',
        disabled && 'opacity-30 cursor-not-allowed hover:bg-transparent hover:text-gray-500'
      )}
    >
      {children}
    </button>
  )

  return (
    <div className="border border-[--border] rounded-xl bg-[--bg-surface] overflow-hidden">
      {/* Toolbar */}
      <div className="border-b border-[--border] px-3 py-2 flex items-center gap-1 flex-wrap bg-white/[0.02]">
        {/* Undo/Redo */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
          >
            <Undo className="w-5 h-5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
          >
            <Redo className="w-5 h-5" />
          </ToolbarButton>
        </div>

        <div className="w-px h-5 bg-white/10 mx-1.5" />

        {/* Headings */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive('heading', { level: 1 })}
            title="Heading 1"
          >
            <Heading1 className="w-5 h-5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
            title="Heading 2"
          >
            <Heading2 className="w-5 h-5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive('heading', { level: 3 })}
            title="Heading 3"
          >
            <Heading3 className="w-5 h-5" />
          </ToolbarButton>
        </div>

        <div className="w-px h-5 bg-white/10 mx-1.5" />

        {/* Text formatting */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            title="Bold"
          >
            <Bold className="w-5 h-5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            title="Italic"
          >
            <Italic className="w-5 h-5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive('underline')}
            title="Underline"
          >
            <UnderlineIcon className="w-5 h-5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive('strike')}
            title="Strikethrough"
          >
            <Strikethrough className="w-5 h-5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            active={editor.isActive('code')}
            title="Code"
          >
            <Code className="w-5 h-5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            active={editor.isActive('highlight')}
            title="Highlight"
          >
            <Highlighter className="w-5 h-5" />
          </ToolbarButton>
        </div>

        <div className="w-px h-5 bg-white/10 mx-1.5" />

        {/* Lists and blocks */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            title="Bullet List"
          >
            <List className="w-5 h-5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            title="Numbered List"
          >
            <ListOrdered className="w-5 h-5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            active={editor.isActive('taskList')}
            title="Task List"
          >
            <CheckSquare className="w-5 h-5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive('blockquote')}
            title="Quote"
          >
            <Quote className="w-5 h-5" />
          </ToolbarButton>
        </div>

        <div className="w-px h-5 bg-white/10 mx-1.5" />

        {/* Link */}
        <ToolbarButton onClick={setLink} active={editor.isActive('link')} title="Link">
          <LinkIcon className="w-5 h-5" />
        </ToolbarButton>

        {/* Image upload */}
        {enableImageUpload && onImageUpload && (
          <>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUploadClick}
            />
            <ToolbarButton onClick={() => imageInputRef.current?.click()} title="Insert Image">
              <ImageIcon className="w-5 h-5" />
            </ToolbarButton>
          </>
        )}

        {/* AI Expand */}
        {enableAI && (
          <>
            <div className="w-px h-5 bg-white/10 mx-1.5" />
            <ToolbarButton
              onClick={handleAiExpand}
              disabled={isAiLoading || !content.trim()}
              title="AI Expand"
            >
              {isAiLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-[--arcane-gold]" />
              ) : (
                <Sparkles className="w-5 h-5 text-[--arcane-gold]" />
              )}
            </ToolbarButton>
          </>
        )}
      </div>

      {/* Editor Content */}
      <div style={{ minHeight: `${minHeight}px` }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

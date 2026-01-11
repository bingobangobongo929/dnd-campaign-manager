'use client'

import { useCallback, useEffect, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Highlight from '@tiptap/extension-highlight'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { cn } from '@/lib/utils'
import {
  Bold,
  Italic,
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
} from 'lucide-react'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  className?: string
  editable?: boolean
  enableAI?: boolean
  aiContext?: string
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start writing...',
  className,
  editable = true,
  enableAI = false,
  aiContext = '',
}: RichTextEditorProps) {
  const [isAiLoading, setIsAiLoading] = useState(false)

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
          class: 'text-[--accent-primary] underline',
        },
      }),
      Highlight.configure({
        HTMLAttributes: {
          class: 'bg-[--accent-secondary]/30 px-1 rounded',
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
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
          'prose prose-invert max-w-none',
          'focus:outline-none min-h-[200px] p-4',
          'prose-headings:text-[--text-primary] prose-headings:font-semibold',
          'prose-p:text-[--text-primary] prose-p:my-2',
          'prose-strong:text-[--text-primary]',
          'prose-em:text-[--text-primary]',
          'prose-ul:text-[--text-primary] prose-ol:text-[--text-primary]',
          'prose-li:text-[--text-primary]',
          'prose-blockquote:border-l-[--accent-primary] prose-blockquote:text-[--text-secondary]',
          'prose-code:text-[--accent-primary] prose-code:bg-[--bg-hover] prose-code:px-1 prose-code:rounded',
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

  if (!editor) {
    return null
  }

  const ToolbarButton = ({
    onClick,
    active,
    disabled,
    children,
  }: {
    onClick: () => void
    active?: boolean
    disabled?: boolean
    children: React.ReactNode
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'h-9 w-9 flex items-center justify-center rounded hover:bg-[--bg-hover] transition-colors',
        active && 'bg-[--accent-primary]/20 text-[--accent-primary]',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {children}
    </button>
  )

  return (
    <div className="border border-[--border] rounded-lg bg-[--bg-surface] overflow-hidden">
      {/* Toolbar */}
      <div className="border-b border-[--border] px-2 h-11 flex items-center gap-1.5 flex-wrap bg-[--bg-hover]/50">
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Undo className="h-5 w-5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <Redo className="h-5 w-5" />
        </ToolbarButton>

        <div className="w-px h-6 bg-[--border] mx-1.5" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive('heading', { level: 1 })}
        >
          <Heading1 className="h-5 w-5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
        >
          <Heading2 className="h-5 w-5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
        >
          <Heading3 className="h-5 w-5" />
        </ToolbarButton>

        <div className="w-px h-6 bg-[--border] mx-1.5" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
        >
          <Bold className="h-5 w-5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
        >
          <Italic className="h-5 w-5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
        >
          <Strikethrough className="h-5 w-5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive('code')}
        >
          <Code className="h-5 w-5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          active={editor.isActive('highlight')}
        >
          <Highlighter className="h-5 w-5" />
        </ToolbarButton>

        <div className="w-px h-6 bg-[--border] mx-1.5" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
        >
          <List className="h-5 w-5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
        >
          <ListOrdered className="h-5 w-5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          active={editor.isActive('taskList')}
        >
          <CheckSquare className="h-5 w-5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
        >
          <Quote className="h-5 w-5" />
        </ToolbarButton>

        <div className="w-px h-6 bg-[--border] mx-1.5" />

        <ToolbarButton onClick={setLink} active={editor.isActive('link')}>
          <LinkIcon className="h-5 w-5" />
        </ToolbarButton>

        {enableAI && (
          <>
            <div className="w-px h-6 bg-[--border] mx-1.5" />
            <ToolbarButton
              onClick={handleAiExpand}
              disabled={isAiLoading || !content.trim()}
            >
              {isAiLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-[--arcane-gold]" />
              ) : (
                <Sparkles className="h-5 w-5 text-[--arcane-gold]" />
              )}
            </ToolbarButton>
          </>
        )}
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  )
}

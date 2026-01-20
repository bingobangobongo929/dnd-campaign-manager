'use client'

import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'

interface MarkdownContentProps {
  content: string
  className?: string
}

/**
 * Renders markdown content with proper dark mode styling.
 * Handles headers, bold, italic, lists, tables, blockquotes, and code.
 */
export function MarkdownContent({ content, className }: MarkdownContentProps) {
  if (!content) return null

  return (
    <div className={cn('prose prose-sm prose-invert max-w-none', className)}>
      <ReactMarkdown
        components={{
          // Headers
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-white mt-6 mb-3 first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold text-white mt-5 mb-2 first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-white/90 mt-4 mb-2 first:mt-0">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-semibold text-white/80 mt-3 mb-1 first:mt-0">{children}</h4>
          ),
          // Paragraphs
          p: ({ children }) => (
            <p className="text-gray-300 mb-3 last:mb-0 leading-relaxed">{children}</p>
          ),
          // Text formatting
          strong: ({ children }) => (
            <strong className="text-white font-semibold">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="text-gray-200 italic">{children}</em>
          ),
          // Lists
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1 mb-3 text-gray-300 ml-2">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1 mb-3 text-gray-300 ml-2">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-gray-300">{children}</li>
          ),
          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-purple-500/50 pl-4 py-1 my-3 italic text-gray-400 bg-purple-500/5 rounded-r">
              {children}
            </blockquote>
          ),
          // Code
          code: ({ children, className }) => {
            const isInline = !className
            if (isInline) {
              return (
                <code className="bg-white/10 text-purple-300 px-1.5 py-0.5 rounded text-sm font-mono">
                  {children}
                </code>
              )
            }
            return (
              <code className="block bg-black/30 text-gray-300 p-3 rounded-lg overflow-x-auto text-sm font-mono">
                {children}
              </code>
            )
          },
          pre: ({ children }) => (
            <pre className="bg-black/30 rounded-lg overflow-x-auto my-3">{children}</pre>
          ),
          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full text-sm border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="border-b border-white/10">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-white/5">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-white/[0.02]">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-gray-300">{children}</td>
          ),
          // Horizontal rules
          hr: () => (
            <hr className="border-white/10 my-4" />
          ),
          // Links
          a: ({ children, href }) => (
            <a
              href={href}
              className="text-purple-400 hover:text-purple-300 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

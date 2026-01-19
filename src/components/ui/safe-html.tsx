import sanitize from 'sanitize-html'

// Configuration for sanitize-html
// Works in both server and client environments without jsdom
const SANITIZE_CONFIG: sanitize.IOptions = {
  allowedTags: [
    // Text formatting
    'p', 'br', 'b', 'i', 'em', 'strong', 'u', 's', 'strike',
    // Headings
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    // Lists (including task lists)
    'ul', 'ol', 'li',
    // Block elements
    'blockquote', 'pre', 'code',
    // Containers
    'a', 'span', 'div',
    // Tables
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    // Other
    'hr', 'sub', 'sup', 'mark',
    // Images (from TipTap)
    'img',
    // Labels for task items
    'label', 'input',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel', 'class', 'style'],
    img: ['src', 'alt', 'width', 'height', 'class', 'style'],
    div: ['class', 'style', 'data-type', 'data-checked'],
    span: ['class', 'style', 'data-type', 'data-checked'],
    p: ['class', 'style'],
    ul: ['class', 'style', 'data-type'],
    ol: ['class', 'style'],
    li: ['class', 'style', 'data-type', 'data-checked'],
    input: ['type', 'checked', 'disabled', 'class'],
    label: ['class', 'style'],
    table: ['class', 'style'],
    th: ['colspan', 'rowspan', 'class', 'style'],
    td: ['colspan', 'rowspan', 'class', 'style'],
    blockquote: ['class', 'style'],
    pre: ['class', 'style'],
    code: ['class', 'style'],
    h1: ['class', 'style'],
    h2: ['class', 'style'],
    h3: ['class', 'style'],
    h4: ['class', 'style'],
    h5: ['class', 'style'],
    h6: ['class', 'style'],
  },
  // Transform links to add security attributes
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        target: '_blank',
        rel: 'noopener noreferrer',
      },
    }),
  },
}

/**
 * Utility function to sanitize HTML.
 * Works in both server and client environments (no jsdom required).
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return ''
  return sanitize(html, SANITIZE_CONFIG)
}

interface SafeHtmlProps {
  html: string | null | undefined
  className?: string
  as?: 'div' | 'span' | 'p' | 'article' | 'section'
}

/**
 * Safely renders HTML content with DOMPurify sanitization.
 * Use this instead of dangerouslySetInnerHTML to prevent XSS attacks.
 * Works in both server and client components.
 */
export function SafeHtml({ html, className = '', as: Component = 'div' }: SafeHtmlProps) {
  const sanitizedHtml = sanitizeHtml(html)

  if (!sanitizedHtml) return null

  return (
    <Component
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  )
}

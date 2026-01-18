import DOMPurify from 'isomorphic-dompurify'

// Configuration for DOMPurify
const PURIFY_CONFIG = {
  ALLOWED_TAGS: [
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
  ALLOWED_ATTR: [
    // Links
    'href', 'target', 'rel',
    // Styling
    'class', 'style',
    // Tables
    'colspan', 'rowspan',
    // Images
    'src', 'alt', 'width', 'height',
    // TipTap task lists
    'data-type', 'data-checked',
    // Input (for task checkboxes)
    'type', 'checked', 'disabled',
  ],
  ALLOW_DATA_ATTR: true, // Allow data-* attributes for TipTap
}

/**
 * Utility function to sanitize HTML.
 * Works in both server and client environments.
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return ''

  let sanitized = DOMPurify.sanitize(html, PURIFY_CONFIG)

  // Add security attributes to links
  sanitized = sanitized.replace(
    /<a\s+([^>]*href=[^>]*)>/gi,
    '<a $1 target="_blank" rel="noopener noreferrer">'
  )

  return sanitized
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

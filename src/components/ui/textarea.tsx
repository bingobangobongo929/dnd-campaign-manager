'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <textarea
          className={cn(
            'flex min-h-[120px] w-full rounded-lg border bg-[--bg-surface] px-3 py-2 text-sm text-[--text-primary] placeholder:text-[--text-tertiary] transition-colors resize-y',
            'border-[--border] focus:border-[--border-focus] focus:outline-none focus:ring-2 focus:ring-[--border-focus]/20',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-[--accent-danger] focus:border-[--accent-danger] focus:ring-[--accent-danger]/20',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-sm text-[--accent-danger]">{error}</p>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

export { Textarea }

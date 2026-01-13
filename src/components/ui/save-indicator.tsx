'use client'

import { Check, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface SaveIndicatorProps {
  status: SaveStatus
  className?: string
}

export function SaveIndicator({ status, className }: SaveIndicatorProps) {
  if (status === 'idle') return null

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-xs font-medium transition-opacity',
        className
      )}
    >
      {status === 'saving' && (
        <>
          <Loader2 className="h-3 w-3 spinner text-[--text-tertiary]" />
          <span className="text-[--text-tertiary]">Saving...</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <Check className="h-3 w-3 text-[--arcane-emerald]" />
          <span className="text-[--arcane-emerald]">Saved</span>
        </>
      )}
      {status === 'error' && (
        <>
          <AlertCircle className="h-3 w-3 text-[--arcane-ember]" />
          <span className="text-[--arcane-ember]">Error saving</span>
        </>
      )}
    </div>
  )
}

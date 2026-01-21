'use client'

import { useState } from 'react'
import { Bookmark, BookmarkCheck, Loader2, LogIn } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface SaveToCollectionButtonProps {
  snapshotId: string
  isLoggedIn: boolean
  isSaved?: boolean
  onSave?: () => Promise<void>
  onUnsave?: () => Promise<void>
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'outline'
  className?: string
}

export function SaveToCollectionButton({
  snapshotId,
  isLoggedIn,
  isSaved = false,
  onSave,
  onUnsave,
  size = 'md',
  variant = 'default',
  className,
}: SaveToCollectionButtonProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(isSaved)

  const handleClick = async () => {
    if (!isLoggedIn) {
      // Redirect to login with return URL
      const returnUrl = encodeURIComponent(window.location.pathname + window.location.search)
      router.push(`/login?returnUrl=${returnUrl}`)
      return
    }

    setSaving(true)
    try {
      if (saved) {
        // Unsave
        const response = await fetch(`/api/templates/save?snapshotId=${snapshotId}`, {
          method: 'DELETE',
        })
        if (response.ok) {
          setSaved(false)
          onUnsave?.()
        }
      } else {
        // Save
        const response = await fetch('/api/templates/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ snapshotId }),
        })
        if (response.ok) {
          setSaved(true)
          onSave?.()
        }
      }
    } catch (error) {
      console.error('Save error:', error)
    } finally {
      setSaving(false)
    }
  }

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2',
  }

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }

  const baseClasses = cn(
    'inline-flex items-center justify-center font-medium rounded-lg transition-all',
    sizeClasses[size]
  )

  const variantClasses = {
    default: saved
      ? 'bg-purple-600 text-white hover:bg-purple-500'
      : 'bg-white/10 text-white hover:bg-white/20',
    outline: saved
      ? 'border-2 border-purple-500 text-purple-400 hover:bg-purple-500/10'
      : 'border-2 border-white/20 text-gray-300 hover:border-white/40 hover:text-white',
  }

  if (!isLoggedIn) {
    return (
      <button
        onClick={handleClick}
        className={cn(baseClasses, variantClasses[variant], className)}
      >
        <LogIn className={iconSizes[size]} />
        Sign in to Save
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={saving}
      className={cn(baseClasses, variantClasses[variant], 'disabled:opacity-50', className)}
    >
      {saving ? (
        <Loader2 className={cn(iconSizes[size], 'animate-spin')} />
      ) : saved ? (
        <BookmarkCheck className={iconSizes[size]} />
      ) : (
        <Bookmark className={iconSizes[size]} />
      )}
      {saved ? 'Saved' : 'Save to Collection'}
    </button>
  )
}

// Compact icon-only version
export function SaveToCollectionIconButton({
  snapshotId,
  isLoggedIn,
  isSaved = false,
  onSave,
  onUnsave,
  className,
}: Omit<SaveToCollectionButtonProps, 'size' | 'variant'>) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(isSaved)

  const handleClick = async () => {
    if (!isLoggedIn) {
      const returnUrl = encodeURIComponent(window.location.pathname + window.location.search)
      router.push(`/login?returnUrl=${returnUrl}`)
      return
    }

    setSaving(true)
    try {
      if (saved) {
        const response = await fetch(`/api/templates/save?snapshotId=${snapshotId}`, {
          method: 'DELETE',
        })
        if (response.ok) {
          setSaved(false)
          onUnsave?.()
        }
      } else {
        const response = await fetch('/api/templates/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ snapshotId }),
        })
        if (response.ok) {
          setSaved(true)
          onSave?.()
        }
      }
    } catch (error) {
      console.error('Save error:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={saving}
      className={cn(
        'p-2 rounded-lg transition-all',
        saved
          ? 'bg-purple-500 text-white'
          : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white',
        'disabled:opacity-50',
        className
      )}
      title={saved ? 'Saved to collection' : 'Save to collection'}
    >
      {saving ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : saved ? (
        <BookmarkCheck className="w-5 h-5" />
      ) : (
        <Bookmark className="w-5 h-5" />
      )}
    </button>
  )
}

'use client'

import { useState } from 'react'
import { Check, X, Clock3, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PlayerSessionResponseProps {
  currentStatus: 'attending' | 'unavailable' | 'late'
  currentNote?: string
  onUpdate: (status: 'attending' | 'unavailable' | 'late', note?: string) => void
  compact?: boolean
  className?: string
}

export function PlayerSessionResponse({
  currentStatus,
  currentNote,
  onUpdate,
  compact = false,
  className
}: PlayerSessionResponseProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<'attending' | 'unavailable' | 'late'>(currentStatus)
  const [noteValue, setNoteValue] = useState(currentNote || '')

  const handleStatusClick = (status: 'attending' | 'unavailable' | 'late') => {
    setSelectedStatus(status)

    if (status === 'attending') {
      // Attending doesn't need a note, submit immediately
      onUpdate(status, undefined)
      setIsEditing(false)
      setNoteValue('')
    } else {
      // For unavailable/late, show note input
      setIsEditing(true)
    }
  }

  const handleSubmit = () => {
    onUpdate(selectedStatus, noteValue || undefined)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setSelectedStatus(currentStatus)
    setNoteValue(currentNote || '')
    setIsEditing(false)
  }

  const statusOptions = [
    {
      value: 'attending' as const,
      label: compact ? '' : 'Attending',
      icon: Check,
      activeClass: 'bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/30',
      inactiveClass: 'bg-white/[0.04] text-[--text-secondary] hover:bg-white/[0.08]',
    },
    {
      value: 'late' as const,
      label: compact ? '' : 'Late',
      icon: Clock3,
      activeClass: 'bg-amber-500/20 text-amber-400 ring-2 ring-amber-500/30',
      inactiveClass: 'bg-white/[0.04] text-[--text-secondary] hover:bg-white/[0.08]',
    },
    {
      value: 'unavailable' as const,
      label: compact ? '' : "Can't Make It",
      icon: X,
      activeClass: 'bg-red-500/20 text-red-400 ring-2 ring-red-500/30',
      inactiveClass: 'bg-white/[0.04] text-[--text-secondary] hover:bg-white/[0.08]',
    },
  ]

  if (isEditing) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex gap-2">
          {statusOptions.map((option) => {
            const Icon = option.icon
            const isActive = selectedStatus === option.value

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelectedStatus(option.value)}
                className={cn(
                  'flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                  compact ? 'flex-1' : 'flex-1',
                  isActive ? option.activeClass : option.inactiveClass
                )}
              >
                <Icon className="w-4 h-4" />
                {option.label}
              </button>
            )
          })}
        </div>

        <div className="relative">
          <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-tertiary]" />
          <input
            type="text"
            value={noteValue}
            onChange={(e) => setNoteValue(e.target.value)}
            placeholder="Optional note (e.g., 'work until 8pm')"
            className={cn(
              'w-full pl-10 pr-4 py-2.5 rounded-lg',
              'bg-white/[0.04] border border-white/[0.06]',
              'text-sm text-white placeholder:text-[--text-tertiary]',
              'focus:outline-none focus:ring-2 focus:ring-[--arcane-purple]/30'
            )}
            autoFocus
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 px-4 py-2 rounded-lg text-sm text-[--text-secondary] bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex-1 px-4 py-2 rounded-lg text-sm text-white bg-[--arcane-purple] hover:bg-[--arcane-purple]/80 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex gap-2">
        {statusOptions.map((option) => {
          const Icon = option.icon
          const isActive = currentStatus === option.value

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleStatusClick(option.value)}
              className={cn(
                'flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all',
                compact ? 'p-2' : 'flex-1 px-4 py-2',
                isActive ? option.activeClass : option.inactiveClass
              )}
              title={option.label || option.value}
            >
              <Icon className="w-4 h-4" />
              {!compact && option.label}
            </button>
          )
        })}
      </div>

      {currentNote && (
        <div className="flex items-center gap-2 text-xs text-[--text-tertiary]">
          <MessageSquare className="w-3 h-3" />
          <span className="text-[--text-secondary]">{currentNote}</span>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-[--arcane-purple] hover:underline ml-auto"
          >
            Edit
          </button>
        </div>
      )}
    </div>
  )
}

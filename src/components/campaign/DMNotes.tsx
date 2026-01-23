'use client'

import { useState, useEffect } from 'react'
import { Lock, Save, X, Edit2, Loader2, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface DMNotesProps {
  value: string | null
  onChange?: (value: string) => void
  onSave?: (value: string) => Promise<void>
  isDm: boolean
  placeholder?: string
  className?: string
  collapsible?: boolean
  defaultExpanded?: boolean
  label?: string
}

export function DMNotes({
  value,
  onChange,
  onSave,
  isDm,
  placeholder = "Add DM-only notes here...",
  className,
  collapsible = true,
  defaultExpanded = false,
  label = "DM Notes",
}: DMNotesProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value || '')
  const [isSaving, setIsSaving] = useState(false)
  const [isExpanded, setIsExpanded] = useState(defaultExpanded || !!value)

  // Update edit value when prop changes
  useEffect(() => {
    setEditValue(value || '')
  }, [value])

  // Don't render if not DM
  if (!isDm) return null

  const handleSave = async () => {
    if (onSave) {
      setIsSaving(true)
      try {
        await onSave(editValue)
        setIsEditing(false)
        toast.success('Notes saved')
      } catch (error) {
        console.error('Failed to save notes:', error)
        toast.error('Failed to save notes')
      } finally {
        setIsSaving(false)
      }
    } else if (onChange) {
      onChange(editValue)
      setIsEditing(false)
    }
  }

  const handleCancel = () => {
    setEditValue(value || '')
    setIsEditing(false)
  }

  // Collapsible header
  const header = (
    <div
      className={cn(
        "flex items-center justify-between",
        collapsible && "cursor-pointer"
      )}
      onClick={() => collapsible && setIsExpanded(!isExpanded)}
    >
      <div className="flex items-center gap-2">
        <Lock className="w-4 h-4 text-red-400" />
        <span className="text-sm font-medium text-gray-300">{label}</span>
        <span className="text-xs text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
          DM Only
        </span>
      </div>
      <div className="flex items-center gap-2">
        {!isEditing && value && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsEditing(true)
            }}
            className="p-1 hover:bg-white/[0.05] rounded text-gray-400 hover:text-gray-300"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}
        {collapsible && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
            className="p-1 hover:bg-white/[0.05] rounded text-gray-400"
          >
            {isExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  )

  if (collapsible && !isExpanded) {
    return (
      <div className={cn(
        "p-3 bg-red-500/5 border border-red-500/20 rounded-lg",
        className
      )}>
        {header}
        {value && (
          <p className="text-xs text-gray-500 mt-1 truncate">
            {value.slice(0, 100)}{value.length > 100 ? '...' : ''}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className={cn(
      "p-3 bg-red-500/5 border border-red-500/20 rounded-lg",
      className
    )}>
      {header}

      <div className="mt-3">
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder={placeholder}
              rows={4}
              className="form-input w-full text-sm"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="btn btn-sm btn-secondary"
              >
                <X className="w-3 h-3 mr-1" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="btn btn-sm btn-primary"
              >
                {isSaving ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <Save className="w-3 h-3 mr-1" />
                    Save
                  </>
                )}
              </button>
            </div>
          </div>
        ) : value ? (
          <div
            className="text-sm text-gray-300 whitespace-pre-wrap cursor-pointer hover:bg-white/[0.02] rounded p-1 -m-1"
            onClick={() => setIsEditing(true)}
          >
            {value}
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="w-full text-left text-sm text-gray-500 hover:text-gray-400 py-2"
          >
            {placeholder}
          </button>
        )}
      </div>
    </div>
  )
}

// Compact inline version for small spaces
interface DMNotesInlineProps {
  value: string | null
  isDm: boolean
  className?: string
}

export function DMNotesInline({ value, isDm, className }: DMNotesInlineProps) {
  if (!isDm || !value) return null

  return (
    <div className={cn(
      "flex items-start gap-2 p-2 bg-red-500/5 border border-red-500/20 rounded text-xs",
      className
    )}>
      <Lock className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
      <p className="text-gray-400">{value}</p>
    </div>
  )
}

// Preview badge that shows there are DM notes without revealing content
interface DMNotesIndicatorProps {
  hasDmNotes: boolean
  isDm: boolean
  className?: string
  onClick?: () => void
}

export function DMNotesIndicator({ hasDmNotes, isDm, className, onClick }: DMNotesIndicatorProps) {
  if (!isDm || !hasDmNotes) return null

  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 text-xs text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded hover:bg-red-500/20 transition-colors",
        className
      )}
      title="Has DM notes"
    >
      <Lock className="w-3 h-3" />
      <span>DM Notes</span>
    </button>
  )
}

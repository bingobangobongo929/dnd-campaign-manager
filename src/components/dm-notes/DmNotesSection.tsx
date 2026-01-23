'use client'

import { useState } from 'react'
import {
  Eye,
  EyeOff,
  Lock,
  Users,
  Globe,
  ChevronDown,
  ChevronUp,
  Shield,
} from 'lucide-react'
import { Textarea } from '@/components/ui'
import { cn } from '@/lib/utils'

export type VisibilityLevel = 'public' | 'party' | 'dm_only'

interface DmNotesSectionProps {
  dmNotes: string
  onDmNotesChange: (notes: string) => void
  visibility?: VisibilityLevel
  onVisibilityChange?: (visibility: VisibilityLevel) => void
  showVisibilityToggle?: boolean
  placeholder?: string
  className?: string
  collapsed?: boolean
}

const visibilityOptions: { value: VisibilityLevel; label: string; icon: typeof Globe; description: string }[] = [
  { value: 'public', label: 'Public', icon: Globe, description: 'Everyone with access can see' },
  { value: 'party', label: 'Party Only', icon: Users, description: 'Only party members and DM' },
  { value: 'dm_only', label: 'DM Only', icon: Lock, description: 'Only visible to you (the DM)' },
]

export function DmNotesSection({
  dmNotes,
  onDmNotesChange,
  visibility = 'dm_only',
  onVisibilityChange,
  showVisibilityToggle = true,
  placeholder = 'Private notes, plot hooks, secret motivations... Players will never see this.',
  className,
  collapsed: initialCollapsed = true,
}: DmNotesSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed)
  const [showVisibilityMenu, setShowVisibilityMenu] = useState(false)

  const currentVisibility = visibilityOptions.find(v => v.value === visibility) || visibilityOptions[2]
  const VisibilityIcon = currentVisibility.icon

  return (
    <div className={cn("border border-purple-500/20 rounded-lg overflow-hidden", className)}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between px-4 py-3 bg-purple-500/5 hover:bg-purple-500/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-purple-400" />
          <span className="font-medium text-white text-sm">DM Notes</span>
          {dmNotes && (
            <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
              Has notes
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <EyeOff className="w-3 h-3" />
            Hidden from players
          </span>
          {isCollapsed ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Content */}
      {!isCollapsed && (
        <div className="p-4 space-y-4 bg-purple-500/5">
          {/* Visibility Toggle */}
          {showVisibilityToggle && onVisibilityChange && (
            <div className="relative">
              <label className="text-xs font-medium text-gray-400 mb-2 block">
                Entity Visibility
              </label>
              <button
                type="button"
                onClick={() => setShowVisibilityMenu(!showVisibilityMenu)}
                className="flex items-center gap-2 px-3 py-2 bg-white/[0.02] border border-[--border] rounded-lg text-sm text-gray-300 hover:border-purple-500/30 transition-colors w-full"
              >
                <VisibilityIcon className={cn(
                  "w-4 h-4",
                  visibility === 'public' && "text-green-400",
                  visibility === 'party' && "text-blue-400",
                  visibility === 'dm_only' && "text-purple-400"
                )} />
                <span className="flex-1 text-left">{currentVisibility.label}</span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>

              {showVisibilityMenu && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a24] border border-[--border] rounded-lg shadow-xl z-50 overflow-hidden">
                  {visibilityOptions.map(option => {
                    const Icon = option.icon
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          onVisibilityChange(option.value)
                          setShowVisibilityMenu(false)
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.05] transition-colors",
                          visibility === option.value && "bg-purple-500/10"
                        )}
                      >
                        <Icon className={cn(
                          "w-4 h-4",
                          option.value === 'public' && "text-green-400",
                          option.value === 'party' && "text-blue-400",
                          option.value === 'dm_only' && "text-purple-400"
                        )} />
                        <div>
                          <p className="text-sm font-medium text-white">{option.label}</p>
                          <p className="text-xs text-gray-500">{option.description}</p>
                        </div>
                        {visibility === option.value && (
                          <Eye className="w-4 h-4 text-purple-400 ml-auto" />
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* DM Notes Textarea */}
          <div>
            <label className="text-xs font-medium text-gray-400 mb-2 block">
              Private Notes
            </label>
            <Textarea
              value={dmNotes}
              onChange={(e) => onDmNotesChange(e.target.value)}
              placeholder={placeholder}
              rows={4}
              className="form-textarea text-sm bg-white/[0.02] border-purple-500/20 focus:border-purple-500/40"
            />
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              These notes are never shared with players, even on shared links.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// Compact inline indicator for lists and cards
interface DmNotesIndicatorProps {
  hasDmNotes: boolean
  visibility?: VisibilityLevel
  className?: string
}

export function DmNotesIndicator({ hasDmNotes, visibility = 'public', className }: DmNotesIndicatorProps) {
  if (!hasDmNotes && visibility === 'public') return null

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {hasDmNotes && (
        <span
          className="text-purple-400"
          title="Has DM notes"
        >
          <Shield className="w-3.5 h-3.5" />
        </span>
      )}
      {visibility === 'party' && (
        <span
          className="text-blue-400"
          title="Visible to party only"
        >
          <Users className="w-3.5 h-3.5" />
        </span>
      )}
      {visibility === 'dm_only' && (
        <span
          className="text-purple-400"
          title="DM only"
        >
          <Lock className="w-3.5 h-3.5" />
        </span>
      )}
    </div>
  )
}

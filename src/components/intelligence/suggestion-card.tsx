'use client'

import { useState } from 'react'
import {
  Check,
  X,
  Edit2,
  User,
  Quote,
  Link,
  AlertTriangle,
  Skull,
  Eye,
  Bookmark,
  ChevronDown,
  ChevronUp,
  CalendarDays,
  FileQuestion,
  UserPlus,
  MapPin,
  Lightbulb,
  Wand2,
  Clock,
  Type,
  ListChecks,
  Copy,
  MessageSquare,
  Link2,
  GitMerge,
  Target,
  Swords,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SuggestionType, ConfidenceLevel, Character } from '@/types/database'

export interface GeneratedSuggestion {
  suggestion_type: SuggestionType
  character_name: string
  character_id: string | null
  field_name: string
  current_value: unknown
  suggested_value: unknown
  source_excerpt: string
  ai_reasoning: string
  confidence: ConfidenceLevel
}

interface SuggestionCardProps {
  suggestion: GeneratedSuggestion
  character?: Character
  isSelected: boolean
  onToggle: () => void
  onEdit?: (edited: GeneratedSuggestion) => void
}

const SUGGESTION_ICONS: Record<SuggestionType, typeof User> = {
  // Campaign Intelligence types
  status_change: Skull,
  secret_revealed: Eye,
  story_hook: Bookmark,
  quote: Quote,
  important_person: User,
  relationship: Link,
  timeline_event: CalendarDays,
  completeness: FileQuestion,
  consistency: AlertTriangle,
  npc_detected: UserPlus,
  location_detected: MapPin,
  quest_detected: Target,
  encounter_detected: Swords,
  quest_session_link: Link2,
  plot_hook: Lightbulb,
  enrichment: Wand2,
  timeline_issue: Clock,
  summary: FileQuestion,
  // Character Intelligence types
  grammar: Type,
  formatting: ListChecks,
  lore_conflict: AlertTriangle,
  redundancy: Copy,
  voice_inconsistency: MessageSquare,
  relationship_gap: Link2,
  secret_opportunity: Eye,
  cross_reference: GitMerge,
}

const SUGGESTION_COLORS: Record<SuggestionType, { bg: string; text: string; border: string }> = {
  // Campaign Intelligence types
  status_change: { bg: 'rgba(239, 68, 68, 0.12)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' },
  secret_revealed: { bg: 'rgba(139, 92, 246, 0.12)', text: '#a78bfa', border: 'rgba(139, 92, 246, 0.3)' },
  story_hook: { bg: 'rgba(59, 130, 246, 0.12)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' },
  quote: { bg: 'rgba(16, 185, 129, 0.12)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' },
  important_person: { bg: 'rgba(245, 158, 11, 0.12)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' },
  relationship: { bg: 'rgba(236, 72, 153, 0.12)', text: '#f472b6', border: 'rgba(236, 72, 153, 0.3)' },
  timeline_event: { bg: 'rgba(99, 102, 241, 0.12)', text: '#818cf8', border: 'rgba(99, 102, 241, 0.3)' },
  completeness: { bg: 'rgba(251, 191, 36, 0.12)', text: '#fbbf24', border: 'rgba(251, 191, 36, 0.3)' },
  consistency: { bg: 'rgba(249, 115, 22, 0.12)', text: '#fb923c', border: 'rgba(249, 115, 22, 0.3)' },
  npc_detected: { bg: 'rgba(34, 211, 238, 0.12)', text: '#22d3ee', border: 'rgba(34, 211, 238, 0.3)' },
  location_detected: { bg: 'rgba(74, 222, 128, 0.12)', text: '#4ade80', border: 'rgba(74, 222, 128, 0.3)' },
  quest_detected: { bg: 'rgba(139, 92, 246, 0.12)', text: '#a78bfa', border: 'rgba(139, 92, 246, 0.3)' },
  encounter_detected: { bg: 'rgba(239, 68, 68, 0.12)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' },
  quest_session_link: { bg: 'rgba(99, 102, 241, 0.12)', text: '#818cf8', border: 'rgba(99, 102, 241, 0.3)' },
  plot_hook: { bg: 'rgba(192, 132, 252, 0.12)', text: '#c084fc', border: 'rgba(192, 132, 252, 0.3)' },
  enrichment: { bg: 'rgba(56, 189, 248, 0.12)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.3)' },
  timeline_issue: { bg: 'rgba(251, 146, 60, 0.12)', text: '#fb923c', border: 'rgba(251, 146, 60, 0.3)' },
  summary: { bg: 'rgba(156, 163, 175, 0.12)', text: '#9ca3af', border: 'rgba(156, 163, 175, 0.3)' },
  // Character Intelligence types
  grammar: { bg: 'rgba(239, 68, 68, 0.12)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' },
  formatting: { bg: 'rgba(251, 191, 36, 0.12)', text: '#fbbf24', border: 'rgba(251, 191, 36, 0.3)' },
  lore_conflict: { bg: 'rgba(249, 115, 22, 0.12)', text: '#fb923c', border: 'rgba(249, 115, 22, 0.3)' },
  redundancy: { bg: 'rgba(156, 163, 175, 0.12)', text: '#9ca3af', border: 'rgba(156, 163, 175, 0.3)' },
  voice_inconsistency: { bg: 'rgba(236, 72, 153, 0.12)', text: '#f472b6', border: 'rgba(236, 72, 153, 0.3)' },
  relationship_gap: { bg: 'rgba(59, 130, 246, 0.12)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' },
  secret_opportunity: { bg: 'rgba(139, 92, 246, 0.12)', text: '#a78bfa', border: 'rgba(139, 92, 246, 0.3)' },
  cross_reference: { bg: 'rgba(16, 185, 129, 0.12)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' },
}

const CONFIDENCE_INDICATORS: Record<ConfidenceLevel, { label: string; color: string }> = {
  high: { label: 'High confidence', color: '#10B981' },
  medium: { label: 'Medium confidence', color: '#F59E0B' },
  low: { label: 'Low confidence', color: '#EF4444' },
}

export function SuggestionCard({
  suggestion,
  character,
  isSelected,
  onToggle,
  onEdit,
}: SuggestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const Icon = SUGGESTION_ICONS[suggestion.suggestion_type] || AlertTriangle
  const colors = SUGGESTION_COLORS[suggestion.suggestion_type]
  const confidence = CONFIDENCE_INDICATORS[suggestion.confidence]

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return 'None'
    if (typeof value === 'string') return value
    if (typeof value === 'object') {
      // Handle status_change format
      if ('status' in (value as object)) {
        return (value as { status: string }).status
      }
      // Handle important_person format
      if ('name' in (value as object) && 'relationship' in (value as object)) {
        const p = value as { name: string; relationship: string; notes?: string }
        return `${p.name} (${p.relationship})`
      }
      // Handle story_hook format
      if ('hook' in (value as object)) {
        return (value as { hook: string }).hook
      }
      // Handle quest_session_link format
      if ('quest_name' in (value as object) && 'progress_type' in (value as object)) {
        const link = value as { quest_name: string; progress_type: string }
        return `"${link.quest_name}" → ${link.progress_type}`
      }
      return JSON.stringify(value)
    }
    return String(value)
  }

  const formatFieldName = (field: string): string => {
    return field
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <div
      className={cn(
        'rounded-xl overflow-hidden transition-all duration-200',
        isSelected
          ? 'ring-2 ring-[#8B5CF6] ring-offset-2 ring-offset-[#0a0a0f]'
          : ''
      )}
      style={{
        backgroundColor: isSelected ? 'rgba(139, 92, 246, 0.08)' : 'rgba(26, 26, 36, 0.6)',
        border: isSelected ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      {/* Main clickable area */}
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-4 p-4 text-left"
      >
        {/* Checkbox */}
        <div
          className={cn(
            'w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all mt-0.5',
            isSelected ? 'bg-[#8B5CF6]' : 'bg-transparent'
          )}
          style={{
            border: isSelected ? 'none' : '2px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          {isSelected && <Check className="w-3 h-3 text-white" />}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span
              className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded"
              style={{
                backgroundColor: colors.bg,
                color: colors.text,
              }}
            >
              <Icon className="w-3 h-3" />
              {suggestion.suggestion_type.replace(/_/g, ' ')}
            </span>

            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: confidence.color,
              }}
            >
              {confidence.label}
            </span>
          </div>

          {/* Character and field */}
          <p className="font-semibold text-[15px] mb-1" style={{ color: '#f3f4f6' }}>
            {suggestion.character_name}
            <span className="font-normal text-sm ml-2" style={{ color: '#6b7280' }}>
              → {formatFieldName(suggestion.field_name)}
            </span>
          </p>

          {/* Suggested value */}
          <div
            className="text-sm p-2 rounded-lg mb-2"
            style={{
              backgroundColor: 'rgba(139, 92, 246, 0.08)',
              border: '1px solid rgba(139, 92, 246, 0.15)',
            }}
          >
            <span className="text-[10px] uppercase tracking-wider font-semibold block mb-1" style={{ color: '#8B5CF6' }}>
              Suggested Update
            </span>
            <p style={{ color: '#d1d5db' }}>
              {formatValue(suggestion.suggested_value)}
            </p>
          </div>

          {/* AI Reasoning */}
          <p className="text-xs" style={{ color: '#9ca3af' }}>
            {suggestion.ai_reasoning}
          </p>
        </div>

        {/* Expand button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            setIsExpanded(!isExpanded)
          }}
          className="p-1 rounded hover:bg-white/5 transition-colors"
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" style={{ color: '#6b7280' }} />
          ) : (
            <ChevronDown className="w-4 h-4" style={{ color: '#6b7280' }} />
          )}
        </button>
      </button>

      {/* Expanded details */}
      {isExpanded ? (
        <div
          className="px-4 pb-4 pt-0 space-y-3"
          style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}
        >
          {/* Source excerpt */}
          <div>
            <span className="text-[10px] uppercase tracking-wider font-semibold block mb-1" style={{ color: '#6b7280' }}>
              Source from Session Notes
            </span>
            <blockquote
              className="text-sm p-3 rounded-lg italic"
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                borderLeft: '3px solid #10B981',
                color: '#9ca3af',
              }}
            >
              &quot;{suggestion.source_excerpt}&quot;
            </blockquote>
          </div>

          {/* Current value */}
          {suggestion.current_value !== null && suggestion.current_value !== undefined ? (
            <div>
              <span className="text-[10px] uppercase tracking-wider font-semibold block mb-1" style={{ color: '#6b7280' }}>
                Current Value
              </span>
              <p className="text-sm" style={{ color: '#6b7280' }}>
                {formatValue(suggestion.current_value)}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

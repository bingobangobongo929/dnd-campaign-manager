'use client'

import {
  Users,
  BookOpen,
  Clock,
  Link2,
  Sparkles,
  Brain,
  Loader2,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ListChecks,
} from 'lucide-react'
import type { Campaign, Character, Session, TimelineEvent } from '@/types/database'
import type { GeneratedSuggestion } from './suggestion-card'

interface HubOverviewProps {
  campaign: Campaign
  characters: Character[]
  sessions: Session[]
  timelineEvents: TimelineEvent[]
  suggestions: GeneratedSuggestion[]
  isAnalyzing: boolean
  noNewContent: boolean
  analysisError: string | null
  onAnalyze: () => void
  onReset: () => void
  isResetting: boolean
  onSwitchTab: (tab: 'overview' | 'suggestions' | 'timeline') => void
}

export function HubOverview({
  campaign,
  characters,
  sessions,
  timelineEvents,
  suggestions,
  isAnalyzing,
  noNewContent,
  analysisError,
  onAnalyze,
  onReset,
  isResetting,
  onSwitchTab,
}: HubOverviewProps) {
  const pcCount = characters.filter(c => c.type === 'pc').length
  const npcCount = characters.filter(c => c.type === 'npc').length

  const formatLastRun = (lastRun: string | null): string => {
    if (!lastRun) return 'Never analyzed'
    const date = new Date(lastRun)
    return `Last analyzed ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }

  const stats = [
    {
      label: 'Characters',
      value: characters.length,
      subtext: `${pcCount} PCs • ${npcCount} NPCs`,
      icon: Users,
      color: '#8B5CF6',
    },
    {
      label: 'Sessions',
      value: sessions.length,
      subtext: sessions.length > 0
        ? `Latest: ${sessions[sessions.length - 1]?.title || `Session ${sessions[sessions.length - 1]?.session_number}`}`
        : 'No sessions yet',
      icon: BookOpen,
      color: '#10B981',
    },
    {
      label: 'Timeline Events',
      value: timelineEvents.length,
      subtext: timelineEvents.length > 0 ? 'Events recorded' : 'No events yet',
      icon: Clock,
      color: '#F59E0B',
    },
    {
      label: 'AI Suggestions',
      value: suggestions.length,
      subtext: suggestions.length > 0 ? 'Pending review' : 'All clear',
      icon: Sparkles,
      color: '#EC4899',
    },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Error display */}
        {analysisError && (
          <div
            className="flex items-center gap-3 p-4 rounded-xl"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
            }}
          >
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-400">Analysis Error</p>
              <p className="text-xs text-red-400/70 mt-0.5">{analysisError}</p>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(stat => (
            <div
              key={stat.label}
              className="p-5 rounded-xl"
              style={{
                backgroundColor: 'rgba(26, 26, 36, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    backgroundColor: `${stat.color}15`,
                    border: `1px solid ${stat.color}30`,
                  }}
                >
                  <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                </div>
                <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>
                  {stat.label}
                </span>
              </div>
              <p className="text-3xl font-bold mb-1" style={{ color: '#f3f4f6' }}>
                {stat.value}
              </p>
              <p className="text-xs" style={{ color: '#6b7280' }}>
                {stat.subtext}
              </p>
            </div>
          ))}
        </div>

        {/* Main Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* AI Analysis Card */}
          <div
            className="p-6 rounded-xl"
            style={{
              backgroundColor: 'rgba(139, 92, 246, 0.08)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
            }}
          >
            <div className="flex items-start gap-4 mb-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: 'rgba(139, 92, 246, 0.15)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                }}
              >
                <Brain className="w-6 h-6 text-[#8B5CF6]" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[15px] mb-1" style={{ color: '#f3f4f6' }}>
                  AI Campaign Analysis
                </h3>
                <p className="text-sm" style={{ color: '#9ca3af' }}>
                  Scan sessions and characters for updates, new relationships, quotes, and story developments.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-3.5 h-3.5" style={{ color: '#6b7280' }} />
              <span className="text-xs" style={{ color: '#6b7280' }}>
                {formatLastRun(campaign.last_intelligence_run)}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                className="btn btn-primary flex items-center gap-2"
                onClick={onAnalyze}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
              </button>

              {campaign.last_intelligence_run && (
                <button
                  className="btn btn-secondary flex items-center gap-2"
                  onClick={onReset}
                  disabled={isResetting}
                >
                  {isResetting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4" />
                  )}
                  Re-scan Everything
                </button>
              )}
            </div>

            {noNewContent && (
              <div className="flex items-center gap-2 mt-4 p-3 rounded-lg" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-emerald-400">
                  All caught up! No new content since last analysis.
                </span>
              </div>
            )}
          </div>

          {/* Timeline Card */}
          <div
            className="p-6 rounded-xl"
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
            }}
          >
            <div className="flex items-start gap-4 mb-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                }}
              >
                <Clock className="w-6 h-6 text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[15px] mb-1" style={{ color: '#f3f4f6' }}>
                  Timeline Builder
                </h3>
                <p className="text-sm" style={{ color: '#9ca3af' }}>
                  Generate timeline events from session notes or view and manage existing campaign events.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-3.5 h-3.5" style={{ color: '#6b7280' }} />
              <span className="text-xs" style={{ color: '#6b7280' }}>
                {timelineEvents.length} events recorded
              </span>
            </div>

            <button
              className="btn btn-secondary flex items-center gap-2"
              onClick={() => onSwitchTab('timeline')}
            >
              <ArrowRight className="w-4 h-4" />
              Open Timeline
            </button>
          </div>
        </div>

        {/* Pending Suggestions Quick View */}
        {suggestions.length > 0 && (
          <div
            className="p-6 rounded-xl"
            style={{
              backgroundColor: 'rgba(236, 72, 153, 0.08)',
              border: '1px solid rgba(236, 72, 153, 0.2)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    backgroundColor: 'rgba(236, 72, 153, 0.15)',
                    border: '1px solid rgba(236, 72, 153, 0.3)',
                  }}
                >
                  <ListChecks className="w-5 h-5 text-pink-400" />
                </div>
                <div>
                  <h3 className="font-semibold" style={{ color: '#f3f4f6' }}>
                    {suggestions.length} Suggestion{suggestions.length !== 1 ? 's' : ''} Pending
                  </h3>
                  <p className="text-xs" style={{ color: '#6b7280' }}>
                    Review AI-detected updates for your characters
                  </p>
                </div>
              </div>
              <button
                className="btn btn-primary btn-sm flex items-center gap-2"
                onClick={() => onSwitchTab('suggestions')}
              >
                Review All
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Preview first 3 suggestions */}
            <div className="space-y-2">
              {suggestions.slice(0, 3).map((s, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
                >
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded"
                    style={{
                      backgroundColor: 'rgba(139, 92, 246, 0.15)',
                      color: '#a78bfa',
                    }}
                  >
                    {s.suggestion_type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-sm font-medium" style={{ color: '#f3f4f6' }}>
                    {s.character_name}
                  </span>
                  <span className="text-sm" style={{ color: '#6b7280' }}>
                    → {s.field_name.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
              {suggestions.length > 3 && (
                <p className="text-xs text-center pt-2" style={{ color: '#6b7280' }}>
                  +{suggestions.length - 3} more suggestions
                </p>
              )}
            </div>
          </div>
        )}

        {/* What AI Looks For */}
        <div
          className="p-5 rounded-xl"
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.06)',
            border: '1px solid rgba(16, 185, 129, 0.15)',
          }}
        >
          <h4 className="text-sm font-semibold mb-3" style={{ color: '#34d399' }}>
            What the AI analyzes:
          </h4>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              'Status changes (deaths, captures)',
              'Secrets revealed to party',
              'New important NPCs',
              'Story hooks resolved/added',
              'Memorable quotes',
              'New relationships',
              'Cross-session references',
              'Character developments',
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">•</span>
                <span className="text-xs" style={{ color: '#9ca3af' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

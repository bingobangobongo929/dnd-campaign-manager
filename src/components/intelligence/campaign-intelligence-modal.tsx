'use client'

import { useState } from 'react'
import { Brain, Check, Loader2, AlertCircle, Sparkles, Clock, FileText, Users, RotateCcw } from 'lucide-react'
import { Modal } from '@/components/ui'
import { SuggestionCard, GeneratedSuggestion } from './suggestion-card'
import type { Campaign, Character } from '@/types/database'

interface CampaignIntelligenceModalProps {
  isOpen: boolean
  onClose: () => void
  campaign: Campaign
  characters: Character[]
  onSuggestionsApplied: () => void
}

type Step = 'idle' | 'analyzing' | 'review'

interface AnalysisStats {
  sessionsAnalyzed: number
  charactersUpdated: number
  totalCharacters: number
  totalRelationships: number
}

function formatLastRunTime(lastRun: string | null): string {
  if (!lastRun) return 'Never'

  const date = new Date(lastRun)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 1) return 'Just now'
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`

  return date.toLocaleDateString()
}

export function CampaignIntelligenceModal({
  isOpen,
  onClose,
  campaign,
  characters,
  onSuggestionsApplied,
}: CampaignIntelligenceModalProps) {
  const [step, setStep] = useState<Step>('idle')
  const [suggestions, setSuggestions] = useState<GeneratedSuggestion[]>([])
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [isApplying, setIsApplying] = useState(false)
  const [stats, setStats] = useState<AnalysisStats | null>(null)
  const [analyzedSince, setAnalyzedSince] = useState<string | null>(null)
  const [noNewContent, setNoNewContent] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  const handleReset = async () => {
    setIsResetting(true)
    try {
      const response = await fetch('/api/ai/reset-intelligence-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: campaign.id }),
      })
      if (response.ok) {
        setNoNewContent(false)
        setStep('idle')
        onSuggestionsApplied() // Refresh campaign data
      }
    } catch (err) {
      console.error('Reset error:', err)
    } finally {
      setIsResetting(false)
    }
  }

  const handleAnalyze = async () => {
    setStep('analyzing')
    setError(null)
    setNoNewContent(false)

    try {
      const response = await fetch('/api/ai/analyze-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMsg = data.details
          ? `${data.error}: ${data.details}`
          : data.error || 'Failed to analyze campaign'
        throw new Error(errorMsg)
      }

      if (data.message === 'No new content since last analysis') {
        setNoNewContent(true)
        setStep('review')
        return
      }

      setSuggestions(data.suggestions || [])
      setSelectedIndices(new Set(data.suggestions?.map((_: GeneratedSuggestion, i: number) => i) || []))
      setStats(data.stats || null)
      setAnalyzedSince(data.analyzedSince || null)
      setStep('review')
    } catch (err) {
      console.error('Analysis error:', err)
      setError(err instanceof Error ? err.message : 'Failed to analyze campaign')
      setStep('idle')
    }
  }

  const toggleSuggestion = (index: number) => {
    setSelectedIndices(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const handleApply = async () => {
    const selectedSuggestions = suggestions.filter((_, i) => selectedIndices.has(i))
    if (selectedSuggestions.length === 0) return

    setIsApplying(true)

    try {
      const response = await fetch('/api/ai/apply-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.id,
          suggestions: selectedSuggestions,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to apply suggestions')
      }

      onSuggestionsApplied()
      handleClose()
    } catch (err) {
      console.error('Apply error:', err)
      setError(err instanceof Error ? err.message : 'Failed to apply suggestions')
    } finally {
      setIsApplying(false)
    }
  }

  const handleClose = () => {
    setStep('idle')
    setSuggestions([])
    setSelectedIndices(new Set())
    setError(null)
    setStats(null)
    setNoNewContent(false)
    onClose()
  }

  const getCharacterForSuggestion = (suggestion: GeneratedSuggestion) => {
    if (suggestion.character_id) {
      return characters.find(c => c.id === suggestion.character_id)
    }
    return characters.find(c =>
      c.name.toLowerCase() === suggestion.character_name.toLowerCase()
    )
  }

  const lastRunFormatted = formatLastRunTime(campaign.last_intelligence_run)

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        step === 'idle' ? 'Campaign Intelligence' :
        step === 'analyzing' ? 'Analyzing Campaign...' :
        'Review Suggestions'
      }
      description={
        step === 'idle' ? 'Analyze all changes since last run' :
        step === 'analyzing' ? 'AI is scanning for character updates across your campaign' :
        noNewContent ? 'No new content to analyze' :
        `${suggestions.length} potential update${suggestions.length !== 1 ? 's' : ''} found`
      }
      size="lg"
    >
      <div className="min-h-[400px]">
        {/* Step 1: Idle - Ready to analyze */}
        {step === 'idle' && (
          <>
            {error && (
              <div
                className="flex items-center gap-3 p-4 rounded-lg mb-4"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                }}
              >
                <AlertCircle className="w-5 h-5 text-red-400" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div
              className="p-6 rounded-xl mb-6"
              style={{
                backgroundColor: 'rgba(139, 92, 246, 0.08)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
              }}
            >
              <div className="flex items-start gap-4">
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
                    {campaign.name}
                  </h3>
                  <p className="text-sm mb-3" style={{ color: '#9ca3af' }}>
                    AI will analyze all sessions and character updates since your last analysis run, detecting changes, revelations, and story developments.
                  </p>
                  <div className="flex flex-wrap gap-4 text-xs" style={{ color: '#6b7280' }}>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Last run: <strong style={{ color: '#9ca3af' }}>{lastRunFormatted}</strong>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      <strong style={{ color: '#9ca3af' }}>{characters.length}</strong> characters
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="p-4 rounded-lg mb-6"
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
              }}
            >
              <h4 className="text-sm font-semibold mb-2" style={{ color: '#34d399' }}>
                What the AI looks for:
              </h4>
              <ul className="text-sm space-y-1" style={{ color: '#9ca3af' }}>
                <li>• Character status changes (deaths, captures, escapes)</li>
                <li>• Secrets revealed to the party</li>
                <li>• New important NPCs connected to characters</li>
                <li>• Story hooks resolved or introduced</li>
                <li>• Memorable quotes from characters</li>
                <li>• New relationships between characters</li>
                <li>• Cross-references between sessions</li>
              </ul>
            </div>

            {campaign.last_intelligence_run && (
              <div
                className="p-3 rounded-lg mb-6 flex items-center gap-3"
                style={{
                  backgroundColor: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                }}
              >
                <FileText className="w-4 h-4 text-blue-400" />
                <p className="text-xs" style={{ color: '#93c5fd' }}>
                  Only content updated since {new Date(campaign.last_intelligence_run).toLocaleDateString()} will be analyzed
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <button className="btn btn-secondary" onClick={handleClose}>
                Cancel
              </button>
              <button
                className="btn btn-primary flex items-center gap-2"
                onClick={handleAnalyze}
              >
                <Sparkles className="w-4 h-4" />
                Analyze Campaign
              </button>
            </div>
          </>
        )}

        {/* Step 2: Analyzing */}
        {step === 'analyzing' && (
          <div className="flex flex-col items-center justify-center py-16">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
              style={{
                backgroundColor: 'rgba(139, 92, 246, 0.15)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
              }}
            >
              <Loader2 className="w-8 h-8 text-[#8B5CF6] animate-spin" />
            </div>
            <p className="text-lg font-semibold mb-2" style={{ color: '#f3f4f6' }}>
              Analyzing Campaign
            </p>
            <p className="text-sm text-center max-w-md" style={{ color: '#6b7280' }}>
              Scanning sessions, character updates, and relationships for changes since last analysis...
            </p>
          </div>
        )}

        {/* Step 3: Review Suggestions */}
        {step === 'review' && (
          <>
            {error && (
              <div
                className="flex items-center gap-3 p-4 rounded-lg mb-4"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                }}
              >
                <AlertCircle className="w-5 h-5 text-red-400" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {noNewContent ? (
              <div className="text-center py-12">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                  }}
                >
                  <Check className="w-8 h-8 text-emerald-400" />
                </div>
                <p className="font-semibold mb-1" style={{ color: '#f3f4f6' }}>
                  All Caught Up!
                </p>
                <p className="text-sm max-w-md mx-auto" style={{ color: '#6b7280' }}>
                  No new sessions or character updates since the last analysis.
                  Add new session notes or update characters, then run the analysis again.
                </p>
                <div className="flex justify-center gap-3 mt-6">
                  <button
                    className="btn btn-secondary flex items-center gap-2"
                    onClick={handleReset}
                    disabled={isResetting}
                  >
                    {isResetting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RotateCcw className="w-4 h-4" />
                    )}
                    Re-scan Everything
                  </button>
                  <button className="btn btn-secondary" onClick={handleClose}>
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <>
                {stats && (
                  <div className="flex flex-wrap items-center gap-4 mb-4 text-xs" style={{ color: '#6b7280' }}>
                    <span>{stats.sessionsAnalyzed} session{stats.sessionsAnalyzed !== 1 ? 's' : ''} analyzed</span>
                    <span>•</span>
                    <span>{stats.charactersUpdated} character update{stats.charactersUpdated !== 1 ? 's' : ''}</span>
                    <span>•</span>
                    <span>{stats.totalCharacters} total characters</span>
                    {analyzedSince && (
                      <>
                        <span>•</span>
                        <span>Since {new Date(analyzedSince).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                )}

                <div
                  className="space-y-3 max-h-[400px] overflow-y-auto pr-2"
                  style={{ scrollbarWidth: 'thin' }}
                >
                  {suggestions.length === 0 ? (
                    <div className="text-center py-12">
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                        style={{
                          backgroundColor: 'rgba(107, 114, 128, 0.15)',
                          border: '1px solid rgba(107, 114, 128, 0.3)',
                        }}
                      >
                        <Check className="w-8 h-8" style={{ color: '#6b7280' }} />
                      </div>
                      <p className="font-semibold mb-1" style={{ color: '#9ca3af' }}>
                        No Updates Detected
                      </p>
                      <p className="text-sm max-w-md mx-auto" style={{ color: '#6b7280' }}>
                        The AI analyzed the new content but didn&apos;t find any character updates.
                        This could mean the changes are already reflected in character cards.
                      </p>
                    </div>
                  ) : (
                    suggestions.map((suggestion, index) => (
                      <SuggestionCard
                        key={index}
                        suggestion={suggestion}
                        character={getCharacterForSuggestion(suggestion)}
                        isSelected={selectedIndices.has(index)}
                        onToggle={() => toggleSuggestion(index)}
                      />
                    ))
                  )}
                </div>

                {suggestions.length > 0 && (
                  <div className="flex items-center justify-between pt-6 mt-4" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <span className="text-sm" style={{ color: '#6b7280' }}>
                      {selectedIndices.size} of {suggestions.length} selected
                    </span>
                    <div className="flex gap-3">
                      <button className="btn btn-secondary" onClick={handleClose}>
                        Cancel
                      </button>
                      <button
                        className="btn btn-primary flex items-center gap-2"
                        onClick={handleApply}
                        disabled={selectedIndices.size === 0 || isApplying}
                      >
                        {isApplying ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        Apply {selectedIndices.size} Update{selectedIndices.size !== 1 ? 's' : ''}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}

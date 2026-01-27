'use client'

import { useState } from 'react'
import { Brain, X, Check, Loader2, AlertCircle, Sparkles } from 'lucide-react'
import { Modal } from '@/components/ui'
import { SuggestionCard, GeneratedSuggestion } from './suggestion-card'
import type { Session, Character } from '@/types/database'

interface IntelligenceModalProps {
  isOpen: boolean
  onClose: () => void
  session: Session
  campaignId: string
  characters: Character[]
  onSuggestionsApplied: () => void
}

type Step = 'idle' | 'analyzing' | 'review'

export function IntelligenceModal({
  isOpen,
  onClose,
  session,
  campaignId,
  characters,
  onSuggestionsApplied,
}: IntelligenceModalProps) {
  const [step, setStep] = useState<Step>('idle')
  const [suggestions, setSuggestions] = useState<GeneratedSuggestion[]>([])
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [isApplying, setIsApplying] = useState(false)
  const [stats, setStats] = useState<{ charactersAnalyzed: number; sessionsForContext: number } | null>(null)

  const handleAnalyze = async () => {
    setStep('analyzing')
    setError(null)

    try {
      const response = await fetch('/api/ai/analyze-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          sessionId: session.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze session')
      }

      setSuggestions(data.suggestions || [])
      setSelectedIndices(new Set(data.suggestions?.map((_: GeneratedSuggestion, i: number) => i) || []))
      setStats(data.stats || null)
      setStep('review')
    } catch (err) {
      console.error('Analysis error:', err)
      setError(err instanceof Error ? err.message : 'Failed to analyze session')
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
          campaignId,
          sessionId: session.id,
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        step === 'idle' ? 'Campaign Intelligence' :
        step === 'analyzing' ? 'Analyzing Session...' :
        'Review Suggestions'
      }
      description={
        step === 'idle' ? `Analyze session notes to detect character updates` :
        step === 'analyzing' ? 'Scanning for character changes, revelations, and story updates' :
        `${suggestions.length} potential update${suggestions.length !== 1 ? 's' : ''} found`
      }
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
                <div>
                  <h3 className="font-semibold text-[15px] mb-1" style={{ color: '#f3f4f6' }}>
                    {session.title || `Session ${session.session_number}`}
                  </h3>
                  <p className="text-sm mb-3" style={{ color: '#9ca3af' }}>
                    Intelligence will analyze this session&apos;s notes and suggest updates to character cards based on events, revelations, and story developments.
                  </p>
                  <div className="flex flex-wrap gap-4 text-xs" style={{ color: '#6b7280' }}>
                    <span>
                      <strong style={{ color: '#9ca3af' }}>{characters.length}</strong> characters in campaign
                    </span>
                    <span>
                      <strong style={{ color: '#9ca3af' }}>{session.notes?.length || 0}</strong> characters of notes
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
                What Intelligence looks for:
              </h4>
              <ul className="text-sm space-y-1" style={{ color: '#9ca3af' }}>
                <li>• Character status changes (deaths, captures, escapes)</li>
                <li>• Secrets revealed to the party</li>
                <li>• New important NPCs connected to characters</li>
                <li>• Story hooks resolved or introduced</li>
                <li>• Memorable quotes from characters</li>
                <li>• New relationships between characters</li>
              </ul>
            </div>

            <div className="flex justify-end gap-3 pt-4" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <button className="btn btn-secondary" onClick={handleClose}>
                Cancel
              </button>
              <button
                className="btn btn-primary flex items-center gap-2"
                onClick={handleAnalyze}
                disabled={!session.notes || session.notes.trim().length === 0}
              >
                <Sparkles className="w-4 h-4" />
                Analyze Session
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
              Analyzing Session Notes
            </p>
            <p className="text-sm text-center max-w-md" style={{ color: '#6b7280' }}>
              Scanning for character updates, revelations, and story developments...
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

            {stats && (
              <div className="flex items-center gap-4 mb-4 text-xs" style={{ color: '#6b7280' }}>
                <span>Analyzed {stats.charactersAnalyzed} characters</span>
                <span>•</span>
                <span>{stats.sessionsForContext} sessions for context</span>
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
                  <p className="text-sm" style={{ color: '#6b7280' }}>
                    No character updates were found in this session&apos;s notes.
                    This could mean the session was already reflected in character cards,
                    or the notes don&apos;t contain explicit character changes.
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
          </>
        )}
      </div>
    </Modal>
  )
}

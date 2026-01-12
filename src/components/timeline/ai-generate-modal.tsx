'use client'

import { useState } from 'react'
import { Sparkles, X, Check, ChevronRight, Loader2, AlertCircle } from 'lucide-react'
import { Modal } from '@/components/ui'
import { formatDate, cn } from '@/lib/utils'
import type { Session, Character } from '@/types/database'

interface GeneratedEvent {
  title: string
  description: string
  event_type: string
  character_ids: string[]
  source_session_ids: string[]
}

interface AIGenerateModalProps {
  isOpen: boolean
  onClose: () => void
  sessions: Session[]
  characters: Character[]
  onEventsGenerated: (events: GeneratedEvent[]) => void
}

type Step = 'select' | 'generating' | 'review'

export function AIGenerateModal({
  isOpen,
  onClose,
  sessions,
  characters,
  onEventsGenerated,
}: AIGenerateModalProps) {
  const [step, setStep] = useState<Step>('select')
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set())
  const [generatedEvents, setGeneratedEvents] = useState<GeneratedEvent[]>([])
  const [selectedEvents, setSelectedEvents] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0)

  const toggleSession = (sessionId: string) => {
    setSelectedSessions(prev => {
      const next = new Set(prev)
      if (next.has(sessionId)) {
        next.delete(sessionId)
      } else {
        next.add(sessionId)
      }
      return next
    })
  }

  const selectAllSessions = () => {
    setSelectedSessions(new Set(sessions.map(s => s.id)))
  }

  const handleGenerate = async () => {
    if (selectedSessions.size === 0) return

    setStep('generating')
    setError(null)

    try {
      const selectedSessionData = sessions
        .filter(s => selectedSessions.has(s.id))
        .map(s => ({
          id: s.id,
          title: s.title || `Session ${s.session_number}`,
          notes: s.notes || '',
          session_date: s.date,
        }))

      const response = await fetch('/api/ai/generate-timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessions: selectedSessionData,
          characters: characters.map(c => ({ id: c.id, name: c.name })),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate events')
      }

      const data = await response.json()
      setGeneratedEvents(data.events)
      setSelectedEvents(new Set(data.events.map((_: GeneratedEvent, i: number) => i)))
      setCurrentReviewIndex(0)
      setStep('review')
    } catch (err) {
      console.error('Generation error:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate events')
      setStep('select')
    }
  }

  const toggleEventSelection = (index: number) => {
    setSelectedEvents(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const handleAcceptSelected = () => {
    const acceptedEvents = generatedEvents.filter((_, i) => selectedEvents.has(i))
    onEventsGenerated(acceptedEvents)
    handleClose()
  }

  const handleClose = () => {
    setStep('select')
    setSelectedSessions(new Set())
    setGeneratedEvents([])
    setSelectedEvents(new Set())
    setError(null)
    setCurrentReviewIndex(0)
    onClose()
  }

  const getCharacterNames = (characterIds: string[]) => {
    return characterIds
      .map(id => characters.find(c => c.id === id)?.name)
      .filter(Boolean)
      .join(', ')
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        step === 'select' ? 'Generate Timeline Events' :
        step === 'generating' ? 'Analyzing Sessions...' :
        'Review Generated Events'
      }
      description={
        step === 'select' ? 'Select sessions to analyze for timeline events' :
        step === 'generating' ? 'AI is extracting key events from your session notes' :
        `${generatedEvents.length} events found. Select which to add.`
      }
    >
      <div className="min-h-[400px]">
        {/* Step 1: Session Selection */}
        {step === 'select' && (
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

            <div className="flex items-center justify-between mb-4">
              <span className="text-sm" style={{ color: '#9ca3af' }}>
                {selectedSessions.size} of {sessions.length} selected
              </span>
              <button
                onClick={selectAllSessions}
                className="text-sm font-medium transition-colors"
                style={{ color: '#8B5CF6' }}
              >
                Select all
              </button>
            </div>

            <div
              className="space-y-2 max-h-[320px] overflow-y-auto pr-2"
              style={{ scrollbarWidth: 'thin' }}
            >
              {sessions.length === 0 ? (
                <div className="text-center py-12">
                  <p style={{ color: '#6b7280' }}>No sessions available</p>
                  <p className="text-sm mt-1" style={{ color: '#4b5563' }}>
                    Create sessions with notes first
                  </p>
                </div>
              ) : (
                sessions.map(session => {
                  const isSelected = selectedSessions.has(session.id)
                  return (
                    <button
                      key={session.id}
                      onClick={() => toggleSession(session.id)}
                      className="w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all duration-200"
                      style={{
                        backgroundColor: isSelected ? 'rgba(139, 92, 246, 0.1)' : 'rgba(26, 26, 36, 0.6)',
                        border: isSelected ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)',
                      }}
                    >
                      <div
                        className={cn(
                          'w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all',
                          isSelected ? 'bg-[#8B5CF6]' : 'bg-transparent'
                        )}
                        style={{
                          border: isSelected ? 'none' : '2px solid rgba(255, 255, 255, 0.2)',
                        }}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="font-semibold text-[15px] truncate"
                          style={{ color: '#f3f4f6' }}
                        >
                          {session.title || `Session ${session.session_number}`}
                        </p>
                        <p className="text-sm mt-0.5" style={{ color: '#6b7280' }}>
                          {formatDate(session.date)}
                          {session.notes && (
                            <span className="ml-2">
                              • {session.notes.length > 50 ? `${session.notes.length} characters` : 'Has notes'}
                            </span>
                          )}
                        </p>
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            <div className="flex justify-end gap-3 pt-6 mt-4" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <button className="btn btn-secondary" onClick={handleClose}>
                Cancel
              </button>
              <button
                className="btn btn-primary flex items-center gap-2"
                onClick={handleGenerate}
                disabled={selectedSessions.size === 0}
              >
                <Sparkles className="w-4 h-4" />
                Generate Events
              </button>
            </div>
          </>
        )}

        {/* Step 2: Generating */}
        {step === 'generating' && (
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
              Analyzing {selectedSessions.size} session{selectedSessions.size !== 1 ? 's' : ''}
            </p>
            <p className="text-sm" style={{ color: '#6b7280' }}>
              This may take a moment...
            </p>
          </div>
        )}

        {/* Step 3: Review Events */}
        {step === 'review' && (
          <>
            <div
              className="space-y-3 max-h-[380px] overflow-y-auto pr-2"
              style={{ scrollbarWidth: 'thin' }}
            >
              {generatedEvents.map((event, index) => {
                const isSelected = selectedEvents.has(index)
                return (
                  <div
                    key={index}
                    className="rounded-xl overflow-hidden transition-all duration-200"
                    style={{
                      backgroundColor: isSelected ? 'rgba(139, 92, 246, 0.08)' : 'rgba(26, 26, 36, 0.6)',
                      border: isSelected ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <button
                      onClick={() => toggleEventSelection(index)}
                      className="w-full flex items-start gap-4 p-4 text-left"
                    >
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
                        <div className="flex items-center gap-2 mb-1.5">
                          <span
                            className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded"
                            style={{
                              backgroundColor: 'rgba(139, 92, 246, 0.12)',
                              color: '#a78bfa',
                            }}
                          >
                            {event.event_type.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p
                          className="font-semibold text-[15px] mb-1"
                          style={{ color: '#f3f4f6' }}
                        >
                          {event.title}
                        </p>
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: '#9ca3af' }}
                        >
                          {event.description.length > 200
                            ? event.description.slice(0, 200) + '...'
                            : event.description}
                        </p>
                        {event.character_ids.length > 0 && (
                          <p className="text-xs mt-2" style={{ color: '#6b7280' }}>
                            Characters: {getCharacterNames(event.character_ids)}
                          </p>
                        )}
                      </div>
                    </button>
                  </div>
                )
              })}

              {generatedEvents.length === 0 && (
                <div className="text-center py-12">
                  <p style={{ color: '#6b7280' }}>No events were extracted</p>
                  <p className="text-sm mt-1" style={{ color: '#4b5563' }}>
                    Try selecting sessions with more detailed notes
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-6 mt-4" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <span className="text-sm" style={{ color: '#6b7280' }}>
                {selectedEvents.size} of {generatedEvents.length} events selected
              </span>
              <div className="flex gap-3">
                <button className="btn btn-secondary" onClick={handleClose}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary flex items-center gap-2"
                  onClick={handleAcceptSelected}
                  disabled={selectedEvents.size === 0}
                >
                  <Check className="w-4 h-4" />
                  Add {selectedEvents.size} Event{selectedEvents.size !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

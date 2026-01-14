'use client'

import { useState, useCallback } from 'react'
import { Modal, Textarea } from '@/components/ui'
import { FileText, Loader2, Upload, Sparkles, Check, X, Users, UserCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Character } from '@/types/database'

interface DocumentImportModalProps {
  isOpen: boolean
  onClose: () => void
  campaignId: string
  onImport: (character: Partial<Character>) => void
}

type DocumentType = 'character' | 'session'
type CharacterType = 'pc' | 'npc'

export function DocumentImportModal({
  isOpen,
  onClose,
  campaignId,
  onImport,
}: DocumentImportModalProps) {
  const [documentText, setDocumentText] = useState('')
  const [documentType, setDocumentType] = useState<DocumentType>('character')
  const [characterType, setCharacterType] = useState<CharacterType>('pc')
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parsedResult, setParsedResult] = useState<any>(null)
  const [step, setStep] = useState<'input' | 'preview'>('input')

  const handleParse = async () => {
    if (!documentText.trim()) return

    setIsParsing(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/parse-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          documentText,
          documentType,
          characterType,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse document')
      }

      if (data.success && data.parsed) {
        setParsedResult(data.parsed)
        setStep('preview')
      } else {
        throw new Error('No data parsed from document')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse document')
    } finally {
      setIsParsing(false)
    }
  }

  const handleConfirmImport = () => {
    if (parsedResult && documentType === 'character') {
      onImport(parsedResult)
      handleReset()
    }
  }

  const handleReset = () => {
    setDocumentText('')
    setParsedResult(null)
    setStep('input')
    setError(null)
    onClose()
  }

  const handleBack = () => {
    setStep('input')
    setParsedResult(null)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleReset}
      title={step === 'input' ? 'Import Character Document' : 'Preview Import'}
      description={
        step === 'input'
          ? 'Paste a character sheet or backstory document to import'
          : 'Review the parsed information before importing'
      }
      size="lg"
    >
      {step === 'input' ? (
        <div className="space-y-6 py-4">
          {/* Document Type Selection */}
          <div className="form-group">
            <label className="form-label mb-3">Document Type</label>
            <div className="flex gap-3">
              <button
                onClick={() => setDocumentType('character')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-colors',
                  documentType === 'character'
                    ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                    : 'border-white/10 text-gray-400 hover:border-white/20'
                )}
              >
                <UserCircle className="w-5 h-5" />
                Character
              </button>
              <button
                onClick={() => setDocumentType('session')}
                disabled
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-colors opacity-50 cursor-not-allowed',
                  documentType === 'session'
                    ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                    : 'border-white/10 text-gray-400'
                )}
              >
                <FileText className="w-5 h-5" />
                Session (Coming Soon)
              </button>
            </div>
          </div>

          {/* Character Type Selection (only for character import) */}
          {documentType === 'character' && (
            <div className="form-group">
              <label className="form-label mb-3">Character Type</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setCharacterType('pc')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-colors',
                    characterType === 'pc'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                      : 'border-white/10 text-gray-400 hover:border-white/20'
                  )}
                >
                  <Users className="w-5 h-5" />
                  Player Character (PC)
                </button>
                <button
                  onClick={() => setCharacterType('npc')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-colors',
                    characterType === 'npc'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                      : 'border-white/10 text-gray-400 hover:border-white/20'
                  )}
                >
                  <UserCircle className="w-5 h-5" />
                  NPC
                </button>
              </div>
            </div>
          )}

          {/* Document Text Input */}
          <div className="form-group">
            <label className="form-label mb-3">Document Content</label>
            <Textarea
              value={documentText}
              onChange={(e) => setDocumentText(e.target.value)}
              placeholder="Paste your character sheet, backstory, or other document here..."
              rows={12}
              className="form-textarea font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-2">
              The AI will preserve your writing style and extract structured information.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.06]">
            <button className="btn btn-secondary" onClick={handleReset}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleParse}
              disabled={!documentText.trim() || isParsing}
            >
              {isParsing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Parsing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Parse with AI
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Preview Step */
        <div className="space-y-6 py-4">
          {parsedResult && (
            <>
              {/* Character Preview */}
              <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <UserCircle className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {parsedResult.name || 'Unknown'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {[parsedResult.race, parsedResult.class].filter(Boolean).join(' ') || 'Unknown Race/Class'}
                      {parsedResult.age && ` • Age ${parsedResult.age}`}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 text-sm">
                  {parsedResult.appearance && (
                    <div>
                      <h4 className="font-medium text-gray-400 mb-1">Appearance</h4>
                      <p className="text-gray-300">{parsedResult.appearance}</p>
                    </div>
                  )}

                  {parsedResult.personality && (
                    <div>
                      <h4 className="font-medium text-gray-400 mb-1">Personality</h4>
                      <p className="text-gray-300">{parsedResult.personality}</p>
                    </div>
                  )}

                  {parsedResult.backstory && (
                    <div>
                      <h4 className="font-medium text-gray-400 mb-1">Backstory</h4>
                      <p className="text-gray-300 line-clamp-4">{parsedResult.backstory}</p>
                    </div>
                  )}

                  {parsedResult.important_people?.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-400 mb-1">
                        Important People ({parsedResult.important_people.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {parsedResult.important_people.map((person: any, idx: number) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-white/[0.05] rounded text-xs text-gray-300"
                          >
                            {person.name} ({person.relationship})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {parsedResult.story_hooks?.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-400 mb-1">
                        Story Hooks ({parsedResult.story_hooks.length})
                      </h4>
                      <ul className="list-disc list-inside text-gray-300">
                        {parsedResult.story_hooks.map((hook: any, idx: number) => (
                          <li key={idx}>{hook.hook}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {parsedResult.secrets && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <h4 className="font-medium text-red-400 mb-1">Secrets (DM Only)</h4>
                      <p className="text-red-300/80">{parsedResult.secrets}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between pt-4 border-t border-white/[0.06]">
                <button className="btn btn-secondary" onClick={handleBack}>
                  <X className="w-4 h-4" />
                  Back to Edit
                </button>
                <button className="btn btn-primary" onClick={handleConfirmImport}>
                  <Check className="w-4 h-4" />
                  Import Character
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  )
}

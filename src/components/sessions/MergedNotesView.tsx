'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import {
  Sparkles,
  Loader2,
  MessageSquare,
  ScrollText,
  Users,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Wand2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn, getInitials } from '@/lib/utils'
import { useAppStore, useCanUseAI } from '@/store'
import type { PlayerSessionNote, Character } from '@/types/database'

interface NoteWithRelations extends PlayerSessionNote {
  character?: {
    id: string
    name: string
    image_url: string | null
  } | null
}

interface MergedNotesViewProps {
  campaignId: string
  sessionId: string
  sessionNumber?: number
  sessionTitle?: string
  dmSummary?: string
  dmDetailedNotes?: string
  onMergedContent?: (content: string) => void
}

export function MergedNotesView({
  campaignId,
  sessionId,
  sessionNumber,
  sessionTitle,
  dmSummary,
  dmDetailedNotes,
  onMergedContent,
}: MergedNotesViewProps) {
  const [playerNotes, setPlayerNotes] = useState<NoteWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [merging, setMerging] = useState(false)
  const [mergedContent, setMergedContent] = useState('')
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(true)

  const { aiProvider } = useAppStore()
  const canUseAI = useCanUseAI()

  // Load player notes
  useEffect(() => {
    loadPlayerNotes()
  }, [campaignId, sessionId])

  const loadPlayerNotes = async () => {
    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/sessions/${sessionId}/player-notes`
      )
      const data = await response.json()

      if (response.ok) {
        setPlayerNotes(data.notes || [])
      }
    } catch (error) {
      console.error('Failed to load player notes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMerge = async () => {
    if (!canUseAI) {
      toast.error('AI features require a paid plan')
      return
    }

    const hasContent = dmSummary || dmDetailedNotes || playerNotes.length > 0
    if (!hasContent) {
      toast.error('No notes to merge')
      return
    }

    setMerging(true)
    setMergedContent('')

    try {
      const response = await fetch('/api/ai/merge-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dmNotes: dmSummary,
          dmDetailedNotes,
          playerNotes: playerNotes.map(note => ({
            characterName: note.character?.name || 'Unknown Player',
            content: note.notes,
          })),
          sessionTitle,
          sessionNumber,
          provider: aiProvider,
        }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || 'Failed to merge notes')
      }

      // Stream the response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let content = ''

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        content += chunk
        setMergedContent(content)
      }

      if (onMergedContent) {
        onMergedContent(content)
      }

      toast.success('Notes merged successfully')
    } catch (error) {
      console.error('Merge error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to merge notes')
    } finally {
      setMerging(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(mergedContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Copied to clipboard')
  }

  const hasPlayerNotes = playerNotes.length > 0
  const hasDmNotes = !!(dmSummary || dmDetailedNotes)
  const hasAnyNotes = hasPlayerNotes || hasDmNotes

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
      </div>
    )
  }

  if (!hasAnyNotes) {
    return null
  }

  return (
    <div className="border border-purple-500/20 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-purple-500/5 hover:bg-purple-500/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="font-medium text-white text-sm">Merge Notes</span>
          <span className="text-xs text-gray-500">
            {hasDmNotes && hasPlayerNotes
              ? 'DM + Player perspectives'
              : hasDmNotes
              ? 'DM notes only'
              : 'Player notes only'}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="p-4 space-y-4 bg-purple-500/5">
          {/* Notes Preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* DM Notes Column */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-purple-300">
                <ScrollText className="w-4 h-4" />
                DM Notes
              </div>

              {dmSummary ? (
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-xs text-gray-500 mb-1">Summary</p>
                  <p className="text-sm text-gray-300 line-clamp-4">{dmSummary}</p>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] text-center">
                  <p className="text-sm text-gray-500">No DM summary</p>
                </div>
              )}

              {dmDetailedNotes && (
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-xs text-gray-500 mb-1">Detailed Notes</p>
                  <div
                    className="text-sm text-gray-300 line-clamp-4 prose prose-invert prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: dmDetailedNotes }}
                  />
                </div>
              )}
            </div>

            {/* Player Notes Column */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-300">
                <Users className="w-4 h-4" />
                Player Notes ({playerNotes.length})
              </div>

              {hasPlayerNotes ? (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {playerNotes.map(note => (
                    <div
                      key={note.id}
                      className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {note.character?.image_url ? (
                          <Image
                            src={note.character.image_url}
                            alt={note.character.name}
                            width={20}
                            height={20}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 text-[10px] font-medium">
                            {getInitials(note.character?.name || 'P')}
                          </div>
                        )}
                        <span className="text-xs font-medium text-blue-300">
                          {note.character?.name || 'Unknown'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 line-clamp-3">{note.notes}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] text-center">
                  <p className="text-sm text-gray-500">No player notes yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Merge Button */}
          <div className="flex justify-center pt-2">
            <button
              onClick={handleMerge}
              disabled={merging || !canUseAI}
              className="btn btn-primary"
            >
              {merging ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Merging...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Merge with AI
                </>
              )}
            </button>
          </div>

          {/* Merged Result */}
          {mergedContent && (
            <div className="mt-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm font-medium text-green-300">
                  <Sparkles className="w-4 h-4" />
                  Merged Summary
                </div>
                <button
                  onClick={handleCopy}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors",
                    copied
                      ? "bg-green-500/20 text-green-300"
                      : "bg-white/[0.05] text-gray-400 hover:text-white"
                  )}
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <div className="text-sm text-gray-300 whitespace-pre-wrap">
                {mergedContent}
              </div>
            </div>
          )}

          {/* Help text */}
          {!canUseAI && (
            <p className="text-xs text-amber-400 text-center">
              AI merge requires a paid plan
            </p>
          )}
        </div>
      )}
    </div>
  )
}

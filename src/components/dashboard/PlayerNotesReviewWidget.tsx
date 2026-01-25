'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  MessageSquare,
  ChevronRight,
  Loader2,
  UserPlus,
  Wand2,
  Eye,
} from 'lucide-react'
import { DashboardWidget, WidgetEmptyState } from './DashboardWidget'
import { cn, getInitials, formatRelativeDate } from '@/lib/utils'
import type { PlayerSessionNote, Session, Character } from '@/types/database'

interface NoteWithContext {
  note: PlayerSessionNote
  session?: Session
  character?: Character
}

interface PlayerNotesReviewWidgetProps {
  campaignId: string
  className?: string
}

export function PlayerNotesReviewWidget({
  campaignId,
  className,
}: PlayerNotesReviewWidgetProps) {
  const [notes, setNotes] = useState<NoteWithContext[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadNotes()
  }, [campaignId])

  const loadNotes = async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/player-notes?limit=5`)
      if (response.ok) {
        const data = await response.json()
        setNotes(data.notes || [])
      }
    } catch (error) {
      console.error('Failed to load player notes:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardWidget
        title="Player Notes"
        icon={MessageSquare}
        className={className}
      >
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      </DashboardWidget>
    )
  }

  if (notes.length === 0) {
    return (
      <DashboardWidget
        title="Player Notes"
        icon={MessageSquare}
        className={className}
      >
        <WidgetEmptyState
          icon={MessageSquare}
          title="No player notes yet"
          description="When players add session notes, they'll appear here for you to review and merge into your summaries."
        />
      </DashboardWidget>
    )
  }

  return (
    <DashboardWidget
      title="Player Notes"
      icon={MessageSquare}
      action={{ label: 'View All', href: `/campaigns/${campaignId}/sessions` }}
      className={className}
    >
      <div className="space-y-3">
        {notes.map(({ note, session, character }) => (
          <Link
            key={note.id}
            href={`/campaigns/${campaignId}/sessions/${note.session_id}`}
            className="block p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:border-blue-500/30 transition-colors group"
          >
            <div className="flex items-start gap-3">
              {/* Character Avatar */}
              {character?.image_url ? (
                <Image
                  src={character.image_url}
                  alt={character.name}
                  width={32}
                  height={32}
                  className="rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 font-medium text-xs flex-shrink-0">
                  {getInitials(character?.name || 'P')}
                </div>
              )}

              <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-white text-sm truncate">
                    {character?.name || 'Player'}
                  </span>
                  {session && (
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      Session {session.session_number}
                    </span>
                  )}
                </div>

                {/* Note Preview */}
                <p className="text-sm text-gray-400 line-clamp-2">
                  {note.notes}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">
                    {formatRelativeDate(note.created_at || '')}
                  </span>
                  <span className="text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    View Session
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mt-4 pt-3 border-t border-white/[0.06]">
        <p className="text-xs text-gray-500 mb-2">
          Use AI to merge player perspectives with your DM notes
        </p>
        <Link
          href={`/campaigns/${campaignId}/sessions`}
          className="inline-flex items-center gap-1.5 text-sm text-purple-400 hover:text-purple-300"
        >
          <Wand2 className="w-4 h-4" />
          Open Sessions to Merge Notes
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </DashboardWidget>
  )
}

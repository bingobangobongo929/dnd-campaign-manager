'use client'

import {
  Plus,
  ScrollText,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit3,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { MobileLayout } from '@/components/mobile'
import { Button, SafeHtml } from '@/components/ui'
import { formatDate } from '@/lib/character-display'
import type { PlayJournal } from '@/types/database'

export interface CharacterSessionsPageMobileProps {
  characterId: string
  entries: PlayJournal[]
  loading: boolean
  expandedIds: Set<string>
  toggleExpanded: (id: string) => void
  handleDelete: (id: string) => void
  onNavigate: (path: string) => void
}

export function CharacterSessionsPageMobile({
  characterId,
  entries,
  loading,
  expandedIds,
  toggleExpanded,
  handleDelete,
  onNavigate,
}: CharacterSessionsPageMobileProps) {
  if (loading) {
    return (
      <AppLayout characterId={characterId}>
        <MobileLayout title="Sessions" showBackButton backHref={`/vault/${characterId}`}>
          <div className="flex items-center justify-center h-[60vh]">
            <div className="w-10 h-10 border-2 border-[--arcane-purple] border-t-transparent rounded-full spinner" />
          </div>
        </MobileLayout>
      </AppLayout>
    )
  }

  return (
    <AppLayout characterId={characterId}>
      <MobileLayout
        title="Sessions"
        showBackButton
        backHref={`/vault/${characterId}`}
        actions={
          <button
            onClick={() => onNavigate(`/vault/${characterId}/sessions/new`)}
            className="p-2 rounded-lg bg-[--arcane-purple] active:bg-[--arcane-purple]/80 transition-colors"
          >
            <Plus className="w-5 h-5 text-white" />
          </button>
        }
      >
        <div className="px-4 pb-24">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center mb-4">
                <ScrollText className="w-7 h-7 text-gray-500" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No Sessions Yet</h3>
              <p className="text-sm text-gray-400 mb-6">Record your adventures</p>
              <Button onClick={() => onNavigate(`/vault/${characterId}/sessions/new`)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Entry
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => {
                const isExpanded = expandedIds.has(entry.id)
                return (
                  <div
                    key={entry.id}
                    className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden"
                  >
                    {/* Session Header */}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[--arcane-purple] bg-[--arcane-purple]/10 px-2 py-0.5 rounded">
                            #{entry.session_number ?? '?'}
                          </span>
                          {entry.session_date && (
                            <span className="text-xs text-gray-500">
                              {formatDate(entry.session_date)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onNavigate(`/vault/${characterId}/sessions/${entry.id}`)}
                            className="p-2 rounded-lg active:bg-white/10 text-gray-400"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="p-2 rounded-lg active:bg-white/10 text-gray-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <h3 className="font-medium text-white mb-2 text-[15px]">
                        {entry.title || `Session ${entry.session_number}`}
                      </h3>

                      {/* Summary */}
                      {entry.summary && (
                        <SafeHtml
                          html={entry.summary}
                          className="prose prose-invert prose-sm max-w-none text-gray-400 text-[13px] line-clamp-3"
                        />
                      )}

                      {/* Detailed Notes Toggle */}
                      {entry.notes && (
                        <button
                          onClick={() => toggleExpanded(entry.id)}
                          className="flex items-center gap-1 mt-3 text-sm text-[--arcane-purple] active:text-[--arcane-purple]/80 transition-colors"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-4 h-4" />
                              Hide Details
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4" />
                              Show Details
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Expanded Detailed Notes */}
                    {isExpanded && entry.notes && (
                      <div className="px-4 pb-4 pt-2 border-t border-white/[0.06]">
                        <SafeHtml
                          html={entry.notes}
                          className="prose prose-invert prose-sm max-w-none text-gray-400 text-[13px]"
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </MobileLayout>
    </AppLayout>
  )
}

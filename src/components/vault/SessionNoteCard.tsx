'use client'

import { useState } from 'react'
import {
  Calendar,
  Sword,
  Package,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  MapPin,
  Users,
} from 'lucide-react'
import type { PlayJournal } from '@/types/database'

interface SessionNoteCardProps {
  session: PlayJournal
  onEdit?: () => void
  onDelete?: () => void
}

export function SessionNoteCard({ session, onEdit, onDelete }: SessionNoteCardProps) {
  const [expanded, setExpanded] = useState(false)

  const hasExpandableContent = session.notes && session.notes.length > 200

  return (
    <div className="bg-[--bg-surface] rounded-xl border border-[--border] hover:border-[--arcane-purple]/30 transition-all duration-200 overflow-hidden">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {/* Session number and title */}
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              {session.session_number && (
                <span className="text-sm px-3 py-1 bg-yellow-500/15 text-yellow-400 rounded-lg font-medium border border-yellow-500/20">
                  Session {session.session_number}
                </span>
              )}
              {session.campaign_name && (
                <span className="text-xs px-2 py-1 bg-purple-500/15 text-purple-400 rounded-md border border-purple-500/20">
                  {session.campaign_name}
                </span>
              )}
              {session.title && (
                <h3 className="text-base font-medium text-white/90">{session.title}</h3>
              )}
            </div>

            {/* Date */}
            {session.session_date && (
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                <Calendar className="w-3 h-3" />
                <span>{new Date(session.session_date).toLocaleDateString()}</span>
              </div>
            )}

            {/* Stats row */}
            <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap mb-3">
              {session.kill_count != null && session.kill_count > 0 && (
                <div className="flex items-center gap-1 text-red-400">
                  <Sword className="w-3 h-3" />
                  <span>Kills: {session.kill_count}</span>
                </div>
              )}
              {session.loot && (
                <div className="flex items-center gap-1 text-yellow-400">
                  <Package className="w-3 h-3" />
                  <span>Loot</span>
                </div>
              )}
              {session.npcs_met && session.npcs_met.length > 0 && (
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>{session.npcs_met.length} NPCs met</span>
                </div>
              )}
              {session.locations_visited && session.locations_visited.length > 0 && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>{session.locations_visited.length} locations</span>
                </div>
              )}
            </div>

            {/* Summary or truncated notes */}
            {session.summary ? (
              <p className="text-sm text-gray-400 leading-relaxed">{session.summary}</p>
            ) : session.notes && (
              <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap">
                {expanded ? session.notes : session.notes.substring(0, 200) + (session.notes.length > 200 ? '...' : '')}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-1.5 text-gray-500 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-all"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expandable details */}
      {(hasExpandableContent || session.loot || session.thoughts_for_next || session.npcs_met?.length || session.locations_visited?.length) && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full px-4 py-2 flex items-center justify-center gap-2 text-xs text-gray-500 hover:text-purple-400 bg-white/[0.02] hover:bg-white/[0.04] border-t border-[--border] transition-all"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Collapse
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Expand Details
              </>
            )}
          </button>

          {expanded && (
            <div className="px-4 pb-4 space-y-4 border-t border-[--border] bg-white/[0.01]">
              {/* Full notes if truncated */}
              {session.summary && session.notes && (
                <div className="pt-4">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                    Full Notes
                  </h4>
                  <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap">{session.notes}</p>
                </div>
              )}

              {/* Loot */}
              {session.loot && (
                <div className="pt-4">
                  <h4 className="text-xs font-medium text-yellow-400/70 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Package className="w-3 h-3" />
                    Loot
                  </h4>
                  <p className="text-sm text-gray-400">{session.loot}</p>
                </div>
              )}

              {/* NPCs Met */}
              {session.npcs_met && session.npcs_met.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Users className="w-3 h-3" />
                    NPCs Met
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {session.npcs_met.map((npc, i) => (
                      <span key={i} className="text-xs px-2 py-1 bg-white/[0.04] text-gray-400 rounded-md">
                        {npc}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Locations Visited */}
              {session.locations_visited && session.locations_visited.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <MapPin className="w-3 h-3" />
                    Locations Visited
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {session.locations_visited.map((loc, i) => (
                      <span key={i} className="text-xs px-2 py-1 bg-white/[0.04] text-gray-400 rounded-md">
                        {loc}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Thoughts for next session */}
              {session.thoughts_for_next && (
                <div>
                  <h4 className="text-xs font-medium text-purple-400/70 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Lightbulb className="w-3 h-3" />
                    Thoughts for Next Session
                  </h4>
                  <p className="text-sm text-gray-400 whitespace-pre-wrap">{session.thoughts_for_next}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

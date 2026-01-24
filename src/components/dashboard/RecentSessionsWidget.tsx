'use client'

import Link from 'next/link'
import { BookOpen, FileText, AlertCircle, ChevronRight } from 'lucide-react'
import { DashboardWidget, WidgetEmptyState } from './DashboardWidget'
import { cn } from '@/lib/utils'
import type { Session } from '@/types/database'

interface RecentSessionsWidgetProps {
  campaignId: string
  sessions: Session[]
  isDm: boolean
  className?: string
}

export function RecentSessionsWidget({
  campaignId,
  sessions,
  isDm,
  className,
}: RecentSessionsWidgetProps) {
  if (sessions.length === 0) {
    return (
      <DashboardWidget
        title="Recent Sessions"
        icon={BookOpen}
        className={className}
      >
        <WidgetEmptyState
          icon={BookOpen}
          title="No sessions recorded yet"
          description="Start tracking your campaign's adventures by recording sessions."
          action={isDm ? {
            label: 'Record First Session',
            href: `/campaigns/${campaignId}/sessions`,
          } : undefined}
        />
      </DashboardWidget>
    )
  }

  return (
    <DashboardWidget
      title="Recent Sessions"
      icon={BookOpen}
      action={{ label: 'View All', href: `/campaigns/${campaignId}/sessions` }}
      className={className}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {sessions.slice(0, 4).map((session) => {
          const hasNotes = session.notes && session.notes.length > 20

          return (
            <Link
              key={session.id}
              href={`/campaigns/${campaignId}/sessions/${session.id}`}
              className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg border border-white/[0.08] hover:bg-white/[0.04] transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center text-purple-400 text-sm font-medium flex-shrink-0">
                  {session.session_number}
                </div>
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {session.title || `Session ${session.session_number}`}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-gray-500 text-xs">
                      {new Date(session.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                    {hasNotes ? (
                      <span className="flex items-center gap-0.5 text-green-400 text-xs">
                        <FileText className="w-3 h-3" />
                        ✓
                      </span>
                    ) : (
                      <span className="flex items-center gap-0.5 text-amber-400 text-xs">
                        <AlertCircle className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors flex-shrink-0" />
            </Link>
          )
        })}
      </div>
    </DashboardWidget>
  )
}

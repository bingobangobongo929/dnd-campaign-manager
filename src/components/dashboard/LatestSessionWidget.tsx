'use client'

import Link from 'next/link'
import { Calendar, FileText, Clock as ClockIcon } from 'lucide-react'
import { DashboardWidget, WidgetEmptyState } from './DashboardWidget'
import type { Session, Campaign } from '@/types/database'
import { cn } from '@/lib/utils'

interface LatestSessionWidgetProps {
  campaignId: string
  session: Session | null
  campaign: Campaign | null
  isDm: boolean
  className?: string
}

export function LatestSessionWidget({
  campaignId,
  session,
  campaign,
  isDm,
  className,
}: LatestSessionWidgetProps) {
  // Check for next scheduled session from campaign
  const nextSessionDate = campaign && 'next_session_date' in campaign
    ? (campaign as Campaign & { next_session_date?: string }).next_session_date
    : null

  if (!session) {
    return (
      <DashboardWidget
        title="Latest Session"
        icon={Calendar}
        className={className}
      >
        <WidgetEmptyState
          icon={Calendar}
          title="No sessions yet"
          description="Record your first session to start tracking your campaign's story."
          action={isDm ? {
            label: 'Create First Session',
            href: `/campaigns/${campaignId}/sessions`,
          } : undefined}
        />
      </DashboardWidget>
    )
  }

  const sessionDate = new Date(session.date)
  const hasNotes = session.notes && session.notes.length > 20

  return (
    <DashboardWidget
      title="Latest Session"
      icon={Calendar}
      action={{ label: 'View All', href: `/campaigns/${campaignId}/sessions` }}
      className={className}
    >
      <Link
        href={`/campaigns/${campaignId}/sessions/${session.id}`}
        className="block p-3 bg-purple-600/10 border border-purple-500/20 rounded-lg hover:bg-purple-600/20 transition-colors"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-purple-400 font-medium">
            Session {session.session_number}
          </span>
          <span className="text-xs text-gray-500">
            {sessionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
        <p className="text-white font-medium text-sm">
          {session.title || `Session ${session.session_number}`}
        </p>
        {session.summary && (
          <p className="text-gray-400 text-xs mt-1 line-clamp-2">
            {session.summary}
          </p>
        )}

        {/* Status badges */}
        <div className="flex items-center gap-2 mt-3">
          {hasNotes ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-green-500/10 text-green-400">
              <FileText className="w-3 h-3" />
              Has Notes
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-amber-500/10 text-amber-400">
              <FileText className="w-3 h-3" />
              Needs Notes
            </span>
          )}
        </div>
      </Link>

      {/* Next scheduled session */}
      {nextSessionDate && (
        <div className="mt-3 flex items-center gap-2 text-sm text-gray-400">
          <ClockIcon className="w-4 h-4" />
          <span>
            Next scheduled: {new Date(nextSessionDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </div>
      )}
    </DashboardWidget>
  )
}

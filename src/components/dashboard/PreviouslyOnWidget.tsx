'use client'

import Link from 'next/link'
import { BookOpen, Swords, Users, Key, MapPin, ChevronRight } from 'lucide-react'
import { DashboardWidget } from './DashboardWidget'
import { cn } from '@/lib/utils'
import type { Session, TimelineEvent } from '@/types/database'

interface PreviouslyOnWidgetProps {
  campaignId: string
  campaignName: string
  session: Session | null
  sessionEvents: TimelineEvent[]
  className?: string
}

// Map event types to icons
const EVENT_TYPE_ICONS: Record<string, React.ElementType> = {
  combat: Swords,
  character_intro: Users,
  revelation: Key,
  location: MapPin,
  plot: BookOpen,
}

export function PreviouslyOnWidget({
  campaignId,
  campaignName,
  session,
  sessionEvents,
  className,
}: PreviouslyOnWidgetProps) {
  if (!session) {
    return null // Don't show if no sessions exist
  }

  // Get summary to display
  const summary = session.summary || session.notes

  return (
    <DashboardWidget
      title={`Previously on ${campaignName}...`}
      icon={BookOpen}
      action={{ label: `Session ${session.session_number}`, href: `/campaigns/${campaignId}/sessions/${session.id}` }}
      className={className}
    >
      {/* Summary Text */}
      {summary && (
        <div className="mb-4">
          <p className="text-sm text-gray-300 leading-relaxed">
            {summary.length > 300 ? `${summary.slice(0, 300)}...` : summary}
          </p>
        </div>
      )}

      {/* Key Events */}
      {sessionEvents.length > 0 && (
        <div className="border-t border-white/[0.06] pt-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
            Key Moments
          </p>
          <div className="space-y-2">
            {sessionEvents.slice(0, 3).map((event) => {
              const Icon = EVENT_TYPE_ICONS[event.event_type] || BookOpen

              return (
                <div
                  key={event.id}
                  className="flex items-start gap-2 text-sm"
                >
                  <Icon className={cn(
                    "w-4 h-4 mt-0.5 flex-shrink-0",
                    event.is_major ? "text-purple-400" : "text-gray-500"
                  )} />
                  <div className="min-w-0">
                    <p className={cn(
                      "truncate",
                      event.is_major ? "text-white font-medium" : "text-gray-400"
                    )}>
                      {event.title}
                    </p>
                    {event.description && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {event.description}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Read Full Session Link */}
      <Link
        href={`/campaigns/${campaignId}/sessions/${session.id}`}
        className="flex items-center justify-end gap-1 mt-4 text-sm text-purple-400 hover:text-purple-300 transition-colors"
      >
        Read Full Session
        <ChevronRight className="w-4 h-4" />
      </Link>
    </DashboardWidget>
  )
}

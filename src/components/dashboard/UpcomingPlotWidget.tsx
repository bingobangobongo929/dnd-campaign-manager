'use client'

import Link from 'next/link'
import { Compass, Eye, EyeOff, Calendar, Sparkles } from 'lucide-react'
import { DashboardWidget, WidgetEmptyState } from './DashboardWidget'
import { cn } from '@/lib/utils'
import type { TimelineEvent } from '@/types/database'

interface UpcomingPlotWidgetProps {
  campaignId: string
  events: TimelineEvent[]
  className?: string
}

// Get event type icon/color
function getEventTypeStyle(eventType: TimelineEvent['event_type']) {
  const styles: Record<TimelineEvent['event_type'], { color: string; label: string }> = {
    plot: { color: 'text-purple-400', label: 'Plot' },
    character_intro: { color: 'text-blue-400', label: 'Introduction' },
    character_death: { color: 'text-red-400', label: 'Death' },
    location: { color: 'text-green-400', label: 'Location' },
    combat: { color: 'text-orange-400', label: 'Combat' },
    revelation: { color: 'text-yellow-400', label: 'Revelation' },
    quest_start: { color: 'text-cyan-400', label: 'Quest Start' },
    quest_end: { color: 'text-emerald-400', label: 'Quest End' },
    session: { color: 'text-gray-400', label: 'Session' },
    discovery: { color: 'text-amber-400', label: 'Discovery' },
    quest_complete: { color: 'text-emerald-400', label: 'Quest Complete' },
    death: { color: 'text-red-400', label: 'Death' },
    romance: { color: 'text-pink-400', label: 'Romance' },
    alliance: { color: 'text-indigo-400', label: 'Alliance' },
    other: { color: 'text-gray-400', label: 'Other' },
  }
  return styles[eventType] || styles.other
}

export function UpcomingPlotWidget({
  campaignId,
  events,
  className,
}: UpcomingPlotWidgetProps) {
  // Filter for upcoming/planned events: either future-dated or DM-only visibility
  const today = new Date().toISOString().split('T')[0]
  const upcomingEvents = events.filter(event => {
    // Include events with future dates
    if (event.event_date > today) return true
    // Include DM-only events that might be planned but not revealed
    if (event.visibility === 'dm_only') return true
    return false
  }).slice(0, 5)

  if (upcomingEvents.length === 0) {
    return (
      <DashboardWidget
        title="Upcoming Plot"
        icon={Compass}
        className={className}
      >
        <WidgetEmptyState
          icon={Compass}
          title="No planned events"
          description="Add future plot points to track what's coming up in your campaign. Use 'DM only' visibility for events you want to keep hidden from players."
          action={{
            label: 'Add Plot Point',
            href: `/campaigns/${campaignId}/timeline`,
          }}
        />
      </DashboardWidget>
    )
  }

  return (
    <DashboardWidget
      title="Upcoming Plot"
      icon={Compass}
      action={{ label: 'View Timeline', href: `/campaigns/${campaignId}/timeline` }}
      className={className}
    >
      <div className="space-y-3">
        {upcomingEvents.map((event) => {
          const typeStyle = getEventTypeStyle(event.event_type)
          const isFuture = event.event_date > today
          const isDmOnly = event.visibility === 'dm_only'

          return (
            <div
              key={event.id}
              className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:border-purple-500/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                  "bg-purple-500/10"
                )}>
                  {isDmOnly ? (
                    <EyeOff className="w-4 h-4 text-purple-400" />
                  ) : isFuture ? (
                    <Calendar className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-purple-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white text-sm font-medium truncate">
                      {event.title}
                    </p>
                    {event.is_major && (
                      <span className="flex-shrink-0 text-[10px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                        Major
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={cn("text-xs", typeStyle.color)}>
                      {typeStyle.label}
                    </span>
                    <span className="text-gray-600">•</span>
                    <span className="text-xs text-gray-500">
                      {new Date(event.event_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    {isDmOnly && (
                      <>
                        <span className="text-gray-600">•</span>
                        <span className="text-xs text-purple-400 flex items-center gap-1">
                          <EyeOff className="w-3 h-3" />
                          Hidden
                        </span>
                      </>
                    )}
                  </div>
                  {event.description && (
                    <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">
                      {event.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {events.filter(e => e.event_date > today || e.visibility === 'dm_only').length > 5 && (
        <Link
          href={`/campaigns/${campaignId}/timeline`}
          className="block text-center text-xs text-purple-400 hover:text-purple-300 mt-3"
        >
          View all planned events →
        </Link>
      )}
    </DashboardWidget>
  )
}

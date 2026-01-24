'use client'

import Link from 'next/link'
import { Clock } from 'lucide-react'
import { DashboardWidget, WidgetEmptyState } from './DashboardWidget'
import { cn } from '@/lib/utils'
import type { TimelineEvent } from '@/types/database'

interface RecentEventsWidgetProps {
  campaignId: string
  events: TimelineEvent[]
  isDm: boolean
  className?: string
}

export function RecentEventsWidget({
  campaignId,
  events,
  isDm,
  className,
}: RecentEventsWidgetProps) {
  if (events.length === 0) {
    return (
      <DashboardWidget
        title="Recent Events"
        icon={Clock}
        className={className}
      >
        <WidgetEmptyState
          icon={Clock}
          title="No timeline events yet"
          description="Add key moments, discoveries, and plot points to track your story's progress."
          action={isDm ? {
            label: 'Add First Event',
            href: `/campaigns/${campaignId}/timeline`,
          } : undefined}
        />
      </DashboardWidget>
    )
  }

  return (
    <DashboardWidget
      title="Recent Events"
      icon={Clock}
      action={{ label: 'View Timeline', href: `/campaigns/${campaignId}/timeline` }}
      className={className}
    >
      {/* Timeline line */}
      <div className="relative">
        <div className="absolute left-[5px] top-2 bottom-2 w-[2px] bg-white/[0.08]" />

        <div className="space-y-4">
          {events.slice(0, 5).map((event) => (
            <div key={event.id} className="flex items-start gap-3 relative">
              <div
                className={cn(
                  "w-3 h-3 rounded-full mt-1 flex-shrink-0 relative z-10",
                  event.is_major ? "bg-purple-500" : "bg-gray-600"
                )}
              />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {event.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-500">
                    {new Date(event.event_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  {event.is_major && (
                    <span className="text-xs text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                      Major Event
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardWidget>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Wrench,
  Calendar,
  FileText,
  MapPin,
  Clock,
  Bell,
  Pencil,
  X,
} from 'lucide-react'
import { DashboardWidget } from './DashboardWidget'
import { cn } from '@/lib/utils'
import type { Campaign } from '@/types/database'

interface DmToolboxWidgetProps {
  campaignId: string
  campaign: Campaign | null
  pendingPlayerNotes: number
  onScheduleSession?: () => void
  onSendReminder?: () => void
  className?: string
}

interface ToolCardProps {
  icon: React.ElementType
  title: string
  description: string
  href?: string
  onClick?: () => void
  badge?: number | string
  variant?: 'default' | 'highlight'
}

function ToolCard({
  icon: Icon,
  title,
  description,
  href,
  onClick,
  badge,
  variant = 'default',
}: ToolCardProps) {
  const content = (
    <div
      className={cn(
        "p-3 rounded-lg border transition-colors cursor-pointer",
        variant === 'highlight'
          ? "bg-purple-600/10 border-purple-500/20 hover:bg-purple-600/20"
          : "bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.05]"
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", variant === 'highlight' ? "text-purple-400" : "text-gray-400")} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm text-white">{title}</p>
            {badge !== undefined && (typeof badge === 'string' || badge > 0) && (
              <span className="px-1.5 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-400">
                {badge}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  if (onClick) {
    return <div onClick={onClick}>{content}</div>
  }

  return content
}

export function DmToolboxWidget({
  campaignId,
  campaign,
  pendingPlayerNotes,
  onScheduleSession,
  onSendReminder,
  className,
}: DmToolboxWidgetProps) {
  // Check for next session
  const nextSessionDate = campaign && 'next_session_date' in campaign
    ? (campaign as Campaign & { next_session_date?: string }).next_session_date
    : null

  const nextSessionLocation = campaign && 'next_session_location' in campaign
    ? (campaign as Campaign & { next_session_location?: string }).next_session_location
    : null

  return (
    <DashboardWidget
      title="DM Toolbox"
      icon={Wrench}
      className={className}
    >
      <div className="space-y-4">
        {/* Next Session Block */}
        <div>
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Next Session
          </h4>
          {nextSessionDate ? (
            <div className="p-3 bg-purple-600/10 border border-purple-500/20 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-purple-300 font-medium">
                    {new Date(nextSessionDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                  {nextSessionLocation && (
                    <p className="text-xs text-gray-400 mt-0.5">{nextSessionLocation}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={onScheduleSession}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-white/[0.05] rounded transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  {onSendReminder && (
                    <button
                      onClick={onSendReminder}
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-white/[0.05] rounded transition-colors"
                      title="Send Reminder"
                    >
                      <Bell className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={onScheduleSession}
              className="w-full p-3 bg-white/[0.02] border border-white/[0.08] border-dashed rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.05] transition-colors text-sm"
            >
              <Calendar className="w-4 h-4 inline-block mr-2" />
              Schedule Next Session
            </button>
          )}
        </div>

        {/* Quick Tools Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {pendingPlayerNotes > 0 && (
            <ToolCard
              icon={FileText}
              title="Pending Notes"
              description="Review player notes"
              href={`/campaigns/${campaignId}/sessions`}
              badge={pendingPlayerNotes}
              variant="highlight"
            />
          )}
          <ToolCard
            icon={MapPin}
            title="Party Location"
            description="Update current location"
            href={`/campaigns/${campaignId}/map`}
          />
          <ToolCard
            icon={Clock}
            title="Timeline"
            description="Add story events"
            href={`/campaigns/${campaignId}/timeline`}
          />
        </div>
      </div>
    </DashboardWidget>
  )
}

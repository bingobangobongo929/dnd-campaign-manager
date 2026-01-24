'use client'

import Link from 'next/link'
import {
  BarChart3,
  Users,
  Calendar,
  Clock,
  MapPin,
  BookOpen,
  AlertCircle,
  FileText,
  CheckCircle2,
} from 'lucide-react'
import { DashboardWidget } from './DashboardWidget'
import { cn } from '@/lib/utils'

interface CampaignStatsWidgetProps {
  campaignId: string
  stats: {
    partyCount: number
    totalCharacters: number
    sessionCount: number
    timelineEventCount: number
    locationCount: number
    loreEntryCount: number
    playerNoteCount?: number
  }
  health: {
    npcsMissingDetails: number
    sessionsWithoutNotes: number
  }
  isDm: boolean
  className?: string
}

interface StatRowProps {
  icon: React.ElementType
  label: string
  value: number | string
  subtext?: string
}

function StatRow({ icon: Icon, label, value, subtext }: StatRowProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-gray-400 text-sm">
        <Icon className="w-4 h-4" />
        <span>{label}</span>
      </div>
      <div className="text-right">
        <span className="text-white font-medium">{value}</span>
        {subtext && <span className="text-gray-500 text-xs ml-1">{subtext}</span>}
      </div>
    </div>
  )
}

interface HealthWarningProps {
  icon: React.ElementType
  message: string
  href?: string
}

function HealthWarning({ icon: Icon, message, href }: HealthWarningProps) {
  const content = (
    <div className="flex items-center gap-2 p-2 bg-amber-500/10 rounded-lg">
      <Icon className="w-4 h-4 text-amber-400 flex-shrink-0" />
      <span className="text-amber-400 text-xs">{message}</span>
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return content
}

export function CampaignStatsWidget({
  campaignId,
  stats,
  health,
  isDm,
  className,
}: CampaignStatsWidgetProps) {
  const isHealthy = health.npcsMissingDetails === 0 && health.sessionsWithoutNotes === 0

  return (
    <DashboardWidget
      title={isDm ? "Campaign Stats" : "Campaign Stats"}
      icon={BarChart3}
      className={className}
    >
      <div className="space-y-3">
        <StatRow
          icon={Users}
          label="Party Members"
          value={stats.partyCount}
        />
        <StatRow
          icon={Calendar}
          label="Sessions Played"
          value={stats.sessionCount}
        />
        {isDm && (
          <StatRow
            icon={Users}
            label="Total Characters"
            value={stats.totalCharacters}
            subtext={`(${stats.partyCount} PCs, ${stats.totalCharacters - stats.partyCount} NPCs)`}
          />
        )}
        <StatRow
          icon={Clock}
          label="Timeline Events"
          value={stats.timelineEventCount}
        />
        {isDm && (
          <>
            <StatRow
              icon={MapPin}
              label="Locations"
              value={stats.locationCount}
            />
            <StatRow
              icon={BookOpen}
              label="Lore Entries"
              value={stats.loreEntryCount}
            />
          </>
        )}
        {!isDm && stats.playerNoteCount !== undefined && (
          <StatRow
            icon={FileText}
            label="Your Notes"
            value={stats.playerNoteCount}
          />
        )}

        {/* Health Warnings - DM Only */}
        {isDm && (
          <div className="pt-3 border-t border-white/[0.06] space-y-2">
            {health.npcsMissingDetails > 0 && (
              <HealthWarning
                icon={AlertCircle}
                message={`${health.npcsMissingDetails} NPC${health.npcsMissingDetails === 1 ? '' : 's'} need more details`}
                href={`/campaigns/${campaignId}/canvas`}
              />
            )}
            {health.sessionsWithoutNotes > 0 && (
              <HealthWarning
                icon={FileText}
                message={`${health.sessionsWithoutNotes} session${health.sessionsWithoutNotes === 1 ? '' : 's'} need notes`}
                href={`/campaigns/${campaignId}/sessions`}
              />
            )}
            {isHealthy && (
              <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span className="text-green-400 text-xs">Campaign is well documented!</span>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardWidget>
  )
}

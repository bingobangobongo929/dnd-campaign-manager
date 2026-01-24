'use client'

import Link from 'next/link'
import {
  Plus,
  UsersRound,
  Share2,
  Brain,
  Map,
  BookOpen,
  Clock,
  Image as ImageIcon,
  FileText,
  User,
} from 'lucide-react'
import { DashboardWidget } from './DashboardWidget'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickActionProps {
  icon: React.ElementType
  label: string
  href?: string
  onClick?: () => void
  variant?: 'default' | 'primary'
}

function QuickAction({ icon: Icon, label, href, onClick, variant = 'default' }: QuickActionProps) {
  const className = cn(
    "flex flex-col items-center gap-2 p-3 sm:p-4 rounded-lg transition-colors",
    variant === 'primary'
      ? "bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600/30 text-purple-300"
      : "bg-white/[0.02] border border-white/[0.08] hover:bg-white/[0.05] text-gray-300"
  )

  if (href) {
    return (
      <Link href={href} className={className}>
        <Icon className="w-5 h-5" />
        <span className="text-xs font-medium text-center">{label}</span>
      </Link>
    )
  }

  return (
    <button onClick={onClick} className={className}>
      <Icon className="w-5 h-5" />
      <span className="text-xs font-medium text-center">{label}</span>
    </button>
  )
}

interface QuickActionsWidgetProps {
  campaignId: string
  isDm: boolean
  canUseAI: boolean
  can: {
    addSession?: boolean
    viewSessions?: boolean
    viewTimeline?: boolean
    viewLore?: boolean
    viewMaps?: boolean
    viewGallery?: boolean
    addOwnSessionNotes?: boolean
  }
  onOpenMembers?: () => void
  onOpenShare?: () => void
  className?: string
}

export function QuickActionsWidget({
  campaignId,
  isDm,
  canUseAI,
  can,
  onOpenMembers,
  onOpenShare,
  className,
}: QuickActionsWidgetProps) {
  return (
    <DashboardWidget
      title="Quick Actions"
      icon={Sparkles}
      className={className}
    >
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {isDm ? (
          // DM Actions
          <>
            {can.addSession && (
              <QuickAction
                icon={Plus}
                label="New Session"
                href={`/campaigns/${campaignId}/sessions`}
                variant="primary"
              />
            )}
            <QuickAction
              icon={UsersRound}
              label="Members"
              onClick={onOpenMembers}
            />
            <QuickAction
              icon={Share2}
              label="Share"
              onClick={onOpenShare}
            />
            {canUseAI && (
              <QuickAction
                icon={Brain}
                label="Intelligence"
                href={`/campaigns/${campaignId}/intelligence`}
              />
            )}
            {can.viewMaps && (
              <QuickAction
                icon={Map}
                label="Map"
                href={`/campaigns/${campaignId}/map`}
              />
            )}
            {can.viewLore && (
              <QuickAction
                icon={BookOpen}
                label="Lore"
                href={`/campaigns/${campaignId}/lore`}
              />
            )}
            {can.viewTimeline && (
              <QuickAction
                icon={Clock}
                label="Timeline"
                href={`/campaigns/${campaignId}/timeline`}
              />
            )}
            {can.viewGallery && (
              <QuickAction
                icon={ImageIcon}
                label="Gallery"
                href={`/campaigns/${campaignId}/gallery`}
              />
            )}
          </>
        ) : (
          // Player Actions
          <>
            {can.addOwnSessionNotes && (
              <QuickAction
                icon={FileText}
                label="Add Notes"
                href={`/campaigns/${campaignId}/sessions`}
                variant="primary"
              />
            )}
            <QuickAction
              icon={User}
              label="My Character"
              href={`/campaigns/${campaignId}/canvas`}
            />
            {can.viewSessions && (
              <QuickAction
                icon={BookOpen}
                label="Sessions"
                href={`/campaigns/${campaignId}/sessions`}
              />
            )}
            {can.viewTimeline && (
              <QuickAction
                icon={Clock}
                label="Timeline"
                href={`/campaigns/${campaignId}/timeline`}
              />
            )}
            {can.viewLore && (
              <QuickAction
                icon={BookOpen}
                label="Lore"
                href={`/campaigns/${campaignId}/lore`}
              />
            )}
            {can.viewMaps && (
              <QuickAction
                icon={Map}
                label="Map"
                href={`/campaigns/${campaignId}/map`}
              />
            )}
          </>
        )}
      </div>
    </DashboardWidget>
  )
}

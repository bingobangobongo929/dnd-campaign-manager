'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Bell,
  FileText,
  Users as UsersIcon,
  Calendar,
  Clock,
  BookOpen,
  Link2,
  Eye,
} from 'lucide-react'
import { DashboardWidget, WidgetEmptyState } from './DashboardWidget'
import { getInitials, cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

// Activity types
type ActivityType =
  | 'note_added'
  | 'character_created'
  | 'member_joined'
  | 'session_created'
  | 'timeline_event'
  | 'lore_updated'
  | 'character_claimed'

interface Activity {
  id: string
  type: ActivityType
  title: string
  description?: string
  href?: string
  userName?: string
  userAvatar?: string
  createdAt: string
}

interface RecentActivityWidgetProps {
  campaignId: string
  activities: Activity[]
  className?: string
}

const ACTIVITY_CONFIG: Record<ActivityType, { icon: React.ElementType; color: string }> = {
  note_added: { icon: FileText, color: 'text-blue-400 bg-blue-400/10' },
  character_created: { icon: UsersIcon, color: 'text-purple-400 bg-purple-400/10' },
  member_joined: { icon: UsersIcon, color: 'text-green-400 bg-green-400/10' },
  session_created: { icon: Calendar, color: 'text-amber-400 bg-amber-400/10' },
  timeline_event: { icon: Clock, color: 'text-cyan-400 bg-cyan-400/10' },
  lore_updated: { icon: BookOpen, color: 'text-pink-400 bg-pink-400/10' },
  character_claimed: { icon: Link2, color: 'text-orange-400 bg-orange-400/10' },
}

function ActivityItem({ activity }: { activity: Activity }) {
  const config = ACTIVITY_CONFIG[activity.type]
  const Icon = config.icon
  const timeAgo = formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })

  const content = (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/[0.02] transition-colors">
      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0", config.color)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white">
          {activity.userName && (
            <span className="font-medium">{activity.userName}</span>
          )}
          {activity.userName && ' '}
          {activity.title}
        </p>
        {activity.description && (
          <p className="text-xs text-gray-500 truncate mt-0.5">
            "{activity.description}"
          </p>
        )}
        <p className="text-xs text-gray-600 mt-1">{timeAgo}</p>
      </div>
      {activity.href && (
        <button className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0">
          <Eye className="w-4 h-4" />
        </button>
      )}
    </div>
  )

  if (activity.href) {
    return <Link href={activity.href}>{content}</Link>
  }

  return content
}

export function RecentActivityWidget({
  campaignId,
  activities,
  className,
}: RecentActivityWidgetProps) {
  if (activities.length === 0) {
    return (
      <DashboardWidget
        title="Recent Activity"
        icon={Bell}
        className={className}
      >
        <div className="text-center py-6">
          <Bell className="w-8 h-8 text-gray-600 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No recent activity</p>
        </div>
      </DashboardWidget>
    )
  }

  return (
    <DashboardWidget
      title="Recent Activity"
      icon={Bell}
      className={className}
    >
      <div className="space-y-1 -mx-4 -my-1">
        {activities.slice(0, 5).map((activity) => (
          <ActivityItem key={activity.id} activity={activity} />
        ))}
      </div>
    </DashboardWidget>
  )
}

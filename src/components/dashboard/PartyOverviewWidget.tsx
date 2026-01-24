'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Users,
  ChevronDown,
  Check,
  X,
  HelpCircle,
  Bell,
} from 'lucide-react'
import { DashboardWidget, WidgetEmptyState } from './DashboardWidget'
import { cn, getInitials } from '@/lib/utils'
import type { Character, CampaignMember, Campaign } from '@/types/database'

type SessionStatus = 'confirmed' | 'unavailable' | 'maybe' | 'no_response'

interface PartyMember {
  character: Character
  member?: CampaignMember & { user_settings?: { username: string | null } | null }
  sessionStatus?: SessionStatus
}

interface PartyOverviewWidgetProps {
  campaignId: string
  partyMembers: PartyMember[]
  campaign: Campaign | null
  currentUserMemberId?: string
  isDm: boolean
  onUpdateStatus?: (memberId: string, status: SessionStatus) => Promise<void>
  onSendReminder?: () => void
  className?: string
}

const STATUS_OPTIONS: { value: SessionStatus; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'confirmed', label: 'Confirmed', icon: Check, color: 'text-green-400' },
  { value: 'maybe', label: 'Maybe', icon: HelpCircle, color: 'text-amber-400' },
  { value: 'unavailable', label: "Can't make it", icon: X, color: 'text-red-400' },
]

function StatusBadge({ status }: { status: SessionStatus }) {
  const config: Record<SessionStatus, { label: string; color: string; bg: string }> = {
    confirmed: { label: 'Confirmed', color: 'text-green-400', bg: 'bg-green-500/10' },
    unavailable: { label: "Can't make it", color: 'text-red-400', bg: 'bg-red-500/10' },
    maybe: { label: 'Maybe', color: 'text-amber-400', bg: 'bg-amber-500/10' },
    no_response: { label: 'No response', color: 'text-gray-500', bg: 'bg-gray-500/10' },
  }

  const { label, color, bg } = config[status]

  return (
    <span className={cn("px-2 py-0.5 text-xs rounded-full", bg, color)}>
      {label}
    </span>
  )
}

function StatusDropdown({
  currentStatus,
  onSelect,
}: {
  currentStatus: SessionStatus
  onSelect: (status: SessionStatus) => void
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-white/[0.05] hover:bg-white/[0.08] text-gray-300 transition-colors"
      >
        <StatusBadge status={currentStatus} />
        <ChevronDown className="w-3 h-3" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-[#1a1a24] border border-white/[0.08] rounded-lg shadow-xl py-1 min-w-[140px]">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onSelect(option.value)
                  setIsOpen(false)
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/[0.05] transition-colors",
                  option.color
                )}
              >
                <option.icon className="w-4 h-4" />
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function PartyMemberCard({
  member,
  showStatus,
  isCurrentUser,
  onUpdateStatus,
}: {
  member: PartyMember
  showStatus: boolean
  isCurrentUser: boolean
  onUpdateStatus?: (status: SessionStatus) => void
}) {
  const { character, member: membership, sessionStatus = 'no_response' } = member
  const playerName = membership?.user_settings?.username || membership?.email?.split('@')[0] || 'Unassigned'
  const isUnassigned = !membership

  return (
    <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/[0.08]">
      {character.image_url ? (
        <Image
          src={character.image_url}
          alt={character.name}
          width={40}
          height={40}
          className="rounded-full object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-400 font-medium text-sm flex-shrink-0">
          {getInitials(character.name)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white text-sm truncate">{character.name}</p>
        <p className="text-xs text-gray-500 truncate">
          {character.race && character.class
            ? `${character.race} ${character.class}`
            : character.role || 'Player Character'}
        </p>
        <p className="text-xs text-gray-600 truncate mt-0.5">
          {isUnassigned ? 'Unclaimed' : playerName}
        </p>
      </div>
      {showStatus && (
        isCurrentUser && onUpdateStatus ? (
          <StatusDropdown
            currentStatus={sessionStatus}
            onSelect={onUpdateStatus}
          />
        ) : (
          <StatusBadge status={sessionStatus} />
        )
      )}
      {!showStatus && character.status && (
        <span
          className="px-2 py-0.5 text-xs rounded-full"
          style={{
            backgroundColor: `${character.status_color || '#6B7280'}20`,
            color: character.status_color || '#9CA3AF',
          }}
        >
          {character.status}
        </span>
      )}
    </div>
  )
}

export function PartyOverviewWidget({
  campaignId,
  partyMembers,
  campaign,
  currentUserMemberId,
  isDm,
  onUpdateStatus,
  onSendReminder,
  className,
}: PartyOverviewWidgetProps) {
  // Check if there's a next session scheduled
  const nextSessionDate = campaign && 'next_session_date' in campaign
    ? (campaign as Campaign & { next_session_date?: string }).next_session_date
    : null

  const showSessionStatus = !!nextSessionDate

  // Calculate attendance summary
  const confirmed = partyMembers.filter(m => m.sessionStatus === 'confirmed').length
  const unavailable = partyMembers.filter(m => m.sessionStatus === 'unavailable').length
  const pending = partyMembers.filter(m => !m.sessionStatus || m.sessionStatus === 'no_response').length

  if (partyMembers.length === 0) {
    return (
      <DashboardWidget
        title="Party"
        icon={Users}
        className={className}
      >
        <WidgetEmptyState
          icon={Users}
          title="No party members yet"
          description="Add player characters on the Canvas to build your adventuring party."
          action={isDm ? {
            label: 'Go to Canvas',
            href: `/campaigns/${campaignId}/canvas`,
          } : undefined}
        />
      </DashboardWidget>
    )
  }

  return (
    <DashboardWidget
      title="Party"
      icon={Users}
      action={{ label: 'View All', href: `/campaigns/${campaignId}/canvas` }}
      className={className}
    >
      {/* Session header (if scheduled) */}
      {showSessionStatus && (
        <div className="mb-4 p-3 bg-purple-600/10 border border-purple-500/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-300 font-medium">
                Next: {new Date(nextSessionDate).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {confirmed} confirmed • {unavailable} unavailable • {pending} pending
              </p>
            </div>
            {isDm && onSendReminder && (
              <button
                onClick={onSendReminder}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
                title="Send Reminder"
              >
                <Bell className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Party members grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {partyMembers.slice(0, 6).map((member) => (
          <PartyMemberCard
            key={member.character.id}
            member={member}
            showStatus={showSessionStatus}
            isCurrentUser={member.member?.id === currentUserMemberId}
            onUpdateStatus={
              member.member?.id === currentUserMemberId && onUpdateStatus
                ? (status) => onUpdateStatus(member.member!.id, status)
                : undefined
            }
          />
        ))}
      </div>

      {partyMembers.length > 6 && (
        <p className="text-xs text-gray-500 text-center mt-3">
          + {partyMembers.length - 6} more members
        </p>
      )}
    </DashboardWidget>
  )
}

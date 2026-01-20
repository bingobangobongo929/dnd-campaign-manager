'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks'

interface PartyMember {
  id: string
  name: string
  image_url?: string | null
  class?: string | null
  race?: string | null
  relationship_type?: string
}

interface PartyMemberAvatarProps {
  member: PartyMember
  size?: 'sm' | 'md' | 'lg'
  showName?: boolean
  className?: string
}

const sizeClasses = {
  sm: 'w-7 h-7',
  md: 'w-9 h-9',
  lg: 'w-12 h-12',
}

const textSizeClasses = {
  sm: 'text-[10px]',
  md: 'text-xs',
  lg: 'text-sm',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-purple-500/20 text-purple-300',
    'bg-blue-500/20 text-blue-300',
    'bg-emerald-500/20 text-emerald-300',
    'bg-amber-500/20 text-amber-300',
    'bg-rose-500/20 text-rose-300',
    'bg-cyan-500/20 text-cyan-300',
    'bg-orange-500/20 text-orange-300',
    'bg-indigo-500/20 text-indigo-300',
  ]
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
  return colors[index]
}

export function PartyMemberAvatar({
  member,
  size = 'md',
  showName = false,
  className
}: PartyMemberAvatarProps) {
  const [showCard, setShowCard] = useState(false)
  const [cardPosition, setCardPosition] = useState<'above' | 'below'>('above')
  const avatarRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = () => {
    if (isMobile) return

    // Calculate position
    if (avatarRef.current) {
      const rect = avatarRef.current.getBoundingClientRect()
      const spaceAbove = rect.top
      const spaceBelow = window.innerHeight - rect.bottom
      setCardPosition(spaceAbove > 150 ? 'above' : 'below')
    }

    timeoutRef.current = setTimeout(() => {
      setShowCard(true)
    }, 200)
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setShowCard(false)
  }

  const handleClick = () => {
    if (!isMobile) return

    // Calculate position for mobile
    if (avatarRef.current) {
      const rect = avatarRef.current.getBoundingClientRect()
      const spaceAbove = rect.top
      setCardPosition(spaceAbove > 150 ? 'above' : 'below')
    }

    setShowCard(!showCard)
  }

  // Close on outside click for mobile
  const handleOutsideClick = (e: React.MouseEvent) => {
    if (isMobile && showCard) {
      e.stopPropagation()
      setShowCard(false)
    }
  }

  return (
    <div
      ref={avatarRef}
      className={cn('relative inline-block', className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Avatar */}
      <div
        className={cn(
          'rounded-full overflow-hidden ring-2 ring-white/10 cursor-pointer transition-all',
          'hover:ring-[--arcane-purple]/50 hover:scale-105',
          sizeClasses[size]
        )}
      >
        {member.image_url ? (
          <Image
            src={member.image_url}
            alt={member.name}
            width={48}
            height={48}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={cn(
            'w-full h-full flex items-center justify-center font-medium',
            textSizeClasses[size],
            getAvatarColor(member.name)
          )}>
            {getInitials(member.name)}
          </div>
        )}
      </div>

      {/* Name label (optional) */}
      {showName && (
        <span className="ml-2 text-sm text-[--text-secondary]">
          {member.name}
        </span>
      )}

      {/* Hover/Tap Info Card */}
      {showCard && (
        <>
          {/* Backdrop for mobile */}
          {isMobile && (
            <div
              className="fixed inset-0 z-40"
              onClick={handleOutsideClick}
            />
          )}

          <div
            className={cn(
              'absolute z-50 w-48 p-3 rounded-lg',
              'bg-[--bg-elevated] border border-white/10 shadow-xl',
              'animate-in fade-in-0 zoom-in-95 duration-150',
              cardPosition === 'above'
                ? 'bottom-full mb-2 left-1/2 -translate-x-1/2'
                : 'top-full mt-2 left-1/2 -translate-x-1/2'
            )}
          >
            {/* Arrow */}
            <div
              className={cn(
                'absolute left-1/2 -translate-x-1/2 w-3 h-3 rotate-45',
                'bg-[--bg-elevated] border-white/10',
                cardPosition === 'above'
                  ? 'bottom-[-6px] border-r border-b'
                  : 'top-[-6px] border-l border-t'
              )}
            />

            {/* Content */}
            <div className="flex items-start gap-3">
              {/* Avatar in card */}
              <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-white/10 flex-shrink-0">
                {member.image_url ? (
                  <Image
                    src={member.image_url}
                    alt={member.name}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className={cn(
                    'w-full h-full flex items-center justify-center font-medium text-sm',
                    getAvatarColor(member.name)
                  )}>
                    {getInitials(member.name)}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[--text-primary] truncate">
                  {member.name}
                </p>
                {(member.race || member.class) && (
                  <p className="text-xs text-[--text-tertiary] truncate">
                    {[member.race, member.class].filter(Boolean).join(' ')}
                  </p>
                )}
                {member.relationship_type && member.relationship_type !== 'party_member' && (
                  <p className="text-xs text-[--arcane-purple] capitalize mt-0.5">
                    {member.relationship_type.replace(/_/g, ' ')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Stacked avatars component for showing multiple party members
interface PartyMemberAvatarStackProps {
  members: PartyMember[]
  max?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function PartyMemberAvatarStack({
  members,
  max = 6,
  size = 'sm',
  className
}: PartyMemberAvatarStackProps) {
  const displayMembers = members.slice(0, max)
  const remaining = members.length - max

  if (members.length === 0) return null

  return (
    <div className={cn('flex items-center', className)}>
      <div className="flex -space-x-2">
        {displayMembers.map((member) => (
          <PartyMemberAvatar
            key={member.id}
            member={member}
            size={size}
          />
        ))}
        {remaining > 0 && (
          <div
            className={cn(
              'rounded-full flex items-center justify-center',
              'bg-[--bg-elevated] border-2 border-[--bg-surface] text-[--text-tertiary]',
              sizeClasses[size],
              textSizeClasses[size]
            )}
          >
            +{remaining}
          </div>
        )}
      </div>
    </div>
  )
}

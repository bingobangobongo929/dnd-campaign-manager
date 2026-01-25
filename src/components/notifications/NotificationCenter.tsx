'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Bell,
  Sparkles,
  Mail,
  Calendar,
  Check,
  X,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { cn, getInitials, formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Campaign, Character } from '@/types/database'

interface ClaimableCharacter {
  character: Character
  campaign: Campaign
}

interface PendingInvite {
  id: string
  campaign: {
    id: string
    name: string
    image_url: string | null
  }
  role: string
  invited_at: string
  invite_token: string
}

interface NotificationCenterProps {
  userId: string
}

export function NotificationCenter({ userId }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [claimableCharacters, setClaimableCharacters] = useState<ClaimableCharacter[]>([])
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)

  const totalCount = claimableCharacters.length + pendingInvites.length

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Load notifications when opened
  useEffect(() => {
    if (isOpen) {
      loadNotifications()
    }
  }, [isOpen, userId])

  const loadNotifications = async () => {
    setLoading(true)
    const supabase = createClient()

    try {
      // Get user info
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get joined campaigns to find claimable characters
      const { data: memberships } = await supabase
        .from('campaign_members')
        .select(`
          id,
          character_id,
          vault_character_id,
          campaign:campaigns(id, name, image_url)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .not('character_id', 'is', null)
        .is('vault_character_id', null) // Not yet claimed

      if (memberships) {
        const claimable: ClaimableCharacter[] = []

        for (const membership of memberships) {
          if (membership.character_id && membership.campaign) {
            // Get the character details
            const { data: character } = await supabase
              .from('characters')
              .select('*')
              .eq('id', membership.character_id)
              .single()

            if (character) {
              // Check if designated for this user
              const isDesignated =
                character.controlled_by_user_id === user.id ||
                (character.controlled_by_email?.toLowerCase() === user.email?.toLowerCase())

              if (isDesignated && membership.campaign) {
                // membership.campaign is the joined campaign object (cast through unknown due to Supabase type inference)
                const campaignData = membership.campaign as unknown as { id: string; name: string; image_url: string | null }
                claimable.push({
                  character,
                  campaign: campaignData as unknown as Campaign,
                })
              }
            }
          }
        }

        setClaimableCharacters(claimable)
      }

      // Get pending invites
      const { data: invites } = await supabase
        .from('campaign_members')
        .select(`
          id,
          role,
          invited_at,
          invite_token,
          campaign:campaigns(id, name, image_url)
        `)
        .eq('email', user.email?.toLowerCase())
        .eq('status', 'pending')
        .not('invite_token', 'is', null)

      if (invites) {
        setPendingInvites(
          invites
            .filter(i => i.campaign)
            .map(i => {
              const campaignData = i.campaign as unknown as { id: string; name: string; image_url: string | null }
              return {
                id: i.id,
                campaign: campaignData,
                role: i.role,
                invited_at: i.invited_at || '',
                invite_token: i.invite_token || '',
              }
            })
        )
      }
    } catch (error) {
      console.error('Failed to load notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative p-2 rounded-lg transition-colors",
          isOpen ? "bg-purple-500/10 text-purple-400" : "text-gray-400 hover:text-white hover:bg-white/[0.05]"
        )}
      >
        <Bell className="w-5 h-5" />
        {totalCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-purple-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {totalCount > 9 ? '9+' : totalCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-[#12121a] border border-[--border] rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[--border]">
            <h3 className="font-medium text-white">Notifications</h3>
            {totalCount > 0 && (
              <button className="text-xs text-gray-400 hover:text-white transition-colors">
                Mark all read
              </button>
            )}
          </div>

          {/* Content */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
              </div>
            ) : totalCount === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No new notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-[--border]">
                {/* Claimable Characters */}
                {claimableCharacters.map(({ character, campaign }) => (
                  <Link
                    key={character.id}
                    href={`/campaigns/${campaign.id}/dashboard`}
                    onClick={() => setIsOpen(false)}
                    className="flex items-start gap-3 p-4 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">
                        You can claim <span className="font-medium">{character.name}</span> to your vault
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{campaign.name}</p>
                      <button className="mt-2 text-xs text-purple-400 font-medium hover:text-purple-300 transition-colors">
                        Claim Now
                      </button>
                    </div>
                  </Link>
                ))}

                {/* Pending Invites */}
                {pendingInvites.map((invite) => (
                  <div key={invite.id} className="p-4 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-5 h-5 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white">
                          You're invited to join <span className="font-medium">{invite.campaign.name}</span>
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {invite.invited_at && `Invited ${formatDate(invite.invited_at)}`}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Link
                            href={`/invite/${invite.invite_token}`}
                            onClick={() => setIsOpen(false)}
                            className="text-xs text-purple-400 font-medium hover:text-purple-300 transition-colors"
                          >
                            View Invite
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {totalCount > 0 && (
            <div className="px-4 py-3 border-t border-[--border] text-center">
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className="text-sm text-gray-400 hover:text-white transition-colors inline-flex items-center gap-1"
              >
                View All Notifications
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Check, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface PartyMember {
  id: string
  name: string
  image_url?: string | null
  class?: string | null
  race?: string | null
}

interface PartyMemberSelectorProps {
  // For vault: characterId to get party members from relationships
  characterId?: string
  // For campaigns: campaignId to get player characters
  campaignId?: string
  // Selected member IDs
  selectedIds: string[]
  // Callback when selection changes
  onChange: (selectedIds: string[]) => void
  // Optional label
  label?: string
  // Optional class name
  className?: string
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

export function PartyMemberSelector({
  characterId,
  campaignId,
  selectedIds,
  onChange,
  label = 'Party Members Present',
  className
}: PartyMemberSelectorProps) {
  const [members, setMembers] = useState<PartyMember[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadMembers()
  }, [characterId, campaignId])

  const loadMembers = async () => {
    setLoading(true)

    try {
      if (characterId) {
        // Load party members from vault character relationships
        // Filter: is_party_member = true AND is_companion = false
        const { data, error } = await supabase
          .from('vault_character_relationships')
          .select('id, related_name, related_image_url')
          .eq('character_id', characterId)
          .eq('is_party_member', true)
          .eq('is_companion', false)
          .order('display_order', { ascending: true })

        if (error) throw error

        setMembers(
          (data || []).map(r => ({
            id: r.id,
            name: r.related_name || 'Unknown',
            image_url: r.related_image_url,
          }))
        )
      } else if (campaignId) {
        // Load player characters from campaign
        // Filter: type = 'pc'
        const { data, error } = await supabase
          .from('characters')
          .select('id, name, image_url, class, race')
          .eq('campaign_id', campaignId)
          .eq('type', 'pc')
          .order('name', { ascending: true })

        if (error) throw error

        setMembers(
          (data || []).map(c => ({
            id: c.id,
            name: c.name,
            image_url: c.image_url,
            class: c.class,
            race: c.race,
          }))
        )
      }
    } catch (err) {
      console.error('Error loading party members:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleMember = (memberId: string) => {
    if (selectedIds.includes(memberId)) {
      onChange(selectedIds.filter(id => id !== memberId))
    } else {
      onChange([...selectedIds, memberId])
    }
  }

  const selectAll = () => {
    onChange(members.map(m => m.id))
  }

  const clearAll = () => {
    onChange([])
  }

  // Don't render if no party members available
  if (!loading && members.length === 0) {
    return null
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[--text-tertiary]" />
          <span className="text-sm font-medium text-[--text-secondary]">
            {label}
          </span>
          {selectedIds.length > 0 && (
            <span className="text-xs text-[--arcane-purple] bg-[--arcane-purple]/10 px-2 py-0.5 rounded-full">
              {selectedIds.length} selected
            </span>
          )}
        </div>

        {members.length > 1 && (
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={selectAll}
              className="text-[--text-tertiary] hover:text-[--arcane-purple] transition-colors"
            >
              All
            </button>
            <span className="text-[--text-tertiary]">/</span>
            <button
              type="button"
              onClick={clearAll}
              className="text-[--text-tertiary] hover:text-[--arcane-purple] transition-colors"
            >
              None
            </button>
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex gap-2">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="w-10 h-10 rounded-full bg-white/5 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Members grid */}
      {!loading && (
        <div className="flex flex-wrap gap-2">
          {members.map(member => {
            const isSelected = selectedIds.includes(member.id)

            return (
              <button
                key={member.id}
                type="button"
                onClick={() => toggleMember(member.id)}
                className={cn(
                  'relative flex items-center gap-2 px-3 py-2 rounded-lg transition-all',
                  'border',
                  isSelected
                    ? 'bg-[--arcane-purple]/10 border-[--arcane-purple]/50'
                    : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/10'
                )}
              >
                {/* Avatar */}
                <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                  {member.image_url ? (
                    <Image
                      src={member.image_url}
                      alt={member.name}
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className={cn(
                      'w-full h-full flex items-center justify-center text-xs font-medium',
                      getAvatarColor(member.name)
                    )}>
                      {getInitials(member.name)}
                    </div>
                  )}

                  {/* Checkmark overlay */}
                  {isSelected && (
                    <div className="absolute inset-0 bg-[--arcane-purple]/60 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>

                {/* Name */}
                <span className={cn(
                  'text-sm truncate max-w-[100px]',
                  isSelected ? 'text-[--arcane-purple]' : 'text-[--text-secondary]'
                )}>
                  {member.name}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

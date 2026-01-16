'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit3,
  Brain,
  Users,
  ScrollText,
  Image,
  Upload,
  ArrowLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui'
import { useState, useEffect } from 'react'
import { useAppStore } from '@/store'
import { createClient } from '@/lib/supabase/client'
import type { VaultCharacter } from '@/types/database'

interface VaultSidebarProps {
  characterId?: string
}

export function VaultSidebar({ characterId }: VaultSidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const { aiEnabled } = useAppStore()
  const [character, setCharacter] = useState<VaultCharacter | null>(null)
  const supabase = createClient()

  // Load character data when characterId is provided
  useEffect(() => {
    if (!characterId) {
      setCharacter(null)
      return
    }

    const loadCharacter = async () => {
      const { data } = await supabase
        .from('vault_characters')
        .select('id, name, race, class, level, image_url, status, status_color')
        .eq('id', characterId)
        .single()

      if (data) {
        setCharacter(data as VaultCharacter)
      }
    }

    loadCharacter()
  }, [characterId, supabase])

  // Character-specific navigation
  const characterLinks = characterId
    ? [
        { href: `/vault/${characterId}/view`, label: 'View', icon: Eye },
        { href: `/vault/${characterId}`, label: 'Edit', icon: Edit3, exact: true },
        ...(aiEnabled ? [{ href: `/vault/${characterId}/intelligence`, label: 'Intelligence', icon: Brain }] : []),
        { href: `/vault/${characterId}/relationships`, label: 'Relationships', icon: Users },
        { href: `/vault/${characterId}/sessions`, label: 'Sessions', icon: ScrollText },
        { href: `/vault/${characterId}/gallery`, label: 'Gallery', icon: Image },
      ]
    : []

  // Global vault navigation
  const globalLinks = [
    { href: '/vault', label: 'All Characters', icon: BookOpen, exact: true },
    { href: '/vault/import', label: 'Import', icon: Upload },
  ]

  const NavLink = ({
    href,
    label,
    icon: Icon,
    exact = false
  }: {
    href: string
    label: string
    icon: typeof Eye
    exact?: boolean
  }) => {
    const isActive = exact ? pathname === href : pathname.startsWith(href)

    return (
      <Link
        href={href}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          isActive
            ? 'bg-[--arcane-purple]/10 text-[--arcane-purple]'
            : 'text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-hover]'
        )}
      >
        <Icon className="h-5 w-5 flex-shrink-0" />
        {!collapsed && <span>{label}</span>}
      </Link>
    )
  }

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-[--bg-surface] border-r border-[--border] transition-all duration-200',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-[--border]">
        {!collapsed && (
          <Link href="/vault" className="font-semibold text-[--text-primary] flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[--arcane-purple]" />
            Character Vault
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {/* Character info and links when viewing a character */}
        {characterId && character && (
          <>
            {/* Character avatar and info */}
            <div className={cn(
              'mb-4 rounded-xl overflow-hidden',
              collapsed ? 'px-1' : 'p-3',
              'bg-white/[0.02] border border-white/[0.06]'
            )}>
              {/* Avatar */}
              <div className={cn(
                'mx-auto rounded-xl overflow-hidden bg-[--bg-elevated] flex items-center justify-center',
                collapsed ? 'w-10 h-10' : 'w-24 h-24 mb-3'
              )}>
                {character.image_url ? (
                  <img
                    src={character.image_url}
                    alt={character.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className={cn(
                    'font-bold text-[--text-secondary]',
                    collapsed ? 'text-sm' : 'text-2xl'
                  )}>
                    {character.name?.charAt(0) || '?'}
                  </span>
                )}
              </div>

              {/* Name and details */}
              {!collapsed && (
                <div className="text-center">
                  <h3 className="font-semibold text-[--text-primary] truncate">
                    {character.name}
                  </h3>
                  {(character.race || character.class) && (
                    <p className="text-xs text-[--text-secondary] truncate">
                      {[character.race, character.class, character.level ? `Lvl ${character.level}` : null]
                        .filter(Boolean)
                        .join(' • ')}
                    </p>
                  )}
                  {character.status && (
                    <span
                      className="inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-medium"
                      style={{
                        backgroundColor: `${character.status_color || '#6b7280'}20`,
                        color: character.status_color || '#6b7280',
                      }}
                    >
                      {character.status}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Character navigation */}
            {!collapsed && (
              <div className="px-3 py-2 text-xs font-semibold text-[--text-tertiary] uppercase tracking-wider">
                Character
              </div>
            )}
            {characterLinks.map((link) => (
              <NavLink key={link.href} {...link} />
            ))}

            <div className="my-4 border-t border-[--border]" />
          </>
        )}

        {/* Global vault links */}
        {!collapsed && (
          <div className="px-3 py-2 text-xs font-semibold text-[--text-tertiary] uppercase tracking-wider">
            Vault
          </div>
        )}
        {globalLinks.map((link) => (
          <NavLink key={link.href} {...link} />
        ))}
      </nav>

      {/* Back to character link when in sub-page */}
      {characterId && !collapsed && (
        <div className="p-3 border-t border-[--border]">
          <Link
            href={`/vault/${characterId}/view`}
            className="flex items-center gap-2 px-3 py-2 text-sm text-[--text-secondary] hover:text-[--text-primary] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Character
          </Link>
        </div>
      )}
    </aside>
  )
}

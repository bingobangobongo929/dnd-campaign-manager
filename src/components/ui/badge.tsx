'use client'

import { cn } from '@/lib/utils'
import {
  Sword,
  Shield,
  Heart,
  Skull,
  Users,
  Crown,
  Star,
  Flame,
  Zap,
  Eye,
  EyeOff,
  BookOpen,
  Scroll,
  Key,
  Gem,
  Coins,
  CircleHelp,
  Target,
  Handshake,
  Swords,
  HeartCrack,
  UserCheck,
  UserX,
  GraduationCap,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

// Icon mapping for tags
const TAG_ICONS: Record<string, LucideIcon> = {
  // Relationships
  ally: Handshake,
  friend: Handshake,
  enemy: Swords,
  rival: Target,
  romantic: Heart,
  love: Heart,
  family: Users,
  mentor: GraduationCap,
  teacher: GraduationCap,
  student: BookOpen,

  // Status
  dead: Skull,
  deceased: Skull,
  missing: EyeOff,
  suspicious: Eye,
  secret: EyeOff,
  quest: Scroll,
  important: Star,

  // Combat/Class
  warrior: Sword,
  fighter: Sword,
  tank: Shield,
  defender: Shield,
  healer: Heart,
  mage: Sparkles,
  wizard: Sparkles,
  rogue: Key,
  thief: Key,

  // Social
  noble: Crown,
  royal: Crown,
  merchant: Coins,
  wealthy: Gem,

  // Magic
  magic: Zap,
  arcane: Zap,
  fire: Flame,
  flame: Flame,

  // Misc
  unknown: CircleHelp,
  trusted: UserCheck,
  untrusted: UserX,
  heartbroken: HeartCrack,
}

// Get icon component from tag name
function getTagIcon(tagName: string, iconProp?: string): LucideIcon | null {
  // If explicit icon prop provided
  if (iconProp && TAG_ICONS[iconProp.toLowerCase()]) {
    return TAG_ICONS[iconProp.toLowerCase()]
  }

  // Try to match tag name
  const lowerName = tagName.toLowerCase()

  // Direct match
  if (TAG_ICONS[lowerName]) {
    return TAG_ICONS[lowerName]
  }

  // Partial match
  for (const [key, icon] of Object.entries(TAG_ICONS)) {
    if (lowerName.includes(key) || key.includes(lowerName)) {
      return icon
    }
  }

  return null
}

interface BadgeProps {
  children: React.ReactNode
  color?: string
  icon?: React.ReactNode
  onClick?: () => void
  onRemove?: () => void
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Badge({
  children,
  color = '#8B5CF6',
  icon,
  onClick,
  onRemove,
  size = 'md',
  className,
}: BadgeProps) {
  const sizes = {
    sm: 'h-6 text-xs px-2 gap-1',
    md: 'h-7 text-sm px-2.5 gap-1.5',
    lg: 'h-8 text-sm px-3 gap-2',
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-4 h-4',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium transition-colors',
        sizes[size],
        onClick && 'cursor-pointer hover:opacity-80',
        className
      )}
      style={{
        backgroundColor: `${color}20`,
        color: color,
      }}
      onClick={onClick}
    >
      {icon && <span className={cn('flex-shrink-0', iconSizes[size])}>{icon}</span>}
      <span className="truncate">{children}</span>
      {onRemove && (
        <button
          type="button"
          className="ml-0.5 -mr-0.5 h-4 w-4 flex items-center justify-center rounded-full hover:bg-black/10 transition-colors"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
        >
          <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
            <path d="M4.28 3.22a.75.75 0 00-1.06 1.06L4.94 6 3.22 7.72a.75.75 0 101.06 1.06L6 7.06l1.72 1.72a.75.75 0 101.06-1.06L7.06 6l1.72-1.72a.75.75 0 00-1.06-1.06L6 4.94 4.28 3.22z" />
          </svg>
        </button>
      )}
    </span>
  )
}

// Tag badge specifically for Discord-style character tags
interface TagBadgeProps {
  name: string
  color: string
  icon?: string // Icon name (e.g., "sword", "heart") or explicit React node
  relatedCharacter?: string
  onClick?: () => void
  onRemove?: () => void
  size?: 'sm' | 'md' | 'lg'
  uppercase?: boolean
}

export function TagBadge({
  name,
  color,
  icon,
  relatedCharacter,
  onClick,
  onRemove,
  size = 'md',
  uppercase = true, // Default to uppercase for tags
}: TagBadgeProps) {
  // Get icon component
  const IconComponent = getTagIcon(name, icon)
  const iconSize = size === 'sm' ? 12 : size === 'lg' ? 16 : 14

  // Format the display name
  const displayName = uppercase ? name.toUpperCase() : name

  return (
    <Badge
      color={color}
      icon={IconComponent ? <IconComponent size={iconSize} /> : null}
      onClick={onClick}
      onRemove={onRemove}
      size={size}
    >
      {relatedCharacter ? `${displayName}: ${relatedCharacter}` : displayName}
    </Badge>
  )
}

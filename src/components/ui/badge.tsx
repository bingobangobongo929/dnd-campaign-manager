'use client'

import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  color?: string
  icon?: React.ReactNode
  onClick?: () => void
  onRemove?: () => void
  size?: 'sm' | 'md'
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
    sm: 'h-5 text-xs px-1.5 gap-1',
    md: 'h-6 text-sm px-2 gap-1.5',
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
      {icon && <span className="flex-shrink-0">{icon}</span>}
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
  icon?: React.ReactNode
  relatedCharacter?: string
  onClick?: () => void
  onRemove?: () => void
}

export function TagBadge({
  name,
  color,
  icon,
  relatedCharacter,
  onClick,
  onRemove,
}: TagBadgeProps) {
  return (
    <Badge color={color} icon={icon} onClick={onClick} onRemove={onRemove}>
      {relatedCharacter ? `${name}: ${relatedCharacter}` : name}
    </Badge>
  )
}

'use client'

import { cn, getInitials } from '@/lib/utils'
import Image from 'next/image'

interface AvatarProps {
  src?: string | null
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const sizes = {
    xs: 'h-6 w-6 text-2xs',
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-16 w-16 text-lg',
  }

  if (src) {
    return (
      <div className={cn('relative rounded-lg overflow-hidden flex-shrink-0', sizes[size], className)}>
        <Image
          src={src}
          alt={name}
          fill
          className="object-cover"
        />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-lg bg-[--arcane-purple]/20 text-[--arcane-purple] font-medium flex-shrink-0',
        sizes[size],
        className
      )}
    >
      {getInitials(name)}
    </div>
  )
}

'use client'

import { cn } from '@/lib/utils'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * Consistent loading spinner used throughout the app
 * Uses the app's purple brand color
 */
export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-5 h-5 border',
    md: 'w-8 h-8 border-2',
    lg: 'w-10 h-10 border-2',
  }

  return (
    <div
      className={cn(
        'rounded-full border-[--arcane-purple] border-t-transparent animate-spin',
        sizeClasses[size],
        className
      )}
    />
  )
}

/**
 * Full page loading spinner
 */
export function LoadingSpinner({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <Spinner size="lg" />
      {message && <p className="text-sm text-gray-500">{message}</p>}
    </div>
  )
}

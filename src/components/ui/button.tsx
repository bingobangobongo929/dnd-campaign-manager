'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-150 focus-ring rounded-lg disabled:opacity-50 disabled:cursor-not-allowed'

    const variants = {
      primary: 'bg-[--arcane-purple] text-white hover:bg-[--arcane-purple]/90 active:bg-[--arcane-purple]/80',
      secondary: 'bg-[--bg-surface] text-[--text-primary] border border-[--border] hover:bg-[--bg-hover] active:bg-[--bg-elevated]',
      ghost: 'text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-hover] active:bg-[--bg-elevated]',
      danger: 'bg-[--arcane-ember] text-white hover:bg-[--arcane-ember]/90 active:bg-[--arcane-ember]/80',
      outline: 'border border-[--border] text-[--text-primary] hover:bg-[--bg-hover] active:bg-[--bg-elevated]',
    }

    const sizes = {
      sm: 'h-8 px-3 text-sm gap-1.5',
      md: 'h-10 px-4 text-sm gap-2',
      lg: 'h-12 px-6 text-base gap-2',
      icon: 'h-10 w-10',
    }

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 spinner" />}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }

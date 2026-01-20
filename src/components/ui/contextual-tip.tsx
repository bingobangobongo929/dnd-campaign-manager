'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Lightbulb, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSupabase, useUser } from '@/hooks'

interface ContextualTipProps {
  /** Unique identifier for this tip - used to track dismissal */
  tipId: string
  /** The content of the tip */
  content: string
  /** Optional title */
  title?: string
  /** Position relative to the anchor element */
  position?: 'top' | 'bottom' | 'left' | 'right'
  /** Whether to show a "Learn more" action */
  learnMoreHref?: string
  /** Additional CSS classes */
  className?: string
  /** Children (the element to attach the tip to) */
  children: React.ReactNode
}

interface TipState {
  showTips: boolean
  dismissedTips: string[]
}

// Global tip state store (simple alternative to context for this use case)
let globalTipState: TipState = {
  showTips: true,
  dismissedTips: [],
}
const tipStateListeners = new Set<() => void>()

function notifyTipStateListeners() {
  tipStateListeners.forEach(listener => listener())
}

function useTipState(): TipState {
  const [state, setState] = useState(globalTipState)

  useEffect(() => {
    const listener = () => setState({ ...globalTipState })
    tipStateListeners.add(listener)
    return () => { tipStateListeners.delete(listener) }
  }, [])

  return state
}

export function ContextualTip({
  tipId,
  content,
  title,
  position = 'bottom',
  learnMoreHref,
  className,
  children,
}: ContextualTipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [hasLoadedState, setHasLoadedState] = useState(false)
  const supabase = useSupabase()
  const { user } = useUser()
  const tipState = useTipState()

  // Load tip state from user settings
  useEffect(() => {
    const loadTipState = async () => {
      if (!user) return

      try {
        const { data } = await supabase
          .from('user_settings')
          .select('show_tips, tips_dismissed')
          .eq('user_id', user.id)
          .single()

        if (data) {
          globalTipState = {
            showTips: data.show_tips !== false,
            dismissedTips: (data.tips_dismissed as string[]) || [],
          }
          notifyTipStateListeners()
          setIsDismissed(globalTipState.dismissedTips.includes(tipId))
        }
      } catch {
        // Columns might not exist yet
      }
      setHasLoadedState(true)
    }

    loadTipState()
  }, [user, supabase, tipId])

  // Update local dismissed state when global state changes
  useEffect(() => {
    setIsDismissed(tipState.dismissedTips.includes(tipId))
  }, [tipState, tipId])

  // Show tip after a short delay for visibility
  useEffect(() => {
    if (!hasLoadedState || isDismissed || !tipState.showTips) return

    const timer = setTimeout(() => setIsVisible(true), 500)
    return () => clearTimeout(timer)
  }, [hasLoadedState, isDismissed, tipState.showTips])

  const handleDismiss = useCallback(async () => {
    setIsVisible(false)
    setIsDismissed(true)

    if (!user) return

    // Update local state immediately
    const newDismissed = [...globalTipState.dismissedTips, tipId]
    globalTipState.dismissedTips = newDismissed
    notifyTipStateListeners()

    // Persist to database
    try {
      await supabase
        .from('user_settings')
        .update({ tips_dismissed: newDismissed })
        .eq('user_id', user.id)
    } catch {
      // Ignore errors
    }
  }, [user, supabase, tipId])

  // Don't render if tips are disabled or this tip is dismissed
  if (!tipState.showTips || isDismissed || !hasLoadedState) {
    return <>{children}</>
  }

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-purple-500/30',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-purple-500/30',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-purple-500/30',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-purple-500/30',
  }

  return (
    <div className={cn('relative inline-block', className)}>
      {children}

      {/* Tip bubble */}
      {isVisible && (
        <div
          className={cn(
            'absolute z-50 w-64 p-3 rounded-xl',
            'bg-[#1a1a2e] border border-purple-500/30 shadow-xl shadow-purple-500/10',
            'animate-in fade-in-0 zoom-in-95 duration-200',
            positionClasses[position]
          )}
        >
          {/* Arrow */}
          <div
            className={cn(
              'absolute w-0 h-0 border-[6px]',
              arrowClasses[position]
            )}
          />

          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
                {title || 'Tip'}
              </span>
            </div>
            <button
              onClick={handleDismiss}
              className="p-0.5 text-gray-500 hover:text-white transition-colors rounded"
              aria-label="Dismiss tip"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Content */}
          <p className="text-sm text-gray-300 leading-relaxed">
            {content}
          </p>

          {/* Learn more link */}
          {learnMoreHref && (
            <a
              href={learnMoreHref}
              className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors"
            >
              Learn more
              <ChevronRight className="w-3 h-3" />
            </a>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Hook to reset all dismissed tips (for testing or settings)
 */
export function useResetTips() {
  const supabase = useSupabase()
  const { user } = useUser()

  return useCallback(async () => {
    if (!user) return

    globalTipState.dismissedTips = []
    notifyTipStateListeners()

    try {
      await supabase
        .from('user_settings')
        .update({ tips_dismissed: [] })
        .eq('user_id', user.id)
    } catch {
      // Ignore errors
    }
  }, [user, supabase])
}

/**
 * Hook to toggle tips on/off
 */
export function useToggleTips() {
  const supabase = useSupabase()
  const { user } = useUser()

  return useCallback(async (enabled: boolean) => {
    if (!user) return

    globalTipState.showTips = enabled
    notifyTipStateListeners()

    try {
      await supabase
        .from('user_settings')
        .update({ show_tips: enabled })
        .eq('user_id', user.id)
    } catch {
      // Ignore errors
    }
  }, [user, supabase])
}

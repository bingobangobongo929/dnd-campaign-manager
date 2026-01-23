'use client'

import { useState, useEffect } from 'react'
import { X, Lightbulb, Info, Sparkles, ArrowRight, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGuidanceTip, type GuidanceTipId } from '@/hooks/useGuidance'

interface GuidanceTipProps {
  tipId: GuidanceTipId
  title: string
  description: string
  variant?: 'tooltip' | 'banner' | 'inline' | 'floating'
  action?: {
    label: string
    onClick: () => void
  }
  showOnce?: boolean // Only show first time
  className?: string
  children?: React.ReactNode
}

export function GuidanceTip({
  tipId,
  title,
  description,
  variant = 'inline',
  action,
  showOnce = false,
  className,
  children,
}: GuidanceTipProps) {
  const { shouldShow, isFirstTime, markSeen, dismiss, isLoaded } = useGuidanceTip(tipId)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isLoaded) {
      if (showOnce) {
        setIsVisible(isFirstTime)
        if (isFirstTime) {
          markSeen()
        }
      } else {
        setIsVisible(shouldShow)
      }
    }
  }, [isLoaded, shouldShow, isFirstTime, showOnce, markSeen])

  if (!isVisible) {
    return children || null
  }

  const handleDismiss = () => {
    dismiss()
    setIsVisible(false)
  }

  const handleAction = () => {
    if (action?.onClick) {
      action.onClick()
    }
    dismiss()
    setIsVisible(false)
  }

  if (variant === 'tooltip') {
    return (
      <>
        {children}
        <TooltipContent
          title={title}
          description={description}
          onDismiss={handleDismiss}
          action={action}
          onAction={handleAction}
          className={className}
        />
      </>
    )
  }

  if (variant === 'banner') {
    return (
      <>
        <BannerContent
          title={title}
          description={description}
          onDismiss={handleDismiss}
          action={action}
          onAction={handleAction}
          className={className}
        />
        {children}
      </>
    )
  }

  if (variant === 'floating') {
    return (
      <>
        {children}
        <FloatingContent
          title={title}
          description={description}
          onDismiss={handleDismiss}
          action={action}
          onAction={handleAction}
          className={className}
        />
      </>
    )
  }

  // Default: inline
  return (
    <InlineContent
      title={title}
      description={description}
      onDismiss={handleDismiss}
      action={action}
      onAction={handleAction}
      className={className}
    />
  )
}

// Tooltip style guidance
function TooltipContent({
  title,
  description,
  onDismiss,
  action,
  onAction,
  className,
}: {
  title: string
  description: string
  onDismiss: () => void
  action?: { label: string; onClick: () => void }
  onAction?: () => void
  className?: string
}) {
  return (
    <div className={cn(
      "absolute z-50 w-72 p-4 bg-[#1a1a24] border border-purple-500/30 rounded-xl shadow-xl",
      "animate-in fade-in slide-in-from-bottom-2 duration-200",
      className
    )}>
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 p-1 text-gray-500 hover:text-white transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className="p-2 bg-purple-500/20 rounded-lg shrink-0">
          <Lightbulb className="w-4 h-4 text-purple-400" />
        </div>
        <div>
          <h4 className="text-sm font-medium text-white mb-1">{title}</h4>
          <p className="text-xs text-gray-400 leading-relaxed">{description}</p>
          {action && (
            <button
              onClick={onAction}
              className="mt-2 text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
            >
              {action.label}
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Banner style guidance
function BannerContent({
  title,
  description,
  onDismiss,
  action,
  onAction,
  className,
}: {
  title: string
  description: string
  onDismiss: () => void
  action?: { label: string; onClick: () => void }
  onAction?: () => void
  className?: string
}) {
  return (
    <div className={cn(
      "relative p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl mb-6",
      className
    )}>
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 p-1.5 text-gray-500 hover:text-white transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-4 pr-8">
        <div className="p-2.5 bg-purple-500/20 rounded-xl shrink-0">
          <Sparkles className="w-5 h-5 text-purple-400" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-medium text-white mb-1">{title}</h4>
          <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
          {action && (
            <button
              onClick={onAction}
              className="mt-3 btn btn-sm btn-primary"
            >
              {action.label}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Inline style guidance
function InlineContent({
  title,
  description,
  onDismiss,
  action,
  onAction,
  className,
}: {
  title: string
  description: string
  onDismiss: () => void
  action?: { label: string; onClick: () => void }
  onAction?: () => void
  className?: string
}) {
  return (
    <div className={cn(
      "p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg",
      className
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-300">{title}</p>
            <p className="text-xs text-gray-400 mt-1">{description}</p>
            {action && (
              <button
                onClick={onAction}
                className="mt-2 text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
              >
                {action.label}
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 text-gray-500 hover:text-white transition-colors shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// Floating style guidance (bottom corner)
function FloatingContent({
  title,
  description,
  onDismiss,
  action,
  onAction,
  className,
}: {
  title: string
  description: string
  onDismiss: () => void
  action?: { label: string; onClick: () => void }
  onAction?: () => void
  className?: string
}) {
  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-50 w-80 p-4 bg-[#1a1a24] border border-purple-500/30 rounded-xl shadow-2xl",
      "animate-in fade-in slide-in-from-bottom-4 duration-300",
      className
    )}>
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 p-1.5 text-gray-500 hover:text-white transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="p-2 bg-purple-500/20 rounded-lg shrink-0">
          <Sparkles className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h4 className="text-sm font-medium text-white mb-1">{title}</h4>
          <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
          {action && (
            <button
              onClick={onAction}
              className="mt-3 btn btn-sm btn-primary"
            >
              {action.label}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Help icon with tooltip
interface HelpTooltipProps {
  content: string
  className?: string
}

export function HelpTooltip({ content, className }: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "p-1 text-gray-500 hover:text-gray-400 transition-colors",
          className
        )}
      >
        <HelpCircle className="w-4 h-4" />
      </button>
      {isOpen && (
        <div className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-[#1a1a24] border border-white/10 rounded-lg shadow-xl">
          <p className="text-xs text-gray-300 leading-relaxed">{content}</p>
          <div className="absolute left-1/2 -translate-x-1/2 top-full -mt-1">
            <div className="border-4 border-transparent border-t-white/10" />
          </div>
        </div>
      )}
    </div>
  )
}

// Workflow prompt (appears after actions)
interface WorkflowPromptProps {
  tipId: GuidanceTipId
  message: string
  action: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function WorkflowPrompt({
  tipId,
  message,
  action,
  className,
}: WorkflowPromptProps) {
  const { shouldShow, dismiss, isLoaded } = useGuidanceTip(tipId)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isLoaded) {
      setIsVisible(shouldShow)
    }
  }, [isLoaded, shouldShow])

  if (!isVisible) return null

  const handleAction = () => {
    action.onClick()
    dismiss()
    setIsVisible(false)
  }

  const handleDismiss = () => {
    dismiss()
    setIsVisible(false)
  }

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg",
      className
    )}>
      <Sparkles className="w-4 h-4 text-green-400 shrink-0" />
      <p className="text-sm text-green-300 flex-1">{message}</p>
      <div className="flex items-center gap-2">
        <button
          onClick={handleAction}
          className="btn btn-sm btn-primary"
        >
          {action.label}
        </button>
        <button
          onClick={handleDismiss}
          className="p-1 text-gray-500 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

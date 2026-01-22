'use client'

import { useState, useEffect } from 'react'
import { MessageSquarePlus } from 'lucide-react'
import { useFeedback } from './FeedbackProvider'
import { cn } from '@/lib/utils'

interface FeedbackButtonProps {
  className?: string
}

export function FeedbackButton({ className }: FeedbackButtonProps) {
  const { openFeedback } = useFeedback()
  const [showPulse, setShowPulse] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)

  // Show pulse animation for first-time users
  useEffect(() => {
    const hasSeenFeedback = localStorage.getItem('multiloop_feedback_seen')
    if (!hasSeenFeedback) {
      setShowPulse(true)
      // Stop pulsing after 10 seconds
      const timer = setTimeout(() => setShowPulse(false), 10000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleClick = () => {
    // Mark as seen
    localStorage.setItem('multiloop_feedback_seen', 'true')
    setShowPulse(false)
    openFeedback()
  }

  return (
    <div className={cn('fixed bottom-6 right-6 z-50', className)}>
      {/* Tooltip */}
      <div
        className={cn(
          'absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap transition-opacity duration-200',
          showTooltip ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      >
        <span>Send Feedback</span>
        <span className="text-gray-400 ml-2 text-xs">Ctrl+Shift+F</span>
        {/* Arrow */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full border-4 border-transparent border-l-gray-900" />
      </div>

      {/* Button */}
      <button
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={cn(
          'relative w-12 h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center',
          showPulse && 'animate-pulse-glow'
        )}
        aria-label="Send Feedback"
      >
        <MessageSquarePlus className="w-5 h-5" />

        {/* Pulse ring effect */}
        {showPulse && (
          <span className="absolute inset-0 rounded-full animate-ping bg-purple-500 opacity-30" />
        )}
      </button>

      {/* Add pulse glow animation via style tag */}
      <style jsx>{`
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(147, 51, 234, 0.5);
          }
          50% {
            box-shadow: 0 0 20px 5px rgba(147, 51, 234, 0.3);
          }
        }
        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}

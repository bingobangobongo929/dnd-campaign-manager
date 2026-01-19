'use client'

import { useState, useRef } from 'react'
import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { hapticWarning, hapticMedium } from '@/lib/haptics'

interface MobileSwipeableProps {
  children: React.ReactNode
  onDelete?: () => void
  onEdit?: () => void
  deleteLabel?: string
  className?: string
  disabled?: boolean
}

/**
 * Swipeable list item with iOS-style delete action
 * Swipe left to reveal delete button
 */
export function MobileSwipeable({
  children,
  onDelete,
  onEdit,
  deleteLabel = 'Delete',
  className,
  disabled = false,
}: MobileSwipeableProps) {
  const [swipeX, setSwipeX] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const startX = useRef(0)
  const currentX = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const ACTION_WIDTH = 80 // Width of the delete button area
  const THRESHOLD = 40 // Minimum swipe to trigger action reveal

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return
    startX.current = e.touches[0].clientX
    currentX.current = e.touches[0].clientX
    setIsSwiping(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping || disabled) return
    currentX.current = e.touches[0].clientX
    const deltaX = currentX.current - startX.current

    // If already open, adjust from open position
    const baseX = isOpen ? -ACTION_WIDTH : 0
    let newX = baseX + deltaX

    // Clamp values
    if (newX > 0) newX = 0 // Don't allow swiping right past origin
    if (newX < -ACTION_WIDTH * 1.5) newX = -ACTION_WIDTH * 1.5 // Max left swipe

    // Add resistance when over-swiping
    if (newX < -ACTION_WIDTH) {
      const overSwipe = newX + ACTION_WIDTH
      newX = -ACTION_WIDTH + overSwipe * 0.3
    }

    setSwipeX(newX)
  }

  const handleTouchEnd = () => {
    if (!isSwiping || disabled) return
    setIsSwiping(false)

    // Determine final state based on position and velocity
    const shouldOpen = swipeX < -THRESHOLD

    if (shouldOpen && !isOpen) {
      hapticMedium()
      setSwipeX(-ACTION_WIDTH)
      setIsOpen(true)
    } else if (!shouldOpen && isOpen && swipeX > -THRESHOLD) {
      setSwipeX(0)
      setIsOpen(false)
    } else if (shouldOpen) {
      setSwipeX(-ACTION_WIDTH)
    } else {
      setSwipeX(0)
      setIsOpen(false)
    }
  }

  const handleDelete = () => {
    hapticWarning()
    setSwipeX(-ACTION_WIDTH * 2) // Slide out animation
    setTimeout(() => {
      onDelete?.()
    }, 200)
  }

  const handleContentClick = () => {
    if (isOpen) {
      setSwipeX(0)
      setIsOpen(false)
    }
  }

  return (
    <div
      ref={containerRef}
      className={cn('mobile-swipeable-container', className)}
    >
      {/* Delete action button (revealed on swipe) */}
      <div className="mobile-swipeable-actions">
        <button
          onClick={handleDelete}
          className="mobile-swipeable-delete"
          style={{ width: ACTION_WIDTH }}
        >
          <Trash2 className="w-5 h-5" />
          <span className="text-xs font-medium">{deleteLabel}</span>
        </button>
      </div>

      {/* Swipeable content */}
      <div
        className="mobile-swipeable-content"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleContentClick}
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: isSwiping ? 'none' : 'transform 300ms var(--mobile-spring)',
        }}
      >
        {children}
      </div>
    </div>
  )
}

/**
 * Swipeable card specifically styled for character lists
 */
export function MobileSwipeableCard({
  children,
  onDelete,
  className,
}: {
  children: React.ReactNode
  onDelete?: () => void
  className?: string
}) {
  return (
    <MobileSwipeable onDelete={onDelete} className={className}>
      <div className="mobile-character-card">
        {children}
      </div>
    </MobileSwipeable>
  )
}

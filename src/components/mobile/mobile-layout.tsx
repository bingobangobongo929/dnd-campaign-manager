'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { ChevronLeft, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { hapticLight, hapticMedium } from '@/lib/haptics'

interface MobileLayoutProps {
  children: React.ReactNode
  title?: string
  largeTitle?: boolean
  showBackButton?: boolean
  backHref?: string
  rightAction?: React.ReactNode
  actions?: React.ReactNode // alias for rightAction
  className?: string
}

/**
 * iOS-style mobile layout with large title navigation
 */
export function MobileLayout({
  children,
  title,
  largeTitle = true,
  showBackButton = true,
  backHref,
  rightAction,
  actions,
  className,
}: MobileLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  // Use actions as alias for rightAction
  const actionContent = rightAction || actions

  // Track scroll for title collapse animation
  useEffect(() => {
    const handleScroll = () => {
      if (contentRef.current) {
        setScrolled(contentRef.current.scrollTop > 44)
      }
    }

    const content = contentRef.current
    content?.addEventListener('scroll', handleScroll, { passive: true })
    return () => content?.removeEventListener('scroll', handleScroll)
  }, [])

  // Detect if we can go back - either via history or via explicit backHref
  const canGoBack = backHref || (typeof window !== 'undefined' && window.history.length > 1)

  const handleBack = () => {
    hapticLight()
    setIsNavigating(true)
    if (backHref) {
      router.push(backHref)
    } else {
      router.back()
    }
  }

  return (
    <div className="mobile-layout">
      {/* iOS-style Navigation Bar */}
      <header
        className={cn(
          'mobile-nav-bar',
          scrolled && 'mobile-nav-bar-scrolled'
        )}
      >
        {/* Left side - Back button */}
        <div className="mobile-nav-left">
          {showBackButton && canGoBack && (
            <button
              onClick={handleBack}
              className="mobile-back-button"
              disabled={isNavigating}
            >
              <ChevronLeft className="w-6 h-6" />
              <span className="mobile-back-text">Back</span>
            </button>
          )}
        </div>

        {/* Center - Small title (shows when scrolled) */}
        <div className={cn(
          'mobile-nav-title',
          scrolled ? 'opacity-100' : 'opacity-0'
        )}>
          {title}
        </div>

        {/* Right side - Actions */}
        <div className="mobile-nav-right">
          {actionContent}
        </div>
      </header>

      {/* Scrollable Content Area */}
      <div
        ref={contentRef}
        className={cn('mobile-content', className)}
      >
        {/* Large Title (collapses on scroll) */}
        {largeTitle && title && (
          <h1 className={cn(
            'mobile-large-title',
            scrolled && 'mobile-large-title-collapsed'
          )}>
            {title}
          </h1>
        )}

        {children}
      </div>
    </div>
  )
}

/**
 * Mobile section header
 */
export function MobileSectionHeader({
  title,
  action,
  className,
}: {
  title: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('mobile-section-header', className)}>
      <h2 className="mobile-section-title">{title}</h2>
      {action}
    </div>
  )
}

/**
 * Mobile card component with iOS styling
 */
export function MobileCard({
  children,
  onClick,
  className,
  variant = 'default',
}: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  variant?: 'default' | 'inset' | 'grouped'
}) {
  const Component = onClick ? 'button' : 'div'

  return (
    <Component
      onClick={onClick}
      className={cn(
        'mobile-card',
        variant === 'inset' && 'mobile-card-inset',
        variant === 'grouped' && 'mobile-card-grouped',
        onClick && 'mobile-card-interactive',
        className
      )}
    >
      {children}
    </Component>
  )
}

/**
 * Mobile list item with iOS styling
 */
export function MobileListItem({
  children,
  onClick,
  leading,
  trailing,
  subtitle,
  showChevron = true,
  destructive = false,
  className,
}: {
  children: React.ReactNode
  onClick?: () => void
  leading?: React.ReactNode
  trailing?: React.ReactNode
  subtitle?: string
  showChevron?: boolean
  destructive?: boolean
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'mobile-list-item',
        destructive && 'mobile-list-item-destructive',
        className
      )}
    >
      {leading && <div className="mobile-list-item-leading">{leading}</div>}
      <div className="mobile-list-item-content">
        <span className="mobile-list-item-title">{children}</span>
        {subtitle && <span className="mobile-list-item-subtitle">{subtitle}</span>}
      </div>
      {trailing && <div className="mobile-list-item-trailing">{trailing}</div>}
      {showChevron && !trailing && (
        <ChevronLeft className="w-5 h-5 text-gray-500 rotate-180" />
      )}
    </button>
  )
}

/**
 * Mobile bottom sheet with drag-to-dismiss
 */
export function MobileBottomSheet({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}) {
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const startY = useRef(0)
  const lastY = useRef(0)
  const velocity = useRef(0)
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      setDragY(0)
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY
    lastY.current = e.touches[0].clientY
    velocity.current = 0
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    const currentY = e.touches[0].clientY
    const deltaY = currentY - startY.current
    velocity.current = currentY - lastY.current
    lastY.current = currentY

    // Only allow dragging down (positive deltaY)
    if (deltaY > 0) {
      setDragY(deltaY)
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    const sheetHeight = sheetRef.current?.offsetHeight || 400

    // Close if dragged more than 30% or with high velocity
    if (dragY > sheetHeight * 0.3 || velocity.current > 10) {
      hapticLight()
      onClose()
    }
    setDragY(0)
  }

  if (!isOpen) return null

  return (
    <div
      className="mobile-bottom-sheet-backdrop"
      onClick={onClose}
      style={{ opacity: Math.max(0.3, 1 - dragY / 400) }}
    >
      <div
        ref={sheetRef}
        className="mobile-bottom-sheet"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateY(${dragY}px)`,
          transition: isDragging ? 'none' : 'transform 300ms var(--mobile-spring)',
        }}
      >
        {/* Handle bar - visual indicator for drag */}
        <div className="mobile-bottom-sheet-handle">
          <div className="mobile-bottom-sheet-handle-bar" />
        </div>

        {title && (
          <div className="mobile-bottom-sheet-header">
            <h3 className="mobile-bottom-sheet-title">{title}</h3>
          </div>
        )}

        <div className="mobile-bottom-sheet-content">
          {children}
        </div>
      </div>
    </div>
  )
}

/**
 * Mobile floating action button
 */
export function MobileFAB({
  icon,
  onClick,
  label,
  className,
}: {
  icon: React.ReactNode
  onClick: () => void
  label?: string
  className?: string
}) {
  const handleClick = () => {
    hapticMedium()
    onClick()
  }

  return (
    <button
      onClick={handleClick}
      className={cn('mobile-fab', className)}
      aria-label={label}
    >
      {icon}
    </button>
  )
}

/**
 * Mobile segmented control (iOS-style tabs)
 */
export function MobileSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  const handleChange = (newValue: T) => {
    if (newValue !== value) {
      hapticLight()
      onChange(newValue)
    }
  }

  return (
    <div className={cn('mobile-segmented-control', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => handleChange(option.value)}
          className={cn(
            'mobile-segmented-option',
            value === option.value && 'mobile-segmented-option-active'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

/**
 * Mobile search bar with iOS styling
 */
export function MobileSearchBar({
  value,
  onChange,
  placeholder = 'Search',
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div className={cn('mobile-search-bar', className)}>
      <svg
        className="mobile-search-icon"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mobile-search-input"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="mobile-search-clear"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </div>
  )
}

/**
 * Mobile pull-to-refresh indicator
 */
export function MobilePullToRefresh({
  onRefresh,
  children,
}: {
  onRefresh: () => Promise<void>
  children: React.ReactNode
}) {
  const [refreshing, setRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0 && !refreshing) {
      const distance = e.touches[0].clientY - startY.current
      if (distance > 0) {
        setPullDistance(Math.min(distance * 0.5, 80))
      }
    }
  }

  const handleTouchEnd = async () => {
    if (pullDistance > 60 && !refreshing) {
      setRefreshing(true)
      await onRefresh()
      setRefreshing(false)
    }
    setPullDistance(0)
  }

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="mobile-pull-to-refresh"
    >
      <div
        className="mobile-pull-indicator"
        style={{ height: pullDistance, opacity: pullDistance / 60 }}
      >
        {refreshing ? (
          <div className="mobile-refresh-spinner" />
        ) : (
          <ChevronLeft className="w-6 h-6 rotate-[270deg] text-gray-400" />
        )}
      </div>
      {children}
    </div>
  )
}

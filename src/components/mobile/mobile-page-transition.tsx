'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { cn } from '@/lib/utils'

interface MobilePageTransitionProps {
  children: React.ReactNode
  className?: string
}

/**
 * Page transition wrapper that animates between route changes
 * Uses iOS-style slide and fade transitions
 */
export function MobilePageTransition({ children, className }: MobilePageTransitionProps) {
  const pathname = usePathname()
  const [displayChildren, setDisplayChildren] = useState(children)
  const [transitionStage, setTransitionStage] = useState<'enter' | 'idle' | 'exit'>('idle')
  const previousPathname = useRef(pathname)

  useEffect(() => {
    if (pathname !== previousPathname.current) {
      // Start exit animation
      setTransitionStage('exit')

      // After exit, swap children and start enter
      const exitTimer = setTimeout(() => {
        setDisplayChildren(children)
        setTransitionStage('enter')
        previousPathname.current = pathname

        // Return to idle after enter animation
        const enterTimer = setTimeout(() => {
          setTransitionStage('idle')
        }, 300)

        return () => clearTimeout(enterTimer)
      }, 150)

      return () => clearTimeout(exitTimer)
    } else {
      setDisplayChildren(children)
    }
  }, [pathname, children])

  return (
    <div
      className={cn(
        'mobile-page-transition',
        transitionStage === 'exit' && 'mobile-page-exit',
        transitionStage === 'enter' && 'mobile-page-enter',
        className
      )}
    >
      {displayChildren}
    </div>
  )
}

/**
 * Simple fade transition for content areas
 */
export function MobileFadeTransition({
  children,
  show,
  className,
}: {
  children: React.ReactNode
  show: boolean
  className?: string
}) {
  const [shouldRender, setShouldRender] = useState(show)

  useEffect(() => {
    if (show) {
      setShouldRender(true)
    } else {
      const timer = setTimeout(() => setShouldRender(false), 200)
      return () => clearTimeout(timer)
    }
  }, [show])

  if (!shouldRender) return null

  return (
    <div
      className={cn(
        'transition-opacity duration-200',
        show ? 'opacity-100' : 'opacity-0',
        className
      )}
    >
      {children}
    </div>
  )
}

/**
 * Staggered list animation for items entering the view
 */
export function MobileStaggeredList({
  children,
  className,
  staggerDelay = 50,
}: {
  children: React.ReactNode[]
  className?: string
  staggerDelay?: number
}) {
  return (
    <div className={className}>
      {children.map((child, index) => (
        <div
          key={index}
          className="mobile-stagger-item"
          style={{
            animationDelay: `${index * staggerDelay}ms`,
          }}
        >
          {child}
        </div>
      ))}
    </div>
  )
}

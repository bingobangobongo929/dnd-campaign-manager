'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
  className?: string
}

export function Tooltip({
  content,
  children,
  side = 'top',
  delay = 300,
  className,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const calculatePosition = () => {
    if (!triggerRef.current) return

    const rect = triggerRef.current.getBoundingClientRect()
    const scrollX = window.scrollX
    const scrollY = window.scrollY

    let x = 0
    let y = 0

    switch (side) {
      case 'top':
        x = rect.left + scrollX + rect.width / 2
        y = rect.top + scrollY - 8
        break
      case 'bottom':
        x = rect.left + scrollX + rect.width / 2
        y = rect.bottom + scrollY + 8
        break
      case 'left':
        x = rect.left + scrollX - 8
        y = rect.top + scrollY + rect.height / 2
        break
      case 'right':
        x = rect.right + scrollX + 8
        y = rect.top + scrollY + rect.height / 2
        break
    }

    setPosition({ x, y })
  }

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      calculatePosition()
      setIsVisible(true)
    }, delay)
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  const sideStyles = {
    top: '-translate-x-1/2 -translate-y-full',
    bottom: '-translate-x-1/2',
    left: '-translate-x-full -translate-y-1/2',
    right: '-translate-y-1/2',
  }

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-flex"
      >
        {children}
      </div>

      {mounted &&
        isVisible &&
        createPortal(
          <div
            className={cn(
              'fixed z-[300] px-3 py-1.5 text-sm font-medium rounded-lg pointer-events-none',
              'animate-fade-in',
              sideStyles[side],
              className
            )}
            style={{
              left: position.x,
              top: position.y,
              backgroundColor: '#1a1a24',
              color: '#f0f0f5',
              border: '1px solid #2a2a3a',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            }}
          >
            {content}
          </div>,
          document.body
        )}
    </>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { ChevronUp } from 'lucide-react'

interface BackToTopButtonProps {
  threshold?: number
  className?: string
}

export function BackToTopButton({ threshold = 500, className = '' }: BackToTopButtonProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setShow(window.scrollY > threshold)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [threshold])

  if (!show) return null

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={`fixed bottom-24 md:bottom-[88px] right-4 md:right-6 z-50 w-12 h-12 rounded-full bg-purple-600/90 active:bg-purple-500 md:hover:bg-purple-500 text-white shadow-lg flex items-center justify-center transition-all duration-300 md:hover:scale-110 ${className}`}
      aria-label="Back to top"
    >
      <ChevronUp className="w-6 h-6" />
    </button>
  )
}

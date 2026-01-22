'use client'

import { useEffect, useState } from 'react'
import { FeedbackProvider } from '@/components/feedback'

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Show loading with proper dark background
  if (!mounted) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#0D0F12',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '2px solid #8B5CF6',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      </div>
    )
  }

  return (
    <FeedbackProvider>
      {children}
    </FeedbackProvider>
  )
}

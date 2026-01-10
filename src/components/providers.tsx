'use client'

import { useEffect, useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Load theme from localStorage or default to dark
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null
    const theme = savedTheme || 'dark'

    document.documentElement.classList.remove('dark', 'light')
    document.documentElement.classList.add(theme)
    setMounted(true)
  }, [])

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#0D0F12]">
        {/* Loading skeleton */}
      </div>
    )
  }

  return <>{children}</>
}

'use client'

import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'

interface MaintenanceData {
  maintenance_mode: boolean
  maintenance_message: string | null
}

export default function MaintenancePage() {
  const [data, setData] = useState<MaintenanceData | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Fetch maintenance info
    fetch('/api/maintenance')
      .then(res => res.json())
      .then(setData)
      .catch(() => {})
  }, [])

  // Check every 30 seconds if maintenance is over
  useEffect(() => {
    const interval = setInterval(() => {
      fetch('/api/maintenance')
        .then(res => res.json())
        .then(newData => {
          if (!newData.maintenance_mode) {
            window.location.href = '/home'
          }
        })
        .catch(() => {})
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  if (!mounted) return null

  return (
    <div className="maintenance-page">
      {/* Animated background */}
      <div className="maintenance-bg">
        <div className="maintenance-stars" />
        <div className="maintenance-fog" />
      </div>

      {/* Floating particles */}
      <div className="maintenance-particles">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="maintenance-content">
        {/* Floating Runes */}
        <div className="runes-container">
          {/* Rune 1 - Diamond */}
          <svg className="rune rune-1" viewBox="0 0 100 100" fill="none">
            <path
              d="M50 10 L90 50 L50 90 L10 50 Z"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M50 25 L75 50 L50 75 L25 50 Z"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              opacity="0.6"
            />
            <circle cx="50" cy="50" r="5" fill="currentColor" opacity="0.8" />
          </svg>

          {/* Rune 2 - Triangle with eye */}
          <svg className="rune rune-2" viewBox="0 0 100 100" fill="none">
            <path
              d="M50 15 L90 85 L10 85 Z"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
            <circle cx="50" cy="55" r="12" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <circle cx="50" cy="55" r="4" fill="currentColor" />
          </svg>

          {/* Rune 3 - Hexagon */}
          <svg className="rune rune-3" viewBox="0 0 100 100" fill="none">
            <path
              d="M50 10 L90 30 L90 70 L50 90 L10 70 L10 30 Z"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M50 30 L70 40 L70 60 L50 70 L30 60 L30 40 Z"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              opacity="0.5"
            />
            <line x1="50" y1="10" x2="50" y2="90" stroke="currentColor" strokeWidth="1" opacity="0.3" />
            <line x1="10" y1="50" x2="90" y2="50" stroke="currentColor" strokeWidth="1" opacity="0.3" />
          </svg>

          {/* Rune 4 - Circle with cross */}
          <svg className="rune rune-4" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="38" stroke="currentColor" strokeWidth="2" fill="none" />
            <circle cx="50" cy="50" r="25" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.5" />
            <line x1="50" y1="12" x2="50" y2="88" stroke="currentColor" strokeWidth="1.5" />
            <line x1="12" y1="50" x2="88" y2="50" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="50" cy="50" r="6" fill="currentColor" opacity="0.6" />
          </svg>
        </div>

        {/* Text content */}
        <div className="maintenance-text">
          <h1 className="maintenance-title">
            <span className="title-line">The Ancient Wards</span>
            <span className="title-line title-accent">Are Being Renewed</span>
          </h1>

          <div className="maintenance-divider">
            <span className="divider-rune">&#10022;</span>
            <span className="divider-line" />
            <span className="divider-rune">&#10022;</span>
          </div>

          <p className="maintenance-subtitle">
            Our scribes are weaving new enchantments into the realm. The magic will return shortly.
          </p>

          {/* Custom message if provided */}
          {data?.maintenance_message && (
            <div className="maintenance-message">
              <div className="message-scroll">
                <div className="scroll-top" />
                <div className="scroll-content">
                  <p>{data.maintenance_message}</p>
                </div>
                <div className="scroll-bottom" />
              </div>
            </div>
          )}

          <p className="maintenance-note">
            This page will refresh automatically when the realm awakens.
          </p>

          {/* Refresh button */}
          <button
            onClick={() => window.location.reload()}
            className="maintenance-refresh"
          >
            <RefreshCw className="w-4 h-4" />
            Check Again
          </button>
        </div>

        {/* Logo at bottom */}
        <div className="maintenance-logo">
          <img
            src="/icons/icon-96x96.png"
            alt="Multiloop"
            className="logo-img"
          />
          <span className="logo-text">Multiloop</span>
        </div>
      </div>
    </div>
  )
}

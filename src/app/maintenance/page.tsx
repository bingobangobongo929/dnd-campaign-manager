'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Twitter, MessageCircle, Mail, RefreshCw } from 'lucide-react'

// Discord icon component
function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  )
}

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

      {/* Main content */}
      <div className="maintenance-content">
        {/* Dragon silhouette */}
        <div className="dragon-container">
          <svg
            viewBox="0 0 400 200"
            className="dragon-silhouette"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Sleeping dragon shape */}
            <path
              className="dragon-body"
              d="M50,180
                 Q30,170 25,150
                 Q20,130 35,115
                 Q50,100 80,95
                 L100,90
                 Q120,85 140,90
                 Q180,95 220,100
                 Q280,110 320,105
                 Q350,100 370,110
                 Q385,118 380,135
                 Q375,150 355,160
                 Q330,172 290,175
                 Q240,180 180,178
                 Q120,176 80,180
                 Q60,182 50,180 Z"
              fill="currentColor"
            />
            {/* Dragon head */}
            <path
              className="dragon-head"
              d="M25,150
                 Q15,145 10,135
                 Q5,125 15,115
                 Q25,105 40,100
                 Q55,95 70,100
                 Q80,105 80,115
                 Q80,125 70,130
                 Q55,138 35,145
                 Q28,148 25,150 Z"
              fill="currentColor"
            />
            {/* Wing folded */}
            <path
              className="dragon-wing"
              d="M150,95
                 Q160,60 200,40
                 Q240,25 280,35
                 Q310,45 320,70
                 Q325,90 310,100
                 Q280,105 240,100
                 Q200,95 150,95 Z"
              fill="currentColor"
              opacity="0.7"
            />
            {/* Tail */}
            <path
              className="dragon-tail"
              d="M370,120
                 Q390,115 400,100
                 Q405,85 395,75
                 Q385,70 375,80
                 Q365,95 370,110 Z"
              fill="currentColor"
            />
            {/* Smoke/breath particles */}
            <circle className="smoke smoke-1" cx="5" cy="120" r="3" fill="currentColor" opacity="0.3" />
            <circle className="smoke smoke-2" cx="0" cy="115" r="2" fill="currentColor" opacity="0.2" />
            <circle className="smoke smoke-3" cx="8" cy="110" r="2.5" fill="currentColor" opacity="0.25" />
          </svg>

          {/* Breathing glow effect */}
          <div className="dragon-glow" />
        </div>

        {/* Text content */}
        <div className="maintenance-text">
          <h1 className="maintenance-title">
            <span className="title-line">The Realm</span>
            <span className="title-line title-accent">Slumbers</span>
          </h1>

          <div className="maintenance-divider">
            <span className="divider-rune">&#10022;</span>
            <span className="divider-line" />
            <span className="divider-rune">&#10022;</span>
          </div>

          <p className="maintenance-subtitle">
            Shhh... the dragon guards this place while our scribes tend to the ancient tomes.
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
            The realm shall awaken soon. This page will refresh automatically.
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

        {/* Social links */}
        <div className="maintenance-social">
          <p className="social-label">Seek updates from the heralds:</p>
          <div className="social-links">
            <a
              href="https://discord.gg/multiloop"
              target="_blank"
              rel="noopener noreferrer"
              className="social-link discord"
              title="Discord"
            >
              <DiscordIcon className="w-5 h-5" />
            </a>
            <a
              href="https://twitter.com/multiloopapp"
              target="_blank"
              rel="noopener noreferrer"
              className="social-link twitter"
              title="Twitter"
            >
              <Twitter className="w-5 h-5" />
            </a>
            <a
              href="mailto:contact@multiloop.app"
              className="social-link email"
              title="Email"
            >
              <Mail className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* Logo */}
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

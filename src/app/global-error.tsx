'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a0f',
          color: 'white',
          fontFamily: 'system-ui, sans-serif',
        }}>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 1.5rem',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
            }}>
              ⚠️
            </div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
              Something went wrong
            </h1>
            <p style={{ color: '#9ca3af', marginBottom: '1.5rem', maxWidth: '400px' }}>
              We've been notified and are working on it. Please try again.
            </p>
            <button
              onClick={() => reset()}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}

import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Sign in to Multiloop'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0f0f1a 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {/* Decorative gradient orbs */}
        <div
          style={{
            position: 'absolute',
            top: '-50px',
            left: '-50px',
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-100px',
            right: '-50px',
            width: '500px',
            height: '500px',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />

        {/* Logo/Icon */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100px',
            height: '100px',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
            borderRadius: '24px',
            marginBottom: '32px',
            boxShadow: '0 20px 40px rgba(139, 92, 246, 0.4)',
          }}
        >
          <svg
            width="56"
            height="56"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>

        {/* Brand name */}
        <div
          style={{
            display: 'flex',
            fontSize: '64px',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '12px',
            letterSpacing: '-2px',
          }}
        >
          Multiloop
        </div>

        {/* Call to action */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginTop: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px 40px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              borderRadius: '12px',
              fontSize: '24px',
              fontWeight: '600',
              color: 'white',
              boxShadow: '0 8px 24px rgba(139, 92, 246, 0.4)',
            }}
          >
            Sign In to Get Started
          </div>
        </div>

        {/* Tagline */}
        <div
          style={{
            display: 'flex',
            fontSize: '22px',
            color: 'rgba(255, 255, 255, 0.6)',
            marginTop: '32px',
          }}
        >
          Your tabletop adventures, organized
        </div>

        {/* Bottom features */}
        <div
          style={{
            position: 'absolute',
            bottom: '50px',
            display: 'flex',
            alignItems: 'center',
            gap: '40px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '16px',
              color: 'rgba(255, 255, 255, 0.5)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Characters
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '16px',
              color: 'rgba(255, 255, 255, 0.5)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            </svg>
            Campaigns
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '16px',
              color: 'rgba(255, 255, 255, 0.5)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            Sessions
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}

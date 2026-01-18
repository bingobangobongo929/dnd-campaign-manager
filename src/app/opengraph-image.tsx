import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Multiloop - Track your TTRPG adventures'
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
          background: 'linear-gradient(135deg, #0f0f17 0%, #1a1a2e 50%, #16162a 100%)',
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
            top: '-100px',
            right: '-100px',
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-150px',
            left: '-100px',
            width: '500px',
            height: '500px',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />

        {/* D20 dice icon */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '120px',
            height: '120px',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
            borderRadius: '24px',
            marginBottom: '40px',
            boxShadow: '0 20px 40px rgba(139, 92, 246, 0.3)',
          }}
        >
          <svg
            width="64"
            height="64"
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

        {/* Title */}
        <div
          style={{
            display: 'flex',
            fontSize: '72px',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '16px',
            letterSpacing: '-2px',
          }}
        >
          Multiloop
        </div>

        {/* Tagline */}
        <div
          style={{
            display: 'flex',
            fontSize: '28px',
            color: 'rgba(255, 255, 255, 0.7)',
            maxWidth: '800px',
            textAlign: 'center',
          }}
        >
          Your tabletop adventures, organized
        </div>

        {/* Bottom accent line */}
        <div
          style={{
            position: 'absolute',
            bottom: '60px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '80px',
              height: '3px',
              background: 'linear-gradient(90deg, transparent, #8b5cf6)',
              borderRadius: '2px',
            }}
          />
          <div
            style={{
              fontSize: '18px',
              color: 'rgba(255, 255, 255, 0.5)',
              letterSpacing: '2px',
              textTransform: 'uppercase',
            }}
          >
            D&D • Pathfinder • TTRPG
          </div>
          <div
            style={{
              width: '80px',
              height: '3px',
              background: 'linear-gradient(90deg, #8b5cf6, transparent)',
              borderRadius: '2px',
            }}
          />
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
